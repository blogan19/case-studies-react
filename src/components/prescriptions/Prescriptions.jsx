import React from "react";
import Tooltip from 'react-bootstrap/Tooltip';
import Button from 'react-bootstrap/Button';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger'
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

const Prescription = ({ prescription: { drug, dose,
    frequency, route, form, start_date, end_date, indication, note }, index }) => {
  return (  
    <div className="prescription-container">
        <Container className=" bg-light mt-3 rounded">
            <Row>
                <Col sm={3} className="py-2">
                    <i className="text-muted">Drug</i>
                    <span className="mx-3">{drug.charAt(0).toUpperCase() + drug.slice(1)}</span>
                </Col>   
                <Col sm={3} className="py-2">
                    <i className="text-muted">Dose</i>
                    <span className="mx-3">{dose}</span>
                </Col>
                <Col sm={4} className="py-2">
                    <i className="text-muted">Frequency</i>
                    <span className="mx-3">{frequency}</span>
                </Col>
                <Col sm={2} className="py-2">
                    <i className="text-muted">Route</i>
                    <span className="mx-3">{route}</span>
                </Col> 
            </Row>

            <Row>
                <Col sm={3} className="py-2">
                    <i className="text-muted">Start Date</i>
                    <span className="mx-3">{start_date}</span>
                </Col>
                <Col sm={3} className="py-2">
                    <i className="text-muted">Stop Date</i>
                    <span className="mx-3">{end_date}</span>
                </Col>
                <Col sm={4} className="py-2">
                    <i className="text-muted">Indication</i>
                    <span className="mx-3">{indication}</span>
                </Col>            
                <Col sm={2} className="py-2 center">
                    <OverlayTrigger        
                        overlay={(props) => (
                            <Tooltip {...props}>
                                {note}
                            </Tooltip>
                        )}
                        placement="bottom">
                        <Button variant="outline-info" style={{visibility: note != ''? 'visible' : 'hidden'}}>Rx Note</Button>
                    </OverlayTrigger>
                </Col>   
            </Row>
        </Container>
    </div>


  );
};
  
export default Prescription;