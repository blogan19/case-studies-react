import React, { useMemo, useRef, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import CaseStudyDisplay from '../../Case_study_display';
import AllergyManagementModal from '../patient_records/AllergyManagementModal';
import {
  advanceCaseStudyStageForQuestion,
  getLivePresentationCase,
  gradeAnswers,
  hasManualStageProgression,
  hasStagedLiveCase,
  isObjectiveQuestion,
  isWorkthroughTask,
  normalizeCaseStudy,
} from '../../lib/caseStudy';

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

const renderLearningContent = (content) => {
  const text = String(content || '');
  const lines = text.split('\n');

  return lines.map((line, lineIndex) => {
    const parts = line.split(URL_PATTERN);
    return (
      <p key={`learning-line-${lineIndex}`} className="mb-3">
        {parts.map((part, partIndex) => {
          if (/^https?:\/\/\S+$/.test(part)) {
            return (
              <a
                key={`learning-link-${lineIndex}-${partIndex}`}
                href={part}
                target="_blank"
                rel="noreferrer"
              >
                {part}
              </a>
            );
          }

          return <React.Fragment key={`learning-text-${lineIndex}-${partIndex}`}>{part}</React.Fragment>;
        })}
      </p>
    );
  });
};

const renderExpectedAnswer = (expectedAnswer) => {
  if (expectedAnswer === null || expectedAnswer === undefined) {
    return '';
  }

  if (Array.isArray(expectedAnswer)) {
    return expectedAnswer.join(', ');
  }

  if (typeof expectedAnswer === 'object') {
    return Object.entries(expectedAnswer)
      .filter(([_key, value]) => value)
      .map(([key, value]) => `${key}: ${value}`)
      .join(' | ');
  }

  return String(expectedAnswer);
};

const hasMeaningfulAnswer = (value) => {
  if (Array.isArray(value)) {
    return value.some((item) => hasMeaningfulAnswer(item));
  }

  if (value && typeof value === 'object') {
    return Object.values(value).some((item) => hasMeaningfulAnswer(item));
  }

  if (typeof value === 'number') {
    return true;
  }

  return Boolean(String(value || '').trim());
};

const getDrugName = (item) => String(item?.drugName || item?.drug_name || item?.name || item || '').trim();

const getDrugLibraryNames = (drugLibrary) => Array.from(new Set((drugLibrary?.items || [])
  .map(getDrugName)
  .filter(Boolean)))
  .sort((left, right) => left.localeCompare(right, 'en-GB', { sensitivity: 'base' }));

const DrugChoiceAnswerPicker = ({ question, drugLibraryNames, value, disabled, onChange }) => {
  const [search, setSearch] = useState('');
  const drugNameSet = useMemo(() => new Set(drugLibraryNames), [drugLibraryNames]);
  const authoredOptions = useMemo(() => (
    Array.from(new Set((question.answerOptions || [])
      .map((option) => String(option || '').trim())
      .filter((option) => drugNameSet.has(option))))
  ), [drugNameSet, question.answerOptions]);
  const availableOptions = authoredOptions.length ? authoredOptions : drugLibraryNames;
  const filteredOptions = availableOptions
    .filter((option) => option.toLowerCase().includes(search.trim().toLowerCase()))
    .slice(0, 12);

  return (
    <div>
      <InputGroup className="mb-2">
        <Form.Control
          disabled={disabled}
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search drug library"
        />
        <Button type="button" variant="outline-secondary" disabled={!search} onClick={() => setSearch('')}>
          Clear
        </Button>
      </InputGroup>
      <div className="d-flex gap-2 flex-wrap">
        {filteredOptions.map((option) => (
          <Button
            key={option}
            type="button"
            size="sm"
            variant={value === option ? 'primary' : 'outline-primary'}
            disabled={disabled}
            onClick={() => {
              onChange(option);
              setSearch('');
            }}
          >
            {option}
          </Button>
        ))}
      </div>
      {!filteredOptions.length ? (
        <Alert variant="light" className="mt-2 mb-0">
          No matching medicines found in the available drug library options.
        </Alert>
      ) : null}
      {value ? <div className="small text-muted mt-2">Selected answer: <strong>{value}</strong></div> : null}
    </div>
  );
};

const CaseSessionPlayer = ({ session, drugLibrary, onSave, onSubmit, onBack, saving, grading, notice, previewMode = false, backLabel = 'Back to dashboard' }) => {
  const caseStudy = useMemo(() => normalizeCaseStudy(session.caseSnapshot), [session.caseSnapshot]);
  const [editableCaseStudy, setEditableCaseStudy] = useState(caseStudy);
  const editableCaseStudyRef = useRef(caseStudy);
  const presentationCaseStudy = useMemo(() => getLivePresentationCase(editableCaseStudy), [editableCaseStudy]);
  const isQuestionTriggeredStagedCase = hasStagedLiveCase(editableCaseStudy) && !hasManualStageProgression(editableCaseStudy);
  const questions = useMemo(() => presentationCaseStudy.questions || [], [presentationCaseStudy.questions]);
  const [answers, setAnswers] = useState(session.answers || {});
  const [answerDrafts, setAnswerDrafts] = useState(session.progress?.answerDrafts || session.answers || {});
  const [reflection, setReflection] = useState(() => session.progress?.reflection || '');
  const [showTaskPanel, setShowTaskPanel] = useState(false);
  const [showLearningContent, setShowLearningContent] = useState(Boolean(editableCaseStudy.learningContent?.body));
  const [showAllergyEditor, setShowAllergyEditor] = useState(false);
  const [clinicalNotesLaunchRequest, setClinicalNotesLaunchRequest] = useState(null);
  const [pharmacyPanelOpen, setPharmacyPanelOpen] = useState(false);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [showSubmitWarning, setShowSubmitWarning] = useState(false);
  const progress = session.progress || {};
  const routes = drugLibrary?.metadata?.routes || [];
  const frequencies = drugLibrary?.metadata?.frequencies || [];
  const drugOptions = drugLibrary?.items || [];
  const drugLibraryNames = useMemo(() => getDrugLibraryNames(drugLibrary), [drugLibrary]);
  const breakdownMap = useMemo(() => {
    const entries = (grading?.breakdown || progress.breakdown || []).map((item) => [String(item.questionNumber), item]);
    return Object.fromEntries(entries);
  }, [grading, progress.breakdown]);

  const localGrade = useMemo(() => gradeAnswers(editableCaseStudy, answers), [editableCaseStudy, answers]);
  const localBreakdownMap = useMemo(() => (
    Object.fromEntries((localGrade.breakdown || []).map((item) => [String(item.questionNumber), item]))
  ), [localGrade.breakdown]);
  const isSubmitted = session.status === 'completed' || Boolean(grading);
  const hasFacilitatorReview = Boolean(session.facilitatorMarkedAt);
  const totalQuestions = questions.length;
  const clampedActiveQuestionIndex = Math.min(activeQuestionIndex, Math.max(totalQuestions - 1, 0));
  const activeQuestion = questions[clampedActiveQuestionIndex] || null;
  const answeredQuestionCount = useMemo(() => (
    questions.reduce((count, question) => (
      hasMeaningfulAnswer(answers[String(question.questionNumber)]) ? count + 1 : count
    ), 0)
  ), [answers, questions]);
  const activeQuestionKey = activeQuestion ? String(activeQuestion.questionNumber) : '';
  const activeQuestionAnswer = activeQuestion ? (answerDrafts[activeQuestionKey] ?? answers[activeQuestionKey] ?? '') : '';
  const activeConfirmedAnswer = activeQuestion ? answers[activeQuestionKey] : undefined;
  const hasActiveDraftAnswer = hasMeaningfulAnswer(activeQuestionAnswer);
  const activeAnswerConfirmed = hasActiveDraftAnswer && JSON.stringify(activeQuestionAnswer) === JSON.stringify(activeConfirmedAnswer);
  const unconfirmedDraftCount = useMemo(() => (
    questions.reduce((count, question) => {
      const key = String(question.questionNumber);
      const draftValue = answerDrafts[key];
      if (!hasMeaningfulAnswer(draftValue)) {
        return count;
      }
      return JSON.stringify(draftValue) === JSON.stringify(answers[key]) ? count : count + 1;
    }, 0)
  ), [answerDrafts, answers, questions]);
  const activeStructuredAnswer = activeQuestion && activeQuestion.questionType === 'WorkthroughTask' && typeof activeQuestionAnswer === 'object' && !Array.isArray(activeQuestionAnswer)
    ? activeQuestionAnswer
    : {};
  const activeResult = activeQuestion ? breakdownMap[String(activeQuestion.questionNumber)] : null;
  const activeLocalResult = activeQuestion ? localBreakdownMap[String(activeQuestion.questionNumber)] : null;
  const activeFeedbackResult = isSubmitted ? activeResult : activeAnswerConfirmed ? activeLocalResult : null;

  React.useEffect(() => {
    const nextCaseStudy = normalizeCaseStudy(session.caseSnapshot);
    editableCaseStudyRef.current = nextCaseStudy;
    setEditableCaseStudy(nextCaseStudy);
    setAnswers(session.answers || {});
    setAnswerDrafts(session.progress?.answerDrafts || session.answers || {});
    setReflection(session.progress?.reflection || '');
    setActiveQuestionIndex(0);
  }, [session.id, session.updatedAt, session.answers, session.progress, session.caseSnapshot]);

  React.useEffect(() => {
    if (activeQuestionIndex !== clampedActiveQuestionIndex) {
      setActiveQuestionIndex(clampedActiveQuestionIndex);
    }
  }, [activeQuestionIndex, clampedActiveQuestionIndex]);

  const updateAnswer = (questionNumber, value) => {
    if (isSubmitted) {
      return;
    }
    setAnswerDrafts((current) => ({ ...current, [String(questionNumber)]: value }));
  };

  const updateStructuredAnswer = (questionNumber, field, value) => {
    if (isSubmitted) {
      return;
    }

    setAnswerDrafts((current) => ({
      ...current,
      [String(questionNumber)]: {
        ...(current[String(questionNumber)] || {}),
        [field]: value,
      },
    }));
  };

  const commitEditableCaseStudy = (nextValue) => {
    setEditableCaseStudy((current) => {
      const resolvedValue = typeof nextValue === 'function' ? nextValue(current) : nextValue;
      const normalizedValue = normalizeCaseStudy(resolvedValue);
      editableCaseStudyRef.current = normalizedValue;
      return normalizedValue;
    });
  };

  const commitPresentationCaseStudy = (nextValue) => {
    commitEditableCaseStudy((current) => {
      const resolvedValue = typeof nextValue === 'function' ? nextValue(getLivePresentationCase(current)) : nextValue;
      return {
        ...current,
        ...resolvedValue,
        isStagedLiveCase: current.isStagedLiveCase,
        liveStages: current.liveStages,
        currentStageIndex: current.currentStageIndex,
        livePresentationStage: current.livePresentationStage,
      };
    });
  };

  const saveProgress = () => {
    onSave(answers, { ...progress, reflection, answerDrafts }, editableCaseStudyRef.current);
  };

  const submitCase = () => {
    onSubmit(answers, { ...progress, reflection, answerDrafts: {} }, editableCaseStudyRef.current);
  };

  const requestSubmitCase = () => {
    if (totalQuestions > 0 && answeredQuestionCount === 0) {
      setShowSubmitWarning(true);
      return;
    }

    submitCase();
  };

  const confirmActiveAnswer = () => {
    if (!activeQuestion || isSubmitted || !hasActiveDraftAnswer) {
      return;
    }

    setAnswers((current) => ({
      ...current,
      [activeQuestionKey]: activeQuestionAnswer,
    }));

    const nextCaseStudy = advanceCaseStudyStageForQuestion(editableCaseStudyRef.current, activeQuestion.questionNumber);
    if (nextCaseStudy.currentStageIndex !== editableCaseStudyRef.current.currentStageIndex) {
      const nextPresentationCaseStudy = getLivePresentationCase(nextCaseStudy);
      commitEditableCaseStudy(nextCaseStudy);
      setActiveQuestionIndex((current) => Math.min(current + 1, Math.max((nextPresentationCaseStudy.questions || []).length - 1, 0)));
    }
  };

  const openAllergyEditor = () => {
    setShowAllergyEditor(true);
  };

  const updateAllergyState = ({ patient, allergies, allergyHistory }) => {
    commitEditableCaseStudy((current) => ({
      ...current,
      patient: patient || current.patient,
      allergies: Array.isArray(allergies) ? allergies : current.allergies,
      allergyHistory: Array.isArray(allergyHistory) ? allergyHistory : current.allergyHistory,
    }));
  };

  return (
    <>
      <Container className="mt-4 mb-3">
        <div className="container-shadow mt-2 student-epma-header case-session-header">
          <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
            <div>
              <h3 className="mb-1">{session.title || editableCaseStudy.case_study_name || 'Case study'}</h3>
              {session.attemptNumber ? (
                <div className="mb-1">
                  <Badge bg="light" text="dark">Attempt {session.attemptNumber}</Badge>
                </div>
              ) : null}
              <p className="mb-0">Review the patient record, then open the task panel to complete and submit your answers.</p>
              <Button type="button" variant="outline-light" className="btn-sm mt-2" onClick={onBack}>
                <i className="bi bi-arrow-left" aria-hidden="true" />{' '}
                {backLabel}
              </Button>
            </div>
            <div className="d-flex gap-2 flex-wrap case-session-header__actions">
              <Button type="button" variant="light" className="case-session-header__tasks-button" onClick={() => setShowTaskPanel(true)}>
                <i className="bi bi-list-check" aria-hidden="true" />{' '}
                Open Case Study Questions
              </Button>
              {editableCaseStudy.learningContent?.body ? (
                <Button type="button" variant="outline-light" onClick={() => setShowLearningContent(true)}>
                  Learning content
                </Button>
              ) : null}
              {!isSubmitted ? (
                <>
                  <Button type="button" variant="outline-light" onClick={saveProgress} disabled={saving}>
                    {previewMode ? 'Save test progress' : 'Save progress'}
                  </Button>
                  <Button type="button" variant="success" onClick={requestSubmitCase} disabled={saving || unconfirmedDraftCount > 0}>
                    {previewMode ? 'Submit test' : 'Submit case'}
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </Container>

      {previewMode ? (
        <Container className="mb-3">
          <Alert variant="info" className="mb-0">
            Test mode does not publish the case study or create a student attempt.
          </Alert>
        </Container>
      ) : null}

      {isQuestionTriggeredStagedCase && !isSubmitted ? (
        <Container className="mb-3">
          <Alert variant="info" className="mb-0">
            This case study is split into stages. Confirm the questions as you work through the case to reveal the next section.
          </Alert>
        </Container>
      ) : null}

      <CaseStudyDisplay
        data={presentationCaseStudy}
        hideQuestions
        readOnly={!presentationCaseStudy.allowStudentEdits || isSubmitted}
        drugLibrary={drugLibrary}
        onChangeCaseStudy={commitPresentationCaseStudy}
        onOpenAllergyManagement={openAllergyEditor}
        onOpenMedicationHistory={() => setPharmacyPanelOpen(true)}
        onOpenVteAssessment={() => setClinicalNotesLaunchRequest({ templateKey: 'vteAssessment', nonce: Date.now() })}
        launchClinicalNoteTemplateRequest={clinicalNotesLaunchRequest}
        pharmacyPanelOpen={pharmacyPanelOpen}
        onPharmacyPanelOpenChange={setPharmacyPanelOpen}
      />

      <Modal show={showLearningContent} onHide={() => setShowLearningContent(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editableCaseStudy.learningContent?.title || 'Learning content'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="learning-content-preview">{renderLearningContent(editableCaseStudy.learningContent?.body)}</div>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={() => setShowLearningContent(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <AllergyManagementModal
        show={showAllergyEditor}
        onHide={() => setShowAllergyEditor(false)}
        patient={editableCaseStudy.patient || {}}
        allergies={editableCaseStudy.allergies || []}
        allergyHistory={editableCaseStudy.allergyHistory || []}
        drugLibrary={drugLibrary}
        actor="Student"
        onChange={updateAllergyState}
      />

      <Modal show={showSubmitWarning} onHide={() => setShowSubmitWarning(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>No answers submitted</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning" className="mb-0">
            You have not confirmed any question answers yet. Submit anyway, or go back and answer at least one question first.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="outline-secondary" onClick={() => setShowSubmitWarning(false)}>
            Go back to questions
          </Button>
          <Button
            type="button"
            variant="warning"
            disabled={saving}
            onClick={() => {
              setShowSubmitWarning(false);
              submitCase();
            }}
          >
            Submit without answers
          </Button>
        </Modal.Footer>
      </Modal>

      <Offcanvas show={showTaskPanel} onHide={() => setShowTaskPanel(false)} placement="end" scroll backdrop={false}>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>{session.title}{session.attemptNumber ? ` - Attempt ${session.attemptNumber}` : ''}</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <p className="text-muted">Complete each question, confirm the answer, then submit the case when ready.</p>
          {notice ? <Alert variant={notice.variant}>{notice.message}</Alert> : null}
          {hasFacilitatorReview ? (
            <Alert variant="success">
              <div><strong>Facilitator mark:</strong> {session.facilitatorMark != null ? `${session.facilitatorMark}%` : 'Not scored'}</div>
              {session.facilitatorFeedback ? <div className="mt-2"><strong>Feedback:</strong> {session.facilitatorFeedback}</div> : null}
            </Alert>
          ) : isSubmitted ? (
            <Alert variant="light">Your submission is awaiting facilitator review.</Alert>
          ) : null}
          {unconfirmedDraftCount > 0 && !isSubmitted ? (
            <Alert variant="warning">
              {unconfirmedDraftCount} drafted answer{unconfirmedDraftCount === 1 ? '' : 's'} still need{unconfirmedDraftCount === 1 ? 's' : ''} confirming before the case can be submitted.
            </Alert>
          ) : null}
          {totalQuestions ? (
            <>
              <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap mb-3">
                <div className="small text-muted">
                  Answered {answeredQuestionCount} of {totalQuestions} questions
                </div>
                <div className="small text-muted">
                  Question {clampedActiveQuestionIndex + 1} of {totalQuestions}
                </div>
              </div>

              <div className="d-flex gap-2 flex-wrap mb-3">
                {questions.map((question, index) => {
                  const questionAnswered = hasMeaningfulAnswer(answers[String(question.questionNumber)]);
                  const questionResult = localBreakdownMap[String(question.questionNumber)];
                  const questionDrafted = hasMeaningfulAnswer(answerDrafts[String(question.questionNumber)])
                    && JSON.stringify(answerDrafts[String(question.questionNumber)]) !== JSON.stringify(answers[String(question.questionNumber)]);
                  const isActive = index === clampedActiveQuestionIndex;
                  const answeredVariant = questionResult?.isCorrect === false ? 'danger' : 'success';
                  return (
                    <Button
                      key={question.questionNumber}
                      type="button"
                      size="sm"
                      variant={isActive ? 'primary' : questionAnswered ? answeredVariant : questionDrafted ? 'warning' : 'outline-secondary'}
                      onClick={() => setActiveQuestionIndex(index)}
                    >
                      Q{question.questionNumber}
                    </Button>
                  );
                })}
              </div>

              {activeQuestion ? (
                <div className="border rounded p-3 mb-3 bg-light">
                  <div className="d-flex justify-content-between align-items-center gap-2 mb-2 flex-wrap">
                    <strong>Q{activeQuestion.questionNumber}: {activeQuestion.questionTitle}</strong>
                    <div className="d-flex gap-2 align-items-center flex-wrap">
                      {activeFeedbackResult?.isCorrect === true ? (
                        <Button type="button" size="sm" variant="success" disabled>Correct</Button>
                      ) : null}
                      {activeFeedbackResult?.isCorrect === false ? (
                        <Button type="button" size="sm" variant="danger" disabled>Incorrect</Button>
                      ) : null}
                      {!activeFeedbackResult ? (
                        <Badge bg={hasActiveDraftAnswer ? 'warning' : 'secondary'}>
                          {hasActiveDraftAnswer ? 'Draft' : 'Not answered'}
                        </Badge>
                      ) : null}
                      {activeFeedbackResult?.isCorrect === null ? (
                        <Badge bg="secondary">Answer saved</Badge>
                      ) : null}
                      <Badge bg={isObjectiveQuestion(activeQuestion) || isWorkthroughTask(activeQuestion) ? 'primary' : 'secondary'}>
                        {activeQuestion.questionType}
                      </Badge>
                    </div>
                  </div>
                  <p className="small text-muted">{activeQuestion.questionText}</p>
                  {activeQuestion.questionType === 'WorkthroughTask' ? (
                    <>
                      <Alert variant="light" className="py-2">
                        Task type: <strong>{activeQuestion.taskType || 'General'}</strong>
                      </Alert>
                      {activeQuestion.taskType === 'AddAllergy' ? (
                        <Row className="g-2">
                          <div className="col-12">
                            <Form.Control
                              disabled={isSubmitted}
                              value={activeStructuredAnswer.drug || ''}
                              onChange={(event) => updateStructuredAnswer(activeQuestion.questionNumber, 'drug', event.target.value)}
                              placeholder="Allergy / substance"
                            />
                          </div>
                          <div className="col-12">
                            <Form.Control
                              disabled={isSubmitted}
                              value={activeStructuredAnswer.reaction || ''}
                              onChange={(event) => updateStructuredAnswer(activeQuestion.questionNumber, 'reaction', event.target.value)}
                              placeholder="Reaction"
                            />
                          </div>
                        </Row>
                      ) : null}

                      {activeQuestion.taskType === 'PrescribeMedication' ? (
                        <Row className="g-2">
                          <div className="col-12">
                            <Form.Select
                              disabled={isSubmitted}
                              value={activeStructuredAnswer.drug || ''}
                              onChange={(event) => updateStructuredAnswer(activeQuestion.questionNumber, 'drug', event.target.value)}
                            >
                              <option value="">Select drug</option>
                              {drugOptions.map((item) => (
                                <option key={item.id} value={item.drugName}>{item.drugName}</option>
                              ))}
                            </Form.Select>
                          </div>
                          <div className="col-12">
                            <Form.Select
                              disabled={isSubmitted}
                              value={activeStructuredAnswer.route || ''}
                              onChange={(event) => updateStructuredAnswer(activeQuestion.questionNumber, 'route', event.target.value)}
                            >
                              <option value="">Select route</option>
                              {routes.map((route) => <option key={route} value={route}>{route}</option>)}
                            </Form.Select>
                          </div>
                          <div className="col-12">
                            <Form.Select
                              disabled={isSubmitted}
                              value={activeStructuredAnswer.frequency || ''}
                              onChange={(event) => updateStructuredAnswer(activeQuestion.questionNumber, 'frequency', event.target.value)}
                            >
                              <option value="">Select frequency</option>
                              {frequencies.map((frequency) => <option key={frequency} value={frequency}>{frequency}</option>)}
                            </Form.Select>
                          </div>
                          <div className="col-12">
                            <Form.Control
                              disabled={isSubmitted}
                              value={activeStructuredAnswer.indication || ''}
                              onChange={(event) => updateStructuredAnswer(activeQuestion.questionNumber, 'indication', event.target.value)}
                              placeholder="Indication"
                            />
                          </div>
                        </Row>
                      ) : null}

                      {!['AddAllergy', 'PrescribeMedication'].includes(activeQuestion.taskType) ? (
                        <Form.Control
                          disabled={isSubmitted}
                          as="textarea"
                          rows={3}
                          value={activeQuestionAnswer || ''}
                          onChange={(event) => updateAnswer(activeQuestion.questionNumber, event.target.value)}
                          placeholder="Describe the action you would take"
                        />
                      ) : null}
                    </>
                  ) : null}

                  {activeQuestion.questionType === 'MultipleChoice' ? (
                    <Form.Select disabled={isSubmitted} value={activeQuestionAnswer || ''} onChange={(event) => updateAnswer(activeQuestion.questionNumber, event.target.value)}>
                      <option value="">Select an answer</option>
                      {(activeQuestion.answerOptions || []).map((option) => <option key={option} value={option}>{option}</option>)}
                    </Form.Select>
                  ) : null}

                  {activeQuestion.questionType === 'DrugChoice' ? (
                    <DrugChoiceAnswerPicker
                      question={activeQuestion}
                      drugLibraryNames={drugLibraryNames}
                      value={activeQuestionAnswer || ''}
                      disabled={isSubmitted}
                      onChange={(nextAnswer) => updateAnswer(activeQuestion.questionNumber, nextAnswer)}
                    />
                  ) : null}

                  {activeQuestion.questionType === 'Calculation' ? (
                    <Form.Control disabled={isSubmitted} type="number" value={activeQuestionAnswer || ''} onChange={(event) => updateAnswer(activeQuestion.questionNumber, event.target.value)} placeholder="Enter your answer" />
                  ) : null}

                  {activeQuestion.questionType === 'MultipleAnswer' ? (
                    <>
                      {(activeQuestion.optionsLabels || []).map((label, index) => (
                        <Form.Control
                          key={`${activeQuestion.questionNumber}-${label}-${index}`}
                          className="mb-2"
                          disabled={isSubmitted}
                          value={activeQuestionAnswer?.[index] || ''}
                          placeholder={label}
                          onChange={(event) => {
                            const next = [...(activeQuestionAnswer || [])];
                            next[index] = event.target.value;
                            updateAnswer(activeQuestion.questionNumber, next);
                          }}
                        />
                      ))}
                    </>
                  ) : null}

                  {activeQuestion.questionType === 'CarePlan' ? (
                    <Form.Control disabled={isSubmitted} as="textarea" rows={3} value={activeQuestionAnswer || ''} onChange={(event) => updateAnswer(activeQuestion.questionNumber, event.target.value)} placeholder="Write your reflection" />
                  ) : null}

                  {!isSubmitted ? (
                    <div className="d-flex justify-content-end mt-3">
                      <Button
                        type="button"
                        variant={activeAnswerConfirmed ? 'outline-success' : 'primary'}
                        disabled={!hasActiveDraftAnswer || activeAnswerConfirmed}
                        onClick={confirmActiveAnswer}
                      >
                        {activeAnswerConfirmed ? 'Answer confirmed' : 'Confirm answer'}
                      </Button>
                    </div>
                  ) : null}

                  {isSubmitted && activeResult ? (
                    <div className="mt-3">
                      {activeResult.isCorrect === true ? <Alert variant="success" className="py-2 mb-2">Correct answer</Alert> : null}
                      {activeResult.isCorrect === false ? <Alert variant="danger" className="py-2 mb-2">Incorrect answer</Alert> : null}
                      {activeResult.correctAnswer !== null && activeResult.correctAnswer !== undefined ? (
                        <p className="small mb-2"><strong>Expected answer:</strong> {renderExpectedAnswer(activeResult.correctAnswer)}</p>
                      ) : null}
                      {activeQuestion.answerExplanation ? (
                        <Alert variant="info" className="mb-0">
                          <strong>Explanation:</strong> {activeQuestion.answerExplanation}
                        </Alert>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap mb-4">
                <Button
                  type="button"
                  variant="outline-secondary"
                  onClick={() => setActiveQuestionIndex((current) => Math.max(0, current - 1))}
                  disabled={clampedActiveQuestionIndex === 0}
                >
                  Previous question
                </Button>
                <Button
                  type="button"
                  variant="outline-secondary"
                  onClick={() => setActiveQuestionIndex((current) => Math.min(totalQuestions - 1, current + 1))}
                  disabled={clampedActiveQuestionIndex === totalQuestions - 1}
                >
                  Next question
                </Button>
              </div>
            </>
          ) : (
            <Alert variant="light">This case study does not have any questions yet.</Alert>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Overall reflection / notes</Form.Label>
            <Form.Control disabled={isSubmitted} as="textarea" rows={3} value={reflection} onChange={(event) => setReflection(event.target.value)} />
          </Form.Group>

          {grading ? (
            <Alert variant="success">
              Submitted score: <strong>{grading.score}%</strong> ({grading.correctCount}/{grading.totalScorable})
            </Alert>
          ) : null}

          {!isSubmitted ? (
            <div className="d-flex gap-2 flex-wrap">
              <Button type="button" variant="outline-primary" onClick={saveProgress} disabled={saving}>Save progress</Button>
              <Button type="button" variant="success" onClick={requestSubmitCase} disabled={saving || unconfirmedDraftCount > 0}>Submit case</Button>
            </div>
          ) : null}
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
};

export default CaseSessionPlayer;
