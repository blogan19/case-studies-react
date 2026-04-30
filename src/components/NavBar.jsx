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
  onOpenCaseLibrary,
  onOpenAdminSettings,
  onOpenCases,
  onOpenEpma,
  onSelectPatient,
  onLoginClick,
  onCreateAccountClick,
  onForgotPassword,
  onLogout,
  activeSessionCode,
  sessionInput,
  onSessionInputChange,
  onJoinLive,
  studentError,
  recentPatientAccesses = [],
}) => {
  const [showLiveJoin, setShowLiveJoin] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const recentCharts = recentPatientAccesses.slice(0, 5);
  const isEducatorUser = user?.role === 'educator' || user?.role === 'educator_admin';
  const isEducatorAdmin = user?.role === 'educator_admin';
  const accountRoleLabel = {
    student: 'Student',
    educator: 'Educator',
    educator_admin: 'Facilitator admin',
  }[user?.role] || user?.role || 'Not recorded';
  const handleBrandClick = (event) => {
    event.preventDefault();

    if (!user) {
      onViewChange('public');
      return;
    }

    if (isEducatorUser) {
      onViewChange('educator-home');
      return;
    }

    onViewChange('student-home');
  };

  return (
    <>
      <Navbar className="app-shell-nav py-3" expand="md">
        <Container fluid>
          <Navbar.Brand href="#" onClick={handleBrandClick} className="app-shell-nav__brand fw-bold">Medicase</Navbar.Brand>
          <Navbar.Toggle />
          <Navbar.Collapse className="justify-content-between align-items-center gap-3">
            <Nav className="me-auto gap-2">
              {!user ? null : isEducatorUser ? (
                <>
                  {isEducatorAdmin ? (
                    <Button type="button" variant="light" className={`app-shell-nav__button ${currentView === 'educator-admin' ? 'app-shell-nav__button--active' : ''}`} onClick={onOpenAdminSettings}>
                      Admin settings
                    </Button>
                  ) : null}
                </>
              ) : (
                <>
                </>
              )}
            </Nav>
            <Nav className="align-items-center gap-3">
              {user ? (
                <>
                  {!isEducatorUser ? (
                    <NavDropdown title="Previously Accessed Patients" id="student-patient-dropdown" menuVariant="light" align="end" className="app-shell-nav__dropdown">
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
                  ) : null}
                  <NavDropdown
                    title={user.displayName || user.email}
                    id="account-settings-dropdown"
                    menuVariant="light"
                    align="end"
                    className="app-shell-nav__dropdown app-shell-nav__account-dropdown"
                  >
                    <NavDropdown.Item onClick={() => setShowAccountSettings(true)}>Account settings</NavDropdown.Item>
                    <NavDropdown.Item onClick={onForgotPassword}>Reset password</NavDropdown.Item>
                    <NavDropdown.Divider />
                    <NavDropdown.Item onClick={onLogout}>Log out</NavDropdown.Item>
                  </NavDropdown>
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

      <Modal show={showAccountSettings} onHide={() => setShowAccountSettings(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Account settings</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="account-settings-readonly">
            <div className="account-settings-readonly__row">
              <span>Name</span>
              <strong>{user?.displayName || 'Not recorded'}</strong>
            </div>
            <div className="account-settings-readonly__row">
              <span>Email</span>
              <strong>{user?.email || 'Not recorded'}</strong>
            </div>
            <div className="account-settings-readonly__row">
              <span>Role</span>
              <strong>{accountRoleLabel}</strong>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={() => setShowAccountSettings(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default NavBar;
