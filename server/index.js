const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const { pool, query, withTransaction } = require('./db');
const { config } = require('./config');
const {
  createPasswordHash,
  comparePassword,
  signToken,
  authenticateRequest,
} = require('./auth');
const sampleCase = require('../src/case_study.json');
const legacyDrugList = require('../src/components/prescriptions/drugList.json');

const app = express();
const sessionClients = new Map();

app.use(
  cors({
    origin: config.clientOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));

function createId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function createSessionCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

function createNumericId(length) {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
}

function normalizeMedicationName(value) {
  return String(value || '').trim().toLowerCase();
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && inQuotes && nextCharacter === '"') {
      current += '"';
      index += 1;
    } else if (character === '"') {
      inQuotes = !inQuotes;
    } else if (character === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += character;
    }
  }

  values.push(current.trim());
  return values.map((value) => value.replace(/^"(.*)"$/, '$1'));
}

function parseDrugLibraryCsv(csvContent) {
  const lines = String(csvContent || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    return {
      drugName: row.drug_name || row.drug || row.name || '',
      strength: row.strength || '',
      unit: row.unit || '',
      form: row.form || '',
      defaultRoute: row.default_route || row.route || '',
      aliases: row.aliases || '',
      category: row.category || '',
      isInfusion: ['true', 'yes', '1'].includes(String(row.is_infusion || '').toLowerCase()),
      usualFrequencies: row.usual_frequencies || '',
      defaultDose: row.default_dose || '',
      defaultIndication: row.default_indication || '',
      highRisk: ['true', 'yes', '1'].includes(String(row.high_risk || '').toLowerCase()),
      requiresWitness: ['true', 'yes', '1'].includes(String(row.requires_witness || row.witness_required || '').toLowerCase()),
      requiresDiluent: ['true', 'yes', '1'].includes(String(row.requires_diluent || '').toLowerCase()),
      defaultDiluent: row.default_diluent || '',
      defaultVolume: row.default_volume || '',
      notes: row.notes || '',
    };
  }).filter((item) => item.drugName);
}

const frequencyAdminTimes = {
  'Once daily': '08:00',
  'Each morning': '08:00',
  'Once in the morning': '08:00',
  'Once each morning': '08:00',
  'Each night': '20:00',
  'Once at night': '20:00',
  'Twice daily': '08:00,20:00',
  'Three times daily': '06:00,14:00,22:00',
  'Four times daily': '06:00,12:00,18:00,22:00',
  'Five times daily': '06:00,10:00,14:00,18:00,22:00',
  'Six times daily': '00:00,04:00,08:00,12:00,16:00,20:00',
  'Four hourly': '00:00,04:00,08:00,12:00,16:00,20:00',
  'Three hourly': '00:00,03:00,06:00,09:00,12:00,15:00,18:00,21:00',
  'Six hourly': '00:00,06:00,12:00,18:00',
  '6 hourly': '00:00,06:00,12:00,18:00',
  'Eight hourly': '06:00,14:00,22:00',
  'Twelve hourly': '08:00,20:00',
  'When required': '',
};

async function seedLookupTable(tableName, labels) {
  const existing = await query(`SELECT COUNT(*)::int AS total FROM ${tableName}`);
  if (existing.rows[0]?.total > 0) {
    return;
  }

  for (const [index, label] of labels.entries()) {
    await query(
      `INSERT INTO ${tableName} (id, label, sort_order) VALUES ($1, $2, $3)`,
      [createId(tableName.slice(0, -1)), label, index]
    );
  }
}

async function seedFrequencyOptions(labels) {
  const existing = await query('SELECT COUNT(*)::int AS total FROM frequency_options');
  if (!existing.rows[0]?.total) {
    for (const [index, label] of labels.entries()) {
      await query(
        'INSERT INTO frequency_options (id, label, default_admin_times, sort_order) VALUES ($1, $2, $3, $4)',
        [createId('frequency_option'), label, frequencyAdminTimes[label] || '', index]
      );
    }
    return;
  }

  for (const [index, label] of labels.entries()) {
    await query(
      `INSERT INTO frequency_options (id, label, default_admin_times, sort_order)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (label) DO UPDATE
       SET default_admin_times = EXCLUDED.default_admin_times,
           sort_order = EXCLUDED.sort_order`,
      [createId('frequency_option'), label, frequencyAdminTimes[label] || '', index]
    );
  }
}

async function seedAllergyReactionOptions() {
  const reactions = [
    { label: 'Rash', blocksPrescribing: false },
    { label: 'Nausea', blocksPrescribing: false },
    { label: 'Vomiting', blocksPrescribing: false },
    { label: 'Diarrhoea', blocksPrescribing: false },
    { label: 'Pruritus', blocksPrescribing: false },
    { label: 'Angioedema', blocksPrescribing: true },
    { label: 'Anaphylaxis', blocksPrescribing: true },
  ];

  for (const [index, reaction] of reactions.entries()) {
    await query(
      `INSERT INTO allergy_reaction_options (id, label, blocks_prescribing, sort_order)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (label) DO UPDATE
       SET blocks_prescribing = EXCLUDED.blocks_prescribing,
           sort_order = EXCLUDED.sort_order`,
      [createId('reaction_option'), reaction.label, reaction.blocksPrescribing, index]
    );
  }
}

async function seedCriticalMedicines() {
  const medicines = ['Co-careldopa'];

  for (const [index, medicine] of medicines.entries()) {
    await query(
      `INSERT INTO critical_medicines (id, drug_name, sort_order)
       VALUES ($1, $2, $3)
       ON CONFLICT (drug_name) DO UPDATE
       SET sort_order = EXCLUDED.sort_order`,
      [createId('critical_medicine'), medicine, index]
    );
  }
}

async function seedControlledDrugs() {
  const medicines = [];

  for (const [index, medicine] of medicines.entries()) {
    await query(
      `INSERT INTO controlled_drugs (id, drug_name, sort_order)
       VALUES ($1, $2, $3)
       ON CONFLICT (drug_name) DO UPDATE
       SET sort_order = EXCLUDED.sort_order`,
      [createId('controlled_drug'), medicine, index]
    );
  }
}

async function seedCommonConditions() {
  const conditions = [
    ['Hypertension', 'I10'],
    ['Type 2 diabetes mellitus', 'E11.9'],
    ['Type 1 diabetes mellitus', 'E10.9'],
    ['Asthma', 'J45.909'],
    ['COPD', 'J44.9'],
    ['Ischaemic heart disease', 'I25.9'],
    ['Heart failure', 'I50.9'],
    ['Atrial fibrillation', 'I48.91'],
    ['Chronic kidney disease', 'N18.9'],
    ['Hypothyroidism', 'E03.9'],
    ['Hyperthyroidism', 'E05.90'],
    ['Epilepsy', 'G40.909'],
    ['Stroke', 'I63.9'],
    ['TIA', 'G45.9'],
    ['Dementia', 'F03.90'],
    ['Depression', 'F32.A'],
    ['Anxiety', 'F41.9'],
    ['Osteoarthritis', 'M19.90'],
    ['Rheumatoid arthritis', 'M06.9'],
    ['GORD', 'K21.9'],
    ['Peptic ulcer disease', 'K27.9'],
    ['Liver disease', 'K76.9'],
    ['Anaemia', 'D64.9'],
    ['Cancer', 'C80.1'],
  ];

  for (const [index, [label, icd10Code]] of conditions.entries()) {
    await query(
      `INSERT INTO common_conditions (id, label, icd10_code, sort_order)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (label) DO UPDATE
       SET icd10_code = EXCLUDED.icd10_code,
           sort_order = EXCLUDED.sort_order`,
      [createId('condition'), label, icd10Code, index]
    );
  }
}

async function seedDrugOrderSets() {
  const orderSets = [
    {
      drugName: 'Amlodipine',
      label: '5mg once daily',
      dose: '5',
      unit: 'mg',
      frequency: 'Once daily',
      route: 'Oral',
      indication: 'Hypertension',
      sortOrder: 0,
    },
    {
      drugName: 'Amlodipine',
      label: '10mg once daily',
      dose: '10',
      unit: 'mg',
      frequency: 'Once daily',
      route: 'Oral',
      indication: 'Hypertension',
      sortOrder: 1,
    },
  ];

  for (const orderSet of orderSets) {
    await query(
      `INSERT INTO drug_order_sets (id, drug_name, label, dose, unit, frequency, route, indication, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (drug_name, label) DO UPDATE
       SET dose = EXCLUDED.dose,
           unit = EXCLUDED.unit,
           frequency = EXCLUDED.frequency,
           route = EXCLUDED.route,
           indication = EXCLUDED.indication,
           sort_order = EXCLUDED.sort_order,
           active = TRUE,
           updated_at = NOW()`,
      [
        createId('order_set'),
        orderSet.drugName,
        orderSet.label,
        orderSet.dose,
        orderSet.unit,
        orderSet.frequency,
        orderSet.route,
        orderSet.indication,
        orderSet.sortOrder,
      ]
    );
  }
}

