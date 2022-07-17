import React, { useState } from 'react';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Table from 'react-bootstrap/Table';
import Container from 'react-bootstrap/Container';
import styles from '../prescriptionchart.css'

function ObservationsOffCanvas() {
  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);

  const obs_type = null;

  const load_casenotes = () => {
    setShow(true);
  }

  const load_biochemistry = () => {
    setShow(true);
  }

  const load_observations = () => {
    setShow(true);
  }

  
  return (
    <>
        <Container>
            <Table  bordered className="center text-center">
                <tbody>
                    <tr>
                        <td onClick={load_casenotes} >
                                <div sm={12}>
                                    <i className="bi bi-collection" style={{fontSize: '3rem'}} alt="case notes" ></i>
                                </div>
                                <div sm={12} className="text-muted">
                                    Case notes
                                </div>    
                        </td>
                        <td onClick={load_biochemistry}>
                                <div sm={12}>
                                <i className="bi bi-droplet-fill" style={{fontSize: '3rem'}} width="4rem"></i>
                                </div>
                                <div sm={12}>
                                    Biochemistry
                                </div>    
                        </td>
                        <td onClick={load_observations}>
                                <div sm={12}>
                                    <i className="bi bi-heart-pulse" style={{fontSize: '3rem'}} width="4rem"></i>
                                </div>
                                <div sm={12}>
                                    Observations
                                </div>    
                        </td>
                    </tr>
                </tbody>
            </Table>
        </Container>

        <Offcanvas show={show} onHide={handleClose}>
            <Offcanvas.Header closeButton>
            <Offcanvas.Title>Offcanvas</Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body>
            Some text as placeholder. In real life you can have the elements you
            have chosen. Like, text, images, lists, etc.
            </Offcanvas.Body>
        </Offcanvas>
    </>
  );
}

export default ObservationsOffCanvas