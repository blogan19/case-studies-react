import React, { useState, useEffect } from "react";
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col'
import drugList from './drugList'
import { InputGroup } from "react-bootstrap";


const AddPrescription = ({newPrescription, editPrescription, closeModal}) => {
    
    const [drug, setDrug] = useState("")
    const [dose, setDose] = useState("")
    const [unit, setUnit] = useState("")
    const [frequency, setFrequency] = useState("")
    const [route, setRoute] = useState("")
    

    //dates   
    const defaultDate = new Date().toISOString().slice(0, 10)
    const [startDate, setStartDate] = useState(defaultDate)
    const [endDate, setEndDate] = useState("")


    const [indication, setIndication] = useState("")
    const [stat, setStat] = useState(false)
    const [note, setNotes] = useState("")

    //Adding Admins
    const [adminDate, setAdminDate] = useState("")
    const [adminTime, setAdminTime] = useState("")
    const [adminReason, setAdminReason] = useState("")
    const [administrations, setAdministrations] = useState([])

    // {
    //     "drugindex": "0",
    //     "drug": "apixaban",
    //     "dose": "20mg",
    //     "unit": "mg",
    //     "frequency": "",
    //     "route": "",
    //     "form": "tablets",
    //     "stat": "",
    //     "start_date": "19/12/2022",
    //     "end_date": "Invalid Date",
    //     "indication": "",
    //     "note": "",
    //     "prescriber": "Dr Test",
    //     "administrations": []
    // }
    //Load prescription to Edit
    const loadEditPrescription = () => {
        setDrug(editPrescription['drugindex'])

        let dose = editPrescription['dose']
        dose = dose.replace(editPrescription["unit"],"")
        setDose(dose)

        setUnit(editPrescription["unit"])
        setFrequency(editPrescription["frequency"])
        setRoute(editPrescription["route"])

        let start_date = editPrescription["start_date"]
        let startSplit = start_date.split('/');
        start_date = `${startSplit[2]}-${startSplit[1]-1}-${startSplit[0]}`
        setStartDate(start_date)

        let end_date = editPrescription["end_date"]
        let endSplit = end_date.split('/')
        end_date = `${endSplit[2]}-${endSplit[1]}-${endSplit[0]}`
        setEndDate(end_date)

        setIndication(editPrescription['indication'])
        setNotes(editPrescription['note'])
        setStat(editPrescription['stat'])
        console.log(editPrescription)
        console.log(editPrescription['stat'])
        console.log(stat)
    } 
    //Load previous data on first rerender only
    useEffect(() => {
        if(editPrescription != ""){
            loadEditPrescription()
        }
    },[]);

    
    
    const addAdmin = () => {
        setAdministrations(administrations.concat({
            "adminDateTime":adminDate + " " + adminTime,
            "administeredBy": "Nurse 1", 
            "adminNote": adminReason}))
    }
   
    
    const handleDrug = (event) => {
         //newPrescription(testScript);
         //closeModal()
         const drugValue = event.target.value
         setDrug(drugValue)
         setUnit(drugList["drugs"][drugValue][2])

    }
    const handleFreq = (event) => {
        setFrequency(event.target.value)
    }
    const handleRoute = (event) => {
        setRoute(event.target.value)
    }
    const handleAdminReason = (event) => {
        setAdminReason(event.target.value)
    }

    const deleteAdmin = (index) => {
        let adminList = administrations
        adminList.splice(index,1)
        setAdministrations(adminList)
    }

    const handleForm = () =>{
        let start = new Date(startDate)
        let end = new Date(endDate)
        
        let script = {
            "drugindex": drug,
            "drug" : drugList["drugs"][drug][0],
            "dose": `${dose}${drugList["drugs"][drug][2]}`,
            "unit": drugList["drugs"][drug][2],
            "frequency": frequency, 
            "route": route,
            "form": drugList["drugs"][drug][3],
            "stat": stat,
            "start_date": start.toLocaleDateString('en-GB'),
            "end_date": end.toLocaleDateString('en-GB'),
            "indication": indication,
            "note": note,
            "prescriber": 'Dr Test',
            "administrations": administrations
            
        }

        newPrescription(script)
        closeModal()
    }

    
    const drugDropdown = drugList["drugs"].map((x, index) => ( 
            <option value={index} key={index}>{x[0]} {x[1]} {x[3]}</option>
        )
    )

    const routeDropdown = drugList["routes"].map((x, index) => (
        <option value={x} key={x}>{x}</option>
        )
    )

    const frequencyDropDown = drugList["frequencies"].map((x,index) => (
        <option value={x} key={x}>{x}</option>
        )
    )
    const nonAdminDropDown = drugList["nonAdmins"].map((x,index) => (
        <option value={x} key={x}>{x}</option>
        )
    )
    const administrationDisplay = administrations.map((x, index) => (
        <p>{x["adminDateTime"]} {x["administeredBy"]} {x["adminNote"]} <a href='#' onClick={() => {deleteAdmin(index)}}> delete</a></p>

    ))

  
    return(
        <>
            <Form class="was-validated" >
                <Row className="mb-3"> 
                    <Form.Group as={Col} controlId="formDrugName">
                        <Form.Label>Drug Name</Form.Label>
                        <Form.Select  onChange={handleDrug} value={drug}>
                            <option selected>Select Drug</option>
                            {drugDropdown}
                        </Form.Select>
                        
                    </Form.Group>
                </Row>
                <Row className="mb-3">
                    <Form.Group as={Col} controlId="formDose">
                        <Form.Label>Dose</Form.Label>
                        <Form.Control required type="number" placeholder="Dose" value={dose} onChange={(e) => setDose(e.target.value)}/>
                    </Form.Group>
                    <Form.Group as={Col} controlId="formDose">
                        <Form.Label>Unit</Form.Label>
                        <Form.Control required type="text" placeholder="Unit" value={unit} disabled/>
                    </Form.Group>
                </Row>
                <Row className="mb-3">
                <Form.Group as={Col} controlId="formFrequency">
                        <Form.Label>Frequency</Form.Label>
                        <Form.Select aria-label="Default select example" value={frequency} onChange={handleFreq}>
                            <option selected disabled>Select Frequency</option>
                            {frequencyDropDown}
                        </Form.Select>
                    </Form.Group>
                    <Form.Group as={Col} controlId="formRoute">
                        <Form.Label>Route</Form.Label>
                        <Form.Select aria-label="Default select example" value={route} onChange={handleRoute}>
                            <option selected disabled>Select Route</option>
                            {routeDropdown}
                        </Form.Select>
                    </Form.Group>
                </Row>
                <Row className="mb-3"> 
                    <Form.Group as={Col} controlId="formStartDate">
                        <Form.Label>Start Date</Form.Label>
                        <Form.Control required value={startDate} defaultValue={defaultDate} type="date" placeholder="Start Date" onChange={(e) => setStartDate(e.target.value)}/>
                    </Form.Group>
                    <Form.Group as={Col} controlId="formEndDate">
                        <Form.Label>End Date</Form.Label>
                        <Form.Control  value={endDate} type="date" placeholder="End Date" onChange={(e) => setEndDate(e.target.value)}/>
                    </Form.Group>
                </Row>
                <Row className="mb-3">
                    <Form.Group as={Col} controlId="formIndication">
                        <Form.Label>Indication</Form.Label>
                        <Form.Control type="text" value={indication} placeholder="Indication" onChange={(e) => setIndication(e.target.value)}/>
                    </Form.Group>
                </Row>
                <Row className="mb-3">
                    <Form.Group as={Col} controlId="formNote">
                        <Form.Label>Note</Form.Label>
                        <Form.Control as="textarea" value={note} placeholder="Additional Notes" onChange={(e) => setNotes(e.target.value)} />
                    </Form.Group>
                </Row>
                <Row className="mb-3">
                    <Form.Group as={Col} controlId="statCheckbox">
                        <Form.Check type="checkbox" checked={stat} label="Stat" onChange={(e) => setStat(e.target.checked)}/>
                    </Form.Group>
                </Row>
                <hr/>
                <p>Administrations</p>
                <Row>
                    <Form.Group as={Col} controlId="formStartDate">
                        <Form.Label>Admin Date</Form.Label>
                        <Form.Control type="date" placeholder="Start Date" onChange={(e) => setAdminDate(e.target.value)}/>
                    </Form.Group>
                    <Form.Group as={Col} controlId="formStartDate">
                        <Form.Label>Admin Time</Form.Label>
                        <Form.Control type="time" placeholder="Start Date" onChange={(e) => setAdminTime(e.target.value)}/>
                    </Form.Group>
                    <Form.Group as={Col} controlId="formStartDate">
                        <Form.Label>Administered?</Form.Label>
                        <Form.Select aria-label="Default select example" onChange={handleAdminReason}>
                                {nonAdminDropDown}
                        </Form.Select>
                    </Form.Group>
                    <Col className="my-1">
                        <br/>
                        <Button variant="outline-success" onClick= {() => addAdmin()}>Add Administration</Button>
                    </Col>
                </Row>
                <Row className="mt-3">
                    <Col>
                    {administrationDisplay}
                    </Col>
                </Row>
                   
                <hr/>
                <Row>
                    <Col xs={6}>
                        <Button variant="outline-success" onClick= {() => handleForm()}>Add Prescription</Button>
                    </Col>
                    <Col>
                        <Button variant="outline-danger" onClick={() => closeModal()}>Cancel</Button>
                    </Col>
                </Row>
                
            </Form>
            
            
        </>


        
    )
}
export default AddPrescription