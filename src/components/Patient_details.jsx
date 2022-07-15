import React from "react";
import Table from 'react-bootstrap/Table';
import Container from 'react-bootstrap/Container';


const PatientDetails = (props) => {
    return(
        <Container>
            <Table bordered>
                <tbody>
                <tr>
                    <td>
                        <i className="text-muted">Name  </i> 
                        {props.patient.firstname} {props.patient.lastname}
                    </td>
                    <td>
                        <i className="text-muted">Hospital No  </i>
                        {props.patient.hospitalNo}
                    </td>
                    <td>
                        <i className="text-muted">DoB  </i> 
                        {props.patient.dob}
                    </td>
                </tr>      
                <tr>
                    <td>
                        <i className="text-muted">Weight  </i> 
                        {props.patient.weight}
                    </td>
                    <td>
                        <i className="text-muted">Height  </i> 
                        {props.patient.height}
                    </td>
                    <td>
                        <i className="text-muted">Allergies  </i> 
                        {props.allergies}
                    </td>
                </tr>       
                <tr>
                    <td colSpan={3}>
                        <i className="text-muted">Address </i> 
                        {props.patient.address}
                    </td>
                </tr>  
                </tbody>
            </Table>
        </Container>
    )
}
export default PatientDetails


/*
    Name
    DOB
    hos no
    Allergies
    weight
    height
    
*/