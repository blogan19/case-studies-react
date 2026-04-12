import React, { useMemo, useRef, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import ListGroup from 'react-bootstrap/ListGroup';
import Table from 'react-bootstrap/Table';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import PatientDetails from '../patient_records/Patient_details';
import PatientRecordsContainer from '../patient_records/Patient_records_container';
import Prescription from '../prescriptions/Prescription';
import data from '../casestudy_editor/randomFields';

const buildRandomAddress = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVQXYZ';
  const postcode = `${characters[Math.floor(Math.random() * characters.length)]}${characters[Math.floor(Math.random() * characters.length)]}${Math.ceil(Math.random() * 10)} ${Math.ceil(Math.random() * 10)}${characters[Math.floor(Math.random() * characters.length)]}${characters[Math.floor(Math.random() * characters.length)]}`;
  const houseNo = Math.ceil(Math.random() * 120);
  const street = data.addresses.streets[Math.floor(Math.random() * data.addresses.streets.length)];
  const town = data.addresses.towns[Math.floor(Math.random() * data.addresses.towns.length)];
  return `${houseNo} ${street}, ${town}, ${postcode}`;
};

const stayTypeWardOptions = {
  'A/E': ['Majors', 'Resus', 'Assessment', 'Ambulatory Emergency Care'],
  'Ward inpatient': ['Cedar Ward', 'Willow Ward', 'Maple Ward', 'Oak Ward', 'Rose Ward'],
  Daycase: ['Day Surgery Unit', 'Medical Day Unit', 'Endoscopy Day Unit', 'Ambulatory Care Unit'],
  Theatre: ['Theatre Suite 1', 'Theatre Suite 2', 'Recovery Bay', 'Surgical Admissions Lounge'],
};

const buildRandomWardName = (stayType) => {
  const options = stayTypeWardOptions[stayType] || stayTypeWardOptions['Ward inpatient'];
  return options[Math.floor(Math.random() * options.length)];
};

const buildRandomPatient = ({ gender, ageYears, weightKg, heightCm, stayType }) => {
  const nameBucket = gender === 'Male' ? 'male_names' : 'female_names';
  const firstName = data.names[nameBucket][Math.floor(Math.random() * data.names[nameBucket].length)];
  const surname = data.names.surnames[Math.floor(Math.random() * data.names.surnames.length)];
  const today = new Date();
  const month = Math.floor(Math.random() * 12);
  const day = Math.max(1, Math.floor(Math.random() * 28));
  const dob = new Date(today.getFullYear() - Number(ageYears || 30), month, day);

  return {
    fullName: `${firstName} ${surname}`,
    dateOfBirth: dob.toLocaleDateString('en-GB'),
    address: buildRandomAddress(),
    gender,
    stayType,
    wardName: buildRandomWardName(stayType),
    weight: `${weightKg}kg`,
    height: `${heightCm}cm`,
  };
};

const emptyAllergyDraft = { drug: '', reaction: '' };
const emptySearchFields = { nhsNumber: '', hospitalNumber: '', firstName: '', surname: '' };
const emptySearchErrors = { nhsNumber: '', hospitalNumber: '', firstName: '', surname: '', general: '' };

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
    return 'Allergy review confirmed';
  }

  return action || 'Updated';
};

