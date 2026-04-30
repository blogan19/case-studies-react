import React, { useMemo, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Table from 'react-bootstrap/Table';

const MAX_VISIBLE_ROWS = 20;

const SAMPLE_CSV = `drug_name,strength,unit,form,default_route,aliases,category,usual_frequencies,default_dose,max_dose,notes
Apixaban,5,mg,tablet,oral,Eliquis,Anticoagulant,"twice daily",5,,High-risk anticoagulant
Ceftriaxone,1,g,injection,IV,,Antibiotic,"once daily",1,4,Common ward antibiotic`;

const emptyDrugEditor = {
  id: '',
  drugName: '',
  strength: '',
  unit: '',
  form: '',
  defaultRoute: '',
  category: '',
  usualFrequencies: '',
  defaultDose: '',
  maximumDose: '',
  notes: '',
};

const emptyMissingLookups = {
  routes: [],
  frequencies: [],
  units: [],
  forms: [],
};

const emptyConfirmedLookups = {
  routes: [],
  frequencies: {},
  units: [],
  forms: [],
};

const emptyValidationReport = {
  errors: [],
  warnings: [],
  summary: {
    totalRows: 0,
    validRows: 0,
    errorCount: 0,
    warningCount: 0,
  },
};

const DrugLibraryManager = ({ items, metadata, onPreviewImport, onImport, onUpdateDrug, onAddDrug, onDeleteDrug, importing }) => {
  const [csvContent, setCsvContent] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [localNotice, setLocalNotice] = useState('');
  const [localNoticeVariant, setLocalNoticeVariant] = useState('light');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportReviewModal, setShowImportReviewModal] = useState(false);
  const [drugEditor, setDrugEditor] = useState(emptyDrugEditor);
  const [newDrug, setNewDrug] = useState(emptyDrugEditor);
  const [searchTerm, setSearchTerm] = useState('');
  const [missingLookupValues, setMissingLookupValues] = useState(emptyMissingLookups);
  const [confirmedLookupValues, setConfirmedLookupValues] = useState(emptyConfirmedLookups);
  const [validationReport, setValidationReport] = useState(emptyValidationReport);

  const previewRows = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    const matchingRows = items.filter((item) => {
      if (!normalizedSearchTerm) {
        return true;
      }

      return [
        item.drugName,
        item.strength,
        item.unit,
        item.form,
        item.defaultRoute,
        item.category,
        item.usualFrequencies,
        item.defaultDose,
        item.maximumDose,
        item.notes,
      ].some((value) => String(value || '').toLowerCase().includes(normalizedSearchTerm));
    });

    return matchingRows.slice(0, MAX_VISIBLE_ROWS);
  }, [items, searchTerm]);

  const matchingDrugCount = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    if (!normalizedSearchTerm) {
      return items.length;
    }

    return items.filter((item) => (
      [
        item.drugName,
        item.strength,
        item.unit,
        item.form,
        item.defaultRoute,
        item.category,
        item.usualFrequencies,
        item.defaultDose,
        item.maximumDose,
        item.notes,
      ].some((value) => String(value || '').toLowerCase().includes(normalizedSearchTerm))
    )).length;
  }, [items, searchTerm]);

  const routeOptions = useMemo(
    () => (metadata?.routeOptions || []).map((item) => item.label).filter(Boolean),
    [metadata?.routeOptions]
  );

  const frequencyOptions = useMemo(
    () => (metadata?.frequencyOptions || []).map((item) => item.label).filter(Boolean),
    [metadata?.frequencyOptions]
  );

  const unitOptions = useMemo(
    () => (
      metadata?.unitOptions?.length
        ? metadata.unitOptions.map((item) => item.label).filter(Boolean)
        : [...new Set(items.map((item) => String(item.unit || '').trim()).filter(Boolean))]
    ).sort((left, right) => left.localeCompare(right)),
    [items, metadata?.unitOptions]
  );

  const formOptions = useMemo(
    () => (
      metadata?.formOptions?.length
        ? metadata.formOptions.map((item) => item.label).filter(Boolean)
        : [...new Set(items.map((item) => String(item.form || '').trim()).filter(Boolean))]
    ).sort((left, right) => left.localeCompare(right)),
    [items, metadata?.formOptions]
  );

  const categoryOptions = useMemo(
    () => metadata?.categoryOptions || [],
    [metadata?.categoryOptions]
  );

  const hasMissingLookupValues = useMemo(
    () => Object.values(missingLookupValues).some((values) => values.length > 0),
    [missingLookupValues]
  );

  const allMissingValuesConfirmed = useMemo(
    () => (
      missingLookupValues.routes.every((value) => confirmedLookupValues.routes.includes(value))
      && missingLookupValues.units.every((value) => confirmedLookupValues.units.includes(value))
      && missingLookupValues.forms.every((value) => confirmedLookupValues.forms.includes(value))
      && missingLookupValues.frequencies.every((value) => String(confirmedLookupValues.frequencies[value] || '').trim())
    ),
    [confirmedLookupValues, missingLookupValues]
  );
  const hasBlockingValidationErrors = useMemo(
    () => (validationReport.errors || []).length > 0,
    [validationReport.errors]
  );
  const hasValidationWarnings = useMemo(
    () => (validationReport.warnings || []).length > 0,
    [validationReport.warnings]
  );
  const shouldShowImportReview = hasMissingLookupValues || hasBlockingValidationErrors || hasValidationWarnings;

  const handleFileSelected = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const text = await file.text();
    setCsvContent(text);
    setLocalNoticeVariant('light');
    setLocalNotice(`Loaded ${file.name} into the import box.`);
  };

  const handleImport = async () => {
    if (replaceExisting && items.length) {
      const confirmed = window.confirm('Replace the current drug library with this CSV import? This will remove the existing drug records before importing the new file.');
      if (!confirmed) {
        return;
      }
    }

    try {
      const response = await onPreviewImport(csvContent, replaceExisting);
      const nextMissingValues = response?.missingLookupValues || emptyMissingLookups;
      const nextValidationReport = response?.validationReport || emptyValidationReport;

      setMissingLookupValues(nextMissingValues);
      setConfirmedLookupValues(emptyConfirmedLookups);
      setValidationReport(nextValidationReport);

      if (
        Object.values(nextMissingValues).some((values) => values.length > 0)
        || (nextValidationReport.errors || []).length > 0
        || (nextValidationReport.warnings || []).length > 0
      ) {
        setShowImportReviewModal(true);
        return;
      }

      await onImport(csvContent, replaceExisting, emptyConfirmedLookups);
      setCsvContent('');
      setLocalNoticeVariant('success');
      setLocalNotice('Drug library imported successfully.');
    } catch (error) {
      setLocalNoticeVariant('danger');
      setLocalNotice(error.message || 'Unable to import the drug library right now.');
    }
  };

  const toggleLookupConfirmation = (group, value) => {
    setConfirmedLookupValues((current) => {
      const existingValues = current[group] || [];
      const nextValues = existingValues.includes(value)
        ? existingValues.filter((item) => item !== value)
        : [...existingValues, value];
      return {
        ...current,
        [group]: nextValues,
      };
    });
  };

  const updateFrequencyConfirmation = (label, defaultAdminTimes) => {
    setConfirmedLookupValues((current) => ({
      ...current,
      frequencies: {
        ...current.frequencies,
        [label]: defaultAdminTimes,
      },
    }));
  };

  const handleConfirmImportReview = async () => {
    try {
      await onImport(csvContent, replaceExisting, confirmedLookupValues);
      setCsvContent('');
      setShowImportReviewModal(false);
      setMissingLookupValues(emptyMissingLookups);
      setConfirmedLookupValues(emptyConfirmedLookups);
      setValidationReport(emptyValidationReport);
      setLocalNoticeVariant('success');
      setLocalNotice('Drug library imported successfully.');
    } catch (error) {
      setLocalNoticeVariant('danger');
      setLocalNotice(error.message || 'Unable to import the drug library right now.');
    }
  };

  const closeImportReviewModal = () => {
    setShowImportReviewModal(false);
    setMissingLookupValues(emptyMissingLookups);
    setConfirmedLookupValues(emptyConfirmedLookups);
    setValidationReport(emptyValidationReport);
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'drug-library-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const openDrugEditor = (item) => {
    setDrugEditor({
      id: item.id || '',
      drugName: item.drugName || '',
      strength: item.strength || '',
      unit: item.unit || '',
      form: item.form || '',
      defaultRoute: item.defaultRoute || '',
      category: item.category || '',
      usualFrequencies: item.usualFrequencies || '',
      defaultDose: item.defaultDose || '',
      maximumDose: item.maximumDose || '',
      notes: item.notes || '',
    });
    setShowEditModal(true);
  };

  const handleSaveDrug = async () => {
    try {
      await onUpdateDrug(drugEditor.id, {
        drugName: drugEditor.drugName,
        strength: drugEditor.strength,
        unit: drugEditor.unit,
        form: drugEditor.form,
        defaultRoute: drugEditor.defaultRoute,
        category: drugEditor.category,
        usualFrequencies: drugEditor.usualFrequencies,
        defaultDose: drugEditor.defaultDose,
        maximumDose: drugEditor.maximumDose,
        notes: drugEditor.notes,
      });
      setShowEditModal(false);
      setDrugEditor(emptyDrugEditor);
      setLocalNoticeVariant('success');
      setLocalNotice('Drug updated successfully.');
    } catch (error) {
      setLocalNoticeVariant('danger');
      setLocalNotice(error.message || 'Unable to save this drug right now.');
    }
  };

  const handleAddDrug = async (event) => {
    event.preventDefault();
    try {
      await onAddDrug({
        drugName: newDrug.drugName,
        strength: newDrug.strength,
        unit: newDrug.unit,
        form: newDrug.form,
        defaultRoute: newDrug.defaultRoute,
        category: newDrug.category,
        usualFrequencies: newDrug.usualFrequencies,
        defaultDose: newDrug.defaultDose,
        maximumDose: newDrug.maximumDose,
        notes: newDrug.notes,
      });
      setNewDrug(emptyDrugEditor);
      setLocalNoticeVariant('success');
      setLocalNotice('Drug added successfully.');
    } catch (error) {
      setLocalNoticeVariant('danger');
      setLocalNotice(error.message || 'Unable to add this drug right now.');
    }
  };

  const handleDeleteDrug = async (drugId) => {
    const selectedDrug = items.find((item) => item.id === drugId);
    const confirmed = window.confirm(`Remove ${selectedDrug?.drugName || 'this drug'} from the shared drug library? This will affect future prescribing defaults.`);
    if (!confirmed) {
      return;
    }

    try {
      await onDeleteDrug(drugId);
      setLocalNoticeVariant('info');
      setLocalNotice('Drug removed successfully.');
    } catch (error) {
      setLocalNoticeVariant('danger');
      setLocalNotice(error.message || 'Unable to remove this drug right now.');
    }
  };

  return (
    <Card className="container-shadow mb-4">
      <Card.Body>
        <h5 className="mb-3">Drug Library</h5>
        <p className="text-muted">
          Upload a simple CSV to manage the prescribing library. Expected columns:
          <code className="ms-1">drug_name,strength,unit,form,default_route,aliases,category,usual_frequencies,default_dose,max_dose,notes</code>
        </p>
        <p className="text-muted small">
          Allowed categories: {(categoryOptions || []).join(', ') || 'No category list loaded'}.
        </p>

        {localNotice ? <Alert variant={localNoticeVariant}>{localNotice}</Alert> : null}

        <div className="mb-3">
          <strong>Current library:</strong> {items.length} drugs
          <br />
          <small className="text-muted">Routes stay configurable in the form. Default routes are used to prefill common choices.</small>
        </div>

        <Form.Group className="mb-3" controlId="drugLibrarySearch">
          <Form.Label>Search drug library</Form.Label>
          <Form.Control
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by drug, form, route, frequency, or notes"
          />
          <Form.Text className="text-muted">
            Showing {previewRows.length} of {matchingDrugCount} matching drugs.
            {matchingDrugCount > MAX_VISIBLE_ROWS ? ` Refine your search to narrow beyond the first ${MAX_VISIBLE_ROWS}.` : ''}
          </Form.Text>
        </Form.Group>

        <Form onSubmit={handleAddDrug} className="mb-4">
          <h6 className="mb-3">Add single drug</h6>
          <div className="row g-3">
            <div className="col-md-4">
              <Form.Group controlId="newDrugName">
                <Form.Label>Drug name</Form.Label>
                <Form.Control value={newDrug.drugName} onChange={(event) => setNewDrug((current) => ({ ...current, drugName: event.target.value }))} />
              </Form.Group>
            </div>
            <div className="col-md-2">
              <Form.Group controlId="newDrugStrength">
                <Form.Label>Strength</Form.Label>
                <Form.Control value={newDrug.strength} onChange={(event) => setNewDrug((current) => ({ ...current, strength: event.target.value }))} />
              </Form.Group>
            </div>
            <div className="col-md-2">
              <Form.Group controlId="newDrugUnit">
                <Form.Label>Unit</Form.Label>
                <Form.Select value={newDrug.unit} onChange={(event) => setNewDrug((current) => ({ ...current, unit: event.target.value }))}>
                  <option value="">Select unit</option>
                  {unitOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </Form.Select>
              </Form.Group>
            </div>
            <div className="col-md-2">
              <Form.Group controlId="newDrugForm">
                <Form.Label>Form</Form.Label>
                <Form.Select value={newDrug.form} onChange={(event) => setNewDrug((current) => ({ ...current, form: event.target.value }))}>
                  <option value="">Select form</option>
                  {formOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </Form.Select>
              </Form.Group>
            </div>
            <div className="col-md-2">
              <Form.Group controlId="newDrugRoute">
                <Form.Label>Default route</Form.Label>
                <Form.Select value={newDrug.defaultRoute} onChange={(event) => setNewDrug((current) => ({ ...current, defaultRoute: event.target.value }))}>
                  <option value="">Select route</option>
                  {routeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </Form.Select>
              </Form.Group>
            </div>
            <div className="col-md-3">
              <Form.Group controlId="newDrugCategory">
                <Form.Label>Category</Form.Label>
                <Form.Select value={newDrug.category} onChange={(event) => setNewDrug((current) => ({ ...current, category: event.target.value }))}>
                  <option value="">Select category</option>
                  {categoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </Form.Select>
              </Form.Group>
            </div>
            <div className="col-md-4">
              <Form.Group controlId="newDrugFrequencies">
                <Form.Label>Usual frequencies</Form.Label>
                <Form.Select value={newDrug.usualFrequencies} onChange={(event) => setNewDrug((current) => ({ ...current, usualFrequencies: event.target.value }))}>
                  <option value="">Select frequency</option>
                  {frequencyOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                </Form.Select>
              </Form.Group>
            </div>
            <div className="col-md-3">
              <Form.Group controlId="newDrugDefaultDose">
                <Form.Label>Default dose</Form.Label>
                <Form.Control value={newDrug.defaultDose} onChange={(event) => setNewDrug((current) => ({ ...current, defaultDose: event.target.value }))} />
              </Form.Group>
            </div>
            <div className="col-md-3">
              <Form.Group controlId="newDrugMaximumDose">
                <Form.Label>Maximum dose</Form.Label>
                <Form.Control value={newDrug.maximumDose} onChange={(event) => setNewDrug((current) => ({ ...current, maximumDose: event.target.value }))} />
              </Form.Group>
            </div>
            <div className="col-md-6">
              <Form.Group controlId="newDrugNotes">
                <Form.Label>Notes</Form.Label>
                <Form.Control value={newDrug.notes} onChange={(event) => setNewDrug((current) => ({ ...current, notes: event.target.value }))} />
              </Form.Group>
            </div>
            <div className="col-12">
              <Button type="submit" variant="primary" disabled={importing || !newDrug.drugName.trim()}>
                Add drug
              </Button>
            </div>
          </div>
        </Form>

        {matchingDrugCount ? (
          <Table bordered responsive className="mb-3 facilitator-admin-table">
            <thead>
              <tr>
                <th>Drug</th>
                <th>Strength</th>
                <th>Unit</th>
                <th>Form</th>
                <th>Default route</th>
                <th>Category</th>
                <th>Usual frequencies</th>
                <th>Default dose</th>
                <th>Max dose</th>
                <th>Notes</th>
                <th className="facilitator-admin-table__action-col">Action</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.map((item) => (
                <tr key={item.id}>
                  <td>{item.drugName}</td>
                  <td>{item.strength || 'Not set'}</td>
                  <td>{item.unit || 'Not set'}</td>
                  <td>{item.form || 'Not set'}</td>
                  <td>{item.defaultRoute || 'Not set'}</td>
                  <td>{item.category || 'Not set'}</td>
                  <td>{item.usualFrequencies || 'Not set'}</td>
                  <td>{item.defaultDose || 'Not set'}</td>
                  <td>{item.maximumDose || 'Not set'}</td>
                  <td>{item.notes || 'Not set'}</td>
                  <td>
                    <div className="facilitator-admin-table__actions">
                      <Button type="button" variant="primary" size="sm" onClick={() => openDrugEditor(item)}>
                        Edit
                      </Button>
                      <Button type="button" variant="danger" size="sm" onClick={() => handleDeleteDrug(item.id)}>
                        Remove
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Alert variant="warning">
            {items.length ? 'No drugs match your search.' : 'The drug library is currently empty.'}
          </Alert>
        )}

        <Form.Group className="mb-3" controlId="drugLibraryCsvFile">
          <Form.Label>Upload CSV file</Form.Label>
          <Form.Control type="file" accept=".csv,text/csv" onChange={handleFileSelected} />
        </Form.Group>

        <Form.Group className="mb-3" controlId="drugLibraryCsvText">
          <Form.Label>CSV content</Form.Label>
          <Form.Control
            as="textarea"
            rows={8}
            value={csvContent}
            onChange={(event) => setCsvContent(event.target.value)}
            placeholder={SAMPLE_CSV}
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="replaceDrugLibrary">
          <Form.Check
            type="switch"
            label="Replace existing drug library on import"
            checked={replaceExisting}
            onChange={(event) => setReplaceExisting(event.target.checked)}
          />
        </Form.Group>

        <div className="d-flex align-items-center gap-3 flex-wrap">
          <Button type="button" variant="outline-primary" disabled={importing || !csvContent.trim()} onClick={handleImport}>
            {importing ? 'Importing...' : 'Import CSV'}
          </Button>
          <Button type="button" variant="outline-secondary" onClick={handleDownloadTemplate}>
            Download template
          </Button>
          <small className="text-muted">
            Standard frequencies available: {(metadata?.frequencies || []).slice(0, 4).join(', ')}
            {(metadata?.frequencies || []).length > 4 ? '...' : ''}
          </small>
        </div>
        {replaceExisting && items.length ? (
          <Alert variant="warning" className="mt-3 mb-0">
            Replace existing drug library on import is turned on. Importing will remove the current {items.length} drug {items.length === 1 ? 'record' : 'records'} before loading the CSV.
          </Alert>
        ) : null}
      </Card.Body>

      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit drug</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <div className="row g-3">
              <div className="col-md-6">
                <Form.Group controlId="adminDrugName">
                  <Form.Label>Drug name</Form.Label>
                  <Form.Control value={drugEditor.drugName} onChange={(event) => setDrugEditor((current) => ({ ...current, drugName: event.target.value }))} />
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group controlId="adminDrugStrength">
                  <Form.Label>Strength</Form.Label>
                  <Form.Control value={drugEditor.strength} onChange={(event) => setDrugEditor((current) => ({ ...current, strength: event.target.value }))} />
                </Form.Group>
              </div>
              <div className="col-md-3">
                <Form.Group controlId="adminDrugUnit">
                  <Form.Label>Unit</Form.Label>
                  <Form.Select value={drugEditor.unit} onChange={(event) => setDrugEditor((current) => ({ ...current, unit: event.target.value }))}>
                    <option value="">Select unit</option>
                    {unitOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group controlId="adminDrugForm">
                  <Form.Label>Form</Form.Label>
                  <Form.Select value={drugEditor.form} onChange={(event) => setDrugEditor((current) => ({ ...current, form: event.target.value }))}>
                    <option value="">Select form</option>
                    {formOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group controlId="adminDrugRoute">
                  <Form.Label>Default route</Form.Label>
                  <Form.Select value={drugEditor.defaultRoute} onChange={(event) => setDrugEditor((current) => ({ ...current, defaultRoute: event.target.value }))}>
                    <option value="">Select route</option>
                    {routeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group controlId="adminDrugCategory">
                  <Form.Label>Category</Form.Label>
                  <Form.Select value={drugEditor.category} onChange={(event) => setDrugEditor((current) => ({ ...current, category: event.target.value }))}>
                    <option value="">Select category</option>
                    {categoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group controlId="adminDrugUsualFrequencies">
                  <Form.Label>Usual frequencies</Form.Label>
                  <Form.Select value={drugEditor.usualFrequencies} onChange={(event) => setDrugEditor((current) => ({ ...current, usualFrequencies: event.target.value }))}>
                    <option value="">Select frequency</option>
                    {frequencyOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group controlId="adminDrugDefaultDose">
                  <Form.Label>Default dose</Form.Label>
                  <Form.Control value={drugEditor.defaultDose} onChange={(event) => setDrugEditor((current) => ({ ...current, defaultDose: event.target.value }))} />
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group controlId="adminDrugMaximumDose">
                  <Form.Label>Maximum dose</Form.Label>
                  <Form.Control value={drugEditor.maximumDose} onChange={(event) => setDrugEditor((current) => ({ ...current, maximumDose: event.target.value }))} />
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group controlId="adminDrugNotes">
                  <Form.Label>Notes</Form.Label>
                  <Form.Control as="textarea" rows={3} value={drugEditor.notes} onChange={(event) => setDrugEditor((current) => ({ ...current, notes: event.target.value }))} />
                </Form.Group>
              </div>
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSaveDrug} disabled={importing || !drugEditor.drugName.trim()}>
            Save drug
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showImportReviewModal} onHide={closeImportReviewModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Review drug CSV import</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-muted">
            Review any blocking row issues, suspicious values, and new lookup values before importing this file.
          </p>
          <Alert variant={hasBlockingValidationErrors ? 'danger' : hasValidationWarnings || hasMissingLookupValues ? 'warning' : 'info'}>
            Rows checked: <strong>{validationReport.summary?.totalRows || 0}</strong>.
            {' '}Valid rows: <strong>{validationReport.summary?.validRows || 0}</strong>.
            {' '}Blocking issues: <strong>{validationReport.summary?.errorCount || 0}</strong>.
            {' '}Warnings: <strong>{validationReport.summary?.warningCount || 0}</strong>.
          </Alert>
          {!shouldShowImportReview ? (
            <Alert variant="info" className="mb-0">No validation issues or new lookup values were found in this file.</Alert>
          ) : null}
          {hasBlockingValidationErrors ? (
            <div className="mb-4">
              <h6 className="mb-2">Blocking row issues</h6>
              <div className="d-flex flex-column gap-2">
                {validationReport.errors.map((issue, index) => (
                  <Alert key={`validation-error-${index}`} variant="danger" className="mb-0 py-2">
                    Row {issue.rowNumber || '?'}: <strong>{issue.drugName}</strong> - {issue.message}
                  </Alert>
                ))}
              </div>
            </div>
          ) : null}
          {hasValidationWarnings ? (
            <div className="mb-4">
              <h6 className="mb-2">Warnings to review</h6>
              <div className="d-flex flex-column gap-2">
                {validationReport.warnings.map((issue, index) => (
                  <Alert key={`validation-warning-${index}`} variant="warning" className="mb-0 py-2">
                    Row {issue.rowNumber || '?'}: <strong>{issue.drugName}</strong> - {issue.message}
                  </Alert>
                ))}
              </div>
            </div>
          ) : null}
          {hasMissingLookupValues ? (
            <p className="text-muted">
              This file contains routes, frequencies, units, or forms that are not yet in the data warehouse.
              Tick each value you want to add before importing the drug file.
            </p>
          ) : null}
          {[
            ['routes', 'Routes'],
            ['units', 'Units'],
            ['forms', 'Forms'],
          ].map(([group, label]) => (
            missingLookupValues[group].length ? (
              <div key={group} className="mb-4">
                <h6 className="mb-2">{label}</h6>
                <div className="d-flex flex-column gap-2">
                  {missingLookupValues[group].map((value) => (
                    <Form.Check
                      key={`${group}-${value}`}
                      id={`${group}-${value}`}
                      type="checkbox"
                      label={value}
                      checked={(confirmedLookupValues[group] || []).includes(value)}
                      onChange={() => toggleLookupConfirmation(group, value)}
                    />
                  ))}
                </div>
              </div>
            ) : null
          ))}
          {missingLookupValues.frequencies.length ? (
            <div className="mb-4">
              <h6 className="mb-2">Frequencies</h6>
              <p className="small text-muted">
                Enter default administration times for each new frequency before importing.
              </p>
              <div className="d-flex flex-column gap-3">
                {missingLookupValues.frequencies.map((value) => (
                  <div key={`frequency-${value}`} className="border rounded p-3">
                    <div className="fw-semibold mb-2">{value}</div>
                    <Form.Control
                      value={confirmedLookupValues.frequencies[value] || ''}
                      onChange={(event) => updateFrequencyConfirmation(value, event.target.value)}
                      placeholder="e.g. 08:00,20:00"
                    />
                    <Form.Text className="text-muted">
                      Use comma-separated 24-hour times, for example `08:00,20:00`.
                    </Form.Text>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={closeImportReviewModal}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={handleConfirmImportReview} disabled={hasBlockingValidationErrors || !allMissingValuesConfirmed}>
            Confirm and import
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
};

export default DrugLibraryManager;
