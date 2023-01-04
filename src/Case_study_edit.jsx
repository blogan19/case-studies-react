import React, { useState, useEffect } from "react";
import Button from 'react-bootstrap/Button';
import ListGroup from 'react-bootstrap/ListGroup';
import Offcanvas from 'react-bootstrap/Offcanvas';
import NewCaseForm from './components/casestudy_editor/NewPatientDetails';
import './style.css';
import PatientDetails from './components/patient_records/Patient_details';
import { ButtonGroup, Container } from 'react-bootstrap';
import Prescription from './components/prescriptions/Prescriptions';
import AddPrescription from './components/prescriptions/addPrescription';
import AddCaseNotes from './components/casestudy_editor/NewCaseNotes';
import AddMicrobiology from './components/casestudy_editor/NewMicrobiology'
import AddBiochemistry from './components/casestudy_editor/NewBiochemistry';
import AddObservations from "./components/casestudy_editor/NewObservations";
import AddQuestions from "./components/casestudy_editor/NewQuestions";
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import CaseNotes from "./components/patient_records/Case_notes";
import Laboratory from "./components/patient_records/Laboratory";
import Observations from "./components/patient_records/Observations";
import ContentHeader from "./components/Content_header";
import Table from 'react-bootstrap/Table';
import data from './case_study.json';
import QuestionContainer from "./components/questions/QuestionContainer";

