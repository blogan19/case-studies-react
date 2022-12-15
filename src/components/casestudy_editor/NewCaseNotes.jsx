import React, { useState } from "react";
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Table from 'react-bootstrap/Table';
import Container from 'react-bootstrap/Container';

const AddCaseNotes = ({newCaseNotes, closeModal}) => {
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
    const [location, setLocation] = useState("")
    const [author, setAuthor] = useState("")
    const [note, setNote] = useState("")

    const [caseNotes, setCaseNotes] = useState([])

    const addCaseNote = () => {
        setCaseNotes(caseNotes.concat({
            "note_date": noteDate,
            "note_location": location,
            "note_author": author,
            "note_content": note
        }))}

    const deleteNote = (index) => {
        console.log(index)
        let notesList = caseNotes
        notesList.splice(index,1)
        setCaseNotes(notesList)
    }
    
    const caseNoteDisplay = caseNotes.map((x, index) => (
        <>
            <tr className="blue-back text-white"> 
                <th>{x["note_date"]}</th>
                <th>{x["note_location"]} </th>
                <th>{x["note_author"]}</th>
                <th> <a href='#' onClick={() => {deleteNote(index)}}> delete</a></th>
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
        <Form> 
            <h3>Social History</h3>
            <p>use the options below to document your patients social history. None of these fields are mandatory.</p>
            <hr/>
            <Row className="mb-3">
                <Form.Group as={Col} controlId="formPresentingComplaint">
                    <Form.Label>Presenting Complaint</Form.Label>
                    <Form.Control type="text" onChange={(e) => setPresentingComplaint(e.target.value)} />
                </Form.Group> 
            </Row>
            <Row className="mb-3">
                <Form.Group as={Col} controlId="formHistoryPresentingComplaint">
                    <Form.Label>History of Presenting Complaint</Form.Label>
                    <Form.Control type="text" onChange={(e) => setHistoryPresentingComplaint(e.target.value)} />
                </Form.Group> 
            </Row>
            <Row className="mb-3">
                <Form.Group as={Col} controlId="formPatientHistory">
                    <Form.Label>Past Medical History</Form.Label>
                    <Form.Control as="textarea" placeholder="Past Medical History" onChange={(e) => setPastMedicalHistory(e.target.value)} />
                </Form.Group>
            </Row>

            <Row className="mb-3">
                <Form.Group as={Col} controlId="formPresentingComplaint">
                    <Form.Label>Alcohol</Form.Label>
                    <Form.Control type="text" onChange={(e) => setAlcohol(e.target.value)} />
                </Form.Group> 
                <Form.Group as={Col} controlId="formPresentingComplaint">
                    <Form.Label>Smoking History</Form.Label>
                    <Form.Control type="text" onChange={(e) => setSmoking(e.target.value)} />
                </Form.Group>
                <Form.Group as={Col} controlId="formPresentingComplaint">
                    <Form.Label>Recreational Drugs</Form.Label>
                    <Form.Control type="text" onChange={(e) => setRecreationalDrugs(e.target.value)} />
                </Form.Group>
            </Row>

            <Row className="mb-3">
                <Form.Group as={Col} controlId="formPresentingComplaint">
                    <Form.Label>Occupation</Form.Label>
                    <Form.Control type="text" onChange={(e) => setOccupation(e.target.value)} />
                </Form.Group> 
                <Form.Group as={Col} controlId="formPresentingComplaint">
                    <Form.Label>Home Environment</Form.Label>
                    <Form.Control type="text" onChange={(e) => setHomeEnvironment(e.target.value)} />
                </Form.Group>
            </Row>
            <Row className="mb-3">
                <Form.Group as={Col} controlId="formPatientHistory">
                    <Form.Label>Family History</Form.Label>
                    <Form.Control as="textarea" placeholder="Past Medical History" onChange={(e) => setFamilyHistory(e.target.value)} />
                </Form.Group>
            </Row>
            <hr/>
            <Row>
                <h4>Add Case Note</h4>
                <p>Add patient case notes below. An unlimited number of notes can be added</p>
            </Row>
            <Row className="mb-3">
                <Form.Group as={Col} controlId="formNoteDate">
                    <Form.Label>Note Date</Form.Label>
                    <Form.Control type="date" placeholder="Start Date" onChange={(e) => setNoteDate(e.target.value)}/>
                </Form.Group>
                <Form.Group as={Col} controlId="formPatientHistory">
                    <Form.Label>Case Note Location</Form.Label>
                    <Form.Control type="text" onChange={(e) => setLocation(e.target.value)} />
                </Form.Group>
                <Form.Group as={Col} controlId="formPatientHistory">
                    <Form.Label>Case Note Author</Form.Label>
                    <Form.Control type="text" onChange={(e) => setAuthor(e.target.value)} />
                </Form.Group>
            </Row>
            <Row className="mb-3">
                <Form.Group as={Col} controlId="formPatientHistory">
                    <Form.Label>Case Note Contents</Form.Label>
                    <Form.Control as="textarea" placeholder="Case Note Contents" onChange={(e) => setNote(e.target.value)} />
                </Form.Group>
            </Row>
            <Row className="mb-3">
                <Col xs={3}>
                    <Button variant="outline-success" onClick= {() => addCaseNote()}>Add Case Note</Button>
                </Col>
            </Row>

            <Row>
                <Container>
                    <Table className='tbl-notes container-shadow'>
                        {caseNoteDisplay}
                    </Table>
                </Container>
            </Row>
            <Row>
            <Col>
                <Button variant="primary" onClick={saveCaseNotes}>Save Case Notes</Button>
            </Col>
        </Row>

        </Form>
    
    )
}
export default AddCaseNotes
