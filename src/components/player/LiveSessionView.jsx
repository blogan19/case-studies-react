import React, { useEffect, useMemo, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import ProgressBar from 'react-bootstrap/ProgressBar';
import CaseStudyDisplay from '../../Case_study_display';
import {
  getActiveLiveStageIndex,
  getLivePresentationCase,
  hasStagedLiveCase,
  normalizeCaseStudy,
} from '../../lib/caseStudy';

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

const LiveSessionView = ({ liveState, drugLibrary, liveResponses, participantId, onSubmitAnswer, onLeave }) => {
  const caseStudy = normalizeCaseStudy(liveState?.payload || {});
  const sessionEnded = liveState?.status && liveState.status !== 'active';
  const presentationCaseStudy = useMemo(() => getLivePresentationCase(caseStudy), [caseStudy]);
  const presentationStage = caseStudy.livePresentationStage === 'initial' ? 'initial' : 'full';
  const isStaged = hasStagedLiveCase(caseStudy);
  const activeStageIndex = getActiveLiveStageIndex(caseStudy);
  const activeStage = caseStudy.liveStages?.[activeStageIndex];
  const questions = presentationCaseStudy.questions || [];
  const activeIndex = Math.min(liveState?.stepIndex || 0, Math.max(questions.length - 1, 0));
  const activeQuestion = questions[activeIndex];
  const totalQuestions = questions.length;
  const progress = totalQuestions ? Math.round(((activeIndex + 1) / totalQuestions) * 100) : 0;
  const responseGroup = activeQuestion ? liveResponses?.[String(activeQuestion.questionNumber)] : null;
  const participants = Array.isArray(liveResponses?.__participants) ? liveResponses.__participants : [];
  const mySummary = participants.find((participant) => participant.participantId === participantId) || null;
  const myActiveAnswer = activeQuestion ? mySummary?.answers?.[String(activeQuestion.questionNumber)] : null;
  const activeCounts = Array.isArray(responseGroup?.counts) ? responseGroup.counts : [];
  const revealedQuestionNumbers = Array.isArray(caseStudy.revealedQuestionNumbers) ? caseStudy.revealedQuestionNumbers.map(String) : [];
  const isActiveAnswerRevealed = Boolean(liveState?.revealAnswers || (activeQuestion && revealedQuestionNumbers.includes(String(activeQuestion.questionNumber))));
  const routes = drugLibrary?.metadata?.routes || [];
  const frequencies = drugLibrary?.metadata?.frequencies || [];
  const drugs = drugLibrary?.items || [];
  const [draftAnswer, setDraftAnswer] = useState('');
  const [draftSelection, setDraftSelection] = useState([]);
  const [structuredAnswer, setStructuredAnswer] = useState({});

  useEffect(() => {
    setDraftAnswer('');
    setDraftSelection([]);
    setStructuredAnswer({});
  }, [activeQuestion?.questionNumber]);

  const canSubmitStructured = useMemo(() => {
    if (!activeQuestion || activeQuestion.questionType !== 'WorkthroughTask') {
      return false;
    }

    if (activeQuestion.taskType === 'AddAllergy') {
      return Boolean((structuredAnswer.drug || '').trim() && (structuredAnswer.reaction || '').trim());
    }

    if (activeQuestion.taskType === 'PrescribeMedication') {
      return Boolean((structuredAnswer.drug || '').trim() && (structuredAnswer.route || '').trim() && (structuredAnswer.frequency || '').trim());
    }

    return Boolean((draftAnswer || '').trim());
  }, [activeQuestion, structuredAnswer, draftAnswer]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!activeQuestion || !onSubmitAnswer || sessionEnded || myActiveAnswer) {
      return;
    }

    if (activeQuestion.questionType === 'MultipleAnswer') {
      await onSubmitAnswer(activeQuestion.questionNumber, draftSelection);
      return;
    }

    if (activeQuestion.questionType === 'WorkthroughTask') {
      if (['AddAllergy', 'PrescribeMedication'].includes(activeQuestion.taskType)) {
        await onSubmitAnswer(activeQuestion.questionNumber, structuredAnswer);
        return;
      }

      await onSubmitAnswer(activeQuestion.questionNumber, draftAnswer);
      return;
    }

    await onSubmitAnswer(activeQuestion.questionNumber, draftAnswer);
  };

  const renderAnswerInput = () => {
    if (!activeQuestion) {
      return null;
    }

    if (activeQuestion.questionType === 'MultipleChoice' || activeQuestion.questionType === 'DrugChoice') {
      return (
        <Form.Group className="mb-3">
          {(activeQuestion.answerOptions || []).map((option) => (
            <Form.Check
              key={option}
              type="radio"
              name={`question-${activeQuestion.questionNumber}`}
              id={`question-${activeQuestion.questionNumber}-${option}`}
              label={option}
              checked={draftAnswer === option}
              onChange={() => setDraftAnswer(option)}
              className="mb-2"
            />
          ))}
        </Form.Group>
      );
    }

    if (activeQuestion.questionType === 'MultipleAnswer') {
      const options = activeQuestion.optionsLabels || activeQuestion.answerOptions || [];
      return (
        <Form.Group className="mb-3">
          {options.map((option) => (
            <Form.Check
              key={option}
              type="checkbox"
              id={`question-${activeQuestion.questionNumber}-${option}`}
              label={option}
              checked={draftSelection.includes(option)}
              onChange={(event) => {
                if (event.target.checked) {
                  setDraftSelection((current) => [...current, option]);
                } else {
                  setDraftSelection((current) => current.filter((item) => item !== option));
                }
              }}
              className="mb-2"
            />
          ))}
        </Form.Group>
      );
    }

    if (activeQuestion.questionType === 'CarePlan') {
      return (
        <Form.Group className="mb-3">
          <Form.Label>Your response</Form.Label>
          <Form.Control as="textarea" rows={4} value={draftAnswer} onChange={(event) => setDraftAnswer(event.target.value)} />
        </Form.Group>
      );
    }

    if (activeQuestion.questionType === 'WorkthroughTask') {
      if (activeQuestion.taskType === 'AddAllergy') {
        return (
          <>
            <Alert variant="light">Complete the allergy action as structured fields.</Alert>
            <Form.Group className="mb-3">
              <Form.Label>Allergy / substance</Form.Label>
              <Form.Control value={structuredAnswer.drug || ''} onChange={(event) => setStructuredAnswer((current) => ({ ...current, drug: event.target.value }))} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Reaction</Form.Label>
              <Form.Control value={structuredAnswer.reaction || ''} onChange={(event) => setStructuredAnswer((current) => ({ ...current, reaction: event.target.value }))} />
            </Form.Group>
          </>
        );
      }

      if (activeQuestion.taskType === 'PrescribeMedication') {
        return (
          <>
            <Alert variant="light">Complete the prescribing action as structured fields.</Alert>
            <Form.Group className="mb-3">
              <Form.Label>Drug</Form.Label>
              <Form.Select value={structuredAnswer.drug || ''} onChange={(event) => setStructuredAnswer((current) => ({ ...current, drug: event.target.value }))}>
                <option value="">Select drug</option>
                {drugs.map((item) => <option key={item.id} value={item.drugName}>{item.drugName}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Route</Form.Label>
              <Form.Select value={structuredAnswer.route || ''} onChange={(event) => setStructuredAnswer((current) => ({ ...current, route: event.target.value }))}>
                <option value="">Select route</option>
                {routes.map((route) => <option key={route} value={route}>{route}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Frequency</Form.Label>
              <Form.Select value={structuredAnswer.frequency || ''} onChange={(event) => setStructuredAnswer((current) => ({ ...current, frequency: event.target.value }))}>
                <option value="">Select frequency</option>
                {frequencies.map((frequency) => <option key={frequency} value={frequency}>{frequency}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Indication</Form.Label>
              <Form.Control value={structuredAnswer.indication || ''} onChange={(event) => setStructuredAnswer((current) => ({ ...current, indication: event.target.value }))} />
            </Form.Group>
          </>
        );
      }

      return (
        <Form.Group className="mb-3">
          <Form.Label>Your response</Form.Label>
          <Form.Control as="textarea" rows={4} value={draftAnswer} onChange={(event) => setDraftAnswer(event.target.value)} />
        </Form.Group>
      );
    }

    return (
      <Form.Group className="mb-3">
        <Form.Label>Your response</Form.Label>
        <Form.Control type="text" value={draftAnswer} onChange={(event) => setDraftAnswer(event.target.value)} />
      </Form.Group>
    );
  };

  return (
    <>
      <Container className="mt-4 mb-3">
        {sessionEnded ? (
          <Alert variant="info">
            <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap">
              <span>This live session has ended. Please end your session when you are ready.</span>
              {onLeave ? (
                <Button type="button" variant="primary" size="sm" onClick={onLeave}>
                  End session
                </Button>
              ) : null}
            </div>
          </Alert>
        ) : null}
        <Card className="container-shadow mb-3">
          <Card.Body>
          <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
            <div>
              <h3 className="mb-1">{caseStudy.case_study_name || 'Live case'}</h3>
              <p className="text-muted mb-2">Session code: {liveState?.sessionCode}</p>
              <Badge bg="secondary">
                {totalQuestions ? `Question ${activeIndex + 1} of ${totalQuestions}` : 'Waiting for the first question'}
              </Badge>
              {mySummary ? (
                <Badge bg="success" className="ms-2">
                  {mySummary.correctCount} / {mySummary.totalScorable} correct{mySummary.score === null || mySummary.score === undefined ? '' : ` (${mySummary.score}%)`}
                </Badge>
              ) : null}
              <div className="small text-muted">
                {isStaged
                  ? `The lecturer is presenting ${activeStage?.title || `stage ${activeStageIndex + 1}`}.`
                  : presentationStage === 'initial' ? 'The lecturer is presenting the initial scenario.' : 'More case information has been revealed.'}
              </div>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              {onLeave ? (
                <Button type="button" variant="outline-secondary" onClick={onLeave}>
                  Leave live session
                </Button>
              ) : null}
            </div>
          </div>
          {totalQuestions ? <ProgressBar now={progress} className="mt-3" label={`${progress}%`} /> : null}
          </Card.Body>
        </Card>

      </Container>

      <CaseStudyDisplay data={presentationCaseStudy} hideQuestions readOnly />

      <Container className="mb-5">
        {activeQuestion ? (
          <Card className="container-shadow">
            <Card.Body>
            <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
              <h4 className="mb-0">Question {activeQuestion.questionNumber}</h4>
              <Badge bg="primary">{activeQuestion.questionType}</Badge>
            </div>
            <h5>{activeQuestion.questionTitle}</h5>
            <p>{activeQuestion.questionText}</p>
            <Form onSubmit={handleSubmit} className="mt-4">
              {renderAnswerInput()}
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <Button
                  type="submit"
                  disabled={
                    sessionEnded
                    || Boolean(myActiveAnswer)
                    || !onSubmitAnswer
                    || (activeQuestion.questionType === 'WorkthroughTask'
                      ? !canSubmitStructured
                      : (
                      activeQuestion.questionType === 'MultipleAnswer'
                        ? draftSelection.length === 0
                        : !String(draftAnswer).trim()
                    ))
                  }
                >
                  {myActiveAnswer ? 'Answer submitted' : 'Submit answer'}
                </Button>
                <span className="text-muted">{responseGroup?.totalResponses || 0} learners have responded so far.</span>
              </div>
            </Form>
            {myActiveAnswer ? (
              <Alert variant={myActiveAnswer.isCorrect === true ? 'success' : myActiveAnswer.isCorrect === false ? 'danger' : 'info'} className="mt-3 mb-0">
                <div><strong>Your answer:</strong> {myActiveAnswer.answer || 'Blank response'}</div>
                {myActiveAnswer.isCorrect === true ? <div className="mt-1">Correct</div> : null}
                {myActiveAnswer.isCorrect === false ? <div className="mt-1">Incorrect</div> : null}
              </Alert>
            ) : null}
            {isActiveAnswerRevealed ? (
              <Alert variant={myActiveAnswer?.isCorrect === false ? 'danger' : 'success'} className="mt-3 mb-0">
                <div><strong>Answer:</strong> {renderExpectedAnswer(activeQuestion.taskConfig || activeQuestion.answer)}</div>
                {activeQuestion.answerExplanation ? <div className="mt-2"><strong>Explanation:</strong> {activeQuestion.answerExplanation}</div> : null}
              </Alert>
            ) : (
              <Alert variant="light" className="mt-3 mb-0">Answer hidden until the lecturer reveals it. Follow along and discuss before the reveal.</Alert>
            )}
            {isActiveAnswerRevealed && activeCounts.length ? (
              <Alert variant="light" className="mt-3 mb-0">
                <strong>Class answers:</strong>
                {activeCounts.length ? (
                  <div className="mt-3">
                    {activeCounts.map((item) => {
                      const percentage = responseGroup?.totalResponses ? Math.round((item.count / responseGroup.totalResponses) * 100) : 0;
                      return (
                        <div key={item.answer || 'blank'} className="mt-2">
                          <div className="d-flex justify-content-between align-items-center gap-2">
                            <span>{item.answer || 'Blank response'}</span>
                            <span>{item.count} ({percentage}%)</span>
                          </div>
                          <ProgressBar now={percentage} variant="success" />
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </Alert>
            ) : null}
            </Card.Body>
          </Card>
        ) : (
          <Alert variant="light">No question is active in this live session yet. The lecturer can sync the case and move the class onto the first question when ready.</Alert>
        )}
      </Container>
    </>
  );
};

export default LiveSessionView;
