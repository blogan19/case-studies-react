import React from "react";
import Container from 'react-bootstrap/Container';
import Col from 'react-bootstrap/Col';
const ContentHeader = (props) => {
  return(
    <Container>
      {
        props.complete === 'true' ? (
          <Col className="border text-white mt-3 p-3 container-shadow rounded" style={{backgroundColor :'#54B435'}}>
            <h4>{props.title} <i className="bi bi-check2-circle float-end"></i></h4>
          </Col>
        ):(
          <Col className="border blue-back text-white mt-3 p-3 container-shadow rounded">
            <h4>{props.title} </h4>
          </Col>
        )
      }
        
    </Container> 
  )
}
export default ContentHeader
