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
  optionalAuthenticateRequest,
} = require('./auth');
const sampleCase = require('../src/case_study.json');
const legacyDrugList = require('../src/components/prescriptions/drugList.json');

const seedDrugLibraryCsvPath = path.join(__dirname, 'seed', 'drug-library.seed.csv');

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

function hasEducatorAccess(user) {
  return user?.role === 'educator' || user?.role === 'educator_admin';
}

function hasEducatorAdminAccess(user) {
  return user?.role === 'educator_admin';
}

const ACCESS_REMOVAL_RETENTION_DAYS = 365;
const DRUG_CATEGORY_OPTIONS = [
  '',
  'Insulin',
  'Anticoagulant',
  'Antibiotic',
  'Analgesic',
  'Cardiovascular',
  'Respiratory',
  'Endocrine',
  'Gastrointestinal',
  'Neurology',
];

function normalizeDrugCategory(value) {
  const trimmedValue = String(value || '').trim();
  if (!trimmedValue) {
    return '';
  }

  const match = DRUG_CATEGORY_OPTIONS.find((option) => option.toLowerCase() === trimmedValue.toLowerCase());
  return match || null;
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

  return lines.slice(1).map((line, lineIndex) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    return {
      rowNumber: lineIndex + 2,
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
      maximumDose: row.maximum_dose || row.max_dose || '',
      notes: row.notes || '',
    };
  });
}

let cachedSeedDrugLibraryRows = null;

function scoreDrugLibraryItem(item) {
  return [
    item.defaultRoute,
    item.usualFrequencies,
    item.defaultDose,
    item.maximumDose,
    item.notes,
    item.unit,
    item.form,
    item.strength,
  ].reduce((total, value) => total + (String(value || '').trim() ? 1 : 0), 0);
}

function dedupeDrugLibraryItems(items) {
  const bestByKey = new Map();

  (items || []).forEach((item) => {
    const key = [
      String(item.drugName || '').trim().toLowerCase(),
      String(item.strength || '').trim().toLowerCase(),
      String(item.form || '').trim().toLowerCase(),
      String(item.defaultRoute || '').trim().toLowerCase(),
    ].join('||');
    const existing = bestByKey.get(key);

    if (!existing || scoreDrugLibraryItem(item) > scoreDrugLibraryItem(existing)) {
      bestByKey.set(key, item);
    }
  });

  return [...bestByKey.values()];
}

function getSeedDrugLibraryRows() {
  if (cachedSeedDrugLibraryRows) {
    return cachedSeedDrugLibraryRows;
  }

  if (fs.existsSync(seedDrugLibraryCsvPath)) {
    const csvContent = fs.readFileSync(seedDrugLibraryCsvPath, 'utf8');
    cachedSeedDrugLibraryRows = dedupeDrugLibraryItems(parseDrugLibraryCsv(csvContent)
      .map((item) => ({
        ...item,
        drugName: String(item.drugName || '').trim(),
        strength: String(item.strength || '').trim(),
        unit: String(item.unit || '').trim(),
        form: String(item.form || '').trim(),
        defaultRoute: String(item.defaultRoute || '').trim(),
        aliases: String(item.aliases || '').trim(),
        category: normalizeDrugCategory(item.category) || '',
        usualFrequencies: String(item.usualFrequencies || '').trim(),
        defaultDose: String(item.defaultDose || '').trim(),
        maximumDose: String(item.maximumDose || '').trim(),
        notes: String(item.notes || '').trim(),
      }))
      .filter((item) => item.drugName));
    return cachedSeedDrugLibraryRows;
  }

  cachedSeedDrugLibraryRows = dedupeDrugLibraryItems((legacyDrugList.drugs || []).map((item) => ({
    drugName: item[0] || '',
    strength: item[1] || '',
    unit: item[2] || '',
    form: item[3] || '',
    defaultRoute: item[4] || '',
    aliases: '',
    category: '',
    usualFrequencies: '',
    defaultDose: '',
    maximumDose: '',
    notes: '',
  })).filter((item) => item.drugName));

  return cachedSeedDrugLibraryRows;
}

function parseGenericCsvRows(csvContent) {
  const lines = String(csvContent || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map((header) => String(header || '').trim().toLowerCase());

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    return row;
  });
}

function normalizeLookupLabel(value) {
  return String(value || '').trim().toLowerCase();
}

function buildSortedUniqueLabels(values) {
  const lookup = new Map();
  (values || []).forEach((value) => {
    const trimmedValue = String(value || '').trim();
    const normalizedValue = normalizeLookupLabel(trimmedValue);
    if (trimmedValue && !lookup.has(normalizedValue)) {
      lookup.set(normalizedValue, trimmedValue);
    }
  });
  return [...lookup.values()].sort((left, right) => left.localeCompare(right));
}

const DRUG_IMPORT_VALUE_PATTERN = /^[a-z0-9\s.,/%()+\-]+$/i;

async function validateDrugImportRows(items, replaceExisting = true, dbClient = null) {
  const errors = [];
  const warnings = [];
  const runner = dbClient || { query };
  const seenFileKeys = new Map();

  const existingDrugNames = replaceExisting
    ? new Set()
    : new Set(
      (await runner.query('SELECT drug_name FROM drug_library_items'))
        .rows
        .map((row) => normalizeMedicationName(row.drug_name))
        .filter(Boolean)
    );

  const pushIssue = (collection, severity, rowNumber, drugName, message) => {
    collection.push({
      severity,
      rowNumber,
      drugName: String(drugName || '').trim() || 'Unnamed drug',
      message,
    });
  };

  items.forEach((item) => {
    const rowNumber = item.rowNumber || null;
    const drugName = String(item.drugName || '').trim();
    const form = String(item.form || '').trim();
    const route = String(item.defaultRoute || '').trim();
    const frequency = String(item.usualFrequencies || '').trim();
    const strength = String(item.strength || '').trim();
    const unit = String(item.unit || '').trim();
    const defaultDose = String(item.defaultDose || '').trim();
    const key = `${normalizeMedicationName(drugName)}|${normalizeLookupLabel(strength)}|${normalizeLookupLabel(unit)}|${normalizeLookupLabel(form)}`;

    if (!drugName) {
      pushIssue(errors, 'error', rowNumber, drugName, 'Drug name is required.');
      return;
    }

    if (!form) {
      pushIssue(warnings, 'warning', rowNumber, drugName, 'Form is blank. The drug will import, but prescribing defaults may feel incomplete.');
    }

    if (!route) {
      pushIssue(warnings, 'warning', rowNumber, drugName, 'Default route is blank.');
    }

    if (!frequency) {
      pushIssue(warnings, 'warning', rowNumber, drugName, 'Usual frequency is blank.');
    }

    if (!strength && !defaultDose) {
      pushIssue(warnings, 'warning', rowNumber, drugName, 'Both strength and default dose are blank.');
    }

    if (strength && !DRUG_IMPORT_VALUE_PATTERN.test(strength)) {
      pushIssue(warnings, 'warning', rowNumber, drugName, `Strength "${strength}" contains unusual characters. Please check it before importing.`);
    }

    if (defaultDose && !DRUG_IMPORT_VALUE_PATTERN.test(defaultDose)) {
      pushIssue(warnings, 'warning', rowNumber, drugName, `Default dose "${defaultDose}" contains unusual characters. Please check it before importing.`);
    }

    if (!strength && unit) {
      pushIssue(warnings, 'warning', rowNumber, drugName, 'A unit is present but strength is blank.');
    }

    if (String(item.category || '').trim() && !normalizeDrugCategory(item.category)) {
      pushIssue(errors, 'error', rowNumber, drugName, `Category "${item.category}" is not in the allowed category list.`);
    }

    if (seenFileKeys.has(key)) {
      const firstSeenRow = seenFileKeys.get(key);
      pushIssue(errors, 'error', rowNumber, drugName, `This row duplicates row ${firstSeenRow} in the import file.`);
    } else {
      seenFileKeys.set(key, rowNumber);
    }

    if (existingDrugNames.has(normalizeMedicationName(drugName))) {
      pushIssue(warnings, 'warning', rowNumber, drugName, 'A drug with this name already exists in the library and may create duplicates if you append instead of replace.');
    }
  });

  return {
    errors,
    warnings,
    summary: {
      totalRows: items.length,
      validRows: items.filter((item) => String(item.drugName || '').trim()).length,
      errorCount: errors.length,
      warningCount: warnings.length,
    },
  };
}

async function getDrugImportLookupPreview(items, dbClient = null) {
  const runner = dbClient || { query };
  const [routesResult, frequenciesResult, unitsResult, formsResult] = await Promise.all([
    runner.query('SELECT label FROM route_options'),
    runner.query('SELECT label FROM frequency_options'),
    runner.query('SELECT label FROM unit_options'),
    runner.query('SELECT label FROM form_options'),
  ]);

  const existingRoutes = new Set(routesResult.rows.map((row) => normalizeLookupLabel(row.label)));
  const existingFrequencies = new Set(frequenciesResult.rows.map((row) => normalizeLookupLabel(row.label)));
  const existingUnits = new Set(unitsResult.rows.map((row) => normalizeLookupLabel(row.label)));
  const existingForms = new Set(formsResult.rows.map((row) => normalizeLookupLabel(row.label)));

  return {
    routes: buildSortedUniqueLabels(items.map((item) => item.defaultRoute).filter(Boolean))
      .filter((label) => !existingRoutes.has(normalizeLookupLabel(label))),
    frequencies: buildSortedUniqueLabels(items.map((item) => item.usualFrequencies).filter(Boolean))
      .filter((label) => !existingFrequencies.has(normalizeLookupLabel(label))),
    units: buildSortedUniqueLabels(items.map((item) => item.unit).filter(Boolean))
      .filter((label) => !existingUnits.has(normalizeLookupLabel(label))),
    forms: buildSortedUniqueLabels(items.map((item) => item.form).filter(Boolean))
      .filter((label) => !existingForms.has(normalizeLookupLabel(label))),
  };
}

function hasConfirmedAllMissingLookups(preview, confirmedMissing = {}) {
  const expectedRoutes = buildSortedUniqueLabels(preview.routes || []);
  const confirmedRoutes = buildSortedUniqueLabels(confirmedMissing.routes || []);
  const expectedUnits = buildSortedUniqueLabels(preview.units || []);
  const confirmedUnits = buildSortedUniqueLabels(confirmedMissing.units || []);
  const expectedForms = buildSortedUniqueLabels(preview.forms || []);
  const confirmedForms = buildSortedUniqueLabels(confirmedMissing.forms || []);
  const expectedFrequencies = buildSortedUniqueLabels(preview.frequencies || []);
  const confirmedFrequencies = confirmedMissing.frequencies || {};
  const confirmedFrequencyLabels = buildSortedUniqueLabels(Object.keys(confirmedFrequencies));

  return (
    JSON.stringify(expectedRoutes) === JSON.stringify(confirmedRoutes)
    && JSON.stringify(expectedUnits) === JSON.stringify(confirmedUnits)
    && JSON.stringify(expectedForms) === JSON.stringify(confirmedForms)
    && JSON.stringify(expectedFrequencies) === JSON.stringify(confirmedFrequencyLabels)
    && expectedFrequencies.every((label) => String(confirmedFrequencies[label] || '').trim())
  );
}

async function insertLookupOptions(client, tableName, labels, extraColumns = {}) {
  const uniqueLabels = buildSortedUniqueLabels(labels);
  if (!uniqueLabels.length) {
    return;
  }

  const nextSortOrderResult = await client.query(`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort_order FROM ${tableName}`);
  let nextSortOrder = Number(nextSortOrderResult.rows[0]?.next_sort_order || 0);

  for (const label of uniqueLabels) {
    const columns = ['id', 'label', ...Object.keys(extraColumns), 'sort_order'];
    const values = [createId(tableName.replace('_options', '_option')), label, ...Object.values(extraColumns), nextSortOrder];
    const placeholders = values.map((_value, index) => `$${index + 1}`).join(', ');
    await client.query(
      `INSERT INTO ${tableName} (${columns.join(', ')})
       VALUES (${placeholders})
       ON CONFLICT (label) DO NOTHING`,
      values
    );
    nextSortOrder += 1;
  }
}

async function insertFrequencyOptions(client, frequencyMap = {}) {
  const labels = buildSortedUniqueLabels(Object.keys(frequencyMap));
  if (!labels.length) {
    return;
  }

  const nextSortOrderResult = await client.query('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort_order FROM frequency_options');
  let nextSortOrder = Number(nextSortOrderResult.rows[0]?.next_sort_order || 0);

  for (const label of labels) {
    const defaultAdminTimes = String(frequencyMap[label] || '').trim();
    await client.query(
      `INSERT INTO frequency_options (id, label, default_admin_times, sort_order)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (label) DO NOTHING`,
      [createId('frequency_option'), label, defaultAdminTimes, nextSortOrder]
    );
    nextSortOrder += 1;
  }
}

async function seedDrugUnitAndFormOptions() {
  const [unitsResult, formsResult] = await Promise.all([
    query(`SELECT DISTINCT unit AS label
           FROM drug_library_items
           WHERE TRIM(COALESCE(unit, '')) <> ''
           ORDER BY unit ASC`),
    query(`SELECT DISTINCT form AS label
           FROM drug_library_items
           WHERE TRIM(COALESCE(form, '')) <> ''
           ORDER BY form ASC`),
  ]);

  await withTransaction(async (client) => {
    await insertLookupOptions(client, 'unit_options', unitsResult.rows.map((row) => row.label));
    await insertLookupOptions(client, 'form_options', formsResult.rows.map((row) => row.label));
  });
}

