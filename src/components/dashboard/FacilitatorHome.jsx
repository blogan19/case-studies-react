import React from 'react';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import StudentTile from './StudentTile';

const FacilitatorHome = ({
  caseCount = 0,
  showAdminTile = false,
  onCreateCaseStudy,
  onOpenCaseLibrary,
  onOpenAdminSettings,
}) => {
  return (
    <div className="student-page">
      <Container className="mt-4 student-page__content">
        <div className="student-dashboard-shell">
          <div className="student-dashboard-header">
            <div>
              <h2 className="mb-2">Facilitator workspace</h2>
              <p className="student-dashboard-header__copy mb-0">
                Create and manage case studies from one place. Start a new case or reopen an existing one to edit, share, review, or present it.
              </p>
            </div>
          </div>

          <Row className="g-4 mb-4">
            <Col lg={showAdminTile ? 4 : 6}>
              <StudentTile
                title="Create new case study"
                description="Open the case builder to create a fresh case study with patient details, clinical content, and assessment questions."
                icon="bi bi-file-earmark-plus"
                eyebrow="Authoring"
                onClick={onCreateCaseStudy}
                variant="blue"
              />
            </Col>
            <Col lg={showAdminTile ? 4 : 6}>
              <StudentTile
                title="View and share existing case studies"
                description="Open your case library to publish self-paced cases, start live classrooms, share links, and review availability."
                icon="bi bi-folder2-open"
                eyebrow={`${caseCount} case${caseCount === 1 ? '' : 's'} available`}
                onClick={onOpenCaseLibrary}
                variant="blue"
              />
            </Col>
            {showAdminTile ? (
              <Col lg={4}>
                <StudentTile
                  title="Admin settings"
                  description="Manage platform routes, standard frequencies, and the shared drug library used across facilitator workspaces."
                  icon="bi bi-sliders"
                  eyebrow="Facilitator-admin"
                  onClick={onOpenAdminSettings}
                  variant="blue"
                />
              </Col>
            ) : null}
          </Row>

        </div>
      </Container>
    </div>
  );
};

export default FacilitatorHome;
