import React, { useState, useEffect } from 'react';
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
  const [opacityVal, setOpacity] = useState('')
  const handleClick = () => {
    if(opacityVal === 1){
      setShow(true);
    }
  }
  console.log(props)

  const checkObs = () => {
    if(props.observations != ""){
      if(props.observations.blood_pressure.length > 0 || props.observations.heart_rate.length > 0 || props.observations.oxygen.length > 0 || props.observations.resp_rate.length > 0 || props.observations.temperature.length > 0){
        setOpacity(1)
      }else{
        setOpacity(0.3)
      }
    }else{
      setOpacity(0.3)
    }
  }
  useEffect(() => {
    checkObs()
  },[]);
  return (
    <>
      <td onClick={handleClick} style={{"opacity": opacityVal}} >
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
