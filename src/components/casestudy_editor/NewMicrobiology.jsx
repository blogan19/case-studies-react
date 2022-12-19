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
import MicrobiologyTable from "../patient_records/patient_records_tables/MicrobiologyTable";


const AddMicrobiology = ({previousResult, setMicrobiology,closeModal}) => {
    
    const [microDate, setMicroDate] = useState("")
    const [microTime, setMicroTime] = useState("")

    const [sampleType, setSampleType] = useState("")
    const [growth, setGrowth] = useState("")
    const [notes,setNotes] = useState("S = Sensitive I = Intermediate R = Resistant")

    const [sensitivities, setSensitivities] = useState([])

    const [drug, setDrug]  = useState("")
    const [sensitivity, setSensitivity] = useState("")

    const [samples, setSamples] = useState([])

    const addSensitivity = () => {

        if(drug != "" && sensitivity != ""){
            let drugSens = [drug,sensitivity]
            let sensList = sensitivities
            sensList.push(drugSens)
            setSensitivities(sensList)
            setDrug("")
        }
        
    }

    //displays the sensitivities added by the user
    const displaySensitivities = sensitivities.map((x, index) =>(
        <ListGroup.Item key={index}>{x[0]}: {x[1]}  <a href="#"  onClick={()=>{
            setSensitivities(sensitivities.filter(s => s !== x))
        }}> Delete</a></ListGroup.Item>
    )) 

    const saveSample = () => {
        let microResult = {
            "datetime": microDate + " " + microTime,
            "sample_type": sampleType,
            "growth": growth,
            "sensitivities": sensitivities,
            "notes":""
        }
        let sampleList = samples 
        sampleList.push(microResult)
        setSamples(sampleList)
       // setMicrobiology(samples)
    }

    
   


    

  
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
                    <Form.Control type="text" placeholder="E.g. E.Coli" onChange={(e) => setGrowth(e.target.value)}/>
                </Form.Group>
            </Row>
            <Row className="mb-3">
                <Form.Group as={Col} controlId="notes">
                    <Form.Label>Notes</Form.Label>
                    <Form.Control as="textarea" value={notes} placeholder="Notes" onChange={(e) => setNotes(e.target.value)} />
                </Form.Group>
            </Row>
            <hr/>
            <Row className="mb-3">
                <h4>Add sensitivity details</h4>
                <Form.Group as={Col} controlId="Type">
                    <Form.Label>Add Sensitivity</Form.Label>
                    <Form.Control type="text" value={drug} placeholder="Drug" onChange={(e) => setDrug(e.target.value)}/>
                </Form.Group>
                <Form.Group as={Col} controlId="sampleType">
                    <Form.Label>Sensitivity</Form.Label>
                        <InputGroup>
                            <ToggleButtonGroup type="radio" name="sensitivityOptions" onChange={setSensitivity}>
                                <ToggleButton id="sens1" value={"S"} variant="outline-primary">
                                    Sensitive
                                </ToggleButton>
                                <ToggleButton id="sens2" value={"I"} variant="outline-primary" >
                                    Intermediate
                                </ToggleButton>
                                <ToggleButton id="sens3" value={"R"} variant="outline-primary" >
                                    Resistant
                                </ToggleButton>
                            </ToggleButtonGroup>
                        </InputGroup>
                </Form.Group>    
                <Form.Group as={Col} controlId="sampleType">
                    <Button variant="outline-success"className="mt-4"  onClick={addSensitivity}>Add Sensitivity </Button>
                </Form.Group>      
            </Row>
         
            <Row>
                <ListGroup>
                    {displaySensitivities}
                </ListGroup>
            </Row>
            <Form.Group as={Col} controlId="sampleType">
                <Button variant="success" className="mt-4"  onClick={saveSample}>Save</Button>
            </Form.Group>      

            {
                samples.map((x) => (
                    <MicrobiologyTable results={x}/>
                ))

            }

        </Form>
    
    )
}
export default AddMicrobiology
