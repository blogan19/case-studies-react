import React, { useState, useEffect } from "react";
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col'
import drugList from './drugList'


const AddPrescription = ({newPrescription, editPrescription,editPrescriptionIndex, saveEdit, closeModal}) => {
    const [saveDisabled, setSaveDisabled] = useState(true)
    const [drug, setDrug] = useState("")
    const [freeFormDrug, setFreeFormDrug] = useState(false)
    const [freeFormFrequency, setFreeFormFrequency] = useState(false)
    const [dose, setDose] = useState("")
    const [unit, setUnit] = useState("")
    const [frequency, setFrequency] = useState("")
    const [route, setRoute] = useState("")
    const [form, setForm] = useState("")
    const [strength, setStrength] = useState("")
    

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

    //Load prescription to Edit
    const loadEditPrescription = () => {
        if(editPrescription['drugindex'] === 'freeform'){
            //If the drug was set via freeform we wont find it in the list
            setDrug(editPrescription['drug'])
            setFreeFormDrug(true)
        }else{
            setDrug(editPrescription['drugindex'])
        }
        

        let dose = editPrescription['dose']
        dose = dose.replace(editPrescription["unit"],"")
        setDose(dose)

        setUnit(editPrescription["unit"])
        setFrequency(editPrescription["frequency"])
        setRoute(editPrescription["route"])

        let start_date = editPrescription["start_date"]
        let startSplit = start_date.split('/');
        start_date = `${startSplit[2]}-${startSplit[1]}-${startSplit[0]}`
        console.log(start_date)
        setStartDate(start_date)

        let end_date = editPrescription["end_date"]
        let endSplit = end_date.split('/')
        end_date = `${endSplit[2]}-${endSplit[1]}-${endSplit[0]}`
        setEndDate(end_date)

        setIndication(editPrescription['indication'])
        setNotes(editPrescription['note'])
        setStat(editPrescription['stat'])
        console.log(editPrescription)
        console.log(editPrescriptionIndex)
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
         setStrength(drugList["drugs"][drugValue][1])
         setUnit(drugList["drugs"][drugValue][2])
         setForm(drugList["drugs"][drugValue][3])
         

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
        let end = ""
        if(endDate != ""){
            end = new Date(endDate)
            end = end.toLocaleDateString('en-GB')
        }
        //If not freeform then get drug from our list
        let drugName = null
        let drugUnit = null
        let drugStrength = null
        let drugIndex = null
        if(freeFormDrug === false){
            drugName = drugList["drugs"][drug][0]
            drugStrength = drugList["drugs"][drug][1]
            drugUnit = drugList["drugs"][drug][2]
            drugIndex = drug
        }else{
            drugName = drug
            drugUnit = unit
            drugStrength = strength
            drugIndex = 'freeform'
        }

        



         let script = {
            "drugindex": drugIndex,
            "drug" : drugName,
            "dose": `${dose}${unit}`,
            "unit": drugUnit,
            "frequency": frequency, 
            "route": route,
            "strength": strength,
            "form": form,
            "stat": stat,
            "start_date": start.toLocaleDateString('en-GB'),
            "end_date": end,
            "indication": indication,
            "note": note,
            "prescriber": 'Dr Test',
            "administrations": administrations
            
        }
        
        if(editPrescription != ""){
            saveEdit(script,editPrescriptionIndex)

        }else{
            newPrescription(script)
        }
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

    const checkComplete = () => {
        if(drug != ""  && dose != "" && unit !=""  && frequency != "" && route != ""){
            setSaveDisabled(false)
        }else{
            setSaveDisabled(true)
        }
    }
    useEffect(() => {
        checkComplete()
    });
    
    return(
        <>
            <Form class="was-validated" >
                <Row className="mb-3"> 
                    {freeFormDrug ===  false ? (
                        <Form.Group as={Col} controlId="formDrugName">
                            <Form.Label>Drug Name</Form.Label>
                            <Form.Select  onChange={handleDrug} value={drug} style={drug === "" ? {border: "solid 1px red"}: {border: ""}}>
                                <option selected>Select Drug</option>
                                {drugDropdown}
                            </Form.Select>
                        </Form.Group>
                    ):(
                        <>
                            <Form.Group as={Col} controlId="formDrugName">
                                <Form.Label>Drug Name</Form.Label>
                                <Form.Control placeholder="Drug Name"  value={drug} onChange={(e) => setDrug(e.target.value)} />
                            </Form.Group>
                            <Form.Group as={Col} controlId="formStrength">
                                <Form.Label>Strength</Form.Label>
                                <Form.Control placeholder="5mg"  value={strength} onChange={(e) => setStrength(e.target.value)} />
                            </Form.Group>
                            <Form.Group as={Col} controlId="formUnit">
                                <Form.Label>Unit</Form.Label>
                                <Form.Control placeholder="mg" value={unit} onChange={(e) => setUnit(e.target.value)} />
                            </Form.Group>
                            <Form.Group as={Col} controlId="formForm">
                                <Form.Label>Drug Name</Form.Label>
                                <Form.Control placeholder="Tablets" value={form} onChange={(e) => setForm(e.target.value)} />
                            </Form.Group>
                        </>
                    )}
                   
                </Row>
                <Row className="mb-3">
                    <Form.Group as={Col} controlId="statDrugNotInList">
                        <Form.Check type="checkbox" checked={freeFormDrug} label="Drug not in list?" onChange={(e) => setFreeFormDrug(e.target.checked)}/>
                    </Form.Group>
                </Row>
                <Row className="mb-3">
                    <Form.Group as={Col} controlId="formDose">
                        <Form.Label>Dose</Form.Label>
                        <Form.Control required type="number" placeholder="Dose" value={dose} onChange={(e) => setDose(e.target.value)} style={dose === "" ? {border: "solid 1px red"}: {border: ""}}/>
                    </Form.Group>
                    <Form.Group as={Col} controlId="formDose">
                        <Form.Label>Unit</Form.Label>
                        <Form.Control required type="text" placeholder="Unit" value={unit} disabled/>
                    </Form.Group>
                </Row>
                <Row className="mb-3">
                    <Form.Group as={Col} controlId="formFrequency">
                        <Form.Label>Frequency</Form.Label>
                        {freeFormFrequency === false ? (
                            <Form.Select aria-label="Default select example" value={frequency} onChange={handleFreq} style={frequency === "" ? {border: "solid 1px red"}: {border: ""}}>
                                <option selected disabled value="">Select Frequency</option>
                                {frequencyDropDown}
                            </Form.Select>
                        ):(
                            <Form.Control required type="text" placeholder="Frequency" value={frequency} onChange={(e) => setFrequency(e.target.value)} style={frequency === "" ? {border: "solid 1px red"}: {border: ""}}/>
                        )}
                        
                        
                        <Form.Check type="checkbox" checked={freeFormFrequency} label="Frequency not in list?" onChange={(e) => setFreeFormFrequency(e.target.checked)}/>
    
                    </Form.Group>
                    <Form.Group as={Col} controlId="formRoute">
                        <Form.Label>Route</Form.Label>
                        <Form.Select aria-label="Default select example" value={route} onChange={handleRoute} style={route === "" ? {border: "solid 1px red"}: {border: ""}}>
                            <option selected disabled value="">Select Route</option>
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
                        <Button variant="outline-success" onClick= {() => handleForm()} disabled={saveDisabled}>Save Prescription</Button>                        
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