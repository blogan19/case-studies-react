import React from 'react';
import PatientDetails from './components/patient_records/Patient_details';
import CaseInstructions from './components/CaseInstructions';
import PatientRecordsContainer from './components/patient_records/Patient_records_container';
import Prescription from './components/prescriptions/Prescription';
import QuestionContainer from './components/questions/QuestionContainer';
import './style.css';
import ContentHeader from './components/Content_header';
import { normalizeCaseStudy } from './lib/caseStudy';

const CaseStudyDisplay = ({
  data,
  hideQuestions = false,
  readOnly = false,
  drugLibrary,
  onChangeCaseStudy,
  onOpenAllergyManagement,
  onOpenMedicationHistory,
  onOpenVteAssessment,
  launchClinicalNoteTemplateRequest,
  pharmacyPanelOpen,
  onPharmacyPanelOpenChange,
}) => {
  const caseStudy = normalizeCaseStudy(data);
  const canEdit = !readOnly && typeof onChangeCaseStudy === 'function';
  const displayedAllergies = caseStudy.patient?.nkda
    ? [{ drug: 'NKDA', reaction: 'No known drug allergies' }]
    : caseStudy.allergies;
  const prescriptionPatient = {
    ...(caseStudy.patient || {}),
    allergies: caseStudy.allergies || [],
  };
  const saveCaseNotes = async (payload = {}) => {
    if (!canEdit) {
      return;
    }

    onChangeCaseStudy({
      ...caseStudy,
      case_notes: payload.caseNotes || caseStudy.case_notes || {},
      case_notes_history: [
        ...(caseStudy.case_notes_history || []),
        {
          timestamp: new Date().toISOString(),
          fieldKey: payload.fieldKey || '',
          fieldLabel: payload.fieldLabel || payload.fieldKey || 'Patient record',
          previousValue: payload.previousValue ?? null,
          nextValue: payload.nextValue ?? null,
          actor: 'Student',
          noteId: payload.noteId,
        },
      ],
    });
  };

  return (
    <>
      <div className="viewport-band">
        <CaseInstructions instructions={caseStudy.case_instructions} />
      </div>
      <div className="viewport-band">
        <PatientDetails
          patient={caseStudy.patient}
          allergies={displayedAllergies}
          allergyHistory={caseStudy.allergyHistory || []}
          medicationHistory={caseStudy.case_notes?.medicationHistory || {}}
          vteAssessment={caseStudy.case_notes?.vteAssessment || {}}
          onOpenAllergyManagement={canEdit ? onOpenAllergyManagement : undefined}
          onOpenMedicationHistory={canEdit ? onOpenMedicationHistory : undefined}
          onOpenVteAssessment={canEdit ? onOpenVteAssessment : undefined}
        />
      </div>
      <div className="viewport-band">
        <PatientRecordsContainer
          patient_records={caseStudy}
          prescriptions={caseStudy.prescriptionList}
          drugLibrary={drugLibrary}
          defaultAuthor="Student"
          readOnly={readOnly}
          onSaveCaseNotes={canEdit ? saveCaseNotes : undefined}
          launchClinicalNoteTemplateRequest={launchClinicalNoteTemplateRequest}
          pharmacyPanelOpen={pharmacyPanelOpen}
          onPharmacyPanelOpenChange={onPharmacyPanelOpenChange}
        />
      </div>
      <div className="viewport-band">
        <Prescription
          prescriptions={caseStudy.prescriptionList}
          prescribingStatus={!readOnly}
          drugLibrary={drugLibrary}
          patient={prescriptionPatient}
          allergies={caseStudy.allergies || []}
          caseNotes={caseStudy.case_notes || {}}
          onChange={canEdit ? (prescriptionList) => onChangeCaseStudy({ ...caseStudy, prescriptionList }) : undefined}
          onSaveCaseNotes={canEdit ? saveCaseNotes : undefined}
          onApprovalToast={() => {}}
          onBlockedPrescribe={() => {}}
        />
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
