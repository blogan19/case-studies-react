import React, { useState } from 'react';
import NavBar from './components/NavBar'
import Button from 'react-bootstrap/Button';
import ListGroup from 'react-bootstrap/ListGroup';
import Offcanvas from 'react-bootstrap/Offcanvas';
import NewCaseForm from './components/casestudy_editor/NewPatientDetails';
import './style.css';
import PatientDetails from './components/patient_records/Patient_details';
import { Container } from 'react-bootstrap';
import Alert from 'react-bootstrap/Alert';
import Prescription from './components/prescriptions/Prescriptions';
import AddPrescription from './components/prescriptions/addPrescription'

const CaseStudyEdit = () => {

  const [showLoadPrevious, setShowLoadPrevious] = useState(true)
  const [show ,setShow] = useState(false)
  const handleClose = () => setShow(false);

  const createNew = () => setShow(true);
  
  
  const [patientDemographics, setPatientDemographics] = useState("")
  const [allergies, setPatientAllergies] = useState("")
  
  console.log(patientDemographics)

  const [ patientComplete, setPatientComplete ] = useState(false)

  //handle prescriptions
  const [createPrescriptions, setCreatePrescriptions] = useState(false)
  const [prescriptionList, setPrescriptions] = useState([]);

  const handleNew = (script) => {
    let prescriptions = [...prescriptionList];
    prescriptions = [...prescriptions, script]
    setPrescriptions(prescriptions)
}

  return (
    <>
     <div className="container mt-3">
        <Button variant="outline-primary" onClick={() => {createNew(); setShowLoadPrevious(false)}}>New Case Study</Button>{' '}
        <Button variant="outline-primary" onClick={() => {setShowLoadPrevious(true)}}>Load Previous</Button>
        {
          showLoadPrevious == true ? (
            <ListGroup variant="flush" className="mt-3">
                <ListGroup.Item  className="blue-black">
                  <strong>Load Previous Case Study</strong>
                </ListGroup.Item>
                <ListGroup.Item>Case study 1</ListGroup.Item>
                <ListGroup.Item>Case Study 2</ListGroup.Item>
                <ListGroup.Item>Case Study 3</ListGroup.Item>
                <ListGroup.Item>Case Study 4</ListGroup.Item>
            </ListGroup>
          ):""
        }
      </div>

    
        { patientDemographics != "" ? (
          <>
          <Container>
            <Alert variant={'success'} className="mt-3">Patient Details Complete</Alert>
            <PatientDetails patient={patientDemographics} allergies={allergies} />
            <Button variant="outline-primary" onClick={() => {setCreatePrescriptions(true); setShow(true)}}>Add Prescription</Button>{' '}
          </Container>
          <Container>
            {prescriptionList.map((prescription, index) => (
              <Prescription  key={index} index={index} prescribingStatus={''} prescription={prescription} editPrescription={''} deletePrescription={''} />
            ))}
          </Container>
          </>
          ):""
        //<PatientDetails patient={patientDemographics} allergies={allergies} />

        }
          

      <Offcanvas show={show} onHide={handleClose} style={{ width: '100%'}}>
        <Offcanvas.Header closeButton className="blue-back text-white">
          <Offcanvas.Title>Create New</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {
            patientDemographics === "" ? (
              <NewCaseForm closeNewPatient={handleClose} patientDemographics={setPatientDemographics} setPatientAllergies={setPatientAllergies} />
            ):""
          }
          {
            createPrescriptions === true ? (
              <AddPrescription newPrescription={handleNew} closeModal={handleClose}/>
            ): ""
          }
          
          
        </Offcanvas.Body>
      </Offcanvas>
      
    </>
  );
};

export default CaseStudyEdit;
