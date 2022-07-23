import React from 'react';
import Table from 'react-bootstrap/Table';
import Container from 'react-bootstrap/Container';
import CaseNotes from './Case_notes';
import Biochemistry from './Biochemistry';
import Observations from './Observations';

function PatientRecordsContainer(props) {
 
  return (
    <>
      <Container>
        <Table bordered className="center text-center">
          <tbody>
            <tr>
              <CaseNotes case_notes={props.case_notes} />
              <Biochemistry />
              <Observations />
            </tr>
          </tbody>
        </Table>
      </Container>
    </>
  );
}

export default PatientRecordsContainer;