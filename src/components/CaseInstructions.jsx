import React, {useState} from "react";
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';


function CaseInstructions(props){
    const [show, setShow] = useState(true)
    if (show){
        return (
            <div className="container mt-3">
                <Alert show={show} variant="info">
                    <Alert.Heading>Case Study</Alert.Heading>
                    <p>
                       {props.instructions}
                    </p>
                    <hr />
                    <div className="d-flex justify-content-end">
                    <Button onClick={() => setShow(false)} variant="outline-info">
                        Close
                    </Button>
                    </div>
                </Alert>

                {!show && <Button onClick={() => setShow(true)}>Show Alert</Button>}
            </div>
          );
        }
}
export default CaseInstructions