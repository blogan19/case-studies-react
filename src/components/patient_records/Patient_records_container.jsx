import React from 'react';
import Table from 'react-bootstrap/Table';
import Container from 'react-bootstrap/Container';
import CaseNotes from './Case_notes';
import Laboratory from './Laboratory';
import Observations from './Observations';

const PatientRecordsContainer = (props) => {
  return (
    <>
      <Container>
        <Table bordered className="text-center container-shadow">
          <tbody>
            <tr>
              <CaseNotes case_notes={props.patient_records.case_notes} />
              <Laboratory biochemistry={props.patient_records.biochemistry} microbiology={props.patient_records.microbiology}/>
              <Observations observations={props.patient_records.observations} />
            </tr>
          </tbody>
        </Table>
      </Container>
    </>
  );
}

export default PatientRecordsContainer;
