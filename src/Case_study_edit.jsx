import React, { useState, useEffect } from "react";
import Button from 'react-bootstrap/Button';
import ListGroup from 'react-bootstrap/ListGroup';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Alert from 'react-bootstrap/Alert';
import Modal from 'react-bootstrap/Modal';
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
import AddImages from "./components/casestudy_editor/NewImages";
import AddQuestions from "./components/casestudy_editor/NewQuestions";
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import CaseNotes from "./components/patient_records/Case_notes";
import Laboratory from "./components/patient_records/Laboratory";
import Observations from "./components/patient_records/Observations";
import ContentHeader from "./components/Content_header";
import Imaging from "./components/patient_records/Imaging";
import Table from 'react-bootstrap/Table';
import data from './case_study.json';
import QuestionContainer from "./components/questions/QuestionContainer";
import CaseStudyDisplay from "./Case_study_display";

const CaseStudyEdit = ({completedCasePreview}) => {
  
  const [completedCase,setCompletedCase] = useState("")
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
  const [images, setImages] = useState("")
  const [questions, setQuestions] = useState("")


  const [noMicrobiology, setNoMicrobiology] = useState(false)
  const [noBiochemistry, setNoBiochemistry] = useState(false)
  const [noObservations, setNoObservations] = useState(false)
  const [noImages, setNoImages] = useState(false)
  const [noQuestions, setNoQuestions] = useState(false)
  

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
      setImages(data["imaging"])
      setQuestions(data["questions"])

  }  
  const resetPatient = () => {
    setCaseStudyName("")
    setCaseInstructions("")
    setPatientDemographics("")
    setPatientAllergies("")
    setPrescriptions("")
    setCaseNotes("")
    setMicrobiology("")
    setBiochemistry("")
    setObservations("")
    setImages("")
    setQuestions("")

  }
  const updateCase = () => {
    let completeCase = {"data":{
      "case_study_name" : caseStudyName,
      "prescribingStatus": false,
      "case_instructions": caseInstructions,
      "patient": patientDemographics,
      "allergies": allergies,
      "case_notes": caseNotes,
      "imaging": images,
      "prescriptionList": prescriptionList,
      "microbiology": microbiology,
      "biochemistry": biochemistry,
      "observations": observations,
      "questions": questions
    }
    }
    console.log(completeCase)
    console.log(complete)
    setCompletedCase(completeCase)    
  }

  const [caseNotesComplete, setCaseNotesComplete] = useState(false)
  const [prescriptionsComplete, setPrescriptionsComplete] = useState(false)
  const [microbiologyComplete, setMicrobiologyComplete] = useState(false)
  const [biochemistryComplete, setBiochemistryComplete] = useState(false)
  const [observationsComplete, setObservationsComplete] = useState(false)
  const [imagesComplete, setImagesComplete] = useState(false)
  const [questionsComplete, setQuestionsComplete] = useState(false)


  
  const updateStatuses = () => {
    if(caseNotes != ""){
      setCaseNotesComplete(true)
    }
    if(prescriptionList != ""){
      setPrescriptionsComplete(true)
    }
    if(microbiology != ""){
      setMicrobiologyComplete(true)
    }
    if(biochemistry != ""){
      setBiochemistryComplete(true)
    }
    if(observations != ""){
      setObservationsComplete(true)
    }
    if(images != ""){
      setImagesComplete(true)
    }
    if(questions != ""){
      setQuestionsComplete(true)
    }
    
  }

  //check if all fields complete
  const [complete, setComplete] = useState(false)
  const checkComplete = () => {
    if(caseNotesComplete && prescriptionsComplete && microbiologyComplete && biochemistryComplete && observationsComplete && imagesComplete && questionsComplete){
      setComplete(true)
    }else{
      setComplete(false)
    }
  }

  useEffect(() => {
    updateCase()
    updateStatuses()
    checkComplete()
  },[caseStudyName,caseInstructions,patientDemographics,allergies,caseNotes,images,prescriptionList,microbiology,biochemistry,observations,questions]);

  const saveCase = () =>{
    alert("case was saved")
  }
  const [showModal, setShowModal] = useState(false);
  const handleCloseModal = () => setShowModal(false)

  return (
    <>
      <Container className="container mt-3 mb-3">  
        {
          showLoadPrevious === true ? (
            <>
            <ListGroup  className="mt-3">
                <ListGroup.Item  className="blue-black">
                  <h5>Load Previous Case Study</h5>
                </ListGroup.Item>
                <ListGroup.Item onClick={() => {loadPrevious(); setShowLoadPrevious(false)}}><a href='#'>Case Study One 01/01/2022</a></ListGroup.Item>
            </ListGroup>
            <ListGroup  className="mt-3">
                <ListGroup.Item  className="blue-black">
                  <h5>Present Case Study</h5>
                </ListGroup.Item>
                <ListGroup.Item><a href='#'>Case Study One</a>
                  <i className="bi bi-share-fill float-end"></i>
                </ListGroup.Item>
            </ListGroup>
            
            <Button variant="outline-primary" className="mt-3" onClick={() => {setShowCaseStudyName(true); setShowLoadPrevious(false)}}>Create New Case Study</Button>
            
            </>
            
          ):""              
        }        
      </Container>
        
      {
        showLoadPrevious === false ? (<>
          {/* <Container>
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
          </Container> */}
            <Container className="mt-3 mb-3">
              <Button variant="outline-info" onClick={() => {setShowLoadPrevious(true);resetPatient()}}> Restart </Button> {' '}
              {complete === true ? (
                <>
                  <Button variant="outline-info" onClick={() => {setShow(true);setModalContents('preview_case')}}> Preview </Button> {' '}
                  <Button variant="success" onClick={()=> {setShowModal(true)}}> Save </Button>
                </>
              ): ""}
              
           </Container>
           <ContentHeader title="Case Study Details" complete={caseInstructions != "" ? "true":""}/>
           <Container>
              <Form className="mt-3"> 
                <Form.Group as={Col} controlId="formCaseStudyName">
                    <Form.Label><strong>Case Study Details</strong></Form.Label>
                    <Form.Control placeholder="Enter Case Study Name" value={caseStudyName} type="text" onChange={(e) => setCaseStudyName(e.target.value)} />
                </Form.Group> 
                {
                  caseStudyName != "" ? (
                    <Form.Group as={Col} controlId="formCaseInstructions" className="mt-3">
                      <Form.Label><strong>Case Instructions</strong></Form.Label>
                      <p>Detail any specific instructions the user may need to complete the case study</p>
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
            <ContentHeader title="Patient Demographics" complete={patientDemographics != "" ? "true":""}/>
            <Container className="mt-3">
              
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
        patientDemographics != "" && caseInstructions.length >0 ? (
          <>
           <ContentHeader title="Case Notes" className="mb-3" complete={caseNotesComplete === true ? "true":""}/>
          <Container className="mt-3">
            
            <Button variant="outline-primary" className="mt-3" onClick={() => {setShow(true);setModalContents('case_notes');}}>
              {caseNotes != "" ? "Edit Case Notes":"Add Case Notes"}
            </Button>
            <Table bordered className="text-center container-shadow mt-3">
              <tbody>
                <tr></tr>
                  {
                    caseNotes != '' ? (
                      <CaseNotes case_notes={caseNotes} />
                    ):""
                  }
              </tbody>
            </Table>
          </Container>

          <ContentHeader title="Prescriptions" complete={prescriptionsComplete === true ? "true":""}/>
          <Container className="mb-3">
            <Button variant="outline-primary" className="mt-3" onClick={() => {setShow(true); setModalContents('prescriptions'); setEditPrescription("")}}>Add Prescription</Button>{' '} 
            <Button variant="outline-primary" className="mt-3" onClick={() => {setPrescriptionsComplete(true)}}>
                No Prescriptions
            </Button>
          </Container>

          <Container className='mb-3'>
            {prescriptionList.map((prescription, index) => (
              <Prescription  key={index} index={index} prescribingStatus={true} prescription={prescription} editPrescription={setupEdit}  deletePrescription={handleDelete} />
            ))}
          </Container>

          <ContentHeader title="Microbiology" className="mb-3" complete={microbiologyComplete === true  ? "true":""}/>
          <Container className="mt-3">
            <Button variant="outline-primary" className="mt-3" onClick={() => {setShow(true);setModalContents('microbiology')}}>
              {microbiology === "" ? "Add Microbiology":"Edit Microbiology" }
            </Button>{' '}
            <Button variant="outline-primary" className="mt-3" onClick={() => {setMicrobiologyComplete(true)}}>
                No Microbiology
            </Button>
            <Table bordered className="text-center container-shadow mt-3">
              <tbody>
                <tr></tr>
                  {
                    microbiology != '' ? (
                      <Laboratory biochemistry='' microbiology={microbiology}/> 
                    ):""
                  }
              </tbody>
            </Table>
          </Container>

          <ContentHeader title="Biochemistry" className="mb-3" complete={biochemistryComplete === true? "true":""}/>
          <Container className="mt-3">
            <Button variant="outline-primary" className="mt-3" onClick={() => {setShow(true);setModalContents('biochemistry')}}>
              {biochemistry === "" ? "Add Biochemistry":"Edit Biochemistry" }
            </Button>{' '}
            <Button variant="outline-primary" className="mt-3" onClick={() => {setBiochemistryComplete(true)}}>
                No Biochemistry
            </Button>
            <Table bordered className="text-center container-shadow mt-3">
              <tbody>
                <tr></tr>
                  {
                    biochemistry != '' ? (
                      <Laboratory biochemistry={biochemistry} microbiology={microbiology} /> 
                    ):""
                  }
              </tbody>
            </Table>
          </Container>

          <ContentHeader title="Observations" className="mb-3" complete={observationsComplete === true ? "true":""}/>
          <Container className="mt-3">
          <Button variant="outline-primary" className="mt-3" onClick={() => {setShow(true);setModalContents('observations')}}>
            {observations === "" ? "Add Observations":"Edit Observations" }
          </Button>{' '}
          <Button variant="outline-primary" className="mt-3" onClick={() => {setObservationsComplete(true); setObservations([])}}>
                No Observations
            </Button>
          <Table bordered className="text-center container-shadow mt-3">
              <tbody>
                <tr></tr>
                  {
                    observations != '' ? (
                      <Observations observations={observations}  /> 
                    ):""
                  }
              </tbody>
            </Table>
          </Container>
  
        <ContentHeader title="Images" className="mb-3" complete={imagesComplete === true ? "true":""}/>
        <Container className="mt-3">
        <Button variant="outline-primary" className="mt-3" onClick={() => {setShow(true);setModalContents('images')}}>
            {images === "" ? "Add Images":"Edit Images" }
        </Button>{' '}
        <Button variant="outline-primary" className="mt-3" onClick={() => {setImagesComplete(true); setImages([])}}>
                No Images
        </Button>
        <Table bordered className="text-center container-shadow mt-3">
              <tbody>
                <tr></tr>
                  {
                    images != '' ? (
                      <Imaging images={images}  /> 
                    ):""
                  }
              </tbody>
            </Table>
        </Container>

        <ContentHeader title="Case Study Questions" className="mb-3" complete={questionsComplete === true ? "true":""}/>
        <Container className="mt-3 mb-5">
          <Button variant="outline-primary" className="mt-3" onClick={() => {setShow(true);setModalContents('questions')}}>{questions === "" ? "Add Questions" :"Edit Questions"}</Button>{' '}
          <Button variant="outline-primary" className="mt-3" onClick={() => {setQuestionsComplete(true); setQuestions([])}}>
              No Questions
          </Button>
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
          <Offcanvas.Title>edit</Offcanvas.Title>
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
                case "images": return <AddImages setImages={setImages} closeModal={handleClose} previousResult={images} />
                case "questions": return <AddQuestions setQuestions={setQuestions} closeModal={handleClose} previousResult={questions}/>
                case "preview_case" : return <CaseStudyDisplay data={completedCase['data']}/>
              }
            })()
          }
        </Offcanvas.Body>
      </Offcanvas>



      <Modal show={showModal} onHide={handleCloseModal} >
        <Modal.Header closeButton>
        <Modal.Title>Save Case Study</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <>
              <p>
                <Alert variant="info">
                  <Alert.Heading>
                    You are saving the case study: 
                  </Alert.Heading>
                  {caseStudyName}               
                </Alert>
              </p>
              <Button variant="success" onClick= {saveCase}>Save</Button>{' '}
              <Button variant="outline-info" onClick= {handleCloseModal}>Cancel</Button>
          </>       
        </Modal.Body>
        </Modal>
      
    </>
  );
};

export default CaseStudyEdit;

