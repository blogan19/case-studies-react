import React from 'react';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Card from 'react-bootstrap/Card';
import ListGroup from 'react-bootstrap/ListGroup';
import ProgressBar from 'react-bootstrap/ProgressBar';

function getQuestionOptions(question) {
  if (!question) {
    return [];
  }

  if (Array.isArray(question.answerOptions) && question.answerOptions.length > 0) {
    return question.answerOptions;
  }

  if (Array.isArray(question.optionsLabels) && question.optionsLabels.length > 0) {
    return question.optionsLabels;
  }

  return [];
}

const LiveResponseSummary = ({ liveState, liveResponses, caseStudy }) => {
  if (!liveState?.sessionCode) {
    return null;
  }

  const questions = caseStudy?.questions || [];
  const activeIndex = Math.max(0, Math.min(liveState.stepIndex || 0, Math.max(questions.length - 1, 0)));
  const activeQuestion = questions[activeIndex];
  const responseGroup = activeQuestion ? liveResponses?.[String(activeQuestion.questionNumber)] : null;
  const totalResponses = responseGroup?.totalResponses || 0;
  const configuredOptions = getQuestionOptions(activeQuestion);
  const countedAnswers = responseGroup?.counts || [];
  const chartRows = configuredOptions.length
    ? configuredOptions.map((option) => {
        const match = countedAnswers.find((item) => item.answer === option);
        return {
          answer: option,
          count: match?.count || 0,
        };
      })
    : countedAnswers;

  return (
    <Card className="container-shadow mb-4">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <h5 className="mb-0">Live Responses</h5>
          {activeQuestion ? <Badge bg="secondary">Question {activeQuestion.questionNumber}</Badge> : null}
        </div>

        {!activeQuestion ? (
          <Alert variant="light" className="mb-0">No active question selected yet.</Alert>
        ) : (
          <>
            <p className="mb-3">
              <strong>{activeQuestion.questionTitle}</strong>
              <br />
              <span className="text-muted">{totalResponses} responses received</span>
            </p>

            {chartRows.length ? (
              <div className="mb-3">
                {chartRows.map((item) => {
                  const isCorrect = Array.isArray(activeQuestion.answer)
                    ? activeQuestion.answer.map(String).includes(String(item.answer))
                    : String(activeQuestion.answer) === String(item.answer);
                  const percentage = totalResponses ? Math.round((item.count / totalResponses) * 100) : 0;

                  return (
                    <div key={`${activeQuestion.questionNumber}-${item.answer}`} className="mb-3">
                      <div className="d-flex justify-content-between align-items-center gap-3 mb-1">
                        <span>
                          {item.answer || 'Blank response'}{' '}
                          {liveState.revealAnswers && isCorrect ? <Badge bg="success">Correct</Badge> : null}
                        </span>
                        <span className="text-muted">{item.count} ({percentage}%)</span>
                      </div>
                      <ProgressBar
                        now={percentage}
                        variant={liveState.revealAnswers && isCorrect ? 'success' : 'primary'}
                        label={percentage ? `${percentage}%` : ''}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <Alert variant="light">No answers submitted for this question yet.</Alert>
            )}

            {liveState.revealAnswers && activeQuestion.answer !== undefined ? (
              <Alert variant="success">
                <strong>Correct answer:</strong>{' '}
                {Array.isArray(activeQuestion.answer) ? activeQuestion.answer.join(', ') : String(activeQuestion.answer)}
                {activeQuestion.answerExplanation ? (
                  <>
                    <br />
                    <span>{activeQuestion.answerExplanation}</span>
                  </>
                ) : null}
              </Alert>
            ) : null}

            {responseGroup?.recent?.length ? (
              <>
                <strong>Recent submissions</strong>
                <ListGroup className="mt-2">
                  {responseGroup.recent.map((item) => (
                    <ListGroup.Item key={`${activeQuestion.questionNumber}-${item.participantName}-${item.updatedAt}`}>
                      <div className="d-flex justify-content-between align-items-center gap-3">
                        <span>{item.participantName}: {item.answer || 'Blank response'}</span>
                        <small className="text-muted">{new Date(item.updatedAt).toLocaleTimeString()}</small>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </>
            ) : null}
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default LiveResponseSummary;
