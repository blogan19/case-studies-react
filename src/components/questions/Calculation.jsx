import React, { useMemo, useState } from 'react';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Row from 'react-bootstrap/Row';

const Calculation = ({ question }) => {
  const [input, setInput] = useState('');
  const [badgeText, setBadgeText] = useState('');
  const [badgeType, setBadgeType] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = useMemo(() => input.length > 0 && !submitted, [input, submitted]);

  const checkAnswer = () => {
    setSubmitted(true);
    if (String(input).trim() === String(question.answer)) {
      setBadgeText('Correct');
      setBadgeType('success');
    } else {
      setBadgeText('Incorrect');
      setBadgeType('danger');
    }
  };

  return (
    <Container className="mt-3 p-3 bg-light text-dark rounded">
      <Row>
        <Col xs={12}>
          <h3>
            Q{question.questionNumber}: {question.questionTitle} <Badge bg={badgeType}>{badgeText}</Badge>
          </h3>
        </Col>
      </Row>
      <hr />
      <Row>
        <Col xs={6}>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>{question.questionText}</Form.Label>
            </Form.Group>
            <InputGroup className="mb-3">
              <Form.Control disabled={submitted} type="text" placeholder="Enter Answer" value={input} onChange={(event) => setInput(event.target.value)} />
              <Button type="button" variant="primary" onClick={checkAnswer} disabled={!canSubmit}>Submit</Button>
            </InputGroup>
          </Form>
        </Col>
      </Row>
    </Container>
  );
};

export default Calculation;
