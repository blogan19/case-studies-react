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
    <span key={condition}>{(index ? ', ' : '') + condition}</span>
  ));
  const social_history = props.case_notes['social_history'];
  const family_history = props.case_notes['family_history'];
  const notes = props.case_notes['notes'].map((item) => (
    <React.Fragment key={item['note_date']}>
      <tr  className="lightblue-back">
        <th>{item['note_date']}</th>
        <th>{item['note_location']}</th>
        <th>{item['note_author']}</th>
      </tr>
      <tr>
        <td colSpan={3}>{item['note_content']}</td>
      </tr>
    </React.Fragment>
  ));

  return (
    <>
      <td onClick={handleClick}>
        <Icon logo="bi bi-collection" title_text="Case Notes"/>
      </td>

      <Offcanvas show={show} onHide={handleClose} style={{ width: '100%' }}>
        <Offcanvas.Header closeButton className="blue-back text-white">
          <Offcanvas.Title>Case Notes</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Container>
              <Table  className='tbl-notes container-shadow' >
                <thead >
                  <tr className="blue-back text-white">
                    <th colSpan={2}>
                      <h4>History</h4>
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
                      <Table>
                        <tbody>
                          <tr>
                            <th>Alcohol:</th>
                            <td>{social_history['alcohol']}</td>
                          </tr>
                          <tr>
                            <th>Smoking History:</th>
                            <td>{social_history['smoking']}</td>
                          </tr>
                          <tr>
                            <th>Recreational Drugs:</th>
                            <td>{social_history['recreational_drugs']}</td>
                          </tr>
                          <tr>
                            <th>Occupation:</th>
                            <td>{social_history['occupation']}</td>
                          </tr>           
                          <tr>
                            <th>Home Environment:</th>
                            <td>{social_history['home_environment']}</td>
                          </tr>
                          </tbody>
                      </Table>
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
            <Table  className='tbl-notes container-shadow'>
              <thead>
                <tr className="blue-back text-white">
                  <th colSpan={4}>
                    <h4>Case Notes</h4>
                  </th>
                </tr>
                <tr>
                  <th>Date</th>
                  <th>Location</th>
                  <th>Author</th>
                </tr>
              </thead>
              <tbody>
                {notes}
              </tbody>
            </Table>
          </Container>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}
export default CaseNotes;
