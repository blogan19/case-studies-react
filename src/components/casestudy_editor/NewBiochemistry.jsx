import React, { useState, useEffect } from "react";
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import ToggleButton from 'react-bootstrap/ToggleButton';
import ToggleButtonGroup from 'react-bootstrap/ToggleButtonGroup';
import data from './randomFields'
import PatientDetails from "../patient_records/Patient_details"
import Modal from 'react-bootstrap/Modal';
import ListGroup from 'react-bootstrap/ListGroup';
import Table from 'react-bootstrap/Table';
import Container from 'react-bootstrap/Container';
import { ButtonGroup } from "react-bootstrap";

const AddBiochemistry = ({closeModal}) => {
    
    
    const [microDate, setMicroDate] = useState("")
    const [microTime, setMicroTime] = useState("")

    const [sampleType, setSampleType] = useState("")
   
    const [sensitivities, setSensitivities] = useState([])
    const [sensitivity, updateSensitivity] = useState("")

    //https://esneftpathology.nhs.uk/wp-content/uploads/2021/06/Clinical-BioChemistry-Pathology-Handbook.pdf

    // {
    //     "datetime":"04/07/2022 08:00",
    //     "sample_type": "MSSU",
    //     "growth":"E. coli",
    //     "sensitivities":[["Amoxicillin","S"],["Cefaclor","R"],["Nitrofurantoin","S"],["Gentamicin","S"],["Trimethoprim","S"]],
    //     "notes": "S = Sensitive  R = Resistant"
    //   }]
    return(
        <Form> 
            <h1>Microbiology Results</h1> 
            <Row className="mb-3"> 
                <Form.Group as={Col} controlId="microDate">
                    <Form.Label>Result Date</Form.Label>
                    <Form.Control type="date" placeholder="Start Date" onChange={(e) => setMicroDate(e.target.value)}/>
                </Form.Group>
                <Form.Group as={Col} controlId="microDate">
                    <Form.Label>Result Time</Form.Label>
                    <Form.Control type="time" placeholder="Start Date" onChange={(e) => setMicroTime(e.target.value)}/>
                </Form.Group>
            </Row>
            <Row className="mb-3">
                <Form.Group as={Col} controlId="sampleType">
                    <Form.Label>Sample Type</Form.Label>
                    <Form.Control type="text" placeholder="E.g. MSSU" onChange={(e) => setSampleType(e.target.value)}/>
                </Form.Group>
                <Form.Group as={Col} controlId="sampleType">
                    <Form.Label>Growth/Organism(s)</Form.Label>
                    <Form.Control type="text" placeholder="E.g. E.Coli" onChange={(e) => setSampleType(e.target.value)}/>
                </Form.Group>
            </Row>
            <hr/>
            <Row className="mb-3">
                <Form.Group as={Col} controlId="Type">
                    <Form.Label>Add Sensitivity</Form.Label>
                    <Form.Control type="text" placeholder="Drug" onChange={(e) => setSampleType(e.target.value)}/>
                </Form.Group>
                <Form.Group as={Col} controlId="sampleType">
                    <Form.Label>Sensitivity</Form.Label>
                        <InputGroup>
                            <ToggleButtonGroup type="radio" name="sensitivityOptions" onChange={updateSensitivity}>
                                <ToggleButton id="sens1" value={"S"} variant="outline-primary">
                                    Sensitive
                                </ToggleButton>
                                <ToggleButton id="sens2" value={"I"} variant="outline-primary" >
                                    Intermediate
                                </ToggleButton>
                                <ToggleButton id="sens2" value={"R"} variant="outline-primary" >
                                    Resistant
                                </ToggleButton>
                            </ToggleButtonGroup>
                        </InputGroup>
                </Form.Group>    
                
            </Row>
            <Row>
                <Form.Group as={Col} controlId="sampleType">
                    <Button variant="success">Add Sensitivity </Button>
                </Form.Group>            
            </Row>
            <hr/>
                 

            {/* <Row >
                <Col>
                    <Button variant="primary">Save Case Notes</Button>
                </Col>
            </Row> */}

        </Form>
    
    )
}
export default AddBiochemistry
