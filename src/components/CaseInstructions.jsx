import React, {useState} from "react";
import Container from 'react-bootstrap/Container';
import Collapse from 'react-bootstrap/Collapse';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';



const CaseInstructions = ({instructions}) =>{
  const [show, setShow] = useState(true);

  if (show) {
    return (
    <Container className="mt-3">
      <Alert variant="info" onClose={() => setShow(false)} dismissible>
        <Alert.Heading>Case Instructions</Alert.Heading>
        <p>
         {instructions}
        </p>
      </Alert>
    </Container>
    );
  }
}
export default CaseInstructions