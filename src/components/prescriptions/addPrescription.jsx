import React, { useState }  from "react";
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col'
import drugList from './drugList'
import { InputGroup } from "react-bootstrap";


const AddPrescription = ({newPrescription, closeModal}) => {
    
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
    const [stat, setStat] = useState("")
    const [note, setNotes] = useState("")

    
    
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
    const addAdmin = () =>{
        
    }
    const handleForm = () =>{
        let start = new Date(startDate)
        let end = new Date(endDate)
        
        let script = {
            "drug" : drugList["drugs"][drug][0],
            "dose": `${dose}${drugList["drugs"][drug][2]}`,
            "frequency": frequency, 
            "route": route,
            "form": drugList["drugs"][drug][3],
            "stat": stat,
            "start_date": start.toLocaleDateString('en-GB'),
            "end_date": end.toLocaleDateString('en-GB'),
            "indication": indication,
            "note": note,
            "prescriber": 'Dr Test',
            "administrations": [
                {}
            ]
            
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
    

    return(
        <>
            <Form class="was-validated" >
                <Row className="mb-3"> 
                    <Form.Group as={Col} controlId="formDrugName">
                        <Form.Label>Drug Name</Form.Label>
                        <Form.Select  onChange={handleDrug} >
                            <option selected disabled>Select Drug</option>
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
                        <Form.Select aria-label="Default select example" onChange={handleFreq}>
                            <option selected disabled>Select Frequency</option>
                            {frequencyDropDown}
                        </Form.Select>
                    </Form.Group>
                    <Form.Group as={Col} controlId="formRoute">
                        <Form.Label>Route</Form.Label>
                        <Form.Select aria-label="Default select example" onChange={handleRoute}>
                            <option selected disabled>Select Route</option>
                            {routeDropdown}
                        </Form.Select>
                    </Form.Group>
                </Row>
                <Row className="mb-3"> 
                    <Form.Group as={Col} controlId="formStartDate">
                        <Form.Label>Start Date</Form.Label>
                        <Form.Control required defaultValue={defaultDate} type="date" placeholder="Start Date" onChange={(e) => setStartDate(e.target.value)}/>
                    </Form.Group>
                    <Form.Group as={Col} controlId="formEndDate">
                        <Form.Label>End Date</Form.Label>
                        <Form.Control  type="date" placeholder="End Date" onChange={(e) => setEndDate(e.target.value)}/>
                    </Form.Group>
                </Row>
                <Row className="mb-3">
                    <Form.Group as={Col} controlId="formIndication">
                        <Form.Label>Indication</Form.Label>
                        <Form.Control type="text" placeholder="Indication" onChange={(e) => setIndication(e.target.value)}/>
                    </Form.Group>
                </Row>
                <Row className="mb-3">
                    <Form.Group as={Col} controlId="formNote">
                        <Form.Label>Note</Form.Label>
                        <Form.Control as="textarea" placeholder="Additional Notes" onChange={(e) => setNotes(e.target.value)} />
                    </Form.Group>
                </Row>
                <Row className="mb-3">
                    <Form.Group as={Col} controlId="statCheckbox">
                        <Form.Check type="checkbox" label="Stat" onChange={(e) => setStat(e.target.checked)}/>
                    </Form.Group>
                </Row>
                <hr/>
                <p>Administrations</p>
                <Row>
                    <Form.Group as={Col} controlId="formStartDate">
                        <Form.Label>Admin Date</Form.Label>
                        <Form.Control type="date" placeholder="Start Date" onChange={(e) => setStartDate(e.target.value)}/>
                    </Form.Group>
                    <Form.Group as={Col} controlId="formStartDate">
                        <Form.Label>Admin Time</Form.Label>
                        <Form.Control type="time" placeholder="Start Date" onChange={(e) => setStartDate(e.target.value)}/>
                    </Form.Group>
                    <Col className="my-1">
                        <br/>
                        <Button variant="outline-success" onClick= {() => addAdmin()}>Add</Button>
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