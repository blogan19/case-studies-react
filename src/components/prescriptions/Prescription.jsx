import React, { useState } from 'react';
import Prescription from './Prescriptions';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

const Prescriptions = (props) => {
  const [order, setOrder] = useState('ascending');

  const prescriptionList = props.prescriptions;
  //sort prescriptions
  if (order === 'ascending') {
    prescriptionList.sort((a, b) => a.drug.localeCompare(b.drug));
  } else if (order === 'descending' || order === '') {
    prescriptionList.sort((b, a) => a.drug.localeCompare(b.drug));
  }

  return (
    <Container className="prescriptions text-break">
      <Container className="prescription-tools">
        <Row className="border blue-back text-white mt-3 py-3 container-shadow rounded">
          <Col sm={3}>
            <h4>Prescriptions </h4>
          </Col>
          <Col sm={2}>
            <Button
              variant="light"
              onClick={() =>
                setOrder(order == 'ascending' ? 'descending' : 'ascending')
              }
            >
              {order == 'ascending' ? (
                <i className="bi bi-sort-alpha-up"></i>
              ) : (
                <i className="bi bi-sort-alpha-down"></i>
              )}
            </Button>
          </Col>
        </Row>
        <Row>
          {prescriptionList.map((prescription, index) => (
            <Prescription  key={index} index={index} prescription={prescription} />
          ))}
        </Row>
      </Container>
    </Container>

  );
};

export default Prescriptions;
