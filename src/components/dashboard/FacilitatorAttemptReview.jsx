import React, { useEffect, useMemo, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Table from 'react-bootstrap/Table';
import { gradeAnswers, isObjectiveQuestion, isWorkthroughTask, normalizeCaseStudy } from '../../lib/caseStudy';

const formatDateTime = (value) => {
  if (!value) {
    return 'Not yet';
  }
  try {
    return new Date(value).toLocaleString('en-GB');
  } catch (_error) {
    return value;
  }
};

const renderValue = (value) => {
  if (value === null || value === undefined || value === '') {
    return 'No answer submitted';
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean).join(', ') || 'No answer submitted';
  }

  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([_key, entryValue]) => entryValue !== null && entryValue !== undefined && String(entryValue).trim() !== '')
      .map(([key, entryValue]) => `${key}: ${entryValue}`)
      .join(' | ') || 'No answer submitted';
  }

  return String(value);
};

const FacilitatorAttemptReview = ({ caseStudy, attempt, onBack, onSaveReview, onResetAttempt, savingReview }) => {
  const normalizedCaseStudy = useMemo(
    () => normalizeCaseStudy(attempt?.caseSnapshot || caseStudy?.draftData || caseStudy || {}),
    [attempt?.caseSnapshot, caseStudy]
  );
  const [facilitatorMark, setFacilitatorMark] = useState('');
  const [facilitatorFeedback, setFacilitatorFeedback] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    setFacilitatorMark(
      attempt?.facilitatorMark === null || attempt?.facilitatorMark === undefined || attempt?.facilitatorMark === ''
        ? ''
        : String(attempt.facilitatorMark)
    );
    setFacilitatorFeedback(String(attempt?.facilitatorFeedback || ''));
  }, [attempt]);

  const grading = useMemo(() => {
    if (!attempt) {
      return { score: 0, correct: 0, total: 0, breakdown: [] };
    }

    const computed = gradeAnswers(normalizedCaseStudy, attempt.answers || {});
    const savedBreakdown = Array.isArray(attempt.progress?.breakdown) ? attempt.progress.breakdown : [];
    const breakdown = computed.breakdown.map((item) => {
      const saved = savedBreakdown.find((entry) => String(entry.questionNumber) === String(item.questionNumber));
      return saved ? { ...item, ...saved } : item;
    });

    return {
      ...computed,
      score: attempt.score ?? computed.score,
      breakdown,
    };
  }, [attempt, normalizedCaseStudy]);

  if (!attempt) {
    return (
      <div className="student-page">
        <Container className="mt-4 mb-5 student-page__content">
          <div className="student-dashboard-shell">
            <div className="student-dashboard-header">
              <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                <div>
                  <h2 className="mb-2">Student attempt review</h2>
                  <p className="student-dashboard-header__copy mb-0">
                    Select an attempt from the case results screen to review the learner&apos;s answers.
                  </p>
                </div>
                <Button type="button" variant="secondary" onClick={onBack}>Back</Button>
              </div>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  const scorableQuestions = normalizedCaseStudy.questions.filter((question) => isObjectiveQuestion(question) || isWorkthroughTask(question));
  const reflection = attempt.progress?.reflection || '';
  const handleSaveReview = async () => {
    if (!onSaveReview) {
      return;
    }

    await onSaveReview(attempt.caseStudyId, attempt.id, facilitatorMark, facilitatorFeedback);
  };

  return (
    <div className="student-page">
      <Container className="mt-4 mb-5 student-page__content">
        <div className="student-dashboard-shell">
          <div className="student-dashboard-header">
            <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
              <div>
                <h2 className="mb-2">Student attempt review</h2>
                <p className="student-dashboard-header__copy mb-1">{attempt.title}</p>
                <div className="small text-muted">
                  Reviewing {attempt.learnerName || 'Unknown learner'} {attempt.learnerEmail ? `(${attempt.learnerEmail})` : ''}
                </div>
              </div>
              <div className="d-flex gap-2 flex-wrap">
                <Button type="button" variant="outline-light" onClick={() => setShowResetConfirm(true)}>
                  Reset attempt
                </Button>
                <Button type="button" variant="secondary" onClick={onBack}>Back to results</Button>
              </div>
            </div>
          </div>

          <div className="student-dashboard-section">
            <div className="student-dashboard-section__header">
              <h4 className="mb-1">Attempt summary</h4>
              <p className="student-dashboard-header__copy mb-0">
                High-level attempt details before reviewing answers question by question.
              </p>
            </div>
            <div className="table-responsive">
              <Table bordered className="facilitator-library-table align-middle mb-0">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Scorable questions</th>
                    <th>Started</th>
                    <th>Completed</th>
                    <th>Last updated</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="text-capitalize">{String(attempt.status || '').replace('_', ' ') || 'Unknown'}</td>
                    <td>{attempt.score ?? grading.score ?? 0}%</td>
                    <td>{scorableQuestions.length}</td>
                    <td>{formatDateTime(attempt.startedAt)}</td>
                    <td>{formatDateTime(attempt.completedAt)}</td>
                    <td>{formatDateTime(attempt.updatedAt)}</td>
                  </tr>
                </tbody>
              </Table>
            </div>
          </div>

          <div className="student-dashboard-section">
            <div className="student-dashboard-section__header">
              <h4 className="mb-1">Facilitator marking</h4>
              <p className="student-dashboard-header__copy mb-0">
                Record an overall mark and written feedback for this learner&apos;s submission.
              </p>
            </div>
            <div className="row g-3">
              <div className="col-md-4">
                <Form.Group controlId="facilitatorMark">
                  <Form.Label>Overall mark (%)</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={facilitatorMark}
                    onChange={(event) => setFacilitatorMark(event.target.value)}
                    placeholder="Enter mark"
                  />
                </Form.Group>
              </div>
              <div className="col-12">
                <Form.Group controlId="facilitatorFeedback">
                  <Form.Label>Written feedback</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    value={facilitatorFeedback}
                    onChange={(event) => setFacilitatorFeedback(event.target.value)}
                    placeholder="Add feedback for the learner"
                  />
                </Form.Group>
              </div>
            </div>
            <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap mt-3">
              <div className="small text-muted">
                {attempt.facilitatorMarkedAt
                  ? `Last saved ${formatDateTime(attempt.facilitatorMarkedAt)}${attempt.facilitatorMarkedByName ? ` by ${attempt.facilitatorMarkedByName}` : ''}`
                  : 'No facilitator review saved yet.'}
              </div>
              <Button type="button" variant="primary" onClick={handleSaveReview} disabled={savingReview}>
                {savingReview ? 'Saving review...' : 'Save review'}
              </Button>
            </div>
          </div>

          {reflection ? (
            <div className="student-dashboard-section">
              <div className="student-dashboard-section__header">
                <h4 className="mb-1">Learner reflection</h4>
              </div>
              <Alert variant="light" className="mb-0">
                {reflection}
              </Alert>
            </div>
          ) : null}

          <div className="student-dashboard-section">
            <div className="student-dashboard-section__header">
              <h4 className="mb-1">Question review</h4>
              <p className="student-dashboard-header__copy mb-0">
                Review the submitted answer alongside the expected answer and stored explanation.
              </p>
            </div>
            <div className="d-grid gap-3">
              {normalizedCaseStudy.questions.map((question) => {
                const result = grading.breakdown.find((item) => String(item.questionNumber) === String(question.questionNumber)) || null;
                const submittedAnswer = attempt.answers?.[String(question.questionNumber)];

                return (
                  <Card key={question.questionNumber} className="shadow-sm border-0">
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-2">
                        <div>
                          <div className="fw-semibold">Q{question.questionNumber}: {question.questionTitle}</div>
                          <div className="small text-muted">{question.questionText}</div>
                        </div>
                        <div className="d-flex gap-2 flex-wrap">
                          <Badge bg={(isObjectiveQuestion(question) || isWorkthroughTask(question)) ? 'primary' : 'secondary'}>
                            {question.questionType}
                          </Badge>
                          {result?.isCorrect === true ? <Badge bg="success">Correct</Badge> : null}
                          {result?.isCorrect === false ? <Badge bg="danger">Incorrect</Badge> : null}
                          {result?.isCorrect === null ? <Badge bg="secondary">Manual review</Badge> : null}
                        </div>
                      </div>

                      <div className="mb-2">
                        <strong>Submitted answer:</strong> {renderValue(submittedAnswer)}
                      </div>

                      {result?.correctAnswer !== null && result?.correctAnswer !== undefined ? (
                        <div className="mb-2">
                          <strong>Expected answer:</strong> {renderValue(result.correctAnswer)}
                        </div>
                      ) : null}

                      {question.answerExplanation ? (
                        <Alert variant="info" className="mb-0">
                          <strong>Explanation:</strong> {question.answerExplanation}
                        </Alert>
                      ) : null}
                    </Card.Body>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </Container>

      <Modal show={showResetConfirm} onHide={() => setShowResetConfirm(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Reset student attempt?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            This will clear the answers, score, completion status, and facilitator review for{' '}
            <strong>{attempt.learnerName || 'this learner'}</strong>.
          </p>
          <p className="mb-0">
            The learner will be able to open this case again, even if it is limited to one attempt.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={() => setShowResetConfirm(false)}>Cancel</Button>
          <Button
            type="button"
            variant="danger"
            disabled={savingReview}
            onClick={async () => {
              setShowResetConfirm(false);
              await onResetAttempt?.(attempt.caseStudyId, attempt.id);
            }}
          >
            Reset attempt
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default FacilitatorAttemptReview;
