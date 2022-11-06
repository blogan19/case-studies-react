import React, { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

const Administrations = (props) => {
  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const adminList = props.administrationList;
  const adminItems = adminList.map((admin) => (
    <p key={admin.adminDateTime}>
      {admin.adminDateTime} {admin.adminsteredBy} {admin.adminNote}
    </p>
  ));
  return (
    <>
      <a href="#" onClick={handleShow}>
        Administrations
      </a>
      <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title> {props.drug.charAt(0).toUpperCase() + props.drug.slice(1)} Administrations</Modal.Title>
        </Modal.Header>
        <Modal.Body>{adminItems}</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
export default Administrations;
