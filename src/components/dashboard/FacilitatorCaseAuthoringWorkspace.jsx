import React, { useEffect, useMemo, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Row from 'react-bootstrap/Row';
import PatientDetails from '../patient_records/Patient_details';
import PatientRecordsContainer from '../patient_records/Patient_records_container';
import Prescription from '../prescriptions/Prescription';
import AddQuestions from '../casestudy_editor/NewQuestions';
import AddMicrobiology from '../casestudy_editor/NewMicrobiology';
import AddImages from '../casestudy_editor/NewImages';
import data from '../casestudy_editor/randomFields';
import {
  createDraftCaseStudy,
  createLiveStage,
  getCaseStudyAuthoringProgress,
  getCaseStudyForLiveStage,
  hasContent,
  normalizeCaseStudy,
} from '../../lib/caseStudy';

const buildRandomAddress = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVQXYZ';
  const postcode = `${characters[Math.floor(Math.random() * characters.length)]}${characters[Math.floor(Math.random() * characters.length)]}${Math.ceil(Math.random() * 10)} ${Math.ceil(Math.random() * 10)}${characters[Math.floor(Math.random() * characters.length)]}${characters[Math.floor(Math.random() * characters.length)]}`;
  const houseNo = Math.ceil(Math.random() * 120);
  const street = data.addresses.streets[Math.floor(Math.random() * data.addresses.streets.length)];
  const town = data.addresses.towns[Math.floor(Math.random() * data.addresses.towns.length)];
  return `${houseNo} ${street}, ${town}, ${postcode}`;
};

const stayTypeWardOptions = {
  'A/E': ['Majors', 'Resus', 'Assessment', 'Ambulatory Emergency Care'],
  'Ward inpatient': ['Cedar Ward', 'Willow Ward', 'Maple Ward', 'Oak Ward', 'Rose Ward'],
  Daycase: ['Day Surgery Unit', 'Medical Day Unit', 'Endoscopy Day Unit', 'Ambulatory Care Unit'],
  Theatre: ['Theatre Suite 1', 'Theatre Suite 2', 'Recovery Bay', 'Surgical Admissions Lounge'],
};

const buildRandomWardName = (stayType) => {
  const options = stayTypeWardOptions[stayType] || stayTypeWardOptions['Ward inpatient'];
  return options[Math.floor(Math.random() * options.length)];
};

const randomDigits = (length) => Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');

