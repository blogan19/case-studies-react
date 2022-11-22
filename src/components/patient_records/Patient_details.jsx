import React from 'react';
import Table from 'react-bootstrap/Table';
import Container from 'react-bootstrap/Container';
import Allergies from './allergies';

const PatientDetails = ({ patient, allergies }) => {

  const birthdate = Date.parse(patient.dob);
  const currentDate = new Date();
  const diff = currentDate - birthdate;
  const age = Math.floor(diff/31557600000);
  
  return (
    <>
      <Container className="mt-3 ">
        <Table bordered className='container-shadow '>
          <tbody>
            <tr>
              <td>
                <i className="text-muted">Name </i>
                {patient.name}
              </td>
              <td>
                <i className="text-muted">Hospital No </i>
                {patient.hospitalNo}
              </td>
              <td>
                <i className="text-muted">DoB </i>
                {patient.dob} ({age})
              </td>
            </tr>
            <tr>
              <td>
                <i className="text-muted">Weight </i>
                {patient.weight}
              </td>
              <td>
                <i className="text-muted">Height </i>
                {patient.height}
              </td>
              <td>
                <i className="text-muted">Gender </i>
                {patient.gender}
              </td>
            </tr>
            <tr>
              <td colSpan={3}>
                <i className="text-muted">Address </i>
                {patient.address}
              </td>
            </tr>
              
          </tbody>
        </Table>
      </Container>
      <Allergies allergyList={allergies} />
    </>
  );
};
export default PatientDetails;
