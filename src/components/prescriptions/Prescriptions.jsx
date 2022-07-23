import React from 'react';
import Tooltip from 'react-bootstrap/Tooltip';
import Button from 'react-bootstrap/Button';
import Badge from 'react-bootstrap/Badge';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Administrations from './Administrations';

const Prescription = ({
  prescription: {
    drug,
    dose,
    frequency,
    route,
    form,
    start_date,
    end_date,
    indication,
    note,
    prescriber,
    administrations
  },
  index,
}) => {
  return (
    <Container className="bg-white mt-1 rounded prescription-container">
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
          <i className="text-muted">Prescriber</i>
          <span className="mx-3">{prescriber}</span>
        </Col>
        <Col xs={4} className="py-2">
          <i className="text-muted">Indication</i>
          <span className="mx-3">{indication}</span>
        </Col>
        <Col xs={4} className="py-2">
          <Administrations administrationList={administrations} drug={drug}/>
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
        <Col sm={4} className="py-2 center">
          <OverlayTrigger
            overlay={(props) => <Tooltip {...props}>{note}</Tooltip>}
            placement="bottom"
          >
            <Badge
              variant="info"
              style={{ visibility: note != '' ? 'visible' : 'hidden' }}
            >
              Note
            </Badge>
          </OverlayTrigger>
        </Col>
      </Row>
    </Container>
   
  );
};

export default Prescription;
