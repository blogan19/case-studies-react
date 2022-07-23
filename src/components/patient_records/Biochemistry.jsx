import React, { useState } from 'react';
import Icon from './Patient_record_icon';
import Offcanvas from 'react-bootstrap/Offcanvas';


function Biochemistry() {
  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);
  const handleClick = () => setShow(true);

  return (
    <>
      <td onClick={handleClick}>
        <Icon logo="bi bi-droplet-fill" title_text="Biochemistry"/>
      </td>

      <Offcanvas show={show} onHide={handleClose} style={{ width: '100%' }}>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Offcanvas</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>These are case bloods</Offcanvas.Body>
      </Offcanvas>
    </>
  );
}

export default Biochemistry;
