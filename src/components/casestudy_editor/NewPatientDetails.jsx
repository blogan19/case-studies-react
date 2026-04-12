import React, { useEffect, useMemo, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Row from 'react-bootstrap/Row';
import ToggleButton from 'react-bootstrap/ToggleButton';
import ToggleButtonGroup from 'react-bootstrap/ToggleButtonGroup';
import data from './randomFields';
import PatientDetails from '../patient_records/Patient_details';
import ContentHeader from '../Content_header';

const buildRandomHospitalNo = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVQXYZ';
  const suffix = characters[Math.floor(Math.random() * characters.length)];
  return `${Math.floor(Math.random() * 1000000)}${suffix}`;
};

const emptyPatient = {
  name: '',
  hospitalNo: buildRandomHospitalNo(),
  dob: '',
  address: '',
  weight: '',
  height: '',
  gender: '',
};

const NewCaseForm = ({ closeNewPatient, patientDemographics, setPatientAllergies, currentDemographics, currentAllergies }) => {
  const [patient, setPatient] = useState(emptyPatient);
  const [age, setAge] = useState('');
  const [allergies, setAllergies] = useState([]);
  const [newAllergyInput, setAllergyInput] = useState('');
  const [newReactionInput, setReactionInput] = useState('');

  useEffect(() => {
    if (currentDemographics && typeof currentDemographics === 'object' && !Array.isArray(currentDemographics) && currentDemographics.name) {
      setPatient({
        name: currentDemographics.name || '',
        hospitalNo: currentDemographics.hospitalNo || buildRandomHospitalNo(),
        dob: currentDemographics.dob || '',
        address: currentDemographics.address || '',
        weight: (currentDemographics.weight || '').replace('kg', ''),
        height: (currentDemographics.height || '').replace('cm', ''),
        gender: currentDemographics.gender || '',
      });
    }

    if (Array.isArray(currentAllergies)) {
      setAllergies(currentAllergies);
    }
  }, [currentDemographics, currentAllergies]);

  const updatePatientField = (field, value) => {
    setPatient((current) => ({ ...current, [field]: value }));
  };

  const randomName = (genderKey) => {
    const firstName = data.names[genderKey][Math.floor(Math.random() * data.names[genderKey].length)];
    const surname = data.names.surnames[Math.floor(Math.random() * data.names.surnames.length)];
    updatePatientField('name', `${firstName} ${surname}`);
  };

  const randomAddress = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVQXYZ';
    const postcode = `${characters[Math.floor(Math.random() * characters.length)]}${characters[Math.floor(Math.random() * characters.length)]}${Math.ceil(Math.random() * 10)} ${Math.ceil(Math.random() * 10)}${characters[Math.floor(Math.random() * characters.length)]}${characters[Math.floor(Math.random() * characters.length)]}`;
    const houseNo = Math.ceil(Math.random() * 120);
    const street = data.addresses.streets[Math.floor(Math.random() * data.addresses.streets.length)];
    const town = data.addresses.towns[Math.floor(Math.random() * data.addresses.towns.length)];
    updatePatientField('address', `${houseNo} ${street}, ${town}, ${postcode}`);
  };

  const birthdate = (nextAge) => {
    setAge(nextAge);
    const ageNumber = Number(nextAge);
    const today = new Date();
    const maxDate = new Date(today.getFullYear() - ageNumber, today.getMonth(), today.getDate());
    const minDate = new Date(today.getFullYear() - ageNumber - 1, today.getMonth(), today.getDate() + 1);
    const randomDate = new Date(minDate.getTime() + Math.random() * (maxDate.getTime() - minDate.getTime()));
    updatePatientField('dob', randomDate.toLocaleDateString());
  };

  const randomPatient = (genderKey) => {
    randomName(genderKey);
    randomAddress();
    const randomAge = Math.floor(Math.random() * (100 - 18 + 1) + 18);
    birthdate(randomAge);
    updatePatientField('gender', genderKey === 'male_names' ? 'Male' : 'Female');
    updatePatientField('weight', Math.floor(Math.random() * (150 - 50 + 1) + 30).toString());
    updatePatientField('height', Math.floor(Math.random() * (220 - 150 + 1) + 150).toString());
  };

  const handleAddAllergy = () => {
    const newAllergy = { drug: newAllergyInput, reaction: newReactionInput };
    setAllergies((current) => {
      const next = [...current].filter((item) => !['NKDA', 'Unconfirmed Allergy Status'].includes(item.drug));
      return [...next, newAllergy];
    });
    setAllergyInput('');
    setReactionInput('');
  };

  const savePatient = () => {
    patientDemographics({
      ...patient,
      weight: `${patient.weight}kg`,
      height: `${patient.height}cm`,
    });
    setPatientAllergies(allergies);
    closeNewPatient();
  };

  const patientComplete = useMemo(
    () => Boolean(patient.name && patient.hospitalNo && patient.dob && patient.address && patient.weight && patient.height && patient.gender),
    [patient]
  );

  return (
    <>
      <ContentHeader title="Patient Demographics" complete={patientComplete ? 'true' : ''} />
      <Form>
        <Row className="mb-3">
          <Alert variant="info" className="mt-3">
            <p>Patient demographics can be entered manually or generated with the randomise buttons.</p>
            <Button type="button" variant="outline-primary" onClick={() => randomPatient('male_names')}>Random Male Patient</Button>{' '}
            <Button type="button" variant="outline-primary" onClick={() => randomPatient('female_names')}>Random Female Patient</Button>
          </Alert>
        </Row>
        <Row className="mb-3">
          <Col>
            Patient Name
            <InputGroup>
              <Form.Control value={patient.name} onChange={(event) => updatePatientField('name', event.target.value)} />
              <Button type="button" variant="outline-secondary" onClick={() => randomName('male_names')}>Random Male</Button>
              <Button type="button" variant="outline-secondary" onClick={() => randomName('female_names')}>Random Female</Button>
            </InputGroup>
          </Col>
        </Row>
        <Row className="mb-3">
          <Form.Group as={Col} controlId="formHospitalno">
            <Form.Label>Hospital Number</Form.Label>
            <Form.Control type="text" value={patient.hospitalNo} onChange={(event) => updatePatientField('hospitalNo', event.target.value)} />
          </Form.Group>
        </Row>
        <Row className="mb-3">
          <Form.Group as={Col} controlId="formBirthDate">
            <Form.Label>Age <span>{age}</span></Form.Label>
            <Form.Range value={age} onChange={(event) => birthdate(event.target.value)} />
          </Form.Group>
          <Form.Group as={Col} controlId="formDob">
            <Form.Label>Date of Birth</Form.Label>
            <Form.Control type="text" value={patient.dob} readOnly />
          </Form.Group>
        </Row>
        <Row className="mb-3">
          <Form.Group as={Col} controlId="formAddress">
            <Form.Label>Address</Form.Label>
            <InputGroup>
              <Form.Control type="text" value={patient.address} onChange={(event) => updatePatientField('address', event.target.value)} />
              <Button type="button" variant="outline-secondary" onClick={randomAddress}>Random Address</Button>
            </InputGroup>
          </Form.Group>
        </Row>
        <Row className="mb-3">
          <Form.Group as={Col} controlId="formWeight">
            <Form.Label>Weight</Form.Label>
            <InputGroup>
              <Form.Control type="text" value={patient.weight} onChange={(event) => updatePatientField('weight', event.target.value)} />
              <Button variant="secondary" disabled>kg</Button>
            </InputGroup>
          </Form.Group>
          <Form.Group as={Col} controlId="formHeight">
            <Form.Label>Height</Form.Label>
            <InputGroup>
              <Form.Control type="text" value={patient.height} onChange={(event) => updatePatientField('height', event.target.value)} />
              <Button variant="secondary" disabled>cm</Button>
            </InputGroup>
          </Form.Group>
          <Form.Group as={Col} controlId="formGender">
            <Form.Label>Gender</Form.Label>
            <InputGroup>
              <ToggleButtonGroup type="radio" name="genderOptions" value={patient.gender} onChange={(value) => updatePatientField('gender', value)}>
                <ToggleButton id="gender1" value="Male" variant="outline-primary">Male</ToggleButton>
                <ToggleButton id="gender2" value="Female" variant="outline-primary">Female</ToggleButton>
              </ToggleButtonGroup>
            </InputGroup>
          </Form.Group>
        </Row>
      </Form>

      <ContentHeader title="Allergies" className="mt-5" complete={allergies.length > 0 ? 'true' : ''} />
      <Form className="mt-3 mb-3">
        <Row className="mb-3">
          <Alert variant="info" className="mt-3">
            <p>Enter one or more allergies below, or set the allergy status directly.</p>
          </Alert>
        </Row>
        <Row className="mb-3">
          <Col>
            <Button type="button" variant="outline-primary" onClick={() => setAllergies([{ drug: 'NKDA', reaction: '' }])}>Set to NKDA</Button>{' '}
            <Button type="button" variant="outline-primary" onClick={() => setAllergies([{ drug: 'Unconfirmed Allergy Status', reaction: '' }])}>Set to Unconfirmed Allergies</Button>
          </Col>
        </Row>
        <Row className="mb-3">
          <Form.Group as={Col} controlId="formAllergy">
            <Form.Control type="text" placeholder="Allergen" value={newAllergyInput} onChange={(event) => setAllergyInput(event.target.value)} />
          </Form.Group>
          <Form.Group as={Col} controlId="formAllergyReaction">
            <Form.Control type="text" placeholder="Reaction" value={newReactionInput} onChange={(event) => setReactionInput(event.target.value)} />
          </Form.Group>
        </Row>
        <Row>
          <Col>
            {newAllergyInput ? (
              <Button type="button" variant="outline-primary" onClick={handleAddAllergy}>Add Allergy</Button>
            ) : null}
            {' '}
            {allergies.map((allergy, index) => (
              <p key={`${allergy.drug}-${index}`}>
                {allergy.drug} {allergy.reaction}{' '}
                <Button type="button" variant="link" className="p-0" onClick={() => setAllergies((current) => current.filter((_item, itemIndex) => itemIndex !== index))}>
                  delete
                </Button>
              </p>
            ))}
          </Col>
        </Row>
        <hr />
      </Form>

      <div className="mt-3">
        <ContentHeader title="Patient Preview" className="mb-5" />
        <PatientDetails patient={{ ...patient, weight: `${patient.weight}kg`, height: `${patient.height}cm` }} allergies={allergies} />
        <hr />
        <Button type="button" variant="primary" disabled={!patientComplete} onClick={savePatient}>Save Patient</Button>
      </div>
    </>
  );
};

export default NewCaseForm;
