import React, { useMemo, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Row from 'react-bootstrap/Row';
import CaseStudyDisplay from '../../Case_study_display';
import { gradeAnswers, isObjectiveQuestion, isWorkthroughTask, normalizeCaseStudy } from '../../lib/caseStudy';

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

const CaseSessionPlayer = ({ session, drugLibrary, onSave, onSubmit, onBack, saving, grading, notice }) => {
  const caseStudy = useMemo(() => normalizeCaseStudy(session.caseSnapshot), [session.caseSnapshot]);
  const [answers, setAnswers] = useState(session.answers || {});
  const [reflection, setReflection] = useState(() => session.progress?.reflection || '');
  const [showTaskPanel, setShowTaskPanel] = useState(true);
  const progress = session.progress || {};
  const routes = drugLibrary?.metadata?.routes || [];
  const frequencies = drugLibrary?.metadata?.frequencies || [];
  const drugOptions = drugLibrary?.items || [];
  const breakdownMap = useMemo(() => {
    const entries = (grading?.breakdown || progress.breakdown || []).map((item) => [String(item.questionNumber), item]);
    return Object.fromEntries(entries);
  }, [grading, progress.breakdown]);

  const localGrade = useMemo(() => gradeAnswers(caseStudy, answers), [caseStudy, answers]);
  const isSubmitted = session.status === 'completed' || Boolean(grading);

  const updateAnswer = (questionNumber, value) => {
    if (isSubmitted) {
      return;
    }
    setAnswers((current) => ({ ...current, [String(questionNumber)]: value }));
  };

  const updateStructuredAnswer = (questionNumber, field, value) => {
    if (isSubmitted) {
      return;
    }

    setAnswers((current) => ({
      ...current,
      [String(questionNumber)]: {
        ...(current[String(questionNumber)] || {}),
        [field]: value,
      },
    }));
  };

  const saveProgress = () => {
    onSave(answers, { ...progress, reflection });
  };

  const submitCase = () => {
    onSubmit(answers, { ...progress, reflection });
  };

  return (
    <>
      <Container className="mt-4 mb-3">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <Button type="button" variant="outline-secondary" onClick={onBack}>Back to dashboard</Button>
          <div className="d-flex gap-2">
            <Button type="button" variant="outline-primary" onClick={() => setShowTaskPanel(true)}>
              Open tasks
            </Button>
            {!isSubmitted ? (
              <>
                <Button type="button" variant="outline-primary" onClick={saveProgress} disabled={saving}>Save progress</Button>
                <Button type="button" variant="success" onClick={submitCase} disabled={saving}>Submit case</Button>
              </>
            ) : null}
          </div>
        </div>
      </Container>

      <CaseStudyDisplay data={caseStudy} hideQuestions />

      <Offcanvas show={showTaskPanel} onHide={() => setShowTaskPanel(false)} placement="end" scroll backdrop={false}>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>{session.title}</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <p className="text-muted">Complete the questions, save progress, and submit when ready.</p>
          {notice ? <Alert variant={notice.variant}>{notice.message}</Alert> : null}
          <Alert variant="light">
            Current score preview: <strong>{localGrade.score}%</strong> ({localGrade.correct}/{localGrade.total})
          </Alert>
          {caseStudy.questions.map((question) => {
            const result = breakdownMap[String(question.questionNumber)];
            const structuredAnswer = answers[String(question.questionNumber)] || {};
            return (
              <div key={question.questionNumber} className="border rounded p-3 mb-3 bg-light">
                <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                  <strong>Q{question.questionNumber}: {question.questionTitle}</strong>
                  <Badge bg={isObjectiveQuestion(question) || isWorkthroughTask(question) ? 'primary' : 'secondary'}>{question.questionType}</Badge>
                </div>
                <p className="small text-muted">{question.questionText}</p>
                {question.questionType === 'WorkthroughTask' ? (
                  <>
                    <Alert variant="light" className="py-2">
                      Task type: <strong>{question.taskType || 'General'}</strong>
                    </Alert>
                    {question.taskType === 'AddAllergy' ? (
                      <Row className="g-2">
                        <div className="col-12">
                          <Form.Control
                            disabled={isSubmitted}
                            value={structuredAnswer.drug || ''}
                            onChange={(event) => updateStructuredAnswer(question.questionNumber, 'drug', event.target.value)}
                            placeholder="Allergy / substance"
                          />
                        </div>
                        <div className="col-12">
                          <Form.Control
                            disabled={isSubmitted}
                            value={structuredAnswer.reaction || ''}
                            onChange={(event) => updateStructuredAnswer(question.questionNumber, 'reaction', event.target.value)}
                            placeholder="Reaction"
                          />
                        </div>
                      </Row>
                    ) : null}

                    {question.taskType === 'PrescribeMedication' ? (
                      <Row className="g-2">
                        <div className="col-12">
                          <Form.Select
                            disabled={isSubmitted}
                            value={structuredAnswer.drug || ''}
                            onChange={(event) => updateStructuredAnswer(question.questionNumber, 'drug', event.target.value)}
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
                            value={structuredAnswer.route || ''}
                            onChange={(event) => updateStructuredAnswer(question.questionNumber, 'route', event.target.value)}
                          >
                            <option value="">Select route</option>
                            {routes.map((route) => <option key={route} value={route}>{route}</option>)}
                          </Form.Select>
                        </div>
                        <div className="col-12">
                          <Form.Select
                            disabled={isSubmitted}
                            value={structuredAnswer.frequency || ''}
                            onChange={(event) => updateStructuredAnswer(question.questionNumber, 'frequency', event.target.value)}
                          >
                            <option value="">Select frequency</option>
                            {frequencies.map((frequency) => <option key={frequency} value={frequency}>{frequency}</option>)}
                          </Form.Select>
                        </div>
                        <div className="col-12">
                          <Form.Control
                            disabled={isSubmitted}
                            value={structuredAnswer.indication || ''}
                            onChange={(event) => updateStructuredAnswer(question.questionNumber, 'indication', event.target.value)}
                            placeholder="Indication"
                          />
                        </div>
                      </Row>
                    ) : null}

                    {!['AddAllergy', 'PrescribeMedication'].includes(question.taskType) ? (
                      <Form.Control
                        disabled={isSubmitted}
                        as="textarea"
                        rows={3}
                        value={answers[String(question.questionNumber)] || ''}
                        onChange={(event) => updateAnswer(question.questionNumber, event.target.value)}
                        placeholder="Describe the action you would take"
                      />
                    ) : null}
                  </>
                ) : null}

                {(question.questionType === 'MultipleChoice' || question.questionType === 'DrugChoice') ? (
                  <Form.Select disabled={isSubmitted} value={answers[String(question.questionNumber)] || ''} onChange={(event) => updateAnswer(question.questionNumber, event.target.value)}>
                    <option value="">Select an answer</option>
                    {(question.answerOptions || []).map((option) => <option key={option} value={option}>{option}</option>)}
                  </Form.Select>
                ) : null}

                {question.questionType === 'Calculation' ? (
                  <Form.Control disabled={isSubmitted} type="number" value={answers[String(question.questionNumber)] || ''} onChange={(event) => updateAnswer(question.questionNumber, event.target.value)} placeholder="Enter your answer" />
                ) : null}

                {question.questionType === 'MultipleAnswer' ? (
                  <>
                    {(question.optionsLabels || []).map((label, index) => (
                      <Form.Control
                        key={`${question.questionNumber}-${label}-${index}`}
                        className="mb-2"
                        disabled={isSubmitted}
                        value={answers[String(question.questionNumber)]?.[index] || ''}
                        placeholder={label}
                        onChange={(event) => {
                          const next = [...(answers[String(question.questionNumber)] || [])];
                          next[index] = event.target.value;
                          updateAnswer(question.questionNumber, next);
                        }}
                      />
                    ))}
                  </>
                ) : null}

                {question.questionType === 'CarePlan' ? (
                  <Form.Control disabled={isSubmitted} as="textarea" rows={3} value={answers[String(question.questionNumber)] || ''} onChange={(event) => updateAnswer(question.questionNumber, event.target.value)} placeholder="Write your reflection" />
                ) : null}

                {isSubmitted && result ? (
                  <div className="mt-3">
                    {result.isCorrect === true ? <Alert variant="success" className="py-2 mb-2">Correct answer</Alert> : null}
                    {result.isCorrect === false ? <Alert variant="danger" className="py-2 mb-2">Incorrect answer</Alert> : null}
                    {result.correctAnswer !== null && result.correctAnswer !== undefined ? (
                      <p className="small mb-2"><strong>Expected answer:</strong> {renderExpectedAnswer(result.correctAnswer)}</p>
                    ) : null}
                    {question.answerExplanation ? (
                      <Alert variant="info" className="mb-0">
                        <strong>Explanation:</strong> {question.answerExplanation}
                      </Alert>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}

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
              <Button type="button" variant="success" onClick={submitCase} disabled={saving}>Submit case</Button>
            </div>
          ) : null}
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
};

export default CaseSessionPlayer;