const buildGeneratedPatient = ({ gender, ageYears, weightKg, heightCm, stayType }) => {
  const nameBucket = gender === 'Male' ? 'male_names' : 'female_names';
  const firstName = data.names[nameBucket][Math.floor(Math.random() * data.names[nameBucket].length)];
  const surname = data.names.surnames[Math.floor(Math.random() * data.names.surnames.length)];
  const today = new Date();
  const month = Math.floor(Math.random() * 12);
  const day = Math.max(1, Math.floor(Math.random() * 28));
  const dob = new Date(today.getFullYear() - Number(ageYears || 30), month, day);
  const admittedAt = new Date();

  return {
    fullName: `${firstName} ${surname}`,
    hospitalNumber: `${randomDigits(7)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
    nhsNumber: randomDigits(10),
    dateOfBirth: dob.toLocaleDateString('en-GB'),
    address: buildRandomAddress(),
    gender,
    stayType,
    wardName: buildRandomWardName(stayType),
    weight: `${weightKg}kg`,
    height: `${heightCm}cm`,
    weightRecordedAt: admittedAt.toISOString(),
    heightRecordedAt: admittedAt.toISOString(),
    admittedAt: admittedAt.toISOString(),
    episodeStatus: 'active',
    measurementHistory: [
      {
        id: `measurement-${Date.now()}`,
        weight: String(weightKg),
        height: String(heightCm),
        recordedAt: admittedAt.toISOString(),
      },
    ],
  };
};

const buildTimelineDateStrings = (count = 5) => Array.from({ length: count }, (_item, index) => {
  const point = new Date();
  point.setDate(point.getDate() - (count - index - 1));
  point.setHours(8 + ((index % 3) * 4), 0, 0, 0);
  return point.toLocaleString('en-GB');
});

const buildSampleBiochemistry = () => {
  const timeline = buildTimelineDateStrings(5);
  const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const randomWalk = ({ start, min, max, step, precision = 0 }) => {
    const values = [start];
    return timeline.map((_datetime, index) => {
      if (index > 0) {
        const multiplier = 10 ** precision;
        const delta = precision ? randomInt(-step, step) / multiplier : randomInt(-step, step);
        values.push(clamp(Number(values[index - 1]) + delta, min, max));
      }
      return precision ? Number(values[index]).toFixed(precision) : String(Math.round(values[index]));
    });
  };
  const sodiumValues = randomWalk({ start: randomInt(129, 144), min: 122, max: 150, step: 4 });
  const potassiumValues = randomWalk({ start: Number((3.0 + Math.random() * 2.2).toFixed(1)), min: 2.7, max: 6.2, step: 4, precision: 1 });
  const creatinineValues = randomWalk({ start: randomInt(60, 170), min: 40, max: 260, step: 24 });
  const ureaValues = randomWalk({ start: Number((3.0 + Math.random() * 12).toFixed(1)), min: 1.5, max: 24, step: 18, precision: 1 });
  const crpValues = randomWalk({ start: randomInt(3, 140), min: 1, max: 280, step: 42 });
  const haemoglobinValues = randomWalk({ start: randomInt(85, 155), min: 60, max: 180, step: 10 });
  const whiteCellValues = randomWalk({ start: Number((3.0 + Math.random() * 17).toFixed(1)), min: 0.5, max: 30, step: 22, precision: 1 });
  return {
    sodium: {
      name: 'Sodium',
      category: 'UE',
      range: '135-145',
      unit: 'mmol/L',
      results: timeline.map((datetime, index) => ({ datetime, result: sodiumValues[index] })),
    },
    potassium: {
      name: 'Potassium',
      category: 'UE',
      range: '3.5-5.0',
      unit: 'mmol/L',
      results: timeline.map((datetime, index) => ({ datetime, result: potassiumValues[index] })),
    },
    creatinine: {
      name: 'Creatinine',
      category: 'UE',
      range: '80-120',
      unit: 'umol/L',
      results: timeline.map((datetime, index) => ({ datetime, result: creatinineValues[index] })),
    },
    urea: {
      name: 'Urea',
      category: 'UE',
      range: '2.5-7.8',
      unit: 'mmol/L',
      results: timeline.map((datetime, index) => ({ datetime, result: ureaValues[index] })),
    },
    crp: {
      name: 'CRP',
      category: 'Inflammation',
      range: '<5',
      unit: 'mg/L',
      results: timeline.map((datetime, index) => ({ datetime, result: crpValues[index] })),
    },
    haemoglobin: {
      name: 'Haemoglobin',
      category: 'FBC',
      range: '115-165',
      unit: 'g/L',
      results: timeline.map((datetime, index) => ({ datetime, result: haemoglobinValues[index] })),
    },
    white_cells: {
      name: 'White cells',
      category: 'FBC',
      range: '4-11',
      unit: 'x10^9/L',
      results: timeline.map((datetime, index) => ({ datetime, result: whiteCellValues[index] })),
    },
  };
};

const buildSampleMicrobiology = () => {
  const sampleCount = 2;
  const timeline = buildTimelineDateStrings(sampleCount);
  const samples = [
    ['Blood cultures', 'No growth at 5 days', [], 'Aerobic and anaerobic bottles incubated. No organisms isolated.'],
    ['Blood cultures', 'Staphylococcus aureus', [['Flucloxacillin', 'S'], ['Vancomycin', 'S'], ['Clindamycin', 'S'], ['Penicillin', 'R']], 'MSSA isolated from one aerobic bottle. Correlate clinically and repeat cultures if ongoing pyrexia.'],
    ['Blood cultures', 'Escherichia coli', [['Co-amoxiclav', 'R'], ['Ceftriaxone', 'S'], ['Gentamicin', 'S'], ['Piperacillin/tazobactam', 'S']], 'Gram-negative bacilli isolated. Sensitivities reported.'],
    ['Midstream urine', 'Escherichia coli >100,000 cfu/mL', [['Nitrofurantoin', 'S'], ['Trimethoprim', 'R'], ['Co-amoxiclav', 'R'], ['Cefalexin', 'S']], 'Significant growth consistent with urinary tract infection.'],
    ['Midstream urine', 'Mixed growth', [], 'Mixed urethral flora. Repeat specimen recommended if symptoms persist.'],
    ['Catheter urine', 'Pseudomonas aeruginosa >100,000 cfu/mL', [['Ciprofloxacin', 'S'], ['Gentamicin', 'S'], ['Piperacillin/tazobactam', 'S'], ['Co-amoxiclav', 'R']], 'Significant growth from catheter specimen. Interpret with clinical features.'],
    ['Sputum culture', 'Haemophilus influenzae', [['Amoxicillin', 'S'], ['Doxycycline', 'S'], ['Co-amoxiclav', 'S'], ['Clarithromycin', 'S']], 'Moderate growth with inflammatory cells seen on microscopy.'],
    ['Sputum culture', 'Pseudomonas aeruginosa', [['Ciprofloxacin', 'S'], ['Gentamicin', 'S'], ['Meropenem', 'S'], ['Co-amoxiclav', 'R']], 'Heavy growth. Consider colonisation versus infection according to clinical context.'],
    ['Wound swab', 'Staphylococcus aureus', [['Flucloxacillin', 'S'], ['Clarithromycin', 'S'], ['Doxycycline', 'S'], ['Penicillin', 'R']], 'Heavy growth from wound swab.'],
    ['Wound swab', 'MRSA', [['Vancomycin', 'S'], ['Linezolid', 'S'], ['Doxycycline', 'S'], ['Flucloxacillin', 'R']], 'MRSA isolated. Infection prevention precautions advised.'],
    ['Stool culture', 'No Salmonella, Shigella, Campylobacter or E. coli O157 isolated', [], 'Routine bacterial stool culture negative.'],
    ['C. difficile toxin', 'C. difficile toxin detected', [['Metronidazole', 'S'], ['Vancomycin oral', 'S']], 'Toxin positive. Manage according to local C. difficile guidance.'],
    ['Throat swab', 'Group A Streptococcus', [['Penicillin V', 'S'], ['Clarithromycin', 'S'], ['Erythromycin', 'S']], 'Group A Streptococcus isolated.'],
    ['Nasal swab', 'MRSA not detected', [], 'Screening swab negative for MRSA.'],
    ['Nasal swab', 'MRSA detected', [['Mupirocin', 'S'], ['Chlorhexidine wash', 'S']], 'MRSA screening positive. Decolonisation may be required.'],
    ['CSF culture', 'No growth', [], 'No organisms seen. Culture negative to date. Correlate with cell count and biochemistry.'],
    ['Ascitic fluid culture', 'No growth', [], 'Culture negative. Consider prior antibiotics and clinical picture.'],
    ['Pleural fluid culture', 'Streptococcus pneumoniae', [['Amoxicillin', 'S'], ['Ceftriaxone', 'S'], ['Clarithromycin', 'S']], 'Organism isolated from sterile site.'],
    ['Line tip culture', 'Coagulase-negative staphylococcus', [['Vancomycin', 'S'], ['Flucloxacillin', 'R']], 'Growth from line tip. Significance depends on paired blood cultures and clinical context.'],
    ['Viral PCR respiratory swab', 'Influenza A detected', [], 'SARS-CoV-2 not detected. RSV not detected. Influenza A detected.'],
  ];

  return samples.slice(0, sampleCount).map(([sampleType, growth, sensitivities, notes], index) => ({
    datetime: timeline[index],
    sample_type: sampleType,
    growth,
    sensitivities,
    notes: `${notes} S = Sensitive I = Intermediate R = Resistant`,
  }));
};

const buildSampleObservations = () => {
  const timeline = buildTimelineDateStrings(6);
  const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const randomWalk = ({ start, min, max, step, precision = 0 }) => {
    const values = [start];
    return timeline.map((_datetime, index) => {
      if (index > 0) {
        const multiplier = 10 ** precision;
        const delta = precision ? randomInt(-step, step) / multiplier : randomInt(-step, step);
        values.push(clamp(Number(values[index - 1]) + delta, min, max));
      }
      return precision ? Number(values[index]).toFixed(precision) : String(Math.round(values[index]));
    });
  };
  const systolicValues = randomWalk({ start: randomInt(95, 150), min: 85, max: 175, step: 12 });
  const diastolicValues = randomWalk({ start: randomInt(55, 92), min: 45, max: 105, step: 7 });
  const heartRateValues = randomWalk({ start: randomInt(68, 122), min: 45, max: 140, step: 14 });
  const temperatureValues = randomWalk({ start: Number((36.3 + Math.random() * 2.4).toFixed(1)), min: 35.8, max: 39.6, step: 4, precision: 1 });
  const respRateValues = randomWalk({ start: randomInt(14, 30), min: 10, max: 36, step: 5 });
  const oxygenValues = randomWalk({ start: randomInt(90, 99), min: 84, max: 100, step: 3 });
  return {
    blood_pressure: timeline.map((datetime, index) => ({
      datetime,
      systolic: systolicValues[index],
      diastolic: diastolicValues[index],
    })),
    heart_rate: timeline.map((datetime, index) => ({
      datetime,
      rate: heartRateValues[index],
    })),
    temperature: timeline.map((datetime, index) => ({
      datetime,
      temperature: temperatureValues[index],
    })),
    resp_rate: timeline.map((datetime, index) => ({
      datetime,
      bpm: respRateValues[index],
    })),
    oxygen: timeline.map((datetime, index) => ({
      datetime,
      percentage: oxygenValues[index],
      device: Number(oxygenValues[index]) < 94 ? '2L nasal cannula' : 'Air',
    })),
  };
};

const sampleHistoryScenarios = [
  {
    presentingComplaint: 'Shortness of breath and productive cough',
    historyPresentingComplaint: 'Three-day history of worsening breathlessness, productive cough, reduced oral intake, and fevers at home. Symptoms became more limiting overnight, prompting hospital attendance.',
    pastMedicalSurgicalHistory: [
      { text: 'COPD', code: 'J44.9' },
      { text: 'Hypertension', code: 'I10' },
      { text: 'Type 2 diabetes mellitus', code: 'E11.9' },
    ],
    functionalBaseline: 'Normally mobilises independently indoors with one stick. Gets breathless on stairs but manages own personal care.',
    familyHistory: 'Father had ischaemic heart disease. Mother had type 2 diabetes.',
    socialHistory: {
      alcohol: '6-8 units of alcohol per week.',
      smoking: 'Ex-smoker, 35 pack-year history.',
      recreationalDrugs: 'Denies recreational drug use.',
      occupation: 'Retired bus driver.',
      homeEnvironment: 'Lives with partner in a two-storey house. Independent with medications.',
    },
  },
  {
    presentingComplaint: 'Confusion and reduced oral intake',
    historyPresentingComplaint: 'Family report two days of worsening confusion, poor appetite, and increased drowsiness. No clear focal neurological symptoms. Mild urinary frequency over the last week.',
    pastMedicalSurgicalHistory: [
      { text: 'Chronic kidney disease stage 3', code: 'N18.3' },
      { text: 'Atrial fibrillation', code: 'I48.9' },
      { text: 'Osteoarthritis', code: 'M19.9' },
    ],
    functionalBaseline: 'Mobilises with a frame outdoors. Needs prompting for meals but usually manages at home with family support.',
    familyHistory: 'No significant family history recorded.',
    socialHistory: {
      alcohol: 'Rare alcohol intake.',
      smoking: 'Never smoker.',
      recreationalDrugs: 'No recreational drug use.',
      occupation: 'Retired teaching assistant.',
      homeEnvironment: 'Lives alone with twice-daily carers and close family nearby.',
    },
  },
  {
    presentingComplaint: 'Chest pain',
    historyPresentingComplaint: 'Central chest discomfort started suddenly this morning while mobilising to the bathroom. Associated with nausea and clamminess. Pain improved slightly with rest but persisted on arrival.',
    pastMedicalSurgicalHistory: [
      { text: 'Ischaemic heart disease', code: 'I25.9' },
      { text: 'Hypercholesterolaemia', code: 'E78.0' },
      { text: 'Gastro-oesophageal reflux disease', code: 'K21.9' },
    ],
    functionalBaseline: 'Fully independent with activities of daily living and manages own medications.',
    familyHistory: 'Brother had myocardial infarction aged 58.',
    socialHistory: {
      alcohol: '10 units per week.',
      smoking: 'Current smoker, 10 cigarettes daily.',
      recreationalDrugs: 'No recreational drug use.',
      occupation: 'Accountant.',
      homeEnvironment: 'Lives with spouse, works full time, no package of care.',
    },
  },
  {
    presentingComplaint: 'Abdominal pain and vomiting',
    historyPresentingComplaint: 'Twenty-four hour history of worsening central abdominal pain migrating to the right iliac fossa, associated with nausea, repeated vomiting, and reduced oral intake.',
    pastMedicalSurgicalHistory: [
      { text: 'Asthma', code: 'J45.9' },
      { text: 'Endometriosis', code: 'N80.9' },
    ],
    functionalBaseline: 'Independent with all activities of daily living and normally works full time.',
    familyHistory: 'Mother has gallstone disease.',
    socialHistory: {
      alcohol: '3-4 units per week.',
      smoking: 'Never smoker.',
      recreationalDrugs: 'No recreational drug use.',
      occupation: 'Primary school teacher.',
      homeEnvironment: 'Lives with partner in rented accommodation, no support package.',
    },
  },
  {
    presentingComplaint: 'Falls and dizziness',
    historyPresentingComplaint: 'Several recent falls over the last week with increasing postural dizziness and poor fluid intake. No clear loss of consciousness reported.',
    pastMedicalSurgicalHistory: [
      { text: 'Parkinson disease', code: 'G20' },
      { text: 'Hypertension', code: 'I10' },
      { text: 'Benign prostatic hyperplasia', code: 'N40' },
    ],
    functionalBaseline: 'Usually mobilises short distances with a frame and needs help with shopping and meal preparation.',
    familyHistory: 'No significant family history recorded.',
    socialHistory: {
      alcohol: 'Occasional single glass of wine.',
      smoking: 'Ex-smoker, stopped 20 years ago.',
      recreationalDrugs: 'None.',
      occupation: 'Retired engineer.',
      homeEnvironment: 'Lives with wife in bungalow. Daughter visits daily.',
    },
  },
  {
    presentingComplaint: 'Diarrhoea and dehydration',
    historyPresentingComplaint: 'Three-day history of profuse watery diarrhoea with abdominal cramping, reduced urine output, and light-headedness on standing.',
    pastMedicalSurgicalHistory: [
      { text: 'Ulcerative colitis', code: 'K51.9' },
      { text: 'Iron deficiency anaemia', code: 'D50.9' },
    ],
    functionalBaseline: 'Independent and generally active, no baseline mobility issues.',
    familyHistory: 'Sister has coeliac disease.',
    socialHistory: {
      alcohol: 'Minimal alcohol intake.',
      smoking: 'Never smoker.',
      recreationalDrugs: 'No recreational drug use.',
      occupation: 'University administrator.',
      homeEnvironment: 'Lives with two children, independent with medications and self-care.',
    },
  },
  {
    presentingComplaint: 'Severe headache and photophobia',
    historyPresentingComplaint: 'Acute onset frontal headache since this morning with photophobia, neck discomfort, nausea, and feeling feverish.',
    pastMedicalSurgicalHistory: [
      { text: 'Migraine', code: 'G43.9' },
      { text: 'Anxiety disorder', code: 'F41.9' },
    ],
    functionalBaseline: 'Fully independent and employed full time.',
    familyHistory: 'Mother has migraine. No known neurological disorders in family.',
    socialHistory: {
      alcohol: '8-10 units weekly.',
      smoking: 'Never smoker.',
      recreationalDrugs: 'Denies recreational drug use.',
      occupation: 'Graphic designer.',
      homeEnvironment: 'Lives with housemate, no care needs.',
    },
  },
  {
    presentingComplaint: 'Leg swelling and breathlessness',
    historyPresentingComplaint: 'Progressive bilateral leg swelling over two weeks with worsening exertional breathlessness and needing extra pillows at night.',
    pastMedicalSurgicalHistory: [
      { text: 'Heart failure', code: 'I50.9' },
      { text: 'Chronic kidney disease stage 4', code: 'N18.4' },
      { text: 'Type 2 diabetes mellitus', code: 'E11.9' },
    ],
    functionalBaseline: 'Housebound but independent with personal care. Daughter helps with shopping and medications.',
    familyHistory: 'Father had heart failure in later life.',
    socialHistory: {
      alcohol: 'No current alcohol intake.',
      smoking: 'Ex-smoker, 20 pack-year history.',
      recreationalDrugs: 'None.',
      occupation: 'Retired machinist.',
      homeEnvironment: 'Lives alone in ground-floor flat with daily family support.',
    },
  },
  {
    presentingComplaint: 'Reduced conscious level',
    historyPresentingComplaint: 'Found drowsy by family this morning after being increasingly sleepy overnight. Had been complaining of thirst and lethargy for several days.',
    pastMedicalSurgicalHistory: [
      { text: 'Type 1 diabetes mellitus', code: 'E10.9' },
      { text: 'Hypothyroidism', code: 'E03.9' },
    ],
    functionalBaseline: 'Normally fully independent and manages insulin without support.',
    familyHistory: 'Brother has type 1 diabetes.',
    socialHistory: {
      alcohol: 'Social alcohol use only.',
      smoking: 'Never smoker.',
      recreationalDrugs: 'No recreational drug use.',
      occupation: 'Chef.',
      homeEnvironment: 'Lives with partner and young child. Works variable shifts.',
    },
  },
  {
    presentingComplaint: 'Back pain and fever',
    historyPresentingComplaint: 'Lower back pain worsening over five days with fevers, rigors, and difficulty mobilising. No recent trauma reported.',
    pastMedicalSurgicalHistory: [
      { text: 'Intravenous drug use history', code: 'F19.1' },
      { text: 'Hepatitis C', code: 'B18.2' },
      { text: 'Depression', code: 'F32.9' },
    ],
    functionalBaseline: 'Independent but socially vulnerable, occasionally misses appointments.',
    familyHistory: 'No significant family history recorded.',
    socialHistory: {
      alcohol: 'Minimal alcohol intake.',
      smoking: 'Smokes 15 cigarettes daily.',
      recreationalDrugs: 'Intermittent intravenous heroin use reported.',
      occupation: 'Unemployed.',
      homeEnvironment: 'Lives in temporary accommodation with limited support.',
    },
  },
  {
    presentingComplaint: 'Palpitations',
    historyPresentingComplaint: 'Sudden onset rapid heartbeat with light-headedness and mild breathlessness beginning one hour before arrival.',
    pastMedicalSurgicalHistory: [
      { text: 'Paroxysmal supraventricular tachycardia', code: 'I47.1' },
      { text: 'Asthma', code: 'J45.9' },
    ],
    functionalBaseline: 'Fit and active, independent with all activities.',
    familyHistory: 'No family history of sudden cardiac death.',
    socialHistory: {
      alcohol: 'Weekend binge drinking at times.',
      smoking: 'Never smoker.',
      recreationalDrugs: 'Occasional cocaine use disclosed.',
      occupation: 'Personal trainer.',
      homeEnvironment: 'Lives with friends, no care needs.',
    },
  },
  {
    presentingComplaint: 'Jaundice and abdominal distension',
    historyPresentingComplaint: 'Increasing abdominal swelling, jaundice, and ankle oedema over the last two weeks with reduced appetite and fatigue.',
    pastMedicalSurgicalHistory: [
      { text: 'Alcohol-related liver disease', code: 'K70.9' },
      { text: 'Oesophageal varices', code: 'I85.9' },
      { text: 'Hyponatraemia', code: 'E87.1' },
    ],
    functionalBaseline: 'Slow but independent indoors. Needs help with heavier household tasks.',
    familyHistory: 'No significant family history recorded.',
    socialHistory: {
      alcohol: 'Previously heavy alcohol intake, reports recent reduction.',
      smoking: 'Smokes 5 cigarettes daily.',
      recreationalDrugs: 'No recreational drug use.',
      occupation: 'Former decorator.',
      homeEnvironment: 'Lives with brother who helps with transport and appointments.',
    },
  },
  {
    presentingComplaint: 'Post-operative pain and hypotension',
    historyPresentingComplaint: 'Within hours of returning from theatre the patient developed increasing abdominal pain, tachycardia, and dizziness on sitting upright.',
    pastMedicalSurgicalHistory: [
      { text: 'Recent laparoscopic cholecystectomy', code: 'Z90.4' },
      { text: 'Gallstone pancreatitis', code: 'K85.1' },
    ],
    functionalBaseline: 'Normally independent and self-caring.',
    familyHistory: 'No significant family history recorded.',
    socialHistory: {
      alcohol: '2-3 units per week.',
      smoking: 'Never smoker.',
      recreationalDrugs: 'No recreational drug use.',
      occupation: 'Hairdresser.',
      homeEnvironment: 'Lives with spouse and two teenage children.',
    },
  },
  {
    presentingComplaint: 'Rash and facial swelling',
    historyPresentingComplaint: 'Rapid onset widespread rash, lip swelling, and throat tightness shortly after starting a new antibiotic earlier today.',
    pastMedicalSurgicalHistory: [
      { text: 'Asthma', code: 'J45.9' },
      { text: 'Seasonal allergic rhinitis', code: 'J30.2' },
    ],
    functionalBaseline: 'Independent with no mobility limitations.',
    familyHistory: 'Strong family history of atopy.',
    socialHistory: {
      alcohol: 'Occasional alcohol use.',
      smoking: 'Never smoker.',
      recreationalDrugs: 'None.',
      occupation: 'Dental nurse.',
      homeEnvironment: 'Lives with parents, no support needs.',
    },
  },
  {
    presentingComplaint: 'Painful swollen leg',
    historyPresentingComplaint: 'Two-day history of unilateral calf swelling, pain, and difficulty weight-bearing after a recent long-haul flight.',
    pastMedicalSurgicalHistory: [
      { text: 'Previous deep vein thrombosis', code: 'I82.4' },
      { text: 'Obesity', code: 'E66.9' },
      { text: 'Polycystic ovarian syndrome', code: 'E28.2' },
    ],
    functionalBaseline: 'Independent and working full time.',
    familyHistory: 'Mother had venous thromboembolism in her 40s.',
    socialHistory: {
      alcohol: '6 units weekly.',
      smoking: 'Never smoker.',
      recreationalDrugs: 'No recreational drug use.',
      occupation: 'Office manager.',
      homeEnvironment: 'Lives with partner, no care package.',
    },
  },
  {
    presentingComplaint: 'Low mood and overdose',
    historyPresentingComplaint: 'Presented after taking an intentional overdose of prescribed analgesia following several weeks of worsening low mood, insomnia, and hopelessness.',
    pastMedicalSurgicalHistory: [
      { text: 'Depressive disorder', code: 'F32.9' },
      { text: 'Chronic back pain', code: 'M54.5' },
    ],
    functionalBaseline: 'Independent with self-care but struggling to maintain work attendance.',
    familyHistory: 'Father had depression. No known family history of psychosis.',
    socialHistory: {
      alcohol: 'Increased recent alcohol intake to 20 units weekly.',
      smoking: 'Smokes 10 cigarettes daily.',
      recreationalDrugs: 'No recreational drug use reported.',
      occupation: 'Warehouse operative.',
      homeEnvironment: 'Lives alone, limited local support network.',
    },
  },
  {
    presentingComplaint: 'Fever and neutropenia concern',
    historyPresentingComplaint: 'Developed shaking chills and temperature at home on day seven after chemotherapy, with sore throat and profound fatigue.',
    pastMedicalSurgicalHistory: [
      { text: 'Breast cancer on chemotherapy', code: 'C50.9' },
      { text: 'Hypertension', code: 'I10' },
    ],
    functionalBaseline: 'Independent but fatigued following chemotherapy cycles.',
    familyHistory: 'Maternal aunt had breast cancer.',
    socialHistory: {
      alcohol: 'Rare alcohol use.',
      smoking: 'Never smoker.',
      recreationalDrugs: 'No recreational drug use.',
      occupation: 'Librarian.',
      homeEnvironment: 'Lives with spouse, good family support.',
    },
  },
  {
    presentingComplaint: 'Haematemesis',
    historyPresentingComplaint: 'Two episodes of vomiting fresh blood this morning preceded by melaena and dizziness over the last 24 hours.',
    pastMedicalSurgicalHistory: [
      { text: 'Peptic ulcer disease', code: 'K27.9' },
      { text: 'Atrial fibrillation', code: 'I48.9' },
      { text: 'Chronic obstructive pulmonary disease', code: 'J44.9' },
    ],
    functionalBaseline: 'Independent indoors, limited outdoors by breathlessness.',
    familyHistory: 'No significant family history recorded.',
    socialHistory: {
      alcohol: '14 units weekly.',
      smoking: 'Current smoker, 20 cigarettes daily.',
      recreationalDrugs: 'No recreational drug use.',
      occupation: 'Retired printer.',
      homeEnvironment: 'Lives with wife, manages own medicines.',
    },
  },
  {
    presentingComplaint: 'Painful red eye and visual disturbance',
    historyPresentingComplaint: 'Acute onset painful red eye with blurred vision and headache over several hours, not relieved by simple analgesia.',
    pastMedicalSurgicalHistory: [
      { text: 'Hypermetropia', code: 'H52.0' },
      { text: 'Hypertension', code: 'I10' },
    ],
    functionalBaseline: 'Independent and normally fit.',
    familyHistory: 'Mother had glaucoma.',
    socialHistory: {
      alcohol: '5 units weekly.',
      smoking: 'Never smoker.',
      recreationalDrugs: 'None.',
      occupation: 'Solicitor.',
      homeEnvironment: 'Lives with partner, no support needs.',
    },
  },
  {
    presentingComplaint: 'Pain crisis',
    historyPresentingComplaint: 'Generalised limb and back pain consistent with previous vaso-occlusive crises, worsening over the last twelve hours despite home analgesia.',
    pastMedicalSurgicalHistory: [
      { text: 'Sickle cell disease', code: 'D57.1' },
      { text: 'Gallstones', code: 'K80.2' },
    ],
    functionalBaseline: 'Independent with self-care and attends university.',
    familyHistory: 'Sibling also has sickle cell disease.',
    socialHistory: {
      alcohol: 'Does not drink alcohol.',
      smoking: 'Never smoker.',
      recreationalDrugs: 'No recreational drug use.',
      occupation: 'Student.',
      homeEnvironment: 'Lives in university accommodation during term time.',
    },
  },
];

const sampleWardRoundPlans = [
  'Treat as likely infective exacerbation with sepsis screen, oxygen titration, and early senior review.',
  'Treat reversible delirium causes, optimise hydration, and review antimicrobial coverage after cultures.',
  'Continue acute coronary syndrome pathway, repeat ECG/troponin, and monitor symptoms closely.',
  'Escalate analgesia, review fluid balance, and repeat senior abdominal examination later today.',
  'Optimise rate or rhythm control, correct electrolytes, and continue telemetry while symptoms settle.',
  'Complete VTE assessment, arrange definitive imaging, and start treatment-dose anticoagulation if appropriate.',
  'Review for fluid overload, continue strict input/output monitoring, and reassess diuretic response this afternoon.',
  'Request urgent specialty review, continue close neurological observations, and monitor for any deterioration.',
  'Treat as likely upper GI bleed, keep nil by mouth, and ensure haemodynamic monitoring with repeat bloods.',
  'Manage as possible neutropenic sepsis with immediate antibiotics, cultures, and oncology team input.',
  'Continue treatment for vaso-occlusive crisis with analgesia ladder, hydration, and regular reassessment.',
  'Review medication contributors to falls, perform lying and standing blood pressures, and involve therapy team.',
  'Monitor for allergic progression, continue airway assessment, and document the suspected trigger clearly.',
  'Reassess after initial resuscitation, trend inflammatory markers, and step down treatment once clinically improving.',
  'Optimise glucose control, continue ketone monitoring, and step down from variable rate insulin when safe.',
  'Continue heart failure management with daily weights, renal monitoring, and review of guideline-directed therapy.',
  'Arrange discharge planning early, identify current barriers, and confirm what clinical milestones are still outstanding.',
  'Discuss ceilings of care with the patient and family today, and ensure the agreed escalation plan is documented clearly.',
];

const createClinicalNoteId = () => `clinical-note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const createPrescriptionId = () => `prescription-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const buildSampleClinicalNote = (patient, caseNotes) => {
  const history = sampleHistoryScenarios.find((item) => item.presentingComplaint === caseNotes?.presentingComplaint) || sampleHistoryScenarios[0];
  const now = new Date();
  return {
    id: createClinicalNoteId(),
    noteType: 'wardRound',
    title: 'Initial ward round',
    authoredAt: now.toISOString(),
    location: patient?.wardName || patient?.stayType || 'Assessment area',
    author: 'Facilitator',
    content: '',
    sections: [
      { key: 'currentIssues', label: 'Current issues', value: history.presentingComplaint || 'Acute medical presentation under review.' },
      { key: 'examination', label: 'Examination / observations', value: 'Looks unwell but rousable. Peripheral perfusion acceptable. Ongoing respiratory/cardiac assessment required.' },
      { key: 'resultsReviewed', label: 'Results reviewed', value: 'Initial bloods and observations reviewed. Formal imaging/microbiology pending.' },
      { key: 'assessment', label: 'Assessment / impression', value: history.historyPresentingComplaint || 'Acute deterioration requiring inpatient assessment.' },
      { key: 'plan', label: 'Plan', value: sampleWardRoundPlans[Math.floor(Math.random() * sampleWardRoundPlans.length)] },
      { key: 'escalation', label: 'Escalation / ceiling of care', value: 'Discuss ceilings of treatment with patient / family if clinical condition worsens.' },
      { key: 'dischargeCriteria', label: 'Discharge criteria / estimated discharge', value: 'Home once clinically stable, eating and drinking, and no longer requiring acute intervention.' },
    ],
    signed: true,
    locked: true,
  };
};

const buildPrescriptionSchedule = (frequencyLabel) => {
  if (frequencyLabel === 'OD') return ['08:00'];
  if (frequencyLabel === 'BD') return ['08:00', '20:00'];
  if (frequencyLabel === 'TDS') return ['08:00', '14:00', '20:00'];
  if (frequencyLabel === 'QDS') return ['06:00', '12:00', '18:00', '22:00'];
  return [];
};

const buildSamplePrescriptions = (drugLibrary) => {
  const now = new Date();
  const startIso = now.toISOString();
  const catalog = Array.isArray(drugLibrary?.items) ? drugLibrary.items : [];
  const routeFallback = drugLibrary?.metadata?.routeOptions?.[0]?.label || 'Oral';

  const fallbackTemplates = [
    {
      drugName: 'Amoxicillin',
      strength: '500mg',
      form: 'Capsule',
      defaultDose: '500',
      unit: 'mg',
      defaultRoute: 'Oral',
      indication: 'Lower respiratory tract infection',
      frequency: 'TDS',
      whenRequired: false,
    },
    {
      drugName: 'Paracetamol',
      strength: '500mg',
      form: 'Tablet',
      defaultDose: '1',
      unit: 'g',
      defaultRoute: 'Oral',
      indication: 'Pain or pyrexia',
      frequency: 'When required',
      whenRequired: true,
      maxDose24h: '4',
    },
    {
      drugName: 'Salbutamol',
      strength: '100micrograms',
      form: 'Inhaler',
      defaultDose: '2',
      unit: 'puffs',
      defaultRoute: 'Inhalation',
      indication: 'Wheeze or shortness of breath',
      frequency: 'QDS',
      whenRequired: false,
    },
    {
      drugName: 'Ondansetron',
      strength: '4mg',
      form: 'Tablet',
      defaultDose: '4',
      unit: 'mg',
      defaultRoute: 'Oral',
      indication: 'Nausea or vomiting',
      frequency: 'BD',
      whenRequired: false,
    },
    {
      drugName: 'Enoxaparin',
      strength: '40mg',
      form: 'Injection',
      defaultDose: '40',
      unit: 'mg',
      defaultRoute: 'Subcutaneous',
      indication: 'VTE prophylaxis',
      frequency: 'OD',
      whenRequired: false,
    },
  ];

  const catalogByName = new Map(
    catalog.map((item) => [String(item?.drugName || '').trim().toLowerCase(), item]),
  );

  const chosenDrugs = fallbackTemplates.slice(0, 3).map((template) => {
    const matched = catalogByName.get(String(template.drugName || '').trim().toLowerCase());
    return matched ? { ...template, ...matched } : template;
  });

  const usedNames = new Set(chosenDrugs.map((item) => String(item?.drugName || '').trim().toLowerCase()).filter(Boolean));
  const extraCatalogDrugs = catalog
    .filter((item) => !usedNames.has(String(item?.drugName || '').trim().toLowerCase()))
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.max(0, 3 - chosenDrugs.length));

  const finalDrugs = [...chosenDrugs, ...extraCatalogDrugs].slice(0, 3);

  return finalDrugs.map((drug, index) => {
    const isPrn = Boolean(drug?.whenRequired) || String(drug?.frequency || '').toLowerCase() === 'when required';
    const frequency = drug?.frequency || (isPrn ? 'When required' : (index === 0 ? 'TDS' : index === 1 ? 'BD' : 'QDS'));
    const administrations = !isPrn ? [
      {
        adminDateTime: new Date(now.getTime() - ((index + 2) * 60 * 60 * 1000)).toLocaleString('en-GB'),
        administeredBy: 'Facilitator',
        adminNote: 'Administered during case build',
      },
    ] : [];

      return {
        id: createPrescriptionId(),
        drug: drug.drugName || 'Generated medicine',
        drugindex: String(drug.id || 'generated'),
        dose: `${drug.defaultDose || '1'}${drug.unit || ''}`,
      doseType: 'fixed',
      unit: drug.unit || '',
      route: drug.defaultRoute || routeFallback,
        form: drug.form || '',
        strength: drug.strength || '',
        frequency,
        scheduledTimes: isPrn ? [] : buildPrescriptionSchedule(frequency),
        start_date: startIso,
        indication: drug.indication || (index === 0 ? 'Suspected infection' : index === 1 ? 'Pain or pyrexia' : 'Respiratory symptoms'),
        whenRequired: isPrn,
        maxDose24h: isPrn ? (drug.maxDose24h || '4') : '',
        stat: false,
        status: 'active',
        prescriber: 'Facilitator',
        administrations,
      };
  });
};

const normalizeAuthoringDraft = (caseStudy) => {
  const draft = normalizeCaseStudy(caseStudy);
  return {
    ...createDraftCaseStudy(),
    ...draft,
    short_description: String(draft.short_description || '').trim(),
    case_notes: draft.case_notes && typeof draft.case_notes === 'object' ? draft.case_notes : {},
    case_notes_history: Array.isArray(draft.case_notes_history) ? draft.case_notes_history : [],
    patient: draft.patient && typeof draft.patient === 'object' ? draft.patient : {},
    allergies: Array.isArray(draft.allergies) ? draft.allergies : [],
  };
};

const stagePatchLabels = {
  case_notes: 'case notes',
  case_notes_history: 'case note history',
  prescriptionList: 'prescriptions',
  microbiology: 'microbiology',
  biochemistry: 'blood results',
  observations: 'observations',
  imaging: 'imaging',
  questions: 'questions',
  learningContent: 'learning content',
};

const getStagePatchSummary = (stage, index) => {
  if (index === 0) {
    return 'Base scenario shown when the case starts.';
  }

  const patch = stage?.patch || {};
  const labels = Object.entries(stagePatchLabels)
    .filter(([key]) => hasContent(patch[key]))
    .map(([_key, label]) => label);

  return labels.length ? `Changes: ${labels.join(', ')}.` : 'No stage-specific changes yet.';
};

const mapPatientDetailsProps = (patient = {}) => ({
  name: patient.fullName || patient.name || 'Generated patient',
  hospitalNo: patient.hospitalNumber || patient.hospitalNo || 'Not recorded',
  nhsNumber: patient.nhsNumber || 'Not recorded',
  dob: patient.dateOfBirth || patient.dob || 'Not recorded',
  weight: patient.weight || 'Not recorded',
  height: patient.height || 'Not recorded',
  stayType: patient.stayType || '',
  wardName: patient.wardName || 'Not recorded',
  weightRecordedAt: patient.weightRecordedAt || '',
  heightRecordedAt: patient.heightRecordedAt || '',
  measurementHistory: patient.measurementHistory || [],
  gender: patient.gender || 'Not recorded',
  address: patient.address || 'Not recorded',
  episodeStatus: patient.episodeStatus || 'active',
  admittedAt: patient.admittedAt || '',
  dischargedAt: patient.dischargedAt || '',
});

const defaultSetup = {
  caseName: '',
  description: '',
  gender: '',
  stayType: '',
  ageYears: '',
  weightKg: '',
  heightCm: '',
};

const extractNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const hasCompletePatientGenerationFields = (setupFields) => (
  Boolean(String(setupFields.gender || '').trim())
  && Boolean(String(setupFields.stayType || '').trim())
  && Boolean(String(setupFields.ageYears || '').trim())
  && Boolean(String(setupFields.weightKg || '').trim())
  && Boolean(String(setupFields.heightCm || '').trim())
);

const resolveGenerationSetup = (setupFields) => {
  return {
    gender: String(setupFields.gender || '').trim(),
    stayType: String(setupFields.stayType || '').trim(),
    ageYears: extractNumber(setupFields.ageYears, 0),
    weightKg: extractNumber(setupFields.weightKg, 0),
    heightCm: extractNumber(setupFields.heightCm, 0),
  };
};

const calculateBmi = (weightKg, heightCm) => {
  const weight = Number(weightKg);
  const heightMetres = Number(heightCm) / 100;
  if (!Number.isFinite(weight) || !Number.isFinite(heightMetres) || heightMetres <= 0) {
    return '';
  }
  return (weight / (heightMetres * heightMetres)).toFixed(1);
};

const formatIsoDateForInput = (value) => {
  if (!value) {
    return '';
  }

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  if (typeof value === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split('/');
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return parsed.toISOString().slice(0, 10);
};

const formatInputDateForDisplay = (value) => {
  if (!value) {
    return '';
  }

  const [year, month, day] = String(value).split('-');
  if (!year || !month || !day) {
    return value;
  }
  return `${day}/${month}/${year}`;
};

const emptyAllergyDraft = { drug: '', reaction: '' };
const URL_PATTERN = /(https?:\/\/[^\s]+)/g;
const generatedHistoryFieldKeys = [
  'presentingComplaint',
  'historyPresentingComplaint',
  'pastMedicalSurgicalHistory',
  'functionalBaseline',
  'familyHistory',
  'socialHistory',
];

const getAuthoringAllergyMode = (patient = {}, allergies = []) => {
  if (patient?.nkda) {
    return 'nkda';
  }

  if (Array.isArray(allergies) && allergies.length) {
    return 'allergies';
  }

  return 'not_recorded';
};

const renderLearningContentPreview = (content) => {
  const text = String(content || '');
  const lines = text.split('\n');

  return lines.map((line, lineIndex) => {
    const parts = line.split(URL_PATTERN);
    return (
      <p key={`facilitator-learning-line-${lineIndex}`} className="mb-3">
        {parts.map((part, partIndex) => {
          if (/^https?:\/\/\S+$/.test(part)) {
            return (
              <a
                key={`facilitator-learning-link-${lineIndex}-${partIndex}`}
                href={part}
                target="_blank"
                rel="noreferrer"
              >
                {part}
              </a>
            );
          }

          return (
            <React.Fragment key={`facilitator-learning-text-${lineIndex}-${partIndex}`}>
              {part}
            </React.Fragment>
          );
        })}
      </p>
    );
  });
};

const FacilitatorCaseAuthoringWorkspace = ({
  caseStudy,
  savedCaseStudy,
  caseMeta,
  drugLibrary,
  commonConditions,
  onChange,
  onSave,
  isSaving,
  onBack,
  onNotice,
  onTestDraft,
}) => {
  const draft = useMemo(() => normalizeAuthoringDraft(caseStudy), [caseStudy]);
  const lastSavedDraft = useMemo(() => normalizeAuthoringDraft(savedCaseStudy), [savedCaseStudy]);
  const [showSetupModal, setShowSetupModal] = useState(!draft.case_study_name);
  const [showGeneratedPatientPreview, setShowGeneratedPatientPreview] = useState(false);
  const [showQuestionEditor, setShowQuestionEditor] = useState(false);
  const [showPatientEditor, setShowPatientEditor] = useState(false);
  const [showAllergyEditor, setShowAllergyEditor] = useState(false);
  const [showLearningContentEditor, setShowLearningContentEditor] = useState(false);
  const [showMicrobiologyEditor, setShowMicrobiologyEditor] = useState(false);
  const [showImagingEditor, setShowImagingEditor] = useState(false);
  const [clinicalNotesLaunchRequest, setClinicalNotesLaunchRequest] = useState(null);
  const [activeAuthoringStageIndex, setActiveAuthoringStageIndex] = useState(0);
  const [setupFields, setSetupFields] = useState({
    ...defaultSetup,
    caseName: draft.case_study_name || '',
    description: draft.short_description || '',
  });
  const [patientEditorFields, setPatientEditorFields] = useState({
    fullName: '',
    hospitalNumber: '',
    nhsNumber: '',
    dateOfBirth: '',
    gender: '',
    stayType: 'Ward inpatient',
    wardName: '',
    address: '',
    admittedAt: '',
  });
  const [learningContentFields, setLearningContentFields] = useState({
    title: draft.learningContent?.title || '',
    body: draft.learningContent?.body || '',
  });
  const [allergyMode, setAllergyMode] = useState(getAuthoringAllergyMode(draft.patient, draft.allergies));
  const [allergyItems, setAllergyItems] = useState(Array.isArray(draft.allergies) ? draft.allergies : []);
  const [allergyDraft, setAllergyDraft] = useState(emptyAllergyDraft);
  const [generatedPatientPreview, setGeneratedPatientPreview] = useState(() => (
    draft.patient && typeof draft.patient === 'object' && Object.keys(draft.patient).length
      ? draft.patient
      : null
  ));
  const hasCompleteSetupPatientFields = useMemo(() => hasCompletePatientGenerationFields(setupFields), [setupFields]);
  const generatedBmi = useMemo(() => calculateBmi(setupFields.weightKg, setupFields.heightCm), [setupFields.weightKg, setupFields.heightCm]);
  const hasGeneratedPatient = Boolean(
    (draft.patient?.fullName || draft.patient?.name)
    && (draft.patient?.hospitalNumber || draft.patient?.hospitalNo)
  );
  const hasGeneratedPatientPreview = Boolean(generatedPatientPreview && showGeneratedPatientPreview);
  const hasRequiredSetupDetails = Boolean(setupFields.caseName.trim() && setupFields.description.trim());
  const canSaveSetupDetails = hasRequiredSetupDetails && (hasGeneratedPatient || (hasCompleteSetupPatientFields && hasGeneratedPatientPreview));
  const isEditingExisting = Boolean(draft.id);
  const hasUnsavedChanges = isEditingExisting && JSON.stringify(draft) !== JSON.stringify(lastSavedDraft);
  const isPublished = caseMeta?.status === 'live_classroom' || caseMeta?.status === 'self_paced' || Boolean(caseMeta?.studentAccessEnabled);
  const stageDraft = useMemo(() => (
    draft.isStagedLiveCase ? getCaseStudyForLiveStage(draft, activeAuthoringStageIndex) : draft
  ), [activeAuthoringStageIndex, draft]);
  const isEditingStageLayer = Boolean(draft.isStagedLiveCase && activeAuthoringStageIndex > 0);
  const previousStageDraft = useMemo(() => (
    draft.isStagedLiveCase && activeAuthoringStageIndex > 0
      ? getCaseStudyForLiveStage(draft, activeAuthoringStageIndex - 1)
      : stageDraft
  ), [activeAuthoringStageIndex, draft, stageDraft]);
  const activeAuthoringStage = (draft.liveStages || [])[activeAuthoringStageIndex] || null;
  const stageTriggerQuestions = previousStageDraft.questions || [];
  const activeStageTriggerQuestionMissing = Boolean(
    activeAuthoringStage?.trigger?.type === 'question'
    && !stageTriggerQuestions.some((question, index) => (
      String(question.questionNumber || index + 1) === String(activeAuthoringStage.trigger.questionNumber || '')
    ))
  );
  const authoringProgress = useMemo(() => getCaseStudyAuthoringProgress(stageDraft), [stageDraft]);

  useEffect(() => {
    setShowSetupModal(!draft.case_study_name);
  }, [draft.case_study_name]);

  useEffect(() => {
    if (showSetupModal) {
      setShowGeneratedPatientPreview(false);
    }
  }, [showSetupModal]);

  useEffect(() => {
    if (showSetupModal) {
      setShowGeneratedPatientPreview(false);
      setGeneratedPatientPreview(null);
    }
  }, [setupFields.gender, setupFields.stayType, setupFields.ageYears, setupFields.weightKg, setupFields.heightCm, showSetupModal]);

  useEffect(() => {
    setSetupFields((current) => ({
      ...current,
      caseName: draft.case_study_name || '',
      description: draft.short_description || '',
    }));
  }, [draft.case_study_name, draft.short_description]);

  useEffect(() => {
    const patient = draft.patient || {};
    setPatientEditorFields({
      fullName: patient.fullName || patient.name || '',
      hospitalNumber: patient.hospitalNumber || patient.hospitalNo || '',
      nhsNumber: patient.nhsNumber || '',
      dateOfBirth: formatIsoDateForInput(patient.dateOfBirth || patient.dob || ''),
      gender: patient.gender || '',
      stayType: patient.stayType || 'Ward inpatient',
      wardName: patient.wardName || '',
      address: patient.address || '',
      admittedAt: formatIsoDateForInput(patient.admittedAt || ''),
    });
  }, [draft.patient]);

  useEffect(() => {
    setLearningContentFields({
      title: draft.learningContent?.title || '',
      body: draft.learningContent?.body || '',
    });
  }, [draft.learningContent]);

  useEffect(() => {
    setAllergyMode(getAuthoringAllergyMode(draft.patient, draft.allergies));
    setAllergyItems(Array.isArray(draft.allergies) ? draft.allergies : []);
    setAllergyDraft(emptyAllergyDraft);
  }, [draft.patient, draft.allergies]);

  const closeSetupModal = () => {
    if (!draft.case_study_name) {
      onBack();
      return;
    }
    if (!hasGeneratedPatient) {
      return;
    }
    setShowSetupModal(false);
  };

  const updateDraft = (patch) => onChange({ ...draft, ...patch });

  const updateLiveStages = (liveStages, extraPatch = {}) => {
    const nextStages = Array.isArray(liveStages) ? liveStages : [];
    updateDraft({
      ...extraPatch,
      isStagedLiveCase: Boolean(nextStages.length),
      liveStages: nextStages,
      currentStageIndex: 0,
    });
    setActiveAuthoringStageIndex((current) => Math.min(current, Math.max(nextStages.length - 1, 0)));
  };

  const toggleStagedLiveCase = (enabled) => {
    if (!enabled) {
      updateLiveStages([], { isStagedLiveCase: false });
      setActiveAuthoringStageIndex(0);
      return;
    }

    const existingStages = Array.isArray(draft.liveStages) && draft.liveStages.length
      ? draft.liveStages
      : [
          createLiveStage(0, { title: 'Stage 1', patch: {} }),
          createLiveStage(1, { title: 'Stage 2', patch: {} }),
        ];
    updateLiveStages(existingStages, { isStagedLiveCase: true });
    setActiveAuthoringStageIndex(0);
  };

  const addLiveStage = () => {
    const existingStages = Array.isArray(draft.liveStages) ? draft.liveStages : [];
    const nextStages = [...existingStages, createLiveStage(existingStages.length)];
    updateLiveStages(nextStages, { isStagedLiveCase: true });
    setActiveAuthoringStageIndex(nextStages.length - 1);
  };

  const updateLiveStage = (stageIndex, patch) => {
    const nextStages = (draft.liveStages || []).map((stage, index) => (
      index === stageIndex ? { ...stage, ...patch } : stage
    ));
    updateLiveStages(nextStages, { isStagedLiveCase: true });
  };

  const moveLiveStage = (stageIndex, direction) => {
    const stages = [...(draft.liveStages || [])];
    const nextIndex = stageIndex + direction;
    if (stageIndex <= 0 || nextIndex <= 0 || nextIndex >= stages.length) {
      return;
    }

    const [stage] = stages.splice(stageIndex, 1);
    stages.splice(nextIndex, 0, stage);
    updateLiveStages(stages, { isStagedLiveCase: true });
    setActiveAuthoringStageIndex(nextIndex);
  };

  const deleteLiveStage = (stageIndex) => {
    if (stageIndex <= 0) {
      return;
    }

    const stages = (draft.liveStages || []).filter((_stage, index) => index !== stageIndex);
    updateLiveStages(stages, { isStagedLiveCase: true });
    setActiveAuthoringStageIndex(Math.max(0, Math.min(stageIndex - 1, stages.length - 1)));
  };

  const updateStageContent = (patch) => {
    if (!isEditingStageLayer) {
      updateDraft(patch);
      return;
    }

    const nextStages = (draft.liveStages || []).map((stage, index) => (
      index === activeAuthoringStageIndex
        ? {
            ...stage,
            patch: {
              ...(stage.patch || {}),
              ...patch,
            },
          }
        : stage
    ));
    updateLiveStages(nextStages, { isStagedLiveCase: true });
  };

  const generatePatientPreview = () => {
    if (!hasCompleteSetupPatientFields) {
      return;
    }
    setGeneratedPatientPreview(buildGeneratedPatient(resolveGenerationSetup(setupFields)));
    setShowGeneratedPatientPreview(true);
  };

  const applySetupDetails = () => {
    if (!canSaveSetupDetails) {
      return;
    }

    const patch = {
      case_study_name: setupFields.caseName.trim(),
      short_description: setupFields.description.trim(),
      case_instructions: setupFields.description.trim(),
    };

    if (hasGeneratedPatientPreview) {
      patch.patient = generatedPatientPreview;
    }

    updateDraft(patch);
    setShowSetupModal(false);
  };

  const updateCaseNotes = async (payload) => {
    const historyEntry = {
      timestamp: new Date().toISOString(),
      fieldKey: payload?.fieldKey || '',
      fieldLabel: payload?.fieldLabel || payload?.fieldKey || 'Case notes',
      previousValue: payload?.previousValue ?? null,
      nextValue: payload?.nextValue ?? null,
      actor: 'Facilitator',
      noteId: payload?.noteId,
    };
    updateStageContent({
      case_notes: payload?.caseNotes || {},
      case_notes_history: [...(stageDraft.case_notes_history || []), historyEntry],
    });
  };

  const updatePrescriptions = async (nextPrescriptions) => {
    updateStageContent({ prescriptionList: nextPrescriptions });
  };

  const saveMeasurements = async ({ weight, height }) => {
    const nextPatient = { ...(draft.patient || {}) };
    const recordedAt = new Date().toISOString();
    const history = Array.isArray(nextPatient.measurementHistory) ? [...nextPatient.measurementHistory] : [];

    history.push({
      id: `measurement-${Date.now()}`,
      weight: weight || String(nextPatient.weight || '').replace(/[^0-9.]/g, ''),
      height: height || String(nextPatient.height || '').replace(/[^0-9.]/g, ''),
      recordedAt,
    });

    if (weight) {
      nextPatient.weight = `${weight}kg`;
      nextPatient.weightRecordedAt = recordedAt;
    }

    if (height) {
      nextPatient.height = `${height}cm`;
      nextPatient.heightRecordedAt = recordedAt;
    }

    nextPatient.measurementHistory = history;
    updateDraft({ patient: nextPatient });
  };

  const deleteMeasurement = async (measurementId) => {
    const nextPatient = { ...(draft.patient || {}) };
    nextPatient.measurementHistory = (nextPatient.measurementHistory || []).filter((item) => item.id !== measurementId);
    updateDraft({ patient: nextPatient });
  };

  const savePatientDetails = () => {
    const nextPatient = {
      ...(draft.patient || {}),
      fullName: patientEditorFields.fullName.trim(),
      hospitalNumber: patientEditorFields.hospitalNumber.trim(),
      nhsNumber: patientEditorFields.nhsNumber.trim(),
      dateOfBirth: formatInputDateForDisplay(patientEditorFields.dateOfBirth),
      gender: patientEditorFields.gender || 'Not recorded',
      stayType: patientEditorFields.stayType || 'Ward inpatient',
      wardName: patientEditorFields.wardName.trim(),
      address: patientEditorFields.address.trim(),
    };

    if (patientEditorFields.admittedAt) {
      nextPatient.admittedAt = new Date(`${patientEditorFields.admittedAt}T09:00:00`).toISOString();
    }

    updateDraft({ patient: nextPatient });
    setShowPatientEditor(false);
  };

  const openAllergyEditor = () => {
    setAllergyMode(getAuthoringAllergyMode(draft.patient, draft.allergies));
    setAllergyItems(Array.isArray(draft.allergies) ? draft.allergies : []);
    setAllergyDraft(emptyAllergyDraft);
    setShowAllergyEditor(true);
  };

  const addAllergyItem = () => {
    const drug = String(allergyDraft.drug || '').trim();
    const reaction = String(allergyDraft.reaction || '').trim();

    if (!drug || !reaction) {
      return;
    }

    setAllergyItems((current) => [
      ...current,
      { drug, reaction },
    ]);
    setAllergyDraft(emptyAllergyDraft);
    setAllergyMode('allergies');
  };

  const saveAllergyDetails = () => {
    const nextPatient = { ...(draft.patient || {}) };

    if (allergyMode === 'nkda') {
      nextPatient.nkda = true;
      updateDraft({
        patient: nextPatient,
        allergies: [],
      });
      setShowAllergyEditor(false);
      return;
    }

    nextPatient.nkda = false;
    updateDraft({
      patient: nextPatient,
      allergies: allergyMode === 'allergies' ? allergyItems : [],
    });
    setShowAllergyEditor(false);
  };

  const saveLearningContent = () => {
    updateDraft({
      learningContent: {
        title: learningContentFields.title,
        body: learningContentFields.body,
      },
    });
    setShowLearningContentEditor(false);
    onNotice?.('Learning content has been saved.');
  };

  const saveBiochemistry = async (nextBiochemistry) => {
    updateStageContent({ biochemistry: nextBiochemistry });
  };

  const saveMicrobiology = (nextMicrobiology) => {
    updateStageContent({ microbiology: nextMicrobiology });
    setShowMicrobiologyEditor(false);
    onNotice?.('Microbiology results have been saved.');
  };

  const saveImages = (nextImages) => {
    updateStageContent({ imaging: nextImages });
    setShowImagingEditor(false);
    onNotice?.('Imaging has been saved.');
  };

  const saveObservations = async (nextObservations) => {
    updateStageContent({ observations: nextObservations });
  };

  const confirmOverwrite = (message) => window.confirm(message);

  const hasGeneratedHistoryContent = () => generatedHistoryFieldKeys.some((key) => hasContent(stageDraft.case_notes?.[key]));

  const hasGeneratedClinicalNotes = () => Array.isArray(stageDraft.case_notes?.notes) && stageDraft.case_notes.notes.length > 0;

  const hasGeneratedMedicationContent = () => Array.isArray(stageDraft.prescriptionList) && stageDraft.prescriptionList.length > 0;

  const hasGeneratedBloodContent = () => hasContent(stageDraft.biochemistry);

  const hasGeneratedObservationContent = () => hasContent(stageDraft.observations);

  const generateCaseNotesBundle = () => {
    if ((hasGeneratedHistoryContent() || hasGeneratedClinicalNotes()) && !confirmOverwrite('Case notes already contain content. Generate again and overwrite the current generated case notes?')) {
      return;
    }

    const scenario = sampleHistoryScenarios[Math.floor(Math.random() * sampleHistoryScenarios.length)];
    const note = buildSampleClinicalNote(stageDraft.patient || {}, {
      ...(stageDraft.case_notes || {}),
      ...scenario,
    });
    const currentNotes = stageDraft.case_notes && typeof stageDraft.case_notes === 'object' ? stageDraft.case_notes : {};

    updateStageContent({
      case_notes: {
        ...currentNotes,
        ...scenario,
        medicationHistory: currentNotes.medicationHistory || {},
        tasks: Array.isArray(currentNotes.tasks) ? currentNotes.tasks : [],
        notes: [note, ...(Array.isArray(currentNotes.notes) ? currentNotes.notes : [])],
      },
      case_notes_history: [
        ...(Array.isArray(stageDraft.case_notes_history) ? stageDraft.case_notes_history : []),
        {
          timestamp: new Date().toISOString(),
          fieldKey: 'clinicalNote',
          fieldLabel: 'Generated clinical note',
          previousValue: null,
          nextValue: note,
          actor: 'Facilitator',
          noteId: note.id,
        },
      ],
    });
    onNotice?.('Case notes have been generated.');
  };

  const generateMedicationChart = () => {
    if (hasGeneratedMedicationContent() && !confirmOverwrite('Prescribing already contains medication entries. Generate again and overwrite the current medication chart?')) {
      return;
    }

    updateStageContent({
      prescriptionList: buildSamplePrescriptions(drugLibrary),
    });
    onNotice?.('Medication chart has been generated.');
  };

  const generateBloodValues = () => {
    if (hasGeneratedBloodContent() && !confirmOverwrite('Blood values are already populated. Generate again and overwrite the current blood results?')) {
      return;
    }

    updateStageContent({ biochemistry: buildSampleBiochemistry() });
    onNotice?.('Blood values have been generated.');
  };

  const generateObservationValues = () => {
    if (hasGeneratedObservationContent() && !confirmOverwrite('Observations are already populated. Generate again and overwrite the current observations?')) {
      return;
    }

    updateStageContent({ observations: buildSampleObservations() });
    onNotice?.('Observations have been generated.');
  };

  const generateMicrobiologyValues = () => {
    if (hasContent(stageDraft.microbiology) && !confirmOverwrite('Microbiology results are already populated. Generate again and overwrite the current microbiology results?')) {
      return;
    }

    updateStageContent({ microbiology: buildSampleMicrobiology() });
    onNotice?.('Microbiology cultures have been generated.');
  };

  const handleAuthoringProgressAction = (itemKey) => {
    if (itemKey === 'patient') {
      setShowPatientEditor(true);
      return;
    }

    if (itemKey === 'questions') {
      setShowQuestionEditor(true);
      return;
    }

    if (itemKey === 'case-notes') {
      generateCaseNotesBundle();
      return;
    }

    if (itemKey === 'learning-content') {
      setShowLearningContentEditor(true);
      return;
    }

    if (itemKey === 'prescribing') {
      generateMedicationChart();
      return;
    }

    if (itemKey === 'bloods') {
      generateBloodValues();
      return;
    }

    if (itemKey === 'observations') {
      generateObservationValues();
      return;
    }

    if (itemKey === 'microbiology') {
      setShowMicrobiologyEditor(true);
      return;
    }

    if (itemKey === 'imaging') {
      setShowImagingEditor(true);
    }
  };

  const isAuthoringProgressActionable = (itemKey) => (
    ['patient', 'questions', 'case-notes', 'learning-content', 'prescribing', 'bloods', 'observations', 'microbiology', 'imaging'].includes(itemKey)
  );

  const saveDraft = async () => {
    await onSave(draft);
  };

  const patientDetails = mapPatientDetailsProps(stageDraft.patient);
  const displayedAllergies = draft.patient?.nkda
    ? [{ drug: 'NKDA', reaction: 'No known drug allergies' }]
    : (draft.allergies || []);
  const progressDetailLookup = {
    patient: { actionLabel: 'Edit', detail: 'Demographics and admission details.' },
    questions: { actionLabel: stageDraft.questions?.length ? 'Edit' : 'Add', detail: 'Assessment questions for learners.' },
    'case-notes': { actionLabel: 'Generate History, notes, and clinical context', detail: 'History, notes, and clinical context.' },
    'learning-content': { actionLabel: stageDraft.learningContent?.body ? 'Edit' : 'Add', detail: 'Pre-reading or supporting material.' },
    prescribing: { actionLabel: 'Generate Prescriptions', detail: 'Initial medication chart.' },
    bloods: { actionLabel: 'Generate Random Blood Values', detail: 'Biochemistry and blood results.' },
    observations: { actionLabel: 'Generate Random Observations', detail: 'Vital signs time series.' },
    imaging: { actionLabel: stageDraft.imaging?.length ? 'Edit' : 'Add', detail: 'Optional uploaded images.' },
    microbiology: { actionLabel: stageDraft.microbiology?.length ? 'Edit' : 'Add', detail: 'Optional microbiology results.' },
  };
  const progressRows = authoringProgress.map((item) => ({
    ...item,
    ...(progressDetailLookup[item.key] || { actionLabel: '', detail: '' }),
    statusLabel: item.complete ? 'Complete' : item.required ? 'Required' : 'Optional',
  }));

  return (
    <>
      <div className="student-page">
         {hasUnsavedChanges ? (

                <div class="facilitator-save-bar">
                  <p>Changes have been made</p>
                  <Button class="facilitator-save-buttonr" variant="danger" onClick={saveDraft}>
                    Save changes
                  </Button>
                </div>
              ) : null}
        <Container className="mt-4 mb-5 student-page__content">
          <div className="student-dashboard-shell">
            <div className="student-dashboard-header">
             
              {isPublished && hasUnsavedChanges ? (
                <Alert variant="warning" className="mb-3">
                  This case has a published version. Save your edits here, then manage student availability from View and share case studies.
                </Alert>
              ) : null}
              <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                <div>
                  <h2 className="mb-2">{draft.case_study_name || 'Create new case study'}</h2>
                  <p className="student-dashboard-header__copy mb-1">
                    {draft.short_description || 'Start from a generated patient record and build the case in the same style learners will use.'}
                  </p>
                  <div className="small text-white">
                    Authoring workspace. Save changes here; publish and live classroom controls live in View and share case studies.
                  </div>
                  
                  <Button type="button" variant="outline-light" className="btn-sm mt-2" onClick={onBack}>
                    <i className="bi bi-arrow-left" />{' '}
                    Back
                  </Button>
                </div>
         
                </div>
              </div>

            <div className="student-dashboard-section-actions">

              <Button type="button" variant="outline-primary" onClick={() => setShowSetupModal(true)}>
                Edit Case Study and Patient Details
              </Button> {' '}
              <div className="float-end">
                <Button type="button" variant="outline-primary" className="me-2" onClick={() => onTestDraft?.(draft)} disabled={!draft.case_study_name}>
                  Test case study
                </Button>
                <Button type="button" variant="primary" onClick={saveDraft} disabled={isSaving || !draft.case_study_name}>
                    {isSaving ? 'Saving...' : 'Save changes'}
                </Button>
              </div>

            </div>
            

            <div className="student-dashboard-section">
              <div className="student-dashboard-section__header">
                <h4 className="mb-1">Case Study Generation</h4>
                <p className="student-dashboard-header__copy mb-0">
                  Click the generate buttons to create content quickly or edit content directly in the patient record workspace.
                </p>
              </div>
              <div className="mb-3 border rounded p-3">
                <h5>Student Interaction</h5>
                <Form.Check
                  type="switch"
                  id="allow-student-edits"
                  label="Allow students to interact with and edit the patient record and prescribing chart"
                  checked={Boolean(draft.allowStudentEdits)}
                  onChange={(event) => updateDraft({ allowStudentEdits: event.target.checked })}
                />
                <Form.Check
                  type="switch"
                  id="allow-multiple-attempts"
                  className="mt-2"
                  label="Allow students to make multiple attempts at this case study"
                  checked={Boolean(draft.allowMultipleAttempts)}
                  onChange={(event) => updateDraft({ allowMultipleAttempts: event.target.checked })}
                />
                <div className="small text-muted mt-1">
                  Leave this off when each student should only complete the case once.
                </div>
                <Form.Check
                  type="switch"
                  id="build-staged-live-case"
                  className="mt-3"
                  label="Build this as a staged case study"
                  checked={Boolean(draft.isStagedLiveCase)}
                  onChange={(event) => toggleStagedLiveCase(event.target.checked)}
                />
                {draft.isStagedLiveCase ? (
                  <div className="mt-3 border rounded p-3 bg-light">
                    <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap">
                      <div>
                        <div className="fw-semibold">Case study stages</div>
                        <div className="small text-muted">
                          Question-triggered stages can be published as normal case studies. Manual stage controls are for live classroom sessions.
                        </div>
                      </div>
                      <Button type="button" size="sm" variant="outline-primary" onClick={addLiveStage}>
                        Start creating next stage
                      </Button>
                    </div>
                    <div className="facilitator-live-stage-list mt-3">
                      {(draft.liveStages || []).map((stage, index) => (
                        <div
                          key={stage.id || index}
                          className={`facilitator-live-stage-item${activeAuthoringStageIndex === index ? ' facilitator-live-stage-item--active' : ''}`}
                        >
                          <Button
                            type="button"
                            size="sm"
                            variant={activeAuthoringStageIndex === index ? 'primary' : 'outline-primary'}
                            onClick={() => setActiveAuthoringStageIndex(index)}
                          >
                            {stage.title || `Stage ${index + 1}`}
                          </Button>
                          <span>{getStagePatchSummary(stage, index)}</span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline-secondary"
                            disabled={index <= 1}
                            onClick={() => moveLiveStage(index, -1)}
                          >
                            Up
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline-secondary"
                            disabled={index === 0 || index >= (draft.liveStages || []).length - 1}
                            onClick={() => moveLiveStage(index, 1)}
                          >
                            Down
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline-danger"
                            disabled={index === 0}
                            onClick={() => deleteLiveStage(index)}
                          >
                            Delete
                          </Button>
                        </div>
                      ))}
                    </div>
                    {(draft.liveStages || [])[activeAuthoringStageIndex] ? (
                      <Row className="g-3 mt-1">
                        <Col md={4}>
                          <Form.Group controlId="liveStageTitle">
                            <Form.Label>Stage title</Form.Label>
                            <Form.Control
                              type="text"
                              value={(draft.liveStages || [])[activeAuthoringStageIndex]?.title || ''}
                              onChange={(event) => updateLiveStage(activeAuthoringStageIndex, { title: event.target.value })}
                            />
                          </Form.Group>
                        </Col>
                        <Col md={4}>
                          <Form.Group controlId="liveStageTrigger">
                            <Form.Label>Stage trigger</Form.Label>
                            <Form.Select
                              value={(draft.liveStages || [])[activeAuthoringStageIndex]?.trigger?.type || 'manual'}
                              onChange={(event) => updateLiveStage(activeAuthoringStageIndex, {
                                trigger: {
                                  ...((draft.liveStages || [])[activeAuthoringStageIndex]?.trigger || {}),
                                  type: event.target.value,
                                  questionNumber: event.target.value === 'question'
                                    ? ((draft.liveStages || [])[activeAuthoringStageIndex]?.trigger?.questionNumber || '')
                                    : '',
                                },
                              })}
                            >
                              <option value="manual">Facilitator advances manually in live classroom</option>
                              <option value="question" disabled={activeAuthoringStageIndex === 0}>After a question is answered</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        {(draft.liveStages || [])[activeAuthoringStageIndex]?.trigger?.type === 'question' ? (
                          <Col md={4}>
                            <Form.Group controlId="liveStageQuestionTrigger">
                              <Form.Label>Question trigger</Form.Label>
                              <Form.Select
                                value={(draft.liveStages || [])[activeAuthoringStageIndex]?.trigger?.questionNumber || ''}
                                onChange={(event) => updateLiveStage(activeAuthoringStageIndex, {
                                  trigger: {
                                    ...((draft.liveStages || [])[activeAuthoringStageIndex]?.trigger || {}),
                                    questionNumber: event.target.value,
                                  },
                                })}
                              >
                                <option value="">Choose question</option>
                                {stageTriggerQuestions.map((question, index) => (
                                  <option key={question.questionNumber || index} value={question.questionNumber || index + 1}>
                                    Question {question.questionNumber || index + 1}
                                  </option>
                                ))}
                              </Form.Select>
                              <Form.Text className="text-muted">
                                This must be a question students can answer before this stage is shown.
                              </Form.Text>
                            </Form.Group>
                          </Col>
                        ) : null}
                        <Col xs={12}>
                          <Alert variant={isEditingStageLayer ? 'info' : 'secondary'} className="mb-0">
                            {isEditingStageLayer
                              ? `You are editing the layer for ${activeAuthoringStage?.title || `Stage ${activeAuthoringStageIndex + 1}`}. Changes below will appear when this stage is active.`
                              : 'You are editing the base scenario shown at the start of the case.'}
                          </Alert>
                          {activeStageTriggerQuestionMissing ? (
                            <Alert variant="warning" className="mt-2 mb-0">
                              Choose a trigger question from the previous stage, or set this stage to manual advancement.
                            </Alert>
                          ) : null}
                        </Col>
                      </Row>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="mt-3">
                <div className="facilitator-authoring-progress">
                  <div className="facilitator-authoring-progress__header">
                    <div>
                      <h5 className="mb-1">Progress so far</h5>
                      <p className="student-dashboard-header__copy mb-0">
                        Review each section, then use the action column to edit or generate content where available.
                      </p>
                    </div>
                    <div className="facilitator-authoring-progress__summary">
                      {authoringProgress.filter((item) => item.complete).length}/{authoringProgress.length} complete
                    </div>
                  </div>
                  <div className="facilitator-authoring-progress__table" role="table" aria-label="Case study authoring progress">
                    <div className="facilitator-authoring-progress__row facilitator-authoring-progress__row--head" role="row">
                      <div role="columnheader">Section</div>
                      <div role="columnheader">Status</div>
                      <div role="columnheader">Action</div>
                    </div>
                    {progressRows.map((item) => {
                      const actionable = isAuthoringProgressActionable(item.key);
                      return (
                        <div className="facilitator-authoring-progress__row" role="row" key={item.key}>
                          <div role="cell">
                            <strong>{item.label}</strong>
                            {item.detail ? <span>{item.detail}</span> : null}
                          </div>
                          <div role="cell">
                            <span className={`facilitator-authoring-progress__status ${item.complete ? 'facilitator-authoring-progress__status--complete' : item.required ? 'facilitator-authoring-progress__status--required' : ''}`}>
                              {item.statusLabel}
                            </span>
                          </div>
                          <div role="cell">
                            {actionable ? (
                              <Button
                                type="button"
                                size="sm"
                                variant={item.complete ? 'outline-primary' : item.required ? 'warning' : 'outline-secondary'}
                                onClick={() => handleAuthoringProgressAction(item.key)}
                              >
                                {item.actionLabel || 'Open'}
                              </Button>
                            ) : (
                              <span className="text-muted small">Edit below</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
              </div>
            </div>

            {!draft.case_study_name || !hasGeneratedPatient ? (
              <Alert variant="info" className="mb-0">Confirm the case name and description to start building the patient scenario.</Alert>
            ) : (
              <>
                <div className="student-dashboard-section mt-3">
                  <div className="student-dashboard-section__header">
                    <h4 className="mb-1">Learning content</h4>
                    <p className="student-dashboard-header__copy mb-0">
                      {draft.learningContent?.body
                        ? 'Students will see this in a modal before they start working through the case.'
                        : 'No learning content added yet.'}
                    </p>
                  </div>
                  {stageDraft.learningContent?.body ? (
                    <Alert variant="light" className="mt-3 mb-0">
                      <strong>{stageDraft.learningContent?.title || 'Learning content'}</strong>
                      <div className="mt-2 learning-content-preview">{renderLearningContentPreview(stageDraft.learningContent?.body)}</div>
                    </Alert>
                  ) : null}
                </div>

                <div className="facilitator-authoring-band">
                  <div className="facilitator-authoring-toolbar">
                    <div>
                      <h4 className="mb-1">Patient details</h4>
                      <p className="student-dashboard-header__copy mb-0">
                        Edit the generated demographics before building the rest of the patient story.
                      </p>
                    </div>
                    <div className="d-flex gap-2 flex-wrap">
                      <Button type="button" variant="primary" onClick={() => setShowPatientEditor(true)}>
                        Edit patient details
                      </Button>
                    </div>
                  </div>
                  <PatientDetails
                    patient={patientDetails}
                    allergies={displayedAllergies}
                    allergyHistory={[]}
                    medicationHistory={stageDraft.case_notes?.medicationHistory || {}}
                    vteAssessment={stageDraft.case_notes?.vteAssessment || {}}
                    onOpenAllergyManagement={openAllergyEditor}
                    onOpenVteAssessment={() => setClinicalNotesLaunchRequest({ templateKey: 'vteAssessment', nonce: Date.now() })}
                    onSaveMeasurements={saveMeasurements}
                    onDeleteMeasurement={deleteMeasurement}
                  />
                </div>

                <div className="facilitator-authoring-band mt-2">
                  <PatientRecordsContainer
                    patient_records={{
                      case_notes: stageDraft.case_notes || {},
                      case_notes_history: stageDraft.case_notes_history || [],
                      biochemistry: stageDraft.biochemistry || {},
                      microbiology: stageDraft.microbiology || [],
                      observations: stageDraft.observations || {},
                      imaging: stageDraft.imaging || [],
                    }}
                    prescriptions={stageDraft.prescriptionList || []}
                    commonConditions={commonConditions}
                    drugLibrary={drugLibrary}
                    defaultAuthor="Facilitator"
                    onSaveCaseNotes={updateCaseNotes}
                    onSaveBiochemistry={saveBiochemistry}
                    onSaveObservations={saveObservations}
                    launchClinicalNoteTemplateRequest={clinicalNotesLaunchRequest}
                  />
                </div>

                <div className="facilitator-authoring-band mt-3">
                  <Prescription
                    prescriptions={stageDraft.prescriptionList || []}
                    prescribingStatus
                    drugLibrary={drugLibrary}
                    patient={stageDraft.patient || {}}
                    allergies={stageDraft.allergies || []}
                    caseNotes={stageDraft.case_notes || {}}
                    onChange={updatePrescriptions}
                    onSaveCaseNotes={updateCaseNotes}
                    onApprovalToast={() => {}}
                    onBlockedPrescribe={() => {}}
                    administratorName="Facilitator"
                    prescriberName="Facilitator"
                    allowPrescribeWithoutAllergyStatus
                    allowHistoricalAdministrations
                    allowPrescriptionRemoval
                  />
                </div>

                <div className="student-dashboard-section mt-3">
                  <div className="student-dashboard-section__header">
                    <h4 className="mb-1">Question set</h4>
                    <p className="student-dashboard-header__copy mb-0">
                      {stageDraft.questions?.length
                        ? `${stageDraft.questions.length} question${stageDraft.questions.length === 1 ? '' : 's'} added so far.`
                        : 'No questions added yet. Open the question editor to start building the assessment.'}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </Container>
      </div>

      <Modal show={showSetupModal} onHide={closeSetupModal}>
        <Modal.Header closeButton>
          <Modal.Title>Set up a new case study</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3" controlId="facilitatorCaseName">
              <Form.Label>
                <strong>Case study name</strong>
              </Form.Label>
              <Form.Control
                type="text"
                value={setupFields.caseName}
                onChange={(event) => setSetupFields((current) => ({ ...current, caseName: event.target.value }))}
                placeholder="e.g. Acute kidney injury on admission"
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="facilitatorCaseDescription">
              <Form.Label>
                <strong>Brief description</strong>
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={setupFields.description}
                onChange={(event) => setSetupFields((current) => ({ ...current, description: event.target.value }))}
                placeholder="A short summary of the case and how it will be used"
              />
            </Form.Group>
            <Row className="g-3">
                <Col md={12}>
                  <p>Enter the details of the patient you wish to include in your case study. This can be edited afterwards in the case study itself</p>
                </Col>
            </Row>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group controlId="facilitatorCaseGender">
                  <Form.Label>Gender</Form.Label>
                  <Form.Select value={setupFields.gender} onChange={(event) => setSetupFields((current) => ({ ...current, gender: event.target.value }))}>
                    <option value="">Select Gender</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="facilitatorCaseStayType">
                  <Form.Label>Patient location</Form.Label>
                  <Form.Select value={setupFields.stayType} onChange={(event) => setSetupFields((current) => ({ ...current, stayType: event.target.value }))}>
                    <option value="">Select Location</option>
                    <option value="A/E">A/E</option>
                    <option value="Ward inpatient">Ward inpatient</option>
                    <option value="Daycase">Daycase</option>
                    <option value="Theatre">Theatre</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group controlId="facilitatorCaseAge">
                  <Form.Label>Approximate age</Form.Label>
                  <Form.Control type="number" min="18" max="95" value={setupFields.ageYears} onChange={(event) => setSetupFields((current) => ({ ...current, ageYears: event.target.value }))} placeholder="Age" />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group controlId="facilitatorCaseWeight">
                  <Form.Label>Weight (kg)</Form.Label>
                  <Form.Control type="number" min="35" max="180" value={setupFields.weightKg} onChange={(event) => setSetupFields((current) => ({ ...current, weightKg: event.target.value }))} placeholder="Weight" />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group controlId="facilitatorCaseHeight">
                  <Form.Label>Height (cm)</Form.Label>
                  <Form.Control type="number" min="120" max="220" value={setupFields.heightCm} onChange={(event) => setSetupFields((current) => ({ ...current, heightCm: event.target.value }))} placeholder="Height" />
                </Form.Group>
              </Col>
            </Row>
            {generatedBmi ? (
              <div className="small text-muted mt-3">Calculated BMI: {generatedBmi}</div>
            ) : null}
            <div className="d-flex gap-2 flex-wrap mt-3">
              <Button
                type="button"
                variant="primary"
                onClick={generatePatientPreview}
                disabled={!setupFields.caseName.trim() || !setupFields.description.trim() || !hasCompleteSetupPatientFields}
              >
                Generate patient
              </Button>
            </div>
            {!hasCompleteSetupPatientFields ? (
              <Alert variant="warning" className="mt-3 mb-0">
                Complete gender, location, age, weight, and height before generating the patient.
              </Alert>
            ) : null}
            {showGeneratedPatientPreview && generatedPatientPreview ? (
              <Alert variant="info" className="mt-3 mb-0">
                <strong>Patient details</strong>
                <div className="mt-2">{generatedPatientPreview.fullName}</div>
                <div>{generatedPatientPreview.dateOfBirth}</div>
                <div>{generatedPatientPreview.address}</div>
                <div>{generatedPatientPreview.stayType} | {generatedPatientPreview.wardName}</div>
                <div>{generatedPatientPreview.gender} | {generatedPatientPreview.weight} | {generatedPatientPreview.height}{generatedBmi ? ` | BMI ${generatedBmi}` : ''}</div>
              </Alert>
            ) : null}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="outline-secondary" onClick={closeSetupModal}>Cancel</Button>
          <Button type="button" onClick={applySetupDetails} disabled={!canSaveSetupDetails}>
            {hasGeneratedPatient && !hasGeneratedPatientPreview ? 'Save details' : 'Confirm and create'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showPatientEditor} onHide={() => setShowPatientEditor(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit patient details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group controlId="facilitatorPatientFullName">
                  <Form.Label>Patient name</Form.Label>
                  <Form.Control
                    type="text"
                    value={patientEditorFields.fullName}
                    onChange={(event) => setPatientEditorFields((current) => ({ ...current, fullName: event.target.value }))}
                    placeholder="e.g. Jane Smith"
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group controlId="facilitatorPatientHospitalNumber">
                  <Form.Label>Hospital number</Form.Label>
                  <Form.Control
                    type="text"
                    value={patientEditorFields.hospitalNumber}
                    onChange={(event) => setPatientEditorFields((current) => ({ ...current, hospitalNumber: event.target.value }))}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group controlId="facilitatorPatientNhsNumber">
                  <Form.Label>NHS number</Form.Label>
                  <Form.Control
                    type="text"
                    value={patientEditorFields.nhsNumber}
                    onChange={(event) => setPatientEditorFields((current) => ({ ...current, nhsNumber: event.target.value }))}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group controlId="facilitatorPatientDob">
                  <Form.Label>Date of birth</Form.Label>
                  <Form.Control
                    type="date"
                    value={patientEditorFields.dateOfBirth}
                    onChange={(event) => setPatientEditorFields((current) => ({ ...current, dateOfBirth: event.target.value }))}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group controlId="facilitatorPatientGender">
                  <Form.Label>Gender</Form.Label>
                  <Form.Select
                    value={patientEditorFields.gender}
                    onChange={(event) => setPatientEditorFields((current) => ({ ...current, gender: event.target.value }))}
                  >
                    <option value="">Select gender</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group controlId="facilitatorPatientAdmittedAt">
                  <Form.Label>Admit date</Form.Label>
                  <Form.Control
                    type="date"
                    value={patientEditorFields.admittedAt}
                    onChange={(event) => setPatientEditorFields((current) => ({ ...current, admittedAt: event.target.value }))}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="facilitatorPatientStayType">
                  <Form.Label>Care setting</Form.Label>
                  <Form.Select
                    value={patientEditorFields.stayType}
                    onChange={(event) => setPatientEditorFields((current) => ({
                      ...current,
                      stayType: event.target.value,
                      wardName: current.wardName || buildRandomWardName(event.target.value),
                    }))}
                  >
                    <option value="Ward inpatient">Ward inpatient</option>
                    <option value="A/E">A/E</option>
                    <option value="Daycase">Daycase</option>
                    <option value="Theatre">Theatre</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="facilitatorPatientWardName">
                  <Form.Label>Ward / location</Form.Label>
                  <Form.Control
                    type="text"
                    value={patientEditorFields.wardName}
                    onChange={(event) => setPatientEditorFields((current) => ({ ...current, wardName: event.target.value }))}
                    placeholder="e.g. Cedar Ward"
                  />
                </Form.Group>
              </Col>
              <Col xs={12}>
                <Form.Group controlId="facilitatorPatientAddress">
                  <Form.Label>Address</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={patientEditorFields.address}
                    onChange={(event) => setPatientEditorFields((current) => ({ ...current, address: event.target.value }))}
                    placeholder="e.g. 10 Market Street, Manchester"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={() => setShowPatientEditor(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={savePatientDetails}
            disabled={!patientEditorFields.fullName.trim() || !patientEditorFields.hospitalNumber.trim()}
          >
            Save patient details
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showAllergyEditor} onHide={() => setShowAllergyEditor(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit allergy status</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group controlId="facilitatorAllergyMode">
              <Form.Label>Allergy status</Form.Label>
              <div className="d-flex gap-3 flex-wrap mt-2">
                <Form.Check
                  type="radio"
                  id="facilitator-allergy-not-recorded"
                  name="facilitator-allergy-status"
                  label="Not recorded"
                  checked={allergyMode === 'not_recorded'}
                  onChange={() => setAllergyMode('not_recorded')}
                />
                <Form.Check
                  type="radio"
                  id="facilitator-allergy-nkda"
                  name="facilitator-allergy-status"
                  label="NKDA"
                  checked={allergyMode === 'nkda'}
                  onChange={() => setAllergyMode('nkda')}
                />
                <Form.Check
                  type="radio"
                  id="facilitator-allergy-recorded"
                  name="facilitator-allergy-status"
                  label="Recorded allergies"
                  checked={allergyMode === 'allergies'}
                  onChange={() => setAllergyMode('allergies')}
                />
              </div>
            </Form.Group>

            {allergyMode === 'not_recorded' ? (
              <Alert variant="secondary" className="mt-3 mb-0">
                Students will see allergy status as not recorded.
              </Alert>
            ) : null}

            {allergyMode === 'nkda' ? (
              <Alert variant="success" className="mt-3 mb-0">
                Students will see this patient as having no known drug allergies.
              </Alert>
            ) : null}

            {allergyMode === 'allergies' ? (
              <>
                <Alert variant="info" className="mt-3">
                  Add one or more allergies and the associated reaction.
                </Alert>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group controlId="facilitatorAllergyDrug">
                      <Form.Label>Allergen</Form.Label>
                      <Form.Control
                        type="text"
                        value={allergyDraft.drug}
                        onChange={(event) => setAllergyDraft((current) => ({ ...current, drug: event.target.value }))}
                        placeholder="e.g. Penicillin"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group controlId="facilitatorAllergyReaction">
                      <Form.Label>Reaction</Form.Label>
                      <Form.Control
                        type="text"
                        value={allergyDraft.reaction}
                        onChange={(event) => setAllergyDraft((current) => ({ ...current, reaction: event.target.value }))}
                        placeholder="e.g. Rash"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <div className="d-flex gap-2 flex-wrap mt-3">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={addAllergyItem}
                    disabled={!String(allergyDraft.drug || '').trim() || !String(allergyDraft.reaction || '').trim()}
                  >
                    Add allergy
                  </Button>
                </div>
                {allergyItems.length ? (
                  <div className="mt-3">
                    {allergyItems.map((item, index) => (
                      <div
                        key={`${item.drug}-${item.reaction}-${index}`}
                        className="d-flex justify-content-between align-items-center border rounded px-3 py-2 mt-2 gap-3 flex-wrap"
                      >
                        <div>
                          <strong>{item.drug}</strong>
                          <div className="small text-muted">{item.reaction}</div>
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setAllergyItems((current) => current.filter((_item, itemIndex) => itemIndex !== index))}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Alert variant="warning" className="mt-3 mb-0">
                    Add at least one allergy before saving this status.
                  </Alert>
                )}
              </>
            ) : null}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={() => setShowAllergyEditor(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={saveAllergyDetails}
            disabled={allergyMode === 'allergies' && !allergyItems.length}
          >
            Save allergy status
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showLearningContentEditor} onHide={() => setShowLearningContentEditor(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Learning content</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3" controlId="facilitatorLearningContentTitle">
              <Form.Label>Modal title</Form.Label>
              <Form.Control
                type="text"
                value={learningContentFields.title}
                onChange={(event) => setLearningContentFields((current) => ({ ...current, title: event.target.value }))}
                placeholder="e.g. Background reading"
              />
            </Form.Group>
            <Form.Group controlId="facilitatorLearningContentBody">
              <Form.Label>Learning content</Form.Label>
              <Form.Text className="text-muted d-block mb-2">
                Paste full links such as https://example.com and they will display as clickable hyperlinks.
              </Form.Text>
              <Form.Control
                as="textarea"
                rows={10}
                value={learningContentFields.body}
                onChange={(event) => setLearningContentFields((current) => ({ ...current, body: event.target.value }))}
                placeholder="Add a synopsis, learning points, or background information for students to read before they begin the case."
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={() => setShowLearningContentEditor(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={saveLearningContent}>
            Save learning content
          </Button>
        </Modal.Footer>
      </Modal>

      <Offcanvas show={showMicrobiologyEditor} onHide={() => setShowMicrobiologyEditor(false)} placement="end" style={{ width: '90%' }}>
        <Offcanvas.Header closeButton className="blue-back text-white">
          <Offcanvas.Title>Microbiology editor</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <div className="d-flex justify-content-end mb-3">
            <Button type="button" variant="outline-primary" onClick={generateMicrobiologyValues}>
              Generate sample cultures
            </Button>
          </div>
          <AddMicrobiology
            setMicrobiology={saveMicrobiology}
            previousResult={stageDraft.microbiology || []}
            closeModal={() => setShowMicrobiologyEditor(false)}
          />
        </Offcanvas.Body>
      </Offcanvas>

      <Offcanvas show={showImagingEditor} onHide={() => setShowImagingEditor(false)} placement="end" style={{ width: '90%' }}>
        <Offcanvas.Header closeButton className="blue-back text-white">
          <Offcanvas.Title>Imaging editor</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Alert variant="info">
            Upload local image files or paste image URLs. Uploaded files are stored inside the case draft as image data.
          </Alert>
          <AddImages
            setImages={saveImages}
            previousResult={stageDraft.imaging || []}
            closeModal={() => setShowImagingEditor(false)}
          />
        </Offcanvas.Body>
      </Offcanvas>

      <Offcanvas show={showQuestionEditor} onHide={() => setShowQuestionEditor(false)} placement="end" style={{ width: '90%' }}>
        <Offcanvas.Header closeButton className="blue-back text-white">
          <Offcanvas.Title>Question editor</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <AddQuestions
            setQuestions={(questions) => updateStageContent({ questions })}
            previousResult={stageDraft.questions || []}
            drugLibrary={drugLibrary}
            closeModal={() => setShowQuestionEditor(false)}
          />
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
};

export default FacilitatorCaseAuthoringWorkspace;
