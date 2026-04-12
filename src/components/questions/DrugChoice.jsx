import React, { useMemo, useState } from 'react';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Row from 'react-bootstrap/Row';

const DrugChoice = ({ question, prescriptions = [] }) => {
  const [input, setInput] = useState('');
  const [badgeText, setBadgeText] = useState('');
  const [badgeType, setBadgeType] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const options = useMemo(
    () => Array.from(new Set(prescriptions.map((item) => item.drug).filter(Boolean))).sort(),
    [prescriptions]
  );

  const checkAnswer = () => {
    setSubmitted(true);
    if (input === question.answer) {
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
              <Form.Select value={input} disabled={submitted} aria-label="select an option" onChange={(event) => setInput(event.target.value)}>
                <option value="" disabled>Select an option</option>
                {options.map((item) => <option value={item} key={item}>{item}</option>)}
              </Form.Select>
              <Button type="button" variant="primary" onClick={checkAnswer} disabled={!input || submitted}>Submit</Button>
            </InputGroup>
          </Form>
        </Col>
      </Row>
    </Container>
  );
};

export default DrugChoice;
