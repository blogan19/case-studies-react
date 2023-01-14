import React, { useState, useEffect } from "react";
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import ToggleButton from 'react-bootstrap/ToggleButton';
import ToggleButtonGroup from 'react-bootstrap/ToggleButtonGroup';
import data from './randomFields'
import PatientDetails from "../patient_records/Patient_details"
import ListGroup from 'react-bootstrap/ListGroup';
import Alert from "react-bootstrap/Alert";
import ContentHeader from "../Content_header";


const NewCaseForm = ({closeNewPatient, patientDemographics, setPatientAllergies, currentDemographics, currentAllergies}) => {
    const [name, setName] = useState("")
    const [age, setAge] = useState("")
    const [dob, setDob] = useState("")  
    const [weight, setWeight] = useState("")
    const [height, setHeight] = useState("")
    const [gender, setGender] = useState("")
    const [address, setAddress] = useState("")

    //Generate Random hospital Number
    const randomCharacter = () =>{
        let characters = "ABCDEFGHIJKLMNOPQRSTUVQXYZ"
        return(characters[Math.floor(Math.random() * characters.length)])
     } 
          
    let randomHospNo = Math.floor(Math.random() * 1000000) + randomCharacter()
    const [hospNo, setHospNo] = useState(randomHospNo)
    
    //Patient objects
    let patient = { 
        "name": name,
        "hospitalNo": hospNo,
        "dob": dob,
        "address": address,
        "weight": weight + "kg",
        "height": height + "cm",
        "gender": gender,
    }

    //load previous patient 
    const loadExistingDetails = () =>{
        console.log(currentDemographics)

        setName(currentDemographics['name'])
        setDob(currentDemographics['dob'])
        setAddress(currentDemographics['address'])

        let wt = currentDemographics['weight'].replace('kg','')
        setWeight(wt)

        let ht = currentDemographics['height'].replace('cm','')
        setHeight(ht)

        setGender(currentDemographics['gender'])

        setAllergies(currentAllergies)

    }

    //Load previous data n first rerender only
    useEffect(() => {
        if(currentDemographics.length != ""){
            loadExistingDetails()
        }
    },[]);

    //generate a random name
    const randomName = (gender) => {       
        let firstname = data["names"][gender][Math.floor(Math.random() * data["names"][gender].length)]  
        let surname = data["names"]["surnames"][Math.floor(Math.random() * data["names"]["surnames"].length)]   
        setName(firstname + " " + surname)
    }

    //Takes an age and converts it to a dob   
    const birthdate = (age) =>{
        setAge(age)
        let today = new Date(new Date().setFullYear(new Date().getFullYear()))
        let tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate()+1)
        
        let earliest =  today.setFullYear(today.getFullYear() - age);       
        earliest = new Date(earliest).getTime()

        let latest =  tomorrow.setFullYear(tomorrow.getFullYear() - age-1)
        latest = new Date(latest).getTime()

        let randomDate = new Date(earliest + Math.random() * (latest-earliest))
        setDob(randomDate.toLocaleDateString())
    }
    
    const randomAddress = () => {
        let houseNo = Math.ceil(Math.random() * 120)
        let street = data["addresses"]["streets"][Math.floor(Math.random() * data["addresses"]["streets"].length)] 
        let town = data["addresses"]["towns"][Math.floor(Math.random() * data["addresses"]["towns"].length)]
        let postCode = `${randomCharacter()}${randomCharacter()}${Math.ceil(Math.random() * 10)} ${Math.ceil(Math.random() * 10)}${randomCharacter()}${randomCharacter()}`
        let addressStr= `${houseNo} ${street}, ${town}, ${postCode}`
        setAddress(addressStr)
    }

    const updateGender = (val) => setGender(val) 

    //Handle Allergies
    const [allergies, setAllergies] = useState([])
    const [newAllergyInput, setAllergyInput] = useState("")
    const [newReactionInput, setReactionInput] = useState("")
    
    const handleAddAllergy = () => {
        let newAllergy =  {
            "drug":newAllergyInput, 
            "reaction": newReactionInput
        }
        //check if NKDA present
        let allergyList = allergies
        if(allergies.length > 0){
            if(allergies[0]["drug"] == "NKDA" || allergies[0]["drug"] == "Unconfirmed Allergy Status" ){
                allergyList.shift()
                allergyList.push(newAllergy)
            }else{
                allergyList.push(newAllergy)
            }
        }else{
            allergyList.push(newAllergy)
        }
        
        setAllergies(allergyList)   
        setAllergyInput("")     
        setReactionInput("")
    }

    const deleteAllergy = (allergy) => {
        let allergyList = allergies
        allergyList.splice(allergy,1)
        setAllergies(allergyList)
        checkComplete()
    }

    const randomPatient = (gender) => {
        //generates an entirely random patient except for allergies
        randomName(gender)
        randomAddress()
        let randomAge = Math.floor(Math.random() * (100 - 18 + 1) + 18)
        birthdate(randomAge)
        gender == "male_names" ? setGender("Male"):setGender("Female")
        let randomWeight = Math.floor(Math.random() * (150 - 50 + 1) + 30)
        let randomHeight = Math.floor(Math.random() * (220 - 150 + 1) + 150)
        setWeight(randomWeight)
        setHeight(randomHeight)

    }

    //toggle disabled for save button
    const [continueDisabled, setContinueDisabled] = useState(true)
    const [patientComplete, setPatientComplete] = useState(false)        
   
    //check all details have been completed and changes colours
    const checkComplete = () =>{
        if(name != "" && hospNo != "" && dob != "" && address != "" && weight != "" && height != "" && gender != ""){
            if(allergies != ""){
                setContinueDisabled(false)
            }else{
                setContinueDisabled(true)
            }            
            setPatientComplete(true)
        }else{
            setContinueDisabled(true)
            setPatientComplete(false)
        }
    }

    //Send patient to parent element and closes offcanvas
    const savePatient = () =>{
        patientDemographics(patient)
        setPatientAllergies(allergies)
        closeNewPatient()
    }
    
    //Check for completion each render each time
    useEffect(() => {
        checkComplete()
    });
    
    


    return(
        <> 
        <ContentHeader title="Patient Demographics" complete={patientComplete === true ? "true":""}/>

        <Container>
            <Form>              
                {/* <Row className=" mt-3 mb-3">
                    <Col>
                        <ListGroup horizontal>
                            <ListGroup.Item style={name.length > 0 ? {backgroundColor : "#77DD77"}: {backgroundColor : ""}}>Patient Name</ListGroup.Item>
                            <ListGroup.Item style={hospNo.length > 0 ? {backgroundColor : "#77DD77"}: {backgroundColor : ""}}>Hospital No</ListGroup.Item>
                            <ListGroup.Item style={dob.length > 0 ? {backgroundColor : "#77DD77"}: {backgroundColor : ""}}>DOB</ListGroup.Item>
                            <ListGroup.Item style={address.length > 0 ? {backgroundColor : "#77DD77"}: {backgroundColor : ""}}>Address</ListGroup.Item>
                            <ListGroup.Item style={weight > 0 ? {backgroundColor : "#77DD77"}: {backgroundColor : ""}}>Weight</ListGroup.Item>
                            <ListGroup.Item style={height > 0 ? {backgroundColor : "#77DD77"}: {backgroundColor : ""}}>Height</ListGroup.Item>
                            <ListGroup.Item style={gender.length > 0 ? {backgroundColor : "#77DD77"}: {backgroundColor : ""}}>Gender</ListGroup.Item>
                            <ListGroup.Item style={allergies.length > 0 ? {backgroundColor : "#77DD77"}: {backgroundColor : ""}}>Allergy Status</ListGroup.Item>
                        </ListGroup>
                    </Col>            
                </Row> */}
                <Row className="mb-3">
                    <Alert variant="info" className="mt-3">
                        <p>Patient demographics can be set manually using the fields below or a random patient can be generated using the randomise buttons</p>
                        <Button variant="outline-primary" onClick={() => randomPatient('male_names')}>Random Male Patient</Button>{' '}
                        <Button variant="outline-primary" onClick={() => randomPatient('female_names')}>Random Female Patient</Button>   
                    </Alert>                
                </Row>
                <Row className="mb-3">
                    <Col>
                    Patient Name
                        <InputGroup>
                            <Form.Control aria-label="Patients name" defaultvalue={name} value={name}  onChange={(e) => setName(e.target.value)}/>
                            <Button variant="outline-secondary" onClick= {() => randomName("male_names")}>Random Male</Button>
                            <Button variant="outline-secondary" onClick= {() => randomName("female_names")}>Random Female</Button>
                        </InputGroup>
                    </Col>
                </Row>
                <Row className="mb-3">
                    <Form.Group as={Col} controlId="formHospitalno">
                        <Form.Label>Hospital Number</Form.Label>
                        <Form.Control type="text" onChange={(e) => setHospNo(e.target.value)} value={hospNo}/>
                    </Form.Group> 
                </Row>
                <Row className="mb-3">
                    <Form.Group as={Col} controlId="formBirthDate">
                        <Form.Label>Age <span>{age}</span></Form.Label>
                        <Form.Range  value={age} onChange={e => birthdate(e.target.value)}/>
                    </Form.Group>
                    <Form.Group as={Col} controlId="formHospitalno">
                        <Form.Label>Date of Birth</Form.Label>
                        <Form.Control type="text" defaultvalue={dob} value={dob}/>
                    </Form.Group> 
                </Row>
                <Row className="mb-3">
                    <Form.Group as={Col} controlId="formAddress">
                        <Form.Label>Address</Form.Label>
                        <InputGroup>
                            <Form.Control type="text" onChange={(e) => setAddress(e.target.value)} defaultvalue={address} value={address}/>
                            <Button variant="outline-secondary" onClick= {() => randomAddress()}>Random Address</Button>
                        </InputGroup>
                    </Form.Group>
                </Row>
                <Row className="mb-3">
                    <Form.Group as={Col} controlId="formWeight">
                        <Form.Label>Weight</Form.Label>
                        <InputGroup>
                            <Form.Control type="text" onChange={(e) => setWeight(e.target.value)} defaultvalue={weight} value={weight}/>
                            <Button variant="secondary" disabled>kg</Button>
                        </InputGroup>
                    </Form.Group>
                    <Form.Group as={Col} controlId="formWeight">
                        <Form.Label>Height</Form.Label>
                        <InputGroup>
                            <Form.Control type="text" onChange={(e) => setHeight(e.target.value)} defaultvalue={height} value={height}/>
                            <Button variant="secondary" disabled>cm</Button>
                        </InputGroup>
                    </Form.Group>
            
                    <Form.Group as={Col}>
                        <Form.Label>Gender</Form.Label>
                            <InputGroup>
                                <ToggleButtonGroup type="radio" name="genderOptions" value={gender} defaultvalue={gender} onChange={updateGender}>
                                    <ToggleButton id="gender1" value={"Male"} variant="outline-primary">
                                        Male
                                    </ToggleButton>
                                    <ToggleButton id="gender2" value={"Female"} variant="outline-primary" >
                                        Female
                                    </ToggleButton>
                                </ToggleButtonGroup>
                            </InputGroup>
                    </Form.Group>
                </Row>
            </Form>
            </Container>
            <Container>
            <ContentHeader title="Allergies" className="mt-5" complete={allergies != "" ? "true":""}/>
            <Form className="mt-3 mb-3">
            <Container>
                <Row className="mb-3">
                    <Alert variant="info" className="mt-3">
                        <p>Use the text boxes below to enter an unlimited number of allergies. Alternatively set the allergies to unconfirmed or NKDA</p>
                    </Alert>
                </Row>
                <Row className="mb-3">
                    <Col>
                        <Button variant="outline-primary" onClick={() => setAllergies([{"drug":"NKDA","reaction":""}])}>Set to NKDA</Button>{' '}
                        <Button variant="outline-primary" onClick={() => setAllergies([{"drug":"Unconfirmed Allergy Status","reaction":""}])}>Set to Unconfirmed Allergies</Button>{' '}
                    </Col>
                </Row>
                <Row className="mb-3">
                    <Form.Group as={Col} controlId="formAllergy">
                            <Form.Control type="text" placeholder="Allergen" value={newAllergyInput} onChange={(e) => setAllergyInput(e.target.value)}/>           
                    </Form.Group>
                    <Form.Group as={Col} controlId="formAllergyReaction">
                        <Form.Control type="text" placeholder="Reaction" value={newReactionInput} onChange={(e) => setReactionInput(e.target.value)}/>                     
                    </Form.Group>
                </Row>
            </Container>
            <Row>
                <Col>
                    {
                        newAllergyInput.length > 0 ? (
                            <Button variant="outline-primary" onClick={handleAddAllergy}>Add Allergy</Button>
                        ):""
                    }
                    {' '}
                    {
                     
                        allergies.map(((allergy, index) => (
                            <p>
                                {allergy.drug} {allergy.reaction} <a href='#' onClick={() => {setAllergies(allergies.filter(x => x !== allergy))}} > delete</a>
                            </p>
                        )))   
                    }
                    
                </Col>
               
            </Row>
            <hr/>
        </Form>
        </Container>
        
        <Container className="mt-3">
            <ContentHeader title="Patient Preview" className="mb-5"/>
            <Row>
                <PatientDetails patient={patient} allergies={allergies} />
            </Row>
            <hr/>
            <Row>
                <Col>
                    <Button variant="primary" disabled={continueDisabled} onClick={savePatient}>Save Patient</Button>
                </Col>
            </Row>
        </Container>
        
        

        </>
    
    )
}
export default NewCaseForm

