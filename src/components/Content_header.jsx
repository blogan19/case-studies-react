import React from "react";
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
const ContentHeader = (props) => {
  return(
    <Container>
        <Row className="border blue-back text-white mt-3 py-3 container-shadow rounded">
          <h4>{props.title} </h4>
        </Row>
    </Container> 
  )
}
export default ContentHeader
