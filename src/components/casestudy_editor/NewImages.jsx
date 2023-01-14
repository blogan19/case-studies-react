import React, { useState, useEffect } from "react";
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

// "imaging":[{
//     "image_date": "2022-01-01",
//     "image_url": "",
//     "image_desc": "Chest x-ray",
//     "image_type": 
const AddImages = ({closeModal,setImages, previousResult}) => {
    const newRecord = {image_date: '',image_time:'',image_url:'',image_type:'',image_desc:''}
    const [recordState, setRecordState] = useState([
        { ...newRecord },
    ]);

    const addRecord = () => { 
        setRecordState([...recordState, {...newRecord}])
    }
    const handleChange = (e) => {
        const updatedRecord = [...recordState];
        updatedRecord[e.target.dataset.idx][e.target.name] = e.target.value;
        setRecordState(updatedRecord);
    };

    const loadPrevious = () => {
        setRecordState(previousResult)
    }

    const saveRecords = () => {
        setImages(recordState)
        closeModal()
    }

    useEffect(() => {
        if(previousResult != ""){
            loadPrevious()
        }
    },[]);
    console.log(recordState)
    return(
        <Form>
            {
                recordState.map((val,idx) => {
                    return(
                        <>
                            <Row className="mb-3"> 
                                <Form.Group as={Col} controlId="imageDate">
                                    <Form.Label>Image Date</Form.Label>
                                    <Form.Control type="date" name="image_date" data-idx={idx}  value={recordState[idx].image_date} onChange={handleChange} style={recordState[idx].image_date === "" ? {border: "solid 1px red"}: {border: ""}}/>
                                </Form.Group>
                                <Form.Group as={Col} controlId="imagetime">
                                    <Form.Label>Image Time</Form.Label>
                                    <Form.Control type="time" name="image_time" data-idx={idx}  value={recordState[idx].image_time} onChange={handleChange} style={recordState[idx].image_time === "" ? {border: "solid 1px red"}: {border: ""}}/>
                                </Form.Group>
                            </Row>
                            <Row className="mb-3"> 
                                <Form.Group as={Col} controlId="imageURL">
                                    <Form.Label>Image URL</Form.Label>
                                    <Form.Control type="text" name="image_url" data-idx={idx}  value={recordState[idx].image_url} onChange={handleChange} style={recordState[idx].image_url === "" ? {border: "solid 1px red"}: {border: ""}}/>
                                </Form.Group>
                            </Row>
                            <Row className="mb-3"> 
                                <Form.Group as={Col} controlId="imageDate">
                                    <Form.Label>Image Title (e.g. Chest X-Ray)</Form.Label>
                                    <Form.Control type="text" name="image_type" data-idx={idx}  value={recordState[idx].type} onChange={handleChange} style={recordState[idx].type === "" ? {border: "solid 1px red"}: {border: ""}}/>
                                </Form.Group>
                            </Row>
                            <Row className="mb-3"> 
                                <Form.Group as={Col} controlId="imageDesc">
                                    <Form.Label>Image Description</Form.Label>
                                    <Form.Control type="text" name="image_desc" data-idx={idx}  value={recordState[idx].image_desc} onChange={handleChange} style={recordState[idx].image_desc === "" ? {border: "solid 1px red"}: {border: ""}}/>
                                </Form.Group>
                            </Row>
                        </>
                    )
                })
            }
            <Row>
                <Col sm={3}>
                    <Button variant="outline-success" onClick={addRecord} size="sm">Add Another Image<i class="bi bi-plus"></i></Button>
                </Col>
                <Col>
                    <Button variant="success" onClick={saveRecords} size="sm">Save Images</Button>
                </Col>
                
            </Row>
        </Form>
        
    ) 
}

export default AddImages
