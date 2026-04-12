import React, { useEffect, useMemo, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Modal from 'react-bootstrap/Modal';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Popover from 'react-bootstrap/Popover';
import Row from 'react-bootstrap/Row';
import Table from 'react-bootstrap/Table';
import data from './biochemistry.json';

const categoryPopover = (
  <Popover id="popover-basic">
    <Popover.Header as="h3">Sample Category</Popover.Header>
    <Popover.Body>Samples with the same category are grouped together into the same table when they are displayed.</Popover.Body>
  </Popover>
);

const initialForm = {
  sampleType: '',
  sampleTypeFreeform: false,
  category: '',
  unit: '',
  range: '',
  resultDate: '',
  resultTime: '',
  result: '',
};

const AddBiochemistry = ({ closeModal, previousResult, setBiochemistry }) => {
  const [formState, setFormState] = useState(initialForm);
  const [results, setResults] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [editingSampleKey, setEditingSampleKey] = useState('');
  const [editType, setEditType] = useState('sample_result');
  const [editingTableRow, setEditingTableRow] = useState('');

  useEffect(() => {
    if (previousResult && typeof previousResult === 'object' && !Array.isArray(previousResult)) {
      setResults(previousResult);
    }
  }, [previousResult]);

  const sampleOptions = useMemo(() => {
    const sampleList = data.biochemistryList;
    return Object.keys(sampleList)
      .sort()
      .map((keyName) => (
        <option key={sampleList[keyName].name} value={sampleList[keyName].name}>
          {sampleList[keyName].name}
        </option>
      ));
  }, []);

  const updateFormState = (field, value) => {
    setFormState((current) => ({ ...current, [field]: value }));
  };

  const handleSampleType = (event) => {
    const sampleName = event.target.value;
    updateFormState('sampleType', sampleName);
    updateFormState('category', data.biochemistryList[sampleName]?.category || '');
    updateFormState('unit', data.biochemistryList[sampleName]?.unit || '');
    updateFormState('range', data.biochemistryList[sampleName]?.range || '');
  };

  const resetForm = () => {
    setFormState(initialForm);
    setEditRecord(null);
    setEditingTableRow('');
  };

  const addSample = () => {
    const resultDetails = {
      datetime: `${formState.resultDate} ${formState.resultTime}`.trim(),
      result: formState.result,
    };

    setResults((current) => {
      const next = { ...current };
      const sampleKey = editRecord ? editRecord.sampleKey : formState.sampleType;
      const existingSample = next[sampleKey];

      if (editRecord) {
        next[sampleKey] = {
          ...existingSample,
          results: existingSample.results.map((item, index) => (index === editRecord.resultIndex ? resultDetails : item)),
        };
      } else if (existingSample) {
        next[sampleKey] = { ...existingSample, results: [...existingSample.results, resultDetails] };
      } else {
        next[sampleKey] = {
          name: formState.sampleType,
          category: formState.category,
          range: formState.range,
          unit: formState.unit,
          results: [resultDetails],
        };
      }

      return next;
    });

    resetForm();
  };

  const editResult = (sampleKey, resultIndex) => {
    const resultItem = results[sampleKey].results[resultIndex];
    const [resultDate = '', resultTime = ''] = (resultItem.datetime || '').split(' ');
    setEditingTableRow(`${sampleKey}-${resultIndex}`);
    setEditRecord({ sampleKey, resultIndex });
    setEditType('sample_result');
    setFormState((current) => ({
      ...current,
      sampleType: sampleKey,
      category: results[sampleKey].category,
      range: results[sampleKey].range,
      unit: results[sampleKey].unit,
      resultDate,
      resultTime,
      result: resultItem.result,
    }));
  };

  const editSample = (sampleKey) => {
    const sampleRecord = results[sampleKey];
    setEditingSampleKey(sampleKey);
    setEditType('sample_details');
    setFormState((current) => ({
      ...current,
      sampleType: sampleRecord.name,
      category: sampleRecord.category,
      range: sampleRecord.range,
      unit: sampleRecord.unit,
    }));
  };

  const saveEditSample = () => {
    setResults((current) => {
      const existing = current[editingSampleKey];
      if (!existing) {
        return current;
      }

      const updatedEntry = {
        ...existing,
        name: formState.sampleType,
        category: formState.category,
        range: formState.range,
        unit: formState.unit,
      };

      if (editingSampleKey === formState.sampleType) {
        return { ...current, [editingSampleKey]: updatedEntry };
      }

      const next = { ...current };
      delete next[editingSampleKey];
      next[formState.sampleType] = updatedEntry;
      return next;
    });

    setShowEditModal(false);
    setEditingSampleKey('');
    resetForm();
  };

  const deleteResult = (sampleKey, resultIndex) => {
    setResults((current) => {
      const sample = current[sampleKey];
      const nextResults = sample.results.filter((_item, index) => index !== resultIndex);
      const next = { ...current };

      if (nextResults.length === 0) {
        delete next[sampleKey];
      } else {
        next[sampleKey] = { ...sample, results: nextResults };
      }

      return next;
    });
  };

  const saveResultList = () => {
    setBiochemistry(results);
    closeModal();
  };

  const canSaveResult = formState.sampleType && formState.category && formState.unit && formState.range && formState.resultDate && formState.resultTime && formState.result !== '';

  return (
    <>
      <Container className="container-shadow mt-3">
        <Form className="mb-3">
          <br />
          <h4>Add a New Sample</h4>
          {!formState.sampleTypeFreeform ? (
            <Row className="mb-3">
              <Form.Group as={Col} controlId="formSampleTypeDropdown">
                <Form.Select onChange={handleSampleType} value={formState.sampleType}>
                  <option value="">Select Sample Type</option>
                  {sampleOptions}
                </Form.Select>
              </Form.Group>
            </Row>
          ) : (
            <Row className="mb-3">
              <Form.Group as={Col} controlId="formSampleType">
                <Form.Control type="text" placeholder="sample type" value={formState.sampleType} onChange={(event) => updateFormState('sampleType', event.target.value)} />
              </Form.Group>
            </Row>
          )}
          <Row className="mb-3">
            <Form.Group as={Col} controlId="statCheckbox">
              <Form.Check type="checkbox" checked={formState.sampleTypeFreeform} label="Sample not in List?" onChange={(event) => updateFormState('sampleTypeFreeform', event.target.checked)} />
            </Form.Group>
          </Row>
          <Row className="mb-3">
            <Form.Group as={Col} controlId="formCategory">
              <Form.Label>Category</Form.Label>
              <InputGroup>
                <Form.Control type="text" value={formState.category} onChange={(event) => updateFormState('category', event.target.value)} />
                <OverlayTrigger trigger="click" placement="top" overlay={categoryPopover}>
                  <InputGroup.Text>
                    <i className="bi bi-question-circle" />
                  </InputGroup.Text>
                </OverlayTrigger>
              </InputGroup>
            </Form.Group>
            <Form.Group as={Col} controlId="formRange">
              <Form.Label>Reference Range</Form.Label>
              <Form.Control type="text" value={formState.range} onChange={(event) => updateFormState('range', event.target.value)} />
            </Form.Group>
            <Form.Group as={Col} controlId="formUnit">
              <Form.Label>Unit</Form.Label>
              <Form.Control type="text" value={formState.unit} onChange={(event) => updateFormState('unit', event.target.value)} />
            </Form.Group>
          </Row>
          <Row className="mb-3">
            <Form.Group as={Col} controlId="resultDate">
              <Form.Label>Result Date</Form.Label>
              <Form.Control type="date" value={formState.resultDate} onChange={(event) => updateFormState('resultDate', event.target.value)} />
            </Form.Group>
            <Form.Group as={Col} controlId="resultTime">
              <Form.Label>Result Time</Form.Label>
              <Form.Control type="time" value={formState.resultTime} onChange={(event) => updateFormState('resultTime', event.target.value)} />
            </Form.Group>
            <Form.Group as={Col} controlId="resultValue">
              <Form.Label>Result</Form.Label>
              <Form.Control type="text" value={formState.result} onChange={(event) => updateFormState('result', event.target.value)} />
            </Form.Group>
          </Row>
          <Row className="mb-3">
            <Form.Group as={Col} controlId="formSave">
              <Button type="button" variant="success" className="mt-4" disabled={!canSaveResult} onClick={addSample}>Add Result</Button>
            </Form.Group>
          </Row>
        </Form>
      </Container>
      <Container>
        <Table className="mt-3 container-shadow">
          <tbody>
            <tr className="blue-back text-white">
              <th colSpan={4}><h3>Results</h3></th>
            </tr>
            {Object.keys(results).map((item) => (
              <React.Fragment key={item}>
                <tr className="lightblue-back">
                  <th><h4>{results[item].name}</h4></th>
                  <th>Category: {results[item].category}</th>
                  <th>Range: {results[item].range} {results[item].unit}</th>
                  <th>
                    <Button type="button" variant="outline-info" className="float-end" onClick={() => { setShowEditModal(true); setEditType('sample_details'); editSample(item); }}>
                      Edit
                    </Button>
                  </th>
                </tr>
                {results[item].results.map((itemResult, resultIndex) => (
                  <tr key={`${item}-${resultIndex}`} className={`${item}-${resultIndex}` === editingTableRow ? 'highlighted-row' : ''}>
                    <td>{itemResult.datetime}</td>
                    <td>{itemResult.result}</td>
                    <td />
                    <td>
                      <Button type="button" variant="link" onClick={() => { setShowEditModal(true); editResult(item, resultIndex); setEditType('sample_result'); }}>edit</Button>
                      <Button type="button" variant="link" className="text-danger" onClick={() => deleteResult(item, resultIndex)}>delete</Button>
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </Table>
      </Container>
      <Container>
        <Row>
          <Col>
            <Button type="button" variant="success" onClick={saveResultList}>Save Results</Button>
          </Col>
        </Row>
      </Container>

      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Biochemistry</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editType === 'sample_result' ? (
            <>
              <Row className="mb-3">
                <Form.Group as={Col} controlId="editResultDate">
                  <Form.Label>Result Date</Form.Label>
                  <Form.Control type="date" value={formState.resultDate} onChange={(event) => updateFormState('resultDate', event.target.value)} />
                </Form.Group>
              </Row>
              <Row className="mb-3">
                <Form.Group as={Col} controlId="editResultTime">
                  <Form.Label>Result Time</Form.Label>
                  <Form.Control type="time" value={formState.resultTime} onChange={(event) => updateFormState('resultTime', event.target.value)} />
                </Form.Group>
              </Row>
              <Row className="mb-3">
                <Form.Group as={Col} controlId="editResultValue">
                  <Form.Label>Result</Form.Label>
                  <Form.Control type="text" value={formState.result} onChange={(event) => updateFormState('result', event.target.value)} />
                </Form.Group>
              </Row>
              <Button type="button" variant="success" className="mt-4" onClick={() => { addSample(); setShowEditModal(false); }}>Save</Button>
            </>
          ) : (
            <>
              <Row className="mb-3">
                <Form.Group as={Col} controlId="editSampleType">
                  <Form.Control type="text" placeholder="Sample type" value={formState.sampleType} onChange={(event) => updateFormState('sampleType', event.target.value)} />
                </Form.Group>
              </Row>
              <Row className="mb-3">
                <Form.Group as={Col} controlId="editCategory">
                  <Form.Label>Category</Form.Label>
                  <Form.Control type="text" value={formState.category} onChange={(event) => updateFormState('category', event.target.value)} />
                </Form.Group>
              </Row>
              <Row className="mb-3">
                <Form.Group as={Col} controlId="editRange">
                  <Form.Label>Reference Range</Form.Label>
                  <Form.Control type="text" value={formState.range} onChange={(event) => updateFormState('range', event.target.value)} />
                </Form.Group>
              </Row>
              <Row className="mb-3">
                <Form.Group as={Col} controlId="editUnit">
                  <Form.Label>Unit</Form.Label>
                  <Form.Control type="text" value={formState.unit} onChange={(event) => updateFormState('unit', event.target.value)} />
                </Form.Group>
              </Row>
              <Button type="button" variant="success" className="mt-4" onClick={saveEditSample}>Save</Button>
            </>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
};

export default AddBiochemistry;
