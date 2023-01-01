import React from 'react';
import Tooltip from 'react-bootstrap/Tooltip';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import  Button from 'react-bootstrap/Button';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Administrations from './Administrations';
import Card from 'react-bootstrap/Card';
import Badge from 'react-bootstrap/Badge'

const Prescription = ({
  prescribingStatus,
  prescription: {
    drug,
    dose,
    frequency,
    route,
    strength,
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
  deletePrescription,
  editPrescription
}) => {
  return (
    <Card className="bg-white mt-1 rounded container-shadow ">
      <Card.Body>
        <Row>
          <Col sm={4}>
            <h5>
              {drug.charAt(0).toUpperCase() + drug.slice(1)} {strength} {form}
            </h5>
          </Col>
          <Col sm={4}>
            {dose} {frequency}
          </Col>
          <Col sm={2}>
            <i className="text-muted">Route</i>
            <span className="mx-3">{route}</span>
          </Col>
          <Col sm={2}>
            {
                stat != '' ? (
                    <Badge bg="info">Stat Dose</Badge>
                  ):('')
            }
          </Col>  
        </Row>
        <Row>
          <Col sm={4} className="py-2">
              <i className="text-muted">Start Date</i>
              <span className="mx-3">{start_date}</span>
          </Col>
          <Col sm={4} className="py-2">
              <i className="text-muted">Stop Date</i>
              <span className="mx-3">{end_date}</span>
          </Col>    
          <Col sm={4} className="py-2">
            {
              indication != '' ? (
                <>
                  <i className="text-muted">Indication</i>
                  <span className="mx-3">{indication}</span>
                </>
              ):""
            }
          </Col>   
        </Row>      
      </Card.Body>
      <Card.Footer>
        <Row>
          <Col sm={6} className="py-2">
            <i className="text-muted">Prescriber</i>
            <span className="mx-3">{prescriber}</span>
          </Col>
          <Col sm={4} className="py-2 float-end">
                <Administrations administrationList={administrations} drug={drug} />
                {' '}
                {
                    note != '' ? (
                      <OverlayTrigger overlay={(props) => <Tooltip {...props}>{note}</Tooltip>} placement="bottom">
                        <Button size="sm" variant="outline-secondary">Prescribing Note</Button>
                      </OverlayTrigger>) 
                      :""
                  }
          </Col>
          <Col sm={2} className="py-2">
            <div className='float-end'>
              {
                prescribingStatus == true ? (
                  <ButtonGroup aria-label="Basic example" size="sm">
                    <Button variant="outline-info" onClick= {() => editPrescription(index)}><i class="bi bi-pencil"></i></Button>
                    <Button variant="outline-danger" onClick= {() => deletePrescription(index)}><i class="bi bi-trash3"></i></Button>
                  </ButtonGroup>
                ): ""
              } 
            </div>
          </Col>
        </Row>
      </Card.Footer>
    </Card>
   
  );
};

export default Prescription;
