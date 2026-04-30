import React from 'react';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Row from 'react-bootstrap/Row';
import StudentTile from './StudentTile';

const StudentHome = ({
  onOpenCases,
  onOpenEpma,
  onBack,
  sessionInput = '',
  onSessionInputChange,
  onJoinLive,
}) => {
  return (
    <div className="student-page">
      
      <Container className="mt-4 student-page__content ">
        <div className="student-dashboard-shell">
          <div className="student-dashboard-header shadow-sm rounded mb-1">
            <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
              <div>
                <h2 className="mb-2">Student workspace</h2>
                <p className="student-dashboard-header__copy mb-0">
                  Choose a study route below to open case studies or access the EPMA system.
                </p>
                <Button type="button" variant="outline-light" className="btn-sm mt-2" onClick={onBack}>
                  <i class="bi bi-arrow-left"></i>{' '}
                  Back
                </Button>
              </div>
             
            </div>    
          </div>
          <div className="student-dashboard-join shadow-sm rounded p-4">
            <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
              <div>
                <h5 className="mb-2">Join live session</h5>
                <Form className="mt-3" onSubmit={onJoinLive}>
                  <Form.Label htmlFor="student-live-session-code" className="mb-2">
                    Enter a live code to join a real-time session.
                  </Form.Label>
                  <InputGroup>
                    <Form.Control
                      id="student-live-session-code"
                      type="text"
                      value={sessionInput}
                      onChange={(event) => onSessionInputChange?.(event.target.value)}
                      placeholder="Enter live session code"
                    />
                    <Button type="submit" variant="primary" disabled={!String(sessionInput || '').trim()}>
                      Join
                    </Button>
                  </InputGroup>
                </Form>
              </div>
            </div>    
          </div>
            
        
          <Row className="g-4 mb-4">
            <Col lg={6}>
              <StudentTile
                title="ePMA"
                description="Practice prescribing with our ePMA simulator, designed to mirror the experience of real-world hospital systems. Build confidence and competence in a safe environment."
                icon="bi bi-capsule-pill"
                onClick={onOpenEpma}
                variant="blue"
              />
            </Col>
            <Col lg={6}>
              <StudentTile
                title="Case studies"
                description="Open revision cases by topic, review completed sessions, and work through self-paced cases prepared by lecturers."
                icon="bi bi-journal-medical"
                onClick={onOpenCases}
                variant="blue"
              />
            </Col>
          </Row>
        </div>
      </Container>
    </div>
  );
};

export default StudentHome;
