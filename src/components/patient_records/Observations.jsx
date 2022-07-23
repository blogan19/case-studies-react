import React, { useState } from 'react';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Icon from './Patient_record_icon';

function Observations() {
  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);
  const handleClick = () => setShow(true);

  return (
    <>
      <td onClick={handleClick}>
       <Icon logo="bi bi-heart-pulse" title_text="Observations"/>
      </td>

      <Offcanvas show={show} onHide={handleClose} style={{ width: '100%'}}>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Offcanvas</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>These are case blooods</Offcanvas.Body>
      </Offcanvas>
    </>
  );
}

export default Observations;
