import React, { useState, useEffect } from "react";
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Table from 'react-bootstrap/Table';
import Container from 'react-bootstrap/Container';
import Modal from 'react-bootstrap/Modal';

const AddCaseNotes = ({newCaseNotes, closeModal, previousNotes}) => {
    const [presentingComplaint, setPresentingComplaint] = useState("")
    const [historyPresentingComplaint, setHistoryPresentingComplaint] = useState("")
    const [pastMedicalHistory, setPastMedicalHistory] = useState("")

    const [alcohol, setAlcohol] = useState("")  
    const [smoking, setSmoking] = useState("")
    const [recreationalDrugs, setRecreationalDrugs] = useState("")
    const [occupation, setOccupation] = useState("")
    const [homeEnvironment, setHomeEnvironment] = useState("")
    const [familyhistory, setFamilyHistory] = useState("")
    

    const [noteDate, setNoteDate] = useState("")
    const [noteTime, setNoteTime] = useState("")
    const [location, setLocation] = useState("")
    const [author, setAuthor] = useState("")
    const [note, setNote] = useState("")

    const [caseNotes, setCaseNotes] = useState([])
    const [saveCaseNoteDisabled,setSaveCaseNoteDisabled] = useState(true)


    //edit delete modal
    const [showEditModal, setShowEditModal] = useState(false);
    const handleCloseEditModal = () => setShowEditModal(false);
    const [editItem,setEditItem] = useState('')
    const [deleteIndex, setDelete] = useState('')

    const loadPreviousNotes = () => {
        setPresentingComplaint(previousNotes['presenting_complaint'])
        setHistoryPresentingComplaint(previousNotes['history_presenting_complaint'])
        setPastMedicalHistory(previousNotes['conditions'])
        setAlcohol(previousNotes['social_history']['alcohol'])
        setSmoking(previousNotes['social_history']['smoking'])
        setRecreationalDrugs(previousNotes['social_history']['recreational_drugs'])
        setOccupation(previousNotes['social_history']['occupation'])
        setHomeEnvironment(previousNotes['social_history']['home_environment'])
        setFamilyHistory(previousNotes['family_history'])

        setCaseNotes(previousNotes['notes'])

    }

    useEffect(() => {
        if(previousNotes != ""){
            loadPreviousNotes()
        }
    },[]);

    const checkCaseNoteForm = () => {
        if(noteDate != "" && noteTime != "" && location != "" && author != "" && note != ""){
            setSaveCaseNoteDisabled(false)
        }else{
            setSaveCaseNoteDisabled(true)
        }
    }
    useEffect(() => {
        checkCaseNoteForm()
    });

    const addCaseNote = () => {
        let noteDateTime = new Date(noteDate)
        noteDateTime = noteDateTime.toLocaleDateString('en-GB')
        
        let noteContent = {
            "note_date": noteDateTime +" " + noteTime,
            "note_location": location,
            "note_author": author,
            "note_content": note
        }
        if(editItem === ''){
            setCaseNotes(caseNotes.concat(noteContent))
        }else{
            let caseNoteList = caseNotes
            caseNoteList[editItem] = noteContent
            setCaseNotes(caseNoteList)
        }
        handleCloseEditModal()
    }    

    const editNote = (index) => {
        let result = caseNotes[index]
        try{
            //format datetime
            let noteDateTime = result['note_date']
            noteDateTime = noteDateTime.split(" ")
            let editDate = noteDateTime[0].split("/")
            editDate = `${editDate[2]}-${editDate[1]}-${editDate[0]}`
            setNoteDate(editDate)
            setNoteTime(noteDateTime[1])
        }
        catch{
            setNoteTime('')
            setNoteTime('')
        }

        setLocation(result['note_location'])
        setAuthor(result['note_author'])
        setNote(result['note_content'])
        setEditItem(index)
        
    }
    const deleteNote = (index) => {
        console.log(index)
        let notesList = caseNotes
        notesList.splice(index,1)
        setCaseNotes(notesList)
        setDelete('')
        handleCloseEditModal()
    }

    const caseNoteDisplay = caseNotes.map((x, index) => (
        <>
            <tr className="blue-back text-white"> 
                <th>{x["note_date"]}</th>
                <th>{x["note_location"]} </th>
                <th>{x["note_author"]}</th>
                <th> 
                    <a href='#' onClick={() => {editNote(index);setShowEditModal(true)}}><i class="bi bi-pencil" style={{color: 'white'}}></i></a>
                    <a href='#' onClick={() => {setShowEditModal(true);setDelete(index)}}><i class="bi bi-trash3" style={{color: 'red'}}></i></a>
                </th>
            </tr>
            <tr>
                <td>{x["note_content"]} </td>
            </tr>
        </>

    ))

    const saveCaseNotes = () => {
        let case_notes = {
            "presenting_complaint": presentingComplaint,
            "history_presenting_complaint": historyPresentingComplaint,
            "conditions": [
                pastMedicalHistory
            ],
            "social_history": {
              "alcohol": alcohol,
              "smoking": smoking,
              "recreational_drugs": recreationalDrugs,
              "occupation": occupation,
              "home_environment": homeEnvironment
            },
            "family_history": familyhistory,
            "notes": caseNotes
        }
        newCaseNotes(case_notes)
        closeModal()
    }



    return(
        <>
        <Form> 
            <h3>Social History</h3>
            <p>use the options below to document your patients social history. None of these fields are mandatory.</p>
            <hr/>
            <Row className="mb-3">
                <Form.Group as={Col} controlId="formPresentingComplaint">
                    <Form.Label>Presenting Complaint</Form.Label>
                    <Form.Control type="text" value={presentingComplaint} onChange={(e) => setPresentingComplaint(e.target.value)} />
                </Form.Group> 
            </Row>
            <Row className="mb-3">
                <Form.Group as={Col} controlId="formHistoryPresentingComplaint">
                    <Form.Label>History of Presenting Complaint</Form.Label>
                    <Form.Control type="text" value={historyPresentingComplaint} onChange={(e) => setHistoryPresentingComplaint(e.target.value)} />
                </Form.Group> 
            </Row>
            <Row className="mb-3">
                <Form.Group as={Col} controlId="formPatientHistory">
                    <Form.Label>Past Medical History</Form.Label>
                    <Form.Control as="textarea" value={pastMedicalHistory} placeholder="Past Medical History" onChange={(e) => setPastMedicalHistory(e.target.value)} />
                </Form.Group>
            </Row>

            <Row className="mb-3">
                <Form.Group as={Col} controlId="formPresentingComplaint">
                    <Form.Label>Alcohol</Form.Label>
                    <Form.Control type="text" value={alcohol} onChange={(e) => setAlcohol(e.target.value)} />
                </Form.Group> 
                <Form.Group as={Col} controlId="formPresentingComplaint">
                    <Form.Label>Smoking History</Form.Label>
                    <Form.Control type="text" value={smoking} onChange={(e) => setSmoking(e.target.value)} />
                </Form.Group>
                <Form.Group as={Col} controlId="formPresentingComplaint">
                    <Form.Label>Recreational Drugs</Form.Label>
                    <Form.Control type="text" value={recreationalDrugs} onChange={(e) => setRecreationalDrugs(e.target.value)} />
                </Form.Group>
            </Row>

            <Row className="mb-3">
                <Form.Group as={Col} controlId="formPresentingComplaint">
                    <Form.Label>Occupation</Form.Label>
                    <Form.Control type="text" value={occupation} onChange={(e) => setOccupation(e.target.value)} />
                </Form.Group> 
                <Form.Group as={Col} controlId="formPresentingComplaint">
                    <Form.Label>Home Environment</Form.Label>
                    <Form.Control type="text" value={homeEnvironment} onChange={(e) => setHomeEnvironment(e.target.value)} />
                </Form.Group>
            </Row>
            <Row className="mb-3">
                <Form.Group as={Col} controlId="formPatientHistory">
                    <Form.Label>Family History</Form.Label>
                    <Form.Control as="textarea" value={familyhistory} onChange={(e) => setFamilyHistory(e.target.value)} />
                </Form.Group>
            </Row>
            <hr/>
            <Button variant="outline-success" onClick= {() => setShowEditModal(true)}>Add New Case Note</Button>
           
            <Row className="mt-3">
                <Container>
                    <Table className='tbl-notes container-shadow'>
                        {caseNoteDisplay}
                    </Table>
                </Container>
            </Row>
            <Row>
            <hr/>
            <Col>
                <Button variant="success" onClick={saveCaseNotes}>Save Case Notes</Button>{' '}
                <Button variant="outline-info" onClick= {closeModal}>Cancel</Button>
            </Col>
        </Row>

        </Form>

        <Modal show={showEditModal} onHide={handleCloseEditModal} >
        <Modal.Header closeButton>
        <Modal.Title>Case Note Entry</Modal.Title>
        </Modal.Header>
        <Modal.Body>
            {
                deleteIndex === '' ? (
                    <>
                    <Row className="mb-3">
                    <Form.Group as={Col} controlId="formNoteDate">
                        <Form.Label>Note Date</Form.Label>
                        <Form.Control type="date" placeholder="Start Date" value={noteDate} onChange={(e) => setNoteDate(e.target.value)} style={noteDate === "" ? {border: "solid 1px red"}: {border: ""}}/>
                    </Form.Group>
                    <Form.Group as={Col} controlId="formNoteDate">
                        <Form.Label>Note Time</Form.Label>
                        <Form.Control type="time" placeholder="Start Date" value={noteTime} onChange={(e) => setNoteTime(e.target.value)} style={noteTime === "" ? {border: "solid 1px red"}: {border: ""}}/>
                    </Form.Group>
                </Row>
                <Row className="mb-3">
                    <Form.Group as={Col} controlId="formCaseLocation">
                        <Form.Label>Case Note Location</Form.Label>
                        <Form.Control type="text" value={location} onChange={(e) => setLocation(e.target.value)}  style={location === "" ? {border: "solid 1px red"}: {border: ""}}/>
                    </Form.Group>
                </Row>
                <Row className="mb-3">
                    <Form.Group as={Col} controlId="formPatientHistory">
                        <Form.Label>Case Note Author</Form.Label>
                        <Form.Control type="text" value={author} onChange={(e) => setAuthor(e.target.value)}  style={author === "" ? {border: "solid 1px red"}: {border: ""}}/>
                    </Form.Group>
                </Row>
                <Row className="mb-3">
                    <Form.Group as={Col} controlId="formPatientHistory">
                        <Form.Label>Case Note Contents</Form.Label>
                        <Form.Control as="textarea" value={note} onChange={(e) => setNote(e.target.value)}  style={note === "" ? {border: "solid 1px red"}: {border: ""}}/>
                    </Form.Group>
                </Row>
                <Row className="mb-3">
                    <Col xs={6}>
                        <Button variant="success" disabled={saveCaseNoteDisabled} onClick= {() => addCaseNote()}>Save Case Note</Button>{' '}
                        <Button variant="outline-info" onClick= {handleCloseEditModal}>Cancel</Button>
                        
                    </Col>
                </Row>
                </>
                ):(
                    <>
                        <Button variant="danger" onClick= {() => deleteNote(deleteIndex)}>Are you sure you want to Delete this note?</Button>{' '}
                        <Button variant="outline-info" onClick= {handleCloseEditModal}>Cancel</Button>
                    </>
                )
            }
           
       
        </Modal.Body>
        </Modal>
    
</>
    )
}
export default AddCaseNotes
