import React, { useState } from 'react';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Icon from './Patient_record_icon';
import BloodPressure from './observations_charts/Blood_pressure';
import TempHR from './observations_charts/Temp_heartrate';

const Observations = (props) => {
  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);
  const handleClick = () => setShow(true);
  
  return (
    <>
      <td onClick={handleClick}>
       <Icon logo="bi bi-heart-pulse" title_text="Observations"/>
      </td>

      <Offcanvas show={show} onHide={handleClose} style={{ width: '100%'}}>
        <Offcanvas.Header closeButton className="blue-back text-white">
          <Offcanvas.Title>Observations</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <BloodPressure data={props} />           
          <TempHR data={props} />
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}

export default Observations;
