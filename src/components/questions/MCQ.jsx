import React, { useState } from 'react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Badge from 'react-bootstrap/Badge';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';

const MCQ = () => {
  const [attempted, setAttempted] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selected, setSelected] = useState();
  const [submitBtn, setSubmitbtn] = useState(false);
  const [radioDisabled, setRadioDisabled] = useState(false);

  const questions = [
    {
      questionNo: 1,
      questionTitle: 'Apixaban',
      questionText:
        'The patients renal creatinine increases to 290 micromoles. What would be the most appropriate action for the apixaban?',
      answerOptions: [
        {
          answerText: 'Hold the apixaban and bridge with enoxaparin',
          isCorrect: false,
        },
        { answerText: 'Switch to warfarin', isCorrect: false },
        { answerText: 'Reduce the dose to 2.5mg twice daily', isCorrect: true },
        { answerText: 'Hold all anticoagulation', isCorrect: false },
        { answerText: 'Leave the dose as 5mg BD', isCorrect: false },
      ],
      answerExplanation:
        'The Patients crcl is now belo 30ml/min and this is the correct dose as per product literature',
    },
  ];

  const handleChange = (selectedOption) => {
    //set selected option
    setSelected(selectedOption);
    //set attempted badge
    setAttempted('attempted');
    //display submit button
    setSubmitbtn(true);
  };

  const handleClick = () => {
    //display radios and button
    setRadioDisabled(true);
    setSubmitbtn(false);

    //answer feedback
    if (selected == true) {
      console.log('correct');
      alert('correct');
    } else {
      alert('incorrect');
    }
    
  };

  return (
    <>
      <Container className="mt-3 p-3 bg-light text-dark  rounded">
        <Row>
          <Col xs={9}>
            <h3>
              Q{questions[currentQuestion].questionNo}:{' '}
              {questions[currentQuestion].questionTitle}
            </h3>
          </Col>
          <Col xs={3}>
            <Badge bg="info">{attempted}</Badge>{' '}
          </Col>
        </Row>
        <hr />
        <p>{questions[currentQuestion].questionText}</p>
        <Row>
          <Form>
            {questions[currentQuestion].answerOptions.map(
              (answerOption, index) => (
                <Form.Check
                  type="radio"
                  key={answerOption.answerText}
                  label={answerOption.answerText}
                  name={questions[currentQuestion].questionNo}
                  id={`radio${index}`}
                  onChange={() => handleChange(answerOption.isCorrect)}
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
export default MCQ;
