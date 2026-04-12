import React, { useEffect, useState } from 'react';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Form from 'react-bootstrap/Form';
import Table from 'react-bootstrap/Table';

const emptyRecord = {
  datetime: '',
  time: '',
  systolic: '',
  diastolic: '',
  heart_rate: '',
  temperature: '',
  resp_rate: '',
  oxygen: '',
};

const AddObservations = ({ closeModal, setObservations, previousResult }) => {
  const [recordState, setRecordState] = useState([{ ...emptyRecord }]);

  useEffect(() => {
    if (!previousResult || typeof previousResult !== 'object' || Array.isArray(previousResult)) {
      return;
    }

    const bloodPressure = previousResult.blood_pressure || [];
    if (!bloodPressure.length) {
      return;
    }

    const mapped = bloodPressure.map((item, index) => {
      const [datePart = '', timePart = ''] = (item.datetime || '').split(' ');
      return {
        datetime: datePart,
        time: timePart,
        systolic: item.systolic ?? '',
        diastolic: item.diastolic ?? '',
        heart_rate: previousResult.heart_rate?.[index]?.rate ?? '',
        temperature: previousResult.temperature?.[index]?.temperature ?? '',
        resp_rate: previousResult.resp_rate?.[index]?.bpm ?? '',
        oxygen: previousResult.oxygen?.[index]?.percentage ?? '',
      };
    });

    setRecordState(mapped);
  }, [previousResult]);

  const updateRecord = (index, name, value) => {
    setRecordState((current) => current.map((record, recordIndex) => (recordIndex === index ? { ...record, [name]: value } : record)));
  };

  const addRecord = () => {
    setRecordState((current) => [...current, { ...emptyRecord }]);
  };

  const copyPreviousRecord = () => {
    const previousRecord = recordState[recordState.length - 1] || emptyRecord;
    setRecordState((current) => [...current, { ...previousRecord }]);
  };

  const removeRecord = (index) => {
    setRecordState((current) => (current.length === 1 ? [{ ...emptyRecord }] : current.filter((_item, recordIndex) => recordIndex !== index)));
  };

  const saveRecord = () => {
    const obsData = {
      blood_pressure: [],
      heart_rate: [],
      temperature: [],
      resp_rate: [],
      oxygen: [],
    };

    recordState.forEach((record) => {
      const timestamp = `${record.datetime} ${record.time}`.trim();
      obsData.blood_pressure.push({ datetime: timestamp, systolic: record.systolic, diastolic: record.diastolic });
      obsData.heart_rate.push({ datetime: timestamp, rate: record.heart_rate });
      obsData.temperature.push({ datetime: timestamp, temperature: record.temperature });
      obsData.resp_rate.push({ datetime: timestamp, bpm: record.resp_rate });
      obsData.oxygen.push({ datetime: timestamp, percentage: record.oxygen });
    });

    setObservations(obsData);
    closeModal();
  };

  return (
    <Form>
      <Table>
        <thead>
          <tr>
            <th>Result Date</th>
            <th>Time</th>
            <th>Systolic</th>
            <th>Diastolic</th>
            <th>Heart Rate</th>
            <th>Temperature</th>
            <th>Respiratory Rate</th>
            <th>Oxygen Sats</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {recordState.map((record, index) => (
            <tr key={`obs-${index}`}>
              <td><Form.Control type="date" value={record.datetime} onChange={(event) => updateRecord(index, 'datetime', event.target.value)} /></td>
              <td><Form.Control type="time" value={record.time} onChange={(event) => updateRecord(index, 'time', event.target.value)} /></td>
              <td><Form.Control type="text" placeholder="mmHg" value={record.systolic} onChange={(event) => updateRecord(index, 'systolic', event.target.value)} /></td>
              <td><Form.Control type="text" placeholder="mmHg" value={record.diastolic} onChange={(event) => updateRecord(index, 'diastolic', event.target.value)} /></td>
              <td><Form.Control type="text" placeholder="BPM" value={record.heart_rate} onChange={(event) => updateRecord(index, 'heart_rate', event.target.value)} /></td>
              <td><Form.Control type="text" placeholder="C" value={record.temperature} onChange={(event) => updateRecord(index, 'temperature', event.target.value)} /></td>
              <td><Form.Control type="text" placeholder="BPM" value={record.resp_rate} onChange={(event) => updateRecord(index, 'resp_rate', event.target.value)} /></td>
              <td><Form.Control type="text" placeholder="%" value={record.oxygen} onChange={(event) => updateRecord(index, 'oxygen', event.target.value)} /></td>
              <td>
                <ButtonGroup aria-label="edit buttons" className="mt-2">
                  {index === recordState.length - 1 ? (
                    <>
                      <Button type="button" variant="info" onClick={copyPreviousRecord} size="sm"><i className="bi bi-clipboard" /></Button>
                      <Button type="button" variant="success" onClick={addRecord} size="sm"><i className="bi bi-plus" /></Button>
                    </>
                  ) : null}
                  <Button type="button" variant="outline-danger" onClick={() => removeRecord(index)} size="sm"><i className="bi bi-trash3" /></Button>
                </ButtonGroup>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Button type="button" onClick={saveRecord} variant="success">Save</Button>
    </Form>
  );
};

export default AddObservations;
