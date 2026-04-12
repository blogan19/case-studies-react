import React, { useEffect, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';

const emptyRecord = { image_date: '', image_time: '', image_url: '', image_type: '', image_desc: '' };

const AddImages = ({ closeModal, setImages, previousResult }) => {
  const [recordState, setRecordState] = useState([{ ...emptyRecord }]);

  useEffect(() => {
    if (Array.isArray(previousResult) && previousResult.length > 0) {
      setRecordState(previousResult);
    }
  }, [previousResult]);

  const updateRecord = (index, name, value) => {
    setRecordState((current) => current.map((record, recordIndex) => (recordIndex === index ? { ...record, [name]: value } : record)));
  };

  const addRecord = () => {
    setRecordState((current) => [...current, { ...emptyRecord }]);
  };

  const removeRecord = (index) => {
    setRecordState((current) => (current.length === 1 ? [{ ...emptyRecord }] : current.filter((_item, recordIndex) => recordIndex !== index)));
  };

  const saveRecords = () => {
    setImages(recordState.filter((record) => record.image_url || record.image_desc || record.image_type));
    closeModal();
  };

  return (
    <Form>
      {recordState.map((record, index) => (
        <div key={`image-${index}`} className="mb-4">
          <Row className="mb-3">
            <Form.Group as={Col} controlId={`imageDate-${index}`}>
              <Form.Label>Image Date</Form.Label>
              <Form.Control type="date" value={record.image_date} onChange={(event) => updateRecord(index, 'image_date', event.target.value)} />
            </Form.Group>
            <Form.Group as={Col} controlId={`imageTime-${index}`}>
              <Form.Label>Image Time</Form.Label>
              <Form.Control type="time" value={record.image_time} onChange={(event) => updateRecord(index, 'image_time', event.target.value)} />
            </Form.Group>
          </Row>
          <Row className="mb-3">
            <Form.Group as={Col} controlId={`imageUrl-${index}`}>
              <Form.Label>Image URL</Form.Label>
              <Form.Control type="text" value={record.image_url} onChange={(event) => updateRecord(index, 'image_url', event.target.value)} />
            </Form.Group>
          </Row>
          <Row className="mb-3">
            <Form.Group as={Col} controlId={`imageType-${index}`}>
              <Form.Label>Image Title</Form.Label>
              <Form.Control type="text" value={record.image_type} onChange={(event) => updateRecord(index, 'image_type', event.target.value)} />
            </Form.Group>
          </Row>
          <Row className="mb-3">
            <Form.Group as={Col} controlId={`imageDesc-${index}`}>
              <Form.Label>Image Description</Form.Label>
              <Form.Control type="text" value={record.image_desc} onChange={(event) => updateRecord(index, 'image_desc', event.target.value)} />
            </Form.Group>
          </Row>
          <Button type="button" variant="outline-danger" size="sm" onClick={() => removeRecord(index)}>
            Remove image
          </Button>
        </div>
      ))}
      <Row>
        <Col sm={3}>
          <Button type="button" variant="outline-success" onClick={addRecord} size="sm">
            Add Another Image <i className="bi bi-plus" />
          </Button>
        </Col>
        <Col>
          <Button type="button" variant="success" onClick={saveRecords} size="sm">
            Save Images
          </Button>
        </Col>
      </Row>
    </Form>
  );
};

export default AddImages;
