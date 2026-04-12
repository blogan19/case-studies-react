import React from 'react';
import PatientDetails from './components/patient_records/Patient_details';
import CaseInstructions from './components/CaseInstructions';
import PatientRecordsContainer from './components/patient_records/Patient_records_container';
import Prescription from './components/prescriptions/Prescription';
import QuestionContainer from './components/questions/QuestionContainer';
import './style.css';
import ContentHeader from './components/Content_header';
import { normalizeCaseStudy } from './lib/caseStudy';

const CaseStudyDisplay = ({ data, hideQuestions = false }) => {
  const caseStudy = normalizeCaseStudy(data);

  return (
    <>
      <div className="viewport-band">
        <div className="teaching-platform-banner">
          <strong>MediCase Teaching Platform</strong>
          <span>Interactive case study and prescribing workspace for revision and guided teaching.</span>
        </div>
      </div>
      <div className="viewport-band">
        <CaseInstructions instructions={caseStudy.case_instructions} />
      </div>
      <div className="viewport-band">
        <PatientDetails patient={caseStudy.patient} allergies={caseStudy.allergies} />
      </div>
      <div className="viewport-band">
        <PatientRecordsContainer patient_records={caseStudy} />
      </div>
      <div className="viewport-band">
        <Prescription prescriptions={caseStudy.prescriptionList} prescribingStatus={caseStudy.prescribingStatus} />
      </div>
      {!hideQuestions && caseStudy.questions.length > 0 ? <ContentHeader title="Questions" /> : null}
      {!hideQuestions ? <QuestionContainer questions={caseStudy.questions} prescriptions={caseStudy.prescriptionList} /> : null}
      <br />
      <br />
      <br />
    </>
  );
};

export default CaseStudyDisplay;
