import React, { useState } from 'react';
import Icon from './Patient_record_icon';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Container from 'react-bootstrap/Container';
import Table from 'react-bootstrap/Table';

function CaseNotes(props) {
  //handle canvas
  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);
  const handleClick = () => setShow(true);

  // define data
  const presenting_complaint = props.case_notes['presenting_complaint'];
  const history_presenting_complaint =
    props.case_notes['history_presenting_complaint'];
  const conditions = props.case_notes['conditions'].map((condition, index) => (
    <span>{(index ? ', ' : '') + condition}</span>
  ));
  const social_history = props.case_notes['social_history'];
  const family_history = props.case_notes['family_history'];
  const notes = props.case_notes['notes'].map((item) => (
    <tr>
      <th>{item['note_date']}</th>
      <th>{item['note_location']}</th>
      <th>{item['note_author']}</th>
      <td>{item['note_content']}</td>
    </tr>
  ));

  return (
    <>
      <td onClick={handleClick}>
        <Icon logo="bi bi-collection" title_text="Case Notes"/>

      </td>

      <Offcanvas show={show} onHide={handleClose} style={{ width: '100%' }}>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Case Notes</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Container>
            <Table striped>
              <thead colspan={2}>
                <tr>
                  <th>
                    <h3>History</h3>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th> Presenting complaint </th>
                  <td> {presenting_complaint} </td>
                </tr>
                <tr>
                  <th> History of Presenting complaint </th>
                  <td> {history_presenting_complaint} </td>
                </tr>
                <tr>
                  <th>Past Medical History </th>
                  <td>{conditions}</td>
                </tr>
                <tr>
                  <th> Social History </th>
                  <td>
                    <p>Alcohol: {social_history['alcohol']}</p>
                    <p>Smoking History: {social_history['smoking']}</p>
                    <p>
                      Recreational Drugs: {social_history['recreational_drugs']}
                    </p>
                    <p>Occupation: {social_history['occupation']}</p>
                    <p>
                      Home environment: {social_history['home_environment']}
                    </p>
                  </td>
                </tr>
                <tr>
                  <th> Family History </th>
                  <td> {family_history} </td>
                </tr>
              </tbody>
            </Table>
          </Container>
          <Container>
            <Table striped>
              <thead>
                <tr>
                  <th colspan={4}>
                    <h3>Case Notes</h3>
                  </th>
                </tr>
                <tr>
                  <th>Date</th>
                  <th>Location</th>
                  <th>Author</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>{notes}</tbody>
            </Table>
          </Container>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}
export default CaseNotes;
