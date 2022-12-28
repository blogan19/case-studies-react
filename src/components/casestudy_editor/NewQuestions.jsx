import React, { useState } from "react";
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Table from 'react-bootstrap/Table';
import Container from 'react-bootstrap/Container';
import { useAccordionButton } from "react-bootstrap";

const NewQuestions = ({newCaseNotes, closeModal}) => {
    // "questions": [{
    //     "questionNumber": 1,
    //     "questionType": "MultipleChoice",
    //     "questionTitle": "Nitrofurantoin",
    //     "questionText": "What would the most appropriate duration for nitrofurantoin be for this patient?",
    //     "answerOptions": ["7 days","3 days","14 days"],
    //     "answer": "7 days",
    //     "answerExplanation":""
    //   },

    const [question, setQuestion] = useState("")   
    const [questionType, setQuestionType] = useState("")
    const [questionTitle, setQuestionTitle] = useState("")
    const [questionText, setQuestionText] = useState("")
    const [answerOptions, setAnswerOptions] = useState("")
    const [answerExplanation, setAnswerExplanation] = useState("")


    return(
        <Form> 
            <Row className="mb-3">
                <Form.Group as={Col} controlId="formPresentingComplaint">
                    <Form.Label>Presenting Complaint</Form.Label>
                    <Form.Control type="text" onChange={(e) => setPresentingComplaint(e.target.value)} />
                </Form.Group> 
            </Row>
            

        </Form>
    
    )
}
export default NewQuestions
