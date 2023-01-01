import React, { useState } from 'react';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Icon from './Patient_record_icon';
import BloodPressure from './observations_charts/Blood_pressure';
import TempHR from './observations_charts/Temp_heartrate';
import RespRate from './observations_charts/resp_rate';
import Container from 'react-bootstrap/Container';
import ObsTable from './observations_charts/Obs_Table';

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
          <Container>
          <ObsTable data={props} />
          </Container>
          <BloodPressure data={props} />           
          <TempHR data={props} />
          <RespRate data={props} />
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}

export default Observations;
