import React, { useEffect, useMemo, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import ListGroup from 'react-bootstrap/ListGroup';
import Row from 'react-bootstrap/Row';
import Table from 'react-bootstrap/Table';
import ToggleButton from 'react-bootstrap/ToggleButton';
import ToggleButtonGroup from 'react-bootstrap/ToggleButtonGroup';

const emptyForm = {
  microDate: '',
  microTime: '',
  sampleType: '',
  growth: '',
  notes: 'S = Sensitive I = Intermediate R = Resistant',
  sensitivities: [],
  drug: '',
  sensitivity: '',
};

const AddMicrobiology = ({ previousResult, setMicrobiology, closeModal }) => {
  const [samples, setSamples] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [sampleId, setSampleId] = useState(null);
  const [formState, setFormState] = useState(emptyForm);

  useEffect(() => {
    if (Array.isArray(previousResult)) {
      setSamples(previousResult);
    }
  }, [previousResult]);

  const saveSampleDisabled = useMemo(
    () => !formState.microDate || !formState.microTime || !formState.sampleType || !formState.growth || !formState.notes || formState.sensitivities.length === 0,
    [formState]
  );

  const resetForm = () => {
    setFormState(emptyForm);
    setShowForm(false);
    setSampleId(null);
  };

  const addSensitivity = () => {
    if (!formState.drug || !formState.sensitivity) {
      return;
    }

    setFormState((current) => ({
      ...current,
      sensitivities: [...current.sensitivities, [current.drug, current.sensitivity]],
      drug: '',
      sensitivity: '',
    }));
  };

  const editMicro = (index) => {
    const result = samples[index];
    const [datePart = '', timePart = ''] = (result.datetime || '').split(' ');
    const [day = '', month = '', year = ''] = datePart.split('/');
    setShowForm(true);
    setSampleId(index);
    setFormState({
      microDate: day && month && year ? `${year}-${month}-${day}` : '',
      microTime: timePart,
      sampleType: result.sample_type || '',
      growth: result.growth || '',
      notes: result.notes || emptyForm.notes,
      sensitivities: Array.isArray(result.sensitivities) ? result.sensitivities : [],
      drug: '',
      sensitivity: '',
    });
  };

  const deleteMicro = (index) => {
    setSamples((current) => current.filter((_item, itemIndex) => itemIndex !== index));
  };

  const saveSample = () => {
    const sampleDate = new Date(formState.microDate).toLocaleDateString('en-GB');
    const microResult = {
      datetime: `${sampleDate} ${formState.microTime}`,
      sample_type: formState.sampleType,
      growth: formState.growth,
      sensitivities: formState.sensitivities,
      notes: formState.notes,
    };

    setSamples((current) =>
      sampleId === null
        ? [...current, microResult]
        : current.map((item, index) => (index === sampleId ? microResult : item))
    );
    resetForm();
  };

  return (
    <>
      <h3>Results</h3>
      <p>Add details of microbiology results for the patient.</p>
      <Table>
        <tbody>
          {samples.map((result, index) => (
            <tr key={`${result.datetime}-${index}`}>
              <td>{result.datetime}</td>
              <td>{result.sample_type}</td>
              <td>{result.growth}</td>
              <td>
                {result.sensitivities.map((item, itemIndex) => (
                  <li key={`${item[0]}-${itemIndex}`}>{item[0]}: {item[1]}</li>
                ))}
              </td>
              <td>{result.notes}</td>
              <td>
                <Button type="button" variant="link" onClick={() => editMicro(index)}>edit</Button>
              </td>
              <td>
                <Button type="button" variant="link" className="text-danger" onClick={() => deleteMicro(index)}>delete</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {!showForm ? (
        <>
          <Button type="button" variant="success" className="mt-4" onClick={() => setShowForm(true)}>Add New Sample</Button>{' '}
          <Button type="button" variant="outline-info" className="mt-4" onClick={closeModal}>Cancel</Button>{' '}
          {samples.length > 0 ? (
            <Button type="button" variant="success" className="mt-4" onClick={() => { setMicrobiology(samples); closeModal(); }}>Save Samples</Button>
          ) : null}
        </>
      ) : null}

      {showForm ? (
        <Form className="mt-3">
          <h3>{sampleId === null ? 'Add New Result' : 'Edit Result'}</h3>
          <Row className="mb-3">
            <Form.Group as={Col} controlId="microDate">
              <Form.Label>Result Date</Form.Label>
              <Form.Control type="date" value={formState.microDate} onChange={(event) => setFormState((current) => ({ ...current, microDate: event.target.value }))} />
            </Form.Group>
            <Form.Group as={Col} controlId="microTime">
              <Form.Label>Result Time</Form.Label>
              <Form.Control type="time" value={formState.microTime} onChange={(event) => setFormState((current) => ({ ...current, microTime: event.target.value }))} />
            </Form.Group>
          </Row>
          <Row className="mb-3">
            <Form.Group as={Col} controlId="sampleType">
              <Form.Label>Sample Type</Form.Label>
              <Form.Control value={formState.sampleType} placeholder="E.g. MSSU" onChange={(event) => setFormState((current) => ({ ...current, sampleType: event.target.value }))} />
            </Form.Group>
            <Form.Group as={Col} controlId="growth">
              <Form.Label>Growth/Organism(s)</Form.Label>
              <Form.Control value={formState.growth} placeholder="E.g. E.Coli" onChange={(event) => setFormState((current) => ({ ...current, growth: event.target.value }))} />
            </Form.Group>
          </Row>
          <Row className="mb-3">
            <Form.Group as={Col} controlId="notes">
              <Form.Label>Notes</Form.Label>
              <Form.Control as="textarea" value={formState.notes} onChange={(event) => setFormState((current) => ({ ...current, notes: event.target.value }))} />
            </Form.Group>
          </Row>
          <hr />
          <Row className="mb-3">
            <h4>Add sensitivity details</h4>
            {formState.sensitivities.length === 0 ? <p style={{ color: 'red' }}>You have not added any sensitivity details</p> : null}
            <Form.Group as={Col} controlId="drugName">
              <Form.Label>Add Sensitivity</Form.Label>
              <Form.Control value={formState.drug} placeholder="Drug" onChange={(event) => setFormState((current) => ({ ...current, drug: event.target.value }))} />
            </Form.Group>
            <Form.Group as={Col} controlId="drugSensitivity">
              <Form.Label>Sensitivity</Form.Label>
              <InputGroup>
                <ToggleButtonGroup type="radio" name="sensitivityOptions" value={formState.sensitivity} onChange={(value) => setFormState((current) => ({ ...current, sensitivity: value }))}>
                  <ToggleButton id="sens1" value="S" variant="outline-primary">Sensitive</ToggleButton>
                  <ToggleButton id="sens2" value="I" variant="outline-primary">Intermediate</ToggleButton>
                  <ToggleButton id="sens3" value="R" variant="outline-primary">Resistant</ToggleButton>
                </ToggleButtonGroup>
              </InputGroup>
            </Form.Group>
            <Form.Group as={Col} controlId="addSensitivityBtn">
              <Button type="button" variant="outline-success" className="mt-4" onClick={addSensitivity}>Add Sensitivity</Button>
            </Form.Group>
          </Row>
          <Row>
            <strong>Sensitivities</strong>
            <ListGroup>
              {formState.sensitivities.map((item, index) => (
                <ListGroup.Item key={`${item[0]}-${index}`}>
                  {item[0]}: {item[1]}{' '}
                  <Button type="button" variant="link" className="p-0" onClick={() => setFormState((current) => ({ ...current, sensitivities: current.sensitivities.filter((_sensitivity, itemIndex) => itemIndex !== index) }))}>
                    Delete
                  </Button>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Row>
          <Form.Group as={Col} controlId="saveSampleBtn">
            <Button type="button" variant="success" className="mt-4" disabled={saveSampleDisabled} onClick={saveSample}>Save Sample</Button>{' '}
            <Button type="button" variant="outline-secondary" className="mt-4" onClick={resetForm}>Cancel</Button>
          </Form.Group>
        </Form>
      ) : null}
    </>
  );
};

export default AddMicrobiology;
