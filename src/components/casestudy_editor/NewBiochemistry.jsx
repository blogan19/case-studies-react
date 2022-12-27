import React, { useState, useEffect } from "react";
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import ToggleButton from 'react-bootstrap/ToggleButton';
import ToggleButtonGroup from 'react-bootstrap/ToggleButtonGroup';
import PatientDetails from "../patient_records/Patient_details"
import Modal from 'react-bootstrap/Modal';
import ListGroup from 'react-bootstrap/ListGroup';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';
import data from "./biochemistry.json"
import { Alert, Table } from "react-bootstrap";
import Container from 'react-bootstrap/Container';
import ContentHeader from "../Content_header";


const AddBiochemistry = ({closeModal, previousResult}) => {
    //https://esneftpathology.nhs.uk/wp-content/uploads/2021/06/Clinical-BioChemistry-Pathology-Handbook.pdf
    const [sampleDropdownList, setSampleDropdownList] = useState()
    const [saveBtnText, setSaveBtn] = useState("Save")
    // if true disables form controls for editing sample details but not results
    const [samplePropertiesdisable, setPropertiesdisable] = useState(false)
    const [highlightedRecord, setHighlightedEdit] = useState("")

    const [sampleType, setSampleType] = useState("")
    const [sampleTypeFreeform, setSampleTypeFreeform] = useState(false)

    const[category, setCategory] = useState("")
    const[unit, setUnit] = useState("")
    const[range, setRange] = useState("")
    const [resultDate, setResultDate] = useState("")
    const [resultTime, setResultTime] = useState("")
    const [result, setResult] = useState("")

    //result list
    const [results, setResults] = useState({})

    //Keep track of result we are currently editing
    const [editRecord, setEditRecord] = useState("")
   
    //sorts sampleDrop down then renders
    const sampleDropdown = () => {
        const sampleList = data['biochemistryList']

        //sort object keys and then map them
        let keys = Object.keys(sampleList).sort()
        const list = keys.map((keyName,i) => (
            <option key={sampleList[keyName]['name']} value={sampleList[keyName]['name']}>{sampleList[keyName]['name']}</option>
        ))
        setSampleDropdownList(list)
    } 

    //handle select a sample
    const handleSampleType = (event) => {
        const sampleName = event.target.value 
        setSampleType(sampleName)
    
        //use sample name to retrieve other info about sample
        setCategory(data['biochemistryList'][sampleName]['category'])
        setUnit(data['biochemistryList'][sampleName]['unit'])
        setRange(data['biochemistryList'][sampleName]['range'])
    }

    //Functions called on first render
    useEffect(() => {
        sampleDropdown()
        console.log(previousResult)
        if(previousResult != ""){
            setResults(previousResult)
        }
    },[]);

    const categoryPopover = (
        <Popover id="popover-basic">
          <Popover.Header as="h3">Sample Category</Popover.Header>
          <Popover.Body>
            Samples with the same category are grouped together into the same table
          </Popover.Body>
        </Popover>
      );

    const resetForm = () => {
        setSaveBtn("Save")
        setResultDate("")
        setResultTime("")
        setResult("")
        setEditRecord("")
        setPropertiesdisable(false)
    }
    const addSample = () => {
        let sample = {
            "name": sampleType,
            "category": category,
            "range": range,
            "unit": unit,
        }
        let resultDetails = {
            "datetime": resultDate + "  " + resultTime,
            "result": result
        }
        let resultList = results
        if(editRecord === ""){
            if(resultList[sampleType]){
                resultList[sampleType]['results'].push(resultDetails)

            }else{
                sample['results'] = [resultDetails]
                resultList[sampleType] = sample
            }
        }else{
            console.log(editRecord)
            resultList[editRecord[0]]['results'][editRecord[1]] = resultDetails
        }
        resetForm("")
        setResults(resultList)
    }    

    console.log(results)

    const editResult = (sampleIndex, resultIndex) => {
        //set colour of editing record 
        setHighlightedEdit(sampleIndex+resultIndex)

        setPropertiesdisable(true)
        setSaveBtn("Save Edited Sample")
        console.log(sampleIndex)
        console.log(results[sampleIndex])
        console.log(resultIndex)

        let editSample = results[sampleIndex]['results'][resultIndex]
        

        setResult(editSample['result'])        

        //Keep track of record editing record
        setEditRecord([sampleIndex, resultIndex])

        //split datetime
        let resultDateTime = editSample['datetime'].split(" ")
        setResultDate(resultDateTime[0])
        setResultTime(resultDateTime[2])

        console.log(resultDateTime)

    }
    
    const checkHighlightedRecord = () => {

    }

    
    
    //https://geekymedics.com/reference-ranges/
    //https://esneftpathology.nhs.uk/wp-content/uploads/2021/06/Clinical-BioChemistry-Pathology-Handbook.pdf

    // functions
    //     - add
    //     - edit
    //     - delete 
    //     - load previous

    // "sodium":{
    //     "name": "Na+",
    //     "category": "UE",
    //     "range": "135-145",
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
        <>
        <ContentHeader title="Biochemistry" className="mb-3"/> 
        <Container className="container-shadow mt-3">
            <Form> 
                <br/>
                <h3>Edit Sample Details</h3>
                <Alert variant="info">Edit Sample Type Details Using the options below</Alert>
                {
                    sampleTypeFreeform === false ? (
                        <Row className="mb-3"> 
                            <Form.Group as={Col} controlId="formSampleTypeDropdown">
                                <Form.Label>Sample Type</Form.Label>
                                <Form.Select onChange={handleSampleType} value={sampleType} disabled={samplePropertiesdisable}>
                                        <option selected>Select Sample Type</option>
                                        {sampleDropdownList}
                                </Form.Select>        
                            </Form.Group>
                        </Row>
                    ):(
                        <Row className="mb-3"> 
                            <Form.Group as={Col} controlId="formSampleType">
                                <Form.Label>Free Form Sample Type</Form.Label>
                                <Form.Control required type="text" placeholder="sample type" value={sampleType} onChange={(e) => setSampleType(e.target.value)} disabled={samplePropertiesdisable}/>
                            </Form.Group>
                        </Row>
                    )
                }
                
                <Row className="mb-3">
                    <Form.Group as={Col} controlId="statCheckbox">
                        <Form.Check type="checkbox" checked={sampleTypeFreeform} label="Sample not in List?" onChange={(e) => setSampleTypeFreeform(e.target.checked)}/>
                    </Form.Group>
                </Row>           
                <Row className="mb-3"> 
                    <Form.Group as={Col} controlId="formSampleType">
                        <Form.Label>Category</Form.Label>
                        <InputGroup>
                        <Form.Control required type="text" placeholder="sample category" value={category} onChange={(e) => setSampleType(e.target.value)} disabled={samplePropertiesdisable}/>
                        
                        <OverlayTrigger trigger="click" placement="top" overlay={categoryPopover}>
                            <InputGroup.Text>
                                <i className="bi bi-question-circle"></i>
                            </InputGroup.Text>
                        </OverlayTrigger>
                        
                    </InputGroup>
                    </Form.Group>
                    <Form.Group as={Col} controlId="formRefrange">
                        <Form.Label>Reference Range</Form.Label>
                        <Form.Control type="text" value={range} onChange={(e) => setRange(e.target.value)} disabled={samplePropertiesdisable}/>
                    </Form.Group>  
                </Row>
                <Row className="mb-3"> 
                    <Form.Group as={Col} controlId="formUnit">
                        <Form.Label>Unit</Form.Label>
                        <Form.Control required type="text" placeholder="unit" value={unit} onChange={(e) => setUnit(e.target.value)} disabled={samplePropertiesdisable}/>
                    </Form.Group>
                    <Form.Group as={Col}></Form.Group>
                </Row>
                <hr/>
            </Form>
            </Container>
            
            <Container className="container-shadow">
                <Form>
                    <br/>
                    <h3>Result Details</h3>
                    <Row className="mb-3"> 
                        <Form.Group as={Col} controlId="microDate">
                            <Form.Label>Result Date</Form.Label>
                            <Form.Control type="date" value={resultDate} onChange={(e) => setResultDate(e.target.value)}/>
                        </Form.Group>
                        <Form.Group as={Col} controlId="microDate">
                            <Form.Label>Result Time</Form.Label>
                            <Form.Control type="time" value={resultTime} onChange={(e) => setResultTime(e.target.value)}/>
                        </Form.Group>
                    </Row>
                    <Row className="mb-3">
                        <Form.Group as={Col} controlId="microDate">
                            <Form.Label>Result</Form.Label>
                            <Form.Control type="text" value={result} onChange={(e) => setResult(e.target.value)}/>
                        </Form.Group>
                    </Row>        
                    <Row className="mb-3">
                        <Form.Group as={Col} controlId="formSave">
                            <Button variant="success"className="mt-4"  onClick={addSample}>{saveBtnText}</Button>
                        </Form.Group> 
                    </Row>  
                    <br/>     
                </Form>
            </Container>
            <Container>
                <Table className="mt-3 container-shadow">
                <tbody>
                <tr className="blue-back text-white">
                    <th colspan="4"><h3>Results</h3></th>
                </tr>
                {
                    Object.keys(results).map((item, index) => (
                        <>

                        <tr className="lightblue-back">
                            <th><h4>{results[item]['name']}</h4></th>
                            <th>Category: {results[item]['category']}</th>
                            <th>Range: {results[item]['range']} {results[item]['unit']}</th>
                            <th>
                                <Button variant="outline-info" className="float-end">Edit</Button>
                            </th>
                            
                        </tr>
                        {
                            results[item]['results'].map((itemResults,resultIndex) => (
                                <tr key={results[item]['name'] + resultIndex}>
                                    <td>{itemResults['datetime']}</td>
                                    <td>{itemResults['result']}</td>
                                    <td><a href="#"  onClick={() => {editResult(results[item]['name'],resultIndex)}}>edit</a></td>
                                </tr>
                            ))
                        }
                        </>
                        
                    ))
                }
                </tbody>
                </Table>
            </Container>
            

        
       
        </>
    )
}
export default AddBiochemistry
