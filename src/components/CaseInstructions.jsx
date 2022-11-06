import React, {useState} from "react";
import Container from 'react-bootstrap/Container';
import Collapse from 'react-bootstrap/Collapse';
import Button from 'react-bootstrap/Button';


const CaseInstructions = ({instructions}) =>{
    const [show, setShow] = useState(false)
    
        return (
            <Container className="mt-3">
              <Button onClick={() => setShow(!show)}aria-controls="example-collapse-text" aria-expanded={show}>
                Instructions
              </Button><br />
              <Collapse in={show}>
              <div id="example-collapse-text">
                {instructions}
              </div>
              </Collapse><br />
            </Container>
          );
}
export default CaseInstructions