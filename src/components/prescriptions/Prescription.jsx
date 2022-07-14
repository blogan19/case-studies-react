import React, { useState } from "react";
import Prescription from "./Prescriptions";
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

const Prescriptions = (props) => {
  const [order, setOrder] = useState("ascending");

  const prescriptionList = props.prescriptions
  console.log(prescriptionList)
 
  if (order === "ascending"){
    prescriptionList.sort((a, b) => a.drug.localeCompare(b.drug));
  }else if (order === "descending" || order === ""){
    prescriptionList.sort((b, a) => a.drug.localeCompare(b.drug));
  }  
  
  return (
    <>
      <div className="prescriptions">
        <Container className="prescription-tools">
          <Row className="border border-info mt-3 py-3 rounded"> 
            <Col sm={3}>
             <h4>Prescriptions </h4>
            </Col>
            <Col sm={2}>
              <Button variant="outline-info" onClick={() => setOrder(order =='ascending' ? 'descending':'ascending' )}>
                {order == 'ascending' ? <i className="bi bi-sort-alpha-up"></i> :<i className="bi bi-sort-alpha-down"></i>}
              </Button>
            </Col>
          </Row>
        </Container>
        
        {prescriptionList.map((prescription, index) => (
          <Prescription key={index} index={index} prescription={prescription} />
        ))}
        
      </div>
    </>
  );
};
  
export default Prescriptions;