const frequencyAdminTimes = {
  'Once daily': '08:00',
  'Once weekly': '08:00',
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

async function seedIndicationOptions() {
  const indications = [
    'Abdominal pain',
    'Acne',
    'Acute coronary syndrome',
    'Acute kidney injury',
    'Acute migraine',
    'Acute psychosis',
    'Agitation',
    'Alcohol withdrawal',
    'Allergic reaction',
    'Anaemia',
    'Angina',
    'Anxiety',
    'Asthma',
    'Atrial fibrillation',
    'Bacterial conjunctivitis',
    'Benign prostatic hyperplasia',
    'Bipolar disorder',
    'Bleeding prophylaxis',
    'Bone protection',
    'Bradycardia',
    'Breast cancer',
    'Candidiasis',
    'Cellulitis prophylaxis',
    'Cellulitis',
    'Chronic constipation',
    'Chronic kidney disease',
    'Chronic pain',
    'Chronic stable angina',
    'Chronic obstructive pulmonary disease exacerbation',
    'Chest infection',
    'Chronic obstructive pulmonary disease',
    'Cluster headache',
    'Colorectal cancer',
    'Community acquired pneumonia',
    'Constipation',
    'Convulsions',
    'Cough',
    'Crohn\'s disease',
    'Delirium',
    'Depression',
    'Deep vein thrombosis prophylaxis',
    'Deep vein thrombosis treatment',
    'Dehydration',
    'Diabetic ketoacidosis',
    'Diabetic neuropathy',
    'Diverticulitis',
    'Dyspepsia',
    'Eczema',
    'Electrolyte replacement',
    'Endocarditis',
    'Endometriosis',
    'Epilepsy',
    'Erectile dysfunction',
    'Extrapyramidal side effects',
    'Eye infection',
    'Falls prevention',
    'Fever',
    'Fluid resuscitation',
    'Fluid overload',
    'Folate deficiency',
    'Functional dyspepsia',
    'Fungal infection',
    'Gastro-oesophageal reflux disease',
    'Gastritis',
    'Generalised anxiety disorder',
    'Gout',
    'Haemorrhoids',
    'Heart failure',
    'Helicobacter pylori eradication',
    'High cholesterol',
    'Hospital acquired pneumonia',
    'Hypercalcaemia',
    'Hyperglycaemia',
    'Hyperkalaemia',
    'Hyperlipidaemia',
    'Hyperthyroidism',
    'Hypertension',
    'Hypocalcaemia',
    'Hypoglycaemia',
    'Hypokalaemia',
    'Hypomagnesaemia',
    'Hypophosphataemia',
    'Hypotension',
    'Hypothyroidism',
    'IBS',
    'Indigestion',
    'Infection',
    'Inflammatory bowel disease',
    'Influenza',
    'Insomnia',
    'Iron deficiency anaemia',
    'Ischaemic heart disease',
    'Itching',
    'Laxative therapy',
    'Liver encephalopathy',
    'Lower respiratory tract infection',
    'Malaria prophylaxis',
    'Mastitis',
    'Melena',
    'Meniere\'s disease',
    'Menorrhagia',
    'Methotrexate rescue',
    'Migraine prophylaxis',
    'Migraine',
    'Mood stabilisation',
    'Nausea or vomiting',
    'Neuropathic pain',
    'Neutropenic sepsis',
    'Nicotine dependence',
    'Oedema',
    'Oesophagitis',
    'Oncology supportive care',
    'Open angle glaucoma',
    'Opioid induced constipation',
    'Osteoarthritis',
    'Osteoporosis',
    'Pain',
    'Pain or pyrexia',
    'Parkinson\'s disease',
    'Peptic ulcer disease',
    'Peripheral neuropathy',
    'Pneumocystis jirovecii pneumonia prophylaxis',
    'Post-operative pain',
    'Post-operative nausea and vomiting',
    'Pre-eclampsia',
    'Pressure ulcer infection',
    'Procedural sedation',
    'Psoriasis',
    'Pulmonary oedema',
    'Pyrexia',
    'QT prolongation',
    'Rash',
    'Rheumatoid arthritis',
    'Rhinitis',
    'Scabies',
    'Schizophrenia',
    'Seizure prophylaxis',
    'Sepsis',
    'Severe asthma',
    'Skin and soft tissue infection',
    'Smoking cessation',
    'Spasticity',
    'Status epilepticus',
    'Steroid replacement',
    'Stroke prevention',
    'Superficial thrombophlebitis',
    'Shortness of breath',
    'Tachycardia',
    'Terminal agitation',
    'Thiamine replacement',
    'Thrush',
    'Thyrotoxicosis',
    'Tinea infection',
    'Tonsillitis',
    'Toxin exposure',
    'Type 1 diabetes mellitus',
    'Type 2 diabetes mellitus',
    'Ulcerative colitis',
    'Upper gastrointestinal bleed',
    'Upper respiratory tract infection',
    'Urinary tract infection',
    'Urticaria',
    'Venous thromboembolism treatment',
    'Vertigo',
    'Vomiting',
    'VTE prophylaxis',
    'Ward stock replacement',
    'Wheeze or shortness of breath',
    'Wound infection',
  ];

  const existing = await query('SELECT COUNT(*)::int AS total FROM indication_options');
  if (!existing.rows[0]?.total) {
    for (const [index, label] of indications.entries()) {
      await query(
        'INSERT INTO indication_options (id, label, sort_order) VALUES ($1, $2, $3)',
        [createId('indication_option'), label, index]
      );
    }
    return;
  }

  for (const [index, label] of indications.entries()) {
    await query(
      `INSERT INTO indication_options (id, label, sort_order)
       VALUES ($1, $2, $3)
       ON CONFLICT (label) DO UPDATE
       SET sort_order = EXCLUDED.sort_order`,
      [createId('indication_option'), label, index]
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

  const seedRows = getSeedDrugLibraryRows().map((item) => ({
    drugName: item.drugName || '',
    strength: item.strength || '',
    unit: item.unit || '',
    form: item.form || '',
    defaultRoute: item.defaultRoute || '',
    aliases: item.aliases || '',
    category: item.category || '',
    isInfusion: false,
    usualFrequencies: item.usualFrequencies || '',
    defaultDose: item.defaultDose || '',
    defaultIndication: '',
    highRisk: false,
    requiresWitness: false,
    requiresDiluent: false,
    defaultDiluent: '',
    defaultVolume: '',
    maximumDose: item.maximumDose || '',
    notes: item.notes || '',
  })).filter((item) => item.drugName);

  for (const item of seedRows) {
    await query(
      `INSERT INTO drug_library_items (
         id, drug_name, strength, unit, form, default_route, aliases, category, is_infusion,
         usual_frequencies, default_dose, default_indication, high_risk, requires_witness, requires_diluent,
         default_diluent, default_volume, maximum_dose, notes
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
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
        item.maximumDose,
        item.notes,
      ]
    );
  }
}

async function seedGuaranteedDrugLibraryItems() {
  await ensureDrugLibraryItem({
    drugName: 'Warfarin',
    strength: '',
    unit: 'mg',
    form: 'tablet',
    defaultRoute: 'Oral',
    aliases: 'warfarin sodium',
    category: 'Anticoagulant',
    usualFrequencies: 'Once daily',
    defaultDose: '',
    defaultIndication: 'Anticoagulation',
    maximumDose: '',
    notes: 'Supports weekday-specific dosing for anticoagulation prescriptions.',
  });
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
    await query(
      `UPDATE drug_library_items
       SET unit = $2,
           default_route = $3,
           aliases = $4,
           category = $5,
           is_infusion = $6,
           usual_frequencies = $7,
           default_dose = $8,
           default_indication = $9,
           high_risk = $10,
           requires_witness = $11,
           requires_diluent = $12,
           default_diluent = $13,
           default_volume = $14,
           maximum_dose = $15,
           notes = $16,
           updated_at = NOW()
       WHERE id = $1`,
      [
        existing.rows[0].id,
        item.unit || '',
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
        item.maximumDose || '',
        item.notes || '',
      ]
    );
    return;
  }

  await query(
    `INSERT INTO drug_library_items (
       id, drug_name, strength, unit, form, default_route, aliases, category, is_infusion,
       usual_frequencies, default_dose, default_indication, high_risk, requires_witness, requires_diluent,
       default_diluent, default_volume, maximum_dose, notes
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
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
      item.maximumDose || '',
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
    deliveryMode: row.status === 'live_classroom' ? 'live_classroom' : row.status === 'self_paced' ? 'self_paced' : 'none',
    studentAccessEnabled: Boolean(row.student_access_enabled),
    isFavourite: Boolean(row.is_favourite),
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function formatUserAccount(row) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    accountStatus: row.account_status || 'active',
    accessSuspendedAt: row.access_suspended_at,
    accessSuspendedReason: row.access_suspended_reason || '',
    accessRemovedAt: row.access_removed_at,
    accessRemovedReason: row.access_removed_reason || '',
    retentionReviewAt: row.retention_review_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ownedCaseStudyCount: Number(row.owned_case_study_count || 0),
    caseSessionCount: Number(row.case_session_count || 0),
    testPatientCount: Number(row.test_patient_count || 0),
  };
}

async function listCaseStudyAccessSummary(caseStudyIds = []) {
  if (!caseStudyIds.length) {
    return new Map();
  }

  const [attemptResult, liveResult] = await Promise.all([
    query(
    `SELECT cs.case_study_id,
            u.display_name,
            u.email,
            cs.started_at,
            cs.updated_at
     FROM case_sessions cs
     INNER JOIN users u ON u.id = cs.user_id
     WHERE cs.case_study_id = ANY($1::text[])
     ORDER BY cs.updated_at DESC`,
    [caseStudyIds]
    ),
    query(
      `SELECT ls.case_study_id,
              u.display_name,
              u.email,
              lsp.participant_name,
              lsp.joined_at,
              lsp.last_viewed_at,
              ls.session_code
       FROM live_session_participants lsp
       INNER JOIN live_sessions ls ON ls.id = lsp.live_session_id
       INNER JOIN users u ON u.id = lsp.user_id
       WHERE ls.case_study_id = ANY($1::text[])
       ORDER BY lsp.last_viewed_at DESC`,
      [caseStudyIds]
    ),
  ]);

  const rows = [
    ...attemptResult.rows.map((row) => ({
      caseStudyId: row.case_study_id,
      learnerName: row.display_name,
      learnerEmail: row.email,
      startedAt: row.started_at,
      updatedAt: row.updated_at,
      accessType: 'self_paced',
      sessionCode: '',
    })),
    ...liveResult.rows.map((row) => ({
      caseStudyId: row.case_study_id,
      learnerName: row.display_name || row.participant_name,
      learnerEmail: row.email,
      startedAt: row.joined_at,
      updatedAt: row.last_viewed_at,
      accessType: 'live_session',
      sessionCode: row.session_code,
    })),
  ].sort((left, right) => new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0));

  const summary = new Map();
  rows.forEach((row) => {
    const existing = summary.get(row.caseStudyId) || [];
    if (existing.length < 10) {
      existing.push({
        learnerName: row.learnerName,
        learnerEmail: row.learnerEmail,
        startedAt: row.startedAt,
        updatedAt: row.updatedAt,
        accessType: row.accessType,
        sessionCode: row.sessionCode,
      });
    }
    summary.set(row.caseStudyId, existing);
  });
  return summary;
}

async function listCaseStudyCompletedSummary(caseStudyIds = []) {
  if (!caseStudyIds.length) {
    return new Map();
  }

  const result = await query(
    `SELECT case_study_id,
            COUNT(*)::int AS completed_count
     FROM case_sessions
     WHERE case_study_id = ANY($1::text[])
       AND status = 'completed'
     GROUP BY case_study_id`,
    [caseStudyIds]
  );

  return new Map(
    result.rows.map((row) => [row.case_study_id, Number(row.completed_count || 0)])
  );
}

async function listCaseStudyShareSummary(caseStudyIds = []) {
  if (!caseStudyIds.length) {
    return new Map();
  }

  const result = await query(
    `SELECT s.case_study_id,
            s.id,
            s.share_type,
            s.recipient_email,
            s.created_at,
            u.display_name
     FROM case_study_shares s
     LEFT JOIN users u ON u.id = s.recipient_user_id
     WHERE s.case_study_id = ANY($1::text[])
     ORDER BY s.created_at DESC`,
    [caseStudyIds]
  );

  const summary = new Map();
  result.rows.forEach((row) => {
    const existing = summary.get(row.case_study_id) || [];
    existing.push({
      id: row.id,
      shareType: row.share_type,
      recipientEmail: row.recipient_email,
      recipientName: row.display_name || '',
      sharedAt: row.created_at,
    });
    summary.set(row.case_study_id, existing);
  });
  return summary;
}

function formatCaseStudySet(row) {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    title: row.title,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listCaseStudySetsForOwner(ownerUserId) {
  const result = await query(
    `SELECT css.*, csi.case_study_id, cs.title AS case_title, cs.summary AS case_summary
     FROM case_study_sets css
     LEFT JOIN case_study_set_items csi ON csi.case_study_set_id = css.id
     LEFT JOIN case_studies cs ON cs.id = csi.case_study_id
     WHERE css.owner_user_id = $1
     ORDER BY css.updated_at DESC, csi.sort_order ASC, csi.created_at ASC`,
    [ownerUserId]
  );

  const grouped = new Map();
  result.rows.forEach((row) => {
    const existing = grouped.get(row.id) || {
      ...formatCaseStudySet(row),
      caseStudies: [],
    };
    if (row.case_study_id) {
      existing.caseStudies.push({
        caseStudyId: row.case_study_id,
        title: row.case_title,
        summary: row.case_summary,
      });
    }
    grouped.set(row.id, existing);
  });

  return Array.from(grouped.values());
}

async function listCaseStudySetsForStudent(userId) {
  const result = await query(
    `SELECT css.*, csi.case_study_id, cs.title AS case_title, cs.summary AS case_summary,
            cs.status AS case_status, cs.student_access_enabled
     FROM case_study_set_shares shares
     INNER JOIN case_study_sets css ON css.id = shares.case_study_set_id
     LEFT JOIN case_study_set_items csi ON csi.case_study_set_id = css.id
     LEFT JOIN case_studies cs ON cs.id = csi.case_study_id
     WHERE shares.recipient_user_id = $1
     ORDER BY css.updated_at DESC, csi.sort_order ASC, csi.created_at ASC`,
    [userId]
  );

  const grouped = new Map();
  result.rows.forEach((row) => {
    const existing = grouped.get(row.id) || {
      ...formatCaseStudySet(row),
      caseStudies: [],
    };
    if (row.case_study_id) {
      existing.caseStudies.push({
        caseStudyId: row.case_study_id,
        title: row.case_title,
        summary: row.case_summary,
        status: row.case_status,
        studentAccessEnabled: Boolean(row.student_access_enabled),
      });
    }
    grouped.set(row.id, existing);
  });

  return Array.from(grouped.values());
}

function formatLiveSession(row) {
  return {
    id: row.id,
    sessionCode: row.session_code,
    status: row.status,
    payload: row.last_payload,
    stepIndex: row.step_index,
    revealAnswers: row.reveal_answers,
    presentationStage: row.last_payload?.livePresentationStage === 'initial' ? 'initial' : 'full',
    currentStageIndex: Math.max(0, Number(row.last_payload?.currentStageIndex || 0)),
    updatedAt: row.updated_at,
  };
}

function mergeLiveStagePatch(base = {}, patch = {}) {
  const merged = { ...base };
  Object.entries(patch || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      merged[key] = value;
      return;
    }

    if (value && typeof value === 'object') {
      merged[key] = mergeLiveStagePatch(merged[key] && typeof merged[key] === 'object' ? merged[key] : {}, value);
      return;
    }

    if (value !== undefined) {
      merged[key] = value;
    }
  });

  return merged;
}

function getLivePresentationPayload(caseStudy = {}) {
  const liveStages = Array.isArray(caseStudy.liveStages) ? caseStudy.liveStages : [];
  if (!caseStudy.isStagedLiveCase || !liveStages.length) {
    return caseStudy;
  }

  const stageIndex = Math.max(0, Math.min(Number(caseStudy.currentStageIndex || 0), liveStages.length - 1));
  return liveStages.slice(0, stageIndex + 1).reduce((current, stage, index) => {
    if (index === 0 && !Object.keys(stage.patch || {}).length) {
      return current;
    }
    return mergeLiveStagePatch(current, stage.patch || {});
  }, caseStudy);
}

function getNextQuestionTriggeredStageIndex(caseStudy = {}, questionNumber) {
  const liveStages = Array.isArray(caseStudy.liveStages) ? caseStudy.liveStages : [];
  if (!caseStudy.isStagedLiveCase || !liveStages.length) {
    return null;
  }

  const currentStageIndex = Math.max(0, Math.min(Number(caseStudy.currentStageIndex || 0), liveStages.length - 1));
  const nextStage = liveStages[currentStageIndex + 1];
  if (
    nextStage?.trigger?.type === 'question'
    && String(nextStage.trigger.questionNumber || '') === String(questionNumber)
  ) {
    return currentStageIndex + 1;
  }

  return null;
}

function hasManualStageProgression(caseStudy = {}) {
  const liveStages = Array.isArray(caseStudy.liveStages) ? caseStudy.liveStages : [];
  if (!caseStudy.isStagedLiveCase || !liveStages.length) {
    return false;
  }

  return liveStages.some((stage, index) => index > 0 && stage.trigger?.type !== 'question');
}

function advanceCaseStudyStageForQuestion(caseStudy = {}, questionNumber) {
  const nextStageIndex = getNextQuestionTriggeredStageIndex(caseStudy, questionNumber);
  if (nextStageIndex === null) {
    return caseStudy;
  }

  return sanitizeCaseStudy({
    ...caseStudy,
    currentStageIndex: nextStageIndex,
    livePresentationStage: 'full',
  });
}

function hasValidLiveStageTriggers(caseStudy = {}) {
  const liveStages = Array.isArray(caseStudy.liveStages) ? caseStudy.liveStages : [];
  if (!caseStudy.isStagedLiveCase || !liveStages.length) {
    return true;
  }

  return liveStages.every((stage, index) => {
    if (index === 0 || stage.trigger?.type !== 'question') {
      return true;
    }

    const previousPayload = getLivePresentationPayload({
      ...caseStudy,
      currentStageIndex: index - 1,
    });
    const questions = Array.isArray(previousPayload.questions) ? previousPayload.questions : [];
    return questions.some((question, questionIndex) => (
      String(question.questionNumber || questionIndex + 1) === String(stage.trigger.questionNumber || '')
    ));
  });
}

function gradeLiveSessionForParticipant(caseStudy, responseRows = []) {
  const questions = Array.isArray(caseStudy?.questions) ? caseStudy.questions : [];
  const answerLookup = new Map(
    responseRows.map((row) => [String(row.question_number), row.answer_json])
  );
  const scorableQuestions = questions.filter((question) => isObjectiveQuestion(question) || isWorkthroughTask(question));
  const answeredCount = answerLookup.size;
  const correctCount = scorableQuestions.filter((question) => {
    const submitted = answerLookup.get(String(question.questionNumber));
    if (submitted === undefined) {
      return false;
    }
    if (isObjectiveQuestion(question)) {
      return answersEqual(question, submitted);
    }
    return matchesStructuredTask(question, submitted);
  }).length;

  return {
    answeredCount,
    correctCount,
    totalQuestions: questions.length,
    totalScorable: scorableQuestions.length,
    score: scorableQuestions.length === 0 ? null : Number(((correctCount / scorableQuestions.length) * 100).toFixed(2)),
  };
}

async function listStudentLiveSessions(userId) {
  const result = await query(
    `SELECT lsp.id,
            lsp.live_session_id,
            lsp.participant_id,
            lsp.participant_name,
            lsp.joined_at,
            lsp.last_viewed_at,
            ls.session_code,
            ls.status AS live_status,
            ls.last_payload,
            ls.updated_at AS live_updated_at,
            cs.id AS case_study_id,
            cs.title,
            cs.summary
     FROM live_session_participants lsp
     JOIN live_sessions ls ON ls.id = lsp.live_session_id
     JOIN case_studies cs ON cs.id = ls.case_study_id
     WHERE lsp.user_id = $1
     ORDER BY lsp.last_viewed_at DESC`,
    [userId]
  );

  if (!result.rows.length) {
    return [];
  }

  const responseResult = await query(
    `SELECT live_session_id, participant_id, question_number, answer_json
     FROM live_session_responses
     WHERE live_session_id = ANY($1::text[])`,
    [result.rows.map((row) => row.live_session_id)]
  );

  const responseMap = new Map();
  responseResult.rows.forEach((row) => {
    const key = `${row.live_session_id}:${row.participant_id}`;
    const existing = responseMap.get(key) || [];
    existing.push(row);
    responseMap.set(key, existing);
  });

  return result.rows.map((row) => {
    const caseStudy = normalizeCaseStudy(row.last_payload || {});
    const grade = gradeLiveSessionForParticipant(
      caseStudy,
      responseMap.get(`${row.live_session_id}:${row.participant_id}`) || []
    );

    return {
      id: row.id,
      liveSessionId: row.live_session_id,
      caseStudyId: row.case_study_id,
      title: row.title,
      summary: row.summary,
      sessionCode: row.session_code,
      status: row.live_status,
      joinedAt: row.joined_at,
      lastViewedAt: row.last_viewed_at,
      updatedAt: row.live_updated_at,
      participantName: row.participant_name,
      score: grade.score,
      answeredCount: grade.answeredCount,
      correctCount: grade.correctCount,
      totalQuestions: grade.totalQuestions,
      totalScorable: grade.totalScorable,
    };
  });
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

async function getLiveResponseSummary(sessionId, caseStudy = {}) {
  const responses = await query(
    `SELECT question_number, participant_id, participant_name, answer_text, answer_json, updated_at
     FROM live_session_responses
     WHERE live_session_id = $1
     ORDER BY updated_at DESC`,
    [sessionId]
  );
  const participants = await query(
    `SELECT participant_id, participant_name, joined_at, last_viewed_at
     FROM live_session_participants
     WHERE live_session_id = $1
     ORDER BY last_viewed_at DESC`,
    [sessionId]
  );

  const presentationCaseStudy = getLivePresentationPayload(caseStudy);
  const questions = Array.isArray(presentationCaseStudy?.questions) ? presentationCaseStudy.questions : [];
  const questionLookup = Object.fromEntries(questions.map((question) => [String(question.questionNumber), question]));
  const summary = {};
  const responsesByParticipant = new Map();
  const participantLookup = new Map();

  participants.rows.forEach((row) => {
    participantLookup.set(row.participant_id, {
      participantId: row.participant_id,
      participantName: row.participant_name,
      joinedAt: row.joined_at,
      lastViewedAt: row.last_viewed_at,
    });
  });

  responses.rows.forEach((row) => {
    if (!summary[row.question_number]) {
      summary[row.question_number] = {
        questionNumber: row.question_number,
        totalResponses: 0,
        counts: [],
        recent: [],
        correctCount: 0,
        incorrectCount: 0,
      };
    }
    const participantResponses = responsesByParticipant.get(row.participant_id) || [];
    participantResponses.push(row);
    responsesByParticipant.set(row.participant_id, participantResponses);
    if (!participantLookup.has(row.participant_id)) {
      participantLookup.set(row.participant_id, {
        participantId: row.participant_id,
        participantName: row.participant_name,
        joinedAt: null,
        lastViewedAt: row.updated_at,
      });
    }

    const questionSummary = summary[row.question_number];
    questionSummary.totalResponses += 1;

    const existingCount = questionSummary.counts.find((item) => item.answer === row.answer_text);
    if (existingCount) {
      existingCount.count += 1;
    } else {
      questionSummary.counts.push({
        answer: row.answer_text,
        count: 1,
      });
    }

    if (questionSummary.recent.length < 8) {
      questionSummary.recent.push({
        participantId: row.participant_id,
        participantName: row.participant_name,
        answer: row.answer_text,
        answerJson: row.answer_json,
        updatedAt: row.updated_at,
      });
    }

    const question = questionLookup[String(row.question_number)];
    if (question) {
      let isCorrect = null;
      if (isObjectiveQuestion(question)) {
        isCorrect = answersEqual(question, row.answer_json);
      } else if (isWorkthroughTask(question)) {
        isCorrect = matchesStructuredTask(question, row.answer_json);
      }

      if (isCorrect === true) {
        questionSummary.correctCount += 1;
      } else if (isCorrect === false) {
        questionSummary.incorrectCount += 1;
      }
    }
  });

  Object.values(summary).forEach((item) => {
    item.counts.sort((left, right) => right.count - left.count || String(left.answer).localeCompare(String(right.answer)));
  });
  const participantSummaries = [...participantLookup.values()].map((participant) => {
    const participantResponses = responsesByParticipant.get(participant.participantId) || [];
    const grade = gradeLiveSessionForParticipant(presentationCaseStudy, participantResponses);
    const answers = {};
    participantResponses.forEach((response) => {
      const question = questionLookup[String(response.question_number)];
      let isCorrect = null;
      if (question) {
        if (isObjectiveQuestion(question)) {
          isCorrect = answersEqual(question, response.answer_json);
        } else if (isWorkthroughTask(question)) {
          isCorrect = matchesStructuredTask(question, response.answer_json);
        }
      }
      answers[String(response.question_number)] = {
        answer: response.answer_text,
        answerJson: response.answer_json,
        isCorrect,
        updatedAt: response.updated_at,
      };
    });

    return {
      ...participant,
      ...grade,
      answers,
    };
  }).sort((left, right) => {
    const rightScore = right.score ?? -1;
    const leftScore = left.score ?? -1;
    return rightScore - leftScore || String(left.participantName).localeCompare(String(right.participantName));
  });

  summary.__participants = participantSummaries;
  summary.__participantCount = participantSummaries.length;
  summary.__answeredParticipantCount = participantSummaries.filter((participant) => participant.answeredCount > 0).length;

  return summary;
}

async function sendResponseEvent(sessionCode, sessionId, caseStudy = {}) {
  const clients = sessionClients.get(sessionCode) || [];
  if (!clients.length) {
    return;
  }

  const summary = await getLiveResponseSummary(sessionId, caseStudy);
  const message = `event: response-update\ndata: ${JSON.stringify(summary)}\n\n`;
  clients.forEach((res) => res.write(message));
}

function sanitizeCaseStudy(caseStudy) {
  return {
    ...caseStudy,
    learningContent: {
      title: caseStudy?.learningContent?.title || '',
      body: caseStudy?.learningContent?.body || '',
    },
    questions: Array.isArray(caseStudy.questions) ? caseStudy.questions : [],
    prescriptionList: Array.isArray(caseStudy.prescriptionList) ? caseStudy.prescriptionList : [],
    imaging: Array.isArray(caseStudy.imaging) ? caseStudy.imaging : [],
    allergies: Array.isArray(caseStudy.allergies) ? caseStudy.allergies : [],
    microbiology: caseStudy.microbiology || [],
    biochemistry: caseStudy.biochemistry || {},
    observations: caseStudy.observations || {},
    allowMultipleAttempts: Boolean(caseStudy.allowMultipleAttempts),
    isStagedLiveCase: Boolean(caseStudy.isStagedLiveCase && Array.isArray(caseStudy.liveStages) && caseStudy.liveStages.length),
    liveStages: Array.isArray(caseStudy.liveStages) ? caseStudy.liveStages : [],
    currentStageIndex: Math.max(0, Number(caseStudy.currentStageIndex || 0)),
  };
}

function formatGbDateTime(date) {
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).replace(',', '');
}

function parseDateTime(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
  if (!match) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  const [, day, month, year, hour, minute] = match;
  const parsed = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    0,
    0
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildGeneratedBiochemistry(admittedAt = new Date()) {
  const baseDate = new Date(admittedAt);
  const offsets = [-2, -1, 0];
  const buildDate = (offsetDays, hour) => {
    const value = new Date(baseDate);
    value.setDate(value.getDate() + offsetDays);
    value.setHours(hour, 0, 0, 0);
    return formatGbDateTime(value);
  };
  const datetimes = offsets.map((offset) => buildDate(offset, 7));
  const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const randomWalk = ({ start, min, max, step, precision = 0 }) => {
    const values = [start];
    return datetimes.map((_datetime, index) => {
      if (index > 0) {
        const multiplier = 10 ** precision;
        const delta = precision ? randomInt(-step, step) / multiplier : randomInt(-step, step);
        values.push(clamp(Number(values[index - 1]) + delta, min, max));
      }
      return precision ? Number(values[index]).toFixed(precision) : String(Math.round(values[index]));
    });
  };
  const sodiumValues = randomWalk({ start: randomInt(132, 144), min: 125, max: 150, step: 4 });
  const potassiumValues = randomWalk({ start: Number((3.4 + Math.random() * 1.7).toFixed(1)), min: 2.8, max: 6.0, step: 4, precision: 1 });
  const creatinineValues = randomWalk({ start: randomInt(70, 150), min: 45, max: 240, step: 22 });
  const crpValues = randomWalk({ start: randomInt(4, 110), min: 1, max: 240, step: 35 });
  const inrValues = randomWalk({ start: Number((1.0 + Math.random() * 2.3).toFixed(1)), min: 0.9, max: 5.0, step: 4, precision: 1 });

  return {
    sodium: {
      name: 'Sodium',
      category: 'UE',
      range: '135-145',
      unit: 'mmol/L',
      results: datetimes.map((datetime, index) => ({ datetime, result: sodiumValues[index] })),
    },
    potassium: {
      name: 'Potassium',
      category: 'UE',
      range: '3.5-5.0',
      unit: 'mmol/L',
      results: datetimes.map((datetime, index) => ({ datetime, result: potassiumValues[index] })),
    },
    creatinine: {
      name: 'Creatinine',
      category: 'UE',
      range: '60-110',
      unit: 'umol/L',
      results: datetimes.map((datetime, index) => ({ datetime, result: creatinineValues[index] })),
    },
    crp: {
      name: 'CRP',
      category: 'Inflammation',
      range: '<5',
      unit: 'mg/L',
      results: datetimes.map((datetime, index) => ({ datetime, result: crpValues[index] })),
    },
    inr: {
      name: 'INR',
      category: 'Coagulation',
      range: '2.0-3.0',
      unit: '',
      results: datetimes.map((datetime, index) => ({ datetime, result: inrValues[index] })),
    },
  };
}

function buildGeneratedObservations(admittedAt = new Date()) {
  const baseDate = new Date(admittedAt);
  const slots = [
    { offsetDays: -1, hour: 8 },
    { offsetDays: -1, hour: 14 },
    { offsetDays: 0, hour: 8 },
    { offsetDays: 0, hour: 14 },
  ];
  const buildDate = ({ offsetDays, hour }) => {
    const value = new Date(baseDate);
    value.setDate(value.getDate() + offsetDays);
    value.setHours(hour, 0, 0, 0);
    return formatGbDateTime(value);
  };
  const timestamps = slots.map(buildDate);
  const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const randomWalk = ({ start, min, max, step, precision = 0 }) => timestamps.map((_timestamp, index) => {
    if (index === 0) {
      return Number(start).toFixed(precision);
    }
    const previous = Number(randomWalkValues[index - 1]);
    const multiplier = 10 ** precision;
    const delta = precision ? randomInt(-step, step) / multiplier : randomInt(-step, step);
    const nextValue = clamp(previous + delta, min, max);
    randomWalkValues.push(nextValue);
    return Number(nextValue).toFixed(precision);
  });
  let randomWalkValues = [randomInt(105, 150)];
  const systolicValues = randomWalk({ start: randomWalkValues[0], min: 90, max: 170, step: 12 });
  randomWalkValues = [randomInt(60, 92)];
  const diastolicValues = randomWalk({ start: randomWalkValues[0], min: 50, max: 105, step: 7 });
  randomWalkValues = [randomInt(72, 118)];
  const heartRateValues = randomWalk({ start: randomWalkValues[0], min: 50, max: 135, step: 14 });
  randomWalkValues = [Number((36.4 + Math.random() * 2.2).toFixed(1))];
  const temperatureValues = randomWalk({ start: randomWalkValues[0], min: 35.8, max: 39.5, step: 4, precision: 1 });
  randomWalkValues = [randomInt(14, 28)];
  const respRateValues = randomWalk({ start: randomWalkValues[0], min: 10, max: 34, step: 5 });
  randomWalkValues = [randomInt(92, 99)];
  const oxygenValues = randomWalk({ start: randomWalkValues[0], min: 86, max: 100, step: 3 });

  return {
    blood_pressure: timestamps.map((datetime, index) => ({ datetime, systolic: systolicValues[index], diastolic: diastolicValues[index] })),
    heart_rate: timestamps.map((datetime, index) => ({ datetime, rate: heartRateValues[index] })),
    temperature: timestamps.map((datetime, index) => ({ datetime, temperature: temperatureValues[index] })),
    resp_rate: timestamps.map((datetime, index) => ({ datetime, bpm: respRateValues[index] })),
    oxygen: timestamps.map((datetime, index) => ({ datetime, percentage: oxygenValues[index], device: Number(oxygenValues[index]) < 94 ? '2L nasal cannula' : 'Air' })),
  };
}

function parsePrescriptionTime(value) {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return { hour: 8, minute: 0 };
  }

  return {
    hour: parsed.getHours(),
    minute: parsed.getMinutes(),
  };
}

function resolvePrescriptionAdministrationTemplate(prescription, sessionStartedAt = new Date()) {
  const template = prescription?.administrationTemplate;
  if (!template?.enabled || !Array.isArray(template.entries)) {
    return prescription;
  }

  const { hour, minute } = parsePrescriptionTime(prescription.start_date);
  const timelineDays = Math.max(0, Number(template.timelineDays || prescription.historicalAdministrationDays || 0));
  const resolvedStartDate = new Date(sessionStartedAt);
  resolvedStartDate.setHours(hour, minute, 0, 0);
  resolvedStartDate.setDate(resolvedStartDate.getDate() - timelineDays);

  let resolvedEndDate = '';
  if (prescription.stat) {
    resolvedEndDate = resolvedStartDate.toISOString();
  } else if (prescription.end_date) {
    const originalStart = prescription.start_date ? new Date(prescription.start_date) : null;
    const originalEnd = new Date(prescription.end_date);
    if (originalStart && !Number.isNaN(originalStart.getTime()) && !Number.isNaN(originalEnd.getTime())) {
      const durationDays = Math.max(1, Math.ceil((originalEnd.getTime() - originalStart.getTime()) / (24 * 60 * 60 * 1000)) + 1);
      const nextEndDate = new Date(resolvedStartDate);
      nextEndDate.setDate(nextEndDate.getDate() + durationDays - 1);
      resolvedEndDate = nextEndDate.toISOString();
    }
  }

  const resolvedAdministrations = template.entries
    .filter((entry) => entry?.status && entry.status !== 'scheduled')
    .map((entry) => {
      const [entryHour = 8, entryMinute = 0] = String(entry.time || '08:00').split(':').map(Number);
      const administrationDate = new Date(sessionStartedAt);
      administrationDate.setHours(entryHour, entryMinute, 0, 0);
      administrationDate.setDate(administrationDate.getDate() + Number(entry.relativeDayOffset || 0));
      const statusLabel = entry.status === 'missed'
        ? 'Missed'
        : entry.status === 'held'
          ? 'Held'
          : 'Administered';

      return {
        adminDateTime: formatGbDateTime(administrationDate),
        administeredBy: 'Case template',
        adminNote: entry.note ? `${statusLabel} - ${entry.note}` : statusLabel,
      };
    });

  return {
    ...prescription,
    start_date: resolvedStartDate.toISOString(),
    end_date: resolvedEndDate,
    administrations: resolvedAdministrations,
  };
}

function resolveCaseStudyForSession(caseStudy, sessionStartedAt = new Date()) {
  const sanitized = sanitizeCaseStudy(caseStudy || {});
  const resolvedPrescriptions = (sanitized.prescriptionList || []).map((item) => resolvePrescriptionAdministrationTemplate(item, sessionStartedAt));
  const prescriptionDates = resolvedPrescriptions.flatMap((item) => {
    const dates = [];
    const parsedStart = item?.start_date ? new Date(item.start_date) : null;
    if (parsedStart && !Number.isNaN(parsedStart.getTime())) {
      dates.push(parsedStart);
    }

    (Array.isArray(item?.administrations) ? item.administrations : []).forEach((administration) => {
      const parsedAdministration = administration?.adminDateTime
        ? parseDateTime(administration.adminDateTime)
        : null;
      if (parsedAdministration && !Number.isNaN(parsedAdministration.getTime())) {
        dates.push(parsedAdministration);
      }
    });

    return dates;
  });
  const earliestPrescriptionDate = prescriptionDates.length
    ? new Date(Math.min(...prescriptionDates.map((item) => item.getTime())))
    : null;
  const currentAdmittedAt = sanitized.patient?.admittedAt ? new Date(sanitized.patient.admittedAt) : null;
  const resolvedAdmittedAt = earliestPrescriptionDate
    && (!currentAdmittedAt || Number.isNaN(currentAdmittedAt.getTime()) || earliestPrescriptionDate < currentAdmittedAt)
    ? earliestPrescriptionDate.toISOString()
    : sanitized.patient?.admittedAt;

  return {
    ...sanitized,
    patient: sanitized.patient && typeof sanitized.patient === 'object'
      ? {
          ...sanitized.patient,
          admittedAt: resolvedAdmittedAt || sanitized.patient.admittedAt || '',
        }
      : sanitized.patient,
    prescriptionList: resolvedPrescriptions,
  };
}

function stripPrescriptionRuntimeFields(prescription = {}) {
  if (!prescription || typeof prescription !== 'object') {
    return {};
  }

  const {
    administrations,
    start_date,
    end_date,
    ...rest
  } = prescription;

  return {
    ...rest,
    administrationTemplate: prescription.administrationTemplate || null,
  };
}

function computeCaseStudyFingerprint(caseStudy) {
  const sanitized = sanitizeCaseStudy(caseStudy || {});
  const normalizedPatient = sanitized.patient && typeof sanitized.patient === 'object'
    ? {
        ...sanitized.patient,
        admittedAt: '',
        measurementHistory: Array.isArray(sanitized.patient.measurementHistory)
          ? sanitized.patient.measurementHistory.map((entry) => ({
              height: entry?.height || '',
              weight: entry?.weight || '',
            }))
          : [],
      }
    : sanitized.patient;

  const normalized = {
    ...sanitized,
    patient: normalizedPatient,
    prescriptionList: Array.isArray(sanitized.prescriptionList)
      ? sanitized.prescriptionList.map(stripPrescriptionRuntimeFields)
      : [],
  };

  return JSON.stringify(normalized);
}

const TEST_PATIENT_SELECT_FIELDS = `id, owner_user_id, nhs_number, hospital_number, full_name, surname, date_of_birth, address, gender, stay_type, ward_name, episode_status, admitted_at, discharged_at, weight, height, is_private, nkda, allergies, allergy_history, case_notes, case_notes_history, biochemistry, observations, prescriptions, created_at, updated_at`;

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
    patientOwnSupply: String(
      medicationHistorySource.patient_own_supply || medicationHistorySource.patientOwnSupply || ''
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
  const notes = (Array.isArray(normalized.notes) ? normalized.notes : [])
    .map((item, index) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const sections = Array.isArray(item.sections)
        ? item.sections
          .map((section, sectionIndex) => ({
            key: String(section?.key || `section-${sectionIndex}`).trim(),
            label: String(section?.label || '').trim(),
            value: String(section?.value || '').trim(),
          }))
          .filter((section) => section.label || section.value)
        : [];

      return {
        id: String(item.id || `clinical-note-${index}`).trim(),
        noteType: String(item.noteType || item.note_type || 'freeText').trim() || 'freeText',
        title: String(item.title || item.note_title || '').trim(),
        authoredAt: String(item.authoredAt || item.authored_at || item.note_date || '').trim(),
        location: String(item.location || item.note_location || '').trim(),
        author: String(item.author || item.note_author || '').trim(),
        content: String(item.content || item.note_content || '').trim(),
        sections,
        signed: Boolean(item.signed || item.locked),
        locked: Boolean(item.locked || item.signed),
        updatedAt: String(item.updatedAt || item.updated_at || '').trim(),
        updatedBy: String(item.updatedBy || item.updated_by || '').trim(),
      };
    })
    .filter(Boolean);
  const tasks = (Array.isArray(normalized.tasks) ? normalized.tasks : [])
    .map((item, index) => ({
      id: String(item?.id || `task-${index}`).trim(),
      title: String(item?.title || '').trim(),
      description: String(item?.description || '').trim(),
      assignedProfession: String(item?.assignedProfession || '').trim(),
      linkedPrescriptionId: String(item?.linkedPrescriptionId || '').trim(),
      linkedDrug: String(item?.linkedDrug || '').trim(),
      status: String(item?.status || 'open').trim() || 'open',
      createdAt: String(item?.createdAt || '').trim(),
      createdBy: String(item?.createdBy || '').trim(),
      completedAt: String(item?.completedAt || '').trim(),
      completedBy: String(item?.completedBy || '').trim(),
      suppressedAt: String(item?.suppressedAt || '').trim(),
      suppressedBy: String(item?.suppressedBy || '').trim(),
      suppressionReason: String(item?.suppressionReason || '').trim(),
    }))
    .filter((item) => item.title);
  const vteAssessmentSource = (normalized.vte_assessment && typeof normalized.vte_assessment === 'object')
    ? normalized.vte_assessment
    : (normalized.vteAssessment && typeof normalized.vteAssessment === 'object')
      ? normalized.vteAssessment
      : {};
  const vteNote = notes.find((note) => note.noteType === 'vteAssessment');
  const vteLegacyStatus = String(vteAssessmentSource.status || '').trim().toLowerCase();
  const hasVteAssessment = Boolean(vteNote || vteAssessmentSource.noteId || vteAssessmentSource.note_id || vteAssessmentSource.authoredAt || vteAssessmentSource.authored_at || vteAssessmentSource.outcome || vteLegacyStatus === 'complete');

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
    vteAssessment: {
      status: hasVteAssessment ? 'Complete' : 'Not done',
      noteId: hasVteAssessment ? String(vteAssessmentSource.noteId || vteAssessmentSource.note_id || vteNote?.id || '').trim() : '',
      authoredAt: hasVteAssessment ? String(vteAssessmentSource.authoredAt || vteAssessmentSource.authored_at || vteNote?.authoredAt || '').trim() : '',
      author: hasVteAssessment ? String(vteAssessmentSource.author || vteNote?.author || '').trim() : '',
      outcome: hasVteAssessment ? String(vteAssessmentSource.outcome || '').trim() : '',
    },
    notes,
    tasks,
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
      patient_own_supply: normalized.medicationHistory.patientOwnSupply,
      sources_used: normalized.medicationHistory.sourcesUsed,
      general_notes: normalized.medicationHistory.generalNotes,
      completed_at: normalized.medicationHistory.completedAt,
      completed_by: normalized.medicationHistory.completedBy,
      reconciliation_status: normalized.medicationHistory.reconciliationStatus,
    },
    vte_assessment: {
      status: normalized.vteAssessment.status,
      note_id: normalized.vteAssessment.noteId,
      authored_at: normalized.vteAssessment.authoredAt,
      author: normalized.vteAssessment.author,
      outcome: normalized.vteAssessment.outcome,
    },
    notes: normalized.notes.map((note) => ({
      id: note.id,
      noteType: note.noteType,
      title: note.title,
      authoredAt: note.authoredAt,
      location: note.location,
      author: note.author,
      content: note.content,
      sections: Array.isArray(note.sections)
        ? note.sections.map((section) => ({
          key: section.key,
          label: section.label,
          value: section.value,
        }))
        : [],
      signed: Boolean(note.signed),
      locked: Boolean(note.locked),
      updatedAt: note.updatedAt,
      updatedBy: note.updatedBy,
    })),
    tasks: normalized.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      assignedProfession: task.assignedProfession,
      linkedPrescriptionId: task.linkedPrescriptionId,
      linkedDrug: task.linkedDrug,
      status: task.status,
      createdAt: task.createdAt,
      createdBy: task.createdBy,
      completedAt: task.completedAt,
      completedBy: task.completedBy,
      suppressedAt: task.suppressedAt,
      suppressedBy: task.suppressedBy,
      suppressionReason: task.suppressionReason,
    })),
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
    case 'clinicalNote':
      return '';
    case 'tasks':
      return caseNotes.tasks;
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
    isPrivate: Boolean(row.is_private),
    weightRecordedAt: latestWeightEntry?.recordedAt || null,
    heightRecordedAt: latestHeightEntry?.recordedAt || null,
    nkda: Boolean(row.nkda),
    allergies: Array.isArray(row.allergies) ? row.allergies : [],
    allergyHistory: Array.isArray(row.allergy_history) ? row.allergy_history : [],
    caseNotes: normalizeCaseNotes(row.case_notes),
    caseNotesHistory: Array.isArray(row.case_notes_history) ? row.case_notes_history : [],
    biochemistry: row.biochemistry && typeof row.biochemistry === 'object' ? row.biochemistry : {},
    observations: row.observations && typeof row.observations === 'object' ? row.observations : {},
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
       AND (
         owner_user_id = $2
         OR COALESCE(is_private, FALSE) = FALSE
        )`,
    [patientId, user.sub]
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
  const gradeableCaseStudy = caseStudy?.isStagedLiveCase ? getLivePresentationPayload(caseStudy) : caseStudy;
  const questions = Array.isArray(gradeableCaseStudy.questions) ? gradeableCaseStudy.questions : [];
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
    const adminEducatorId = createId('user');
    const studentId = createId('user');
    const educatorPassword = await createPasswordHash('Demo123!');
    const adminEducatorPassword = await createPasswordHash('Admin123!');
    const studentPassword = await createPasswordHash('Student123!');
    const caseId = createId('case');
    const sessionId = createId('session');
    const sessionCode = createSessionCode();

    await withTransaction(async (client) => {
        await client.query(
          `INSERT INTO users (id, email, password_hash, display_name, role)
           VALUES ($1, $2, $3, $4, $5), ($6, $7, $8, $9, $10), ($11, $12, $13, $14, $15)`,
          [
            educatorId,
            'demo@casestudy.local',
            educatorPassword,
            'Demo Educator',
            'educator',
            adminEducatorId,
            'admin@casestudy.local',
            adminEducatorPassword,
            'Demo Admin Educator',
            'educator_admin',
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
    console.log('Demo admin educator created: admin@casestudy.local / Admin123!');
    console.log('Demo student created: student@casestudy.local / Student123!');
    console.log(`Demo session code: ${sessionCode}`);
  } else if (!existingUsers.rows.some((user) => user.role === 'educator_admin')) {
    const adminEducatorId = createId('user');
    const adminEducatorPassword = await createPasswordHash('Admin123!');
    await query(
      `INSERT INTO users (id, email, password_hash, display_name, role)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminEducatorId, 'admin@casestudy.local', adminEducatorPassword, 'Demo Admin Educator', 'educator_admin']
    );
    console.log('Demo admin educator created: admin@casestudy.local / Admin123!');
  }

  const seedDrugLibraryRows = getSeedDrugLibraryRows();
  const seedRoutes = buildSortedUniqueLabels(seedDrugLibraryRows.map((item) => item.defaultRoute).filter(Boolean));
  const seedFrequencies = buildSortedUniqueLabels(seedDrugLibraryRows.map((item) => item.usualFrequencies).filter(Boolean));

  await seedLookupTable('route_options', seedRoutes.length ? seedRoutes : (legacyDrugList.routes || []));
  await seedFrequencyOptions(Array.from(new Set([...(seedFrequencies.length ? seedFrequencies : (legacyDrugList.frequencies || [])), 'Once weekly'])));
  await seedLookupTable('admin_outcome_options', legacyDrugList.nonAdmins || []);
  await seedAllergyReactionOptions();
  await seedCommonConditions();
  await seedIndicationOptions();
  await seedCriticalMedicines();
  await seedControlledDrugs();
  await seedDrugOrderSets();
  await seedDrugLibrary();
  await seedGuaranteedDrugLibraryItems();
  await seedDrugUnitAndFormOptions();
  const allUsers = await query('SELECT id FROM users');
  for (const user of allUsers.rows) {
    await seedDemoTestPatientsForUser(user.id);
  }
  await seedMissingPatientMeasurements();
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
  const params = [req.user.sub];
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
       owner_user_id = $1 OR COALESCE(is_private, FALSE) = FALSE
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
        p.is_private,
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
       AND (p.owner_user_id = $1 OR COALESCE(p.is_private, FALSE) = FALSE)
     ORDER BY p.id, audit.created_at DESC`,
    [req.user.sub]
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
        p.is_private,
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
       AND (p.owner_user_id = $1 OR COALESCE(p.is_private, FALSE) = FALSE)
     ORDER BY p.id, audit.created_at DESC`,
    [req.user.sub]
  );

  const patients = result.rows
    .map(formatTestPatient)
    .sort((left, right) => new Date(right.lastAccessedAt || 0) - new Date(left.lastAccessedAt || 0))
    .slice(0, 10);

  res.json({ patients });
});

