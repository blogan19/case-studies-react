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
import AddPrescription from './components/prescriptions/addPrescription';
import AddCaseNotes from './components/casestudy_editor/NewCaseNotes';
import AddMicrobiology from './components/casestudy_editor/NewMicrobiology'
import AddBiochemistry from './components/casestudy_editor/NewBiochemistry';
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
  const [caseInstructions, setCaseInstructions] = useState("")

  //handle patient details
  const createPatientDetails = () => setShow(true)
  const [createPatientDemographics, setCreatePatientDemographics] = useState(true)
  const [patientDemographics, setPatientDemographics] = useState("")
  const [allergies, setPatientAllergies] = useState("")
  
  console.log(patientDemographics)

  const [ patientComplete, setPatientComplete ] = useState(false)

  //handle prescriptions
  const [createPrescriptions, setCreatePrescriptions] = useState(false)
  const [prescriptionList, setPrescriptions] = useState([]);
  const [noPrescriptions, setNoPrescriptions] = useState(false)
  const [editPrescription, setEditPrescription] = useState("")

  const handleNew = (script) => {
    let prescriptions = [...prescriptionList];
    prescriptions = [...prescriptions, script]
    setPrescriptions(prescriptions)
  }

  const handleEdit = (index) => {
    setShow(true)
    setCreatePrescriptions(true)
    setCreatePatientDemographics(false)
    setBiochemistryShow(false); 
    setCreateCaseNotes(false)
    setEditPrescription(prescriptionList[index])


  }

  //handle case notes: 
  const [caseNotesShow, setCreateCaseNotes] = useState(false)
  const [caseNotes, setCaseNotes] = useState("")
  console.log(caseNotes.length)

  //Handle Micro
  const [microbiologyShow, setMicrobiologyShow] = useState(false)
  const [microbiology, setMicrobiology] = useState("")
  console.log(microbiology)

  //Handle Biochemistry 
  const [biochemistryShow, setBiochemistryShow] = useState(false)
  const [biochemistry, setBiochemistry] = useState("")

  //Check Progress
  
  const [caseStudyNameComplete, setCaseStudyNameComplete] = useState(0)
  const [caseaseStudyInstructionsComplete, setCaseStudyInstructionsComplete] = useState(0)
  const [demographicsComplete, setDemographicsComplete] = useState(0)
  const [prescriptionsComplete, setPrescriptionsComplete] = useState(0)
  const [casenotesComplete, setCaseNotesComplete] = useState(0)
  const [microbiologyComplete, setMicrobiologyComplete] = useState(0)
  const [biochemistryComplete, setBiochemistryComplete] = useState(0)
  const [observationsComplete, setObservationsComplete] = useState(0)
  
  const [caseStudyNameColour, setCaseStudyNameColour] = useState('light')
  const [caseStudyInstructionsColour, setCaseStudyInstructionsColour] = useState('light')
  const [demographicsColour, setDemographicsColour] = useState('light')
  const [prescriptionsColour, setPrescriptionsColour] = useState('light')
  const [casenotesColour, setCaseNotesColour] = useState('light')
  const [microbiologyColour, setMicrobiologyColour] = useState('light')
  const [biochemistryColour, setBiochemistryColour] = useState('light')
  const [observationsColour, setObservationsColour] = useState('light')
  const [totalComplete, setTotalComplete] = useState(0)
  
  const [questionsComplete, setQuestionsComplete] = useState("light")

  const loadPrevious = () =>{
      let previousCase = data
      setCaseStudyName(data["case_study_name"])
      setCaseInstructions(data["case_instructions"])
      setPatientDemographics(data["patient"])
      setPatientAllergies(data["allergies"])
      setPrescriptions(data["prescriptionList"])
      setCaseNotes(data["case_notes"])
      setMicrobiology(data["microbiology"])

  }
  const checkProgress = () => {
    console.log('checking progress')
    caseStudyName != "" ? setCaseStudyNameComplete(1): setCaseStudyNameComplete(0)
    caseStudyNameComplete === 1 ? setCaseStudyNameColour('success') : setCaseStudyNameColour('light')

    caseInstructions != "" ? setCaseStudyInstructionsComplete(1) : setCaseStudyInstructionsComplete(0)
    caseaseStudyInstructionsComplete === 1 ? setCaseStudyInstructionsColour('success'): setCaseStudyInstructionsColour('light')

    patientDemographics != "" ? setDemographicsComplete(1) : setDemographicsComplete(0)
    demographicsComplete === 1 ? setDemographicsColour('success') :  setDemographicsColour('light')

    prescriptionList.length > 0 ? setPrescriptionsComplete(1) : setPrescriptionsComplete(0)
    prescriptionsComplete === 1 ? setPrescriptionsColour('success') : setPrescriptionsColour('light')
    
    caseNotes != "" ? setCaseNotesComplete(1): setCaseNotesComplete(0) 
    casenotesComplete === 1 ? setCaseNotesColour('success') : setCaseNotesColour('light')

    microbiology != "" ? setMicrobiologyComplete(1) : setMicrobiologyComplete(0)
    microbiologyComplete === 1 ? setMicrobiologyColour('success') : setMicrobiologyColour('light')

    biochemistry != "" ? setBiochemistryComplete(1) : setBiochemistryComplete(0)
    biochemistryComplete === 1 ? setBiochemistryColour(1) : setBiochemistryColour(0)



    console.log(caseNotes)

    setTotalComplete(Math.round((caseStudyNameComplete + demographicsComplete + prescriptionsComplete + casenotesComplete + microbiologyComplete + biochemistryComplete + observationsComplete)/7*100))


  }
  
  useEffect(() => {
    checkProgress()
  });
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
            <Col xs={4}>
              <Card>
                <Card.Body>
                <h4>Progress {totalComplete}%</h4> 
                  <Col>
                    <ListGroup variant="flush" className="mt-3">
                      <ListGroup.Item action variant={caseStudyNameColour}>Case Study Name</ListGroup.Item>
                      <ListGroup.Item action variant={caseStudyInstructionsColour}>Case Study Instructions</ListGroup.Item>
                      <ListGroup.Item action variant={demographicsColour}>Patient Demographics</ListGroup.Item>
                      <ListGroup.Item action variant={prescriptionsColour}>Prescriptions</ListGroup.Item>
                      <ListGroup.Item action variant={casenotesColour}>Case Notes</ListGroup.Item>
                      <ListGroup.Item action variant={microbiologyColour}>Microbiology</ListGroup.Item>
                      <ListGroup.Item action variant={biochemistryColour}>Biochemistry</ListGroup.Item>
                      <ListGroup.Item action variant={observationsColour}>Observations</ListGroup.Item>
                      <ListGroup.Item action variant={observationsColour}>Questions</ListGroup.Item>
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
          <ContentHeader title="Case Study Name" />
            <Form className="mt-3"> 
                    <Form.Group as={Col} controlId="formCaseStudyName">
                        <Form.Label><strong>Case Study Name</strong></Form.Label>
                        <Form.Control placeholder="Enter Case Study Name" value={caseStudyName} type="text" onChange={(e) => setCaseStudyName(e.target.value)} />
                    </Form.Group> 
                    <Form.Group as={Col} controlId="formCaseInstructions" className="mt-3">
                        <Form.Label><strong>Case Instructions</strong></Form.Label>
                        <p>Use this option to detail any specific instructions the user may need to complete the case study</p>
                        <Form.Control as="textarea" value={caseInstructions} placeholder="Case Instructions" onChange={(e) => setCaseInstructions(e.target.value)} />
                    </Form.Group>
            </Form>
          </Container>
        </>):""

      }
      

      { caseStudyName.length > 0 && caseInstructions.length> 0 ? 
        (
          <>
            
            <Container className="mt-3">
            <ContentHeader title="Patient Demographics" />
              {patientDemographics != "" ? (
                  <PatientDetails patient={patientDemographics} allergies={allergies} />  
              ):("")}
                   
            </Container>
            <Container className="mt-3">
              
              
              {
                patientDemographics != '' ? (
                  <Button variant="outline-primary" onClick={() => {setShow(true); setCreatePatientDemographics(true);setCreatePrescriptions(false)}}>Edit Patient Details</Button>
                ):(
                  <Button variant="outline-primary" onClick={() => {setShow(true); setShowLoadPrevious(false)}}>Add Patient Details</Button>
                )
              }
              
            </Container>

          </>
        ):
        ""
      }

        { patientDemographics != "" ? (
          <>

          <Container className="mb-3">
            <ContentHeader title="Prescriptions" />
            <br/>
            <p>Click add prescription to add prescriptions to your case study</p>
            <p>Adding prescriptions to your case study is not mandatory</p>
            <Button variant="outline-primary" onClick={() => {setCreatePrescriptions(true); setCreatePatientDemographics(false); setShow(true); setEditPrescription("")}}>Add Prescription</Button>{' '} 
          </Container>

          <Container className='mb-3'>
            {prescriptionList.map((prescription, index) => (
              <Prescription  key={index} index={index} prescribingStatus={true} prescription={prescription} editPrescription={handleEdit} deletePrescription={''} />
            ))}
          </Container>
          <hr/>
          <ContentHeader title="Patient Episode Details" />
          <Container className='mb-3'>
            <Button variant="outline-primary" className="mt-3" onClick={() => {setCreateCaseNotes(true); setCreatePrescriptions(false);setCreatePatientDemographics(false); setShow(true)}}>Add Case Notes</Button>{' '}
            <Button variant="outline-primary" className="mt-3" onClick={() => {setMicrobiologyShow(true);setCreatePatientDemographics(false); setCreateCaseNotes(false); setShow(true)}}>Add Microbiology</Button>{' '}
            <Button variant="outline-primary" className="mt-3" onClick={() => {setBiochemistryShow(true);setCreatePatientDemographics(false); setCreateCaseNotes(false); setShow(true)}}>Add Biochemistry</Button>{' '}
          </Container>
          </>
          ):""
          

        }
        <Container>
          <Table bordered className="text-center container-shadow">
            <tbody>
              <tr>
                {
                  casenotesComplete == 1 ? (
                    <CaseNotes case_notes={caseNotes} />
                  ):""
                }
                {
                  biochemistryComplete == 1 || microbiologyComplete == 1 ? (
                    <Laboratory biochemistry={""} microbiology={microbiology}/> 
                  ): ""
                }
                {
                  observationsComplete == 1 ? (
                    <Observations observations={""} />
                  ): ""
                }
                
                
                
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
            createPatientDemographics === true ? (
              <NewCaseForm closeNewPatient={handleClose} patientDemographics={setPatientDemographics} currentDemographics={patientDemographics}  setPatientAllergies={setPatientAllergies} currentAllergies={allergies} />
            ):""
          }
          {
            createPrescriptions === true ? (
              <AddPrescription newPrescription={handleNew} closeModal={handleClose} editPrescription={editPrescription}/>
            ): ""
          }
          {
            caseNotesShow === true ? (
              <AddCaseNotes newCaseNotes={setCaseNotes} closeModal={handleClose} />
            ):""
          }
          {
            microbiologyShow === true ? (
              <AddMicrobiology setMicrobiology={setMicrobiology} closeModal={handleClose} previousResult={microbiology}/>
            ):""
          }
          
          
        </Offcanvas.Body>
      </Offcanvas>
      
    </>
  );
};

export default CaseStudyEdit;
