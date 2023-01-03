import React from "react";
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
const ContentHeader = (props) => {
  return(
    <Container>
      {
        props.complete === 'true' ? (
          <Row className="border text-white mt-3 py-3 container-shadow rounded" style={{backgroundColor :'#54B435'}}>
            <h4>{props.title} <i className="bi bi-check2-circle float-end"></i></h4>
          </Row>
        ):(
          <Row className="border blue-back text-white mt-3 py-3 container-shadow rounded">
            <h4>{props.title} </h4>
          </Row>
        )
      }
        
    </Container> 
  )
}
export default ContentHeader