app.post('/api/test-patients', authenticateRequest, async (req, res) => {
  const { fullName, dateOfBirth, address, gender = '', stayType = '', wardName = '', weight = '', height = '', isPrivate = false } = req.body || {};
  if (!fullName || !dateOfBirth || !address) {
    return res.status(400).json({ error: 'fullName, dateOfBirth and address are required' });
  }

  const surname = String(fullName).trim().split(/\s+/).slice(-1)[0] || '';
  const admittedAt = new Date();
  const generatedBiochemistry = buildGeneratedBiochemistry(admittedAt);
  const generatedObservations = buildGeneratedObservations(admittedAt);
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
    isPrivate: Boolean(isPrivate),
    nkda: false,
    biochemistry: generatedBiochemistry,
    observations: generatedObservations,
  };

  const seededPrescriptions = [];

  await query(
    `INSERT INTO test_patients (
       id, owner_user_id, created_by, nhs_number, hospital_number, full_name, surname, date_of_birth, address, gender, stay_type, ward_name, episode_status, admitted_at, weight, height, is_private, nkda, allergies, allergy_history, biochemistry, observations, prescriptions
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, '[]'::jsonb, '[]'::jsonb, $19::jsonb, $20::jsonb, $21::jsonb)`,
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
      admittedAt.toISOString(),
      patient.weight,
      patient.height,
      patient.isPrivate,
      patient.nkda,
      JSON.stringify(patient.biochemistry),
      JSON.stringify(patient.observations),
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
    isPrivate: patient.isPrivate,
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
  const allergyHistory = [...(Array.isArray(patient.allergy_history) ? patient.allergy_history : []), historyEntry];
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

  const rawRequestedCaseNotes = (req.body?.caseNotes && typeof req.body.caseNotes === 'object') ? req.body.caseNotes : {};
  const requestedCaseNotes = normalizeCaseNotes(rawRequestedCaseNotes);
  const currentCaseNotes = normalizeCaseNotes(patient.case_notes);
  const fieldKey = String(req.body?.fieldKey || '').trim();
  const fieldLabel = String(req.body?.fieldLabel || fieldKey || 'Case notes').trim();
  const actorName = req.user.displayName || req.user.email || req.user.sub;
  const mergedRequestedCaseNotes = {
    ...currentCaseNotes,
    ...requestedCaseNotes,
    socialHistory: {
      ...(currentCaseNotes.socialHistory || {}),
      ...(requestedCaseNotes.socialHistory || {}),
    },
    medicationHistory: {
      ...(currentCaseNotes.medicationHistory || {}),
      ...(requestedCaseNotes.medicationHistory || {}),
    },
    notes: Array.isArray(rawRequestedCaseNotes.notes) ? requestedCaseNotes.notes : currentCaseNotes.notes,
    tasks: Array.isArray(rawRequestedCaseNotes.tasks) ? requestedCaseNotes.tasks : currentCaseNotes.tasks,
    pastMedicalSurgicalHistory: Array.isArray(rawRequestedCaseNotes.pastMedicalSurgicalHistory) || Array.isArray(rawRequestedCaseNotes.conditions)
      ? requestedCaseNotes.pastMedicalSurgicalHistory
      : currentCaseNotes.pastMedicalSurgicalHistory,
    vteAssessment: rawRequestedCaseNotes.vteAssessment || rawRequestedCaseNotes.vte_assessment || Array.isArray(rawRequestedCaseNotes.notes)
      ? requestedCaseNotes.vteAssessment
      : currentCaseNotes.vteAssessment,
  };
  const nextCaseNotes = fieldKey === 'medicationHistory'
      ? {
          ...mergedRequestedCaseNotes,
          medicationHistory: {
            ...mergedRequestedCaseNotes.medicationHistory,
            completedAt: new Date().toISOString(),
            completedBy: actorName,
          },
        }
      : mergedRequestedCaseNotes;
  const serializedCaseNotes = serializeCaseNotes(nextCaseNotes);
  const previousValue = fieldKey === 'clinicalNote'
    ? (req.body?.previousValue ?? null)
    : getCaseNotesFieldValue(currentCaseNotes, fieldKey);
  const nextValue = fieldKey === 'clinicalNote'
    ? (req.body?.nextValue ?? null)
    : getCaseNotesFieldValue(nextCaseNotes, fieldKey);
  const historyEntry = {
    timestamp: new Date().toISOString(),
    fieldKey,
    fieldLabel,
    previousValue,
    nextValue,
    actor: actorName,
    noteId: String(req.body?.noteId || '').trim() || undefined,
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
  const [result, routesResult, frequenciesResult, unitsResult, formsResult, outcomesResult, reactionResult, indicationsResult, criticalMedicineResult, controlledDrugResult, orderSetsResult] = await Promise.all([
    query(
    `SELECT id, drug_name, strength, unit, form, default_route, aliases, category, is_infusion,
            usual_frequencies, default_dose, default_indication, high_risk, requires_witness, requires_diluent,
            default_diluent, default_volume, maximum_dose, notes, updated_at
     FROM drug_library_items
     ORDER BY drug_name ASC, strength ASC`
    ),
    query('SELECT id, label, sort_order FROM route_options ORDER BY sort_order ASC, label ASC'),
    query('SELECT id, label, default_admin_times, sort_order FROM frequency_options ORDER BY sort_order ASC, label ASC'),
    query('SELECT id, label, sort_order FROM unit_options ORDER BY label ASC'),
    query('SELECT id, label, sort_order FROM form_options ORDER BY label ASC'),
    query('SELECT id, label, sort_order FROM admin_outcome_options ORDER BY sort_order ASC, label ASC'),
    query('SELECT id, label, blocks_prescribing, sort_order FROM allergy_reaction_options ORDER BY sort_order ASC, label ASC'),
    query('SELECT id, label, sort_order FROM indication_options ORDER BY label ASC'),
    query('SELECT id, drug_name FROM critical_medicines ORDER BY sort_order ASC, drug_name ASC'),
    query('SELECT id, drug_name FROM controlled_drugs ORDER BY sort_order ASC, drug_name ASC'),
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
      maximumDose: row.maximum_dose,
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
      unitOptions: unitsResult.rows.map((row) => ({
        id: row.id,
        label: row.label,
        sortOrder: row.sort_order,
      })),
      formOptions: formsResult.rows.map((row) => ({
        id: row.id,
        label: row.label,
        sortOrder: row.sort_order,
      })),
      categoryOptions: DRUG_CATEGORY_OPTIONS.filter(Boolean),
      criticalMedicineOptions: criticalMedicineResult.rows.map((row) => ({
        id: row.id,
        drugName: row.drug_name,
      })),
      controlledDrugOptions: controlledDrugResult.rows.map((row) => ({
        id: row.id,
        drugName: row.drug_name,
      })),
      reactionOptions: reactionResult.rows.map((row) => ({
        id: row.id,
        label: row.label,
        blocksPrescribing: row.blocks_prescribing,
        sortOrder: row.sort_order,
      })),
      indicationOptions: indicationsResult.rows.map((row) => ({
        id: row.id,
        label: row.label,
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
  if (!hasEducatorAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Only facilitator-admin users can import the drug library' });
  }

  const { csvContent, replaceExisting = true, confirmedMissing } = req.body || {};
  const items = parseDrugLibraryCsv(csvContent);

  if (!items.length) {
    return res.status(400).json({ error: 'No valid drug rows found in the CSV content' });
  }

  const validationReport = await validateDrugImportRows(items, replaceExisting);
  const validItems = items.filter((item) => String(item.drugName || '').trim());

  if (!validItems.length) {
    return res.status(400).json({ error: 'No valid drug rows found in the CSV content', validationReport });
  }

  if (validationReport.errors.length) {
    return res.status(409).json({
      error: 'Please fix the blocking CSV validation issues before importing this file',
      code: 'invalid_drug_rows',
      validationReport,
    });
  }

  const preview = await getDrugImportLookupPreview(validItems);
  if (!hasConfirmedAllMissingLookups(preview, confirmedMissing)) {
    return res.status(409).json({
      error: 'Please review and confirm the missing lookup values before importing this file',
      code: 'missing_lookup_values',
      missingLookupValues: preview,
      validationReport,
    });
  }

  await withTransaction(async (client) => {
    await insertLookupOptions(client, 'route_options', preview.routes);
    await insertFrequencyOptions(client, confirmedMissing?.frequencies || {});
    await insertLookupOptions(client, 'unit_options', preview.units);
    await insertLookupOptions(client, 'form_options', preview.forms);

    if (replaceExisting) {
      await client.query('DELETE FROM drug_library_items');
    }

    for (const item of validItems) {
      await client.query(
        `INSERT INTO drug_library_items (
           id, drug_name, strength, unit, form, default_route, aliases, category, is_infusion,
           usual_frequencies, default_dose, default_indication, high_risk, requires_witness, requires_diluent,
           default_diluent, default_volume, maximum_dose, notes
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
        [
          createId('drug'),
          item.drugName,
          item.strength,
          item.unit,
          item.form,
          item.defaultRoute,
          item.aliases,
          normalizeDrugCategory(item.category) || '',
          item.isInfusion,
          item.usualFrequencies,
          item.defaultDose,
          item.defaultIndication,
          item.highRisk,
          item.requiresWitness,
          item.requiresDiluent,
          item.defaultDiluent,
          item.defaultVolume,
          item.maximumDose,
          item.notes,
        ]
      );
    }
  });

  res.status(201).json({ imported: validItems.length, validationReport });
});

app.post('/api/drug-library/import/preview', authenticateRequest, async (req, res) => {
  if (!hasEducatorAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Only facilitator-admin users can import the drug library' });
  }

  const items = parseDrugLibraryCsv(req.body?.csvContent);

  if (!items.length) {
    return res.status(400).json({ error: 'No valid drug rows found in the CSV content' });
  }

  const validationReport = await validateDrugImportRows(items, req.body?.replaceExisting !== false);
  const validItems = items.filter((item) => String(item.drugName || '').trim());

  if (!validItems.length) {
    return res.status(400).json({ error: 'No valid drug rows found in the CSV content', validationReport });
  }

  const preview = await getDrugImportLookupPreview(validItems);
  return res.json({ missingLookupValues: preview, validationReport });
});

app.post('/api/drug-library/items', authenticateRequest, async (req, res) => {
  if (!hasEducatorAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Only facilitator-admin users can add to the drug library' });
  }

  const payload = req.body || {};
  const drugName = String(payload.drugName || '').trim();
  const category = normalizeDrugCategory(payload.category);

  if (!drugName) {
    return res.status(400).json({ error: 'Drug name is required' });
  }

  if (String(payload.category || '').trim() && !category) {
    return res.status(400).json({ error: 'Category must be selected from the allowed list' });
  }

  const result = await query(
    `INSERT INTO drug_library_items (
       id, drug_name, strength, unit, form, default_route, category, usual_frequencies, default_dose, maximum_dose, notes
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [
      createId('drug'),
      drugName,
      String(payload.strength || '').trim(),
      String(payload.unit || '').trim(),
      String(payload.form || '').trim(),
      String(payload.defaultRoute || '').trim(),
      category || '',
      String(payload.usualFrequencies || '').trim(),
      String(payload.defaultDose || '').trim(),
      String(payload.maximumDose || '').trim(),
      String(payload.notes || '').trim(),
    ]
  );

  return res.status(201).json({ drug: { id: result.rows[0].id } });
});

app.put('/api/drug-library/items/:id', authenticateRequest, async (req, res) => {
  if (!hasEducatorAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Only facilitator-admin users can edit the drug library' });
  }

  const payload = req.body || {};
  const drugName = String(payload.drugName || '').trim();
  const category = normalizeDrugCategory(payload.category);

  if (!drugName) {
    return res.status(400).json({ error: 'Drug name is required' });
  }

  if (String(payload.category || '').trim() && !category) {
    return res.status(400).json({ error: 'Category must be selected from the allowed list' });
  }

  const result = await query(
    `UPDATE drug_library_items
     SET drug_name = $2,
         strength = $3,
         unit = $4,
         form = $5,
         default_route = $6,
         category = $7,
         usual_frequencies = $8,
         default_dose = $9,
         maximum_dose = $10,
         notes = $11,
         requires_witness = COALESCE($12, requires_witness),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id`,
    [
      req.params.id,
      drugName,
      String(payload.strength || '').trim(),
      String(payload.unit || '').trim(),
      String(payload.form || '').trim(),
      String(payload.defaultRoute || '').trim(),
      category || '',
      String(payload.usualFrequencies || '').trim(),
      String(payload.defaultDose || '').trim(),
      String(payload.maximumDose || '').trim(),
      String(payload.notes || '').trim(),
      typeof payload.requiresWitness === 'boolean' ? payload.requiresWitness : null,
    ]
  );

  if (!result.rows.length) {
    return res.status(404).json({ error: 'Drug not found' });
  }

  return res.json({ drug: { id: result.rows[0].id } });
});

app.delete('/api/drug-library/items/:id', authenticateRequest, async (req, res) => {
  if (!hasEducatorAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Only facilitator-admin users can remove from the drug library' });
  }

  const result = await query('DELETE FROM drug_library_items WHERE id = $1 RETURNING id', [req.params.id]);

  if (!result.rows.length) {
    return res.status(404).json({ error: 'Drug not found' });
  }

  return res.status(204).send();
});

app.post('/api/admin/routes', authenticateRequest, async (req, res) => {
  if (!hasEducatorAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Only facilitator-admin users can manage routes' });
  }

  const label = String(req.body?.label || '').trim();
  if (!label) {
    return res.status(400).json({ error: 'Route label is required' });
  }

  const existing = await query('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort_order FROM route_options');
  const nextSortOrder = Number(existing.rows[0]?.next_sort_order || 0);
  const result = await query(
    `INSERT INTO route_options (id, label, sort_order)
     VALUES ($1, $2, $3)
     ON CONFLICT (label) DO NOTHING
     RETURNING id, label, sort_order`,
    [createId('route_option'), label, nextSortOrder]
  );

  if (!result.rows.length) {
    return res.status(409).json({ error: 'That route already exists' });
  }

  return res.status(201).json({ route: result.rows[0] });
});

app.post('/api/admin/routes/import', authenticateRequest, async (req, res) => {
  if (!hasEducatorAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Only facilitator-admin users can manage routes' });
  }

  const rows = parseGenericCsvRows(req.body?.csvContent);
  const labels = rows
    .map((row) => String(row.label || row.route || '').trim())
    .filter(Boolean);

  if (!labels.length) {
    return res.status(400).json({ error: 'No valid route rows found in the CSV content' });
  }

  await withTransaction(async (client) => {
    for (const [index, label] of labels.entries()) {
      await client.query(
        `INSERT INTO route_options (id, label, sort_order)
         VALUES ($1, $2, $3)
         ON CONFLICT (label) DO UPDATE
         SET sort_order = LEAST(route_options.sort_order, EXCLUDED.sort_order)`,
        [createId('route_option'), label, index]
      );
    }
  });

  return res.status(201).json({ importedCount: labels.length });
});

app.delete('/api/admin/routes/:id', authenticateRequest, async (req, res) => {
  if (!hasEducatorAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Only facilitator-admin users can manage routes' });
  }

  const result = await query('DELETE FROM route_options WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows.length) {
    return res.status(404).json({ error: 'Route not found' });
  }

  return res.status(204).send();
});

app.put('/api/admin/routes/:id', authenticateRequest, async (req, res) => {
  if (!hasEducatorAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Only facilitator-admin users can manage routes' });
  }

  const label = String(req.body?.label || '').trim();
  const sortOrder = Number(req.body?.sortOrder);

  if (!label) {
    return res.status(400).json({ error: 'Route label is required' });
  }

  const result = await query(
    `UPDATE route_options
     SET label = $2,
         sort_order = $3
     WHERE id = $1
     RETURNING id, label, sort_order`,
    [req.params.id, label, Number.isFinite(sortOrder) ? sortOrder : 0]
  );

  if (!result.rows.length) {
    return res.status(404).json({ error: 'Route not found' });
  }

  return res.json({ route: result.rows[0] });
});

app.post('/api/admin/frequencies', authenticateRequest, async (req, res) => {
  if (!hasEducatorAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Only facilitator-admin users can manage frequencies' });
  }

  const label = String(req.body?.label || '').trim();
  const defaultAdminTimes = String(req.body?.defaultAdminTimes || '').trim();
  if (!label) {
    return res.status(400).json({ error: 'Frequency label is required' });
  }

  const existing = await query('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort_order FROM frequency_options');
  const nextSortOrder = Number(existing.rows[0]?.next_sort_order || 0);
  const result = await query(
    `INSERT INTO frequency_options (id, label, default_admin_times, sort_order)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (label) DO NOTHING
     RETURNING id, label, default_admin_times, sort_order`,
    [createId('frequency_option'), label, defaultAdminTimes, nextSortOrder]
  );

  if (!result.rows.length) {
    return res.status(409).json({ error: 'That frequency already exists' });
  }

  return res.status(201).json({ frequency: result.rows[0] });
});

app.post('/api/admin/frequencies/import', authenticateRequest, async (req, res) => {
  if (!hasEducatorAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Only facilitator-admin users can manage frequencies' });
  }

  const rows = parseGenericCsvRows(req.body?.csvContent)
    .map((row) => ({
      label: String(row.label || row.frequency || '').trim(),
      defaultAdminTimes: String(row.default_admin_times || row.defaultadmintimes || row.times || '').trim(),
    }))
    .filter((row) => row.label);

  if (!rows.length) {
    return res.status(400).json({ error: 'No valid frequency rows found in the CSV content' });
  }

  await withTransaction(async (client) => {
    for (const [index, row] of rows.entries()) {
      await client.query(
        `INSERT INTO frequency_options (id, label, default_admin_times, sort_order)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (label) DO UPDATE
         SET default_admin_times = EXCLUDED.default_admin_times,
             sort_order = LEAST(frequency_options.sort_order, EXCLUDED.sort_order)`,
        [createId('frequency_option'), row.label, row.defaultAdminTimes, index]
      );
    }
  });

  return res.status(201).json({ importedCount: rows.length });
});

app.delete('/api/admin/frequencies/:id', authenticateRequest, async (req, res) => {
  if (!hasEducatorAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Only facilitator-admin users can manage frequencies' });
  }

  const result = await query('DELETE FROM frequency_options WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows.length) {
    return res.status(404).json({ error: 'Frequency not found' });
  }

  return res.status(204).send();
});

app.put('/api/admin/frequencies/:id', authenticateRequest, async (req, res) => {
  if (!hasEducatorAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Only facilitator-admin users can manage frequencies' });
  }

  const label = String(req.body?.label || '').trim();
  const defaultAdminTimes = String(req.body?.defaultAdminTimes || '').trim();
  const sortOrder = Number(req.body?.sortOrder);

  if (!label) {
    return res.status(400).json({ error: 'Frequency label is required' });
  }

  const result = await query(
    `UPDATE frequency_options
     SET label = $2,
         default_admin_times = $3,
         sort_order = $4
     WHERE id = $1
     RETURNING id, label, default_admin_times, sort_order`,
    [req.params.id, label, defaultAdminTimes, Number.isFinite(sortOrder) ? sortOrder : 0]
  );

  if (!result.rows.length) {
    return res.status(404).json({ error: 'Frequency not found' });
  }

  return res.json({ frequency: result.rows[0] });
});

app.post('/api/admin/indications', authenticateRequest, async (req, res) => {
  if (!hasEducatorAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Only facilitator-admin users can manage indications' });
  }

  const label = String(req.body?.label || '').trim();
  if (!label) {
    return res.status(400).json({ error: 'Indication label is required' });
  }

  const existing = await query('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort_order FROM indication_options');
  const nextSortOrder = Number(existing.rows[0]?.next_sort_order || 0);
  const result = await query(
    `INSERT INTO indication_options (id, label, sort_order)
     VALUES ($1, $2, $3)
     ON CONFLICT (label) DO NOTHING
     RETURNING id, label, sort_order`,
    [createId('indication_option'), label, nextSortOrder]
  );

  if (!result.rows.length) {
    return res.status(409).json({ error: 'That indication already exists' });
  }

  return res.status(201).json({ indication: result.rows[0] });
});

app.post('/api/admin/indications/import', authenticateRequest, async (req, res) => {
  if (!hasEducatorAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Only facilitator-admin users can manage indications' });
  }

  const rows = parseGenericCsvRows(req.body?.csvContent);
  const labels = rows
    .map((row) => String(row.label || row.indication || '').trim())
    .filter(Boolean);

  if (!labels.length) {
    return res.status(400).json({ error: 'No valid indication rows found in the CSV content' });
  }

  await withTransaction(async (client) => {
    for (const [index, label] of labels.entries()) {
      await client.query(
        `INSERT INTO indication_options (id, label, sort_order)
         VALUES ($1, $2, $3)
         ON CONFLICT (label) DO UPDATE
         SET sort_order = LEAST(indication_options.sort_order, EXCLUDED.sort_order)`,
        [createId('indication_option'), label, index]
      );
    }
  });

  return res.status(201).json({ importedCount: labels.length });
});

app.delete('/api/admin/indications/:id', authenticateRequest, async (req, res) => {
  if (!hasEducatorAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Only facilitator-admin users can manage indications' });
  }

  const result = await query('DELETE FROM indication_options WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows.length) {
    return res.status(404).json({ error: 'Indication not found' });
  }

  return res.status(204).send();
});

app.put('/api/admin/indications/:id', authenticateRequest, async (req, res) => {
  if (!hasEducatorAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Only facilitator-admin users can manage indications' });
  }

  const label = String(req.body?.label || '').trim();
  const sortOrder = Number(req.body?.sortOrder);

  if (!label) {
    return res.status(400).json({ error: 'Indication label is required' });
  }

  const result = await query(
    `UPDATE indication_options
     SET label = $2,
         sort_order = $3
     WHERE id = $1
     RETURNING id, label, sort_order`,
    [req.params.id, label, Number.isFinite(sortOrder) ? sortOrder : 0]
  );

  if (!result.rows.length) {
    return res.status(404).json({ error: 'Indication not found' });
  }

  return res.json({ indication: result.rows[0] });
});

app.post('/api/admin/units', authenticateRequest, async (req, res) => {
  if (!hasEducatorAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Only facilitator-admin users can manage units' });
  }

  const label = String(req.body?.label || '').trim();
  if (!label) {
    return res.status(400).json({ error: 'Unit label is required' });
  }

  const existing = await query('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort_order FROM unit_options');
  const nextSortOrder = Number(existing.rows[0]?.next_sort_order || 0);
  const result = await query(
    `INSERT INTO unit_options (id, label, sort_order)
     VALUES ($1, $2, $3)
     ON CONFLICT (label) DO NOTHING
     RETURNING id, label, sort_order`,
    [createId('unit_option'), label, nextSortOrder]
  );

  if (!result.rows.length) {
    return res.status(409).json({ error: 'That unit already exists' });
  }

  return res.status(201).json({ unit: result.rows[0] });
});

app.post('/api/admin/units/import', authenticateRequest, async (req, res) => {
  if (!hasEducatorAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Only facilitator-admin users can manage units' });
  }

  const rows = parseGenericCsvRows(req.body?.csvContent);
  const labels = rows
    .map((row) => String(row.label || row.unit || '').trim())
    .filter(Boolean);

  if (!labels.length) {
    return res.status(400).json({ error: 'No valid unit rows found in the CSV content' });
  }

  await withTransaction(async (client) => {
    await insertLookupOptions(client, 'unit_options', labels);
  });

  return res.status(201).json({ importedCount: labels.length });
});

app.delete('/api/admin/units/:id', authenticateRequest, async (req, res) => {
  if (!hasEducatorAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Only facilitator-admin users can manage units' });
  }

  const result = await query('DELETE FROM unit_options WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows.length) {
    return res.status(404).json({ error: 'Unit not found' });
  }

  return res.status(204).send();
});

app.put('/api/admin/units/:id', authenticateRequest, async (req, res) => {
  if (!hasEducatorAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Only facilitator-admin users can manage units' });
  }

  const label = String(req.body?.label || '').trim();
  if (!label) {
    return res.status(400).json({ error: 'Unit label is required' });
  }

  const result = await query(
    `UPDATE unit_options
     SET label = $2
     WHERE id = $1
     RETURNING id, label, sort_order`,
    [req.params.id, label]
  );

  if (!result.rows.length) {
    return res.status(404).json({ error: 'Unit not found' });
  }

  return res.json({ unit: result.rows[0] });
});

app.post('/api/admin/forms', authenticateRequest, async (req, res) => {
  if (!hasEducatorAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Only facilitator-admin users can manage forms' });
  }

  const label = String(req.body?.label || '').trim();
  if (!label) {
    return res.status(400).json({ error: 'Form label is required' });
  }

  const existing = await query('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort_order FROM form_options');
  const nextSortOrder = Number(existing.rows[0]?.next_sort_order || 0);
  const result = await query(
    `INSERT INTO form_options (id, label, sort_order)
     VALUES ($1, $2, $3)
     ON CONFLICT (label) DO NOTHING
     RETURNING id, label, sort_order`,
    [createId('form_option'), label, nextSortOrder]
  );

  if (!result.rows.length) {
    return res.status(409).json({ error: 'That form already exists' });
  }

  return res.status(201).json({ form: result.rows[0] });
});

app.post('/api/admin/forms/import', authenticateRequest, async (req, res) => {
  if (!hasEducatorAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Only facilitator-admin users can manage forms' });
  }

  const rows = parseGenericCsvRows(req.body?.csvContent);
  const labels = rows
    .map((row) => String(row.label || row.form || '').trim())
    .filter(Boolean);

  if (!labels.length) {
    return res.status(400).json({ error: 'No valid form rows found in the CSV content' });
  }

  await withTransaction(async (client) => {
    await insertLookupOptions(client, 'form_options', labels);
  });

  return res.status(201).json({ importedCount: labels.length });
});

app.get('/api/admin/users', authenticateRequest, async (req, res) => {
  if (!hasEducatorAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Only facilitator-admin users can manage user accounts' });
  }

  const result = await query(
    `SELECT u.*,
            (SELECT COUNT(*)::int FROM case_studies cs WHERE cs.owner_user_id = u.id) AS owned_case_study_count,
            (SELECT COUNT(*)::int FROM case_sessions cse WHERE cse.user_id = u.id) AS case_session_count,
            (SELECT COUNT(*)::int FROM test_patients tp WHERE tp.owner_user_id = u.id) AS test_patient_count
     FROM users u
     ORDER BY u.created_at DESC`
  );

  res.json({ users: result.rows.map(formatUserAccount) });
});

app.post('/api/admin/users/:id/suspend', authenticateRequest, async (req, res) => {
  if (!hasEducatorAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Only facilitator-admin users can manage user accounts' });
  }

  if (req.params.id === req.user.sub) {
    return res.status(400).json({ error: 'You cannot suspend your own account' });
  }

  const reason = String(req.body?.reason || '').trim();
  if (!reason) {
    return res.status(400).json({ error: 'A suspension reason is required' });
  }

  const result = await query(
    `UPDATE users
     SET account_status = 'suspended',
         access_suspended_at = NOW(),
         access_suspended_reason = $1,
         updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [reason, req.params.id]
  );

  if (!result.rows.length) {
    return res.status(404).json({ error: 'User account not found' });
  }

  res.json({ user: formatUserAccount(result.rows[0]) });
});

app.post('/api/admin/users/:id/restore', authenticateRequest, async (req, res) => {
  if (!hasEducatorAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Only facilitator-admin users can manage user accounts' });
  }

  const result = await query(
    `UPDATE users
     SET account_status = 'active',
         access_suspended_at = NULL,
         access_suspended_reason = '',
         access_removed_at = NULL,
         access_removed_reason = '',
         retention_review_at = NULL,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [req.params.id]
  );

  if (!result.rows.length) {
    return res.status(404).json({ error: 'User account not found' });
  }

  res.json({ user: formatUserAccount(result.rows[0]) });
});

app.post('/api/admin/users/:id/remove-access', authenticateRequest, async (req, res) => {
  if (!hasEducatorAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Only facilitator-admin users can manage user accounts' });
  }

  if (req.params.id === req.user.sub) {
    return res.status(400).json({ error: 'You cannot remove your own access' });
  }

  const reason = String(req.body?.reason || '').trim();
  if (!reason) {
    return res.status(400).json({ error: 'A removal reason is required' });
  }

  const result = await query(
    `UPDATE users
     SET account_status = 'access_removed',
         access_removed_at = NOW(),
         access_removed_reason = $1,
         retention_review_at = NOW() + ($2 || ' days')::interval,
         updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [reason, String(ACCESS_REMOVAL_RETENTION_DAYS), req.params.id]
  );

  if (!result.rows.length) {
    return res.status(404).json({ error: 'User account not found' });
  }

  res.json({ user: formatUserAccount(result.rows[0]) });
});

app.delete('/api/admin/forms/:id', authenticateRequest, async (req, res) => {
  if (!hasEducatorAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Only facilitator-admin users can manage forms' });
  }

  const result = await query('DELETE FROM form_options WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows.length) {
    return res.status(404).json({ error: 'Form not found' });
  }

  return res.status(204).send();
});

app.put('/api/admin/forms/:id', authenticateRequest, async (req, res) => {
  if (!hasEducatorAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Only facilitator-admin users can manage forms' });
  }

  const label = String(req.body?.label || '').trim();
  if (!label) {
    return res.status(400).json({ error: 'Form label is required' });
  }

  const result = await query(
    `UPDATE form_options
     SET label = $2
     WHERE id = $1
     RETURNING id, label, sort_order`,
    [req.params.id, label]
  );

  if (!result.rows.length) {
    return res.status(404).json({ error: 'Form not found' });
  }

  return res.json({ form: result.rows[0] });
});

app.post('/api/admin/critical-medicines', authenticateRequest, async (req, res) => {
  if (!hasEducatorAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Only facilitator-admin users can manage critical medicines' });
  }

  const drugId = String(req.body?.drugId || '').trim();
  if (!drugId) {
    return res.status(400).json({ error: 'Drug selection is required' });
  }

  const drugResult = await query(
    'SELECT drug_name FROM drug_library_items WHERE id = $1',
    [drugId]
  );

  if (!drugResult.rows.length) {
    return res.status(404).json({ error: 'Drug not found in the library' });
  }

  const drugName = drugResult.rows[0].drug_name;
  const existing = await query(
    'SELECT id FROM critical_medicines WHERE LOWER(drug_name) = LOWER($1)',
    [drugName]
  );

  if (existing.rows.length) {
    return res.status(409).json({ error: 'That drug is already marked as critical' });
  }

  const sortOrderResult = await query('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort_order FROM critical_medicines');
  const sortOrder = Number(sortOrderResult.rows[0]?.next_sort_order || 0);
  const result = await query(
    `INSERT INTO critical_medicines (id, drug_name, sort_order)
     VALUES ($1, $2, $3)
     RETURNING id, drug_name`,
    [createId('critical_medicine'), drugName, sortOrder]
  );

  return res.status(201).json({
    criticalMedicine: {
      id: result.rows[0].id,
      drugName: result.rows[0].drug_name,
    },
  });
});

app.delete('/api/admin/critical-medicines/:id', authenticateRequest, async (req, res) => {
  if (!hasEducatorAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Only facilitator-admin users can manage critical medicines' });
  }

  const result = await query(
    'DELETE FROM critical_medicines WHERE id = $1 RETURNING id',
    [req.params.id]
  );

  if (!result.rows.length) {
    return res.status(404).json({ error: 'Critical medicine not found' });
  }

  return res.status(204).send();
});

app.post('/api/admin/controlled-drugs', authenticateRequest, async (req, res) => {
  if (!hasEducatorAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Only facilitator-admin users can manage controlled drugs' });
  }

  const drugId = String(req.body?.drugId || '').trim();
  if (!drugId) {
    return res.status(400).json({ error: 'Drug selection is required' });
  }

  const drugResult = await query(
    'SELECT drug_name FROM drug_library_items WHERE id = $1',
    [drugId]
  );

  if (!drugResult.rows.length) {
    return res.status(404).json({ error: 'Drug not found in the library' });
  }

  const drugName = drugResult.rows[0].drug_name;
  const existing = await query(
    'SELECT id FROM controlled_drugs WHERE LOWER(drug_name) = LOWER($1)',
    [drugName]
  );

  if (existing.rows.length) {
    return res.status(409).json({ error: 'That drug is already marked as a controlled drug' });
  }

  const sortOrderResult = await query('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort_order FROM controlled_drugs');
  const sortOrder = Number(sortOrderResult.rows[0]?.next_sort_order || 0);
  const result = await query(
    `INSERT INTO controlled_drugs (id, drug_name, sort_order)
     VALUES ($1, $2, $3)
     RETURNING id, drug_name`,
    [createId('controlled_drug'), drugName, sortOrder]
  );

  return res.status(201).json({
    controlledDrug: {
      id: result.rows[0].id,
      drugName: result.rows[0].drug_name,
    },
  });
});

app.delete('/api/admin/controlled-drugs/:id', authenticateRequest, async (req, res) => {
  if (!hasEducatorAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Only facilitator-admin users can manage controlled drugs' });
  }

  const result = await query(
    'DELETE FROM controlled_drugs WHERE id = $1 RETURNING id',
    [req.params.id]
  );

  if (!result.rows.length) {
    return res.status(404).json({ error: 'Controlled drug not found' });
  }

  return res.status(204).send();
});

app.post('/api/admin/order-sets', authenticateRequest, async (req, res) => {
  if (!hasEducatorAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Only facilitator-admin users can manage order sets' });
  }

  const drugName = String(req.body?.drugName || '').trim();
  const label = String(req.body?.label || '').trim();
  const dose = String(req.body?.dose || '').trim();
  const unit = String(req.body?.unit || '').trim();
  const frequency = String(req.body?.frequency || '').trim();
  const route = String(req.body?.route || '').trim();
  const indication = String(req.body?.indication || '').trim();

  if (!drugName || !label) {
    return res.status(400).json({ error: 'Drug and order set label are required' });
  }

  const drugResult = await query(
    'SELECT drug_name FROM drug_library_items WHERE LOWER(drug_name) = LOWER($1) LIMIT 1',
    [drugName]
  );
  if (!drugResult.rows.length) {
    return res.status(404).json({ error: 'Drug not found in the library' });
  }

  const existing = await query(
    'SELECT id FROM drug_order_sets WHERE LOWER(drug_name) = LOWER($1) AND LOWER(label) = LOWER($2)',
    [drugName, label]
  );
  if (existing.rows.length) {
    return res.status(409).json({ error: 'That order set already exists for this drug' });
  }

  const sortOrderResult = await query(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort_order FROM drug_order_sets WHERE LOWER(drug_name) = LOWER($1)',
    [drugName]
  );
  const sortOrder = Number(sortOrderResult.rows[0]?.next_sort_order || 0);

  const result = await query(
    `INSERT INTO drug_order_sets (id, drug_name, label, dose, unit, frequency, route, indication, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, drug_name, label, dose, unit, frequency, route, indication, sort_order`,
    [createId('drug_order_set'), drugName, label, dose, unit, frequency, route, indication, sortOrder]
  );

  return res.status(201).json({
    orderSet: {
      id: result.rows[0].id,
      drugName: result.rows[0].drug_name,
      label: result.rows[0].label,
      dose: result.rows[0].dose,
      unit: result.rows[0].unit,
      frequency: result.rows[0].frequency,
      route: result.rows[0].route,
      indication: result.rows[0].indication,
      sortOrder: result.rows[0].sort_order,
    },
  });
});

app.put('/api/admin/order-sets/:id', authenticateRequest, async (req, res) => {
  if (!hasEducatorAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Only facilitator-admin users can manage order sets' });
  }

  const drugName = String(req.body?.drugName || '').trim();
  const label = String(req.body?.label || '').trim();
  const dose = String(req.body?.dose || '').trim();
  const unit = String(req.body?.unit || '').trim();
  const frequency = String(req.body?.frequency || '').trim();
  const route = String(req.body?.route || '').trim();
  const indication = String(req.body?.indication || '').trim();

  if (!drugName || !label) {
    return res.status(400).json({ error: 'Drug and order set label are required' });
  }

  const drugResult = await query(
    'SELECT drug_name FROM drug_library_items WHERE LOWER(drug_name) = LOWER($1) LIMIT 1',
    [drugName]
  );
  if (!drugResult.rows.length) {
    return res.status(404).json({ error: 'Drug not found in the library' });
  }

  const existing = await query(
    'SELECT id FROM drug_order_sets WHERE LOWER(drug_name) = LOWER($1) AND LOWER(label) = LOWER($2) AND id <> $3',
    [drugName, label, req.params.id]
  );
  if (existing.rows.length) {
    return res.status(409).json({ error: 'That order set already exists for this drug' });
  }

  const result = await query(
    `UPDATE drug_order_sets
     SET drug_name = $2,
         label = $3,
         dose = $4,
         unit = $5,
         frequency = $6,
         route = $7,
         indication = $8,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, drug_name, label, dose, unit, frequency, route, indication, sort_order`,
    [req.params.id, drugName, label, dose, unit, frequency, route, indication]
  );

  if (!result.rows.length) {
    return res.status(404).json({ error: 'Order set not found' });
  }

  return res.json({
    orderSet: {
      id: result.rows[0].id,
      drugName: result.rows[0].drug_name,
      label: result.rows[0].label,
      dose: result.rows[0].dose,
      unit: result.rows[0].unit,
      frequency: result.rows[0].frequency,
      route: result.rows[0].route,
      indication: result.rows[0].indication,
      sortOrder: result.rows[0].sort_order,
    },
  });
});

app.delete('/api/admin/order-sets/:id', authenticateRequest, async (req, res) => {
  if (!hasEducatorAdminAccess(req.user)) {
    return res.status(403).json({ error: 'Only facilitator-admin users can manage order sets' });
  }

  const result = await query('DELETE FROM drug_order_sets WHERE id = $1 RETURNING id', [req.params.id]);
  if (!result.rows.length) {
    return res.status(404).json({ error: 'Order set not found' });
  }

  return res.status(204).send();
});

app.post('/api/auth/register', async (req, res) => {
  const { email, password, displayName, role } = req.body || {};
  if (!email || !password || !displayName) {
    return res.status(400).json({ error: 'Email, password and display name are required' });
  }

  const nextRole = role === 'educator' ? 'educator' : 'student';
  const nextAccountStatus = nextRole === 'educator' ? 'pending_approval' : 'active';
  const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows.length) {
    return res.status(409).json({ error: 'An account with that email already exists' });
  }

  const existingDisplayName = await query(
    'SELECT id FROM users WHERE LOWER(display_name) = LOWER($1)',
    [displayName.trim()]
  );
  if (existingDisplayName.rows.length) {
    return res.status(409).json({ error: 'That display name is already in use' });
  }

  const user = {
    id: createId('user'),
    email: email.toLowerCase(),
    display_name: displayName.trim(),
    role: nextRole,
    account_status: nextAccountStatus,
  };
  const passwordHash = await createPasswordHash(password);

  await query(
    `INSERT INTO users (id, email, password_hash, display_name, role, account_status)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [user.id, user.email, passwordHash, user.display_name, user.role, user.account_status]
  );

  if (user.account_status === 'pending_approval') {
    return res.status(201).json({
      message: 'Educator access requested. A facilitator admin must approve this account before you can sign in.',
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        accountStatus: user.account_status,
      },
    });
  }

  res.status(201).json({ token: signToken(user), user: { id: user.id, email: user.email, displayName: user.display_name, role: user.role, accountStatus: user.account_status } });
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

  if (user.account_status === 'suspended') {
    return res.status(403).json({ error: 'This account is suspended please contact an administrator' });
  }

  if (user.account_status === 'access_removed') {
    return res.status(403).json({ error: 'This account no longer has access and has been removed from the system. If this is not correct, please contact an administrator.' });
  }

  if (user.account_status === 'pending_approval') {
    return res.status(403).json({ error: 'This educator account is waiting for admin approval' });
  }

  const passwordMatches = await comparePassword(password, user.password_hash);
  if (!passwordMatches) {
    return res.status(401).json({ error: 'Incorrect email or password' });
  }

  res.json({ token: signToken(user), user: { id: user.id, email: user.email, displayName: user.display_name, role: user.role, accountStatus: user.account_status || 'active' } });
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
  const result = await query('SELECT id, email, display_name, role, account_status FROM users WHERE id = $1', [req.user.sub]);
  if (!result.rows.length) {
    return res.status(404).json({ error: 'User not found' });
  }
  const user = result.rows[0];
  res.json({ user: { id: user.id, email: user.email, displayName: user.display_name, role: user.role, accountStatus: user.account_status } });
});

app.get('/api/case-studies', authenticateRequest, async (req, res) => {
  const result = await query(
    `SELECT cs.id, cs.owner_user_id, cs.title, cs.summary, cs.draft_data, cs.published_data, cs.published_at, cs.status, cs.created_at, cs.updated_at,
            cs.student_access_enabled,
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

app.get('/api/case-studies/workspace', authenticateRequest, async (req, res) => {
  const ownedResult = await query(
    `SELECT cs.id, cs.owner_user_id, cs.title, cs.summary, cs.draft_data, cs.published_data, cs.published_at, cs.status, cs.student_access_enabled, cs.created_at, cs.updated_at,
            ls.session_code
     FROM case_studies cs
     LEFT JOIN LATERAL (
       SELECT session_code
       FROM live_sessions
       WHERE case_study_id = cs.id AND status = 'active'
       ORDER BY updated_at DESC
       LIMIT 1
     ) ls ON true
     WHERE cs.owner_user_id = $1
     ORDER BY cs.updated_at DESC`,
    [req.user.sub]
  );

  const caseStudyIds = ownedResult.rows.map((row) => row.id);
  const [accessSummary, completedSummary, shareSummary] = await Promise.all([
    listCaseStudyAccessSummary(caseStudyIds),
    listCaseStudyCompletedSummary(caseStudyIds),
    listCaseStudyShareSummary(caseStudyIds),
  ]);

  res.json({
    ownedCaseStudies: ownedResult.rows.map((row) => ({
      ...formatCaseStudy(row),
      activeSessionCode: row.session_code || '',
      recentAccesses: accessSummary.get(row.id) || [],
      completedQuestionSets: completedSummary.get(row.id) || 0,
      shares: shareSummary.get(row.id) || [],
    })),
    sharedCaseStudies: [],
  });
});

app.get('/api/case-study-sets/workspace', authenticateRequest, async (req, res) => {
  if (!hasEducatorAccess(req.user)) {
    return res.status(403).json({ error: 'Only educators can access case study sets' });
  }
  const caseStudySets = await listCaseStudySetsForOwner(req.user.sub);
  res.json({ caseStudySets });
});

app.get('/api/library', authenticateRequest, async (req, res) => {
  const [result, caseStudySets] = await Promise.all([
    query(
      `SELECT DISTINCT cs.id, cs.owner_user_id, cs.title, cs.summary, cs.draft_data, cs.published_data, cs.published_at, cs.status, cs.student_access_enabled, cs.created_at, cs.updated_at,
              (f.id IS NOT NULL) AS is_favourite
       FROM case_studies cs
       LEFT JOIN student_case_study_favourites f
         ON f.case_study_id = cs.id
        AND f.user_id = $1
       WHERE cs.student_access_enabled = TRUE
       ORDER BY cs.updated_at DESC`,
      [req.user.sub]
    ),
    listCaseStudySetsForStudent(req.user.sub),
  ]);
  res.json({ caseStudies: result.rows.map(formatCaseStudy), caseStudySets });
});

app.get('/api/case-studies/:id', authenticateRequest, async (req, res) => {
  const studentAccessClause = req.user.role === 'student'
    ? 'OR cs.student_access_enabled = TRUE'
    : '';
  const result = await query(
    `SELECT DISTINCT cs.*
     FROM case_studies cs
     LEFT JOIN case_study_shares shares
       ON shares.case_study_id = cs.id
      AND shares.recipient_user_id = $2
     WHERE cs.id = $1
       AND (
         cs.owner_user_id = $2
         OR (shares.share_type = 'facilitator')
         ${studentAccessClause}
       )`,
    [req.params.id, req.user.sub]
  );
  if (!result.rows.length) {
    return res.status(404).json({ error: 'Case study not found' });
  }
  res.json({ caseStudy: formatCaseStudy(result.rows[0]) });
});

app.post('/api/case-studies', authenticateRequest, async (req, res) => {
  if (!hasEducatorAccess(req.user)) {
    return res.status(403).json({ error: 'Only educators can create case studies' });
  }

  const { data } = req.body || {};
  if (!data || !data.case_study_name) {
    return res.status(400).json({ error: 'Case study data with a title is required' });
  }

  const id = createId('case');
  const payload = sanitizeCaseStudy(data);
  await query(
    `INSERT INTO case_studies (id, owner_user_id, title, summary, draft_data, status, student_access_enabled)
     VALUES ($1, $2, $3, $4, $5::jsonb, 'draft', FALSE)`,
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
    `INSERT INTO case_studies (id, owner_user_id, title, summary, draft_data, status, student_access_enabled)
     VALUES ($1, $2, $3, $4, $5::jsonb, 'draft', FALSE)`,
    [cloneId, req.user.sub, cloneTitle, buildSummary({ ...draftData, case_study_name: cloneTitle }), JSON.stringify({ ...draftData, case_study_name: cloneTitle })]
  );
  const created = await query('SELECT * FROM case_studies WHERE id = $1', [cloneId]);
  res.status(201).json({ caseStudy: formatCaseStudy(created.rows[0]) });
});

app.post('/api/case-studies/:id/copy-shared', authenticateRequest, async (req, res) => {
  const source = await query(
    `SELECT cs.*
     FROM case_study_shares shares
     INNER JOIN case_studies cs ON cs.id = shares.case_study_id
     WHERE cs.id = $1
       AND shares.recipient_user_id = $2
       AND shares.share_type = 'facilitator'`,
    [req.params.id, req.user.sub]
  );
  if (!source.rows.length) {
    return res.status(404).json({ error: 'Shared case study not found' });
  }

  const row = source.rows[0];
  const copyId = createId('case');
  const draftData = row.draft_data;
  const copyTitle = `${row.title} (Copy)`;
  await query(
    `INSERT INTO case_studies (id, owner_user_id, title, summary, draft_data, status, student_access_enabled)
     VALUES ($1, $2, $3, $4, $5::jsonb, 'draft', FALSE)`,
    [copyId, req.user.sub, copyTitle, buildSummary({ ...draftData, case_study_name: copyTitle }), JSON.stringify({ ...draftData, case_study_name: copyTitle })]
  );
  const created = await query('SELECT * FROM case_studies WHERE id = $1', [copyId]);
  res.status(201).json({ caseStudy: formatCaseStudy(created.rows[0]) });
});

app.post('/api/case-studies/:id/archive', authenticateRequest, async (req, res) => {
  const result = await query(`UPDATE case_studies SET status = 'archived', student_access_enabled = FALSE, updated_at = NOW() WHERE id = $1 AND owner_user_id = $2 RETURNING *`, [req.params.id, req.user.sub]);
  if (!result.rows.length) {
    return res.status(404).json({ error: 'Case study not found' });
  }
  res.json({ caseStudy: formatCaseStudy(result.rows[0]) });
});

app.post('/api/case-studies/:id/unarchive', authenticateRequest, async (req, res) => {
  const result = await query(
    `UPDATE case_studies
     SET status = CASE WHEN status = 'archived' THEN 'draft' ELSE status END,
         updated_at = NOW()
     WHERE id = $1 AND owner_user_id = $2
     RETURNING *`,
    [req.params.id, req.user.sub]
  );
  if (!result.rows.length) {
    return res.status(404).json({ error: 'Case study not found' });
  }
  res.json({ caseStudy: formatCaseStudy(result.rows[0]) });
});

app.delete('/api/case-studies/:id', authenticateRequest, async (req, res) => {
  const result = await query('DELETE FROM case_studies WHERE id = $1 AND owner_user_id = $2 RETURNING id', [req.params.id, req.user.sub]);
  if (!result.rows.length) {
    return res.status(404).json({ error: 'Case study not found' });
  }
  res.json({ deleted: true });
});

app.post('/api/case-study-sets', authenticateRequest, async (req, res) => {
  if (!hasEducatorAccess(req.user)) {
    return res.status(403).json({ error: 'Only educators can create case study sets' });
  }
  const data = req.body?.data || {};
  const title = String(data.title || '').trim();
  const description = String(data.description || '').trim();
  const caseStudyIds = Array.isArray(data.caseStudyIds) ? data.caseStudyIds : [];
  if (!title) {
    return res.status(400).json({ error: 'Set title is required' });
  }

  const eligible = await query(
    `SELECT id FROM case_studies
     WHERE owner_user_id = $1
       AND id = ANY($2::text[])
       AND status <> 'live_classroom'`,
    [req.user.sub, caseStudyIds]
  );

  const setId = createId('set');
  await query(
    `INSERT INTO case_study_sets (id, owner_user_id, title, description)
     VALUES ($1, $2, $3, $4)`,
    [setId, req.user.sub, title, description]
  );

  for (const [index, row] of eligible.rows.entries()) {
    await query(
      `INSERT INTO case_study_set_items (id, case_study_set_id, case_study_id, sort_order)
       VALUES ($1, $2, $3, $4)`,
      [createId('setitem'), setId, row.id, index]
    );
  }

  const createdSets = await listCaseStudySetsForOwner(req.user.sub);
  res.status(201).json({ caseStudySet: createdSets.find((item) => item.id === setId) || null });
});

app.put('/api/case-study-sets/:id', authenticateRequest, async (req, res) => {
  if (!hasEducatorAccess(req.user)) {
    return res.status(403).json({ error: 'Only educators can update case study sets' });
  }
  const data = req.body?.data || {};
  const title = String(data.title || '').trim();
  const description = String(data.description || '').trim();
  const caseStudyIds = Array.isArray(data.caseStudyIds) ? data.caseStudyIds : [];
  if (!title) {
    return res.status(400).json({ error: 'Set title is required' });
  }

  const ownership = await query('SELECT id FROM case_study_sets WHERE id = $1 AND owner_user_id = $2', [req.params.id, req.user.sub]);
  if (!ownership.rows.length) {
    return res.status(404).json({ error: 'Case study set not found' });
  }

  const eligible = await query(
    `SELECT id FROM case_studies
     WHERE owner_user_id = $1
       AND id = ANY($2::text[])
       AND status <> 'live_classroom'`,
    [req.user.sub, caseStudyIds]
  );

  await query(
    `UPDATE case_study_sets
     SET title = $1, description = $2, updated_at = NOW()
     WHERE id = $3 AND owner_user_id = $4`,
    [title, description, req.params.id, req.user.sub]
  );
  await query('DELETE FROM case_study_set_items WHERE case_study_set_id = $1', [req.params.id]);
  for (const [index, row] of eligible.rows.entries()) {
    await query(
      `INSERT INTO case_study_set_items (id, case_study_set_id, case_study_id, sort_order)
       VALUES ($1, $2, $3, $4)`,
      [createId('setitem'), req.params.id, row.id, index]
    );
  }

  const updatedSets = await listCaseStudySetsForOwner(req.user.sub);
  res.json({ caseStudySet: updatedSets.find((item) => item.id === req.params.id) || null });
});

app.delete('/api/case-study-sets/:id', authenticateRequest, async (req, res) => {
  if (!hasEducatorAccess(req.user)) {
    return res.status(403).json({ error: 'Only educators can delete case study sets' });
  }
  const result = await query('DELETE FROM case_study_sets WHERE id = $1 AND owner_user_id = $2 RETURNING id', [req.params.id, req.user.sub]);
  if (!result.rows.length) {
    return res.status(404).json({ error: 'Case study set not found' });
  }
  res.json({ deleted: true });
});

app.post('/api/case-study-sets/:id/share', authenticateRequest, async (req, res) => {
  if (!hasEducatorAccess(req.user)) {
    return res.status(403).json({ error: 'Only educators can share case study sets' });
  }
  const ownership = await query('SELECT id FROM case_study_sets WHERE id = $1 AND owner_user_id = $2', [req.params.id, req.user.sub]);
  if (!ownership.rows.length) {
    return res.status(404).json({ error: 'Case study set not found' });
  }

  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ error: 'Recipient email is required' });
  }

  const recipient = await query('SELECT id, email, display_name, role FROM users WHERE LOWER(email) = $1 LIMIT 1', [email]);
  if (!recipient.rows.length) {
    return res.status(404).json({ error: 'Student account not found' });
  }
  if (recipient.rows[0].role !== 'student') {
    return res.status(400).json({ error: 'Case study sets can only be shared with students' });
  }

  await query(
    `INSERT INTO case_study_set_shares (id, case_study_set_id, owner_user_id, recipient_user_id, recipient_email)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (case_study_set_id, recipient_user_id)
     DO UPDATE SET recipient_email = EXCLUDED.recipient_email`,
    [createId('setshare'), req.params.id, req.user.sub, recipient.rows[0].id, recipient.rows[0].email]
  );

  res.status(201).json({
    share: {
      caseStudySetId: req.params.id,
      recipientEmail: recipient.rows[0].email,
      recipientName: recipient.rows[0].display_name,
    },
  });
});

app.post('/api/case-studies/:id/share', authenticateRequest, async (req, res) => {
  const caseStudy = await query('SELECT * FROM case_studies WHERE id = $1 AND owner_user_id = $2', [req.params.id, req.user.sub]);
  if (!caseStudy.rows.length) {
    return res.status(404).json({ error: 'Case study not found' });
  }

  const email = String(req.body?.email || '').trim().toLowerCase();
  const shareType = req.body?.shareType === 'student' ? 'student' : 'facilitator';
  if (!email) {
    return res.status(400).json({ error: 'Recipient email is required' });
  }

  const recipient = await query('SELECT id, email, role, display_name FROM users WHERE LOWER(email) = $1', [email]);
  if (!recipient.rows.length) {
    return res.status(404).json({ error: 'No account found for that email address' });
  }

  const recipientUser = recipient.rows[0];
  if (shareType === 'student' && recipientUser.role !== 'student') {
    return res.status(400).json({ error: 'Student sharing requires a student account' });
  }
  if (shareType === 'facilitator' && !['educator', 'educator_admin'].includes(recipientUser.role)) {
    return res.status(400).json({ error: 'Facilitator sharing requires an educator account' });
  }

  await query(
    `INSERT INTO case_study_shares (id, case_study_id, owner_user_id, recipient_user_id, recipient_email, share_type)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (case_study_id, recipient_user_id, share_type)
     DO UPDATE SET recipient_email = EXCLUDED.recipient_email`,
    [createId('share'), req.params.id, req.user.sub, recipientUser.id, recipientUser.email, shareType]
  );

  res.status(201).json({
    share: {
      caseStudyId: req.params.id,
      recipientEmail: recipientUser.email,
      recipientName: recipientUser.display_name,
      shareType,
    },
  });
});

app.delete('/api/case-studies/:id/shares/:shareId', authenticateRequest, async (req, res) => {
  const result = await query(
    `DELETE FROM case_study_shares
     WHERE id = $1
       AND case_study_id = $2
       AND owner_user_id = $3
     RETURNING id`,
    [req.params.shareId, req.params.id, req.user.sub]
  );

  if (!result.rows.length) {
    return res.status(404).json({ error: 'Share not found' });
  }

  res.json({ deleted: true });
});

app.post('/api/case-studies/:id/student-access', authenticateRequest, async (req, res) => {
  const enabled = Boolean(req.body?.enabled);
  const result = await query(
    `UPDATE case_studies
     SET student_access_enabled = $1,
         status = CASE
           WHEN $1 = TRUE THEN 'self_paced'
           WHEN status = 'self_paced' THEN 'closed'
           ELSE status
         END,
         updated_at = NOW()
     WHERE id = $2 AND owner_user_id = $3
     RETURNING *`,
    [enabled, req.params.id, req.user.sub]
  );
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
  const publishMode = req.body?.mode === 'live_classroom' ? 'live_classroom' : 'self_paced';
  const basePayload = sanitizeCaseStudy(req.body?.data || caseStudy.draft_data);
  if (basePayload.isStagedLiveCase && !hasValidLiveStageTriggers(basePayload)) {
    return res.status(400).json({ error: 'One or more stage triggers point to a question students cannot answer before that stage.' });
  }
  if (publishMode === 'self_paced' && hasManualStageProgression(basePayload)) {
    return res.status(400).json({ error: 'Staged case studies with manual stage advancement can only be started as live classroom sessions. Use question-triggered stages to publish as a normal case study.' });
  }
  const payload = sanitizeCaseStudy({
    ...basePayload,
    livePresentationStage: publishMode === 'live_classroom' ? 'initial' : (basePayload.livePresentationStage || 'full'),
    currentStageIndex: 0,
  });
  const existingSession = await query(`SELECT * FROM live_sessions WHERE case_study_id = $1 AND created_by = $2 AND status = 'active' ORDER BY updated_at DESC LIMIT 1`, [req.params.id, req.user.sub]);

  if (publishMode === 'live_classroom') {
    let session;
    if (existingSession.rows.length) {
      const nextPayload = sanitizeCaseStudy({
        ...payload,
        livePresentationStage: existingSession.rows[0].last_payload?.livePresentationStage === 'full' ? 'full' : 'initial',
        currentStageIndex: Math.max(0, Number(existingSession.rows[0].last_payload?.currentStageIndex || 0)),
      });
      const updated = await query(
        `UPDATE live_sessions SET last_payload = $1::jsonb, step_index = 0, reveal_answers = false, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [JSON.stringify(nextPayload), existingSession.rows[0].id]
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
    await query(
      `UPDATE case_studies
       SET published_data = $1::jsonb,
           published_at = NOW(),
           status = 'live_classroom',
           student_access_enabled = FALSE,
           updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(payload), req.params.id]
    );
    sendSessionEvent(session.session_code, session);
    await sendResponseEvent(session.session_code, session.id, session.last_payload || payload);
    return res.json({ mode: publishMode, session: formatLiveSession(session) });
  }

  if (existingSession.rows.length) {
    await query(
      `UPDATE live_sessions
       SET status = 'closed',
           updated_at = NOW()
       WHERE case_study_id = $1 AND created_by = $2 AND status = 'active'`,
      [req.params.id, req.user.sub]
    );
  }

  await query(
    `UPDATE case_studies
     SET published_data = $1::jsonb,
         published_at = NOW(),
         status = 'self_paced',
         student_access_enabled = TRUE,
         updated_at = NOW()
     WHERE id = $2`,
    [JSON.stringify(payload), req.params.id]
  );
  res.json({ mode: publishMode, session: null });
});

app.post('/api/case-studies/:id/live-classroom/end', authenticateRequest, async (req, res) => {
  const ownership = await query('SELECT id FROM case_studies WHERE id = $1 AND owner_user_id = $2', [req.params.id, req.user.sub]);
  if (!ownership.rows.length) {
    return res.status(404).json({ error: 'Case study not found' });
  }

  const closedSessions = await query(
    `UPDATE live_sessions
     SET status = 'closed',
         updated_at = NOW()
     WHERE case_study_id = $1 AND created_by = $2 AND status = 'active'
     RETURNING *`,
    [req.params.id, req.user.sub]
  );

  const updated = await query(
    `UPDATE case_studies
     SET status = 'closed',
         student_access_enabled = FALSE,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [req.params.id]
  );

  closedSessions.rows.forEach((session) => {
    sendSessionEvent(session.session_code, session);
  });
  res.json({ caseStudy: formatCaseStudy(updated.rows[0]) });
});

app.get('/api/case-studies/:id/analytics', authenticateRequest, async (req, res) => {
  const ownership = await query('SELECT id, title FROM case_studies WHERE id = $1 AND owner_user_id = $2', [req.params.id, req.user.sub]);
  if (!ownership.rows.length) {
    return res.status(404).json({ error: 'Case study not found' });
  }

  const sessions = await query(
    `SELECT cs.*, u.display_name, u.email, reviewer.display_name AS reviewer_display_name
     FROM case_sessions cs
     JOIN users u ON u.id = cs.user_id
     LEFT JOIN users reviewer ON reviewer.id = cs.facilitator_marked_by
     WHERE cs.case_study_id = $1
     ORDER BY cs.updated_at DESC`,
    [req.params.id]
  );

  const attempts = sessions.rows.length;
  const completed = sessions.rows.filter((session) => session.status === 'completed');
  const reviewed = sessions.rows.filter((session) => Boolean(session.facilitator_marked_at));
  const averageScore = completed.length ? Number((completed.reduce((sum, item) => sum + Number(item.score || 0), 0) / completed.length).toFixed(2)) : 0;

  res.json({
    analytics: {
      attempts,
      completedAttempts: completed.length,
      reviewedAttempts: reviewed.length,
      completionRate: attempts ? Number(((completed.length / attempts) * 100).toFixed(2)) : 0,
      averageScore,
      recentAttempts: sessions.rows.slice(0, 10).map((session) => ({
        id: session.id,
        learnerName: session.display_name,
        learnerEmail: session.email,
        status: session.status,
        score: session.score,
        facilitatorMark: session.facilitator_mark,
        facilitatorFeedback: session.facilitator_feedback || '',
        facilitatorMarkedAt: session.facilitator_marked_at,
        facilitatorMarkedByName: session.reviewer_display_name || '',
        updatedAt: session.updated_at,
      })),
    },
  });
});

app.get('/api/case-studies/:id/attempts/:sessionId', authenticateRequest, async (req, res) => {
  const result = await query(
    `SELECT cs.*, u.display_name, u.email, c.title, c.summary, reviewer.display_name AS reviewer_display_name
     FROM case_sessions cs
     JOIN users u ON u.id = cs.user_id
     JOIN case_studies c ON c.id = cs.case_study_id
     LEFT JOIN users reviewer ON reviewer.id = cs.facilitator_marked_by
     WHERE cs.id = $1
       AND cs.case_study_id = $2
       AND c.owner_user_id = $3`,
    [req.params.sessionId, req.params.id, req.user.sub]
  );

  if (!result.rows.length) {
    return res.status(404).json({ error: 'Student attempt not found' });
  }

  const session = result.rows[0];
  res.json({
    attempt: {
      id: session.id,
      caseStudyId: session.case_study_id,
      title: session.title,
      summary: session.summary,
      learnerName: session.display_name,
      learnerEmail: session.email,
      status: session.status,
      caseSnapshot: session.case_snapshot,
      answers: session.answers,
      progress: session.progress,
      score: session.score,
      facilitatorMark: session.facilitator_mark,
      facilitatorFeedback: session.facilitator_feedback || '',
      facilitatorMarkedBy: session.facilitator_marked_by,
      facilitatorMarkedByName: session.reviewer_display_name || '',
      facilitatorMarkedAt: session.facilitator_marked_at,
      startedAt: session.started_at,
      completedAt: session.completed_at,
      updatedAt: session.updated_at,
    },
  });
});

app.put('/api/case-studies/:id/attempts/:sessionId/review', authenticateRequest, async (req, res) => {
  const ownership = await query(
    `SELECT cs.id
     FROM case_sessions cs
     JOIN case_studies c ON c.id = cs.case_study_id
     WHERE cs.id = $1
       AND cs.case_study_id = $2
       AND c.owner_user_id = $3`,
    [req.params.sessionId, req.params.id, req.user.sub]
  );

  if (!ownership.rows.length) {
    return res.status(404).json({ error: 'Student attempt not found' });
  }

  const feedback = String(req.body?.feedback || '').trim();
  const rawMark = req.body?.mark;
  const normalizedMark = rawMark === '' || rawMark === null || rawMark === undefined ? null : Number(rawMark);

  if (normalizedMark !== null && (Number.isNaN(normalizedMark) || normalizedMark < 0 || normalizedMark > 100)) {
    return res.status(400).json({ error: 'Mark must be a number between 0 and 100' });
  }

  const updated = await query(
    `UPDATE case_sessions
     SET facilitator_mark = $1,
         facilitator_feedback = $2,
         facilitator_marked_by = $3,
         facilitator_marked_at = NOW(),
         updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [normalizedMark, feedback, req.user.sub, req.params.sessionId]
  );

  const reviewer = await query('SELECT display_name FROM users WHERE id = $1', [req.user.sub]);

  res.json({
    attempt: {
      id: updated.rows[0].id,
      caseStudyId: updated.rows[0].case_study_id,
      status: updated.rows[0].status,
      answers: updated.rows[0].answers,
      progress: updated.rows[0].progress,
      score: updated.rows[0].score,
      facilitatorMark: updated.rows[0].facilitator_mark,
      facilitatorFeedback: updated.rows[0].facilitator_feedback || '',
      facilitatorMarkedBy: updated.rows[0].facilitator_marked_by,
      facilitatorMarkedByName: reviewer.rows[0]?.display_name || '',
      facilitatorMarkedAt: updated.rows[0].facilitator_marked_at,
      startedAt: updated.rows[0].started_at,
      completedAt: updated.rows[0].completed_at,
      updatedAt: updated.rows[0].updated_at,
    },
  });
});

app.post('/api/case-studies/:id/attempts/:sessionId/reset', authenticateRequest, async (req, res) => {
  try {
    const ownership = await query(
      `SELECT cs.*, u.display_name, u.email, c.title, c.summary
       FROM case_sessions cs
       JOIN case_studies c ON c.id = cs.case_study_id
       JOIN users u ON u.id = cs.user_id
       WHERE cs.id = $1
         AND cs.case_study_id = $2
         AND c.owner_user_id = $3`,
      [req.params.sessionId, req.params.id, req.user.sub]
    );

    if (!ownership.rows.length) {
      return res.status(404).json({ error: 'Student attempt not found' });
    }

    const existing = ownership.rows[0];
    const updated = await query(
      `UPDATE case_sessions
       SET status = 'in_progress',
           answers = '{}'::jsonb,
           progress = '{}'::jsonb,
           score = NULL,
           facilitator_mark = NULL,
           facilitator_feedback = '',
           facilitator_marked_by = NULL,
           facilitator_marked_at = NULL,
           completed_at = NULL,
           started_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [req.params.sessionId]
    );

    res.json({
      attempt: {
        id: updated.rows[0].id,
        caseStudyId: updated.rows[0].case_study_id,
        title: existing.title,
        summary: existing.summary,
        learnerName: existing.display_name,
        learnerEmail: existing.email,
        status: updated.rows[0].status,
        caseSnapshot: updated.rows[0].case_snapshot,
        answers: updated.rows[0].answers,
        progress: updated.rows[0].progress,
        score: updated.rows[0].score,
        facilitatorMark: updated.rows[0].facilitator_mark,
        facilitatorFeedback: updated.rows[0].facilitator_feedback || '',
        facilitatorMarkedBy: updated.rows[0].facilitator_marked_by,
        facilitatorMarkedByName: '',
        facilitatorMarkedAt: updated.rows[0].facilitator_marked_at,
        startedAt: updated.rows[0].started_at,
        completedAt: updated.rows[0].completed_at,
        updatedAt: updated.rows[0].updated_at,
      },
    });
  } catch (error) {
    console.error('Failed to reset student attempt', error);
    res.status(500).json({
      error: 'Unable to reset this student attempt.',
      detail: process.env.NODE_ENV !== 'production' ? error.message : undefined,
    });
  }
});

app.get('/api/my-sessions', authenticateRequest, async (req, res) => {
  const result = await query(
    `SELECT cs.id, cs.case_study_id, cs.status, cs.answers, cs.progress, cs.score, cs.started_at, cs.completed_at, cs.updated_at,
            cs.facilitator_mark, cs.facilitator_feedback, cs.facilitator_marked_at,
            ROW_NUMBER() OVER (PARTITION BY cs.case_study_id, cs.user_id ORDER BY cs.started_at ASC, cs.id ASC)::int AS attempt_number,
            c.title, c.summary,
            reviewer.display_name AS reviewer_display_name
     FROM case_sessions cs
     JOIN case_studies c ON c.id = cs.case_study_id
     LEFT JOIN users reviewer ON reviewer.id = cs.facilitator_marked_by
     WHERE cs.user_id = $1
     ORDER BY cs.updated_at DESC`,
    [req.user.sub]
  );

  let liveSessions = [];
  try {
    liveSessions = await listStudentLiveSessions(req.user.sub);
  } catch (error) {
    console.error('Unable to load student live session history', error);
  }

  res.json({
    sessions: result.rows.map((row) => ({
      id: row.id,
      caseStudyId: row.case_study_id,
      title: row.title,
      summary: row.summary,
      status: row.status,
      answers: row.answers,
      progress: row.progress,
      score: row.score,
      facilitatorMark: row.facilitator_mark,
      facilitatorFeedback: row.facilitator_feedback || '',
      facilitatorMarkedAt: row.facilitator_marked_at,
      facilitatorMarkedByName: row.reviewer_display_name || '',
      attemptNumber: row.attempt_number,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      updatedAt: row.updated_at,
    })),
    liveSessions,
  });
});

app.post('/api/case-studies/:id/favourite', authenticateRequest, async (req, res) => {
  await query(
    `INSERT INTO student_case_study_favourites (id, user_id, case_study_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, case_study_id) DO NOTHING`,
    [createId('favourite'), req.user.sub, req.params.id]
  );
  res.status(201).json({ ok: true });
});

app.delete('/api/case-studies/:id/favourite', authenticateRequest, async (req, res) => {
  await query(
    `DELETE FROM student_case_study_favourites
     WHERE user_id = $1 AND case_study_id = $2`,
    [req.user.sub, req.params.id]
  );
  res.json({ ok: true });
});

app.post('/api/case-studies/:id/start', authenticateRequest, async (req, res) => {
  try {
    const caseStudyResult = await query(
      `SELECT cs.*
       FROM case_studies cs
       WHERE cs.id = $1
         AND cs.student_access_enabled = TRUE`,
      [req.params.id]
    );
    if (!caseStudyResult.rows.length) {
      return res.status(404).json({ error: 'Case study not available to this student' });
    }

    const caseStudy = caseStudyResult.rows[0];
    const latestSourceCaseStudy = caseStudy.published_data || caseStudy.draft_data;
    const allowMultipleAttempts = Boolean(latestSourceCaseStudy?.allowMultipleAttempts);
    const learnerSessions = await query(
      `SELECT *
       FROM case_sessions
       WHERE case_study_id = $1
         AND user_id = $2
       ORDER BY updated_at DESC`,
      [req.params.id, req.user.sub]
    );
    const currentSession = learnerSessions.rows.find((session) => session.status === 'in_progress');
    if (currentSession) {
      const publishTimestamp = caseStudy.published_at ? new Date(caseStudy.published_at).getTime() : 0;
      const sessionStartedTimestamp = currentSession.started_at ? new Date(currentSession.started_at).getTime() : 0;
      const sessionUpdatedTimestamp = currentSession.updated_at ? new Date(currentSession.updated_at).getTime() : 0;
      const hasStudentProgress = Boolean(
        Object.keys(currentSession.answers || {}).length
        || Object.keys(currentSession.progress || {}).length
        || sessionUpdatedTimestamp > sessionStartedTimestamp
      );
      const hasUpdatedPublishedVersion = Boolean(
        !hasStudentProgress
        && publishTimestamp
        && publishTimestamp > sessionStartedTimestamp
      );

      if (hasUpdatedPublishedVersion) {
        const refreshedSnapshot = resolveCaseStudyForSession(latestSourceCaseStudy, new Date());
        const refreshedSession = await query(
          `UPDATE case_sessions
           SET case_snapshot = $1::jsonb,
               answers = '{}'::jsonb,
               progress = '{}'::jsonb,
               score = NULL,
               started_at = NOW(),
               completed_at = NULL,
               updated_at = NOW()
           WHERE id = $2
           RETURNING *`,
          [JSON.stringify(refreshedSnapshot), currentSession.id]
        );
        return res.json({ session: refreshedSession.rows[0] });
      }

      return res.json({ session: currentSession });
    }

    if (!allowMultipleAttempts && learnerSessions.rows.length) {
      return res.status(409).json({ error: 'This case study only allows one attempt. You can review your completed attempt from My saved case sessions.' });
    }

    const sessionSnapshot = resolveCaseStudyForSession(latestSourceCaseStudy, new Date());
    const created = await query(
      `INSERT INTO case_sessions (id, case_study_id, user_id, status, case_snapshot)
       VALUES ($1, $2, $3, 'in_progress', $4::jsonb)
       RETURNING *`,
      [createId('attempt'), req.params.id, req.user.sub, JSON.stringify(sessionSnapshot)]
    );

    res.status(201).json({ session: created.rows[0] });
  } catch (error) {
    console.error('Failed to start case study session', error);
    res.status(500).json({
      error: 'Unexpected server error',
      detail: process.env.NODE_ENV !== 'production' ? error.message : undefined,
    });
  }
});

app.get('/api/case-sessions/:id', authenticateRequest, async (req, res) => {
  const result = await query(
    `SELECT cs.*, c.title, c.summary, c.published_data, c.draft_data, c.published_at, c.student_access_enabled
     FROM (
       SELECT case_sessions.*,
              ROW_NUMBER() OVER (PARTITION BY case_study_id, user_id ORDER BY started_at ASC, id ASC)::int AS attempt_number
       FROM case_sessions
       WHERE user_id = $2
     ) cs
     JOIN case_studies c ON c.id = cs.case_study_id
     WHERE cs.id = $1`,
    [req.params.id, req.user.sub]
  );
  if (!result.rows.length) {
    return res.status(404).json({ error: 'Case session not found' });
  }

  let session = result.rows[0];
  if (session.status === 'in_progress' && session.student_access_enabled) {
    const latestSourceCaseStudy = session.published_data || session.draft_data;
    const publishTimestamp = session.published_at ? new Date(session.published_at).getTime() : 0;
    const sessionStartedTimestamp = session.started_at ? new Date(session.started_at).getTime() : 0;
    const sessionUpdatedTimestamp = session.updated_at ? new Date(session.updated_at).getTime() : 0;
    const hasStudentProgress = Boolean(
      Object.keys(session.answers || {}).length
      || Object.keys(session.progress || {}).length
      || sessionUpdatedTimestamp > sessionStartedTimestamp
    );
    const hasUpdatedPublishedVersion = Boolean(
      !hasStudentProgress
      && publishTimestamp
      && publishTimestamp > sessionStartedTimestamp
    );

    if (hasUpdatedPublishedVersion) {
      const refreshedSnapshot = resolveCaseStudyForSession(latestSourceCaseStudy, new Date());
      const refreshed = await query(
        `UPDATE case_sessions
         SET case_snapshot = $1::jsonb,
             answers = '{}'::jsonb,
             progress = '{}'::jsonb,
             score = NULL,
             started_at = NOW(),
             completed_at = NULL,
             updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [JSON.stringify(refreshedSnapshot), session.id]
      );
      session = {
        ...session,
        ...refreshed.rows[0],
      };
    }
  }

  res.json({
    session: {
      id: session.id,
      caseStudyId: session.case_study_id,
      title: session.title,
      summary: session.summary,
      status: session.status,
      caseSnapshot: session.case_snapshot,
      answers: session.answers,
      progress: session.progress,
      score: session.score,
      facilitatorMark: session.facilitator_mark,
      facilitatorFeedback: session.facilitator_feedback || '',
      facilitatorMarkedAt: session.facilitator_marked_at,
      attemptNumber: session.attempt_number,
      startedAt: session.started_at,
      completedAt: session.completed_at,
      updatedAt: session.updated_at,
    },
  });
});

app.put('/api/case-sessions/:id', authenticateRequest, async (req, res) => {
  const { answers = {}, progress = {}, caseSnapshot } = req.body || {};
  const result = await query(
    `UPDATE case_sessions
     SET answers = $1::jsonb,
         progress = $2::jsonb,
         case_snapshot = COALESCE($3::jsonb, case_snapshot),
         updated_at = NOW()
     WHERE id = $4 AND user_id = $5 AND status = 'in_progress'
     RETURNING *`,
    [
      JSON.stringify(answers),
      JSON.stringify(progress),
      caseSnapshot ? JSON.stringify(sanitizeCaseStudy(caseSnapshot)) : null,
      req.params.id,
      req.user.sub,
    ]
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
  const caseSnapshot = req.body?.caseSnapshot ? sanitizeCaseStudy(req.body.caseSnapshot) : existing.case_snapshot;
  const grade = gradeCaseSession(caseSnapshot, answers);

  const updated = await query(
    `UPDATE case_sessions
     SET answers = $1::jsonb,
         progress = $2::jsonb,
         case_snapshot = $3::jsonb,
         score = $4,
         status = 'completed',
         completed_at = NOW(),
         updated_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [JSON.stringify(answers), JSON.stringify({ ...progress, breakdown: grade.breakdown }), JSON.stringify(caseSnapshot), grade.score, req.params.id]
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
  const result = await query(`SELECT id, last_payload FROM live_sessions WHERE session_code = $1 AND status = 'active'`, [req.params.code.toUpperCase()]);
  if (!result.rows.length) {
    return res.status(404).json({ error: 'Live session not found' });
  }

  const summary = await getLiveResponseSummary(result.rows[0].id, result.rows[0].last_payload || {});
  res.json({ summary });
});

app.post('/api/sessions/:code/join', authenticateRequest, async (req, res) => {
  const { participantId, participantName } = req.body || {};
  if (!participantId) {
    return res.status(400).json({ error: 'participantId is required' });
  }

  const sessionResult = await query(
    `SELECT id, session_code, last_payload
     FROM live_sessions
     WHERE session_code = $1 AND status = 'active'`,
    [req.params.code.toUpperCase()]
  );

  if (!sessionResult.rows.length) {
    return res.status(404).json({ error: 'Live session not found' });
  }

  const session = sessionResult.rows[0];
  await query(
    `INSERT INTO live_session_participants (id, live_session_id, user_id, participant_id, participant_name)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (live_session_id, user_id)
     DO UPDATE SET participant_id = EXCLUDED.participant_id,
                   participant_name = EXCLUDED.participant_name,
                   last_viewed_at = NOW()`,
    [
      createId('live_participant'),
      session.id,
      req.user.sub,
      String(participantId),
      (participantName || req.user.displayName || 'Guest learner').trim(),
    ]
  );

  res.status(201).json({ ok: true });
});

app.post('/api/sessions/:code/push', authenticateRequest, async (req, res) => {
  const { data } = req.body || {};
  if (!data) {
    return res.status(400).json({ error: 'A payload is required' });
  }

  const sessionResult = await query(
    `SELECT ls.*
     FROM live_sessions ls
     JOIN case_studies cs ON ls.case_study_id = cs.id
     WHERE ls.session_code = $1 AND cs.owner_user_id = $2 AND ls.status = 'active'`,
    [req.params.code.toUpperCase(), req.user.sub]
  );

  if (!sessionResult.rows.length) {
    return res.status(404).json({ error: 'Live session not found' });
  }

  const currentSession = sessionResult.rows[0];
  const nextPayload = sanitizeCaseStudy({
    ...data,
    livePresentationStage: data.livePresentationStage || currentSession.last_payload?.livePresentationStage || 'initial',
  });

  const result = await query(
    `UPDATE live_sessions
     SET last_payload = $1::jsonb, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [JSON.stringify(nextPayload), currentSession.id]
  );

  sendSessionEvent(result.rows[0].session_code, result.rows[0]);
  res.json({ session: formatLiveSession(result.rows[0]) });
});

app.post('/api/sessions/:code/responses', optionalAuthenticateRequest, async (req, res) => {
  const { questionNumber, answer, participantId, participantName } = req.body || {};
  if (!questionNumber || !participantId) {
    return res.status(400).json({ error: 'questionNumber and participantId are required' });
  }

  const sessionResult = await query(
    `SELECT *
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

  if (req.user?.sub) {
    await query(
      `INSERT INTO live_session_participants (id, live_session_id, user_id, participant_id, participant_name)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (live_session_id, user_id)
       DO UPDATE SET participant_id = EXCLUDED.participant_id,
                     participant_name = EXCLUDED.participant_name,
                     last_viewed_at = NOW()`,
      [
        createId('live_participant'),
        session.id,
        req.user.sub,
        String(participantId),
        (participantName || req.user.displayName || 'Guest learner').trim(),
      ]
    );
  }

  let responsePayload = session.last_payload || {};
  let updatedLiveSession = null;
  const advancedPayload = advanceCaseStudyStageForQuestion(responsePayload, questionNumber);
  if (advancedPayload.currentStageIndex !== responsePayload.currentStageIndex) {
    responsePayload = advancedPayload;
    const updatedSession = await query(
      `UPDATE live_sessions
       SET last_payload = $1::jsonb, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify(responsePayload), session.id]
    );
    updatedLiveSession = updatedSession.rows[0];
    sendSessionEvent(updatedLiveSession.session_code, updatedLiveSession);
  }

  const summary = await getLiveResponseSummary(session.id, responsePayload);
  await sendResponseEvent(session.session_code, session.id, responsePayload);
  res.status(201).json({
    summary,
    session: formatLiveSession(updatedLiveSession || { ...session, last_payload: responsePayload }),
  });
});

app.post('/api/sessions/:code/control', authenticateRequest, async (req, res) => {
  const {
    stepIndex,
    revealAnswers,
    presentationStage,
    stageIndex,
    revealedQuestionNumbers,
  } = req.body || {};
  const normalizedStepIndex = Math.max(0, Number(stepIndex || 0));
  const sessionLookup = await query(
    `SELECT ls.*
     FROM live_sessions ls
     JOIN case_studies cs ON ls.case_study_id = cs.id
     WHERE ls.session_code = $1 AND cs.owner_user_id = $2 AND ls.status = 'active'`,
    [req.params.code.toUpperCase(), req.user.sub]
  );

  if (!sessionLookup.rows.length) {
    return res.status(404).json({ error: 'Live session not found' });
  }

  const sessionRow = sessionLookup.rows[0];
  const hasStageIndex = stageIndex !== undefined && stageIndex !== null && stageIndex !== '';
  const hasRevealedQuestionNumbers = Array.isArray(revealedQuestionNumbers);
  const nextPayload = sanitizeCaseStudy({
    ...(sessionRow.last_payload || {}),
    ...(presentationStage ? { livePresentationStage: presentationStage === 'initial' ? 'initial' : 'full' } : {}),
    ...(hasStageIndex ? { currentStageIndex: Math.max(0, Number(stageIndex || 0)) } : {}),
    ...(hasRevealedQuestionNumbers ? { revealedQuestionNumbers: [...new Set(revealedQuestionNumbers.map(String))] } : {}),
  });
  const result = await query(
    `UPDATE live_sessions ls
     SET step_index = $1, reveal_answers = $2, last_payload = $3::jsonb, updated_at = NOW()
     WHERE ls.id = $4
     RETURNING ls.*`,
    [normalizedStepIndex, Boolean(revealAnswers), JSON.stringify(nextPayload), sessionRow.id]
  );

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
  res.write(`event: response-update\ndata: ${JSON.stringify(await getLiveResponseSummary(result.rows[0].id, result.rows[0].last_payload || {}))}\n\n`);
  const keepAlive = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
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
