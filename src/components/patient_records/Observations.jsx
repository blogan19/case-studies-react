import React, { useEffect, useMemo, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Table from 'react-bootstrap/Table';
import Icon from './Patient_record_icon';
import BloodPressure from './observations_charts/Blood_pressure';
import TempHR from './observations_charts/Temp_heartrate';
import RespRate from './observations_charts/resp_rate';
import ObsTable from './observations_charts/Obs_Table';

const defaultObservationShape = {
  blood_pressure: [],
  heart_rate: [],
  temperature: [],
  resp_rate: [],
  oxygen: [],
};

const Observations = ({ observations, onSaveObservations }) => {
  const [show, setShow] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [draftObservations, setDraftObservations] = useState(defaultObservationShape);

  const hasObservations = useMemo(() => {
    if (!observations || typeof observations !== 'object') {
      return false;
    }

    return ['blood_pressure', 'heart_rate', 'oxygen', 'resp_rate', 'temperature'].some(
      (key) => Array.isArray(observations[key]) && observations[key].length > 0
    );
  }, [observations]);

  useEffect(() => {
    setDraftObservations({
      blood_pressure: Array.isArray(observations?.blood_pressure) ? observations.blood_pressure : [],
      heart_rate: Array.isArray(observations?.heart_rate) ? observations.heart_rate : [],
      temperature: Array.isArray(observations?.temperature) ? observations.temperature : [],
      resp_rate: Array.isArray(observations?.resp_rate) ? observations.resp_rate : [],
      oxygen: Array.isArray(observations?.oxygen) ? observations.oxygen : [],
    });
  }, [observations]);

  const updateObservationDateTime = (index, value) => {
    setDraftObservations((current) => ({
      blood_pressure: current.blood_pressure.map((item, itemIndex) => itemIndex === index ? { ...item, datetime: value } : item),
      heart_rate: current.heart_rate.map((item, itemIndex) => itemIndex === index ? { ...item, datetime: value } : item),
      temperature: current.temperature.map((item, itemIndex) => itemIndex === index ? { ...item, datetime: value } : item),
      resp_rate: current.resp_rate.map((item, itemIndex) => itemIndex === index ? { ...item, datetime: value } : item),
      oxygen: current.oxygen.map((item, itemIndex) => itemIndex === index ? { ...item, datetime: value } : item),
    }));
  };

  const updateBloodPressure = (index, field, value) => {
    setDraftObservations((current) => ({
      ...current,
      blood_pressure: current.blood_pressure.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
    }));
  };

  const updateObservationSeriesValue = (seriesKey, valueKey, index, value) => {
    setDraftObservations((current) => ({
      ...current,
      [seriesKey]: current[seriesKey].map((item, itemIndex) => itemIndex === index ? { ...item, [valueKey]: value } : item),
    }));
  };

  const addObservationRow = () => {
    const datetime = new Date().toLocaleString('en-GB');
    setDraftObservations((current) => ({
      blood_pressure: [...current.blood_pressure, { datetime, systolic: '', diastolic: '' }],
      heart_rate: [...current.heart_rate, { datetime, rate: '' }],
      temperature: [...current.temperature, { datetime, temperature: '' }],
      resp_rate: [...current.resp_rate, { datetime, bpm: '' }],
      oxygen: [...current.oxygen, { datetime, percentage: '', device: 'Air' }],
    }));
  };

  const removeObservationRow = (index) => {
    setDraftObservations((current) => ({
      blood_pressure: current.blood_pressure.filter((_item, itemIndex) => itemIndex !== index),
      heart_rate: current.heart_rate.filter((_item, itemIndex) => itemIndex !== index),
      temperature: current.temperature.filter((_item, itemIndex) => itemIndex !== index),
      resp_rate: current.resp_rate.filter((_item, itemIndex) => itemIndex !== index),
      oxygen: current.oxygen.filter((_item, itemIndex) => itemIndex !== index),
    }));
  };

  const saveObservationSet = async () => {
    const cleanedRows = draftObservations.blood_pressure
      .map((bp, index) => ({
        datetime: String(bp?.datetime || '').trim(),
        systolic: bp?.systolic,
        diastolic: bp?.diastolic,
        heartRate: draftObservations.heart_rate[index]?.rate,
        temperature: draftObservations.temperature[index]?.temperature,
        respRate: draftObservations.resp_rate[index]?.bpm,
        oxygen: draftObservations.oxygen[index]?.percentage,
        device: draftObservations.oxygen[index]?.device || 'Air',
      }))
      .filter((item) => item.datetime);

    await onSaveObservations?.({
      blood_pressure: cleanedRows.map((item) => ({ datetime: item.datetime, systolic: item.systolic, diastolic: item.diastolic })),
      heart_rate: cleanedRows.map((item) => ({ datetime: item.datetime, rate: item.heartRate })),
      temperature: cleanedRows.map((item) => ({ datetime: item.datetime, temperature: item.temperature })),
      resp_rate: cleanedRows.map((item) => ({ datetime: item.datetime, bpm: item.respRate })),
      oxygen: cleanedRows.map((item) => ({ datetime: item.datetime, percentage: item.oxygen, device: item.device })),
    });
    setShowEditor(false);
  };

  return (
    <>
      <td onClick={() => setShow(true)}>
        <Icon logo="bi bi-heart-pulse" title_text="Observations" />
      </td>

      <Offcanvas show={show} onHide={() => setShow(false)} style={{ width: '90%' }}>
        <Offcanvas.Header closeButton className="blue-back text-white">
          <Offcanvas.Title>Observations</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {onSaveObservations ? (
            <div className="d-flex justify-content-end mb-3">
              <Button type="button" onClick={() => setShowEditor(true)}>Edit observations</Button>
            </div>
          ) : null}
          {hasObservations ? (
            <>
              <Container>
                <ObsTable data={{ observations }} />
              </Container>
              <BloodPressure data={{ observations }} />
              <TempHR data={{ observations }} />
              <RespRate data={{ observations }} />
            </>
          ) : (
            <Container>
              <Table className="tbl-notes container-shadow">
                <thead>
                  <tr className="blue-back text-white">
                    <th colSpan={6}>Observations</th>
                  </tr>
                  <tr>
                    <th>Date Recorded</th>
                    <th>Blood Pressure</th>
                    <th>Heart Rate</th>
                    <th>Temperature</th>
                    <th>Respiratory Rate</th>
                    <th>Oxygen Sats</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={6} className="text-center text-muted">No observations recorded yet.</td>
                  </tr>
                </tbody>
              </Table>
            </Container>
          )}
        </Offcanvas.Body>
      </Offcanvas>
      <Modal show={showEditor} onHide={() => setShowEditor(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>Edit observations</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex justify-content-end mb-3">
            <Button type="button" size="sm" onClick={addObservationRow}>Add timepoint</Button>
          </div>
          <Table responsive bordered size="sm">
            <thead>
              <tr>
                <th>Date / time</th>
                <th>BP systolic</th>
                <th>BP diastolic</th>
                <th>Heart rate</th>
                <th>Temperature</th>
                <th>Resp rate</th>
                <th>Oxygen sats</th>
                <th>Oxygen device</th>
                <th className="text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {draftObservations.blood_pressure.length ? (
                draftObservations.blood_pressure.map((bp, index) => (
                  <tr key={`observation-row-${index}`}>
                    <td>
                      <Form.Control value={bp.datetime} onChange={(event) => updateObservationDateTime(index, event.target.value)} />
                    </td>
                    <td>
                      <Form.Control value={bp.systolic} onChange={(event) => updateBloodPressure(index, 'systolic', event.target.value)} />
                    </td>
                    <td>
                      <Form.Control value={bp.diastolic} onChange={(event) => updateBloodPressure(index, 'diastolic', event.target.value)} />
                    </td>
                    <td>
                      <Form.Control value={draftObservations.heart_rate[index]?.rate || ''} onChange={(event) => updateObservationSeriesValue('heart_rate', 'rate', index, event.target.value)} />
                    </td>
                    <td>
                      <Form.Control value={draftObservations.temperature[index]?.temperature || ''} onChange={(event) => updateObservationSeriesValue('temperature', 'temperature', index, event.target.value)} />
                    </td>
                    <td>
                      <Form.Control value={draftObservations.resp_rate[index]?.bpm || ''} onChange={(event) => updateObservationSeriesValue('resp_rate', 'bpm', index, event.target.value)} />
                    </td>
                    <td>
                      <Form.Control value={draftObservations.oxygen[index]?.percentage || ''} onChange={(event) => updateObservationSeriesValue('oxygen', 'percentage', index, event.target.value)} />
                    </td>
                    <td>
                      <Form.Control value={draftObservations.oxygen[index]?.device || ''} onChange={(event) => updateObservationSeriesValue('oxygen', 'device', index, event.target.value)} />
                    </td>
                    <td className="text-end">
                      <Button type="button" size="sm" variant="danger" onClick={() => removeObservationRow(index)}>Remove</Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="text-center text-muted">No observation timepoints yet.</td>
                </tr>
              )}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={() => setShowEditor(false)}>Cancel</Button>
          <Button type="button" onClick={saveObservationSet}>Save observations</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default Observations;
