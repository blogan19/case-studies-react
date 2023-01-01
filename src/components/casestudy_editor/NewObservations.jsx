import React, { useState } from "react";
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Form from 'react-bootstrap/Form';
import Table from 'react-bootstrap/Table';


const AddObservations = ({closeModal,setObservations}) => {
    const newRecord = {datetime: '',time:'', systolic: '', diastolic: '',heart_rate: '',temperature: '',resp_rate:'', oxygen:''}
    const [recordState, setRecordState] = useState([
        { ...newRecord },
    ]);
  
    const addRecord = () => { 
        setRecordState([...recordState, {...newRecord}])
    }

    const copyPreviousRecord = () => { 
        let previousRecord = recordState[recordState.length-1]
        console.log(previousRecord)
        setRecordState([...recordState, {...previousRecord}])
    }

    const handleChange = (e) => {
        const updatedRecord = [...recordState];
        updatedRecord[e.target.dataset.idx][e.target.name] = e.target.value;
        setRecordState(updatedRecord);
    };

    const saveRecord = () => {
        let obsData = {
            "blood_pressure": [],
            "heart_rate": [],
            "temperature": [],
            "resp_rate": [],
            "oxygen": []
        }

        let records = recordState
        records.map((x) => {
            x.datetime = `${x.datetime} ${x.time}`

            //convert Data 
            obsData["blood_pressure"].push({"datetime":x.datetime, "systolic":x.systolic,"diastolic":x.diastolic})
            obsData["heart_rate"].push({"datetime":x.datetime, "rate":x.temperature})
            obsData["temperature"].push({"datetime":x.datetime, "temperature":x.temperature})
            obsData["resp_rate"].push({"datetime":x.datetime, "bpm":x.resp_rate})
            obsData["oxygen"].push({"datetime":x.datetime, "percentage":x.oxygen})
            
            closeModal()
            setObservations(obsData)
        })
        
        console.log(records)
        console.log(obsData)
    } 

    return(
        <Form>
            <Table>
                <thead>
                    <tr>
                        <th>Result Date</th>
                        <th>Time</th>
                        <th>Systolic</th>
                        <th>Diastolic</th>
                        <th>Heart Rate</th>
                        <th>Temperature</th>
                        <th>Respiratory Rate</th>
                        <th>Oxygen Sats</th>
                    </tr>
                </thead>

                <tbody>
        {
            recordState.map((val,idx) => {           
            return(
                <>
                   <tr className="mb-3">
                        <td>
                            <Form.Control type="date" name="datetime" data-idx={idx}  value={recordState[idx].datetime} onChange={handleChange}/>
                        </td>
                        <td>
                            <Form.Control type="time" name="time" data-idx={idx}  value={recordState[idx].time} onChange={handleChange}/>
                        </td>
                        <td>
                            <Form.Control type="text" name="systolic" placeholder="mmHg" data-idx={idx}  value={recordState[idx].systolic} onChange={handleChange}/>
                        </td>
                        <td>
                            <Form.Control type="text" name="diastolic" placeholder="mmHg" data-idx={idx}  value={recordState[idx].diastolic} onChange={handleChange}/>
                        </td>
                        <td>
                            <Form.Control type="text" name="heart_rate" placeholder="BPM" data-idx={idx}  value={recordState[idx].heart_rate} onChange={handleChange}/>
                        </td>
                        <td>
                            <Form.Control type="text" name="temperature" placeholder="&#8451;" data-idx={idx}  value={recordState[idx].temperature} onChange={handleChange}/>
                        </td>
                        <td>
                            <Form.Control type="text" name="resp_rate" placeholder="BPM" data-idx={idx}  value={recordState[idx].resp_rate} onChange={handleChange}/>
                        </td>
                        <td>
                            <Form.Control type="text" name="oxygen" placeholder="%" data-idx={idx}  value={recordState[idx].oxygen} onChange={handleChange}/>
                        </td>
                        <tr>
                            <td>
                                <ButtonGroup aria-label="edit buttons" className="mt-2">
                                    {
                                        idx === recordState.length -1 ? (
                                            <>
                                            <Button variant="info" onClick={copyPreviousRecord} size="sm"><i class="bi bi-clipboard"></i></Button>
                                            <Button variant="success" onClick={addRecord} size="sm"><i class="bi bi-plus"></i></Button>
                                            </>
                                        ): ""
                                    }
                                    <Button variant="outline-danger" onClick={() => {setRecordState(recordState.filter(x => x !== val))}} size="sm"><i class="bi bi-trash3"></i></Button>
                                </ButtonGroup>
                            </td>    
                        </tr>
        
                    </tr>
                </>
            )
            })
        }
        </tbody>
        </Table>
        <Button onClick={saveRecord} variant="success">Save</Button>
        </Form>
    )
}
/* <Form> 
<Row className="mb-3">
    <Form.Group as={Col} controlId="sampleDate">
        <th>Result Date</th>
        <Form.Control type="date" value={resultDate} onChange={(e) => setResultDate(e.target.value)}/>
    </Form.Group>
</Row> 
<Row className="mb-3">
    <Form.Group as={Col} controlId="formSystolic">
        <th>Systolic</Form.Label>
        <Form.Range  value={systolic} min="60" max="250" onChange={e => setSystolic(e.target.value)}/>
    </Form.Group>
    <Form.Group as={Col} controlId="formDiastolic">
        <th>Diastolic</Form.Label>
        <Form.Range  value={diastolic} min="60" max="250" onChange={e => setDiastolic(e.target.value)}/>
    </Form.Group>   
    <Form.Group as={Col} controlId="formDiastolic">
        {diastolic != "" ? (<Button variant="outline-success">{systolic}/{diastolic} mmHg</Button>):""}
    </Form.Group>              
</Row>
<Row className="mb-3">
    <Form.Group as={Col} controlId="formHR">
        <th>Heart Rate</Form.Label>
        <Form.Range  value={heart_rate} min="60" max="250" onChange={e => setHeartRate(e.target.value)}/>
    </Form.Group>   
    <Form.Group as={Col} controlId="formHRDisp">
        {heart_rate != "" ? (<Button variant="outline-success">{heart_rate} Beats Per Minute</Button>):""}
    </Form.Group>
</Row>
<Row className="mb-3">
    <Form.Group as={Col} controlId="formHR">
        <th>Temperature</Form.Label>
        <Form.Range  value={temperature} min="60" max="250" onChange={e => setTemp(e.target.value)}/>
    </Form.Group>   
    <Form.Group as={Col} controlId="formHRDisp">
        {temperature != "" ? (<Button variant="outline-success">{temperature} Degrees Celcius</Button>):""}
    </Form.Group>
</Row>
</Form> */
export default AddObservations
