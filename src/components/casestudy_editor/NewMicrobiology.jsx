import React, { useState, useEffect } from "react";
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import ToggleButton from 'react-bootstrap/ToggleButton';
import ToggleButtonGroup from 'react-bootstrap/ToggleButtonGroup';
import ListGroup from 'react-bootstrap/ListGroup';
import { Container, ListGroupItem } from "react-bootstrap";
import Table from 'react-bootstrap/Table';


const AddMicrobiology = ({previousResult, setMicrobiology,closeModal}) => {
    console.log(previousResult)

    //Define variables
    const [microDate, setMicroDate] = useState("")
    const [microTime, setMicroTime] = useState("")
    const [sampleType, setSampleType] = useState("")
    const [growth, setGrowth] = useState("")
    const [notes,setNotes] = useState("S = Sensitive I = Intermediate R = Resistant")
    const [sensitivities, setSensitivities] = useState([])
    const [drug, setDrug]  = useState("")
    const [sensitivity, setSensitivity] = useState("")
    const [samples, setSamples] = useState(previousResult)

    const[sampleId, setSampleId] = useState('')

    const addSensitivity = () => {

        if(drug != "" && sensitivity != ""){
            let drugSens = [drug,sensitivity]
            let sensList = sensitivities
            sensList.push(drugSens)
            setSensitivities(sensList)
            setDrug("")
        }
        
    }

    //Load a previous result for editing
    const editMicro = (index) => {
        let result = previousResult[index]

        //convert date
        let sampleDate = result['datetime']
        let sampleDateTime = sampleDate.split(" ")
        sampleDate = sampleDateTime[0].split("/")
        sampleDate = `${sampleDate[2]}-${sampleDate[1]}-${sampleDate[0]}`
        setMicroDate(sampleDate)
        setMicroTime(sampleDateTime[1])
        
        //setMicroTime()
        setSampleType(result['sample_type'])
        setGrowth(result['growth'])
        setNotes(result['notes'])
        setSensitivities(result['sensitivities'])
        
    } 

     //Load a previous result for editing
     const cancelEdit = () => {
        setMicroDate('')
        setMicroTime('')
        setSampleType('')
        setGrowth('')
        setNotes('')
        setSensitivities([])
        
    } 

    //display items for editing 
    const [editList, setEditList] = useState("")
    const loadExistingDetails = () => {
        let list = previousResult.map((results,index) => (
            <ListGroupItem onClick={() => {editMicro(index);setSampleId(index)}}>
                {results["datetime"]} {results["sample_type"]} {results["growth"]}
            </ListGroupItem>
        ))
        setEditList(list)
    }
   
    //Load previous data n first rerender only
    useEffect(() => {
        if(previousResult.length != ""){
            loadExistingDetails()
        }
    },[]);

    //displays the sensitivities added by the user
    const displaySensitivities = sensitivities.map((x, index) =>(
        <ListGroup.Item key={index}>{x[0]}: {x[1]}  <a href="#"  onClick={()=>{
            setSensitivities(sensitivities.filter(s => s !== x))
        }}> Delete</a></ListGroup.Item>
    )) 

    const saveSample = () => {
        let sampleDate = new Date(microDate)
        sampleDate = sampleDate.toLocaleDateString('en-GB')
        let microResult = {
            "datetime": sampleDate + " " + microTime,
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
        <>  
            <h3>Edit Previous Microbiology</h3>
            <ListGroup>
                {editList} 
            </ListGroup>
            <Form> 
                <h3>Add New Microbiology</h3> 
                <Row className="mb-3"> 
                    <Form.Group as={Col} controlId="microDate">
                        <Form.Label>Result Date</Form.Label>
                        <Form.Control type="date" value={microDate} placeholder="Start Date" onChange={(e) => setMicroDate(e.target.value)}/>
                    </Form.Group>
                    <Form.Group as={Col} controlId="microDate">
                        <Form.Label>Result Time</Form.Label>
                        <Form.Control type="time" value={microTime} placeholder="Start Date" onChange={(e) => setMicroTime(e.target.value)}/>
                    </Form.Group>
                </Row>
                <Row className="mb-3">
                    <Form.Group as={Col} controlId="sampleType">
                        <Form.Label>Sample Type</Form.Label>
                        <Form.Control type="text" value={sampleType} placeholder="E.g. MSSU" onChange={(e) => setSampleType(e.target.value)}/>
                    </Form.Group>
                    <Form.Group as={Col} controlId="sampleType">
                        <Form.Label>Growth/Organism(s)</Form.Label>
                        <Form.Control type="text" value={growth} placeholder="E.g. E.Coli" onChange={(e) => setGrowth(e.target.value)}/>
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
                    
                        {
                            sampleId === '' ? (<Button variant="success" className="mt-4"  onClick={saveSample}>Confirm New Sample </Button>) 
                            : 
                            (   <>
                                    <Button variant="success" className="mt-4"  onClick={saveSample}>Edit Sample </Button>{' '}
                                    <Button variant="success" className="mt-4"  onClick={cancelEdit}> Cancel </Button>
                                </>
                            )
                        }
                    
                </Form.Group>      
                <Container className="mt-5">
                        <hr/>
                        <Table>
                            <thead>
                                <tr>
                                    <th colSpan={6}>Samples</th>
                                </tr>
                            </thead>
                            <tbody>
                                    {

                                        samples.map((x) => (
                                        
                                                    <tr>
                                                        <td>{x['datetime']} </td>
                                                        <td>{x['sample_type']}</td>
                                                        <td>{x['growth']}</td>
                                                        <td>{x['sensitivities']}</td>
                                                        <td>{x['notes']}</td>
                                                        <td><a href='#'>edit</a></td>
                                                        <td><a href='#'>delete</a></td>

                                                    </tr>
                                               
                                        ))

                                    }
                            </tbody>
                        </Table>
                                            
                </Container>

            </Form>
            </>
    
    )
}
export default AddMicrobiology

