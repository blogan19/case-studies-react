import React, { useState, useEffect } from "react";
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Form from 'react-bootstrap/Form';
import Table from 'react-bootstrap/Table';


const AddObservations = ({closeModal,setObservations, previousResult}) => {
    const newRecord = {datetime: '',time:'', systolic: '', diastolic: '',heart_rate: '',temperature: '',resp_rate:'', oxygen:''}
    const [recordState, setRecordState] = useState([
        { ...newRecord },
    ]);

    // [
    //     {
    //         "datetime": "2022-12-26 15:29",
    //         "time": "15:29",
    //         "systolic": "123",
    //         "diastolic": "",
    //         "heart_rate": "81",
    //         "temperature": "37.5",
    //         "resp_rate": "65",
    //         "oxygen": "92"
    //     }
    // ]
    const loadPrevious = () => {
        console.log(previousResult)
        let results = []
      
        previousResult["blood_pressure"].map((x,index) => {
            let dateSplit = x.datetime.split(" ")
            let resultObject = {
                "datetime": dateSplit[0],
                "time": dateSplit[1],
                "systolic": x.systolic,
                "diastolic": x.diastolic,
                "heart_rate": previousResult["heart_rate"][index]["rate"],
                "temperature": previousResult["temperature"][index]["temperature"],
                "resp_rate": previousResult["resp_rate"][index]["bpm"],
                "oxygen": previousResult["oxygen"][index]["percentage"]
            }
            results.push(resultObject)
        })
        setRecordState(results)

    }
    //Functions called on first render
    useEffect(() => {
        if(previousResult != ""){
            loadPrevious()
        }
    },[]);
  
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
                            <Form.Control type="date" name="datetime" data-idx={idx}  value={recordState[idx].datetime} onChange={handleChange} style={recordState[idx].datetime === "" ? {border: "solid 1px red"}: {border: ""}}/>
                        </td>
                        <td>
                            <Form.Control type="time" name="time" data-idx={idx}  value={recordState[idx].time} onChange={handleChange}  style={recordState[idx].time === "" ? {border: "solid 1px red"}: {border: ""}}/>
                        </td>
                        <td>
                            <Form.Control type="text" name="systolic" placeholder="mmHg" data-idx={idx}  value={recordState[idx].systolic} onChange={handleChange}  style={recordState[idx].systolic === "" ? {border: "solid 1px red"}: {border: ""}}/>
                        </td>
                        <td>
                            <Form.Control type="text" name="diastolic" placeholder="mmHg" data-idx={idx}  value={recordState[idx].diastolic} onChange={handleChange}  style={recordState[idx].diastolic=== "" ? {border: "solid 1px red"}: {border: ""}}/>
                        </td>
                        <td>
                            <Form.Control type="text" name="heart_rate" placeholder="BPM" data-idx={idx}  value={recordState[idx].heart_rate} onChange={handleChange}  style={recordState[idx].heart_rate === "" ? {border: "solid 1px red"}: {border: ""}}/>
                        </td>
                        <td>
                            <Form.Control type="text" name="temperature" placeholder="&#8451;" data-idx={idx}  value={recordState[idx].temperature} onChange={handleChange}  style={recordState[idx].temperature === "" ? {border: "solid 1px red"}: {border: ""}}/>
                        </td>
                        <td>
                            <Form.Control type="text" name="resp_rate" placeholder="BPM" data-idx={idx}  value={recordState[idx].resp_rate} onChange={handleChange}  style={recordState[idx].resp_rate === "" ? {border: "solid 1px red"}: {border: ""}}/>
                        </td>
                        <td>
                            <Form.Control type="text" name="oxygen" placeholder="%" data-idx={idx}  value={recordState[idx].oxygen} onChange={handleChange}  style={recordState[idx].oxygen === "" ? {border: "solid 1px red"}: {border: ""}}/>
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

export default AddObservations
