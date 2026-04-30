import React, { useMemo, useRef, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import ListGroup from 'react-bootstrap/ListGroup';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import Table from 'react-bootstrap/Table';

const emptyAllergyDraft = { drug: '', reaction: '' };

const formatAllergyHistoryAction = (action, targetDrug) => {
  const value = String(action || '').trim().toLowerCase();
  const suffix = targetDrug ? ` - ${targetDrug}` : '';

  if (value === 'marked-nkda') {
    return 'NKDA recorded';
  }
  if (value === 'cleared-nkda') {
    return 'NKDA removed';
  }
  if (value === 'added') {
    return `Added${suffix}`;
  }
  if (value === 'edited') {
    return `Edited${suffix}`;
  }
  if (value === 'removed') {
    return `Removed${suffix}`;
  }
  if (value === 'reviewed') {
    return 'Review confirmed';
  }
  return action || 'Updated';
};

const buildHistoryEntry = ({ action, reason, targetDrug = '', targetReaction = '', actor = 'Student' }) => ({
  timestamp: new Date().toISOString(),
  action,
  reason,
  targetDrug,
  targetReaction,
  actor,
});

const AllergyManagementModal = ({
  show,
  onHide,
  patient = {},
  allergies = [],
  allergyHistory = [],
  drugLibrary,
  actor = 'Student',
  onChange,
}) => {
  const allergyReactionRef = useRef(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [allergyDraft, setAllergyDraft] = useState(emptyAllergyDraft);
  const [allergyReason, setAllergyReason] = useState('');
  const [editingAllergyIndex, setEditingAllergyIndex] = useState(null);
  const [allergyDrugLocked, setAllergyDrugLocked] = useState(false);
  const [allergyFormError, setAllergyFormError] = useState('');
  const [removeReason, setRemoveReason] = useState('');
  const [removingAllergyIndex, setRemovingAllergyIndex] = useState(null);

  const reactionOptions = drugLibrary?.metadata?.reactionOptions || [];
  const normalizedReactionOptions = reactionOptions
    .map((item) => (typeof item === 'string' ? { id: item, label: item } : item))
    .filter((item) => item?.label);
  const drugOptions = useMemo(
    () => Array.from(
      new Set(
        (drugLibrary?.items || [])
          .map((item) => String(item.drugName || item.drug_name || item.name || '').trim())
          .filter(Boolean)
      )
    ).sort((left, right) => left.localeCompare(right, 'en-GB', { sensitivity: 'base' })),
    [drugLibrary]
  );
  const filteredDrugOptions = useMemo(() => {
    const searchTerm = String(allergyDraft.drug || '').trim().toLowerCase();
    if (searchTerm.length < 3) {
      return [];
    }

    return drugOptions
      .filter((drugName) => drugName.toLowerCase().includes(searchTerm))
      .slice(0, 8);
  }, [allergyDraft.drug, drugOptions]);

  const patientAllergies = Array.isArray(allergies) ? allergies : [];
  const patientHistory = Array.isArray(allergyHistory) ? allergyHistory : [];

  const resetAllergyEditor = () => {
    setAllergyDraft(emptyAllergyDraft);
    setAllergyReason('');
    setEditingAllergyIndex(null);
    setAllergyDrugLocked(false);
    setAllergyFormError('');
  };

  const applyAllergyState = ({ nextPatient, nextAllergies, historyEntry }) => {
    if (!onChange) {
      return;
    }

    onChange({
      patient: nextPatient,
      allergies: nextAllergies,
      allergyHistory: historyEntry ? [...patientHistory, historyEntry] : patientHistory,
    });
  };

  const handleToggleNkda = (enabled) => {
    const nextPatient = { ...patient, nkda: enabled };
    applyAllergyState({
      nextPatient,
      nextAllergies: enabled ? [] : patientAllergies,
      historyEntry: buildHistoryEntry({
        action: enabled ? 'marked-nkda' : 'cleared-nkda',
        reason: enabled ? 'Marked as no known drug allergies' : 'Removed no known drug allergies status',
        actor,
      }),
    });
  };

  const handleConfirmAllergyReview = () => {
    applyAllergyState({
      nextPatient: { ...patient },
      nextAllergies: patientAllergies,
      historyEntry: buildHistoryEntry({
        action: 'reviewed',
        reason: 'Allergy review confirmed',
        actor,
      }),
    });
  };

  const handleSaveAllergy = () => {
    if (!allergyDraft.drug || !allergyDraft.reaction) {
      return;
    }

    const normalizedDrug = String(allergyDraft.drug || '').trim().toLowerCase();
    const duplicateExists = patientAllergies.some((allergy, index) => {
      if (editingAllergyIndex !== null && index === editingAllergyIndex) {
        return false;
      }
      return String(allergy?.drug || '').trim().toLowerCase() === normalizedDrug;
    });

    if (duplicateExists) {
      setAllergyFormError('This drug is already recorded in the allergy list.');
      return;
    }

    const savedAllergy = {
      drug: String(allergyDraft.drug || '').trim(),
      reaction: String(allergyDraft.reaction || '').trim(),
    };
    const nextAllergies = patientAllergies.slice();
    if (editingAllergyIndex !== null) {
      nextAllergies[editingAllergyIndex] = savedAllergy;
    } else {
      nextAllergies.push(savedAllergy);
    }

    applyAllergyState({
      nextPatient: { ...patient, nkda: false },
      nextAllergies,
      historyEntry: buildHistoryEntry({
        action: editingAllergyIndex !== null ? 'edited' : 'added',
        reason: allergyReason,
        targetDrug: savedAllergy.drug,
        targetReaction: savedAllergy.reaction,
        actor,
      }),
    });
    resetAllergyEditor();
  };

  const openEditAllergy = (index) => {
    setAllergyDraft(patientAllergies[index] || emptyAllergyDraft);
    setAllergyReason('');
    setEditingAllergyIndex(index);
    setAllergyDrugLocked(Boolean(patientAllergies[index]?.drug));
    setAllergyFormError('');
  };

  const selectAllergyDrug = (drugName) => {
    setAllergyDraft((current) => ({ ...current, drug: drugName }));
    setAllergyDrugLocked(true);
    window.setTimeout(() => {
      allergyReactionRef.current?.focus();
      allergyReactionRef.current?.click?.();
    }, 0);
  };

  const unlockAllergyDrug = () => {
    setAllergyDraft((current) => ({ ...current, drug: '' }));
    setAllergyDrugLocked(false);
  };

  const openRemoveAllergy = (index) => {
    setRemovingAllergyIndex(index);
    setRemoveReason('');
    setShowRemoveModal(true);
  };

  const handleRemoveAllergy = () => {
    if (removingAllergyIndex === null || !removeReason.trim()) {
      return;
    }

    const removedAllergy = patientAllergies[removingAllergyIndex];
    applyAllergyState({
      nextPatient: { ...patient, nkda: false },
      nextAllergies: patientAllergies.filter((_item, itemIndex) => itemIndex !== removingAllergyIndex),
      historyEntry: buildHistoryEntry({
        action: 'removed',
        reason: removeReason,
        targetDrug: removedAllergy?.drug || '',
        targetReaction: removedAllergy?.reaction || '',
        actor,
      }),
    });
    setShowRemoveModal(false);
    setRemovingAllergyIndex(null);
    setRemoveReason('');
  };

  const closeAllergyManagementModal = () => {
    resetAllergyEditor();
    onHide?.();
  };

  return (
    <>
      <Modal show={show} onHide={closeAllergyManagementModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Allergies
            {patient?.name || patient?.fullName ? <div className="small text-muted fw-normal mt-1">{patient.name || patient.fullName}</div> : null}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-3">
            <div className="d-flex gap-2 flex-wrap">
              <Button type="button" variant="outline-secondary" onClick={() => setShowHistoryModal(true)}>Allergy History</Button>
            </div>
          </div>

          <div className="epma-allergy-editor border rounded px-3 py-3 mt-2">
            <div>
              <Button type="button" variant={patient?.nkda ? 'danger' : 'outline-danger'} onClick={() => handleToggleNkda(!patient?.nkda)}>
                {patient?.nkda ? 'No known Drug Allergies' : 'Record As No known Drug Allergies'}
              </Button>
            </div>
            <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-3 mt-3">
              <div>
                <h4 className="mb-1">{editingAllergyIndex !== null ? 'Edit an allergy' : 'Add an allergy'}</h4>
              </div>
            </div>
            <Row className="g-3">
              <Col md={3}>
                <Form.Group controlId="allergyDrug">
                  <Form.Label>Drug / substance</Form.Label>
                  <Form.Control
                    type="text"
                    value={allergyDraft.drug}
                    readOnly={allergyDrugLocked}
                    onClick={() => {
                      if (allergyDrugLocked) {
                        unlockAllergyDrug();
                      }
                    }}
                    onChange={(event) => {
                      if (!allergyDrugLocked) {
                        setAllergyFormError('');
                        setAllergyDraft((current) => ({ ...current, drug: event.target.value }));
                      }
                    }}
                    placeholder="Start typing a drug name"
                    autoComplete="off"
                  />
                  {!allergyDrugLocked && String(allergyDraft.drug || '').trim().length < 3 ? (
                    <div className="small text-muted mt-2">Type at least 3 characters to search drugs.</div>
                  ) : !allergyDrugLocked && filteredDrugOptions.length ? (
                    <ListGroup className="mt-2 epma-allergy-search-results">
                      {filteredDrugOptions.map((drugName) => (
                        <ListGroup.Item
                          key={drugName}
                          action
                          active={allergyDraft.drug === drugName}
                          onClick={() => selectAllergyDrug(drugName)}
                        >
                          {drugName}
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  ) : !allergyDrugLocked ? (
                    <div className="small text-muted mt-2">No matching drugs found.</div>
                  ) : (
                    <div className="small text-muted mt-2">Click the drug name to change the selected medicine.</div>
                  )}
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group controlId="allergyReaction">
                  <Form.Label>Reaction</Form.Label>
                  <Form.Select
                    ref={allergyReactionRef}
                    value={allergyDraft.reaction}
                    onChange={(event) => {
                      setAllergyFormError('');
                      setAllergyDraft((current) => ({ ...current, reaction: event.target.value }));
                    }}
                  >
                    <option value="">Select reaction</option>
                    {normalizedReactionOptions.map((item) => (
                      <option key={item.id || item.label} value={item.label}>{item.label}{item.blocksPrescribing ? ' (blocks prescribing)' : ''}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group controlId="allergyReason">
                  <Form.Label>Additional Info</Form.Label>
                  <Form.Control
                    as="input"
                    value={allergyReason}
                    onChange={(event) => {
                      setAllergyFormError('');
                      setAllergyReason(event.target.value);
                    }}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group controlId="allergySave">
                  <Form.Label>Save Allergy</Form.Label>
                  <Button type="button" onClick={handleSaveAllergy} disabled={!allergyDraft.drug || !allergyDraft.reaction}>
                    Save allergy
                  </Button>
                </Form.Group>
              </Col>
            </Row>

            <h6 className="mt-4 mb-2">Current allergies</h6>
            {patient?.nkda ? (
              <Alert variant="success" className="mb-0 mt-3">No known drug allergies recorded.</Alert>
            ) : patientAllergies.length ? (
              patientAllergies.map((allergy, index) => (
                <div key={`${allergy.drug}-${allergy.reaction}-${index}`} className="d-flex justify-content-between align-items-center border rounded px-3 py-2 mt-3 gap-3 flex-wrap">
                  <div>
                    <strong>{allergy.drug}</strong>
                    <div className="small text-muted">{allergy.reaction || 'Reaction not recorded'}</div>
                  </div>
                  <div className="d-flex gap-2">
                    <Button type="button" variant="outline-info" size="sm" onClick={() => openEditAllergy(index)}>Edit</Button>
                    <Button type="button" variant="outline-danger" size="sm" onClick={() => openRemoveAllergy(index)}>Remove</Button>
                  </div>
                </div>
              ))
            ) : (
              <Alert variant="light" className="mb-0 mt-3">No allergies recorded</Alert>
            )}

            {allergyFormError ? <Alert variant="danger" className="mt-3 mb-0">{allergyFormError}</Alert> : null}
            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button type="button" variant="secondary" onClick={closeAllergyManagementModal}>
                Close
              </Button>
              <Button type="button" variant="outline-secondary" onClick={handleConfirmAllergyReview}>
                Confirm allergy review
              </Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>

      <Modal show={showRemoveModal} onHide={() => setShowRemoveModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Remove allergy</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group controlId="removeAllergyReason">
            <Form.Label>Reason for removal</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={removeReason}
              onChange={(event) => setRemoveReason(event.target.value)}
              placeholder="Document why this allergy is being removed"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="outline-secondary" onClick={() => setShowRemoveModal(false)}>Cancel</Button>
          <Button type="button" variant="danger" onClick={handleRemoveAllergy} disabled={!removeReason.trim()}>
            Confirm removal
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showHistoryModal} onHide={() => setShowHistoryModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Allergy history</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table responsive bordered size="sm">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Reason</th>
                <th>Username</th>
              </tr>
            </thead>
            <tbody>
              {patientHistory.length ? patientHistory.slice().reverse().map((entry, index) => (
                <tr key={`${entry.timestamp}-${index}`}>
                  <td>{new Date(entry.timestamp).toLocaleString('en-GB')}</td>
                  <td>{formatAllergyHistoryAction(entry.action, entry.targetDrug)}</td>
                  <td>{[entry.targetReaction, entry.reason].filter(Boolean).join(' | ')}</td>
                  <td>{entry.actor || 'Unknown user'}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="text-center text-muted">No allergy history recorded yet.</td>
                </tr>
              )}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default AllergyManagementModal;
