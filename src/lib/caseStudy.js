import sampleCase from '../case_study.json';

export const emptyCaseStudy = {
  id: '',
  case_study_name: '',
  prescribingStatus: false,
  allowStudentEdits: false,
  allowMultipleAttempts: false,
  learningContent: {
    title: '',
    body: '',
  },
  case_instructions: '',
  patient: '',
  allergies: [],
  case_notes: '',
  imaging: [],
  prescriptionList: [],
  microbiology: [],
  biochemistry: {},
  observations: {},
  questions: [],
  livePresentationStage: 'full',
  isStagedLiveCase: false,
  liveStages: [],
  currentStageIndex: 0,
};

function normalizePatient(patient) {
  if (!patient || typeof patient !== 'object') {
    return {};
  }

  return {
    ...patient,
    name: patient.name || patient.fullName || '',
    fullName: patient.fullName || patient.name || '',
    hospitalNo: patient.hospitalNo || patient.hospitalNumber || '',
    hospitalNumber: patient.hospitalNumber || patient.hospitalNo || '',
    dob: patient.dob || patient.dateOfBirth || '',
    dateOfBirth: patient.dateOfBirth || patient.dob || '',
  };
}

export function normalizeCaseStudy(input) {
  const source = input || {};
  const liveStages = Array.isArray(source.liveStages) ? source.liveStages.map(normalizeLiveStage) : [];

  return {
    ...emptyCaseStudy,
    ...source,
    livePresentationStage: source.livePresentationStage === 'initial' ? 'initial' : 'full',
    isStagedLiveCase: Boolean(source.isStagedLiveCase && liveStages.length),
    liveStages,
    currentStageIndex: Math.max(0, Number(source.currentStageIndex || 0)),
    allowStudentEdits: Boolean(source.allowStudentEdits),
    allowMultipleAttempts: Boolean(source.allowMultipleAttempts),
    learningContent: {
      title: source.learningContent?.title || '',
      body: source.learningContent?.body || '',
    },
    patient: normalizePatient(source.patient),
    allergies: Array.isArray(source.allergies) ? source.allergies : [],
    imaging: Array.isArray(source.imaging) ? source.imaging : [],
    prescriptionList: Array.isArray(source.prescriptionList) ? source.prescriptionList : [],
    microbiology: source.microbiology || [],
    biochemistry: source.biochemistry || {},
    observations: source.observations || {},
    questions: Array.isArray(source.questions) ? source.questions : [],
  };
}

export function createLiveStage(index = 0, overrides = {}) {
  return normalizeLiveStage({
    id: overrides.id || `stage-${Date.now()}-${index}`,
    title: overrides.title || `Stage ${index + 1}`,
    trigger: {
      type: overrides.trigger?.type || 'manual',
      questionNumber: overrides.trigger?.questionNumber || '',
    },
    patch: overrides.patch || {},
  }, index);
}

export function normalizeLiveStage(stage = {}, index = 0) {
  const trigger = stage.trigger && typeof stage.trigger === 'object' ? stage.trigger : {};

  return {
    id: stage.id || `stage-${index + 1}`,
    title: stage.title || `Stage ${index + 1}`,
    trigger: {
      type: trigger.type === 'question' ? 'question' : 'manual',
      questionNumber: trigger.questionNumber || '',
    },
    patch: stage.patch && typeof stage.patch === 'object' ? stage.patch : {},
  };
}

export function hasStagedLiveCase(caseStudy) {
  const normalized = normalizeCaseStudy(caseStudy);
  return Boolean(normalized.isStagedLiveCase && normalized.liveStages.length);
}

export function hasManualStageProgression(caseStudy) {
  const normalized = normalizeCaseStudy(caseStudy);
  if (!hasStagedLiveCase(normalized)) {
    return false;
  }

  return normalized.liveStages.some((stage, index) => index > 0 && stage.trigger?.type !== 'question');
}

export function getActiveLiveStageIndex(caseStudy) {
  const normalized = normalizeCaseStudy(caseStudy);
  if (!normalized.liveStages.length) {
    return 0;
  }

  return Math.max(0, Math.min(normalized.currentStageIndex || 0, normalized.liveStages.length - 1));
}

function mergeObject(base = {}, patch = {}) {
  const merged = { ...base };
  Object.entries(patch || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      merged[key] = value;
      return;
    }

    if (value && typeof value === 'object') {
      merged[key] = mergeObject(merged[key] && typeof merged[key] === 'object' ? merged[key] : {}, value);
      return;
    }

    if (value !== undefined) {
      merged[key] = value;
    }
  });

  return merged;
}

export function applyLiveStages(caseStudy) {
  const normalized = normalizeCaseStudy(caseStudy);
  if (!hasStagedLiveCase(normalized)) {
    return normalized;
  }

  const activeStageIndex = getActiveLiveStageIndex(normalized);
  return getCaseStudyForLiveStage(normalized, activeStageIndex);
}

