import React from 'react';
import NavBar from './components/NavBar';
import PatientDetails from './components/Patient_details';
import CaseInstructions from './components/CaseInstructions';
import PatientRecordsContainer from './components/patient_records/Patient_records_container';
import Prescription from './components/prescriptions/Prescription';
//import MCQ from './components/questions/MCQ';
import data from './case_study.json';
import './style.css';

const App = () => {
  return (
    <>
      <NavBar />
      <CaseInstructions instructions={data.case_instructions} />
      <PatientDetails patient={data.patient} allergies={data.allergies} />
      <PatientRecordsContainer case_notes={data.case_notes} />
      <Prescription prescriptions={data.prescriptionList} />
    </>
  );
};

export default App;
