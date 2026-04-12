import React from 'react';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import StudentTile from './StudentTile';

const StudentDashboard = ({ library, sessions, onStartCase, onResumeSession, onBack }) => {
  return (
    <div className="student-page">
      <Container className="mt-4 student-page__content">
        <div className="student-dashboard-shell">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
            <div>
              <h3 className="mb-1">Case studies</h3>
              <p className="student-dashboard-header__copy mb-0">Browse revision cases by topic and continue saved work.</p>
            </div>
            <Button type="button" variant="outline-secondary" onClick={onBack}>Back to home</Button>
          </div>

          <section className="student-dashboard-section">
            <div className="student-dashboard-section__header">
              <h4>My saved case sessions</h4>
              <p className="text-muted mb-0">Resume in-progress work or review completed submissions.</p>
            </div>
            {sessions.length ? (
              <Row className="g-4">
                {sessions.map((session) => (
                  <Col md={6} xl={4} key={session.id}>
                    <StudentTile
                      title={session.title}
                      description={`${session.summary || 'Saved revision session'}${session.score != null ? ` Score: ${session.score}.` : ''}`}
                      eyebrow={session.status === 'completed' ? 'Review saved session' : 'Resume saved session'}
                      icon={session.status === 'completed' ? 'bi bi-clipboard2-check' : 'bi bi-play-circle'}
                      onClick={() => onResumeSession(session.id)}
                      variant={session.status === 'completed' ? 'slate' : 'amber'}
                    />
                  </Col>
                ))}
              </Row>
            ) : (
              <div className="student-dashboard-empty">
                <i className="bi bi-inbox" aria-hidden="true" />
                <p className="mb-0">No saved case sessions yet.</p>
              </div>
            )}
          </section>

          <section className="student-dashboard-section">
            <div className="student-dashboard-section__header">
              <h4>Revision library</h4>
              <p className="text-muted mb-0">Open any published case and start straight from the tile.</p>
            </div>
            <Row className="g-4">
              {library.map((caseStudy) => {
                const description = caseStudy.publishedData?.short_description || caseStudy.summary || 'Interactive revision case';
                const revisionTopic = caseStudy.publishedData?.revision_topic || 'General';

                return (
                  <Col md={6} xl={4} key={caseStudy.id}>
                    <StudentTile
                      title={caseStudy.title}
                      description={description}
                      eyebrow={revisionTopic}
                      icon="bi bi-folder2-open"
                      onClick={() => onStartCase(caseStudy.id)}
                      variant="blue"
                    />
                  </Col>
                );
              })}
            </Row>
          </section>
        </div>
      </Container>
    </div>
  );
};

export default StudentDashboard;
