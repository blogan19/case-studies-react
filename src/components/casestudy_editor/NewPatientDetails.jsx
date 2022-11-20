import React, { useState, useEffect } from "react";
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import ToggleButton from 'react-bootstrap/ToggleButton';
import ToggleButtonGroup from 'react-bootstrap/ToggleButtonGroup';
import data from './randomFields'
import PatientDetails from "../patient_records/Patient_details"
import Modal from 'react-bootstrap/Modal';
import ListGroup from 'react-bootstrap/ListGroup';

const NewCaseForm = () => {
    const [name, setName] = useState("")
    const [age, setAge] = useState("")
    const [dob, setDob] = useState("")  
    const [weight, setWeight] = useState("")
    const [height, setHeight] = useState("")
    const [gender, setGender] = useState("")

    const randomName = (gender) => {       
        let firstname = data["names"][gender][Math.floor(Math.random() * data["names"][gender].length)]  
        let surname = data["names"]["surnames"][Math.floor(Math.random() * data["names"]["surnames"].length)]   
        setName(firstname + " " + surname)
    }

     //Generate Random hospital Number
     const randomCharacter = () =>{
        let characters = "ABCDEFGHIJKLMNOPQRSTUVQXYZ"
        return(characters[Math.floor(Math.random() * characters.length)])
     } 
          
     let randomHospNo = Math.floor(Math.random() * 1000000) + randomCharacter()
     const [hospNo, setHospNo] = useState(randomHospNo)
 
   
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
    
    const [address, setAddress] = useState("")
    const randomAddress = () => {
        let houseNo = Math.ceil(Math.random() * 120)
        let street = data["addresses"]["streets"][Math.floor(Math.random() * data["addresses"]["streets"].length)] 
        let town = data["addresses"]["towns"][Math.floor(Math.random() * data["addresses"]["towns"].length)]
        let postCode = `${randomCharacter()}${randomCharacter()}${Math.ceil(Math.random() * 10)} ${Math.ceil(Math.random() * 10)}${randomCharacter()}${randomCharacter()}`
        let addressStr= `${houseNo} ${street}, ${town}, ${postCode}`
        setAddress(addressStr)
    }

    const updateGender = (val) => setGender(val) 


    const [allergies, setAllergies] = useState([])
    const [newAllergyInput, setAllergyInput] = useState("")
    const [newReactionInput, setReactionInput] = useState("")

    const [showDel, setDelete] = useState(false);
    const deleteAllergyClose = () => setDelete(false);
    const deleteAllergyShow = () => setDelete(true);
  

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

    }


    let patient = { 
        "name": name,
        "hospitalNo": hospNo,
        "dob": dob,
        "address": address,
        "weight": weight,
        "height": height,
        "gender": gender
    }
    
    const [nameConfirm, setNameConfirm] = useState("")
    const [hospNoConfirm, setHospnoConfirm] = useState("")
    const [dobConfirm, setDobConfirm] = useState("")
    const [addressConfirm, setAddressConfirm] = useState("")
    const [weightConfirm, setWeightConfirm] = useState("")
    const [heightConfirm, setHeightConfirm] = useState("")
    const [genderConfirm, setGenderConfirm] = useState("")
    const [allergyConfirm, setAllergyConfirm] = useState("")
    
    //check all details have been completed and changes colours
    const checkComplete = () =>{
        name.length > 0 ? setNameConfirm("green") : setNameConfirm("")
        hospNo.length > 0 ? setHospnoConfirm("green") : setHospnoConfirm("")
        dob.length > 0 ? setDobConfirm("green") : setDobConfirm("")
        address.length > 0 ? setAddressConfirm("green") : setAddressConfirm("")
        weight.length > 0 ? setWeightConfirm("green") : setWeightConfirm("")
        height.length > 0 ? setHeightConfirm("green") : setHeightConfirm("")
        gender.length > 0 ? setGenderConfirm("green") : setGenderConfirm("")
        allergies.length > 0 ? setAllergyConfirm("green") : setAllergyConfirm("")



    }
    
    useEffect(() => {
        console.log("useeffect")
        checkComplete()
      });


    return(
        <>
        <Row>
            <PatientDetails patient={patient} allergies={allergies} />
        </Row>
        <Row>
            <Col>
                <ListGroup horizontal>
                    <ListGroup.Item style={{backgroundColor : nameConfirm}}>Patient Name</ListGroup.Item>
                    <ListGroup.Item style={{backgroundColor : hospNoConfirm}}>Hospital No</ListGroup.Item>
                    <ListGroup.Item style={{backgroundColor : dobConfirm}}>DOB</ListGroup.Item>
                    <ListGroup.Item style={{backgroundColor : addressConfirm}}>Address</ListGroup.Item>
                    <ListGroup.Item style={{backgroundColor : weightConfirm}}>Weight</ListGroup.Item>
                    <ListGroup.Item style={{backgroundColor : heightConfirm}}>Height</ListGroup.Item>
                    <ListGroup.Item style={{backgroundColor : genderConfirm}}>Gender</ListGroup.Item>
                    <ListGroup.Item style={{backgroundColor : allergyConfirm}}>Allergy Status</ListGroup.Item>
                </ListGroup>
            </Col>
            <Col>
                
            </Col>
        </Row>
        <hr/>
        <Form>
            <h3>Patient Demographics</h3>
            <Row className="mb-3">
                <Col>
                Patient Name
                    <InputGroup>
                        <Form.Control aria-label="Patients name" value={name}  onChange={(e) => setName(e.target.value)}/>
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
                <Form.Group as={Col} controlId="formBirthDate">
                    <Form.Label>Age <span>{age}</span></Form.Label>
                    <Form.Range value={age} onChange={e => birthdate(e.target.value)}/>
                </Form.Group>
                <Form.Group as={Col} controlId="formHospitalno">
                    <Form.Label>Date of Birth</Form.Label>
                    <Form.Control type="text" value={dob}/>
                </Form.Group> 
            </Row>
            <Row className="mb-3">
                <Form.Group as={Col} controlId="formAddress">
                    <Form.Label>Address</Form.Label>
                    <InputGroup>
                        <Form.Control type="text" onChange={(e) => setAddress(e.target.value)} value={address}/>
                        <Button variant="outline-secondary" onClick= {() => randomAddress()}>Random Address</Button>
                    </InputGroup>
                </Form.Group>
            </Row>
            <Row className="mb-3">
                <Form.Group as={Col} controlId="formWeight">
                    <Form.Label>Weight</Form.Label>
                    <InputGroup>
                        <Form.Control type="text" onChange={(e) => setWeight(e.target.value)} value={weight}/>
                        <Button variant="secondary" disabled>kg</Button>
                    </InputGroup>
                </Form.Group>
                <Form.Group as={Col} controlId="formWeight">
                    <Form.Label>Height</Form.Label>
                    <InputGroup>
                        <Form.Control type="text" onChange={(e) => setHeight(e.target.value)} value={height}/>
                        <Button variant="secondary" disabled>cm</Button>
                    </InputGroup>
                </Form.Group>
          
                <Form.Group as={Col}>
                    <Form.Label>Gender</Form.Label>
                        <InputGroup>
                            <ToggleButtonGroup type="radio" name="genderOptions" value={gender} onChange={updateGender}>
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
            <hr/>
            <h3>Allergies</h3>
            <Row className="mb-3">
                <Col>
                    <Button variant="outline-primary" onClick={() => setAllergies([{"drug":"NKDA","reaction":""}])}>NKDA</Button>{' '}
                    <Button variant="outline-primary" onClick={() => setAllergies([{"drug":"Unconfirmed Allergy Status","reaction":""}])}>Unconfirmed Allergies</Button>{' '}
                </Col>
            </Row>
            <Row className="mb-3">
                <Form.Group as={Col} controlId="formAllergy">
                        <Form.Label>Allergy</Form.Label>
                        <Form.Control type="text" value={newAllergyInput} onChange={(e) => setAllergyInput(e.target.value)}/>           
                </Form.Group>
                <Form.Group as={Col} controlId="formAllergyReaction">
                    <Form.Label>Reaction</Form.Label>
                    <Form.Control type="text" value={newReactionInput} onChange={(e) => setReactionInput(e.target.value)}/>                     
                </Form.Group>
            </Row>
            <Row>
                <Col>
                    <Button variant="outline-primary" onClick={handleAddAllergy}>Add Allergy</Button>{' '}
                    <Button variant="outline-primary" onClick={deleteAllergyShow}>Delete Allergy</Button>
                </Col>
               
            </Row>
            <hr/>
        </Form>

    
            



        <Modal show={showDel} onHide={deleteAllergyClose}>
            <Modal.Header closeButton>
            <Modal.Title> Delete Allergy</Modal.Title>
            </Modal.Header>
            <Modal.Body>
            { 
                allergies.map(((allergy, index) => (
                    <p>
                        {allergy.drug} {allergy.reaction} <a href='#' onClick={() => {deleteAllergy(index);deleteAllergyClose()}}> delete</a>
                    </p>
                )))           
            }

            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={deleteAllergyClose}>
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
        </>
    
    )
}
export default NewCaseForm