async function seedDrugLibrary() {
  const existing = await query('SELECT COUNT(*)::int AS total FROM drug_library_items');
  if (existing.rows[0]?.total > 0) {
    return;
  }

  const seedRows = (legacyDrugList.drugs || []).map((item) => ({
    drugName: item[0] || '',
    strength: item[1] || '',
    unit: item[2] || '',
    form: item[3] || '',
    defaultRoute: item[4] || '',
    aliases: '',
    category: '',
    isInfusion: false,
    usualFrequencies: '',
    defaultDose: '',
    defaultIndication: '',
    highRisk: false,
    requiresWitness: false,
    requiresDiluent: false,
    defaultDiluent: '',
    defaultVolume: '',
    notes: '',
  })).filter((item) => item.drugName);

  for (const item of seedRows) {
    await query(
      `INSERT INTO drug_library_items (
         id, drug_name, strength, unit, form, default_route, aliases, category, is_infusion,
         usual_frequencies, default_dose, default_indication, high_risk, requires_witness, requires_diluent,
         default_diluent, default_volume, notes
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [
        createId('drug'),
        item.drugName,
        item.strength,
        item.unit,
        item.form,
        item.defaultRoute,
        item.aliases,
        item.category,
        item.isInfusion,
        item.usualFrequencies,
        item.defaultDose,
        item.defaultIndication,
        item.highRisk,
        item.requiresWitness,
        item.requiresDiluent,
        item.defaultDiluent,
        item.defaultVolume,
        item.notes,
      ]
    );
  }
}

async function ensureDrugLibraryItem(item) {
  const existing = await query(
    `SELECT id
     FROM drug_library_items
     WHERE LOWER(drug_name) = LOWER($1)
       AND LOWER(COALESCE(strength, '')) = LOWER($2)
       AND LOWER(COALESCE(form, '')) = LOWER($3)
     LIMIT 1`,
    [item.drugName, item.strength || '', item.form || '']
  );

  if (existing.rows.length) {
    return;
  }

  await query(
    `INSERT INTO drug_library_items (
       id, drug_name, strength, unit, form, default_route, aliases, category, is_infusion,
       usual_frequencies, default_dose, default_indication, high_risk, requires_witness, requires_diluent,
       default_diluent, default_volume, notes
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
    [
      createId('drug'),
      item.drugName,
      item.strength || '',
      item.unit || '',
      item.form || '',
      item.defaultRoute || '',
      item.aliases || '',
      item.category || '',
      Boolean(item.isInfusion),
      item.usualFrequencies || '',
      item.defaultDose || '',
      item.defaultIndication || '',
      Boolean(item.highRisk),
      Boolean(item.requiresWitness),
      Boolean(item.requiresDiluent),
      item.defaultDiluent || '',
      item.defaultVolume || '',
      item.notes || '',
    ]
  );
}

function buildSummary(caseStudy) {
  const sections = [
    caseStudy.case_notes && Object.keys(caseStudy.case_notes).length ? 'notes' : null,
    Array.isArray(caseStudy.prescriptionList) && caseStudy.prescriptionList.length ? 'prescriptions' : null,
    caseStudy.microbiology && Object.keys(caseStudy.microbiology).length ? 'microbiology' : null,
    caseStudy.biochemistry && Object.keys(caseStudy.biochemistry).length ? 'biochemistry' : null,
    caseStudy.observations && Object.keys(caseStudy.observations).length ? 'observations' : null,
    Array.isArray(caseStudy.imaging) && caseStudy.imaging.length ? 'imaging' : null,
    Array.isArray(caseStudy.questions) && caseStudy.questions.length ? 'questions' : null,
  ].filter(Boolean);

  return `${caseStudy.case_study_name || 'Untitled case'} | ${sections.join(', ') || 'draft'}`;
}

function formatCaseStudy(row) {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    title: row.title,
    summary: row.summary,
    draftData: row.draft_data,
    publishedData: row.published_data,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function formatLiveSession(row) {
  return {
    id: row.id,
    sessionCode: row.session_code,
    payload: row.last_payload,
    stepIndex: row.step_index,
    revealAnswers: row.reveal_answers,
    updatedAt: row.updated_at,
  };
}

function sendSessionEvent(sessionCode, sessionRow) {
  const clients = sessionClients.get(sessionCode) || [];
  const message = `event: case-update\ndata: ${JSON.stringify(formatLiveSession(sessionRow))}\n\n`;
  clients.forEach((res) => res.write(message));
}

function normalizeLiveAnswerText(answer) {
  if (Array.isArray(answer)) {
    return answer.map(String).join(', ');
  }

  if (answer && typeof answer === 'object') {
    return Object.entries(answer)
      .filter(([_key, value]) => value !== undefined && value !== null && String(value).trim() !== '')
      .map(([key, value]) => `${key}: ${value}`)
      .join(' | ');
  }

  if (answer === undefined || answer === null) {
    return '';
  }

  return String(answer);
}

async function getLiveResponseSummary(sessionId) {
  const grouped = await query(
    `SELECT question_number, answer_text, COUNT(*)::int AS answer_count
     FROM live_session_responses
     WHERE live_session_id = $1
     GROUP BY question_number, answer_text
     ORDER BY question_number ASC, answer_count DESC, answer_text ASC`,
    [sessionId]
  );

  const recent = await query(
    `SELECT question_number, participant_name, answer_text, updated_at
     FROM live_session_responses
     WHERE live_session_id = $1
     ORDER BY updated_at DESC
     LIMIT 50`,
    [sessionId]
  );

  const summary = {};

  grouped.rows.forEach((row) => {
    if (!summary[row.question_number]) {
      summary[row.question_number] = {
        questionNumber: row.question_number,
        totalResponses: 0,
        counts: [],
        recent: [],
      };
    }

    summary[row.question_number].counts.push({
      answer: row.answer_text,
      count: row.answer_count,
    });
    summary[row.question_number].totalResponses += row.answer_count;
  });

  recent.rows.forEach((row) => {
    if (!summary[row.question_number]) {
      summary[row.question_number] = {
        questionNumber: row.question_number,
        totalResponses: 0,
        counts: [],
        recent: [],
      };
    }

    if (summary[row.question_number].recent.length < 8) {
      summary[row.question_number].recent.push({
        participantName: row.participant_name,
        answer: row.answer_text,
        updatedAt: row.updated_at,
      });
    }
  });

  return summary;
}

async function sendResponseEvent(sessionCode, sessionId) {
  const clients = sessionClients.get(sessionCode) || [];
  if (!clients.length) {
    return;
  }

  const summary = await getLiveResponseSummary(sessionId);
  const message = `event: response-update\ndata: ${JSON.stringify(summary)}\n\n`;
  clients.forEach((res) => res.write(message));
}

function sanitizeCaseStudy(caseStudy) {
  return {
    ...caseStudy,
    questions: Array.isArray(caseStudy.questions) ? caseStudy.questions : [],
    prescriptionList: Array.isArray(caseStudy.prescriptionList) ? caseStudy.prescriptionList : [],
    imaging: Array.isArray(caseStudy.imaging) ? caseStudy.imaging : [],
    allergies: Array.isArray(caseStudy.allergies) ? caseStudy.allergies : [],
    microbiology: caseStudy.microbiology || [],
    biochemistry: caseStudy.biochemistry || {},
    observations: caseStudy.observations || {},
  };
}

const TEST_PATIENT_SELECT_FIELDS = `id, owner_user_id, nhs_number, hospital_number, full_name, surname, date_of_birth, address, gender, stay_type, ward_name, episode_status, admitted_at, discharged_at, weight, height, nkda, allergies, allergy_history, case_notes, case_notes_history, prescriptions, created_at, updated_at`;

function normalizeCaseNotes(caseNotes = {}) {
  const normalized = caseNotes && typeof caseNotes === 'object' ? caseNotes : {};
  const pastMedicalSurgicalHistorySource = Array.isArray(normalized.pastMedicalSurgicalHistory)
    ? normalized.pastMedicalSurgicalHistory
    : Array.isArray(normalized.conditions)
      ? normalized.conditions
      : [];
  const pastMedicalSurgicalHistory = pastMedicalSurgicalHistorySource
      .map((item) => {
        if (typeof item === 'string') {
          return { text: item.trim(), code: '' };
        }
        return {
          text: String(item?.text || item?.label || '').trim(),
          code: String(item?.code || item?.icd10Code || '').trim(),
        };
      })
      .filter((item) => item.text);
  const medicationHistorySource = (normalized.medication_history && typeof normalized.medication_history === 'object')
    ? normalized.medication_history
    : (normalized.medicationHistory && typeof normalized.medicationHistory === 'object')
      ? normalized.medicationHistory
      : {};
  const medicationHistoryEntriesSource = Array.isArray(medicationHistorySource.entries)
    ? medicationHistorySource.entries
    : Array.isArray(medicationHistorySource.medicines)
      ? medicationHistorySource.medicines
      : [];
  const medicationHistorySources = Array.isArray(medicationHistorySource.sources_used)
    ? medicationHistorySource.sources_used
    : Array.isArray(medicationHistorySource.sourcesUsed)
      ? medicationHistorySource.sourcesUsed
      : [];
  const blisterPackValue = medicationHistorySource.uses_blister_pack ?? medicationHistorySource.usesBlisterPack;
  const normalizedBlisterPack = typeof blisterPackValue === 'boolean'
    ? (blisterPackValue ? 'Yes' : 'No')
    : String(blisterPackValue || '').trim();
  const medicationHistory = {
    entries: medicationHistoryEntriesSource
      .map((item, index) => ({
        id: String(item?.id || `med-history-${index}`),
        drug: String(item?.drug || item?.drug_name || '').trim(),
        strength: String(item?.strength || '').trim(),
        dose: String(item?.dose || '').trim(),
        unit: String(item?.unit || '').trim(),
        route: String(item?.route || '').trim(),
        frequency: String(item?.frequency || '').trim(),
        form: String(item?.form || '').trim(),
        status: String(item?.status || 'Current').trim() || 'Current',
        lastTaken: String(item?.last_taken || item?.lastTaken || '').trim(),
        notes: String(item?.notes || '').trim(),
      }))
      .filter((item) => item.drug),
    usesBlisterPack: ['Yes', 'No', 'Unknown'].includes(normalizedBlisterPack) ? normalizedBlisterPack : 'Unknown',
    communityPharmacy: String(
      medicationHistorySource.community_pharmacy || medicationHistorySource.communityPharmacy || ''
    ).trim(),
    sourcesUsed: medicationHistorySources.map((item) => String(item || '').trim()).filter(Boolean),
    generalNotes: String(
      medicationHistorySource.general_notes
      || medicationHistorySource.generalNotes
      || medicationHistorySource.details
      || ''
    ).trim(),
    completedAt: String(
      medicationHistorySource.completed_at
      || medicationHistorySource.completedAt
      || medicationHistorySource.date_added
      || ''
    ).trim(),
    completedBy: String(
      medicationHistorySource.completed_by
      || medicationHistorySource.completedBy
      || medicationHistorySource.added_by
      || ''
    ).trim(),
    reconciliationStatus: String(
      medicationHistorySource.reconciliation_status
      || medicationHistorySource.reconciliationStatus
      || medicationHistorySource.status
      || 'In progress'
    ).trim() || 'In progress',
  };

  return {
    presentingComplaint: String(normalized.presenting_complaint || normalized.presentingComplaint || '').trim(),
    historyPresentingComplaint: String(normalized.history_presenting_complaint || normalized.historyPresentingComplaint || '').trim(),
    pastMedicalSurgicalHistory,
    functionalBaseline: String(normalized.functional_baseline || normalized.functionalBaseline || '').trim(),
    familyHistory: String(normalized.family_history || normalized.familyHistory || '').trim(),
    socialHistory: {
      alcohol: String(normalized.social_history?.alcohol || normalized.socialHistory?.alcohol || '').trim(),
      smoking: String(normalized.social_history?.smoking || normalized.socialHistory?.smoking || '').trim(),
      recreationalDrugs: String(normalized.social_history?.recreational_drugs || normalized.socialHistory?.recreationalDrugs || '').trim(),
      occupation: String(normalized.social_history?.occupation || normalized.socialHistory?.occupation || '').trim(),
      homeEnvironment: String(normalized.social_history?.home_environment || normalized.socialHistory?.homeEnvironment || '').trim(),
    },
    medicationHistory,
    notes: Array.isArray(normalized.notes) ? normalized.notes : [],
  };
}

function serializeCaseNotes(caseNotes = {}) {
  const normalized = normalizeCaseNotes(caseNotes);
  return {
    presenting_complaint: normalized.presentingComplaint,
    history_presenting_complaint: normalized.historyPresentingComplaint,
    conditions: normalized.pastMedicalSurgicalHistory.map((item) => ({
      text: item.text,
      code: item.code || '',
    })),
    functional_baseline: normalized.functionalBaseline,
    family_history: normalized.familyHistory,
    social_history: {
      alcohol: normalized.socialHistory.alcohol,
      smoking: normalized.socialHistory.smoking,
      recreational_drugs: normalized.socialHistory.recreationalDrugs,
      occupation: normalized.socialHistory.occupation,
      home_environment: normalized.socialHistory.homeEnvironment,
    },
    medication_history: {
      entries: normalized.medicationHistory.entries.map((item) => ({
        id: item.id,
        drug: item.drug,
        strength: item.strength,
        dose: item.dose,
        unit: item.unit,
        route: item.route,
        frequency: item.frequency,
        form: item.form,
        status: item.status,
        last_taken: item.lastTaken,
        notes: item.notes,
      })),
      uses_blister_pack: normalized.medicationHistory.usesBlisterPack,
      community_pharmacy: normalized.medicationHistory.communityPharmacy,
      sources_used: normalized.medicationHistory.sourcesUsed,
      general_notes: normalized.medicationHistory.generalNotes,
      completed_at: normalized.medicationHistory.completedAt,
      completed_by: normalized.medicationHistory.completedBy,
      reconciliation_status: normalized.medicationHistory.reconciliationStatus,
    },
    notes: normalized.notes,
  };
}

function getCaseNotesFieldValue(caseNotes, fieldKey) {
  switch (fieldKey) {
    case 'presentingComplaint':
      return caseNotes.presentingComplaint;
    case 'historyPresentingComplaint':
      return caseNotes.historyPresentingComplaint;
    case 'pastMedicalSurgicalHistory':
      return caseNotes.pastMedicalSurgicalHistory;
    case 'functionalBaseline':
      return caseNotes.functionalBaseline;
    case 'familyHistory':
      return caseNotes.familyHistory;
    case 'socialHistory.alcohol':
      return caseNotes.socialHistory.alcohol;
    case 'socialHistory.smoking':
      return caseNotes.socialHistory.smoking;
    case 'socialHistory.recreationalDrugs':
      return caseNotes.socialHistory.recreationalDrugs;
    case 'socialHistory.occupation':
      return caseNotes.socialHistory.occupation;
    case 'socialHistory.homeEnvironment':
      return caseNotes.socialHistory.homeEnvironment;
    case 'medicationHistory':
      return caseNotes.medicationHistory;
    default:
      return '';
  }
}

function formatTestPatient(row) {
  const measurementHistory = Array.isArray(row.measurementHistory) ? row.measurementHistory : [];
  const latestWeightEntry = measurementHistory.find((entry) => entry.weight);
  const latestHeightEntry = measurementHistory.find((entry) => entry.height);

  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    nhsNumber: row.nhs_number,
    hospitalNumber: row.hospital_number,
    fullName: row.full_name,
    surname: row.surname,
    dateOfBirth: row.date_of_birth,
    address: row.address,
    gender: row.gender,
    stayType: row.stay_type,
    wardName: row.ward_name,
    episodeStatus: row.episode_status,
    admittedAt: row.admitted_at || row.created_at,
    dischargedAt: row.discharged_at,
    weight: row.weight,
    height: row.height,
    weightRecordedAt: latestWeightEntry?.recordedAt || null,
    heightRecordedAt: latestHeightEntry?.recordedAt || null,
    nkda: Boolean(row.nkda),
    allergies: Array.isArray(row.allergies) ? row.allergies : [],
    allergyHistory: Array.isArray(row.allergy_history) ? row.allergy_history : [],
    caseNotes: normalizeCaseNotes(row.case_notes),
    caseNotesHistory: Array.isArray(row.case_notes_history) ? row.case_notes_history : [],
    measurementHistory,
    prescriptions: Array.isArray(row.prescriptions) ? row.prescriptions : [],
    lastAccessedAt: row.last_accessed_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function logPatientAuditEvent(patientId, user, actionType, metadata = {}) {
  await query(
    `INSERT INTO patient_chart_audit_events (id, patient_id, user_id, action_type, metadata)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [
      createId('patient_audit'),
      patientId,
      user.sub,
      actionType,
      JSON.stringify({
        actorDisplayName: user.displayName || user.email || user.sub,
        ...metadata,
      }),
    ]
  );
}

async function getAuthorizedPatient(patientId, user) {
  const result = await query(
    `SELECT ${TEST_PATIENT_SELECT_FIELDS}
     FROM test_patients
     WHERE id = $1
       AND (owner_user_id = $2 OR $3 = 'educator')`,
    [patientId, user.sub, user.role]
  );

  return result.rows[0] || null;
}

function formatPatientMeasurement(row) {
  return {
    id: row.id,
    weight: row.weight || '',
    height: row.height || '',
    recordedAt: row.recorded_at || row.created_at,
    createdAt: row.created_at,
  };
}

async function getPatientMeasurementHistory(patientId) {
  const result = await query(
    `SELECT id, weight, height, recorded_at, created_at
     FROM patient_measurements
     WHERE patient_id = $1
     ORDER BY recorded_at DESC, created_at DESC`,
    [patientId]
  );

  return result.rows.map(formatPatientMeasurement);
}

async function seedMissingPatientMeasurements() {
  const patients = await query(
    `SELECT id, owner_user_id, weight, height, created_at
     FROM test_patients`
  );

  for (const patient of patients.rows) {
    const existing = await query(
      'SELECT 1 FROM patient_measurements WHERE patient_id = $1 LIMIT 1',
      [patient.id]
    );

    if (existing.rows.length) {
      continue;
    }

    const weight = String(patient.weight || '').trim();
    const height = String(patient.height || '').trim();
    if (!weight && !height) {
      continue;
    }

    await query(
      `INSERT INTO patient_measurements (id, patient_id, user_id, weight, height, recorded_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $6)`,
      [
        createId('measurement'),
        patient.id,
        patient.owner_user_id,
        weight || null,
        height || null,
        patient.created_at || new Date().toISOString(),
      ]
    );
  }
}

function isObjectiveQuestion(question) {
  return ['MultipleChoice', 'Calculation', 'DrugChoice', 'MultipleAnswer'].includes(question.questionType);
}

function isWorkthroughTask(question) {
  return question.questionType === 'WorkthroughTask';
}

function normalizeComparable(value) {
  return String(value || '').trim().toLowerCase();
}

function matchesKeywordList(answer, expected) {
  const submitted = normalizeComparable(answer);
  const expectedList = Array.isArray(expected) ? expected : [expected];
  return expectedList.filter(Boolean).every((item) => submitted.includes(normalizeComparable(item)));
}

function matchesStructuredTask(question, answer) {
  if (!answer || typeof answer !== 'object') {
    return false;
  }

  const config = question.taskConfig || {};

  if (question.taskType === 'AddAllergy') {
    const drugMatches = !config.drug || normalizeComparable(answer.drug) === normalizeComparable(config.drug);
    const reactionMatches = !config.reaction || normalizeComparable(answer.reaction) === normalizeComparable(config.reaction);
    return drugMatches && reactionMatches;
  }

  if (question.taskType === 'PrescribeMedication') {
    const drugMatches = !config.drug || normalizeComparable(answer.drug) === normalizeComparable(config.drug);
    const routeMatches = !config.route || normalizeComparable(answer.route) === normalizeComparable(config.route);
    const frequencyMatches = !config.frequency || normalizeComparable(answer.frequency) === normalizeComparable(config.frequency);
    const indicationMatches = !config.indication || normalizeComparable(answer.indication) === normalizeComparable(config.indication);
    return drugMatches && routeMatches && frequencyMatches && indicationMatches;
  }

  return matchesKeywordList(JSON.stringify(answer), question.answerKeywords || question.answer);
}

function getExpectedAnswer(question) {
  if (isWorkthroughTask(question) && question.taskConfig) {
    return question.taskConfig;
  }

  return question.answer ?? question.answerKeywords ?? null;
}

function answersEqual(question, submittedAnswer) {
  if (submittedAnswer === undefined || submittedAnswer === null) {
    return false;
  }

  if (question.questionType === 'Calculation') {
    return Number(submittedAnswer) === Number(question.answer);
  }

  if (question.questionType === 'MultipleAnswer') {
    if (!Array.isArray(submittedAnswer) || !Array.isArray(question.answer)) {
      return false;
    }
    return JSON.stringify(submittedAnswer.map(String)) === JSON.stringify(question.answer.map(String));
  }

  return String(submittedAnswer) === String(question.answer);
}

function gradeCaseSession(caseStudy, answers) {
  const questions = Array.isArray(caseStudy.questions) ? caseStudy.questions : [];
  const scorableQuestions = questions.filter((question) => isObjectiveQuestion(question) || isWorkthroughTask(question));
  const breakdown = questions.map((question) => {
    const key = String(question.questionNumber);
    const submitted = answers[key];
    let correct = null;

    if (isObjectiveQuestion(question)) {
      correct = answersEqual(question, submitted);
    } else if (isWorkthroughTask(question)) {
      correct = matchesStructuredTask(question, submitted);
    }

    return {
      questionNumber: question.questionNumber,
      questionTitle: question.questionTitle,
      questionType: question.questionType,
      submittedAnswer: submitted ?? null,
      correctAnswer: isObjectiveQuestion(question) || isWorkthroughTask(question) ? getExpectedAnswer(question) : null,
      isCorrect: correct,
    };
  });

  const correctCount = breakdown.filter((item) => item.isCorrect === true).length;
  const score = scorableQuestions.length === 0 ? 0 : Number(((correctCount / scorableQuestions.length) * 100).toFixed(2));

  return {
    score,
    correctCount,
    totalScorable: scorableQuestions.length,
    breakdown,
  };
}

async function initializeDatabase() {
  const migrationPath = path.resolve(__dirname, 'db', '001_init.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  await query(migrationSql);

  const existingUsers = await query('SELECT id, role FROM users ORDER BY created_at ASC');
  if (!existingUsers.rows.length) {
    const educatorId = createId('user');
    const studentId = createId('user');
    const educatorPassword = await createPasswordHash('Demo123!');
    const studentPassword = await createPasswordHash('Student123!');
    const caseId = createId('case');
    const sessionId = createId('session');
    const sessionCode = createSessionCode();

    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO users (id, email, password_hash, display_name, role)
         VALUES ($1, $2, $3, $4, $5), ($6, $7, $8, $9, $10)`,
        [
          educatorId,
          'demo@casestudy.local',
          educatorPassword,
          'Demo Educator',
          'educator',
          studentId,
          'student@casestudy.local',
          studentPassword,
          'Demo Student',
          'student',
        ]
      );

      await client.query(
        `INSERT INTO case_studies (id, owner_user_id, title, summary, draft_data, published_data, status)
         VALUES ($1, $2, $3, $4, $5::jsonb, $5::jsonb, 'published')`,
        [caseId, educatorId, sampleCase.case_study_name, buildSummary(sampleCase), JSON.stringify(sampleCase)]
      );

      await client.query(
        `INSERT INTO live_sessions (id, case_study_id, created_by, session_code, status, last_payload, step_index, reveal_answers)
         VALUES ($1, $2, $3, $4, 'active', $5::jsonb, 0, false)`,
        [sessionId, caseId, educatorId, sessionCode, JSON.stringify(sampleCase)]
      );
    });

    console.log('Demo educator created: demo@casestudy.local / Demo123!');
    console.log('Demo student created: student@casestudy.local / Student123!');
    console.log(`Demo session code: ${sessionCode}`);
  }

  await seedLookupTable('route_options', legacyDrugList.routes || []);
  await seedFrequencyOptions(legacyDrugList.frequencies || []);
  await seedLookupTable('admin_outcome_options', legacyDrugList.nonAdmins || []);
  await seedAllergyReactionOptions();
  await seedCommonConditions();
  await seedCriticalMedicines();
  await seedControlledDrugs();
  await seedDrugOrderSets();
  await seedDrugLibrary();
  const allUsers = await query('SELECT id FROM users');
  for (const user of allUsers.rows) {
    await seedDemoTestPatientsForUser(user.id);
  }
  await seedMissingPatientMeasurements();
  await ensureDrugLibraryItem({
    drugName: 'Co-careldopa',
    strength: '125mg',
    unit: 'tablet',
    form: 'tablet',
    defaultRoute: 'Oral',
    usualFrequencies: 'Four times daily',
    defaultDose: '1',
    defaultIndication: 'Parkinson\'s disease',
    notes: 'Critical medicine',
  });
  await ensureDrugLibraryItem({
    drugName: 'Amlodipine',
    strength: '5mg',
    unit: 'mg',
    form: 'tablet',
    defaultRoute: 'Oral',
    usualFrequencies: 'Once daily',
    defaultDose: '5',
    defaultIndication: 'Hypertension',
    notes: 'Order set demo medicine',
  });
}

app.get('/api/health', async (_req, res) => {
  await query('SELECT 1');
  res.json({ ok: true });
});

app.get('/api/test-patients/search', authenticateRequest, async (req, res) => {
  const identifier = String(req.query.identifier || req.query.nhsNumber || req.query.hospitalNumber || '').trim();
  const firstName = String(req.query.firstName || '').trim();
  const surname = String(req.query.surname || '').trim();

  if (!identifier && !firstName && !surname) {
    return res.status(400).json({ error: 'At least one search field is required' });
  }

  const conditions = [];
  const params = [req.user.sub, req.user.role];
  let paramIndex = params.length + 1;

  if (identifier) {
    conditions.push(`(LOWER(nhs_number) = $${paramIndex} OR LOWER(hospital_number) = $${paramIndex})`);
    params.push(identifier.toLowerCase());
    paramIndex += 1;
  }

  if (surname) {
    conditions.push(`LOWER(surname) LIKE $${paramIndex} || '%'`);
    params.push(surname.toLowerCase());
    paramIndex += 1;
  }

  if (firstName) {
    conditions.push(`LOWER(SPLIT_PART(full_name, ' ', 1)) LIKE $${paramIndex} || '%'`);
    params.push(firstName.toLowerCase());
  }

  const result = await query(
    `SELECT ${TEST_PATIENT_SELECT_FIELDS}
     FROM test_patients
     WHERE (
       owner_user_id = $1 OR $2 = 'educator'
     )
       AND (${conditions.join(' AND ')})
     ORDER BY updated_at DESC
     LIMIT 20`,
    params
  );

  res.json({
    patients: result.rows.map(formatTestPatient),
  });
});

async function seedDemoTestPatientsForUser(userId) {
  const existing = await query(
    `SELECT COUNT(*)::int AS total
     FROM test_patients
     WHERE owner_user_id = $1
       AND surname = 'Smith'`,
    [userId]
  );

  if ((existing.rows[0]?.total || 0) >= 12) {
    return;
  }

  const smithFirstNames = ['John', 'Jane', 'Jack', 'Jill', 'James', 'Julia', 'Jacob', 'Joanna', 'Joseph', 'Jasmine', 'Jordan', 'Jessica'];
  const otherPatients = [
    ['Emily Brown', 'Brown'],
    ['Thomas Patel', 'Patel'],
    ['Amelia Jones', 'Jones'],
    ['Noah Taylor', 'Taylor'],
    ['Grace Wilson', 'Wilson'],
    ['Oliver Evans', 'Evans'],
  ];

  const patientSeeds = [
    ...smithFirstNames.map((firstName, index) => ({
      fullName: `${firstName} Smith`,
      surname: 'Smith',
      dateOfBirth: `${String((index % 27) + 1).padStart(2, '0')}/${String((index % 12) + 1).padStart(2, '0')}/${1980 + index}`,
      address: `${12 + index} Smith Street, London, AB1 ${index + 1}CD`,
      gender: index % 2 === 0 ? 'Male' : 'Female',
      stayType: index % 3 === 0 ? 'Ward inpatient' : 'A/E',
      wardName: index % 3 === 0 ? 'Cedar Ward' : 'Majors',
      weight: `${60 + index}kg`,
      height: `${160 + index}cm`,
    })),
    ...otherPatients.map(([fullName, surname], index) => ({
      fullName,
      surname,
      dateOfBirth: `${String((index % 27) + 1).padStart(2, '0')}/0${(index % 8) + 1}/${1990 + index}`,
      address: `${30 + index} Demo Road, Manchester, CD2 ${index + 1}EF`,
      gender: index % 2 === 0 ? 'Female' : 'Male',
      stayType: 'Ward inpatient',
      wardName: 'Willow Ward',
      weight: `${58 + index}kg`,
      height: `${158 + index}cm`,
    })),
  ];

  for (const patient of patientSeeds) {
    await query(
      `INSERT INTO test_patients (
         id, owner_user_id, created_by, nhs_number, hospital_number, full_name, surname, date_of_birth, address, gender, stay_type, ward_name, episode_status, admitted_at, weight, height, nkda, allergies, allergy_history, prescriptions
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', NOW(), $13, $14, false, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb)
       ON CONFLICT (hospital_number) DO NOTHING`,
      [
        createId('patient'),
        userId,
        userId,
        createNumericId(10),
        `${createNumericId(7)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
        patient.fullName,
        patient.surname,
        patient.dateOfBirth,
        patient.address,
        patient.gender,
        patient.stayType,
        patient.wardName,
        patient.weight,
        patient.height,
      ]
    );
  }
}

app.get('/api/test-patients/recent', authenticateRequest, async (req, res) => {
  const result = await query(
    `SELECT DISTINCT ON (p.id)
        p.id,
        p.owner_user_id,
        p.nhs_number,
        p.hospital_number,
        p.full_name,
        p.surname,
        p.date_of_birth,
        p.address,
        p.gender,
        p.stay_type,
        p.ward_name,
        p.episode_status,
        p.admitted_at,
        p.discharged_at,
        p.weight,
        p.height,
        p.nkda,
        p.allergies,
        p.allergy_history,
        p.prescriptions,
        p.created_at,
        p.updated_at,
        audit.created_at AS last_accessed_at
     FROM patient_chart_audit_events audit
     INNER JOIN test_patients p ON p.id = audit.patient_id
     WHERE audit.user_id = $1
       AND audit.action_type = 'view_chart'
       AND (p.owner_user_id = $1 OR $2 = 'educator')
     ORDER BY p.id, audit.created_at DESC`,
    [req.user.sub, req.user.role]
  );

  const patients = result.rows
    .map(formatTestPatient)
    .sort((left, right) => new Date(right.lastAccessedAt || 0) - new Date(left.lastAccessedAt || 0))
    .slice(0, 10);

  res.json({
    patients,
  });
});

app.get('/api/test-patients/recent-accesses', authenticateRequest, async (req, res) => {
  const result = await query(
    `SELECT DISTINCT ON (p.id)
        p.id,
        p.owner_user_id,
        p.nhs_number,
        p.hospital_number,
        p.full_name,
        p.surname,
        p.date_of_birth,
        p.address,
        p.gender,
        p.stay_type,
        p.ward_name,
        p.episode_status,
        p.admitted_at,
        p.discharged_at,
        p.weight,
        p.height,
        p.nkda,
        p.allergies,
        p.allergy_history,
        p.prescriptions,
        p.created_at,
        p.updated_at,
        audit.created_at AS last_accessed_at
     FROM patient_chart_audit_events audit
     INNER JOIN test_patients p ON p.id = audit.patient_id
     WHERE audit.user_id = $1
       AND audit.action_type = 'view_chart'
       AND (p.owner_user_id = $1 OR $2 = 'educator')
     ORDER BY p.id, audit.created_at DESC`,
    [req.user.sub, req.user.role]
  );

  const patients = result.rows
    .map(formatTestPatient)
    .sort((left, right) => new Date(right.lastAccessedAt || 0) - new Date(left.lastAccessedAt || 0))
    .slice(0, 10);

  res.json({ patients });
});

app.post('/api/test-patients', authenticateRequest, async (req, res) => {
  const { fullName, dateOfBirth, address, gender = '', stayType = '', wardName = '', weight = '', height = '' } = req.body || {};
  if (!fullName || !dateOfBirth || !address) {
    return res.status(400).json({ error: 'fullName, dateOfBirth and address are required' });
  }

  const surname = String(fullName).trim().split(/\s+/).slice(-1)[0] || '';
  const patient = {
    id: createId('patient'),
    ownerUserId: req.user.sub,
    createdBy: req.user.sub,
    nhsNumber: createNumericId(10),
    hospitalNumber: `${createNumericId(7)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
    fullName: String(fullName).trim(),
    surname,
    dateOfBirth: String(dateOfBirth).trim(),
    address: String(address).trim(),
    gender: String(gender).trim(),
    stayType: String(stayType).trim(),
    wardName: String(wardName).trim(),
    episodeStatus: 'active',
    weight: String(weight).trim(),
    height: String(height).trim(),
    nkda: false,
  };

  const seededPrescriptions = [];

  await query(
    `INSERT INTO test_patients (
       id, owner_user_id, created_by, nhs_number, hospital_number, full_name, surname, date_of_birth, address, gender, stay_type, ward_name, episode_status, admitted_at, weight, height, nkda, allergies, allergy_history, prescriptions
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), $14, $15, $16, '[]'::jsonb, '[]'::jsonb, $17::jsonb)`,
    [
      patient.id,
      patient.ownerUserId,
      patient.createdBy,
      patient.nhsNumber,
      patient.hospitalNumber,
      patient.fullName,
      patient.surname,
      patient.dateOfBirth,
      patient.address,
      patient.gender,
      patient.stayType,
      patient.wardName,
      patient.episodeStatus,
      patient.weight,
      patient.height,
      patient.nkda,
      JSON.stringify(seededPrescriptions),
    ]
  );

  const createdPatient = await query(
    `SELECT ${TEST_PATIENT_SELECT_FIELDS}
     FROM test_patients
     WHERE id = $1`,
    [patient.id]
  );

  await query(
    `INSERT INTO patient_measurements (id, patient_id, user_id, weight, height, recorded_at, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
    [
      createId('measurement'),
      patient.id,
      patient.ownerUserId,
      patient.weight || null,
      patient.height || null,
    ]
  );

  const measurementHistory = await getPatientMeasurementHistory(patient.id);

  await logPatientAuditEvent(patient.id, req.user, 'create_patient', {
    stayType: patient.stayType,
    wardName: patient.wardName,
  });
  await logPatientAuditEvent(patient.id, req.user, 'view_chart', {
    source: 'create_patient',
  });

  res.status(201).json({ patient: formatTestPatient({ ...createdPatient.rows[0], measurementHistory }) });
});

app.get('/api/test-patients/:id', authenticateRequest, async (req, res) => {
  const patient = await getAuthorizedPatient(req.params.id, req.user);

  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  await logPatientAuditEvent(patient.id, req.user, 'view_chart', {
    episodeStatus: patient.episode_status,
  });

  const measurementHistory = await getPatientMeasurementHistory(patient.id);
  res.json({ patient: formatTestPatient({ ...patient, measurementHistory }) });
});

app.put('/api/test-patients/:id/allergies', authenticateRequest, async (req, res) => {
  const patient = await getAuthorizedPatient(req.params.id, req.user);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const allergies = Array.isArray(req.body?.allergies) ? req.body.allergies : [];
  const nkda = Boolean(req.body?.nkda);
  const reason = String(req.body?.reason || '').trim();
  const action = String(req.body?.action || 'updated').trim() || 'updated';
  const historyEntry = {
    timestamp: new Date().toISOString(),
    action,
    reason: reason || 'No reason recorded',
    actor: req.user.displayName || req.user.email || req.user.sub,
    targetDrug: String(req.body?.targetDrug || '').trim(),
    targetReaction: String(req.body?.targetReaction || '').trim(),
    nkda,
    allergies,
  };
  const allergyHistory = [...(Array.isArray(patient.allergyHistory) ? patient.allergyHistory : []), historyEntry];
  const result = await query(
    `UPDATE test_patients
     SET allergies = $1::jsonb,
         nkda = $2,
         allergy_history = $3::jsonb,
         updated_at = NOW()
     WHERE id = $4
     RETURNING ${TEST_PATIENT_SELECT_FIELDS}`,
    [JSON.stringify(allergies), nkda, JSON.stringify(allergyHistory), req.params.id]
  );

  await logPatientAuditEvent(req.params.id, req.user, 'update_allergies', {
    action,
    nkda,
    allergyCount: allergies.length,
  });

  const measurementHistory = await getPatientMeasurementHistory(req.params.id);
  res.json({ patient: formatTestPatient({ ...result.rows[0], measurementHistory }) });
});

app.put('/api/test-patients/:id/case-notes', authenticateRequest, async (req, res) => {
  const patient = await getAuthorizedPatient(req.params.id, req.user);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const requestedCaseNotes = normalizeCaseNotes(req.body?.caseNotes || {});
  const currentCaseNotes = normalizeCaseNotes(patient.case_notes);
  const fieldKey = String(req.body?.fieldKey || '').trim();
  const fieldLabel = String(req.body?.fieldLabel || fieldKey || 'Case notes').trim();
  const actorName = req.user.displayName || req.user.email || req.user.sub;
  const nextCaseNotes = fieldKey === 'medicationHistory'
    ? {
        ...requestedCaseNotes,
        medicationHistory: {
          ...requestedCaseNotes.medicationHistory,
          completedAt: new Date().toISOString(),
          completedBy: actorName,
        },
      }
    : requestedCaseNotes;
  const serializedCaseNotes = serializeCaseNotes(nextCaseNotes);
  const previousValue = getCaseNotesFieldValue(currentCaseNotes, fieldKey);
  const nextValue = getCaseNotesFieldValue(nextCaseNotes, fieldKey);
  const historyEntry = {
    timestamp: new Date().toISOString(),
    fieldKey,
    fieldLabel,
    previousValue,
    nextValue,
    actor: actorName,
  };
  const caseNotesHistory = [...(Array.isArray(patient.case_notes_history) ? patient.case_notes_history : []), historyEntry];

  const result = await query(
    `UPDATE test_patients
     SET case_notes = $1::jsonb,
         case_notes_history = $2::jsonb,
         updated_at = NOW()
     WHERE id = $3
     RETURNING ${TEST_PATIENT_SELECT_FIELDS}`,
    [JSON.stringify(serializedCaseNotes), JSON.stringify(caseNotesHistory), req.params.id]
  );

  await logPatientAuditEvent(req.params.id, req.user, 'update_case_notes', {
    fieldKey,
    fieldLabel,
  });

  const measurementHistory = await getPatientMeasurementHistory(req.params.id);
  res.json({ patient: formatTestPatient({ ...result.rows[0], measurementHistory }) });
});

app.put('/api/test-patients/:id/prescriptions', authenticateRequest, async (req, res) => {
  const patient = await getAuthorizedPatient(req.params.id, req.user);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const prescriptions = Array.isArray(req.body?.prescriptions) ? req.body.prescriptions : [];
  const result = await query(
    `UPDATE test_patients
     SET prescriptions = $1::jsonb, updated_at = NOW()
     WHERE id = $2
     RETURNING ${TEST_PATIENT_SELECT_FIELDS}`,
    [JSON.stringify(prescriptions), req.params.id]
  );

  await logPatientAuditEvent(req.params.id, req.user, 'update_prescriptions', {
    prescriptionCount: prescriptions.length,
  });

  const measurementHistory = await getPatientMeasurementHistory(req.params.id);
  res.json({ patient: formatTestPatient({ ...result.rows[0], measurementHistory }) });
});

app.put('/api/test-patients/:id/measurements', authenticateRequest, async (req, res) => {
  const patient = await getAuthorizedPatient(req.params.id, req.user);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const weightInput = String(req.body?.weight || '').trim();
  const heightInput = String(req.body?.height || '').trim();
  const numericPattern = /^\d+(\.\d+)?$/;

  if (!weightInput && !heightInput) {
    return res.status(400).json({ error: 'Enter a weight or height to record a new measurement' });
  }

  if (weightInput && !numericPattern.test(weightInput)) {
    return res.status(400).json({ error: 'Weight must be a numeric value in kilograms' });
  }

  if (heightInput && !numericPattern.test(heightInput)) {
    return res.status(400).json({ error: 'Height must be a numeric value in centimetres' });
  }

  const nextWeight = weightInput || patient.weight || '';
  const nextHeight = heightInput || patient.height || '';

  const updatedPatient = await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO patient_measurements (id, patient_id, user_id, weight, height, recorded_at, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [
        createId('measurement'),
        patient.id,
        req.user.sub,
        weightInput || null,
        heightInput || null,
      ]
    );

    const result = await client.query(
      `UPDATE test_patients
       SET weight = $1,
           height = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING ${TEST_PATIENT_SELECT_FIELDS}`,
      [nextWeight, nextHeight, patient.id]
    );

    return result.rows[0];
  });

  await logPatientAuditEvent(req.params.id, req.user, 'update_measurements', {
    weight: weightInput || null,
    height: heightInput || null,
  });

  const measurementHistory = await getPatientMeasurementHistory(patient.id);
  res.json({ patient: formatTestPatient({ ...updatedPatient, measurementHistory }) });
});

app.post('/api/test-patients/:id/discharge', authenticateRequest, async (req, res) => {
  const patient = await getAuthorizedPatient(req.params.id, req.user);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const result = await query(
    `UPDATE test_patients
     SET episode_status = 'discharged',
         discharged_at = NOW(),
         updated_at = NOW()
     WHERE id = $1
     RETURNING ${TEST_PATIENT_SELECT_FIELDS}`,
    [req.params.id]
  );

  await logPatientAuditEvent(req.params.id, req.user, 'discharge_patient', {});

  const measurementHistory = await getPatientMeasurementHistory(req.params.id);
  res.json({ patient: formatTestPatient({ ...result.rows[0], measurementHistory }) });
});

app.post('/api/test-patients/:id/readmit', authenticateRequest, async (req, res) => {
  const patient = await getAuthorizedPatient(req.params.id, req.user);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const stayType = String(req.body?.stayType || patient.stayType || '').trim();
  const wardName = String(req.body?.wardName || patient.wardName || '').trim();

  const result = await query(
    `UPDATE test_patients
     SET episode_status = 'active',
         discharged_at = NULL,
         admitted_at = NOW(),
         stay_type = $2,
         ward_name = $3,
         updated_at = NOW()
     WHERE id = $1
     RETURNING ${TEST_PATIENT_SELECT_FIELDS}`,
    [req.params.id, stayType, wardName]
  );

  await logPatientAuditEvent(req.params.id, req.user, 'readmit_patient', {
    stayType,
    wardName,
  });
  await logPatientAuditEvent(req.params.id, req.user, 'view_chart', {
    source: 'readmit_patient',
  });

  const measurementHistory = await getPatientMeasurementHistory(req.params.id);
  res.json({ patient: formatTestPatient({ ...result.rows[0], measurementHistory }) });
});

app.get('/api/drug-library', async (_req, res) => {
  const [result, routesResult, frequenciesResult, outcomesResult, reactionResult, criticalMedicineResult, controlledDrugResult, orderSetsResult] = await Promise.all([
    query(
    `SELECT id, drug_name, strength, unit, form, default_route, aliases, category, is_infusion,
            usual_frequencies, default_dose, default_indication, high_risk, requires_witness, requires_diluent,
            default_diluent, default_volume, notes, updated_at
     FROM drug_library_items
     ORDER BY drug_name ASC, strength ASC`
    ),
    query('SELECT id, label, sort_order FROM route_options ORDER BY sort_order ASC, label ASC'),
    query('SELECT id, label, default_admin_times, sort_order FROM frequency_options ORDER BY sort_order ASC, label ASC'),
    query('SELECT id, label, sort_order FROM admin_outcome_options ORDER BY sort_order ASC, label ASC'),
    query('SELECT id, label, blocks_prescribing, sort_order FROM allergy_reaction_options ORDER BY sort_order ASC, label ASC'),
    query('SELECT drug_name FROM critical_medicines ORDER BY sort_order ASC, drug_name ASC'),
    query('SELECT drug_name FROM controlled_drugs ORDER BY sort_order ASC, drug_name ASC'),
    query('SELECT id, drug_name, label, dose, unit, frequency, route, indication, active, sort_order FROM drug_order_sets WHERE active = TRUE ORDER BY drug_name ASC, sort_order ASC, label ASC'),
  ]);

  const criticalMedicineLookup = new Set(
    criticalMedicineResult.rows.map((row) => normalizeMedicationName(row.drug_name))
  );
  const controlledDrugLookup = new Set(
    controlledDrugResult.rows.map((row) => normalizeMedicationName(row.drug_name))
  );

  res.json({
    items: result.rows.map((row) => ({
      id: row.id,
      drugName: row.drug_name,
      strength: row.strength,
      unit: row.unit,
      form: row.form,
      defaultRoute: row.default_route,
      aliases: row.aliases,
      category: row.category,
      isInfusion: row.is_infusion,
      usualFrequencies: row.usual_frequencies,
      defaultDose: row.default_dose,
      defaultIndication: row.default_indication,
      highRisk: row.high_risk,
      criticalMedicine: criticalMedicineLookup.has(normalizeMedicationName(row.drug_name)),
      controlledDrug: controlledDrugLookup.has(normalizeMedicationName(row.drug_name)),
      requiresWitness: row.requires_witness,
      requiresDiluent: row.requires_diluent,
      defaultDiluent: row.default_diluent,
      defaultVolume: row.default_volume,
      notes: row.notes,
      updatedAt: row.updated_at,
    })),
    metadata: {
      routes: routesResult.rows.map((row) => row.label),
      frequencies: frequenciesResult.rows.map((row) => row.label),
      nonAdmins: outcomesResult.rows.map((row) => row.label),
      routeOptions: routesResult.rows.map((row) => ({
        id: row.id,
        label: row.label,
        sortOrder: row.sort_order,
      })),
      frequencyOptions: frequenciesResult.rows.map((row) => ({
        id: row.id,
        label: row.label,
        defaultAdminTimes: String(row.default_admin_times || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        sortOrder: row.sort_order,
      })),
      reactionOptions: reactionResult.rows.map((row) => ({
        id: row.id,
        label: row.label,
        blocksPrescribing: row.blocks_prescribing,
        sortOrder: row.sort_order,
      })),
      orderSets: orderSetsResult.rows.map((row) => ({
        id: row.id,
        drugName: row.drug_name,
        label: row.label,
        dose: row.dose,
        unit: row.unit,
        frequency: row.frequency,
        route: row.route,
        indication: row.indication,
        active: row.active,
        sortOrder: row.sort_order,
      })),
    },
  });
});

app.get('/api/common-conditions', authenticateRequest, async (_req, res) => {
  const result = await query(
    `SELECT id, label, icd10_code, sort_order
     FROM common_conditions
     ORDER BY sort_order ASC, label ASC`
  );

  res.json({
    conditions: result.rows.map((row) => ({
      id: row.id,
      label: row.label,
      icd10Code: row.icd10_code,
      sortOrder: row.sort_order,
    })),
  });
});

app.post('/api/drug-library/import', authenticateRequest, async (req, res) => {
  if (req.user.role !== 'educator') {
    return res.status(403).json({ error: 'Only educators can import the drug library' });
  }

  const { csvContent, replaceExisting = true } = req.body || {};
  const items = parseDrugLibraryCsv(csvContent);

  if (!items.length) {
    return res.status(400).json({ error: 'No valid drug rows found in the CSV content' });
  }

  await withTransaction(async (client) => {
    if (replaceExisting) {
      await client.query('DELETE FROM drug_library_items');
    }

    for (const item of items) {
      await client.query(
        `INSERT INTO drug_library_items (
           id, drug_name, strength, unit, form, default_route, aliases, category, is_infusion,
           usual_frequencies, default_dose, default_indication, high_risk, requires_witness, requires_diluent,
           default_diluent, default_volume, notes
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
        [
          createId('drug'),
          item.drugName,
          item.strength,
          item.unit,
          item.form,
          item.defaultRoute,
          item.aliases,
          item.category,
          item.isInfusion,
          item.usualFrequencies,
          item.defaultDose,
          item.defaultIndication,
          item.highRisk,
          item.requiresWitness,
          item.requiresDiluent,
          item.defaultDiluent,
          item.defaultVolume,
          item.notes,
        ]
      );
    }
  });

  res.status(201).json({ imported: items.length });
});

app.post('/api/auth/register', async (req, res) => {
  const { email, password, displayName, role } = req.body || {};
  if (!email || !password || !displayName) {
    return res.status(400).json({ error: 'Email, password and display name are required' });
  }

  const nextRole = role === 'educator' ? 'educator' : 'student';
  const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows.length) {
    return res.status(409).json({ error: 'An account with that email already exists' });
  }

  const user = {
    id: createId('user'),
    email: email.toLowerCase(),
    display_name: displayName.trim(),
    role: nextRole,
  };
  const passwordHash = await createPasswordHash(password);

  await query(
    `INSERT INTO users (id, email, password_hash, display_name, role)
     VALUES ($1, $2, $3, $4, $5)`,
    [user.id, user.email, passwordHash, user.display_name, user.role]
  );

  res.status(201).json({ token: signToken(user), user: { id: user.id, email: user.email, displayName: user.display_name, role: user.role } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const result = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  const user = result.rows[0];
  if (!user) {
    return res.status(401).json({ error: 'Incorrect email or password' });
  }

  const passwordMatches = await comparePassword(password, user.password_hash);
  if (!passwordMatches) {
    return res.status(401).json({ error: 'Incorrect email or password' });
  }

  res.json({ token: signToken(user), user: { id: user.id, email: user.email, displayName: user.display_name, role: user.role } });
});

app.post('/api/auth/verify-witness', authenticateRequest, async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const result = await query(
    `SELECT id, email, display_name, password_hash, role
     FROM users
     WHERE LOWER(email) = LOWER($1) OR LOWER(display_name) = LOWER($1)
     LIMIT 1`,
    [String(username).trim()]
  );
  const witness = result.rows[0];
  if (!witness) {
    return res.status(401).json({ error: 'Witness credentials are incorrect' });
  }

  if (witness.id === req.user.sub) {
    return res.status(400).json({ error: 'A different user must witness this administration' });
  }

  const passwordMatches = await comparePassword(password, witness.password_hash);
  if (!passwordMatches) {
    return res.status(401).json({ error: 'Witness credentials are incorrect' });
  }

  res.json({ witness: { id: witness.id, email: witness.email, displayName: witness.display_name, role: witness.role } });
});

app.get('/api/auth/me', authenticateRequest, async (req, res) => {
  const result = await query('SELECT id, email, display_name, role FROM users WHERE id = $1', [req.user.sub]);
  if (!result.rows.length) {
    return res.status(404).json({ error: 'User not found' });
  }
  const user = result.rows[0];
  res.json({ user: { id: user.id, email: user.email, displayName: user.display_name, role: user.role } });
});

app.get('/api/case-studies', authenticateRequest, async (req, res) => {
  const result = await query(
    `SELECT cs.id, cs.owner_user_id, cs.title, cs.summary, cs.draft_data, cs.published_data, cs.status, cs.created_at, cs.updated_at,
            ls.session_code, ls.updated_at AS session_updated_at, ls.step_index, ls.reveal_answers
     FROM case_studies cs
     LEFT JOIN LATERAL (
       SELECT session_code, updated_at, step_index, reveal_answers
       FROM live_sessions
       WHERE case_study_id = cs.id AND status = 'active'
       ORDER BY updated_at DESC
       LIMIT 1
     ) ls ON true
     WHERE cs.owner_user_id = $1
     ORDER BY cs.updated_at DESC`,
    [req.user.sub]
  );

  res.json({
    caseStudies: result.rows.map((row) => ({
      ...formatCaseStudy(row),
      activeSessionCode: row.session_code,
      sessionUpdatedAt: row.session_updated_at,
      liveStepIndex: row.step_index,
      revealAnswers: row.reveal_answers,
    })),
  });
});

app.get('/api/library', authenticateRequest, async (_req, res) => {
  const result = await query(`SELECT id, owner_user_id, title, summary, draft_data, published_data, status, created_at, updated_at FROM case_studies WHERE status = 'published' ORDER BY updated_at DESC`);
  res.json({ caseStudies: result.rows.map(formatCaseStudy) });
});

app.get('/api/case-studies/:id', authenticateRequest, async (req, res) => {
  const result = await query(`SELECT * FROM case_studies WHERE id = $1 AND (owner_user_id = $2 OR status = 'published')`, [req.params.id, req.user.sub]);
  if (!result.rows.length) {
    return res.status(404).json({ error: 'Case study not found' });
  }
  res.json({ caseStudy: formatCaseStudy(result.rows[0]) });
});

app.post('/api/case-studies', authenticateRequest, async (req, res) => {
  if (req.user.role !== 'educator') {
    return res.status(403).json({ error: 'Only educators can create case studies' });
  }

  const { data } = req.body || {};
  if (!data || !data.case_study_name) {
    return res.status(400).json({ error: 'Case study data with a title is required' });
  }

  const id = createId('case');
  const payload = sanitizeCaseStudy(data);
  await query(
    `INSERT INTO case_studies (id, owner_user_id, title, summary, draft_data, status)
     VALUES ($1, $2, $3, $4, $5::jsonb, 'draft')`,
    [id, req.user.sub, payload.case_study_name, buildSummary(payload), JSON.stringify(payload)]
  );
  const created = await query('SELECT * FROM case_studies WHERE id = $1', [id]);
  res.status(201).json({ caseStudy: formatCaseStudy(created.rows[0]) });
});

app.put('/api/case-studies/:id', authenticateRequest, async (req, res) => {
  const { data } = req.body || {};
  if (!data || !data.case_study_name) {
    return res.status(400).json({ error: 'Case study data with a title is required' });
  }

  const payload = sanitizeCaseStudy(data);
  const result = await query(
    `UPDATE case_studies SET title = $1, summary = $2, draft_data = $3::jsonb, updated_at = NOW() WHERE id = $4 AND owner_user_id = $5 RETURNING *`,
    [payload.case_study_name, buildSummary(payload), JSON.stringify(payload), req.params.id, req.user.sub]
  );

  if (!result.rows.length) {
    return res.status(404).json({ error: 'Case study not found' });
  }
  res.json({ caseStudy: formatCaseStudy(result.rows[0]) });
});

app.post('/api/case-studies/:id/clone', authenticateRequest, async (req, res) => {
  const source = await query('SELECT * FROM case_studies WHERE id = $1 AND owner_user_id = $2', [req.params.id, req.user.sub]);
  if (!source.rows.length) {
    return res.status(404).json({ error: 'Case study not found' });
  }

  const row = source.rows[0];
  const cloneId = createId('case');
  const draftData = row.draft_data;
  const cloneTitle = `${row.title} (Copy)`;
  await query(
    `INSERT INTO case_studies (id, owner_user_id, title, summary, draft_data, status)
     VALUES ($1, $2, $3, $4, $5::jsonb, 'draft')`,
    [cloneId, req.user.sub, cloneTitle, buildSummary({ ...draftData, case_study_name: cloneTitle }), JSON.stringify({ ...draftData, case_study_name: cloneTitle })]
  );
  const created = await query('SELECT * FROM case_studies WHERE id = $1', [cloneId]);
  res.status(201).json({ caseStudy: formatCaseStudy(created.rows[0]) });
});

app.post('/api/case-studies/:id/archive', authenticateRequest, async (req, res) => {
  const result = await query(`UPDATE case_studies SET status = 'archived', updated_at = NOW() WHERE id = $1 AND owner_user_id = $2 RETURNING *`, [req.params.id, req.user.sub]);
  if (!result.rows.length) {
    return res.status(404).json({ error: 'Case study not found' });
  }
  res.json({ caseStudy: formatCaseStudy(result.rows[0]) });
});

app.post('/api/case-studies/:id/publish', authenticateRequest, async (req, res) => {
  const result = await query('SELECT * FROM case_studies WHERE id = $1 AND owner_user_id = $2', [req.params.id, req.user.sub]);
  if (!result.rows.length) {
    return res.status(404).json({ error: 'Case study not found' });
  }

  const caseStudy = result.rows[0];
  const payload = sanitizeCaseStudy(req.body?.data || caseStudy.draft_data);
  const existingSession = await query(`SELECT * FROM live_sessions WHERE case_study_id = $1 AND created_by = $2 AND status = 'active' ORDER BY updated_at DESC LIMIT 1`, [req.params.id, req.user.sub]);

  let session;
  if (existingSession.rows.length) {
    const updated = await query(
      `UPDATE live_sessions SET last_payload = $1::jsonb, step_index = 0, reveal_answers = false, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [JSON.stringify(payload), existingSession.rows[0].id]
    );
    session = updated.rows[0];
  } else {
    const inserted = await query(
      `INSERT INTO live_sessions (id, case_study_id, created_by, session_code, status, last_payload, step_index, reveal_answers)
       VALUES ($1, $2, $3, $4, 'active', $5::jsonb, 0, false) RETURNING *`,
      [createId('session'), req.params.id, req.user.sub, createSessionCode(), JSON.stringify(payload)]
    );
    session = inserted.rows[0];
  }

  await query('DELETE FROM live_session_responses WHERE live_session_id = $1', [session.id]);
  await query(`UPDATE case_studies SET published_data = $1::jsonb, status = 'published', updated_at = NOW() WHERE id = $2`, [JSON.stringify(payload), req.params.id]);
  sendSessionEvent(session.session_code, session);
  await sendResponseEvent(session.session_code, session.id);
  res.json({ session: formatLiveSession(session) });
});

app.get('/api/case-studies/:id/analytics', authenticateRequest, async (req, res) => {
  const ownership = await query('SELECT id, title FROM case_studies WHERE id = $1 AND owner_user_id = $2', [req.params.id, req.user.sub]);
  if (!ownership.rows.length) {
    return res.status(404).json({ error: 'Case study not found' });
  }

  const sessions = await query(
    `SELECT cs.*, u.display_name, u.email
     FROM case_sessions cs
     JOIN users u ON u.id = cs.user_id
     WHERE cs.case_study_id = $1
     ORDER BY cs.updated_at DESC`,
    [req.params.id]
  );

  const attempts = sessions.rows.length;
  const completed = sessions.rows.filter((session) => session.status === 'completed');
  const averageScore = completed.length ? Number((completed.reduce((sum, item) => sum + Number(item.score || 0), 0) / completed.length).toFixed(2)) : 0;

  res.json({ analytics: { attempts, completedAttempts: completed.length, completionRate: attempts ? Number(((completed.length / attempts) * 100).toFixed(2)) : 0, averageScore, recentAttempts: sessions.rows.slice(0, 10).map((session) => ({ id: session.id, learnerName: session.display_name, learnerEmail: session.email, status: session.status, score: session.score, updatedAt: session.updated_at })) } });
});

app.get('/api/my-sessions', authenticateRequest, async (req, res) => {
  const result = await query(
    `SELECT cs.id, cs.case_study_id, cs.status, cs.answers, cs.progress, cs.score, cs.started_at, cs.completed_at, cs.updated_at,
            c.title, c.summary
     FROM case_sessions cs
     JOIN case_studies c ON c.id = cs.case_study_id
     WHERE cs.user_id = $1
     ORDER BY cs.updated_at DESC`,
    [req.user.sub]
  );

  res.json({ sessions: result.rows.map((row) => ({ id: row.id, caseStudyId: row.case_study_id, title: row.title, summary: row.summary, status: row.status, answers: row.answers, progress: row.progress, score: row.score, startedAt: row.started_at, completedAt: row.completed_at, updatedAt: row.updated_at })) });
});

app.post('/api/case-studies/:id/start', authenticateRequest, async (req, res) => {
  const caseStudyResult = await query(`SELECT * FROM case_studies WHERE id = $1 AND status = 'published'`, [req.params.id]);
  if (!caseStudyResult.rows.length) {
    return res.status(404).json({ error: 'Published case study not found' });
  }

  const existing = await query(`SELECT * FROM case_sessions WHERE case_study_id = $1 AND user_id = $2 AND status = 'in_progress' ORDER BY updated_at DESC LIMIT 1`, [req.params.id, req.user.sub]);
  if (existing.rows.length) {
    return res.json({ session: existing.rows[0] });
  }

  const caseStudy = caseStudyResult.rows[0];
  const created = await query(
    `INSERT INTO case_sessions (id, case_study_id, user_id, status, case_snapshot)
     VALUES ($1, $2, $3, 'in_progress', $4::jsonb)
     RETURNING *`,
    [createId('attempt'), req.params.id, req.user.sub, JSON.stringify(caseStudy.published_data || caseStudy.draft_data)]
  );

  res.status(201).json({ session: created.rows[0] });
});

app.get('/api/case-sessions/:id', authenticateRequest, async (req, res) => {
  const result = await query(
    `SELECT cs.*, c.title, c.summary
     FROM case_sessions cs
     JOIN case_studies c ON c.id = cs.case_study_id
     WHERE cs.id = $1 AND cs.user_id = $2`,
    [req.params.id, req.user.sub]
  );
  if (!result.rows.length) {
    return res.status(404).json({ error: 'Case session not found' });
  }

  const session = result.rows[0];
  res.json({ session: { id: session.id, caseStudyId: session.case_study_id, title: session.title, summary: session.summary, status: session.status, caseSnapshot: session.case_snapshot, answers: session.answers, progress: session.progress, score: session.score, startedAt: session.started_at, completedAt: session.completed_at, updatedAt: session.updated_at } });
});

app.put('/api/case-sessions/:id', authenticateRequest, async (req, res) => {
  const { answers = {}, progress = {} } = req.body || {};
  const result = await query(
    `UPDATE case_sessions SET answers = $1::jsonb, progress = $2::jsonb, updated_at = NOW() WHERE id = $3 AND user_id = $4 AND status = 'in_progress' RETURNING *`,
    [JSON.stringify(answers), JSON.stringify(progress), req.params.id, req.user.sub]
  );
  if (!result.rows.length) {
    return res.status(404).json({ error: 'Active case session not found' });
  }
  res.json({ session: result.rows[0] });
});

app.post('/api/case-sessions/:id/complete', authenticateRequest, async (req, res) => {
  const sessionResult = await query(`SELECT * FROM case_sessions WHERE id = $1 AND user_id = $2`, [req.params.id, req.user.sub]);
  if (!sessionResult.rows.length) {
    return res.status(404).json({ error: 'Case session not found' });
  }

  const existing = sessionResult.rows[0];
  const answers = req.body?.answers || existing.answers || {};
  const progress = req.body?.progress || existing.progress || {};
  const grade = gradeCaseSession(existing.case_snapshot, answers);

  const updated = await query(
    `UPDATE case_sessions SET answers = $1::jsonb, progress = $2::jsonb, score = $3, status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = $4 RETURNING *`,
    [JSON.stringify(answers), JSON.stringify({ ...progress, breakdown: grade.breakdown }), grade.score, req.params.id]
  );

  res.json({ session: updated.rows[0], grading: grade });
});

app.get('/api/sessions/:code', async (req, res) => {
  const result = await query(`SELECT * FROM live_sessions WHERE session_code = $1 AND status = 'active'`, [req.params.code.toUpperCase()]);
  if (!result.rows.length) {
    return res.status(404).json({ error: 'Live session not found' });
  }
  res.json({ session: formatLiveSession(result.rows[0]) });
});

app.get('/api/sessions/:code/responses', async (req, res) => {
  const result = await query(`SELECT id FROM live_sessions WHERE session_code = $1 AND status = 'active'`, [req.params.code.toUpperCase()]);
  if (!result.rows.length) {
    return res.status(404).json({ error: 'Live session not found' });
  }

  const summary = await getLiveResponseSummary(result.rows[0].id);
  res.json({ summary });
});

app.post('/api/sessions/:code/push', authenticateRequest, async (req, res) => {
  const { data } = req.body || {};
  if (!data) {
    return res.status(400).json({ error: 'A payload is required' });
  }

  const result = await query(
    `UPDATE live_sessions ls
     SET last_payload = $1::jsonb, updated_at = NOW()
     FROM case_studies cs
     WHERE ls.session_code = $2 AND ls.case_study_id = cs.id AND cs.owner_user_id = $3 AND ls.status = 'active'
     RETURNING ls.*`,
    [JSON.stringify(data), req.params.code.toUpperCase(), req.user.sub]
  );

  if (!result.rows.length) {
    return res.status(404).json({ error: 'Live session not found' });
  }

  sendSessionEvent(result.rows[0].session_code, result.rows[0]);
  res.json({ session: formatLiveSession(result.rows[0]) });
});

app.post('/api/sessions/:code/responses', async (req, res) => {
  const { questionNumber, answer, participantId, participantName } = req.body || {};
  if (!questionNumber || !participantId) {
    return res.status(400).json({ error: 'questionNumber and participantId are required' });
  }

  const sessionResult = await query(
    `SELECT id, session_code
     FROM live_sessions
     WHERE session_code = $1 AND status = 'active'`,
    [req.params.code.toUpperCase()]
  );

  if (!sessionResult.rows.length) {
    return res.status(404).json({ error: 'Live session not found' });
  }

  const session = sessionResult.rows[0];
  const answerText = normalizeLiveAnswerText(answer);

  await query(
    `INSERT INTO live_session_responses (id, live_session_id, question_number, participant_id, participant_name, answer_text, answer_json)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     ON CONFLICT (live_session_id, question_number, participant_id)
     DO UPDATE SET participant_name = EXCLUDED.participant_name,
                   answer_text = EXCLUDED.answer_text,
                   answer_json = EXCLUDED.answer_json,
                   updated_at = NOW()`,
    [
      createId('live_response'),
      session.id,
      String(questionNumber),
      String(participantId),
      (participantName || 'Guest learner').trim(),
      answerText,
      JSON.stringify(answer ?? null),
    ]
  );

  const summary = await getLiveResponseSummary(session.id);
  await sendResponseEvent(session.session_code, session.id);
  res.status(201).json({ summary });
});

app.post('/api/sessions/:code/control', authenticateRequest, async (req, res) => {
  const { stepIndex, revealAnswers } = req.body || {};
  const normalizedStepIndex = Math.max(0, Number(stepIndex || 0));
  const result = await query(
    `UPDATE live_sessions ls
     SET step_index = $1, reveal_answers = $2, updated_at = NOW()
     FROM case_studies cs
     WHERE ls.session_code = $3 AND ls.case_study_id = cs.id AND cs.owner_user_id = $4 AND ls.status = 'active'
     RETURNING ls.*`,
    [normalizedStepIndex, Boolean(revealAnswers), req.params.code.toUpperCase(), req.user.sub]
  );

  if (!result.rows.length) {
    return res.status(404).json({ error: 'Live session not found' });
  }

  sendSessionEvent(result.rows[0].session_code, result.rows[0]);
  res.json({ session: formatLiveSession(result.rows[0]) });
});

app.get('/api/sessions/:code/stream', async (req, res) => {
  const sessionCode = req.params.code.toUpperCase();
  const result = await query('SELECT * FROM live_sessions WHERE session_code = $1 AND status = $2', [sessionCode, 'active']);
  if (!result.rows.length) {
    return res.status(404).json({ error: 'Live session not found' });
  }

  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  const clients = sessionClients.get(sessionCode) || [];
  clients.push(res);
  sessionClients.set(sessionCode, clients);
  res.write(`event: case-update\ndata: ${JSON.stringify(formatLiveSession(result.rows[0]))}\n\n`);
  res.write(`event: response-update\ndata: ${JSON.stringify(await getLiveResponseSummary(result.rows[0].id))}\n\n`);

  req.on('close', () => {
    const currentClients = sessionClients.get(sessionCode) || [];
    sessionClients.set(sessionCode, currentClients.filter((client) => client !== res));
  });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Unexpected server error' });
});

initializeDatabase()
  .then(() => {
    app.listen(config.port, () => {
      console.log(`API server listening on http://localhost:${config.port}`);
    });
  })
  .catch((error) => {
    console.error('Failed to start server', error);
    pool.end();
    process.exit(1);
  });
