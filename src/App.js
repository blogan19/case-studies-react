import React from 'react';
import NavBar from './components/NavBar';
import PatientDetails from './components/Patient_details';
import CaseInstructions from './components/CaseInstructions';
import PatientRecordsContainer from './components/patient_records/Patient_records_container';
import Prescription from './components/prescriptions/Prescription';
import QuestionContainer from './components/questions/QuestionContainer';
import data from './case_study.json';
import './style.css';
import ContentHeader from './components/Content_header';


const App = () => {
  return (
    <>
      <NavBar />
      <CaseInstructions instructions={data.case_instructions} />
      <PatientDetails patient={data.patient} allergies={data.allergies} />
      <PatientRecordsContainer patient_records={data} />
      <Prescription prescriptions={data.prescriptionList} />
      <ContentHeader title="Questions" />
      <QuestionContainer questions={data.questions}/>
    </>
  );
};

export default App;
