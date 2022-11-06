import React from 'react';
import Tooltip from 'react-bootstrap/Tooltip';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import  Button from 'react-bootstrap/Button';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Administrations from './Administrations';


const Prescription = ({
  prescribingStatus,
  prescription: {
    drug,
    dose,
    frequency,
    route,
    form,
    stat,
    start_date,
    end_date,
    indication,
    note,
    prescriber,
    administrations
  },
  index,
  deletePrescription
}) => {
  return (
    <Container className="bg-white mt-1 rounded container-shadow ">
      <Row>
        <Col xs={4} className="py-2">
          <i className="text-muted">Drug</i>
          <span className="mx-3">
            {drug.charAt(0).toUpperCase() + drug.slice(1)}
          </span>
        </Col>
        <Col xs={4} className="py-2">
          <i className="text-muted">Dose</i>
          <span className="mx-3">
            {dose} {frequency}
          </span>
        </Col>
        <Col xs={4} className="py-2">
          <i className="text-muted">Route</i>
          <span className="mx-3">{route}</span>
        </Col>
      </Row>
      <Row>
       <Col xs={4} className="py-2">
          <i className="text-muted">Start Date</i>
          <span className="mx-3">{start_date}</span>
        </Col>
        <Col xs={4} className="py-2">
          <i className="text-muted">Stop Date</i>
          <span className="mx-3">{end_date}</span>
        </Col>
        
        <Col xs={4} className="py-2">
          <i className="text-muted">Prescriber</i>
          <span className="mx-3">{prescriber}</span>
        </Col>
      </Row>

      <Row>
        <Col xs={4} className="py-2">
          <Administrations administrationList={administrations} drug={drug}/>
        </Col>
        <Col xs={4} className="py-2">
          <ButtonGroup aria-label="Basic example" size="sm">
          
            {
              indication != '' ? (
                <OverlayTrigger overlay={(props) => <Tooltip {...props}>{indication}</Tooltip>} placement="bottom">
                  <Button variant="secondary">Indication</Button>
                </OverlayTrigger>) 
                :(                  
                  <Button variant="outline-secondary">Indication</Button>
                )
            }
            {
              note != '' ? (
                <OverlayTrigger overlay={(props) => <Tooltip {...props}>{note}</Tooltip>} placement="bottom">
                  <Button variant="secondary">Note</Button>
                </OverlayTrigger>) 
                :(                  
                  <Button variant="outline-secondary">Note</Button>
                )
            }
            {
              stat != '' ? (
                  <Button variant="warning">Stat Dose</Button>)
                :(                  
                  <Button variant="outline-secondary">Stat Dose</Button>
                )
            }
          </ButtonGroup>
        </Col> 
        <Col sm={4} className="py-2">
          {
            prescribingStatus == true ? (
              <ButtonGroup aria-label="Basic example" size="sm">
                <Button variant="outline-info"><i class="bi bi-pencil"></i></Button>
                <Button variant="outline-danger" onClick= {() => deletePrescription(index)}><i class="bi bi-trash3"></i></Button>
              </ButtonGroup>
            ): ""
          } 
        </Col>
      </Row>
    </Container>
   
  );
};

export default Prescription;
