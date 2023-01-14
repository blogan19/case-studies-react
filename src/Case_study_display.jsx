import React, { useState } from 'react';
import NavBar from './components/NavBar';
import PatientDetails from './components/patient_records/Patient_details';
import CaseInstructions from './components/CaseInstructions';
import PatientRecordsContainer from './components/patient_records/Patient_records_container';
import Prescription from './components/prescriptions/Prescription';
import QuestionContainer from './components/questions/QuestionContainer';
import './style.css';
import ContentHeader from './components/Content_header';



const CaseStudyDisplay = (data) => {
  let caseData = null
  if(data.data){
    caseData = data.data
  }
  const [ caseStudy, setCase ] = useState(caseData);

  console.log(data)
  return (
    <>
      <CaseInstructions instructions={caseStudy.case_instructions} />
      <PatientDetails patient={caseStudy.patient} allergies={caseStudy.allergies} />
      <PatientRecordsContainer patient_records={caseStudy} />
      <Prescription prescriptions={caseStudy.prescriptionList} prescribingStatus={caseStudy.prescribingStatus} />
      {caseStudy.questions != "" ? (<ContentHeader title="Questions" /> ):""}
      <QuestionContainer questions={caseStudy.questions}/>
      
    </>
  );
};

export default CaseStudyDisplay;
