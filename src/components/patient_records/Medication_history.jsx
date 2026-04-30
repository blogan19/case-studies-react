import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import ListGroup from 'react-bootstrap/ListGroup';
import Modal from 'react-bootstrap/Modal';
import Table from 'react-bootstrap/Table';

const emptyEntry = {
  id: '',
  drug: '',
  dose: '',
  unit: '',
  route: '',
  frequency: '',
  form: '',
  status: 'Current',
  notes: '',
};

const createEntryId = () => window.crypto?.randomUUID?.() || `med-history-${Date.now()}`;
const AUTOSAVE_DELAY_MS = 600;
const RECONCILIATION_STATUS_OPTIONS = ['Not started', 'In progress', 'Complete'];

const normalizeReconciliationStatus = (value, fallback = 'Not started') => {
  const normalizedValue = String(value || '').trim().toLowerCase();
  return RECONCILIATION_STATUS_OPTIONS.find((option) => option.toLowerCase() === normalizedValue) || fallback;
};

const getAutosaveMetadataFields = (history = {}) => ({
  usesBlisterPack: history.usesBlisterPack,
  communityPharmacy: String(history.communityPharmacy || '').trim(),
  sourcesUsed: String(history.sourcesUsed?.[0] || '').trim() ? [String(history.sourcesUsed[0] || '').trim()] : [],
  reconciliationStatus: history.reconciliationStatus,
});

const areAutosaveMetadataFieldsEqual = (left = {}, right = {}) => (
  JSON.stringify(getAutosaveMetadataFields(left)) === JSON.stringify(getAutosaveMetadataFields(right))
);

const normalizeMedicationHistory = (medicationHistory = {}) => {
  const normalized = medicationHistory && typeof medicationHistory === 'object' ? medicationHistory : {};
  const blisterPackRawValue = normalized.usesBlisterPack ?? normalized.uses_blister_pack;
  const blisterPackValue = typeof blisterPackRawValue === 'boolean'
    ? (blisterPackRawValue ? 'Yes' : 'No')
    : String(blisterPackRawValue || '').trim();
  const reconciliationStatus = normalizeReconciliationStatus(
    normalized.reconciliationStatus ?? normalized.reconciliation_status ?? normalized.status
  );
  const sourcesUsedValue = normalized.sourcesUsed ?? normalized.sources_used ?? normalized.sourceText;

  return {
    entries: Array.isArray(normalized.entries)
      ? normalized.entries.map((item, index) => ({
          id: String(item?.id || `medication-history-${index}`),
          drug: String(item?.drug || '').trim(),
          dose: String(item?.dose || '').trim(),
          unit: String(item?.unit || '').trim(),
          route: String(item?.route || '').trim(),
          frequency: String(item?.frequency || '').trim(),
          form: String(item?.form || '').trim(),
          status: String(item?.status || 'Current').trim() || 'Current',
          notes: String(item?.notes || '').trim(),
        })).filter((item) => item.drug)
      : [],
    usesBlisterPack: ['Yes', 'No', 'Unknown'].includes(blisterPackValue) ? blisterPackValue : 'Unknown',
    communityPharmacy: String(normalized.communityPharmacy ?? normalized.community_pharmacy ?? '').trim(),
    patientOwnSupply: String(normalized.patientOwnSupply ?? normalized.patient_own_supply ?? '').trim(),
    sourcesUsed: Array.isArray(sourcesUsedValue)
      ? sourcesUsedValue.map((item) => String(item || '').trim()).filter(Boolean)
      : (String(sourcesUsedValue || '').trim()
        ? [String(sourcesUsedValue || '').trim()]
        : []),
    generalNotes: String(normalized.generalNotes ?? normalized.general_notes ?? normalized.details ?? '').trim(),
    completedAt: String(normalized.completedAt ?? normalized.completed_at ?? normalized.date_added ?? '').trim(),
    completedBy: String(normalized.completedBy ?? normalized.completed_by ?? normalized.added_by ?? '').trim(),
    reconciliationStatus,
  };
};

const formatDateTime = (value) => {
  if (!value) {
    return 'Not recorded';
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleString('en-GB');
  }

  return value;
};

  const formatStatusTone = (status) => {
    const value = String(status || '').toLowerCase();
    if (value === 'complete') {
      return 'success';
    }
    if (value === 'in progress') {
      return 'warning';
    }
    return 'secondary';
  };

