import React, { useMemo, useState } from 'react';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Table from 'react-bootstrap/Table';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import Allergies from './allergies';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const normalizeMedRecStatus = (medicationHistory = {}) => {
  const nextStatus = String(medicationHistory?.reconciliationStatus || 'Not started').trim() || 'Not started';
  return ['Not started', 'In progress', 'Complete'].includes(nextStatus) ? nextStatus : 'Not started';
};

const medRecBadgeClass = (status) => {
  if (status === 'Complete') {
    return 'epma-med-rec-badge epma-med-rec-badge--complete';
  }
  if (status === 'In progress') {
    return 'epma-med-rec-badge epma-med-rec-badge--in-progress';
  }
  return 'epma-med-rec-badge epma-med-rec-badge--not-started';
};

const normalizeVteStatus = (vteAssessment = {}) => {
  const nextStatus = String(vteAssessment?.status || 'Not done').trim() || 'Not done';
  return nextStatus === 'Complete' ? 'Complete' : 'Not done';
};

const PatientDetails = ({ patient, allergies, allergyHistory, medicationHistory = {}, vteAssessment = {}, onOpenAllergyManagement, onOpenMedicationHistory, onOpenVteAssessment, onSaveMeasurements, onDeleteMeasurement }) => {
 const [day, month, year] = patient.dob.split("/");
  const birthdate = new Date(year, month - 1, day);
  const currentDate = new Date();
  const diff = currentDate - birthdate;
  const age = Math.floor(diff / 31557600000);
  
  const [showMeasurementsModal, setShowMeasurementsModal] = useState(false);
  const [draftWeight, setDraftWeight] = useState('');
  const [draftHeight, setDraftHeight] = useState('');
  const [measurementError, setMeasurementError] = useState('');
  const [savingMeasurements, setSavingMeasurements] = useState(false);
  const [deletingMeasurementId, setDeletingMeasurementId] = useState('');

  const sanitizeNumericInput = (value) => {
    let nextValue = String(value || '').replace(/[^0-9.]/g, '');
    const firstDecimalIndex = nextValue.indexOf('.');
    if (firstDecimalIndex !== -1) {
      nextValue =
        nextValue.slice(0, firstDecimalIndex + 1) +
        nextValue.slice(firstDecimalIndex + 1).replace(/\./g, '');
    }
    return nextValue;
  };

  const formatMeasurementValue = (value, unit) => {
    if (!value) {
      return '-';
    }
    return `${value} ${unit}`;
  };

  const formatRecordedDate = (value) => (value ? new Date(value).toLocaleDateString('en-GB') : '');

  const formatMeasurement = (value, recordedAt) => {
    if (!value) {
      return 'Not recorded';
    }

    const recordedDate = formatRecordedDate(recordedAt);
    return recordedDate ? `${value} (${recordedDate})` : value;
  };

  const admitSummary = [formatRecordedDate(patient.admittedAt) || 'Not recorded'].filter(Boolean).join(' | ');
  const measurementHistory = useMemo(
    () => (Array.isArray(patient.measurementHistory) ? patient.measurementHistory : []),
    [patient.measurementHistory]
  );
  const medRecStatus = useMemo(() => normalizeMedRecStatus(medicationHistory), [medicationHistory]);
  const vteStatus = useMemo(() => normalizeVteStatus(vteAssessment), [vteAssessment]);

  const weightTrend = useMemo(
    () =>
      [...measurementHistory]
        .filter((entry) => Number.isFinite(Number.parseFloat(entry.weight)))
        .reverse(),
    [measurementHistory]
  );

  const weightChartData = {
    labels: weightTrend.map((entry) => new Date(entry.recordedAt).toLocaleDateString('en-GB')),
    datasets: [
      {
        label: 'Weight (kg)',
        data: weightTrend.map((entry) => Number.parseFloat(entry.weight)),
        borderColor: 'rgb(44, 92, 135)',
        backgroundColor: 'rgba(44, 92, 135, 0.22)',
        tension: 0.25,
      },
    ],
  };

  const weightChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        title: {
          display: true,
          text: 'Weight (kg)',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Recorded date',
        },
      },
    },
  };

  const openMeasurementsModal = () => {
    setDraftWeight('');
    setDraftHeight('');
    setMeasurementError('');
    setShowMeasurementsModal(true);
  };

  const handleSaveMeasurements = async (event) => {
    event.preventDefault();

    if (!draftWeight.trim() && !draftHeight.trim()) {
      setMeasurementError('Enter a weight or height before saving.');
      return;
    }

    if (!onSaveMeasurements) {
      setMeasurementError('Measurements cannot be edited for this patient right now.');
      return;
    }

    setSavingMeasurements(true);
    setMeasurementError('');

    try {
      await onSaveMeasurements({
        weight: draftWeight.trim(),
        height: draftHeight.trim(),
      });
      setDraftWeight('');
      setDraftHeight('');
      setMeasurementError('');
    } catch (error) {
      setMeasurementError(error.message || 'Unable to save the measurement.');
    } finally {
      setSavingMeasurements(false);
    }
  };

  const handleDeleteMeasurement = async (measurementId) => {
    if (!measurementId || !onDeleteMeasurement) {
      return;
    }

    setDeletingMeasurementId(measurementId);
    setMeasurementError('');

    try {
      await onDeleteMeasurement(measurementId);
    } catch (error) {
      setMeasurementError(error.message || 'Unable to delete the measurement.');
    } finally {
      setDeletingMeasurementId('');
    }
  };

  return (
    <>
      <div className="mt-3">
        <Table bordered className="container-shadow epma-summary-table mb-0">
          <thead>
            <tr>
              <th colSpan={4} className="epma-section-banner blue-back text-white">
                Patient Details
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <i className="text-muted">Name </i>
                {patient.name}
              </td>
              <td>
                <i className="text-muted">Hospital No</i>{' '}
                {patient.hospitalNo}
              </td>
              <td>
                <i className="text-muted">DoB </i>
                {patient.dob} ({age} years)
              </td>
              <td>
                <i className="text-muted">Admit date </i>
                {admitSummary}
              </td>
            </tr>
            <tr>
              <td>
                <button type="button" className="epma-measurement-trigger" onClick={openMeasurementsModal}>
                  <i className="text-muted">Weight </i>
                  {formatMeasurement(patient.weight, patient.weightRecordedAt)}
                </button>
              </td>
              <td>
                <button type="button" className="epma-measurement-trigger" onClick={openMeasurementsModal}>
                  <i className="text-muted">Height </i>
                  {formatMeasurement(patient.height, patient.heightRecordedAt)}
                </button>
              </td>
              <td>
                <i className="text-muted">Gender </i>
                {patient.gender}
              </td>
              <td>
                <i className="text-muted">Ward </i>
                {patient.wardName || 'Not recorded'}
                {patient.stayType ? <span className="text-muted"> ({patient.stayType})</span> : null}
              </td>
            </tr>
            <tr>
              <td colSpan={4}>
                <i className="text-muted">Address </i>
                {patient.address}
              </td>
            </tr>
            <tr>
              <td colSpan={4}>
                  <div className="epma-summary-statuses">
                    <div className="epma-med-rec-row">
                     <span className="text-muted">Med rec status </span>
                     {onOpenMedicationHistory ? (
                       <button type="button" className="epma-status-badge-button" onClick={onOpenMedicationHistory}>
                         <Badge bg={null} className={medRecBadgeClass(medRecStatus)}>
                            {medRecStatus}
                          </Badge>
                        </button>
                      ) : (
                       <Badge bg={null} className={medRecBadgeClass(medRecStatus)}>
                         {medRecStatus}
                       </Badge>
                     )}
                    </div>
                  <div className="epma-med-rec-row">
                    <span className="text-muted">VTE assessment </span>
                    {onOpenVteAssessment ? (
                      <button type="button" className="epma-status-badge-button" onClick={onOpenVteAssessment}>
                        <Badge bg={null} className={medRecBadgeClass(vteStatus)}>
                          {vteStatus}
                        </Badge>
                      </button>
                    ) : (
                      <Badge bg={null} className={medRecBadgeClass(vteStatus)}>
                        {vteStatus}
                      </Badge>
                    )}
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </Table>
      </div>
      <Allergies
        allergyList={allergies}
        allergyHistory={allergyHistory}
        admittedAt={patient.admittedAt}
        onOpenManagement={onOpenAllergyManagement}
      />
      <Modal show={showMeasurementsModal} onHide={() => setShowMeasurementsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Weight and height history</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {onSaveMeasurements ? (
            <Card className="container-shadow mb-4">
              <Card.Body>
                <Form onSubmit={handleSaveMeasurements}>
                  <div className="epma-measurements-form">
                    <Form.Group controlId="measurementWeight">
                      <Form.Label>New weight (kg)</Form.Label>
                      <Form.Control
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        name="measurement-weight"
                        value={draftWeight}
                        onChange={(event) => setDraftWeight(sanitizeNumericInput(event.target.value))}
                        placeholder="e.g. 72"
                      />
                    </Form.Group>
                    <Form.Group controlId="measurementHeight">
                      <Form.Label>New height (cm)</Form.Label>
                      <Form.Control
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        name="measurement-height"
                        value={draftHeight}
                        onChange={(event) => setDraftHeight(sanitizeNumericInput(event.target.value))}
                        placeholder="e.g. 168"
                      />
                    </Form.Group>
                    <div className="epma-measurements-form__actions">
                      <Button type="submit" disabled={savingMeasurements}>
                        {savingMeasurements ? 'Saving...' : 'Save measurement'}
                      </Button>
                    </div>
                  </div>
                  {measurementError ? <div className="epma-measurements-error mt-2">{measurementError}</div> : null}
                </Form>
              </Card.Body>
            </Card>
          ) : null}
          <Card className="container-shadow mb-4">
            <Card.Body>
              <h5 className="mb-3">Weight trend</h5>
              {weightTrend.length ? (
                <div className="epma-measurements-chart">
                  <Line options={weightChartOptions} data={weightChartData} />
                </div>
              ) : (
                <p className="text-muted mb-0">No recorded weights yet.</p>
              )}
            </Card.Body>
          </Card>
          <Card className="container-shadow">
            <Card.Body>
              <h5 className="mb-3">Measurement history</h5>
              <Table responsive hover className="mb-0">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Weight (kg)</th>
                    <th>Height (cm)</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {measurementHistory.length ? (
                    measurementHistory.map((entry) => (
                      <tr key={entry.id}>
                        <td>{new Date(entry.recordedAt).toLocaleString('en-GB')}</td>
                        <td>{formatMeasurementValue(entry.weight, 'kg')}</td>
                        <td>{formatMeasurementValue(entry.height, 'cm')}</td>
                        <td className="text-end">
                          {onDeleteMeasurement ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline-danger"
                              disabled={deletingMeasurementId === entry.id}
                              onClick={() => handleDeleteMeasurement(entry.id)}
                            >
                              {deletingMeasurementId === entry.id ? 'Deleting...' : 'Delete'}
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-center text-muted">No measurements recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default PatientDetails;
