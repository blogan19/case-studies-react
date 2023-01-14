import React, { useState } from 'react';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Icon from './Patient_record_icon';
import Container from 'react-bootstrap/Container';
import Card from 'react-bootstrap/Card';


const Imaging = (props) => {
  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);
  const handleClick = () => {
    if(props.images.length > 0){
        setShow(true)   
    } 
  }
  console.log(props.images)
  let images = props.images.map((image) => (
    <Container className="mt-3">
      <Card>
        <Card.Img variant="top" src={image['image_url']} />
        <Card.Body>
          <Card.Title>{image['image_type']}</Card.Title>
          <Card.Text>
            <p><strong>Date: {image['image_date']}</strong></p>
            <p>{image['image_desc']}</p>
          </Card.Text>
        </Card.Body>
      </Card>
    </Container>
  ))
  return (
    <>
      <td onClick={handleClick} style={props.images.length < 1 ? {"opacity": 0.3}:{"opacity":1}}>
       <Icon logo="bi bi-image" title_text="Imaging"/>
      </td>

      <Offcanvas show={show} onHide={handleClose} style={{ width: '100%'}}>
        <Offcanvas.Header closeButton className="blue-back text-white">
          <Offcanvas.Title>Imaging</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {images} 
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}

export default Imaging;
