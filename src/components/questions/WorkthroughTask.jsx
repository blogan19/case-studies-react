import React from 'react';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Card from 'react-bootstrap/Card';

const WorkthroughTask = ({ question }) => {
  return (
    <Card className="mb-3 container-shadow">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
          <strong>Task {question.questionNumber}: {question.questionTitle}</strong>
          <Badge bg="warning" text="dark">{question.taskType || 'Workthrough'}</Badge>
        </div>
        <p className="mb-2">{question.questionText}</p>
        <Alert variant="light" className="mb-0">
          Students complete this as a practical workthrough step and it can be marked against expected keywords.
        </Alert>
      </Card.Body>
    </Card>
  );
};

export default WorkthroughTask;
