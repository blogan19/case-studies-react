import React, {useState} from "react";
import Collapse from 'react-bootstrap/Collapse';
import Button from 'react-bootstrap/Button';


function CaseInstructions({instructions}){
    const [show, setShow] = useState(false)
    
        return (
            <div className="container mt-3">

                  <Button
        onClick={() => setShow(!show)}
        aria-controls="example-collapse-text"
        aria-expanded={show}
      >
        Instructions
      </Button><br />
      <Collapse in={show}>
        <div id="example-collapse-text">
          {instructions}
        </div>
      </Collapse><br />
            </div>
          );
        
}
export default CaseInstructions