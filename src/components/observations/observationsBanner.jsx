import React from "react";
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Table from 'react-bootstrap/Table';



const ObservationsBanner = () => {
    /*table td:hover {
        background-color: rgba(0,0,0,.075);
    }
*/
    return(
        <Container>
          
          <Table  bordered hover className="center cellHover">
            <tbody>
                <tr>
                    <td>2</td>
                    <td>4</td>
                    <td>3</td>
                </tr>
            </tbody>
          </Table>
          
        </Container>
        
    )
}

export default ObservationsBanner