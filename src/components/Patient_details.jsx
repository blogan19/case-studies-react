import React from "react";
import Table from 'react-bootstrap/Table';
import Container from 'react-bootstrap/Container';
import Allergies from "./allergies";

const PatientDetails = ({patient, allergies}) => {
    return(
        <Container>
            <Table bordered>
                <tbody>
                <tr>
                    <td>
                        <i className="text-muted">Name  </i> 
                        {patient.firstname} {patient.surname}
                    </td>
                    <td>
                        <i className="text-muted">Hospital No  </i>
                        {patient.hospitalNo}
                    </td>
                    <td>
                        <i className="text-muted">DoB  </i> 
                        {patient.dob}
                    </td>                 
                </tr>      
                <tr>
                    <td>
                        <i className="text-muted">Weight  </i> 
                        {patient.weight}
                    </td>
                    <td>
                        <i className="text-muted">Height  </i> 
                        {patient.height}
                    </td>
                    <td>
                        <i className="text-muted">Allergies  </i> 
                        <Allergies allergyList={allergies}/>
                    </td>
                </tr>       
                <tr>
                    <td colSpan={1}>
                        <i className="text-muted">Gender </i>
                        {patient.gender}
                    </td>
                    <td colSpan={2}>
                        <i className="text-muted">Address </i> 
                        {patient.address}
                    </td>
                </tr>  
                </tbody>
            </Table>
        </Container>
    )
}
export default PatientDetails;
