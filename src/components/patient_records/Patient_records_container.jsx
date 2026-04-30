import React from 'react';
import Table from 'react-bootstrap/Table';
import CaseNotes from './Case_notes';
import Pharmacy from './Pharmacy';
import Tasks from './Tasks';
import Laboratory from './Laboratory';
import Observations from './Observations';
import Imaging from './Imaging';

const PatientRecordsContainer = (props) => {
  return (
    <>
      <div>
        <Table bordered className="container-shadow epma-summary-table text-center mb-0">
          <tbody>
            <tr>
              <th colSpan={6} className="epma-section-banner blue-back text-white">Patient Records</th>
            </tr>
            <tr>
              <CaseNotes
                case_notes={props.patient_records.case_notes}
                case_notes_history={props.patient_records.case_notes_history}
                commonConditions={props.commonConditions}
                onSaveCaseNotes={props.readOnly ? undefined : props.onSaveCaseNotes}
                defaultAuthor={props.defaultAuthor}
                readOnly={props.readOnly}
                launchTemplateRequest={props.launchClinicalNoteTemplateRequest}
              />
              <Pharmacy
                case_notes={props.patient_records.case_notes}
                case_notes_history={props.patient_records.case_notes_history}
                prescriptions={props.prescriptions}
                drugLibrary={props.drugLibrary}
                onSaveCaseNotes={props.readOnly ? undefined : props.onSaveCaseNotes}
                readOnly={props.readOnly}
                showPanel={props.pharmacyPanelOpen}
                onShowPanelChange={props.onPharmacyPanelOpenChange}
                activeChartTutorialStepKey={props.activeChartTutorialStepKey}
                tutorialRefs={props.tutorialRefs}
              />
              <Tasks
                case_notes={props.patient_records.case_notes}
                onSaveCaseNotes={props.readOnly ? undefined : props.onSaveCaseNotes}
                defaultAuthor={props.defaultAuthor}
                readOnly={props.readOnly}
                showPanel={props.tasksPanelOpen}
                onShowPanelChange={props.onTasksPanelOpenChange}
                activeChartTutorialStepKey={props.activeChartTutorialStepKey}
                tutorialRefs={props.tutorialRefs}
              />
              <Laboratory
                biochemistry={props.patient_records.biochemistry}
                microbiology={props.patient_records.microbiology}
                onSaveBiochemistry={props.readOnly ? undefined : props.onSaveBiochemistry}
              />
              <Observations
                observations={props.patient_records.observations}
                onSaveObservations={props.readOnly ? undefined : props.onSaveObservations}
              />
              <Imaging images={props.patient_records.imaging}/>
            </tr>
          </tbody>
        </Table>
      </div>
    </>
  );
}

export default PatientRecordsContainer;
