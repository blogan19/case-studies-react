import React from 'react';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Card from 'react-bootstrap/Card';
import Container from 'react-bootstrap/Container';
import ProgressBar from 'react-bootstrap/ProgressBar';
import { normalizeCaseStudy } from '../../lib/caseStudy';

const renderExpectedAnswer = (expectedAnswer) => {
  if (expectedAnswer === null || expectedAnswer === undefined) {
    return '';
  }

  if (Array.isArray(expectedAnswer)) {
    return expectedAnswer.join(', ');
  }

  if (typeof expectedAnswer === 'object') {
    return Object.entries(expectedAnswer)
      .filter(([_key, value]) => value)
      .map(([key, value]) => `${key}: ${value}`)
      .join(' | ');
  }

  return String(expectedAnswer);
};

const LecturerLiveView = ({ liveState, liveResponses, onChangeStep, onToggleReveal }) => {
  const caseStudy = normalizeCaseStudy(liveState?.payload || {});
  const questions = caseStudy.questions || [];
  const totalQuestions = questions.length;
  const activeIndex = Math.max(0, Math.min(liveState?.stepIndex || 0, Math.max(totalQuestions - 1, 0)));
  const activeQuestion = questions[activeIndex];
  const responseGroup = activeQuestion ? liveResponses?.[String(activeQuestion.questionNumber)] : null;
  const totalResponses = responseGroup?.totalResponses || 0;
  const options = activeQuestion?.answerOptions?.length
    ? activeQuestion.answerOptions
    : activeQuestion?.optionsLabels?.length
      ? activeQuestion.optionsLabels
      : responseGroup?.counts?.map((item) => item.answer) || [];

  return (
    <Container fluid className="mt-4 mb-5 px-4">
      <Card className="container-shadow mb-4">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div>
              <h2 className="mb-1">{caseStudy.case_study_name || 'Live class case'}</h2>
              <p className="text-muted mb-0">Session code: {liveState?.sessionCode}</p>
            </div>
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <Badge bg="secondary">{totalQuestions ? `Question ${activeIndex + 1} of ${totalQuestions}` : 'Waiting to start'}</Badge>
              <Badge bg={liveState?.revealAnswers ? 'success' : 'warning'}>
                {liveState?.revealAnswers ? 'Answer revealed' : 'Answer hidden'}
              </Badge>
            </div>
          </div>
        </Card.Body>
      </Card>

      <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap mb-4">
        <ButtonGroup>
          <Button type="button" variant="outline-primary" disabled={activeIndex <= 0} onClick={() => onChangeStep(activeIndex - 1)}>
            Previous
          </Button>
          <Button type="button" variant="outline-primary" disabled={activeIndex >= Math.max(totalQuestions - 1, 0)} onClick={() => onChangeStep(activeIndex + 1)}>
            Next
          </Button>
        </ButtonGroup>
        <Button type="button" variant={liveState?.revealAnswers ? 'warning' : 'success'} onClick={() => onToggleReveal(!liveState?.revealAnswers)}>
          {liveState?.revealAnswers ? 'Hide answer' : 'Reveal answer'}
        </Button>
      </div>

      {activeQuestion ? (
        <div className="row g-4">
          <div className="col-lg-7">
            <Card className="container-shadow h-100">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
                  <h3 className="mb-0">{activeQuestion.questionTitle}</h3>
                  <Badge bg="primary">{activeQuestion.questionType}</Badge>
                </div>
                <p className="lead">{activeQuestion.questionText}</p>
                {options.length ? (
                  <ul className="fs-5">
                    {options.map((option) => <li key={option}>{option}</li>)}
                  </ul>
                ) : null}
                {liveState?.revealAnswers ? (
                  <Alert variant="success" className="mt-4 mb-0">
                    <strong>Correct answer:</strong>{' '}
                    {renderExpectedAnswer(activeQuestion.taskConfig || activeQuestion.answer)}
                    {activeQuestion.answerExplanation ? (
                      <>
                        <br />
                        {activeQuestion.answerExplanation}
                      </>
                    ) : null}
                  </Alert>
                ) : null}
              </Card.Body>
            </Card>
          </div>
          <div className="col-lg-5">
            <Card className="container-shadow h-100">
              <Card.Body>
                <h4 className="mb-3">Live response distribution</h4>
                <p className="text-muted">{totalResponses} responses received</p>
                {options.length ? (
                  options.map((option) => {
                    const count = responseGroup?.counts?.find((item) => item.answer === option)?.count || 0;
                    const percentage = totalResponses ? Math.round((count / totalResponses) * 100) : 0;
                    const isCorrect = Array.isArray(activeQuestion.answer)
                      ? activeQuestion.answer.map(String).includes(String(option))
                      : String(activeQuestion.answer) === String(option);

                    return (
                      <div key={option} className="mb-3">
                        <div className="d-flex justify-content-between align-items-center gap-2 mb-1">
                          <span>
                            {option} {liveState?.revealAnswers && isCorrect ? <Badge bg="success">Correct</Badge> : null}
                          </span>
                          <span className="text-muted">{count} ({percentage}%)</span>
                        </div>
                        <ProgressBar now={percentage} variant={liveState?.revealAnswers && isCorrect ? 'success' : 'primary'} />
                      </div>
                    );
                  })
                ) : (
                  <Alert variant="light">Responses will appear here as students submit them.</Alert>
                )}
              </Card.Body>
            </Card>
          </div>
        </div>
      ) : (
        <Alert variant="light">No active question yet. Publish the case and move to the first question when you are ready to start teaching.</Alert>
      )}
    </Container>
  );
};

export default LecturerLiveView;
