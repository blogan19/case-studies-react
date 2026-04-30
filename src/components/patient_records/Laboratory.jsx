import React, { useEffect, useMemo, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Table from 'react-bootstrap/Table';
import Icon from './Patient_record_icon';
import BiochemistryTable from './patient_records_tables/biochemistry_table';
import MicrobiologyTable from './patient_records_tables/MicrobiologyTable';
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const groupData = (results = {}) => {
  const groupedResults = new Map();

  Object.keys(results).forEach((key) => {
    const result = results[key];
    const groupKey = result.category;
    const existing = groupedResults.get(groupKey) || [];
    groupedResults.set(groupKey, [...existing, result]);
  });

  return groupedResults;
};

const defaultBiochemistryTemplate = {
  sodium: { name: 'Sodium', category: 'UE', range: '135-145', unit: 'mmol/L', results: [] },
  potassium: { name: 'Potassium', category: 'UE', range: '3.5-5.0', unit: 'mmol/L', results: [] },
  creatinine: { name: 'Creatinine', category: 'UE', range: '80-120', unit: 'umol/L', results: [] },
  crp: { name: 'CRP', category: 'Inflammation', range: '<5', unit: 'mg/L', results: [] },
  inr: { name: 'INR', category: 'Coagulation', range: '2.0-3.0', unit: '', results: [] },
};

const Laboratory = ({ biochemistry = {}, microbiology = [], onSaveBiochemistry }) => {
  const [show, setShow] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [selectedTrend, setSelectedTrend] = useState(null);
  const [draftBiochemistry, setDraftBiochemistry] = useState(defaultBiochemistryTemplate);
  const groupedResults = useMemo(() => groupData(biochemistry), [biochemistry]);
  const groupKeys = Array.from(groupedResults.keys());
  const hasResults = Object.keys(biochemistry).length > 0 || microbiology.length > 0;
  const trendChartData = useMemo(() => {
    if (!selectedTrend) {
      return null;
    }

    return {
      labels: (selectedTrend.results || []).map((item) => item.datetime),
      datasets: [
        {
          label: `${selectedTrend.name} (${selectedTrend.unit})`,
          data: (selectedTrend.results || []).map((item) => Number(item.result)),
          borderColor: 'rgb(33, 150, 243)',
          backgroundColor: 'rgba(33, 150, 243, 0.2)',
          tension: 0.25,
        },
      ],
    };
  }, [selectedTrend]);

  useEffect(() => {
    const nextDraft = { ...defaultBiochemistryTemplate };
    Object.entries(biochemistry || {}).forEach(([key, value]) => {
      nextDraft[key] = {
        ...value,
        results: Array.isArray(value?.results) ? value.results : [],
      };
    });
    setDraftBiochemistry(nextDraft);
  }, [biochemistry]);

  const updateResult = (testKey, index, field, value) => {
    setDraftBiochemistry((current) => ({
      ...current,
      [testKey]: {
        ...current[testKey],
        results: (current[testKey]?.results || []).map((item, itemIndex) => (
          itemIndex === index
            ? { ...item, [field]: value }
            : item
        )),
      },
    }));
  };

  const addResult = (testKey) => {
    setDraftBiochemistry((current) => ({
      ...current,
      [testKey]: {
        ...current[testKey],
        results: [
          ...(current[testKey]?.results || []),
          { datetime: new Date().toLocaleString('en-GB'), result: '' },
        ],
      },
    }));
  };

  const removeResult = (testKey, index) => {
    setDraftBiochemistry((current) => ({
      ...current,
      [testKey]: {
        ...current[testKey],
        results: (current[testKey]?.results || []).filter((_item, itemIndex) => itemIndex !== index),
      },
    }));
  };

  const saveResults = async () => {
    const cleaned = Object.fromEntries(
      Object.entries(draftBiochemistry).map(([key, value]) => [
        key,
        {
          ...value,
          results: (value?.results || []).filter((item) => String(item?.datetime || '').trim() && String(item?.result || '').trim()),
        },
      ]).filter(([_key, value]) => value.results.length > 0)
    );
    await onSaveBiochemistry?.(cleaned);
    setShowEditor(false);
  };

  return (
    <>
      <td onClick={() => setShow(true)}>
        <Icon logo="bi bi-droplet-fill" title_text="Results" />
      </td>
      <Offcanvas show={show} onHide={() => setShow(false)} style={{ width: '90%' }}>
        <Offcanvas.Header closeButton className="blue-back text-white">
          <Offcanvas.Title>Results</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {onSaveBiochemistry ? (
            <div className="d-flex justify-content-end mb-3">
              <Button type="button" onClick={() => setShowEditor(true)}>Edit blood results</Button>
            </div>
          ) : null}
          {hasResults ? (
            <>
              {microbiology.length > 0 ? <MicrobiologyTable results={microbiology} /> : null}
              {groupKeys.map((group) => (
                <BiochemistryTable
                  key={group}
                  data={groupedResults.get(group)}
                  onOpenTrend={setSelectedTrend}
                />
              ))}
            </>
          ) : (
            <Container>
              <Table className="tbl-notes container-shadow">
                <thead>
                  <tr className="blue-back text-white">
                    <th colSpan={3}>Results</th>
                  </tr>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={3} className="text-center text-muted">No results recorded yet.</td>
                  </tr>
                </tbody>
              </Table>
            </Container>
          )}
        </Offcanvas.Body>
      </Offcanvas>
      <Modal show={showEditor} onHide={() => setShowEditor(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>Edit blood results</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {Object.entries(draftBiochemistry).map(([key, value]) => (
            <div key={key} className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div className="fw-semibold">{value.name} ({value.range}) {value.unit}</div>
                <Button type="button" size="sm" onClick={() => addResult(key)}>Add value</Button>
              </div>
              <Table responsive bordered size="sm">
                <thead>
                  <tr>
                    <th>Date / time</th>
                    <th>Result</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(value.results || []).length ? (
                    value.results.map((result, index) => (
                      <tr key={`${key}-${index}`}>
                        <td>
                          <Form.Control
                            value={result.datetime}
                            onChange={(event) => updateResult(key, index, 'datetime', event.target.value)}
                          />
                        </td>
                        <td>
                          <Form.Control
                            value={result.result}
                            onChange={(event) => updateResult(key, index, 'result', event.target.value)}
                          />
                        </td>
                        <td className="text-end">
                          <Button type="button" size="sm" variant="danger" onClick={() => removeResult(key, index)}>Remove</Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="text-center text-muted">No values yet.</td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          ))}
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={() => setShowEditor(false)}>Cancel</Button>
          <Button type="button" onClick={saveResults}>Save blood results</Button>
        </Modal.Footer>
      </Modal>
      <Modal show={Boolean(selectedTrend)} onHide={() => setSelectedTrend(null)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{selectedTrend?.name || 'Blood result'} trend</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTrend && trendChartData ? (
            <Container>
              <div className="laboratory-trend-chart">
                <Line
                  data={trendChartData}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { display: false },
                    },
                    scales: {
                      y: {
                        title: {
                          display: true,
                          text: selectedTrend.unit || 'Value',
                        },
                      },
                    },
                  }}
                />
              </div>
            </Container>
          ) : null}
        </Modal.Body>
      </Modal>
    </>
  );
};

export default Laboratory;
