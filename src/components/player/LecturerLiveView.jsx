import React from 'react';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Card from 'react-bootstrap/Card';
import Container from 'react-bootstrap/Container';
import ProgressBar from 'react-bootstrap/ProgressBar';
import Table from 'react-bootstrap/Table';
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

const LecturerLiveView = ({ liveState, liveResponses }) => {
  const caseStudy = normalizeCaseStudy(liveState?.payload || {});
  const questions = caseStudy.questions || [];
  const totalQuestions = questions.length;
  const activeIndex = Math.max(0, Math.min(liveState?.stepIndex || 0, Math.max(totalQuestions - 1, 0)));
  const activeQuestion = questions[activeIndex];
  const responseGroup = activeQuestion ? liveResponses?.[String(activeQuestion.questionNumber)] : null;
  const revealedQuestionNumbers = Array.isArray(caseStudy.revealedQuestionNumbers) ? caseStudy.revealedQuestionNumbers.map(String) : [];
  const isActiveAnswerRevealed = Boolean(liveState?.revealAnswers || (activeQuestion && revealedQuestionNumbers.includes(String(activeQuestion.questionNumber))));
  const participants = Array.isArray(liveResponses?.__participants) ? liveResponses.__participants : [];
  const participantCount = Number(liveResponses?.__participantCount || participants.length || 0);
  const answeredParticipantCount = Number(liveResponses?.__answeredParticipantCount || participants.filter((participant) => participant.answeredCount > 0).length || 0);
  const totalResponses = responseGroup?.totalResponses || 0;
  const correctCount = responseGroup?.correctCount || 0;
  const incorrectCount = responseGroup?.incorrectCount || 0;
  const correctPercentage = totalResponses ? Math.round((correctCount / totalResponses) * 100) : 0;
  const incorrectPercentage = totalResponses ? Math.round((incorrectCount / totalResponses) * 100) : 0;
  const options = activeQuestion?.answerOptions?.length
    ? activeQuestion.answerOptions
    : activeQuestion?.optionsLabels?.length
      ? activeQuestion.optionsLabels
      : responseGroup?.counts?.map((item) => item.answer) || [];

  return (
    <Container fluid className="mt-3 mb-5 px-4">
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
                {isActiveAnswerRevealed ? (
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
                <p className="text-muted">
                  {totalResponses} responses received for this question. {answeredParticipantCount} of {participantCount} joined learner{participantCount === 1 ? '' : 's'} have answered at least one question.
                </p>
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
                            {option} {isActiveAnswerRevealed && isCorrect ? <Badge bg="success">Correct</Badge> : null}
                          </span>
                          <span className="text-muted">{count} ({percentage}%)</span>
                        </div>
                        <ProgressBar now={percentage} variant={isActiveAnswerRevealed && isCorrect ? 'success' : 'primary'} />
                      </div>
                    );
                  })
                ) : (
                  <Alert variant="light">Responses will appear here as students submit them.</Alert>
                )}
                {isActiveAnswerRevealed ? (
                  <div className="mt-4 pt-2 border-top">
                    <h5 className="mb-3">Correct versus incorrect</h5>
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center gap-2 mb-1">
                        <span>Correct</span>
                        <span className="text-muted">{correctCount} ({correctPercentage}%)</span>
                      </div>
                      <ProgressBar now={correctPercentage} variant="success" />
                    </div>
                    <div>
                      <div className="d-flex justify-content-between align-items-center gap-2 mb-1">
                        <span>Incorrect</span>
                        <span className="text-muted">{incorrectCount} ({incorrectPercentage}%)</span>
                      </div>
                      <ProgressBar now={incorrectPercentage} variant="danger" />
                    </div>
                  </div>
                ) : null}
                {responseGroup?.recent?.length ? (
                  <div className="mt-4">
                    <h5 className="mb-3">Recent submissions</h5>
                    <div className="lecturer-live-recent">
                      {responseGroup.recent.map((item) => (
                        <div key={`${item.participantName}-${item.updatedAt}`} className="lecturer-live-recent__item">
                          <div className="fw-semibold">{item.participantName}</div>
                          <div>{item.answer || 'Blank response'}</div>
                          <div className="small text-muted">{new Date(item.updatedAt).toLocaleTimeString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </Card.Body>
            </Card>
          </div>
          <div className="col-12">
            <Card className="container-shadow">
              <Card.Body>
                <h4 className="mb-3">Student scores</h4>
                {participants.length ? (
                  <Table responsive hover className="mb-0 align-middle">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Answered</th>
                        <th>Correct</th>
                        <th>Score</th>
                        <th>Current answer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {participants.map((participant) => {
                        const currentAnswer = activeQuestion ? participant.answers?.[String(activeQuestion.questionNumber)] : null;
                        return (
                          <tr key={participant.participantId}>
                            <td>{participant.participantName || 'Learner'}</td>
                            <td>{participant.answeredCount} / {participant.totalQuestions}</td>
                            <td>{participant.correctCount} / {participant.totalScorable}</td>
                            <td>{participant.score === null || participant.score === undefined ? 'Not scored' : `${participant.score}%`}</td>
                            <td>{currentAnswer?.answer || <span className="text-muted">No answer yet</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                ) : (
                  <Alert variant="light" className="mb-0">No students have joined this live session yet.</Alert>
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
