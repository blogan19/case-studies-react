import React from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Card from 'react-bootstrap/Card';

const LiveSessionControls = ({ liveState, totalQuestions, onChangeStep, onToggleReveal, onSyncLive, syncing }) => {
  if (!liveState?.sessionCode) {
    return null;
  }

  const maxIndex = Math.max(0, (totalQuestions || 1) - 1);
  const currentStep = Math.min(liveState.stepIndex || 0, maxIndex);
  const questionNumber = currentStep + 1;

  return (
    <Card className="container-shadow mb-4">
      <Card.Body>
        <h5 className="mb-3">Live Session Controls</h5>
        <Alert variant="light" className="mb-3">
          Session <strong>{liveState.sessionCode}</strong> is on question <strong>{questionNumber}</strong> of <strong>{Math.max(totalQuestions || 0, 1)}</strong>.
        </Alert>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <ButtonGroup>
            <Button type="button" variant="outline-primary" disabled={syncing || currentStep <= 0} onClick={() => onChangeStep(currentStep - 1)}>
              Previous
            </Button>
            <Button type="button" variant="outline-primary" disabled={syncing || currentStep >= maxIndex} onClick={() => onChangeStep(currentStep + 1)}>
              Next
            </Button>
          </ButtonGroup>
          <Button type="button" variant={liveState.revealAnswers ? 'warning' : 'outline-warning'} disabled={syncing} onClick={() => onToggleReveal(!liveState.revealAnswers)}>
            {liveState.revealAnswers ? 'Hide answer' : 'Reveal answer'}
          </Button>
          <Button type="button" variant="outline-success" disabled={syncing} onClick={onSyncLive}>
            Sync latest draft
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default LiveSessionControls;
