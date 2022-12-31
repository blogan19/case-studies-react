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

const AddBiochemistry = ({closeModal, previousResult, setBiochemistry}) => {
    //https://esneftpathology.nhs.uk/wp-content/uploads/2021/06/Clinical-BioChemistry-Pathology-Handbook.pdf
    const [sampleDropdownList, setSampleDropdownList] = useState()
    const [cancelBtn, setCancelBtn] = useState(false)
    const [editingTableRow, setEditingTableRow] = useState()

    //modal 
    const [showEditModal, setShowEditModal] = useState(false);
    const handleCloseEditModal = () => setShowEditModal(false);

    //Ading a record
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

    //editing a record
    const [editRecord, setEditRecord] = useState("")
    const [editingSample, setEditSample] = useState("")//keeps track of sample we're editing
    const [editType, setEditType] = useState("")//keeps track of whether editing individual sample or sample type

    //Deleting a record
    const [deletedCount, setDeletedCount] = useState(0)
   
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

    
    const categoryPopover = (
        <Popover id="popover-basic">
          <Popover.Header as="h3">Sample Category</Popover.Header>
          <Popover.Body>
            Samples with the same category are grouped together into the same table
          </Popover.Body>
        </Popover>
      );

    const resetForm = () => {
        setCancelBtn(false)
        setResultDate("")
        setResultTime("")
        setResult("")
        setEditRecord("")
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
            resultList[editRecord[0]]['results'][editRecord[1]] = resultDetails
        }
        resetForm("")
        setResults(resultList)
    }    

    //Edit a result function sets all form to values of record being edited
    const editResult = (sampleIndex, resultIndex) => {
        //set colour of editing record 
        setEditingTableRow(sampleIndex+resultIndex)

    
        let editSample = results[sampleIndex]['results'][resultIndex]
      
        setResult(editSample['result'])        

        //Keep track of record editing record
        setEditRecord([sampleIndex, resultIndex])

        //split datetime
        let resultDateTime = editSample['datetime'].split(" ")
        setResultDate(resultDateTime[0])
        setResultTime(resultDateTime[2])    
    }

    
    const editSample = (sample) => {
        let sampleRecord = results[sample]
        setSampleType(sampleRecord['name'])
        setCategory(sampleRecord['category'])
        setRange(sampleRecord['range'])
        setUnit(sampleRecord['unit'])
        setEditSample(sample)
    }
    const saveEditSample = () => {
        console.log(editingSample)
        let resultList = results
        let sample = {
            "name": sampleType,
            "category": category,
            "range": range,
            "unit": unit,
            "results": resultList[editingSample]['results']
        }
        resultList[editingSample] = sample
        setResults(resultList)
        
    }
    const deleteResult = (sampleIndex, resultIndex) => {
        let sampleList = results
        let resultList = sampleList[sampleIndex]['results']
        resultList.splice(resultIndex,1)
        sampleList[sampleIndex]['results'] = resultList
        setResults(sampleList)
        setDeletedCount(deletedCount + 1)
    }

    const saveResultList = () => {
        setBiochemistry(results)
        closeModal()
    }

    //Functions called on first render
    useEffect(() => {
        sampleDropdown()
        console.log(previousResult)
        if(previousResult != ""){
            setResults(previousResult)
        }
    },[]);

    
    //https://geekymedics.com/reference-ranges/
    //https://esneftpathology.nhs.uk/wp-content/uploads/2021/06/Clinical-BioChemistry-Pathology-Handbook.pdf

    return(
        <>
        <ContentHeader title="Biochemistry" className="mb-3"/> 
        <Container className="container-shadow mt-3">
            <Form className="mb-3"> 
                <br/>
                
                {
                    cancelBtn === true ? (
                        <>
                            <h4>Edit Sample</h4>
                        </>
                        
                    ):(
                        <h4>Add a New Sample</h4>
                    )
                }
                {
                    sampleTypeFreeform === false ? (
                        <Row className="mb-3"> 
                            <Form.Group as={Col} controlId="formSampleTypeDropdown">
                                <Form.Select onChange={handleSampleType} value={sampleType} >
                                        <option selected>Select Sample Type</option>
                                        {sampleDropdownList}
                                </Form.Select>        
                            </Form.Group>
                        </Row>
                    ):(
                        <Row className="mb-3"> 
                            <Form.Group as={Col} controlId="formSampleType">
                                <Form.Control required type="text" placeholder="sample type" value={sampleType} onChange={(e) => setSampleType(e.target.value)} />
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
                        <Form.Control required type="text" placeholder="sample category" value={category} onChange={(e) => setCategory(e.target.value)} />
                        
                        <OverlayTrigger trigger="click" placement="top" overlay={categoryPopover}>
                            <InputGroup.Text>
                                <i className="bi bi-question-circle"></i>
                            </InputGroup.Text>
                        </OverlayTrigger>
                        
                    </InputGroup>
                    </Form.Group>
                    <Form.Group as={Col} controlId="formRefrange">
                        <Form.Label>Reference Range</Form.Label>
                        <Form.Control type="text" value={range} onChange={(e) => setRange(e.target.value)} />
                    </Form.Group>  
                    <Form.Group as={Col} controlId="formUnit">
                        <Form.Label>Unit</Form.Label>
                        <Form.Control required type="text" placeholder="unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
                    </Form.Group>
                </Row>
                <Row className="mb-3"> 
                    <Form.Group as={Col} controlId="microDate">
                        <Form.Label>Result Date</Form.Label>
                        <Form.Control type="date" value={resultDate} onChange={(e) => setResultDate(e.target.value)}/>
                    </Form.Group>
                    <Form.Group as={Col} controlId="microDate">
                        <Form.Label>Result Time</Form.Label>
                        <Form.Control type="time" value={resultTime} onChange={(e) => setResultTime(e.target.value)}/>
                    </Form.Group>
                    <Form.Group as={Col} controlId="microDate">
                        <Form.Label>Result</Form.Label>
                        <Form.Control type="text" value={result} onChange={(e) => setResult(e.target.value)}/>
                    </Form.Group>
                </Row>    
                <Row className="mb-3">
                    <Form.Group as={Col} controlId="formSave">
                        <Button variant="success" className="mt-4"  onClick={addSample}>Save</Button>                       
                    </Form.Group> 
                </Row>  
                <br/>     
                </Form>
            </Container>
            <Container>
                <Row>
                    <Button variant="success" onClick={saveResultList}>Save Biochemistry</Button>
                </Row>
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
                                <Button variant="outline-info" className="float-end" onClick={() => {setShowEditModal(true);setEditType("sample_details");editSample(results[item]['name'])}}>Edit</Button>
                            </th>
                            
                        </tr>
                        {
                            results[item]['results'].map((itemResults,resultIndex) => (
                                <tr key={results[item]['name'] + resultIndex} className={results[item]['name']+resultIndex == editingTableRow ? "highlighted-row":""}>
                                    <td>{itemResults['datetime']}</td>
                                    <td>{itemResults['result']}</td>
                                    <td></td>
                                    <td><a href="#"  onClick={() => {setShowEditModal(true);editResult(results[item]['name'],resultIndex);setEditType("sample_result")}}>edit</a> <a href="#"  onClick={() => {deleteResult(results[item]['name'],resultIndex)}}>delete</a></td>
                                </tr>
                            ))
                        }
                        </>
                        
                    ))
                }
                </tbody>
                </Table>
            </Container>
            

        <Modal show={showEditModal} onHide={handleCloseEditModal} >
            <Modal.Header closeButton>
            <Modal.Title>Edit Biochemistry</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {
                    editType === 'sample_result' ? (
                        <>
                        <Row className="mb-3"> 
                            <Form.Group as={Col} controlId="microDate">
                                <Form.Label>Result Date</Form.Label>
                                <Form.Control type="date" value={resultDate} onChange={(e) => setResultDate(e.target.value)}/>
                            </Form.Group>
                        </Row>
                        <Row className="mb-3">
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
                        <Button variant="success" className="mt-4" onClick={() => {addSample(); handleCloseEditModal()}}>Save</Button>
                        </>
                    ):(
                        <>
                             <Row className="mb-3"> 
                            <Form.Group as={Col} controlId="formSampleType">
                                <Form.Control required type="text" placeholder="Sample type" value={sampleType} onChange={(e) => setSampleType(e.target.value)} />
                            </Form.Group>
                        </Row>                     
                        <Row className="mb-3"> 
                            <Form.Group as={Col} controlId="formSampleType">
                                <Form.Label>Category</Form.Label>
                                <Form.Control required type="text" placeholder="Sample category" value={category} onChange={(e) => setCategory(e.target.value)} />
                            </Form.Group>
                        </Row>
                        <Row className="mb-3">
                            <Form.Group as={Col} controlId="formRefrange">
                                <Form.Label>Reference Range</Form.Label>
                                <Form.Control placeholder="Reference Range" type="text" value={range} onChange={(e) => setRange(e.target.value)} />
                            </Form.Group>  
                        </Row>
                        <Row className="mb-3">
                            <Form.Group as={Col} controlId="formUnit">
                                <Form.Label>Unit</Form.Label>
                                <Form.Control required type="text" placeholder="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
                            </Form.Group>
                        </Row>
                        <Button variant="success" className="mt-4" onClick={() => {saveEditSample(); handleCloseEditModal()}}>Save</Button>



                        
                        </>
                    )
                }
               
            </Modal.Body>
        </Modal>

        

        
       
        </>
    )
}
export default AddBiochemistry
