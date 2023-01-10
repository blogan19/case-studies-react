import React, { useState } from 'react';
import NavBar from './components/NavBar';
import './style.css';
import CaseStudyDisplay from './Case_study_display';
import CaseStudyEdit from './Case_study_edit';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Login from './components/Login';
import data from './case_study.json'


const App = () => {
  const [displayShow, setdisplayShow] = useState(true)
  const [loginModal, setLoginModal] = useState(false)
  const handleClose = () => {
    setLoginModal(false)
  }
  return (
    <>
    {displayShow === true ? (
      <>
      <NavBar setCreate={setdisplayShow} navType={'display'} loginModal={setLoginModal}/>
        <CaseStudyDisplay data={data} />
        </>
    ):(
      <>
        <NavBar setCreate={setdisplayShow} navType={'create'} loginModal={setLoginModal}/>
        <CaseStudyEdit/>
      </>
    )}
      <Modal show={loginModal} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Log In</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Login handleClose={handleClose} setdisplayShow={setdisplayShow}/>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
  
    </>
  );
};

export default App;

