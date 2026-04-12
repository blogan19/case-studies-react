import React, { useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';

const Login = ({ onSubmit, loading, error, onForgotPassword }) => {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('demo@casestudy.local');
  const [password, setPassword] = useState('Demo123!');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('student');

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ email, password, displayName, mode, role });
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Alert variant="info">
        Demo educator: `demo@casestudy.local / Demo123!` and demo student: `student@casestudy.local / Student123!`.
      </Alert>
      {error ? <Alert variant="danger">{error}</Alert> : null}
      {mode === 'register' ? (
        <>
          <Row className="mb-3">
            <Form.Group as={Col} controlId="formDisplayName">
              <Form.Label>Display name</Form.Label>
              <Form.Control type="text" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </Form.Group>
          </Row>
          <Row className="mb-3">
            <Form.Group as={Col} controlId="formRole">
              <Form.Label>Account type</Form.Label>
              <Form.Select value={role} onChange={(event) => setRole(event.target.value)}>
                <option value="student">Student</option>
                <option value="educator">Educator</option>
              </Form.Select>
            </Form.Group>
          </Row>
        </>
      ) : null}
      <Row className="mb-3">
        <Form.Group as={Col} controlId="formEmail">
          <Form.Label>Email</Form.Label>
          <Form.Control type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </Form.Group>
      </Row>
      <Row className="mb-3">
        <Form.Group as={Col} controlId="formPassword">
          <div className="d-flex justify-content-between align-items-center gap-3">
            <Form.Label className="mb-0">Password</Form.Label>
            <Button
              variant="link"
              type="button"
              className="login-form__forgot-link"
              onClick={onForgotPassword}
            >
              Forgot your password?
            </Button>
          </div>
          <Form.Control type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </Form.Group>
      </Row>
      <Row className="g-2">
        <Col xs="auto">
          <Button variant="success" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}
          </Button>
        </Col>
        <Col xs="auto">
          <Button variant="outline-secondary" type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Need an account?' : 'Use existing account'}
          </Button>
        </Col>
      </Row>
    </Form>
  );
};

export default Login;
