import React from "react";
import Table from 'react-bootstrap/Table';
import Container from 'react-bootstrap/Container';

const PatientDetails = ({firstname, surname, hospitalNo, dob, weight, height, allergies, address}) => {
    return(
        
        <Container>
            <Table bordered>
                <tbody>
                <tr>
                    <td>
                        <i className="text-muted">Name  </i> 
                        {firstname} {surname}
                    </td>
                    <td>
                        <i className="text-muted">Hospital No  </i>
                        {hospitalNo}
                    </td>
                    <td>
                        <i className="text-muted">DoB  </i> 
                        {dob}
                    </td>                 
                </tr>      
                <tr>
                    <td>
                        <i className="text-muted">Weight  </i> 
                        {weight}
                    </td>
                    <td>
                        <i className="text-muted">Height  </i> 
                        {height}
                    </td>
                    <td>
                        <i className="text-muted">Allergies  </i> 
                        {allergies}
                    </td>
                </tr>       
                <tr>
                    <td colSpan={3}>
                        <i className="text-muted">Address </i> 
                        {address}
                    </td>
                </tr>  
                </tbody>
            </Table>
        </Container>
    )
}
export default PatientDetails;
