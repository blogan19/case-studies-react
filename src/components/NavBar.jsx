import React, { useState } from 'react';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import NavDropdown from 'react-bootstrap/NavDropdown';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert';

const NavBar = ({
  user,
  currentView,
  onViewChange,
  onOpenCases,
  onOpenEpma,
  onSelectPatient,
  onLoginClick,
  onCreateAccountClick,
  onLogout,
  activeSessionCode,
  sessionInput,
  onSessionInputChange,
  onJoinLive,
  studentError,
  recentPatientAccesses = [],
}) => {
  const [showLiveJoin, setShowLiveJoin] = useState(false);
  const recentCharts = recentPatientAccesses.slice(0, 5);

  return (
    <>
      <Navbar className="app-shell-nav py-3" expand="md">
        <Container>
          <Navbar.Brand href="#" className="app-shell-nav__brand fw-bold">MediCase Teaching Platform</Navbar.Brand>
          <Navbar.Toggle />
          <Navbar.Collapse className="justify-content-between align-items-center gap-3">
            <Nav className="me-auto gap-2">
              {!user ? (
                <Button type="button" variant="light" className="app-shell-nav__button" onClick={() => onViewChange('public')}>Home</Button>
              ) : user.role === 'educator' ? (
                <>
                  <Button type="button" variant="light" className={`app-shell-nav__button ${currentView === 'educator' ? 'app-shell-nav__button--active' : ''}`} onClick={() => onViewChange('educator')}>
                    Educator dashboard
                  </Button>
                  {activeSessionCode ? (
                    <Button type="button" variant="light" className={`app-shell-nav__button ${currentView === 'lecturer-live' ? 'app-shell-nav__button--active' : ''}`} onClick={() => onViewChange('lecturer-live')}>
                      Projector view
                    </Button>
                  ) : null}
                </>
              ) : (
                <>
                  <Button type="button" variant="light" className={`app-shell-nav__button ${currentView === 'student-home' ? 'app-shell-nav__button--active' : ''}`} onClick={() => onViewChange('student-home')}>
                    Home
                  </Button>
                  <NavDropdown title="Menu" id="student-menu-dropdown" menuVariant="light" className="app-shell-nav__dropdown">
                    <NavDropdown.Item onClick={onOpenEpma}>ePMA</NavDropdown.Item>
                    <NavDropdown.Item onClick={onOpenCases}>Case studies</NavDropdown.Item>
                    <NavDropdown.Item onClick={() => setShowLiveJoin(true)}>Join live session</NavDropdown.Item>
                  </NavDropdown>
                  <NavDropdown title="Patients" id="student-patient-dropdown" menuVariant="light" className="app-shell-nav__dropdown">
                    <NavDropdown.Item onClick={onOpenEpma}>Find a patient</NavDropdown.Item>
                    <NavDropdown.Divider />
                    {recentCharts.length ? recentCharts.map((patient) => (
                      <NavDropdown.Item key={patient.id} onClick={() => onSelectPatient(patient.id)}>
                        <div className="fw-semibold">{patient.fullName}</div>
                        <div className="small text-muted">
                          {patient.lastAccessedAt ? `Viewed ${new Date(patient.lastAccessedAt).toLocaleString('en-GB')}` : 'Previously viewed'}
                        </div>
                      </NavDropdown.Item>
                    )) : (
                      <NavDropdown.Item disabled>No recent charts</NavDropdown.Item>
                    )}
                  </NavDropdown>
                </>
              )}
            </Nav>
            <Nav className="align-items-center gap-3">
              {user ? (
                <>
                  <Button type="button" variant="light" className="app-shell-nav__button" onClick={onLogout}>Log out</Button>
                </>
              ) : (
                <>
                  <Button type="button" variant="light" className="app-shell-nav__button" onClick={onLoginClick}>Sign in</Button>
                  <Button type="button" variant="light" className="app-shell-nav__button" onClick={onCreateAccountClick}>Create account</Button>
                </>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Modal show={showLiveJoin} onHide={() => setShowLiveJoin(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Join a live session</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form
            onSubmit={(event) => {
              const joined = onJoinLive(event);
              if (joined) {
                setShowLiveJoin(false);
              }
            }}
          >
            <Form.Group className="mb-3" controlId="navSessionCode">
              <Form.Label>Live session code</Form.Label>
              <Form.Control
                type="text"
                value={sessionInput}
                onChange={(event) => onSessionInputChange(event.target.value.toUpperCase())}
                placeholder="e.g. A1B2C3"
              />
            </Form.Group>
            {studentError ? <Alert variant="warning">{studentError}</Alert> : null}
            <div className="d-flex justify-content-end gap-2">
              <Button type="button" variant="outline-secondary" onClick={() => setShowLiveJoin(false)}>Cancel</Button>
              <Button type="submit">Join session</Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default NavBar;
