import React, { useState, useEffect } from "react";
import NavBar from './components/NavBar'
import Button from 'react-bootstrap/Button';
import ListGroup from 'react-bootstrap/ListGroup';
import Offcanvas from 'react-bootstrap/Offcanvas';
import NewCaseForm from './components/casestudy_editor/NewPatientDetails';
import './style.css';
import PatientDetails from './components/patient_records/Patient_details';
import { ButtonGroup, Container } from 'react-bootstrap';
import Alert from 'react-bootstrap/Alert';
import Prescription from './components/prescriptions/Prescriptions';
import AddPrescription from './components/prescriptions/addPrescription'
import AddCaseNotes from './components/casestudy_editor/NewCaseNotes';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import CaseNotes from "./components/patient_records/Case_notes";
import Laboratory from "./components/patient_records/Laboratory";
import Observations from "./components/patient_records/Observations";
import Table from 'react-bootstrap/Table';
const CaseStudyEdit = () => {

  const [showLoadPrevious, setShowLoadPrevious] = useState(true)
  const [show ,setShow] = useState(false)
  const handleClose = () => setShow(false);

  const createNew = () => setShow(true);
  
  //case study settings 
  const [prescribingCaseStudy, setPrescribingCaseStudy] = useState(true)
  
  //Case Study Name 
  const [showCaseStudyName, setShowCaseStudyName] = useState(false)
  const [caseStudyName, setCaseStudyName] = useState("")

  //handle patient details
  const createPatientDetails = () => setShow(true)
  const [patientDemographics, setPatientDemographics] = useState("")
  const [allergies, setPatientAllergies] = useState("")
  
  console.log(patientDemographics)

  const [ patientComplete, setPatientComplete ] = useState(false)

  //handle prescriptions
  const [createPrescriptions, setCreatePrescriptions] = useState(false)
  const [prescriptionList, setPrescriptions] = useState([]);
  const [noPrescriptions, setNoPrescriptions] = useState(false)

  const handleNew = (script) => {
    let prescriptions = [...prescriptionList];
    prescriptions = [...prescriptions, script]
    setPrescriptions(prescriptions)
  }

  //handle case notes: 
  const [caseNotesShow, setCreateCaseNotes] = useState(false)
  const [caseNotes, setCaseNotes] = useState("")
  console.log(caseNotes.length)

  //Check Progress
  
  const [demographicsComplete, setDemographicsComplete] = useState("light")
  const [prescriptionsComplete, setPrescriptionsComplete] = useState("light")
  const [casenotesComplete, setCaseNotesComplete] = useState("light")
  const [biochemistryComplete, setBiochemistryComplete] = useState("light")
  const [observationsComplete, setObservationsComplete] = useState("light")
  const [questionsComplete, setQuestionsComplete] = useState("light")


  const checkProgress = () => {
    console.log('checking prgoress')
  
    patientDemographics != "" ? setDemographicsComplete('success') : setDemographicsComplete('')
    prescriptionList.length > 0 ? setPrescriptionsComplete('success') : setPrescriptionsComplete('')
    caseNotes != "" ? setCaseNotesComplete('success'): setCaseNotesComplete('') 
    console.log(caseNotes)

  }
  
  useEffect(() => {
    checkProgress()
  });
  return (
    <>
     <div className="container mt-3 mb-3">
        <Button variant="outline-primary" onClick={() => {setShowCaseStudyName(true); setShowLoadPrevious(false)}}>New Case Study</Button>{' '}
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

      { showCaseStudyName != false ? (
      <>
      <Container>
        <Row className="mt-3 mb-3">
        <Col xs={4}>
          <Card>
            <Card.Body>
            <h4>Progress</h4> 
              <Col>
                <ListGroup variant="flush" className="mt-3">
                  <ListGroup.Item action variant={demographicsComplete}>Patient Demographics</ListGroup.Item>
                  <ListGroup.Item action variant={prescriptionsComplete}>Prescriptions</ListGroup.Item>
                  <ListGroup.Item action variant={casenotesComplete}>Case Notes</ListGroup.Item>
                  <ListGroup.Item action variant={biochemistryComplete}>Biochemistry</ListGroup.Item>
                  <ListGroup.Item action variant={observationsComplete}>Observations</ListGroup.Item>
                  <ListGroup.Item action variant={observationsComplete}>Questions</ListGroup.Item>
                </ListGroup> 
              </Col>      
            </Card.Body>
          </Card>
        </Col>    
        <Col xs={8}>
          <Card>
            <Card.Body>
              <h4>Case Study Settings</h4> 
              <Col>
                <Form>
                  <Form.Check type="switch" id="prescribing-switch" label="Allow User to prescribe?" />
                </Form>
              </Col>      
            </Card.Body>
          </Card>
        </Col>                  
        </Row>
        <hr/>
       
          
   
      </Container>
      <Container>
        <Form className="mb-3"> 
                <Form.Group as={Col} controlId="formCaseStudyName">
                    <Form.Label><h1>Case Study Name</h1></Form.Label>
                    <Form.Control placeholder="Enter Case Study Name" type="text" onChange={(e) => setCaseStudyName(e.target.value)} />
                </Form.Group> 
        </Form><br/>
      </Container>
      </>
      ): ""}

      { caseStudyName.length > 0 ? 
        (
          <Container>
            <h1>Patient Demographics</h1>
            <Button variant="outline-primary" onClick={() => {setShow(true); setShowLoadPrevious(false)}}>Add Patient Details</Button>
          </Container>
        ):
        ""
      }

        { patientDemographics != "" ? (
          <>
          <Container className="mb-3">
            <PatientDetails patient={patientDemographics} allergies={allergies} />
            <Button variant="outline-primary" onClick={() => {setCreatePrescriptions(true); setShow(true)}}>Add Prescription</Button>{' '}        
          </Container>
          <Container className='mb-3'>
            {prescriptionList.map((prescription, index) => (
              <Prescription  key={index} index={index} prescribingStatus={''} prescription={prescription} editPrescription={''} deletePrescription={''} />
            ))}
          </Container>
          <Container className='mb-3'>
            <Button variant="outline-primary" onClick={() => {setCreateCaseNotes(true); setCreatePrescriptions(false); setShow(true)}}>Add Case Notes</Button>{' '}
          </Container>
          </>
          ):""
          

        }
        <Container>
          <Table bordered className="text-center container-shadow">
            <tbody>
              <tr>
                <CaseNotes case_notes={caseNotes} />
              </tr>
              <tr>

              </tr>
              <tr>

              </tr>
            </tbody>
          </Table>
        </Container>

          

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
          {
            caseNotesShow === true ? (
              <AddCaseNotes newCaseNotes={setCaseNotes} closeModal={handleClose} />
            ):""
          }
          
          
        </Offcanvas.Body>
      </Offcanvas>
      
    </>
  );
};

export default CaseStudyEdit;
