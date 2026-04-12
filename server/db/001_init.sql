CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS case_studies (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  draft_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_data JSONB,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS owner_user_id TEXT REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';
ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS summary TEXT NOT NULL DEFAULT '';
ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS draft_data JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS published_data JSONB;
ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE case_studies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS live_sessions (
  id TEXT PRIMARY KEY,
  case_study_id TEXT NOT NULL REFERENCES case_studies(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  last_payload JSONB NOT NULL,
  step_index INTEGER NOT NULL DEFAULT 0,
  reveal_answers BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS step_index INTEGER NOT NULL DEFAULT 0;
ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS reveal_answers BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS case_sessions (
  id TEXT PRIMARY KEY,
  case_study_id TEXT NOT NULL REFERENCES case_studies(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress',
  case_snapshot JSONB NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  progress JSONB NOT NULL DEFAULT '{}'::jsonb,
  score NUMERIC(5,2),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS live_session_responses (
  id TEXT PRIMARY KEY,
  live_session_id TEXT NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  question_number TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  participant_name TEXT NOT NULL DEFAULT 'Guest learner',
  answer_text TEXT NOT NULL DEFAULT '',
  answer_json JSONB NOT NULL DEFAULT 'null'::jsonb,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (live_session_id, question_number, participant_id)
);

CREATE TABLE IF NOT EXISTS drug_library_items (
  id TEXT PRIMARY KEY,
  drug_name TEXT NOT NULL,
  strength TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT '',
  form TEXT NOT NULL DEFAULT '',
  default_route TEXT NOT NULL DEFAULT '',
  aliases TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  is_infusion BOOLEAN NOT NULL DEFAULT FALSE,
  usual_frequencies TEXT NOT NULL DEFAULT '',
  default_dose TEXT NOT NULL DEFAULT '',
  default_indication TEXT NOT NULL DEFAULT '',
  high_risk BOOLEAN NOT NULL DEFAULT FALSE,
  requires_witness BOOLEAN NOT NULL DEFAULT FALSE,
  requires_diluent BOOLEAN NOT NULL DEFAULT FALSE,
  default_diluent TEXT NOT NULL DEFAULT '',
  default_volume TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE drug_library_items ADD COLUMN IF NOT EXISTS aliases TEXT NOT NULL DEFAULT '';
ALTER TABLE drug_library_items ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT '';
ALTER TABLE drug_library_items ADD COLUMN IF NOT EXISTS is_infusion BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE drug_library_items ADD COLUMN IF NOT EXISTS usual_frequencies TEXT NOT NULL DEFAULT '';
ALTER TABLE drug_library_items ADD COLUMN IF NOT EXISTS default_dose TEXT NOT NULL DEFAULT '';
ALTER TABLE drug_library_items ADD COLUMN IF NOT EXISTS default_indication TEXT NOT NULL DEFAULT '';
ALTER TABLE drug_library_items ADD COLUMN IF NOT EXISTS high_risk BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE drug_library_items ADD COLUMN IF NOT EXISTS requires_witness BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE drug_library_items ADD COLUMN IF NOT EXISTS requires_diluent BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE drug_library_items ADD COLUMN IF NOT EXISTS default_diluent TEXT NOT NULL DEFAULT '';
ALTER TABLE drug_library_items ADD COLUMN IF NOT EXISTS default_volume TEXT NOT NULL DEFAULT '';
ALTER TABLE drug_library_items ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS route_options (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS frequency_options (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  default_admin_times TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_outcome_options (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS allergy_reaction_options (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  blocks_prescribing BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS common_conditions (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  icd10_code TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS critical_medicines (
  id TEXT PRIMARY KEY,
  drug_name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS controlled_drugs (
  id TEXT PRIMARY KEY,
  drug_name TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drug_order_sets (
  id TEXT PRIMARY KEY,
  drug_name TEXT NOT NULL,
  label TEXT NOT NULL,
  dose TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT '',
  frequency TEXT NOT NULL DEFAULT '',
  route TEXT NOT NULL DEFAULT '',
  indication TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (drug_name, label)
);

CREATE TABLE IF NOT EXISTS test_patients (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nhs_number TEXT NOT NULL UNIQUE,
  hospital_number TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  surname TEXT NOT NULL,
  date_of_birth TEXT NOT NULL,
  address TEXT NOT NULL,
  gender TEXT NOT NULL DEFAULT '',
  stay_type TEXT NOT NULL DEFAULT '',
  ward_name TEXT NOT NULL DEFAULT '',
  episode_status TEXT NOT NULL DEFAULT 'active',
  admitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  discharged_at TIMESTAMPTZ,
  weight TEXT NOT NULL DEFAULT '',
  height TEXT NOT NULL DEFAULT '',
  nkda BOOLEAN NOT NULL DEFAULT FALSE,
  allergies JSONB NOT NULL DEFAULT '[]'::jsonb,
  allergy_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  case_notes JSONB NOT NULL DEFAULT '{}'::jsonb,
  case_notes_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  prescriptions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patient_chart_audit_events (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES test_patients(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patient_measurements (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES test_patients(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weight TEXT,
  height TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE frequency_options ADD COLUMN IF NOT EXISTS default_admin_times TEXT NOT NULL DEFAULT '';
ALTER TABLE test_patients ADD COLUMN IF NOT EXISTS nkda BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE test_patients ADD COLUMN IF NOT EXISTS stay_type TEXT NOT NULL DEFAULT '';
ALTER TABLE test_patients ADD COLUMN IF NOT EXISTS ward_name TEXT NOT NULL DEFAULT '';
ALTER TABLE test_patients ADD COLUMN IF NOT EXISTS episode_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE test_patients ADD COLUMN IF NOT EXISTS admitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE test_patients ADD COLUMN IF NOT EXISTS discharged_at TIMESTAMPTZ;
ALTER TABLE test_patients ADD COLUMN IF NOT EXISTS allergies JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE test_patients ADD COLUMN IF NOT EXISTS allergy_history JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE test_patients ADD COLUMN IF NOT EXISTS case_notes JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE test_patients ADD COLUMN IF NOT EXISTS case_notes_history JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE test_patients ADD COLUMN IF NOT EXISTS prescriptions JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_case_studies_owner_user_id ON case_studies(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_case_studies_status ON case_studies(status);
CREATE INDEX IF NOT EXISTS idx_live_sessions_case_study_id ON live_sessions(case_study_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_status ON live_sessions(status);
CREATE INDEX IF NOT EXISTS idx_live_session_responses_live_session_id ON live_session_responses(live_session_id);
CREATE INDEX IF NOT EXISTS idx_live_session_responses_question_number ON live_session_responses(question_number);
CREATE INDEX IF NOT EXISTS idx_drug_library_items_drug_name ON drug_library_items(drug_name);
CREATE INDEX IF NOT EXISTS idx_route_options_sort_order ON route_options(sort_order);
CREATE INDEX IF NOT EXISTS idx_frequency_options_sort_order ON frequency_options(sort_order);
CREATE INDEX IF NOT EXISTS idx_admin_outcome_options_sort_order ON admin_outcome_options(sort_order);
CREATE INDEX IF NOT EXISTS idx_allergy_reaction_options_sort_order ON allergy_reaction_options(sort_order);
CREATE INDEX IF NOT EXISTS idx_common_conditions_sort_order ON common_conditions(sort_order);
CREATE INDEX IF NOT EXISTS idx_common_conditions_label ON common_conditions(label);
CREATE INDEX IF NOT EXISTS idx_critical_medicines_sort_order ON critical_medicines(sort_order);
CREATE INDEX IF NOT EXISTS idx_controlled_drugs_sort_order ON controlled_drugs(sort_order);
CREATE INDEX IF NOT EXISTS idx_drug_order_sets_drug_name ON drug_order_sets(drug_name);
CREATE INDEX IF NOT EXISTS idx_drug_order_sets_active_sort_order ON drug_order_sets(active, sort_order);
CREATE INDEX IF NOT EXISTS idx_test_patients_owner_user_id ON test_patients(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_test_patients_surname ON test_patients(surname);
CREATE INDEX IF NOT EXISTS idx_test_patients_hospital_number ON test_patients(hospital_number);
CREATE INDEX IF NOT EXISTS idx_test_patients_nhs_number ON test_patients(nhs_number);
CREATE INDEX IF NOT EXISTS idx_patient_chart_audit_events_patient_id ON patient_chart_audit_events(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_chart_audit_events_user_id_created_at ON patient_chart_audit_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patient_chart_audit_events_action_type ON patient_chart_audit_events(action_type);
CREATE INDEX IF NOT EXISTS idx_patient_measurements_patient_id_recorded_at ON patient_measurements(patient_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_sessions_case_study_id ON case_sessions(case_study_id);
CREATE INDEX IF NOT EXISTS idx_case_sessions_user_id ON case_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_case_sessions_status ON case_sessions(status);
