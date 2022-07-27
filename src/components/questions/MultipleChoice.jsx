import React, { useState } from 'react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Badge from 'react-bootstrap/Badge';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';

const MultipleChoice = (props) => {
  const [badgeText, setBadgeText] = useState('');
  const [badgeType, setBadgeType] = useState('');
  const [selected, setSelected] = useState();
  const [submitBtn, setSubmitbtn] = useState(false);
  const [radioDisabled, setRadioDisabled] = useState(false);

  const question = props.question

  const handleChange = (selectedOption) => {
    setSelected(selectedOption);
    
    setBadgeText('attempted');
    setBadgeType('info')

    setSubmitbtn(true);
  };

  const handleClick = () => {
    setRadioDisabled(true);
    setSubmitbtn(false);
    console.log(selected)
    //answer feedback

    const answer = question.answer
    if (selected === answer) {
      setBadgeText('Correct')
      setBadgeType('success')
    } else {
      setBadgeText('Incorrect')
      setBadgeType('danger')
    }
  };

  return (
    <>
      <Container className="mt-3 p-3 bg-light text-dark rounded">
        <Row>
          <Col xs={12}>
            <h3>
              Q{question.questionNumber}: {question.questionTitle} <Badge bg={badgeType}>{badgeText}</Badge>{' '}
            </h3>
          </Col>
        </Row>
        <hr />
        <p>{question.questionText}</p>
        <Row>
          <Form>
            {question.answerOptions.map(
              (answerOption, index) => (
                  <Form.Check
                    type="radio"
                    key={answerOption}
                    label={answerOption}
                    name={question.questionNumber}
                    id={`radioQ${question.questionNumber}${index}`}
                    onChange={() => handleChange(answerOption)}
                    disabled={radioDisabled}
                  />
              )
            )}
          </Form>
        </Row>
        <Row>
          <Col>
            <Button
              variant="primary"
              className="mt-3"
              onClick={handleClick}
              style={submitBtn ? {} : { display: 'none' }}
            >Submit</Button>
          </Col>
        </Row>
      </Container>
    </>
  );
};
export default MultipleChoice;
