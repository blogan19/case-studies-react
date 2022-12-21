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
import { editableInputTypes } from "@testing-library/user-event/dist/utils";


const AddBiochemistry = ({closeModal}) => {
    //https://esneftpathology.nhs.uk/wp-content/uploads/2021/06/Clinical-BioChemistry-Pathology-Handbook.pdf
    
    const [resultDate, setResultDate] = useState("")
    const [resultTime, setResultTime] = useState("")

    const [sampleType, setSampleType] = useState("")
    const [sampleTypeFreeform, setSampleTypeFreeform] = useState(false)

    const [growth, setGrowth] = useState("")
    const [notes,setNotes] = useState("S = Sensitive I = Intermediate R = Resistant")

    const [sensitivities, setSensitivities] = useState([])

    const [drug, setDrug]  = useState("")
    const [sensitivity, setSensitivity] = useState("")

    const [sample, setSample] = useState()

    const saveSample = () => {

    }
    const biochemistryDropdown = () => {

    }
    //https://esneftpathology.nhs.uk/wp-content/uploads/2021/06/Clinical-BioChemistry-Pathology-Handbook.pdf

    // functions
    //     - add
    //     - edit
    //     - delete 
    //     - load previous

    // "sodium":{
    //     "name": "Na+",
    //     "category": "UE",
    //     "range": "135*145",
    //     "unit": "mmol/L",
    //     "results":[{
    //       "datetime": "04/07/2022 08:00",
    //       "result": 139
    //     },{
    //       "datetime": "04/07/2022 13:00",
    //       "result": 140
    //     },{
    //       "datetime": "05/07/2022 08:00",
    //       "result": 138
    //     },{
    //       "datetime": "05/07/2022 12:47",
    //       "result": 137
    //     },{
    //       "datetime": "05/07/2022 20:00",
    //       "result": 139
    //     }]
    //   },
    return(
        <Form> 
            <h1>Biochemistry Results</h1> 
            <Row className="mb-3"> 
                <Form.Group as={Col} controlId="formSampleTypeDropdown">
                        <Form.Label>Sample Type</Form.Label>
                    <Form.Select onChange={setSampleType} value={sampleType} disabled={sampleTypeFreeform}>
                            <option selected>Select Sample Type</option>
                            {biochemistryDropdown}
                    </Form.Select>        
                </Form.Group>
            </Row>
            <Row className="mb-3">
                <Form.Group as={Col} controlId="statCheckbox">
                    <Form.Check type="checkbox" checked={sampleTypeFreeform} label="Not in List?" onChange={(e) => setSampleTypeFreeform(e.target.checked)}/>
                </Form.Group>
            </Row>
            {   
                sampleTypeFreeform === true ? (
                <Row className="mb-3"> 
                    <Form.Group as={Col} controlId="formSampleType">
                        <Form.Label>Free Form Sample Type</Form.Label>
                        <Form.Control required type="text" placeholder="sample type" value={sampleType} onChange={(e) => setSampleType(e.target.value)}/>
                    </Form.Group>
                </Row>
                ) :""
            }

            <Row className="mb-3"> 
                <Form.Group as={Col} controlId="microDate">
                    <Form.Label>Result Date</Form.Label>
                    <Form.Control type="date" onChange={(e) => setResultDate(e.target.value)}/>
                </Form.Group>
                <Form.Group as={Col} controlId="microDate">
                    <Form.Label>Result Time</Form.Label>
                    <Form.Control type="time" onChange={(e) => setResultTime(e.target.value)}/>
                </Form.Group>
            </Row>
           
           
         
            
            <Form.Group as={Col} controlId="sampleType">
                <Button variant="success"className="mt-4"  onClick={saveSample}>Save</Button>
            </Form.Group>      

            

        </Form>
    
    )
}
export default AddBiochemistry
