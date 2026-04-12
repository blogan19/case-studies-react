import React, { useState } from 'react';
import Alert from 'react-bootstrap/Alert';

const CaseInstructions = ({ instructions }) => {
  const [show, setShow] = useState(true);

  if (!show || !instructions) {
    return null;
  }

  return (
    <div className="mt-3">
      <Alert variant="info" onClose={() => setShow(false)} dismissible>
        <Alert.Heading>Case Instructions</Alert.Heading>
        <p>{instructions}</p>
      </Alert>
    </div>
  );
};

export default CaseInstructions;
