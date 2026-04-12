import React from 'react';
import Table from 'react-bootstrap/Table';
import CaseNotes from './Case_notes';
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
              <th colSpan={4} className="epma-section-banner blue-back text-white">Patient Records</th>
            </tr>
            <tr>
              <CaseNotes
                case_notes={props.patient_records.case_notes}
                case_notes_history={props.patient_records.case_notes_history}
                commonConditions={props.commonConditions}
                drugLibrary={props.drugLibrary}
                onSaveCaseNotes={props.onSaveCaseNotes}
              />
              <Laboratory biochemistry={props.patient_records.biochemistry} microbiology={props.patient_records.microbiology}/>
              <Observations observations={props.patient_records.observations} />
              <Imaging images={props.patient_records.imaging}/>
            </tr>
          </tbody>
        </Table>
      </div>
    </>
  );
}

export default PatientRecordsContainer;
