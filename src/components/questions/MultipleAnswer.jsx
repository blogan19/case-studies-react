import React, { useMemo, useState } from 'react';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';

const MultipleAnswer = ({ question }) => {
  const answers = question.answer || [];
  const [userAnswers, setUserAnswers] = useState(Array(answers.length).fill(''));
  const [answerResults, setAnswerResults] = useState([]);

  const canSubmit = useMemo(
    () => userAnswers.length === answers.length && userAnswers.every((item) => String(item).trim() !== ''),
    [answers.length, userAnswers]
  );

  const checkAnswer = () => {
    const results = answers.map((answer, index) => String(answer) === String(userAnswers[index]));
    setAnswerResults(results);
  };

  const handleChange = (index, value) => {
    setUserAnswers((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  };

  return (
    <Container className="mt-3 p-3 bg-light text-dark rounded">
      <Row>
        <Col xs={12}>
          <h3>Q{question.questionNumber}: {question.questionTitle}</h3>
        </Col>
      </Row>
      <hr />
      <Row>
        <Col xs={6}>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>{question.questionText}</Form.Label>
            </Form.Group>
            {question.optionsLabels.map((label, index) => (
              <Form.Control key={`${label}-${index}`} type="text" placeholder={label} className="mt-1" value={userAnswers[index] || ''} onChange={(event) => handleChange(index, event.target.value)} />
            ))}
            {canSubmit ? (
              <Button type="button" variant="primary" className="mt-3" onClick={checkAnswer}>Submit</Button>
            ) : null}
            {answerResults.length > 0 ? (
              <div className="mt-3">
                {answerResults.map((isCorrect, index) => (
                  <Badge key={`${userAnswers[index]}-${index}`} bg={isCorrect ? 'success' : 'danger'} className="me-2">
                    {userAnswers[index]}
                  </Badge>
                ))}
              </div>
            ) : null}
          </Form>
        </Col>
      </Row>
    </Container>
  );
};

export default MultipleAnswer;
