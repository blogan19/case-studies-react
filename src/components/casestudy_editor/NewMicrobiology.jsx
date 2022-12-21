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
    

    //Define variables
    const [showForm, setShowForm] = useState(false)
    const [microDate, setMicroDate] = useState("")
    const [microTime, setMicroTime] = useState("")
    const [sampleType, setSampleType] = useState("")
    const [growth, setGrowth] = useState("")
    const [notes,setNotes] = useState("S = Sensitive I = Intermediate R = Resistant")
    const [sensitivities, setSensitivities] = useState([])
    const [drug, setDrug]  = useState("")
    const [sensitivity, setSensitivity] = useState("")
    const[sampleId, setSampleId] = useState('')
    

    const [samples, setSamples] = useState(previousResult)


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
        let result = samples[index]
        //Set form
        setShowForm('edit')
        console.log(index)
        console.log(samples)
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
        setNotes("S = Sensitive I = Intermediate R = Resistant")
        setSensitivities([])
        setShowForm(false)
        setSampleId('')
        
    } 

    const deleteMicro = (index) => {
        let sampleList = samples
        sampleList.splice(index,1)
        setSamples(sampleList)
        loadExistingDetails()
    }

    //display items for editing 
    const [editList, setEditList] = useState("")
    const loadExistingDetails = () => {
        
        let list = samples.map((results,index) => (
            <tr>
                <td>{results["datetime"]}</td>
                <td>{results["sample_type"]}</td>
                <td>{results["growth"]}</td>
                <td>
                    {results["sensitivities"].map((x) => (
                        <li>{x[0]}:  {x[1]} </li>
                    ))}
                </td>
                <td>{results["notes"]}</td>
                <td><a href='#' onClick={() => {editMicro(index);setSampleId(index)}} >edit</a></td>
                <td><a href='#' onClick={() => {deleteMicro(index);setSampleId(index)}} >delete</a></td>               
            </tr>
        ))
        setEditList(list)
    }
   
    //refresh existing sample
    useEffect(() => {
        if(samples != ""){
            loadExistingDetails()
        }
    },[microDate,microTime,sampleType,growth,notes,sensitivities,drug,sensitivity]);

    




    //displays the sensitivities added by the user
    const displaySensitivities = sensitivities.map((x, index) =>(
        <ListGroup.Item key={index}>{x[0]}: {x[1]}  <a href="#"  onClick={()=>{
            setSensitivities(sensitivities.filter(s => s !== x))
        }}> Delete</a></ListGroup.Item>
    )) 

  

    const saveSample = () => {
        //sample id 
        console.log("sample: " + sampleId + " was saved")
        let sampleDate = new Date(microDate)
        sampleDate = sampleDate.toLocaleDateString('en-GB')
        let microResult = {
            "datetime": sampleDate + " " + microTime,
            "sample_type": sampleType,
            "growth": growth,
            "sensitivities": sensitivities,
            "notes": notes
        }
        let sampleList = samples 
        if(sampleId === ""){    
            if(sampleList.length > 0){
                sampleList.push(microResult)
            }else{
                sampleList =[microResult]
            }
        }else{
            sampleList[sampleId] = microResult
        }
        setSamples(sampleList)
    }



    return(
        
            <>  
                <h3>Results</h3>
                <Table>
                    <tbody>
                        {editList} 
                    </tbody>
                    
                </Table>
                {
                    showForm != 'new' ? (
                        <Button variant="success" className="mt-4"  onClick={() => {setShowForm("new")}}> Add New Sample </Button>
                    ):""
                }
                
                { 
                    showForm !=  false ? (
                        <Form className="mt-3">
                                {
                                    showForm === "new" ? (
                                        <h3>Add New Result</h3>
                                    ):(
                                        <h3>Edit Result</h3>
                                    )
                                }

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
                                <Button variant="success" className="mt-4"  onClick={() => {saveSample();cancelEdit()}} >Save Sample </Button>{' '}
                                <Button variant="success" className="mt-4"  onClick={cancelEdit}> Cancel </Button>
                            </Form.Group>      
                        </Form>
                    ):""

                }
            </>
     
    
    )
}
export default AddMicrobiology

