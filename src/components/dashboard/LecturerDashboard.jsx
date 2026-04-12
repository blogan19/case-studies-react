import React from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import CaseStudyEdit from '../../Case_study_edit';
import LiveSessionControls from './LiveSessionControls';
import LiveResponseSummary from './LiveResponseSummary';

const LecturerDashboard = ({
  caseStudy,
  caseStudies,
  analytics,
  liveState,
  liveResponses,
  drugLibrary,
  onChange,
  onImportDrugLibrary,
  onSave,
  onLoadCase,
  onPublish,
  onClone,
  onArchive,
  onRefreshAnalytics,
  onSyncLive,
  onSetLiveStep,
  onSetLiveReveal,
  isSaving,
  activeSessionCode,
}) => {
  return (
    <Container className="mt-4 mb-5">
      <Row className="g-4 mb-4">
        <Col md={4}>
          <Card className="container-shadow h-100">
            <Card.Body>
              <h5>Cases</h5>
              <p className="display-6 mb-0">{caseStudies.length}</p>
              <small className="text-muted">Draft, published, and archived</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="container-shadow h-100">
            <Card.Body>
              <h5>Live Session</h5>
              <p className="display-6 mb-0">{activeSessionCode || 'None'}</p>
              <small className="text-muted">Current teaching code</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="container-shadow h-100">
            <Card.Body>
              <h5>Average Score</h5>
              <p className="display-6 mb-0">{analytics?.averageScore ?? 0}%</p>
              <small className="text-muted">For the selected case</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {caseStudy?.id ? (
        <Alert variant="info" className="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <span>Selected case: <strong>{caseStudy.case_study_name || 'Untitled case'}</strong></span>
          <span>
            <Button type="button" size="sm" variant="outline-primary" onClick={() => onRefreshAnalytics(caseStudy.id)}>
              Refresh analytics
            </Button>{' '}
            <Button type="button" size="sm" variant="outline-secondary" onClick={() => onClone(caseStudy.id)}>
              Clone
            </Button>{' '}
            <Button type="button" size="sm" variant="outline-danger" onClick={() => onArchive(caseStudy.id)}>
              Archive
            </Button>
          </span>
        </Alert>
      ) : null}

      <LiveSessionControls
        liveState={liveState}
        totalQuestions={caseStudy?.questions?.length || 0}
        onChangeStep={onSetLiveStep}
        onToggleReveal={onSetLiveReveal}
        onSyncLive={() => onSyncLive(caseStudy)}
        syncing={isSaving}
      />

      <LiveResponseSummary liveState={liveState} liveResponses={liveResponses} caseStudy={caseStudy} />

      {analytics ? (
        <Card className="container-shadow mb-4">
          <Card.Body>
            <h5 className="mb-3">Case Analytics</h5>
            <Row className="g-3">
              <Col md={3}><strong>Attempts:</strong> {analytics.attempts}</Col>
              <Col md={3}><strong>Completed:</strong> {analytics.completedAttempts}</Col>
              <Col md={3}><strong>Completion rate:</strong> {analytics.completionRate}%</Col>
              <Col md={3}><strong>Average score:</strong> {analytics.averageScore}%</Col>
            </Row>
            {analytics.recentAttempts?.length ? (
              <div className="mt-3">
                <strong>Recent learner activity</strong>
                {analytics.recentAttempts.map((attempt) => (
                  <div key={attempt.id} className="border rounded p-2 mt-2">
                    <div>{attempt.learnerName} ({attempt.learnerEmail})</div>
                    <small className="text-muted">{attempt.status} | score: {attempt.score ?? 'n/a'} | updated: {new Date(attempt.updatedAt).toLocaleString()}</small>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted mt-3 mb-0">No learner attempts yet for this case.</p>
            )}
          </Card.Body>
        </Card>
      ) : null}

      <CaseStudyEdit
        caseStudy={caseStudy}
        caseStudies={caseStudies}
        drugLibrary={drugLibrary}
        onImportDrugLibrary={onImportDrugLibrary}
        onChange={onChange}
        onSave={onSave}
        onLoadCase={onLoadCase}
        onPublish={onPublish}
        isSaving={isSaving}
        activeSessionCode={activeSessionCode}
      />
    </Container>
  );
};

export default LecturerDashboard;