const formatEntrySummary = (entry) => {
  const details = [
    entry.dose ? `${entry.dose}${entry.unit ? ` ${entry.unit}` : ''}` : '',
    entry.route,
    entry.frequency,
    entry.form,
  ].filter(Boolean);

  return details.length ? details.join(' | ') : 'No structured directions recorded';
};

const formatHistoryValue = (value) => {
  if (!value || typeof value !== 'object') {
    return 'No value recorded';
  }

  const normalized = normalizeMedicationHistory(value);
  const entryCount = normalized.entries.length;
  const firstEntry = normalized.entries[0];
  const summary = firstEntry ? `${firstEntry.drug}${firstEntry.dose ? ` ${firstEntry.dose}${firstEntry.unit ? ` ${firstEntry.unit}` : ''}` : ''}` : 'No medicines';
  const sources = normalized.sourcesUsed.length ? normalized.sourcesUsed.join(', ') : 'No sources';

  return `${entryCount} medicine${entryCount === 1 ? '' : 's'} | ${summary} | ${normalized.usesBlisterPack} blister pack | ${sources}`;
};

const MedicationHistory = ({
  medicationHistory,
  caseNotesHistory = [],
  prescriptions = [],
  drugLibrary,
  disabled = false,
  showHistoryModal = false,
  onOpenHistoryModal,
  onCloseHistoryModal,
  onClosePanel,
  hideInlineHistoryButton = false,
  activeChartTutorialStepKey = '',
  tutorialRefs = {},
  onSaveMedicationHistory,
}) => {
  const [metadataDraft, setMetadataDraft] = useState(() => normalizeMedicationHistory(medicationHistory));
  const [entryDraft, setEntryDraft] = useState(emptyEntry);
  const [entryError, setEntryError] = useState('');
  const [savingMetadata, setSavingMetadata] = useState(false);
  const [savingEntry, setSavingEntry] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [drugSearch, setDrugSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPrescriptionIndex, setSelectedPrescriptionIndex] = useState('');
  const autosaveTimerRef = useRef(null);
  const metadataDraftRef = useRef(metadataDraft);
  const normalizedHistory = useMemo(() => normalizeMedicationHistory(medicationHistory), [medicationHistory]);

  useEffect(() => {
    setMetadataDraft(normalizedHistory);
  }, [normalizedHistory]);

  useEffect(() => {
    metadataDraftRef.current = metadataDraft;
  }, [metadataDraft]);

  useEffect(() => () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
  }, []);

  const medicationHistoryEvents = useMemo(
    () => (Array.isArray(caseNotesHistory) ? caseNotesHistory : []).filter((entry) => entry.fieldKey === 'medicationHistory').slice().reverse(),
    [caseNotesHistory]
  );

  const drugOptions = useMemo(
    () => Array.from(
      new Set(
        (drugLibrary?.items || [])
          .map((item) => ({
            drug: String(item.drugName || '').trim(),
            strength: String(item.strength || '').trim(),
            unit: String(item.unit || '').trim(),
            form: String(item.form || '').trim(),
            route: String(item.defaultRoute || '').trim(),
          }))
          .filter((item) => item.drug)
          .map((item) => JSON.stringify(item))
      )
    ).map((item) => JSON.parse(item)),
    [drugLibrary]
  );

  const drugResults = useMemo(() => {
    const searchTerm = drugSearch.trim().toLowerCase();
    if (searchTerm.length < 3) {
      return [];
    }

    return drugOptions
      .filter((item) => [item.drug, item.strength, item.form].filter(Boolean).join(' ').toLowerCase().includes(searchTerm))
      .slice(0, 8);
  }, [drugOptions, drugSearch]);

  const routeOptions = drugLibrary?.metadata?.routeOptions || [];
  const frequencyOptions = drugLibrary?.metadata?.frequencyOptions || [];
  const inpatientPrescriptionOptions = useMemo(
    () => (Array.isArray(prescriptions) ? prescriptions : [])
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => String(item?.drug || '').trim())
      .map(({ item, index }) => ({
        value: String(index),
        label: [
          item.drug,
          item.dose || '',
          item.route || '',
          item.frequency || '',
        ].filter(Boolean).join(' | '),
        entry: {
          id: createEntryId(),
          drug: String(item.drug || '').trim(),
          dose: String(item.dose || '').replace(String(item.unit || ''), '').trim(),
          unit: String(item.unit || '').trim(),
          route: String(item.route || '').trim(),
          frequency: String(item.frequency || '').trim(),
          form: String(item.form || '').trim(),
          status: String(item.status || '').trim().toLowerCase() === 'stopped' ? 'Stopped' : 'Current',
          notes: item.whenRequired ? 'Added from inpatient PRN prescription.' : 'Added from inpatient prescription.',
        },
      })),
    [prescriptions]
  );

  const persistMedicationHistory = useCallback(async (nextHistory) => {
    if (!onSaveMedicationHistory) {
      return;
    }
    await onSaveMedicationHistory(normalizeMedicationHistory(nextHistory));
  }, [onSaveMedicationHistory]);

  useEffect(() => {
    if (disabled || !onSaveMedicationHistory || areAutosaveMetadataFieldsEqual(metadataDraft, normalizedHistory)) {
      return undefined;
    }

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(async () => {
      const latestMetadataDraft = metadataDraftRef.current;
      setSavingMetadata(true);
      try {
        await persistMedicationHistory({
          ...normalizedHistory,
          ...latestMetadataDraft,
          ...getAutosaveMetadataFields(latestMetadataDraft),
          completedAt: new Date().toISOString(),
        });
      } finally {
        setSavingMetadata(false);
      }
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [
    disabled,
    metadataDraft,
    normalizedHistory,
    onSaveMedicationHistory,
    persistMedicationHistory,
  ]);

  const handleSaveMetadata = async () => {
    setSavingMetadata(true);
    try {
      await persistMedicationHistory({
        ...metadataDraft,
        ...getAutosaveMetadataFields(metadataDraft),
        completedAt: new Date().toISOString(),
      });
    } finally {
      setSavingMetadata(false);
    }
  };

  const openAddEntry = () => {
    setEditingEntryId('');
    setEntryDraft({ ...emptyEntry, id: createEntryId() });
    setDrugSearch('');
    setEntryError('');
    setShowSuggestions(false);
    setSelectedPrescriptionIndex('');
    setShowEntryModal(true);
  };

  const openEditEntry = (entry) => {
    setEditingEntryId(entry.id);
    setEntryDraft({
      id: entry.id,
      drug: entry.drug,
      dose: entry.dose,
      unit: entry.unit,
      route: entry.route,
      frequency: entry.frequency,
      form: entry.form,
      status: entry.status,
      notes: entry.notes,
    });
    setDrugSearch([entry.drug, entry.form].filter(Boolean).join(' '));
    setEntryError('');
    setShowSuggestions(false);
    setSelectedPrescriptionIndex('');
    setShowEntryModal(true);
  };

  const closeEntryModal = () => {
    setShowEntryModal(false);
    setEditingEntryId('');
    setEntryDraft(emptyEntry);
    setDrugSearch('');
    setEntryError('');
    setShowSuggestions(false);
    setSelectedPrescriptionIndex('');
  };

  const selectDrug = (option) => {
    setEntryDraft((current) => ({
      ...current,
      drug: option.drug,
      unit: current.unit || option.unit,
      form: current.form || option.form,
      route: current.route || option.route,
    }));
    setDrugSearch([option.drug, option.strength, option.form].filter(Boolean).join(' '));
    setShowSuggestions(false);
  };

  const handleSaveEntry = async () => {
    if (!String(entryDraft.drug || '').trim()) {
      setEntryError('Enter a medication name.');
      return;
    }

    setSavingEntry(true);
    try {
      const normalizedEntry = {
        ...entryDraft,
        id: entryDraft.id || createEntryId(),
        drug: String(entryDraft.drug || '').trim(),
        dose: String(entryDraft.dose || '').trim(),
        unit: String(entryDraft.unit || '').trim(),
        route: String(entryDraft.route || '').trim(),
        frequency: String(entryDraft.frequency || '').trim(),
        form: String(entryDraft.form || '').trim(),
        status: String(entryDraft.status || 'Current').trim() || 'Current',
        notes: String(entryDraft.notes || '').trim(),
      };

      const nextEntries = editingEntryId
        ? normalizedHistory.entries.map((item) => (item.id === editingEntryId ? normalizedEntry : item))
        : [...normalizedHistory.entries, normalizedEntry];

      await persistMedicationHistory({
        ...normalizedHistory,
        ...metadataDraft,
        entries: nextEntries,
        reconciliationStatus: nextEntries.length ? 'In progress' : metadataDraft.reconciliationStatus,
        completedAt: new Date().toISOString(),
      });
      closeEntryModal();
    } finally {
      setSavingEntry(false);
    }
  };

  const handleDeleteEntry = async (entryId) => {
    const nextEntries = normalizedHistory.entries.filter((item) => item.id !== entryId);
    await persistMedicationHistory({
      ...normalizedHistory,
      ...metadataDraft,
      entries: nextEntries,
      completedAt: new Date().toISOString(),
    });
  };

  const isHistoryModalVisible = typeof onCloseHistoryModal === 'function' ? showHistoryModal : showHistory;
  const openHistoryModal = () => {
    if (typeof onOpenHistoryModal === 'function') {
      onOpenHistoryModal();
      return;
    }
    setShowHistory(true);
  };
  const closeHistoryModal = () => {
    if (typeof onCloseHistoryModal === 'function') {
      onCloseHistoryModal();
      return;
    }
    setShowHistory(false);
  };

  return (
    <>
      <div className="medication-history-panel">
        <div className="medication-history-panel__body">
          <div className="d-flex flex-wrap gap-3 align-items-center mb-3 mt-3">
            <div className="small text-muted"><strong>Last updated:</strong> {formatDateTime(normalizedHistory.completedAt)}</div>
            <div className="small text-muted"><strong>Updated by:</strong> {normalizedHistory.completedBy || 'Not recorded'}</div>
            <Badge bg={formatStatusTone(normalizedHistory.reconciliationStatus)}>
              {normalizedHistory.reconciliationStatus}
            </Badge>
          </div>

          <div
            ref={tutorialRefs.medRecDetails}
            className={`medication-history-panel__section ${activeChartTutorialStepKey === 'med-rec-details' ? 'epma-tutorial-target epma-tutorial-target--active' : ''}`}
          >
            <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
              <h6 className="medication-history-panel__section-title mb-0">History details</h6>
              {!hideInlineHistoryButton ? (
                <Button type="button" size="sm" variant="outline-secondary" onClick={openHistoryModal}>
                  History
                </Button>
              ) : null}
            </div>
            <div className="row g-3">
              <div className="col-md-3">
                <Form.Group controlId="medHistorySources">
                  <Form.Label>Med rec source</Form.Label>
                  <Form.Control
                    type="text"
                    value={metadataDraft.sourcesUsed[0] || ''}
                    disabled={disabled}
                    onChange={(event) => setMetadataDraft((current) => ({
                      ...current,
                      sourcesUsed: event.target.value ? [event.target.value] : [],
                    }))}
                    placeholder="Enter source used for the medication history"
                  />
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group controlId="medHistoryBlisterPack">
                  <Form.Label>Blister pack</Form.Label>
                  <div className="d-flex gap-3 mt-2">
                    <Form.Check
                      inline
                      type="radio"
                      id="medHistoryBlisterPackYes"
                      name="medHistoryBlisterPack"
                      label="Yes"
                      disabled={disabled}
                      checked={metadataDraft.usesBlisterPack === 'Yes'}
                      onChange={() => setMetadataDraft((current) => ({ ...current, usesBlisterPack: 'Yes' }))}
                    />
                    <Form.Check
                      inline
                      type="radio"
                      id="medHistoryBlisterPackNo"
                      name="medHistoryBlisterPack"
                      label="No"
                      disabled={disabled}
                      checked={metadataDraft.usesBlisterPack === 'No'}
                      onChange={() => setMetadataDraft((current) => ({ ...current, usesBlisterPack: 'No' }))}
                    />
                  </div>
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group controlId="medHistoryPharmacy">
                  <Form.Label>Community pharmacy</Form.Label>
                  <Form.Control
                    type="text"
                    value={metadataDraft.communityPharmacy}
                    disabled={disabled}
                    onChange={(event) => setMetadataDraft((current) => ({ ...current, communityPharmacy: event.target.value }))}
                    placeholder="Enter community pharmacy"
                  />
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group controlId="medHistoryStatus">
                  <Form.Label>Reconciliation status</Form.Label>
                  <Form.Select
                    value={metadataDraft.reconciliationStatus}
                    disabled={disabled}
                    onChange={(event) => setMetadataDraft((current) => ({ ...current, reconciliationStatus: event.target.value }))}
                  >
                    <option value="Not started">Not started</option>
                    <option value="In progress">In progress</option>
                    <option value="Complete">Complete</option>
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group controlId="medHistoryPatientOwnSupply">
                  <Form.Label>Patients own supply</Form.Label>
                  <Form.Control
                    type="text"
                    value={metadataDraft.patientOwnSupply}
                    disabled={disabled}
                    onChange={(event) => setMetadataDraft((current) => ({ ...current, patientOwnSupply: event.target.value }))}
                    placeholder="Document whether the patient has their own medications"
                  />
                </Form.Group>
              </div>
            </div>

           
          </div>

          <div
            ref={tutorialRefs.medRecMedicines}
            className={`medication-history-panel__section mt-4 ${activeChartTutorialStepKey === 'med-rec-medicines' ? 'epma-tutorial-target epma-tutorial-target--active' : ''}`}
          >
            <div className="d-flex justify-content-between align-items-center gap-3 mb-2">
              <h6 className="medication-history-panel__section-title mb-0">Medicines</h6>
              <div className="small text-muted">{normalizedHistory.entries.length} medicine{normalizedHistory.entries.length === 1 ? '' : 's'} recorded</div>
            </div>

            <Table responsive size="sm" className="mb-0 medication-history-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Directions</th>
                  <th>Status</th>
                  <th>Notes</th>
                  {!disabled ? <th className="text-end">Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {normalizedHistory.entries.length ? normalizedHistory.entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <div className="fw-semibold">{entry.drug}</div>
                      <div className="small text-muted">{entry.form || 'Free-text medicine'}</div>
                    </td>
                    <td>{formatEntrySummary(entry)}</td>
                    <td>{entry.status || 'Current'}</td>
                    <td>{entry.notes || 'Not recorded'}</td>
                    {!disabled ? (
                      <td className="text-end">
                        <div className="d-flex gap-2 justify-content-end">
                          <Button type="button" size="sm" variant="outline-secondary" onClick={() => openEditEntry(entry)}>
                            Edit
                          </Button>
                          <Button type="button" size="sm" variant="outline-danger" onClick={() => handleDeleteEntry(entry.id)}>
                            <i className="bi bi-trash" aria-hidden="true" />
                          </Button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={disabled ? 4 : 5} className="text-center text-muted">
                      No medication history recorded yet.
                    </td>
                  </tr>
                )}
                {!disabled ? (
                  <tr
                    role="button"
                    tabIndex={0}
                    className="medication-history-table__add-row"
                    onClick={openAddEntry}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openAddEntry();
                      }
                    }}
                  >
                    <td colSpan={5} className="text-center">
                      <span className="text-success fw-semibold">
                        <i className="bi bi-plus-circle me-2" aria-hidden="true" />
                        Click to add a new medicine
                      </span>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </Table>
          </div>
          <div
            ref={tutorialRefs.medRecNotes}
            className={`medication-history-panel__section mt-4 ${activeChartTutorialStepKey === 'med-rec-notes' ? 'epma-tutorial-target epma-tutorial-target--active' : ''}`}
          >
              <Form.Group controlId="medHistoryNotes">
                <Form.Label>Med Rec Note</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={metadataDraft.generalNotes}
                  disabled={disabled}
                  onChange={(event) => setMetadataDraft((current) => ({ ...current, generalNotes: event.target.value }))}
                  placeholder="Med Rec Notes"
                />
              </Form.Group>
          </div>

             {!disabled ? (
              <div className="mt-3 mb-3 d-flex justify-content-end gap-2">
                <Button type="button" variant="outline-secondary" onClick={onClosePanel}>
                  Close
                </Button>
                <Button type="button" onClick={handleSaveMetadata} disabled={savingMetadata}>
                  Save Med Rec
                </Button>
              </div>
            ) : null}
        </div>
      </div>

      <Modal show={showEntryModal} onHide={closeEntryModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingEntryId ? 'Edit medication history entry' : 'Add medication history entry'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="row g-3">
            {inpatientPrescriptionOptions.length ? (
              <div className="col-12">
                <Form.Group controlId="medHistoryFromChart">
                  <Form.Label>Add from inpatient chart</Form.Label>
                  <Form.Select
                    value={selectedPrescriptionIndex}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setSelectedPrescriptionIndex(nextValue);
                      if (!nextValue) {
                        return;
                      }
                      const selectedOption = inpatientPrescriptionOptions.find((item) => item.value === nextValue);
                      if (!selectedOption) {
                        return;
                      }
                      setEntryDraft(selectedOption.entry);
                      setDrugSearch([selectedOption.entry.drug, selectedOption.entry.form].filter(Boolean).join(' '));
                      setShowSuggestions(false);
                    }}
                  >
                    <option value="">Select a prescribed inpatient medicine</option>
                    {inpatientPrescriptionOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </div>
            ) : null}
            <div className="col-12">
              <Form.Group controlId="medHistoryDrug">
                <Form.Label>Drug</Form.Label>
                <Form.Control
                  type="text"
                  value={drugSearch}
                  autoComplete="off"
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setDrugSearch(nextValue);
                    setEntryDraft((current) => ({ ...current, drug: nextValue }));
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => window.setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="Search or enter a medication"
                />
                {showSuggestions && drugResults.length ? (
                  <ListGroup className="mt-2">
                    {drugResults.map((item) => (
                      <ListGroup.Item
                        key={`${item.drug}-${item.strength}-${item.form}`}
                        action
                        onMouseDown={(event) => {
                          event.preventDefault();
                          selectDrug(item);
                        }}
                      >
                        {[item.drug, item.strength, item.form].filter(Boolean).join(' ')}
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                ) : null}
              </Form.Group>
            </div>
            <div className="col-md-3">
              <Form.Group controlId="medHistoryDose">
                <Form.Label>Dose</Form.Label>
                <Form.Control type="text" value={entryDraft.dose} onChange={(event) => setEntryDraft((current) => ({ ...current, dose: event.target.value }))} />
              </Form.Group>
            </div>
            <div className="col-md-2">
              <Form.Group controlId="medHistoryUnit">
                <Form.Label>Unit</Form.Label>
                <Form.Control type="text" value={entryDraft.unit} onChange={(event) => setEntryDraft((current) => ({ ...current, unit: event.target.value }))} />
              </Form.Group>
            </div>
            <div className="col-md-4">
              <Form.Group controlId="medHistoryForm">
                <Form.Label>Form</Form.Label>
                <Form.Control type="text" value={entryDraft.form} onChange={(event) => setEntryDraft((current) => ({ ...current, form: event.target.value }))} />
              </Form.Group>
            </div>
            <div className="col-md-4">
              <Form.Group controlId="medHistoryRoute">
                <Form.Label>Route</Form.Label>
                <Form.Select value={entryDraft.route} onChange={(event) => setEntryDraft((current) => ({ ...current, route: event.target.value }))}>
                  <option value="">Select route</option>
                  {routeOptions.map((item) => (
                    <option key={item.id || item.label} value={item.label}>{item.label}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </div>
            <div className="col-md-4">
              <Form.Group controlId="medHistoryFrequency">
                <Form.Label>Frequency</Form.Label>
                <Form.Select value={entryDraft.frequency} onChange={(event) => setEntryDraft((current) => ({ ...current, frequency: event.target.value }))}>
                  <option value="">Select frequency</option>
                  {frequencyOptions.map((item) => (
                    <option key={item.id || item.label} value={item.label}>{item.label}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </div>
            <div className="col-md-4">
              <Form.Group controlId="medHistoryStatus">
                <Form.Label>Status</Form.Label>
                <Form.Select value={entryDraft.status} onChange={(event) => setEntryDraft((current) => ({ ...current, status: event.target.value }))}>
                  <option value="Current">Current</option>
                  <option value="Held">Held</option>
                  <option value="Stopped">Stopped</option>
                </Form.Select>
              </Form.Group>
            </div>
            <div className="col-12">
              <Form.Group controlId="medHistoryEntryNotes">
                <Form.Label>Entry notes</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={entryDraft.notes}
                  onChange={(event) => setEntryDraft((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Document source certainty, adherence, or other medication-specific notes"
                />
              </Form.Group>
            </div>
          </div>

          {entryError ? <div className="text-danger mt-3">{entryError}</div> : null}
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="outline-secondary" onClick={closeEntryModal}>Cancel</Button>
          <Button type="button" onClick={handleSaveEntry} disabled={savingEntry}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={isHistoryModalVisible} onHide={closeHistoryModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Medication history audit</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table responsive bordered size="sm" className="mb-0">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Previous value</th>
                <th>New value</th>
                <th>Username</th>
              </tr>
            </thead>
            <tbody>
              {medicationHistoryEvents.length ? medicationHistoryEvents.map((entry, index) => (
                <tr key={`${entry.timestamp}-${index}`}>
                  <td>{formatDateTime(entry.timestamp)}</td>
                  <td>{formatHistoryValue(entry.previousValue)}</td>
                  <td>{formatHistoryValue(entry.nextValue)}</td>
                  <td>{entry.actor || 'Unknown user'}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="text-center text-muted">No medication-history audit recorded yet.</td>
                </tr>
              )}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default MedicationHistory;