export function getCaseStudyForLiveStage(caseStudy, stageIndex = 0) {
  const normalized = normalizeCaseStudy(caseStudy);
  if (!hasStagedLiveCase(normalized)) {
    return normalized;
  }

  const activeStageIndex = Math.max(0, Math.min(Number(stageIndex || 0), normalized.liveStages.length - 1));
  const stagedPayload = normalized.liveStages
    .slice(0, activeStageIndex + 1)
    .reduce((current, stage, index) => {
      if (index === 0 && !Object.keys(stage.patch || {}).length) {
        return current;
      }
      return mergeObject(current, stage.patch);
    }, normalized);

  return normalizeCaseStudy({
    ...stagedPayload,
    currentStageIndex: activeStageIndex,
    livePresentationStage: 'full',
  });
}

export function getLivePresentationCase(caseStudy) {
  const normalized = normalizeCaseStudy(caseStudy);

  if (hasStagedLiveCase(normalized)) {
    return applyLiveStages(normalized);
  }

  if (normalized.livePresentationStage !== 'initial') {
    return normalized;
  }

  return normalizeCaseStudy({
    ...normalized,
    case_notes: {
      ...(normalized.case_notes || {}),
      pastMedicalSurgicalHistory: [],
      functionalBaseline: '',
      familyHistory: '',
      socialHistory: {
        alcohol: '',
        smoking: '',
        recreationalDrugs: '',
        occupation: '',
        homeEnvironment: '',
      },
      medicationHistory: {},
      notes: [],
      tasks: [],
    },
    microbiology: [],
    biochemistry: {},
    observations: {},
    imaging: [],
  });
}

export function getNextQuestionTriggeredStageIndex(caseStudy, questionNumber) {
  const normalized = normalizeCaseStudy(caseStudy);
  if (!hasStagedLiveCase(normalized)) {
    return null;
  }

  const currentStageIndex = getActiveLiveStageIndex(normalized);
  const nextStage = normalized.liveStages[currentStageIndex + 1];
  if (
    nextStage?.trigger?.type === 'question'
    && String(nextStage.trigger.questionNumber || '') === String(questionNumber)
  ) {
    return currentStageIndex + 1;
  }

  return null;
}

export function advanceCaseStudyStageForQuestion(caseStudy, questionNumber) {
  const normalized = normalizeCaseStudy(caseStudy);
  const nextStageIndex = getNextQuestionTriggeredStageIndex(normalized, questionNumber);
  if (nextStageIndex === null) {
    return normalized;
  }

  return normalizeCaseStudy({
    ...normalized,
    currentStageIndex: nextStageIndex,
    livePresentationStage: 'full',
  });
}

function hasValidLiveStageTriggers(caseStudy) {
  const normalized = normalizeCaseStudy(caseStudy);
  if (!hasStagedLiveCase(normalized)) {
    return true;
  }

  return normalized.liveStages.every((stage, index) => {
    if (index === 0 || stage.trigger?.type !== 'question') {
      return true;
    }

    const previousStage = getCaseStudyForLiveStage(normalized, index - 1);
    return (previousStage.questions || []).some((question, questionIndex) => (
      String(question.questionNumber || questionIndex + 1) === String(stage.trigger.questionNumber || '')
    ));
  });
}

export function createDraftCaseStudy() {
  return normalizeCaseStudy(emptyCaseStudy);
}

export function getSampleCaseStudy() {
  return normalizeCaseStudy(sampleCase);
}

export function hasContent(value) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (value && typeof value === 'object') {
    return Object.keys(value).length > 0;
  }

  return Boolean(value);
}

export function isCaseStudyReady(caseStudy) {
  return Boolean(caseStudy.case_study_name && caseStudy.case_instructions && hasContent(caseStudy.patient));
}