const CaseStudyEdit = () => {

  const [showLoadPrevious, setShowLoadPrevious] = useState(true)
  const [show ,setShow] = useState(false)
  const handleClose = () => setShow(false);
  const [modalContents,setModalContents] = useState("")

  
    
  
  const createNew = () => setShow(true);

  //case study settings 
  const [prescribingCaseStudy, setPrescribingCaseStudy] = useState(true)
  
  //Case Study Name 
  const [showCaseStudyName, setShowCaseStudyName] = useState(false)
  const [caseStudyName, setCaseStudyName] = useState("")
  const [caseInstructions, setCaseInstructions] = useState("")

  //handle patient details
  const createPatientDetails = () => setShow(true)
  const [createPatientDemographics, setCreatePatientDemographics] = useState(true)
  const [patientDemographics, setPatientDemographics] = useState("")
  const [allergies, setPatientAllergies] = useState("")

  const [ patientComplete, setPatientComplete ] = useState(false)

  //handle prescriptions
  const [createPrescriptions, setCreatePrescriptions] = useState(false)
  const [prescriptionList, setPrescriptions] = useState([]);
  const [noPrescriptions, setNoPrescriptions] = useState(false)
  const [editPrescription, setEditPrescription] = useState("")
  const [editPrescriptionIndex, setEditPrescriptionIndex] = useState("")

  //handle a new prescription
  const handleNew = (script) => {
    let prescriptions = [...prescriptionList];
    prescriptions = [...prescriptions, script]
    setPrescriptions(prescriptions)
  }
  //Delete a prescription
  const handleDelete = (index) => {
    let confirmDelete =  window.confirm(`${prescriptionList[index].drug} will be removed from the inpatient chart`)
      setPrescriptions([
        ...prescriptionList.slice(0, index),
        ...prescriptionList.slice(index + 1)
      ]);

    console.log(`${index} Deleted`)
} 

  //Set up prescription to edit
  const setupEdit = (index) => {
    setShow(true)
    setModalContents("prescriptions")
    setEditPrescription(prescriptionList[index])
    setEditPrescriptionIndex(index)
  }
  //save edited prescription
  const handleEdit = (script, index) => {
    //takes edited script and its index and saves script list
    let prescriptions = prescriptionList
    prescriptions[index] = script
    setPrescriptions(prescriptions)
  }

  const [caseNotes, setCaseNotes] = useState("")
  const [microbiology, setMicrobiology] = useState("")
  const [biochemistry, setBiochemistry] = useState("")
  const [observations, setObservations] = useState("")

  const [questions, setQuestions] = useState("")


  const loadPrevious = () =>{
      let previousCase = data
      setCaseStudyName(data["case_study_name"])
      setCaseInstructions(data["case_instructions"])
      setPatientDemographics(data["patient"])
      setPatientAllergies(data["allergies"])
      setPrescriptions(data["prescriptionList"])
      setCaseNotes(data["case_notes"])
      setMicrobiology(data["microbiology"])
      setBiochemistry(data["biochemistry"])
      setObservations(data["observations"])
      setQuestions(data["questions"])

  }  
 
  return (
    <>
      <Container className="container mt-3 mb-3">  
        {
          showLoadPrevious === true ? (
            <>
            <ListGroup variant="flush" className="mt-3">
                <ListGroup.Item  className="blue-black">
                  <strong>Load Previous Case Study</strong>
                </ListGroup.Item>
                <ListGroup.Item onClick={() => {loadPrevious(); setShowLoadPrevious(false)}}>Case study 1</ListGroup.Item>
                <ListGroup.Item>Case Study 2</ListGroup.Item>
                <ListGroup.Item>Case Study 3</ListGroup.Item>
                <ListGroup.Item>Case Study 4</ListGroup.Item>
            </ListGroup>
            <Button variant="outline-primary" onClick={() => {setShowCaseStudyName(true); setShowLoadPrevious(false)}}>New Case Study</Button>
            <hr/>
            </>
            
          ):""              
        }        
      </Container>
        
      {
        showLoadPrevious === false ? (<>
          <Container>
            <Row className="mt-3 mb-3">
              <Col>
                <Card>
                  <Card.Body>
                    <h4>Case Study Settings</h4> 
                    <Col>
                      <Form>
                        <Form.Check type="switch" id="prescribing-switch" label="Allow User to prescribe?" />
                      </Form>
                      <Form>
                        <Form.Check type="switch" id="prescribing-switch" label="User gets instant feedback?" />
                      </Form>
                      get titles to change colour when part complete
                    </Col>      
                  </Card.Body>
                </Card>
              </Col>                  
            </Row>
            <hr/>
          </Container>
          <Container>
           <ContentHeader title="Case Study Name" complete={caseInstructions != "" ? "true":""}/>
            <Form className="mt-3"> 
              <Form.Group as={Col} controlId="formCaseStudyName">
                  <Form.Label><strong>Case Study Name</strong></Form.Label>
                  <Form.Control placeholder="Enter Case Study Name" value={caseStudyName} type="text" onChange={(e) => setCaseStudyName(e.target.value)} />
              </Form.Group> 
              {
                caseStudyName != "" ? (
                  <Form.Group as={Col} controlId="formCaseInstructions" className="mt-3">
                    <Form.Label><strong>Case Instructions</strong></Form.Label>
                    <p>Use this option to detail any specific instructions the user may need to complete the case study</p>
                    <Form.Control as="textarea" value={caseInstructions} placeholder="Case Instructions" onChange={(e) => setCaseInstructions(e.target.value)} />
                  </Form.Group>
                ):""
              }
              
            </Form>
          </Container>
        </>):""

      }
      {caseInstructions.length> 0 ? 
        (
          <>
            
            <Container className="mt-3">
              <ContentHeader title="Patient Demographics" complete={patientDemographics != "" ? "true":""}/>
              {patientDemographics != "" ? (
                  <PatientDetails patient={patientDemographics} allergies={allergies} />  
              ):("")}
            </Container>
            <Container className="mt-3">
                  <Button variant="outline-primary" onClick={() => {setShow(true); setModalContents('demographics');}}>
                    {patientDemographics != '' ? 'Edit Patient Details': 'Add Patient Details'}</Button>
            </Container>
          </>
        ):
        ""
      }
      { //Display rest of fields once patient demographics complete
        patientDemographics != "" ? (
          <>
          <Container className="mb-3">
            <ContentHeader title="Prescriptions" complete={prescriptionList != "" ? "true":""}/>
            <Button variant="outline-primary" onClick={() => {setShow(true); setModalContents('prescriptions'); setEditPrescription("")}}>Add Prescription</Button>{' '} 
          </Container>

          <Container className='mb-3'>
            {prescriptionList.map((prescription, index) => (
              <Prescription  key={index} index={index} prescribingStatus={true} prescription={prescription} editPrescription={setupEdit}  deletePrescription={handleDelete} />
            ))}
          </Container>

          <ContentHeader title="Case Notes" className="mb-3" complete={caseNotes != "" ? "true":""}/>
          <Container className="mt-3">
            <p>
              Use the options below to add details of the patients medical history, results and presenting complaint
            </p>
            <Button variant="outline-primary" className="mt-3" onClick={() => {setShow(true);setModalContents('case_notes');}}>Add Case Notes</Button>
          </Container>

          <ContentHeader title="Microbiology" className="mb-3" complete={microbiology != "" ? "true":""}/>
          <Container className="mt-3">
            <Button variant="outline-primary" className="mt-3" onClick={() => {setShow(true);setModalContents('microbiology')}}>Add Microbiology</Button>
          </Container>

          <ContentHeader title="Biochemistry" className="mb-3" complete={biochemistry != "" ? "true":""}/>
          <Container className="mt-3">
            <Button variant="outline-primary" className="mt-3" onClick={() => {setShow(true);setModalContents('biochemistry')}}>Add Biochemistry</Button>
          </Container>

          <ContentHeader title="Observations" className="mb-3" complete={observations != "" ? "true":""}/>
          <Container className="mt-3">
          <Button variant="outline-primary" className="mt-3" onClick={() => {setShow(true);setModalContents('observations')}}>Add Observations</Button>{' '}
          </Container>
          
          <ContentHeader title="Case Notes and Results Display" className="mb-3" />
          <Container className="mt-3">
            <Table bordered className="text-center container-shadow">
              <tbody>
                <tr>
                  {
                    caseNotes != '' ? (
                      <CaseNotes case_notes={caseNotes} />
                    ):""
                  }
                  {
                    biochemistry != '' || microbiology != 1 ? (
                      <Laboratory biochemistry={biochemistry} microbiology={microbiology}/> 
                    ): ""
                  }
                  {
                    observations != 1 ? (
                      <Observations observations={observations} />
                    ): ""
                  }
                </tr>
              </tbody>
            </Table>
        </Container>
        <hr/>
        <ContentHeader title="Case Study Questions" className="mb-3" complete={questions != "" ? "true":""}/>
        <Container className="mt-3">
          <Button variant="outline-primary" onClick={() => {setShow(true);setModalContents('questions')}}>Add Questions</Button>
          {
            questions != "" ? (
              <QuestionContainer questions={questions}/>
            ):""
          }
        </Container>
       
        </>
        ):""
      }
        

          

      <Offcanvas show={show} onHide={handleClose} style={{ width: '100%'}}>
        <Offcanvas.Header closeButton className="blue-back text-white">
          <Offcanvas.Title>Create New</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {
             (() => {
              console.log(modalContents)
              switch(modalContents){
                case "demographics" : return <NewCaseForm closeNewPatient={handleClose} patientDemographics={setPatientDemographics} currentDemographics={patientDemographics}  setPatientAllergies={setPatientAllergies} currentAllergies={allergies} />;
                case "prescriptions" : return <AddPrescription newPrescription={handleNew} closeModal={handleClose} editPrescription={editPrescription} editPrescriptionIndex={editPrescriptionIndex} saveEdit={handleEdit}/>
                case "case_notes": return <AddCaseNotes newCaseNotes={setCaseNotes} closeModal={handleClose} previousNotes={caseNotes}/>
                case "microbiology": return <AddMicrobiology setMicrobiology={setMicrobiology} closeModal={handleClose} previousResult={microbiology}/>
                case "biochemistry": return <AddBiochemistry setBiochemistry={setBiochemistry} closeModal={handleClose} previousResult={biochemistry}/>
                case "observations": return <AddObservations setObservations={setObservations} closeModal={handleClose} previousResult={observations} />
                case "questions": return <AddQuestions setQuestions={setQuestions} closeModal={handleClose} previousResult={questions}/>
              }
            })()
          }
        </Offcanvas.Body>
      </Offcanvas>
      
    </>
  );
};

export default CaseStudyEdit;
