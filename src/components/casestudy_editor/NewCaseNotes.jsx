import React, { useEffect, useMemo, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import Table from 'react-bootstrap/Table';

const emptyNote = {
  note_date: '',
  note_time: '',
  note_location: '',
  note_author: '',
  note_content: '',
};

const formatStoredDate = (value) => {
  if (!value) {
    return { note_date: '', note_time: '' };
  }

  const [datePart = '', timePart = ''] = value.split(' ');
  const [day = '', month = '', year = ''] = datePart.split('/');
  return {
    note_date: day && month && year ? `${year}-${month}-${day}` : '',
    note_time: timePart,
  };
};

const AddCaseNotes = ({ newCaseNotes, closeModal, previousNotes }) => {
  const [presentingComplaint, setPresentingComplaint] = useState('');
  const [historyPresentingComplaint, setHistoryPresentingComplaint] = useState('');
  const [pastMedicalHistory, setPastMedicalHistory] = useState('');
  const [alcohol, setAlcohol] = useState('');
  const [smoking, setSmoking] = useState('');
  const [recreationalDrugs, setRecreationalDrugs] = useState('');
  const [occupation, setOccupation] = useState('');
  const [homeEnvironment, setHomeEnvironment] = useState('');
  const [familyHistory, setFamilyHistory] = useState('');
  const [caseNotes, setCaseNotes] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState(null);
  const [noteDraft, setNoteDraft] = useState(emptyNote);

  useEffect(() => {
    if (!previousNotes || typeof previousNotes !== 'object' || Array.isArray(previousNotes)) {
      return;
    }

    setPresentingComplaint(previousNotes.presenting_complaint || '');
    setHistoryPresentingComplaint(previousNotes.history_presenting_complaint || '');
    setPastMedicalHistory(Array.isArray(previousNotes.conditions) ? previousNotes.conditions.join(', ') : '');
    setAlcohol(previousNotes.social_history?.alcohol || '');
    setSmoking(previousNotes.social_history?.smoking || '');
    setRecreationalDrugs(previousNotes.social_history?.recreational_drugs || '');
    setOccupation(previousNotes.social_history?.occupation || '');
    setHomeEnvironment(previousNotes.social_history?.home_environment || '');
    setFamilyHistory(previousNotes.family_history || '');
    setCaseNotes(Array.isArray(previousNotes.notes) ? previousNotes.notes : []);
  }, [previousNotes]);

  const saveCaseNoteDisabled = useMemo(
    () =>
      !noteDraft.note_date ||
      !noteDraft.note_time ||
      !noteDraft.note_location ||
      !noteDraft.note_author ||
      !noteDraft.note_content,
    [noteDraft]
  );

  const openNewModal = () => {
    setEditingIndex(null);
    setPendingDeleteIndex(null);
    setNoteDraft(emptyNote);
    setShowEditModal(true);
  };

  const openEditModal = (index) => {
    const selected = caseNotes[index];
    const parsed = formatStoredDate(selected.note_date);
    setEditingIndex(index);
    setPendingDeleteIndex(null);
    setNoteDraft({
      note_date: parsed.note_date,
      note_time: parsed.note_time,
      note_location: selected.note_location || '',
      note_author: selected.note_author || '',
      note_content: selected.note_content || '',
    });
    setShowEditModal(true);
  };

  const saveCaseNote = () => {
    const displayDate = new Date(noteDraft.note_date).toLocaleDateString('en-GB');
    const nextNote = {
      note_date: `${displayDate} ${noteDraft.note_time}`,
      note_location: noteDraft.note_location,
      note_author: noteDraft.note_author,
      note_content: noteDraft.note_content,
    };

    setCaseNotes((current) =>
      editingIndex === null
        ? [...current, nextNote]
        : current.map((item, index) => (index === editingIndex ? nextNote : item))
    );
    setShowEditModal(false);
    setNoteDraft(emptyNote);
    setEditingIndex(null);
  };

  const deleteCaseNote = () => {
    setCaseNotes((current) => current.filter((_item, index) => index !== pendingDeleteIndex));
    setPendingDeleteIndex(null);
    setShowEditModal(false);
  };

  const saveAllCaseNotes = () => {
    newCaseNotes({
      presenting_complaint: presentingComplaint,
      history_presenting_complaint: historyPresentingComplaint,
      conditions: pastMedicalHistory
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      social_history: {
        alcohol,
        smoking,
        recreational_drugs: recreationalDrugs,
        occupation,
        home_environment: homeEnvironment,
      },
      family_history: familyHistory,
      notes: caseNotes,
    });
    closeModal();
  };

  return (
    <>
      <Form>
        <h3>Social History</h3>
        <p>Use the fields below to document your patient history and add timeline case notes.</p>
        <hr />
        <Row className="mb-3">
          <Form.Group as={Col} controlId="formPresentingComplaint">
            <Form.Label>Presenting Complaint</Form.Label>
            <Form.Control value={presentingComplaint} onChange={(event) => setPresentingComplaint(event.target.value)} />
          </Form.Group>
        </Row>
        <Row className="mb-3">
          <Form.Group as={Col} controlId="formHistoryPresentingComplaint">
            <Form.Label>History of Presenting Complaint</Form.Label>
            <Form.Control value={historyPresentingComplaint} onChange={(event) => setHistoryPresentingComplaint(event.target.value)} />
          </Form.Group>
        </Row>
        <Row className="mb-3">
          <Form.Group as={Col} controlId="formPatientHistory">
            <Form.Label>Past Medical History</Form.Label>
            <Form.Control as="textarea" value={pastMedicalHistory} onChange={(event) => setPastMedicalHistory(event.target.value)} />
          </Form.Group>
        </Row>
        <Row className="mb-3">
          <Form.Group as={Col} controlId="formAlcohol">
            <Form.Label>Alcohol</Form.Label>
            <Form.Control value={alcohol} onChange={(event) => setAlcohol(event.target.value)} />
          </Form.Group>
          <Form.Group as={Col} controlId="formSmoking">
            <Form.Label>Smoking History</Form.Label>
            <Form.Control value={smoking} onChange={(event) => setSmoking(event.target.value)} />
          </Form.Group>
          <Form.Group as={Col} controlId="formDrugs">
            <Form.Label>Recreational Drugs</Form.Label>
            <Form.Control value={recreationalDrugs} onChange={(event) => setRecreationalDrugs(event.target.value)} />
          </Form.Group>
        </Row>
        <Row className="mb-3">
          <Form.Group as={Col} controlId="formOccupation">
            <Form.Label>Occupation</Form.Label>
            <Form.Control value={occupation} onChange={(event) => setOccupation(event.target.value)} />
          </Form.Group>
          <Form.Group as={Col} controlId="formHome">
            <Form.Label>Home Environment</Form.Label>
            <Form.Control value={homeEnvironment} onChange={(event) => setHomeEnvironment(event.target.value)} />
          </Form.Group>
        </Row>
        <Row className="mb-3">
          <Form.Group as={Col} controlId="formFamilyHistory">
            <Form.Label>Family History</Form.Label>
            <Form.Control as="textarea" value={familyHistory} onChange={(event) => setFamilyHistory(event.target.value)} />
          </Form.Group>
        </Row>
        <hr />
        <Button type="button" variant="outline-success" onClick={openNewModal}>
          Add New Case Note
        </Button>

        <Row className="mt-3">
          <Container>
            <Table className="tbl-notes container-shadow">
              <tbody>
                {caseNotes.map((item, index) => (
                  <React.Fragment key={`${item.note_date}-${index}`}>
                    <tr className="blue-back text-white">
                      <th>{item.note_date}</th>
                      <th>{item.note_location}</th>
                      <th>{item.note_author}</th>
                      <th>
                        <Button type="button" size="sm" variant="link" className="text-white" onClick={() => openEditModal(index)}>
                          <i className="bi bi-pencil" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="link"
                          className="text-danger"
                          onClick={() => {
                            setPendingDeleteIndex(index);
                            setShowEditModal(true);
                          }}
                        >
                          <i className="bi bi-trash3" />
                        </Button>
                      </th>
                    </tr>
                    <tr>
                      <td colSpan={4}>{item.note_content}</td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </Table>
          </Container>
        </Row>
        <Row>
          <hr />
          <Col>
            <Button type="button" variant="success" onClick={saveAllCaseNotes}>
              Save Case Notes
            </Button>{' '}
            <Button type="button" variant="outline-info" onClick={closeModal}>
              Cancel
            </Button>
          </Col>
        </Row>
      </Form>

      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Case Note Entry</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {pendingDeleteIndex === null ? (
            <>
              <Row className="mb-3">
                <Form.Group as={Col} controlId="formNoteDate">
                  <Form.Label>Note Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={noteDraft.note_date}
                    onChange={(event) => setNoteDraft((current) => ({ ...current, note_date: event.target.value }))}
                  />
                </Form.Group>
                <Form.Group as={Col} controlId="formNoteTime">
                  <Form.Label>Note Time</Form.Label>
                  <Form.Control
                    type="time"
                    value={noteDraft.note_time}
                    onChange={(event) => setNoteDraft((current) => ({ ...current, note_time: event.target.value }))}
                  />
                </Form.Group>
              </Row>
              <Row className="mb-3">
                <Form.Group as={Col} controlId="formCaseLocation">
                  <Form.Label>Case Note Location</Form.Label>
                  <Form.Control
                    value={noteDraft.note_location}
                    onChange={(event) => setNoteDraft((current) => ({ ...current, note_location: event.target.value }))}
                  />
                </Form.Group>
              </Row>
              <Row className="mb-3">
                <Form.Group as={Col} controlId="formCaseAuthor">
                  <Form.Label>Case Note Author</Form.Label>
                  <Form.Control
                    value={noteDraft.note_author}
                    onChange={(event) => setNoteDraft((current) => ({ ...current, note_author: event.target.value }))}
                  />
                </Form.Group>
              </Row>
              <Row className="mb-3">
                <Form.Group as={Col} controlId="formCaseContent">
                  <Form.Label>Case Note Contents</Form.Label>
                  <Form.Control
                    as="textarea"
                    value={noteDraft.note_content}
                    onChange={(event) => setNoteDraft((current) => ({ ...current, note_content: event.target.value }))}
                  />
                </Form.Group>
              </Row>
              <Row>
                <Col>
                  <Button type="button" variant="success" disabled={saveCaseNoteDisabled} onClick={saveCaseNote}>
                    Save Case Note
                  </Button>{' '}
                  <Button type="button" variant="outline-info" onClick={() => setShowEditModal(false)}>
                    Cancel
                  </Button>
                </Col>
              </Row>
            </>
          ) : (
            <>
              <Alert variant="danger">Delete this case note permanently?</Alert>
              <Button type="button" variant="danger" onClick={deleteCaseNote}>
                Delete note
              </Button>{' '}
              <Button
                type="button"
                variant="outline-info"
                onClick={() => {
                  setPendingDeleteIndex(null);
                  setShowEditModal(false);
                }}
              >
                Cancel
              </Button>
            </>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
};

export default AddCaseNotes;