export function getCaseStudyPublishValidation(caseStudy) {
  const normalized = normalizeCaseStudy(caseStudy);
  const patient = normalized.patient || {};
  const authoredContentCount = [
    hasContent(normalized.case_notes),
    hasContent(normalized.prescriptionList),
    hasContent(normalized.biochemistry),
    hasContent(normalized.observations),
    hasContent(normalized.microbiology),
    hasContent(normalized.imaging),
  ].filter(Boolean).length;

  const isStagedLiveCase = hasStagedLiveCase(normalized);
  const requiredChecks = [
    {
      key: 'name',
      label: 'Case study name added',
      passed: Boolean(String(normalized.case_study_name || '').trim()),
    },
    {
      key: 'description',
      label: 'Brief description added',
      passed: Boolean(String(normalized.short_description || normalized.case_instructions || '').trim()),
    },
    {
      key: 'patient-name',
      label: 'Patient name recorded',
      passed: Boolean(String(patient.fullName || patient.name || '').trim()),
    },
    {
      key: 'patient-number',
      label: 'Hospital number recorded',
      passed: Boolean(String(patient.hospitalNumber || patient.hospitalNo || '').trim()),
    },
    {
      key: 'patient-dob',
      label: 'Date of birth recorded',
      passed: Boolean(String(patient.dateOfBirth || patient.dob || '').trim()),
    },
    {
      key: 'clinical-content',
      label: 'At least one area of patient content authored',
      passed: authoredContentCount > 0,
    },
    {
      key: 'questions',
      label: 'At least one question added',
      passed: true,
    },
    {
      key: 'live-stage-triggers',
      label: 'Stage triggers are valid',
      passed: hasValidLiveStageTriggers(normalized),
    },
  ].filter((check) => check.key !== 'live-stage-triggers' || isStagedLiveCase);

  const recommendedChecks = [
    {
      key: 'multiple-content-areas',
      label: 'More than one patient content area authored',
      passed: authoredContentCount > 1,
    },
    {
      key: 'patient-location',
      label: 'Ward or location recorded',
      passed: Boolean(String(patient.wardName || '').trim()),
    },
    {
      key: 'question-count',
      label: 'At least one question added',
      passed: Array.isArray(normalized.questions) && normalized.questions.length > 0,
    },
  ];

  return {
    ready: requiredChecks.every((item) => item.passed),
    requiredChecks,
    recommendedChecks,
  };
}

export function getCaseStudyAuthoringProgress(caseStudy) {
  const normalized = normalizeCaseStudy(caseStudy);
  const patient = normalized.patient || {};
  const caseNotes = normalized.case_notes || {};

  return [
    {
      key: 'patient',
      label: 'Patient details complete',
      required: true,
      complete: Boolean(
        String(patient.fullName || patient.name || '').trim()
        && String(patient.hospitalNumber || patient.hospitalNo || '').trim()
        && String(patient.dateOfBirth || patient.dob || '').trim()
      ),
    },{
      key: 'learning-content',
      label: 'Learning content added',
      required: false,
      complete: Boolean(String(normalized.learningContent?.body || '').trim()),
    },
    {
      key: 'case-notes',
      label: 'Case notes added',
      required: false,
      complete: hasContent(caseNotes),
    },
    {
      key: 'prescribing',
      label: 'Prescribing added',
      required: false,
      complete: Array.isArray(normalized.prescriptionList) && normalized.prescriptionList.length > 0,
    },
    {
      key: 'bloods',
      label: 'Bloods added',
      required: false,
      complete: hasContent(normalized.biochemistry),
    },
    {
      key: 'observations',
      label: 'Observations added',
      required: false,
      complete: hasContent(normalized.observations),
    },
    {
      key: 'imaging',
      label: 'Imaging added',
      required: false,
      complete: Array.isArray(normalized.imaging) && normalized.imaging.length > 0,
    },
    {
      key: 'microbiology',
      label: 'Microbiology added',
      required: false,
      complete: hasContent(normalized.microbiology),
    },
    {
      key: 'questions',
      label: 'Questions added',
      required: false,
      complete: Array.isArray(normalized.questions) && normalized.questions.length > 0,
    },
  ];
}

export function isObjectiveQuestion(question) {
  return ['MultipleChoice', 'Calculation', 'DrugChoice', 'MultipleAnswer'].includes(question.questionType);
}

export function isWorkthroughTask(question) {
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

export function gradeAnswers(caseStudy, answers = {}) {
  const normalized = normalizeCaseStudy(caseStudy);
  const gradeableCaseStudy = hasStagedLiveCase(normalized) ? getLivePresentationCase(normalized) : normalized;
  const scorable = gradeableCaseStudy.questions.filter((question) => isObjectiveQuestion(question) || isWorkthroughTask(question));
  const breakdown = gradeableCaseStudy.questions.map((question) => {
    const answer = answers[String(question.questionNumber)];
    let isCorrect = null;

    if (question.questionType === 'Calculation') {
      isCorrect = Number(answer) === Number(question.answer);
    } else if (question.questionType === 'MultipleAnswer') {
      isCorrect = JSON.stringify((answer || []).map(String)) === JSON.stringify((question.answer || []).map(String));
    } else if (question.questionType === 'WorkthroughTask') {
      isCorrect = matchesStructuredTask(question, answer);
    } else if (isObjectiveQuestion(question)) {
      isCorrect = String(answer) === String(question.answer);
    }

    return {
      questionNumber: question.questionNumber,
      questionTitle: question.questionTitle,
      questionType: question.questionType,
      submittedAnswer: answer ?? null,
      correctAnswer: getExpectedAnswer(question),
      isCorrect,
    };
  });

  const correct = breakdown.filter((item) => item.isCorrect === true).length;
  const score = scorable.length ? Math.round((correct / scorable.length) * 100) : 0;

  return {
    score,
    correct,
    total: scorable.length,
    breakdown,
  };
}
