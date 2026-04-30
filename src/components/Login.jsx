import React, { useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Row from 'react-bootstrap/Row';

const Login = ({ onSubmit, loading, error, onForgotPassword, initialMode = 'login', onModeChange }) => {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('student');
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState('');

  React.useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  React.useEffect(() => {
    onModeChange?.(mode);
    setSubmitError('');
    if (mode === 'register') {
      setPassword('');
      setConfirmPassword('');
    }
  }, [mode, onModeChange]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (mode === 'register' && password !== confirmPassword) {
      setSubmitError('Passwords must match before you can create an account.');
      return;
    }

    setSubmitError('');
    onSubmit({ email, password, displayName, mode, role });
  };

  const toggleMode = () => {
    setMode((current) => (current === 'login' ? 'register' : 'login'));
    setPassword('');
    setConfirmPassword('');
    setSubmitError('');
  };

  return (
    <Form onSubmit={handleSubmit}>
      <div className="mb-4">
        <h1 className="login-landing__title mb-2">{mode === 'login' ? 'Sign in to continue' : 'Create an account'}</h1>
        <p className="text-muted mb-0">
          {mode === 'login'
            ? 'Use your existing account to continue into the teaching platform.'
            : 'Register a new account to access the teaching platform. Educator accounts require admin approval before they can be used.'}
        </p>
      </div>
      <Alert variant="info">
        Demo educator: `demo@casestudy.local / Demo123!` and demo student: `student@casestudy.local / Student123!` and demo admin: `admin@casestudy.local / Admin123!`.
      </Alert>
      {error ? <Alert variant="danger">{error}</Alert> : null}
      {submitError ? <Alert variant="danger">{submitError}</Alert> : null}
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
                <option value="educator">Request educator access</option>
              </Form.Select>
              {role === 'educator' ? (
                <div className="small text-muted mt-2">
                  Your account will stay inactive until a facilitator admin approves educator access.
                </div>
              ) : null}
            </Form.Group>
          </Row>
        </>
      ) : null}
      <Row className="mb-3">
        <Form.Group as={Col} controlId="formEmail">
          <Form.Label>Email</Form.Label>
          <Form.Control type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete={mode === 'register' ? 'email' : 'username'} />
        </Form.Group>
      </Row>
      <Row className="mb-3">
        <Form.Group as={Col} controlId="formPassword">
          <div className="d-flex justify-content-between align-items-center gap-3">
            <Form.Label className="mb-0">Password</Form.Label>
            {mode === 'login' ? (
              <Button
                variant="link"
                type="button"
                className="login-form__forgot-link"
                onClick={onForgotPassword}
              >
                Forgot your password?
              </Button>
            ) : null}
          </div>
          <InputGroup>
            <Form.Control
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            />
            <Button
              type="button"
              variant="outline-secondary"
              onMouseEnter={() => setShowPassword(true)}
              onMouseLeave={() => setShowPassword(false)}
              onFocus={() => setShowPassword(true)}
              onBlur={() => setShowPassword(false)}
              aria-label="Show password while hovering"
              title="Show password while hovering"
            >
              <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden="true" />
            </Button>
          </InputGroup>
        </Form.Group>
      </Row>
      {mode === 'register' ? (
        <Row className="mb-3">
          <Form.Group as={Col} controlId="formConfirmPassword">
            <Form.Label>Confirm password</Form.Label>
            <InputGroup>
              <Form.Control
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                isInvalid={Boolean(confirmPassword) && confirmPassword !== password}
                autoComplete="new-password"
              />
              <Button
                type="button"
                variant="outline-secondary"
                onMouseEnter={() => setShowPassword(true)}
                onMouseLeave={() => setShowPassword(false)}
                onFocus={() => setShowPassword(true)}
                onBlur={() => setShowPassword(false)}
                aria-label="Show confirm password while hovering"
                title="Show confirm password while hovering"
              >
                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden="true" />
              </Button>
              <Form.Control.Feedback type="invalid">
                Passwords must match.
              </Form.Control.Feedback>
            </InputGroup>
          </Form.Group>
        </Row>
      ) : null}
      <Row className="g-2">
        <Col xs="auto">
          <Button variant="success" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}
          </Button>
        </Col>
        <Col xs="auto">
          <Button variant="outline-secondary" type="button" onClick={toggleMode}>
            {mode === 'login' ? 'Need an account?' : 'Use existing account'}
          </Button>
        </Col>
      </Row>
    </Form>
  );
};

export default Login;
