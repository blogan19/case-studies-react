import React, { useState } from 'react';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Icon from './Patient_record_icon';
import Container from 'react-bootstrap/Container';
import Card from 'react-bootstrap/Card';
import Table from 'react-bootstrap/Table';


const Imaging = (props) => {
  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);
  const imagesList = Array.isArray(props.images) ? props.images : [];
  const handleClick = () => {
    setShow(true);
  };
  const images = imagesList.map((image, index) => (
    <Container className="mt-3" key={`${image.image_url || image.image_date || 'image'}-${index}`}>
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
      <td onClick={handleClick}>
       <Icon logo="bi bi-image" title_text="Imaging"/>
      </td>

      <Offcanvas show={show} onHide={handleClose} style={{ width: '100%'}}>
        <Offcanvas.Header closeButton className="blue-back text-white">
          <Offcanvas.Title>Imaging</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {imagesList.length ? images : (
            <Container>
              <Table className="tbl-notes container-shadow">
                <thead>
                  <tr className="blue-back text-white">
                    <th colSpan={3}>Imaging</th>
                  </tr>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Report</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={3} className="text-center text-muted">No imaging recorded yet.</td>
                  </tr>
                </tbody>
              </Table>
            </Container>
          )}
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}

export default Imaging;
