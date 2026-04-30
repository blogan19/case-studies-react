import React, { useState } from 'react';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Modal from 'react-bootstrap/Modal';
import Table from 'react-bootstrap/Table';

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

const FacilitatorCaseResults = ({ caseStudy, analytics, onBack, onRefresh, onOpenAttempt, onResetAttempt }) => {
  const [feedbackTarget, setFeedbackTarget] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);

  if (!caseStudy) {
    return (
      <div className="student-page">
        <Container className="mt-4 mb-5 student-page__content">
          <div className="student-dashboard-shell">
            <div className="student-dashboard-header">
              <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                <div>
                  <h2 className="mb-2">Case results</h2>
                  <p className="student-dashboard-header__copy mb-0">
                    Choose a case study from the library to review student attempts.
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

  const recentAttempts = analytics?.recentAttempts || [];

  return (
    <div className="student-page">
      <Container className="mt-4 mb-5 student-page__content">
        <div className="student-dashboard-shell">
          <div className="student-dashboard-header">
            <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
              <div>
                <h2 className="mb-2">Case results</h2>
                <p className="student-dashboard-header__copy mb-1">
                  {caseStudy.title}
                </p>
                <div className="small text-white">
                  {caseStudy.draftData?.short_description || caseStudy.summary || 'No description added yet.'}
                </div>
              </div>
              <div className="d-flex gap-2 flex-wrap">
                <Button type="button" variant="outline-light" onClick={() => onRefresh(caseStudy.id)}>Refresh results</Button>
              </div>
            </div>
            <Button type="button" variant="outline-light" className="btn-sm m-3" onClick={onBack}><i className="bi-arrow-left"></i> Back</Button>
          </div>

          <div className="student-dashboard-section">
            <div className="student-dashboard-section__header">
              <h4 className="mb-1">Summary</h4>
              <p className="student-dashboard-header__copy mb-0">
                First pass review of activity and submission performance for this case study.
              </p>
            </div>
            <div className="table-responsive">
              <Table bordered className="facilitator-library-table align-middle mb-0">
                <thead>
                  <tr>
                    <th>Attempts</th>
                    <th>Completed</th>
                    <th>Reviewed</th>
                    <th>Completion rate</th>
                    <th>Average score</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{analytics?.attempts ?? 0}</td>
                    <td>{analytics?.completedAttempts ?? 0}</td>
                    <td>{analytics?.reviewedAttempts ?? 0}</td>
                    <td>{analytics?.completionRate ?? 0}%</td>
                    <td>{analytics?.averageScore ?? 0}%</td>
                  </tr>
                </tbody>
              </Table>
            </div>
          </div>

          <div className="student-dashboard-section">
            <div className="student-dashboard-section__header">
              <h4 className="mb-1">Recent attempts</h4>
              <p className="student-dashboard-header__copy mb-0">
                Latest student activity for this case. The next step will be opening full answer reviews from here.
              </p>
            </div>
            {recentAttempts.length ? (
              <div className="table-responsive">
                <Table bordered hover className="facilitator-library-table align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Learner</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Score</th>
                      <th>Review</th>
                      <th>Facilitator mark</th>
                      <th>Feedback</th>
                      <th>Last updated</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAttempts.map((attempt) => (
                      <tr key={attempt.id}>
                        <td>{attempt.learnerName || 'Unknown learner'}</td>
                        <td>{attempt.learnerEmail || 'Not recorded'}</td>
                        <td className="text-capitalize">{String(attempt.status || '').replace('_', ' ') || 'Unknown'}</td>
                        <td>{attempt.score ?? '-'}</td>
                        <td>
                          {attempt.facilitatorMarkedAt ? (
                            <div className="d-flex flex-column gap-1">
                              <Badge bg="success">Reviewed</Badge>
                              <div className="small text-muted">
                                {attempt.facilitatorMarkedByName ? `By ${attempt.facilitatorMarkedByName}` : 'Facilitator review saved'}
                              </div>
                            </div>
                          ) : (
                            <Badge bg="secondary">Pending</Badge>
                          )}
                        </td>
                        <td>{attempt.facilitatorMark ?? '-'}</td>
                        <td>
                          {attempt.facilitatorFeedback ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => setFeedbackTarget(attempt)}
                            >
                              View feedback
                            </Button>
                          ) : (
                            <span className="text-muted">No feedback</span>
                          )}
                        </td>
                        <td>{formatDateTime(attempt.updatedAt)}</td>
                        <td>
                          <div className="d-flex gap-2 flex-wrap">
                          <Button
                            type="button"
                            size="sm"
                            variant="dark"
                            onClick={() => onOpenAttempt?.(caseStudy.id, attempt.id)}
                          >
                            Review
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline-danger"
                            onClick={() => setResetTarget(attempt)}
                          >
                            Reset
                          </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            ) : (
              <div className="student-dashboard-empty">
                <i className="bi bi-journal-text" aria-hidden="true" />
                <div>No student attempts recorded yet.</div>
              </div>
            )}
          </div>
        </div>
      </Container>

      <Modal show={Boolean(feedbackTarget)} onHide={() => setFeedbackTarget(null)}>
        <Modal.Header closeButton>
          <Modal.Title>Facilitator feedback</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="fw-semibold mb-1">{feedbackTarget?.learnerName || 'Unknown learner'}</div>
          <div className="small text-muted mb-3">{feedbackTarget?.learnerEmail || 'Email not recorded'}</div>
          <div className="mb-2">
            <strong>Facilitator mark:</strong> {feedbackTarget?.facilitatorMark ?? '-'}
          </div>
          <div className="mb-2">
            <strong>Reviewed:</strong> {feedbackTarget?.facilitatorMarkedAt ? formatDateTime(feedbackTarget.facilitatorMarkedAt) : 'Not recorded'}
          </div>
          <div style={{ whiteSpace: 'pre-wrap' }}>
            {feedbackTarget?.facilitatorFeedback || 'No feedback recorded.'}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={() => setFeedbackTarget(null)}>Close</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(resetTarget)} onHide={() => setResetTarget(null)}>
        <Modal.Header closeButton>
          <Modal.Title>Reset student attempt?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            This will clear the answers, score, completion status, and facilitator review for{' '}
            <strong>{resetTarget?.learnerName || 'this learner'}</strong>.
          </p>
          <p className="mb-0">
            The attempt will return to in progress so the learner can open the case again, including one-attempt-only case studies.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={() => setResetTarget(null)}>Cancel</Button>
          <Button
            type="button"
            variant="danger"
            onClick={async () => {
              const target = resetTarget;
              setResetTarget(null);
              if (target) {
                await onResetAttempt?.(caseStudy.id, target.id);
              }
            }}
          >
            Reset attempt
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default FacilitatorCaseResults;