const StudentEpmaWorkspace = ({
  currentUser,
  drugLibrary,
  onBack,
  onBackToFinder,
  onSearch,
  onCreatePatient,
  onSelectPatient,
  onUpdateAllergies,
  onUpdateCaseNotes,
  onUpdatePrescriptions,
  onUpdateMeasurements,
  onDeleteMeasurement,
  onDischargePatient,
  onReadmitPatient,
  onVerifyWitness,
  onBlockedPrescribe,
  onApprovalToast,
  searchResults,
  recentPatients,
  commonConditions,
  searchState,
  selectedPatient,
}) => {
  const allergyReactionRef = useRef(null);
  const [searchFields, setSearchFields] = useState(emptySearchFields);
  const [searchErrors, setSearchErrors] = useState(emptySearchErrors);
  const [showSearchMatches, setShowSearchMatches] = useState(false);
  const [showRecentPatients, setShowRecentPatients] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAllergyManagementModal, setShowAllergyManagementModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [showReadmitModal, setShowReadmitModal] = useState(false);
  const [gender, setGender] = useState('Female');
  const [stayType, setStayType] = useState('Ward inpatient');
  const [ageYears, setAgeYears] = useState(67);
  const [weightKg, setWeightKg] = useState(68);
  const [heightCm, setHeightCm] = useState(168);
  const [allergyDraft, setAllergyDraft] = useState(emptyAllergyDraft);
  const [allergyReason, setAllergyReason] = useState('');
  const [editingAllergyIndex, setEditingAllergyIndex] = useState(null);
  const [allergyDrugLocked, setAllergyDrugLocked] = useState(false);
  const [allergyFormError, setAllergyFormError] = useState('');
  const [removeReason, setRemoveReason] = useState('');
  const [removingAllergyIndex, setRemovingAllergyIndex] = useState(null);
  const [readmitTarget, setReadmitTarget] = useState(null);
  const [readmitStayType, setReadmitStayType] = useState('Ward inpatient');
  const [readmitWardName, setReadmitWardName] = useState(buildRandomWardName('Ward inpatient'));

  const generatedPatient = useMemo(
    () => buildRandomPatient({ gender, ageYears, weightKg, heightCm, stayType }),
    [ageYears, gender, heightCm, stayType, weightKg]
  );
  const reactionOptions = drugLibrary?.metadata?.reactionOptions || [];
  const drugOptions = useMemo(
    () => Array.from(
      new Set(
        (drugLibrary?.items || [])
          .map((item) => String(item.drugName || '').trim())
          .filter(Boolean)
      )
    ).sort((left, right) => left.localeCompare(right)),
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
  const patientAllergies = selectedPatient?.allergies || [];
  const patientHistory = selectedPatient?.allergyHistory || [];
  const isDischargedEpisode = selectedPatient?.episodeStatus === 'discharged';
  const trimmedFirstName = searchFields.firstName.trim();
  const trimmedSurname = searchFields.surname.trim();
  const missingSearchPair =
    (trimmedFirstName && !trimmedSurname) || (!trimmedFirstName && trimmedSurname);
  const searchPairMessage = trimmedFirstName && !trimmedSurname
    ? 'Please enter surname.'
    : (!trimmedFirstName && trimmedSurname ? 'Please enter first name.' : '');

  const setSearchField = (field, value) => {
    setSearchFields((current) => ({ ...current, [field]: value }));
    setSearchErrors((current) => ({
      ...current,
      [field]: '',
      ...(field === 'firstName' || field === 'surname' ? { firstName: '', surname: '' } : {}),
      general: '',
    }));
  };

  const validateSearch = () => {
    const nextErrors = { ...emptySearchErrors };
    const nhsNumber = searchFields.nhsNumber.trim();
    const hospitalNumber = searchFields.hospitalNumber.trim();
    const firstName = searchFields.firstName.trim();
    const surname = searchFields.surname.trim();

    if (!nhsNumber && !hospitalNumber && !firstName && !surname) {
      nextErrors.general = 'Enter at least one search value.';
    }

    if (firstName && !surname) {
      nextErrors.surname = 'Please enter surname.';
    }

    if (surname && !firstName) {
      nextErrors.firstName = 'Please enter first name.';
    }

    if (firstName && firstName.length < 2) {
      nextErrors.firstName = 'First-name searches must be at least 2 characters.';
    }

    if (surname && surname.length < 3) {
      nextErrors.surname = 'Surname searches must be at least 3 characters.';
    }

    setSearchErrors(nextErrors);
    return !nextErrors.general && !nextErrors.nhsNumber && !nextErrors.hospitalNumber && !nextErrors.firstName && !nextErrors.surname;
  };

  const handleSubmitSearch = async (event) => {
    event.preventDefault();
    if (!validateSearch()) {
      return;
    }

    await onSearch({
      nhsNumber: searchFields.nhsNumber.trim(),
      hospitalNumber: searchFields.hospitalNumber.trim(),
      firstName: searchFields.firstName.trim(),
      surname: searchFields.surname.trim(),
    });
    setShowSearchMatches(true);
    setShowRecentPatients(false);
  };

  const handleCreate = async () => {
    await onCreatePatient(generatedPatient);
    setShowCreateModal(false);
  };

  const resetAllergyEditor = () => {
    setAllergyDraft(emptyAllergyDraft);
    setAllergyReason('');
    setEditingAllergyIndex(null);
    setAllergyDrugLocked(false);
    setAllergyFormError('');
  };

  const buildAllergyPayload = (allergies, reason, action, nkda = false, targetDrug = '', targetReaction = '') => ({
    allergies,
    nkda,
    reason,
    action,
    targetDrug,
    targetReaction,
  });

  const handleToggleNkda = async (enabled) => {
    if (!selectedPatient) {
      return;
    }

    const reason = enabled ? 'Marked as no known drug allergies' : 'Removed no known drug allergies status';
    await onUpdateAllergies(
      selectedPatient.id,
      buildAllergyPayload(enabled ? [] : patientAllergies, reason, enabled ? 'marked-nkda' : 'cleared-nkda', enabled)
    );
  };

  const handleConfirmAllergyReview = async () => {
    if (!selectedPatient) {
      return;
    }

    await onUpdateAllergies(
      selectedPatient.id,
      buildAllergyPayload(
        patientAllergies,
        'Allergy review confirmed',
        'reviewed',
        Boolean(selectedPatient.nkda)
      )
    );
  };

  const handleSaveAllergy = async () => {
    if (!selectedPatient || !allergyDraft.drug || !allergyDraft.reaction || !allergyReason.trim()) {
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

    const nextAllergies = patientAllergies.slice();
    if (editingAllergyIndex !== null) {
      nextAllergies[editingAllergyIndex] = allergyDraft;
    } else {
      nextAllergies.push(allergyDraft);
    }

    await onUpdateAllergies(
      selectedPatient.id,
      buildAllergyPayload(
        nextAllergies,
        allergyReason,
        editingAllergyIndex !== null ? 'edited' : 'added',
        false,
        allergyDraft.drug,
        allergyDraft.reaction
      )
    );
    resetAllergyEditor();
  };

  const openEditAllergy = (index) => {
    setAllergyDraft(patientAllergies[index] || emptyAllergyDraft);
    setAllergyReason('');
    setEditingAllergyIndex(index);
    setAllergyDrugLocked(Boolean(patientAllergies[index]?.drug));
    setAllergyFormError('');
    setShowAllergyManagementModal(true);
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

  const closeAllergyManagementModal = () => {
    resetAllergyEditor();
    setShowAllergyManagementModal(false);
  };

  const handleRemoveAllergy = async () => {
    if (!selectedPatient || removingAllergyIndex === null || !removeReason.trim()) {
      return;
    }

    const nextAllergies = patientAllergies.filter((_item, itemIndex) => itemIndex !== removingAllergyIndex);
    const removedAllergy = patientAllergies[removingAllergyIndex];
    await onUpdateAllergies(
      selectedPatient.id,
      buildAllergyPayload(
        nextAllergies,
        removeReason,
        'removed',
        false,
        removedAllergy?.drug || '',
        removedAllergy?.reaction || ''
      )
    );
    setShowRemoveModal(false);
    setRemovingAllergyIndex(null);
    setRemoveReason('');
  };

  const handleDischarge = async () => {
    if (!selectedPatient || !onDischargePatient) {
      return;
    }

    try {
      await onDischargePatient(selectedPatient.id);
      setShowDischargeModal(false);
    } catch (_error) {
      // App-level toast now surfaces the failure.
    }
  };

  const handleReadmit = async () => {
    if (!readmitTarget || !onReadmitPatient) {
      return;
    }

    try {
      await onReadmitPatient(readmitTarget.id, {
        stayType: readmitStayType,
        wardName: readmitWardName,
      });
      setShowReadmitModal(false);
      setReadmitTarget(null);
    } catch (_error) {
      // App-level toast surfaces the failure.
    }
  };

  const renderActionButton = ({ id, icon, label, variant = 'outline-primary', onClick }) => (
    <OverlayTrigger
      placement="top"
      overlay={<Tooltip id={id}>{label}</Tooltip>}
    >
      <Button type="button" size="sm" variant={variant} className="epma-action-icon-button" onClick={onClick} aria-label={label}>
        <i className={icon} aria-hidden="true" />
      </Button>
    </OverlayTrigger>
  );

  const renderSearchPanel = (compact = false) => (
    <Card className={`container-shadow ${compact ? 'epma-search-strip' : ''} h-100`}>
      <Card.Body>
        <div className={`d-flex ${compact ? 'justify-content-between align-items-start flex-wrap gap-3' : 'flex-column'}`}>
          <div>
            <h4 className="mb-1">Find a patient</h4>
            <p className="text-muted mb-0">Search by NHS number, hospital number, or use first name together with surname to reduce mis-selection risk.</p>
          </div>
          {!compact ? null : <Button type="button" variant="outline-secondary" onClick={() => setSearchFields(emptySearchFields)}>Clear</Button>}
        </div>
        <Form onSubmit={handleSubmitSearch} className="mt-3">
          <Row className="g-3 align-items-end">
            <Col md={6} lg={3}>
              <Form.Group controlId="patientSearchNhsNumber">
                <Form.Label>NHS number</Form.Label>
                <Form.Control
                  type="text"
                  name="patient-search-nhs-number"
                  autoComplete="off"
                  value={searchFields.nhsNumber}
                  onChange={(event) => setSearchField('nhsNumber', event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleSubmitSearch(event);
                    }
                  }}
                  placeholder="1234567890"
                  isInvalid={Boolean(searchErrors.nhsNumber)}
                />
                <Form.Control.Feedback type="invalid">{searchErrors.nhsNumber}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6} lg={3}>
              <Form.Group controlId="patientSearchHospitalNumber">
                <Form.Label>Hospital number</Form.Label>
                <Form.Control
                  type="text"
                  name="patient-search-hospital-number"
                  autoComplete="off"
                  value={searchFields.hospitalNumber}
                  onChange={(event) => setSearchField('hospitalNumber', event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleSubmitSearch(event);
                    }
                  }}
                  placeholder="1234567A"
                  isInvalid={Boolean(searchErrors.hospitalNumber)}
                />
                <Form.Control.Feedback type="invalid">{searchErrors.hospitalNumber}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6} lg={3}>
              <Form.Group controlId="patientSearchFirstName">
                <Form.Label>First name</Form.Label>
                <Form.Control
                  type="text"
                  name="patient-search-first-name"
                  autoComplete="off"
                  value={searchFields.firstName}
                  onChange={(event) => setSearchField('firstName', event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleSubmitSearch(event);
                    }
                  }}
                  placeholder="John"
                  isInvalid={Boolean(searchErrors.firstName)}
                />
                <Form.Control.Feedback type="invalid">{searchErrors.firstName}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={6} lg={3}>
              <Form.Group controlId="patientSearchSurname">
                <Form.Label>Surname</Form.Label>
                <Form.Control
                  type="text"
                  name="patient-search-surname"
                  autoComplete="off"
                  value={searchFields.surname}
                  onChange={(event) => setSearchField('surname', event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleSubmitSearch(event);
                    }
                  }}
                  placeholder="Smith"
                  isInvalid={Boolean(searchErrors.surname)}
                />
                <Form.Control.Feedback type="invalid">{searchErrors.surname}</Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>
          {missingSearchPair ? <div className="epma-search-validation mt-2">{searchPairMessage}</div> : null}
          <div className="d-flex gap-2 flex-wrap mt-3">
            <Button type="submit" disabled={missingSearchPair}>Search patient</Button>
            {!compact ? (
              <Button
                type="button"
                variant="outline-secondary"
                onClick={() => {
                  setSearchFields(emptySearchFields);
                  setSearchErrors(emptySearchErrors);
                  setShowSearchMatches(false);
                }}
              >
                Clear
              </Button>
            ) : null}
          </div>
        </Form>
        {searchErrors.general ? <Alert className="mt-3 mb-0" variant="warning">{searchErrors.general}</Alert> : null}
        {searchState === 'not-found' ? <Alert className="mt-3 mb-0" variant="warning">No patients found.</Alert> : null}
      </Card.Body>
    </Card>
  );

  return (
    <>
      <Container className="mt-2 mb-2">
        {!selectedPatient ? (
          <>
            <Card className="container-shadow mt-2">
              <Card.Body>
                <h3 className="mb-1">EPMA</h3>
                <p className="text-muted mb-0">Search a training patient or admit your own autogenerated test patient.</p>
              </Card.Body>
            </Card>

            <Row className="g-2 mt-1 align-items-stretch">
              <Col lg="auto">
                <Card
                  className="container-shadow epma-entry-card epma-entry-card--action h-100"
                  role="button"
                  tabIndex={0}
                  onClick={() => setShowCreateModal(true)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setShowCreateModal(true);
                    }
                  }}
                >
                  <Card.Body className="epma-entry-card__body epma-entry-card__body--square">
                    <div className="epma-entry-card__icon epma-entry-card__icon--classic">
                      <i className="bi bi-person-plus" aria-hidden="true" />
                    </div>
                    <div className="text-muted epma-entry-card__title">Admit Patient</div>
                  </Card.Body>
                </Card>
              </Col>
              <Col lg>
                {renderSearchPanel(false)}
              </Col>
            </Row>
          </>
        ) : null}

        {!selectedPatient && showSearchMatches && searchResults.length ? (
          <Card className="container-shadow mt-3">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                <div>
                  <h5 className="mb-1">Search Matches</h5>
                  <p className="text-muted mb-0">Results returned from your current patient search.</p>
                </div>
                <button
                  type="button"
                  className="epma-close-button"
                  onClick={() => setShowSearchMatches(false)}
                  aria-label="Close search matches"
                >
                  <i className="bi bi-x-lg" aria-hidden="true" />
                </button>
              </div>
              <div className="epma-search-results-grid">
                {searchResults.map((patient) => (
                  <Card
                    key={patient.id}
                    className="epma-search-result-card container-shadow"
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectPatient(patient.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelectPatient(patient.id);
                      }
                    }}
                  >
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-start gap-3">
                        <div>
                          <h6 className="mb-1">{patient.fullName}</h6>
                          <div className="small text-muted">DOB: {patient.dateOfBirth}</div>
                          <div className="small text-muted">Hospital no: {patient.hospitalNumber}</div>
                          <div className="small text-muted">NHS no: {patient.nhsNumber}</div>
                          <div className="small text-muted">Last updated: {new Date(patient.updatedAt).toLocaleString('en-GB')}</div>
                          <div className="small text-muted text-capitalize">Status: {patient.episodeStatus || 'active'}</div>
                        </div>
                        <div className="d-flex align-items-start">
                          {renderActionButton({
                            id: `match-open-${patient.id}`,
                            icon: patient.episodeStatus === 'discharged' ? 'bi bi-eye' : 'bi bi-arrow-right',
                            label: patient.episodeStatus === 'discharged' ? 'View chart' : 'Open chart',
                            variant: patient.episodeStatus === 'discharged' ? 'outline-secondary' : 'primary',
                            onClick: () => onSelectPatient(patient.id),
                          })}
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            </Card.Body>
          </Card>
        ) : null}

        {!selectedPatient ? (
          <Card className="container-shadow mt-3">
            <Card.Body>
              <button
                type="button"
                className="epma-section-toggle"
                onClick={() => setShowRecentPatients((current) => !current)}
                aria-expanded={showRecentPatients}
              >
                <div>
                  <h5 className="mb-1 d-flex align-items-center gap-2">
                    Previously Accessed Patients
                    <Badge bg="secondary" pill>{recentPatients?.length || 0}</Badge>
                  </h5>
                  <p className="text-muted mb-0">Patients you have already opened in this workspace.</p>
                </div>
                <span className="epma-section-toggle__label">{showRecentPatients ? 'Hide' : 'Show'}</span>
              </button>
              {showRecentPatients ? (
                recentPatients?.length ? (
                  <Table responsive hover size="sm" className="mb-0 epma-patient-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>DOB</th>
                        <th>Hospital no.</th>
                        <th>NHS no.</th>
                        <th>Last updated</th>
                        <th className="text-center align-middle">Admission <br />Status</th>
                        <th className="text-center epma-patient-table__action-col">Prescription Chart</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentPatients.map((patient) => (
                        <tr key={`recent-${patient.id}`}>
                          <td>{patient.fullName}</td>
                          <td>{patient.dateOfBirth}</td>
                          <td>{patient.hospitalNumber}</td>
                          <td>{patient.nhsNumber}</td>
                          <td>{new Date(patient.updatedAt).toLocaleString('en-GB')}</td>
                          <td className="text-capitalize text-center align-middle">{patient.episodeStatus || 'active'}</td>
                          <td className="text-center align-middle">
                            {renderActionButton({
                              id: `recent-open-${patient.id}`,
                              icon: patient.episodeStatus === 'discharged' ? 'bi bi-eye' : 'bi bi-arrow-right',
                              label: patient.episodeStatus === 'discharged' ? 'View chart' : 'Open chart',
                              variant: patient.episodeStatus === 'discharged' ? 'outline-secondary' : 'primary',
                              onClick: () => onSelectPatient(patient.id),
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                ) : (
                  <Alert variant="light" className="mb-0">No previously accessed patients.</Alert>
                )
              ) : null}
            </Card.Body>
          </Card>
        ) : null}
      </Container>

      {selectedPatient ? (
        <>
          <div className="epma-subnav">
            <div className="epma-subnav__inner">
              <button type="button" className="epma-subnav__link" onClick={onBackToFinder}>
                <i className="bi bi-arrow-left-short" aria-hidden="true" />
                Back to patient finder
              </button>
              {!isDischargedEpisode ? (
                <button
                  type="button"
                  className="epma-subnav__link epma-subnav__link--danger"
                  onClick={() => setShowDischargeModal(true)}
                >
                  <i className="bi bi-box-arrow-right" aria-hidden="true" />
                  Discharge Patient
                </button>
              ) : null}
            </div>
          </div>

          {isDischargedEpisode ? (
            <div className="viewport-band">
              <Alert variant="warning" className="mt-3 mb-0">
                This episode is discharged and view only. Re-admit the patient to resume editing.
              </Alert>
            </div>
          ) : null}

          <div className="viewport-band">
            <PatientDetails
              patient={{
                name: selectedPatient.fullName,
                hospitalNo: selectedPatient.hospitalNumber,
                nhsNumber: selectedPatient.nhsNumber,
                dob: selectedPatient.dateOfBirth,
                weight: selectedPatient.weight,
                height: selectedPatient.height,
                stayType: selectedPatient.stayType,
                wardName: selectedPatient.wardName,
                weightRecordedAt: selectedPatient.weightRecordedAt,
                heightRecordedAt: selectedPatient.heightRecordedAt,
                measurementHistory: selectedPatient.measurementHistory || [],
                gender: selectedPatient.gender,
                address: selectedPatient.address,
                episodeStatus: selectedPatient.episodeStatus,
                admittedAt: selectedPatient.admittedAt || selectedPatient.createdAt,
                dischargedAt: selectedPatient.dischargedAt,
              }}
              allergies={selectedPatient.nkda ? [{ drug: 'NKDA', reaction: 'No known drug allergies' }] : patientAllergies}
              allergyHistory={patientHistory}
              onOpenAllergyManagement={isDischargedEpisode ? undefined : () => setShowAllergyManagementModal(true)}
              onSaveMeasurements={isDischargedEpisode ? undefined : (payload) => onUpdateMeasurements(selectedPatient.id, payload)}
              onDeleteMeasurement={isDischargedEpisode ? undefined : (measurementId) => onDeleteMeasurement(selectedPatient.id, measurementId)}
            />
          </div>

          <div className="viewport-band mt-2">
            <PatientRecordsContainer
              patient_records={{
                case_notes: selectedPatient.caseNotes || {},
                case_notes_history: selectedPatient.caseNotesHistory || [],
                biochemistry: selectedPatient.biochemistry || {},
                microbiology: selectedPatient.microbiology || [],
                observations: selectedPatient.observations || {},
                imaging: selectedPatient.imaging || [],
              }}
              commonConditions={commonConditions}
              drugLibrary={drugLibrary}
              onSaveCaseNotes={(payload) => onUpdateCaseNotes(selectedPatient.id, payload)}
            />
          </div>

          <div className="viewport-band mt-3">
            <Prescription
              prescriptions={selectedPatient.prescriptions || []}
              prescribingStatus={!isDischargedEpisode}
              drugLibrary={drugLibrary}
              patient={selectedPatient}
              onChange={(nextPrescriptions) => onUpdatePrescriptions(selectedPatient.id, nextPrescriptions)}
              onApprovalToast={onApprovalToast}
              onVerifyWitness={onVerifyWitness}
              onBlockedPrescribe={onBlockedPrescribe}
              administratorName={currentUser?.displayName || 'Student user'}
              prescriberName={currentUser?.displayName || 'Student user'}
            />
          </div>
        </>
      ) : null}

      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Admit a test patient</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3" controlId="newPatientGender">
              <Form.Label>Gender</Form.Label>
              <Form.Select value={gender} onChange={(event) => setGender(event.target.value)}>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3" controlId="newPatientStayType">
              <Form.Label>Inpatient stay type</Form.Label>
              <Form.Select value={stayType} onChange={(event) => setStayType(event.target.value)}>
                <option value="A/E">A/E</option>
                <option value="Ward inpatient">Ward inpatient</option>
                <option value="Daycase">Daycase</option>
                <option value="Theatre">Theatre</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3" controlId="newPatientAge">
              <Form.Label>Approximate age</Form.Label>
              <Form.Range min={18} max={95} value={ageYears} onChange={(event) => setAgeYears(event.target.value)} />
              <div className="text-muted small">{ageYears} years</div>
            </Form.Group>
            <Form.Group className="mb-3" controlId="newPatientWeight">
              <Form.Label>Weight</Form.Label>
              <Form.Range min={35} max={180} value={weightKg} onChange={(event) => setWeightKg(event.target.value)} />
              <div className="text-muted small">{weightKg} kg</div>
            </Form.Group>
            <Form.Group className="mb-3" controlId="newPatientHeight">
              <Form.Label>Height</Form.Label>
              <Form.Range min={120} max={220} value={heightCm} onChange={(event) => setHeightCm(event.target.value)} />
              <div className="text-muted small">{heightCm} cm</div>
            </Form.Group>
          </Form>

          <Alert variant="info">
            <strong>Generated patient preview</strong>
            <div className="mt-2">{generatedPatient.fullName}</div>
            <div>{generatedPatient.dateOfBirth}</div>
            <div>{generatedPatient.address}</div>
            <div>{generatedPatient.stayType} | {generatedPatient.wardName}</div>
            <div>{generatedPatient.gender} | {generatedPatient.weight} | {generatedPatient.height}</div>
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="outline-secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
          <Button type="button" onClick={handleCreate}>Admit patient</Button>
        </Modal.Footer>
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

      <Modal show={showDischargeModal} onHide={() => setShowDischargeModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Discharge patient</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedPatient ? (
            <p className="mb-0">
              Discharge <strong>{selectedPatient.fullName}</strong> from the current episode? <br/>The chart will be available as view only and you can re-admit the patient to resume editing.
            </p>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="outline-secondary" onClick={() => setShowDischargeModal(false)}>Cancel</Button>
          <Button type="button" variant="danger" onClick={handleDischarge}>Confirm discharge</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showReadmitModal} onHide={() => setShowReadmitModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Re-admit patient</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3" controlId="readmitStayType">
            <Form.Label>Inpatient stay type</Form.Label>
            <Form.Select
              value={readmitStayType}
              onChange={(event) => {
                const nextStayType = event.target.value;
                setReadmitStayType(nextStayType);
                setReadmitWardName(buildRandomWardName(nextStayType));
              }}
            >
              <option value="A/E">A/E</option>
              <option value="Ward inpatient">Ward inpatient</option>
              <option value="Daycase">Daycase</option>
              <option value="Theatre">Theatre</option>
            </Form.Select>
          </Form.Group>
          <Alert variant="info" className="mb-0">
            <strong>Ward assignment</strong>
            <div className="mt-2">{readmitWardName}</div>
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="outline-secondary" onClick={() => setShowReadmitModal(false)}>Cancel</Button>
          <Button type="button" onClick={handleReadmit}>Confirm re-admit</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showAllergyManagementModal} onHide={closeAllergyManagementModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Allergies
            {selectedPatient ? <div className="small text-muted fw-normal mt-1">{selectedPatient.fullName}</div> : null}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-3">
            <div>
              <p className="text-muted mb-0">Modify Patients Allergy Status</p>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <Button type="button" variant="outline-secondary" onClick={handleConfirmAllergyReview}>
                Confirm allergy review
              </Button>
              <Button type="button" variant="outline-secondary" onClick={() => setShowHistoryModal(true)}>History</Button>
            </div>
          </div>

          <div className="epma-allergy-editor border rounded px-3 py-3 mt-2">
            <div>
                <Button type="button" variant={selectedPatient?.nkda ? 'danger' : 'outline-danger'} onClick={() => handleToggleNkda(!selectedPatient?.nkda)}>
                  {selectedPatient?.nkda ? 'No known Drug Allergies' : 'Record As No known Drug Allergies'}
                </Button>
              </div>
            <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-3 mt-3">
               
              <div>
                <h4 className="mb-1">{editingAllergyIndex !== null ? 'Edit an allergy' : 'Add an allergy'}</h4>
              </div>
             
            </div>
            <Row className="g-3">
              <Col md={4}>
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
              <Col md={4}>
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
                    {reactionOptions.map((item) => (
                      <option key={item.id} value={item.label}>{item.label}{item.blocksPrescribing ? ' (blocks prescribing)' : ''}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group controlId="allergyReason">
                  <Form.Label>Reason for change</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={allergyReason}
                    onChange={(event) => {
                      setAllergyFormError('');
                      setAllergyReason(event.target.value);
                    }}
                    placeholder="Document why this allergy is being added or amended"
                  />
                </Form.Group>
              </Col>
            </Row>
            {allergyFormError ? <Alert variant="danger" className="mt-3 mb-0">{allergyFormError}</Alert> : null}
            <div className="d-flex justify-content-end gap-2 mt-3">
              <Button type="button" variant="outline-secondary" onClick={resetAllergyEditor}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSaveAllergy} disabled={!allergyDraft.drug || !allergyDraft.reaction || !allergyReason.trim()}>
                Save allergy
              </Button>
            </div>
          </div>

          {selectedPatient?.nkda ? (
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
            <Alert variant="light" className="mb-0 mt-3">No allergies recorded for this training patient.</Alert>
          )}
        </Modal.Body>
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

export default StudentEpmaWorkspace;
