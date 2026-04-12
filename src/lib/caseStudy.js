import sampleCase from '../case_study.json';

export const emptyCaseStudy = {
  id: '',
  case_study_name: '',
  prescribingStatus: false,
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
};

export function normalizeCaseStudy(input) {
  const source = input || {};

  return {
    ...emptyCaseStudy,
    ...source,
    allergies: Array.isArray(source.allergies) ? source.allergies : [],
    imaging: Array.isArray(source.imaging) ? source.imaging : [],
    prescriptionList: Array.isArray(source.prescriptionList) ? source.prescriptionList : [],
    microbiology: source.microbiology || [],
    biochemistry: source.biochemistry || {},
    observations: source.observations || {},
    questions: Array.isArray(source.questions) ? source.questions : [],
  };
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
  const scorable = normalized.questions.filter((question) => isObjectiveQuestion(question) || isWorkthroughTask(question));
  const breakdown = normalized.questions.map((question) => {
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
