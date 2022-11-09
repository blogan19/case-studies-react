import React, { useState } from 'react';
import Prescription from './Prescriptions';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Modal from 'react-bootstrap/Modal';
import AddPrescription from './addPrescription.jsx'

const Prescriptions = (props) => {

  const [prescriptionList, setPrescriptions] = useState(props.prescriptions);
  const prescribingStatus = props.prescribingStatus
  const [order, setOrder] = useState('ascending');

  
  //Open Off Canvas
  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);
  const handleClick = () => setShow(true);
  const [fullscreen, setFullscreen] = useState(true);

  const handleEdit = (index) => {
    alert("you want to edit prescription " + prescriptionList[index].drug)
  }
  
  //Update state when item deleted
  const handleDelete = (index) => {
      let confirmDelete =  window.confirm(`${prescriptionList[index].drug} will be removed from the inpatient chart`)
        setPrescriptions([
          ...prescriptionList.slice(0, index),
          ...prescriptionList.slice(index + 1)
        ]);

      console.log(`${index} Deleted`)
  }
  const handleNew = (script) => {
      let prescriptions = [...prescriptionList];
      prescriptions = [...prescriptions, script]
      setPrescriptions(prescriptions)
  }
  //
  
  //sort prescriptions
  if (order === 'ascending') {
    prescriptionList.sort((a, b) => a.drug.localeCompare(b.drug));
  } else if (order === 'descending' || order === '') {
    prescriptionList.sort((b, a) => a.drug.localeCompare(b.drug));
  }

  return (
    <>
      <Container className="prescription-tools text-break">
        <Row className="border blue-back text-white mt-3 py-3 container-shadow rounded">
          <Col sm={3}>
            <h4>Prescriptions </h4>
          </Col>
          <Col sm={3}>
            <ButtonGroup aria-label="Basic example">
              <Button
                variant="outline-light"
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
              {
                prescribingStatus == true ? (
                  <Button variant="outline-light" onClick={handleClick}>Add Prescription</Button>
                ): ""
              }
            
            </ButtonGroup>
            
          </Col>          
        </Row>
        <Row>
          {prescriptionList.map((prescription, index) => (
            <Prescription  key={index} index={index} prescribingStatus={prescribingStatus} prescription={prescription} editPrescription={handleEdit} deletePrescription={handleDelete} />
          ))}
        </Row>
      </Container>

      <Modal show={show} onHide={handleClose} >
        <Modal.Header closeButton>
          <Modal.Title> Add Prescription</Modal.Title>
        </Modal.Header>
        <Modal.Body>
            <AddPrescription newPrescription={handleNew} closeModal={handleClose}/>
        </Modal.Body>
      </Modal>

      


</>
  );
};

export default Prescriptions;
