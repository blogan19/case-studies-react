import React from "react";
import Table from 'react-bootstrap/Table';
import Container from 'react-bootstrap/Container';


const PatientDetails = (props) => {
    return(
        <Container>
            <p>{props.demographics}</p>
            <Table bordered hover>
                <tbody>
                <tr>
                    <td>
                        <i className="text-muted">Name  </i> 
                        {props.firstname} {props.lastname}
                    </td>
                    <td>
                        <i className="text-muted">Hospital No  </i>
                        {props.hospitalNo}
                    </td>
                    <td>
                        <i className="text-muted">DoB  </i> 
                        {props.dob}
                    </td>
                </tr>      
                <tr>
                    <td>
                        <i className="text-muted">Weight  </i> 
                        {props.weight}
                    </td>
                    <td>
                        <i className="text-muted">Height  </i> 
                        {props.height}
                    </td>
                    <td>
                        <i className="text-muted">Allergies  </i> 
                        {props.allergies}
                    </td>
                </tr>       
                <tr>
                    <td colSpan={3}>
                        <i className="text-muted">Address </i> 
                        {props.address}
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