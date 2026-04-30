import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  const searchPanelRef = useRef(null);
  const recentPatientsRef = useRef(null);
  const admitPatientRef = useRef(null);
  const chartSubnavRef = useRef(null);
  const patientBannerRef = useRef(null);
  const patientRecordsRef = useRef(null);
  const prescriptionChartRef = useRef(null);
  const prescribeButtonRef = useRef(null);
  const prescriptionDrugRef = useRef(null);
  const prescriptionDoseRef = useRef(null);
  const prescriptionRouteFrequencyRef = useRef(null);
  const prescriptionTimingRef = useRef(null);
  const prescriptionIndicationRef = useRef(null);
  const prescriptionSaveRef = useRef(null);
  const taskButtonRef = useRef(null);
  const taskTitleRef = useRef(null);
  const taskProfessionRef = useRef(null);
  const taskDescriptionRef = useRef(null);
  const taskListRef = useRef(null);
  const medRecPanelRef = useRef(null);
  const medRecDetailsRef = useRef(null);
  const medRecMedicinesRef = useRef(null);
  const medRecNotesRef = useRef(null);
  const allergyEditorRef = useRef(null);
  const allergyNkdaRef = useRef(null);
  const allergyDrugRef = useRef(null);
  const allergyReactionFieldRef = useRef(null);
  const allergyInfoRef = useRef(null);
  const allergySaveRef = useRef(null);
  const allergyListRef = useRef(null);
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
  const [newPatientPrivate, setNewPatientPrivate] = useState(true);
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
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialCardStyle, setTutorialCardStyle] = useState({});
  const [showChartTutorial, setShowChartTutorial] = useState(false);
  const [chartTutorialStep, setChartTutorialStep] = useState(0);
  const [chartTutorialCardStyle, setChartTutorialCardStyle] = useState({});
  const [showChartTutorialExitConfirm, setShowChartTutorialExitConfirm] = useState(false);
  const [showTasksPanel, setShowTasksPanel] = useState(false);
  const [clinicalNotesLaunchRequest, setClinicalNotesLaunchRequest] = useState(null);
  const [showPharmacyPanel, setShowPharmacyPanel] = useState(false);

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
  const derivedVteAssessment = useMemo(() => {
    const caseNotes = selectedPatient?.caseNotes || {};
    const vteNote = Array.isArray(caseNotes.notes)
      ? caseNotes.notes.find((note) => note?.noteType === 'vteAssessment')
      : null;
    if (!vteNote) {
      return { ...(caseNotes.vteAssessment || {}), status: 'Not done' };
    }
    return {
      ...(caseNotes.vteAssessment || {}),
      status: 'Complete',
      noteId: caseNotes.vteAssessment?.noteId || caseNotes.vteAssessment?.note_id || vteNote.id || '',
      authoredAt: caseNotes.vteAssessment?.authoredAt || caseNotes.vteAssessment?.authored_at || vteNote.authoredAt || '',
      author: caseNotes.vteAssessment?.author || vteNote.author || '',
    };
  }, [selectedPatient?.caseNotes]);
  const tutorialSteps = useMemo(() => ([
    {
      key: 'search',
      title: 'Find a patient',
      body: 'Here you can search shared patients in the workspace, as well as your own admitted patients. EPMA systems can carry significant risk of mis-selection, so a unique patient identifier search such as NHS number or hospital number is always preferred. Always confirm the demographic details before opening a chart.',
      ref: searchPanelRef,
    },
    {
      key: 'recent',
      title: 'Previously accessed patients',
      body: 'Any previously accessed patients will appear in this section.',
      ref: recentPatientsRef,
    },
    {
      key: 'admit',
      title: 'Admit new patient',
      body: 'To get started click admit new patient',
      ref: admitPatientRef,
    },
  ]), []);
  const chartTutorialSteps = useMemo(() => ([
    {
      key: 'chart-nav',
      title: 'Patient chart controls',
      body: 'Use this bar to return to patient finder or discharge an active training episode. If a patient is discharged, the chart becomes view only until readmitted.',
      ref: chartSubnavRef,
    },
    {
      key: 'patient-banner',
      title: 'Check the patient first',
      body: 'Start by confirming demographics, ward, weight and height. The status badges open key safety workflows: allergies, medication reconciliation, and VTE assessment.',
      ref: patientBannerRef,
    },
    {
      key: 'patient-records',
      title: 'Patient records',
      body: 'Open Clinical Notes for history and VTE assessment, Pharmacy for medication reconciliation, Tasks for follow-up work, and the laboratory, observation, and imaging sections to review clinical data.',
      ref: patientRecordsRef,
    },
    {
      key: 'allergy-open',
      title: 'Adding allergies',
      body: 'The allergy status badge opens the allergy record. In this guide the allergy modal opens automatically so you can see each field in context.',
      ref: allergyEditorRef,
    },
    {
      key: 'allergy-nkda',
      title: 'No known drug allergies',
      body: 'Use this only when the patient has been checked and has no known drug allergies. Recording NKDA clears the active allergy list and adds an audit entry.',
      ref: allergyNkdaRef,
    },
    {
      key: 'allergy-drug',
      title: 'Drug or substance',
      body: 'Start typing at least 3 characters to search the drug library, then select the correct medicine. Once selected, click the name again if you need to change it.',
      ref: allergyDrugRef,
    },
    {
      key: 'allergy-reaction',
      title: 'Reaction',
      body: 'Choose the reaction reported by the patient or record. Some reactions are marked as blocking prescribing, which means later prescribing checks can stop unsafe orders.',
      ref: allergyReactionFieldRef,
    },
    {
      key: 'allergy-info',
      title: 'Additional info',
      body: 'Use this for useful context such as source, approximate date, severity, uncertainty, or why an allergy has been edited.',
      ref: allergyInfoRef,
    },
    {
      key: 'allergy-save',
      title: 'Save allergy',
      body: 'The save button becomes available once both drug and reaction are completed. Saving updates the active allergy list and records the change in allergy history.',
      ref: allergySaveRef,
    },
    {
      key: 'allergy-list',
      title: 'Review existing allergies',
      body: 'Current allergies are shown here. Use Edit to correct an entry, Remove to retire an incorrect allergy with a reason, and Allergy History to review the audit trail.',
      ref: allergyListRef,
    },
    {
      key: 'med-rec',
      title: 'Medication reconciliation',
      body: 'The Pharmacy panel opens the medication reconciliation form. It captures where the history came from and the current reconciliation status.',
      ref: medRecPanelRef,
    },
    {
      key: 'med-rec-details',
      title: 'History details',
      body: 'Record the med rec source, blister pack status, community pharmacy, patients own supply, and reconciliation status. These key fields autosave as they change.',
      ref: medRecDetailsRef,
    },
    {
      key: 'med-rec-medicines',
      title: 'Medication history medicines',
      body: 'Use the medicines table to add medicines from the patient history, edit existing entries, or remove incorrect entries.',
      ref: medRecMedicinesRef,
    },
    {
      key: 'med-rec-notes',
      title: 'Med rec notes',
      body: 'Use the note field for useful context, uncertainties, or follow-up information. Use Save Med Rec for note changes and other manual updates.',
      ref: medRecNotesRef,
    },
    {
      key: 'vte',
      title: 'VTE assessment',
      body: 'Use the VTE status badge to add the VTE assessment note. The badge changes from not done to complete once a VTE assessment note has been saved.',
      ref: patientBannerRef,
    },
    {
      key: 'prescribe-button',
      title: 'Prescribe medication',
      body: 'Use Prescribe medication to open the order form. Allergy status must be recorded before prescribing is allowed.',
      ref: prescribeButtonRef,
    },
    {
      key: 'prescribe-drug',
      title: 'Choose the medicine',
      body: 'Search the drug library and select the intended medicine. Selecting a library item can prefill defaults such as route, dose, frequency, form, and unit.',
      ref: prescriptionDrugRef,
    },
    {
      key: 'prescribe-dose',
      title: 'Dose and unit',
      body: 'Enter the dose, select fixed or range dosing where needed, and check unit details. Specialist drugs such as insulin or warfarin may show extra dose controls.',
      ref: prescriptionDoseRef,
    },
    {
      key: 'prescribe-route-frequency',
      title: 'Route and frequency',
      body: 'Confirm route and frequency. Scheduled medicines use administration times, while PRN and stat medicines change the timing fields shown.',
      ref: prescriptionRouteFrequencyRef,
    },
    {
      key: 'prescribe-timing',
      title: 'Start, stop, stat and PRN',
      body: 'Start with the start date and time, then add stop details where the medicine should end. Stat and PRN options change how timing behaves, including the PRN maximum in 24 hours.',
      ref: prescriptionTimingRef,
    },
    {
      key: 'prescribe-indication',
      title: 'Indication and notes',
      body: 'Record why the medicine is being prescribed and any extra prescribing notes. This helps reviewers understand the clinical intent.',
      ref: prescriptionIndicationRef,
    },
    {
      key: 'prescribe-save',
      title: 'Complete the prescription',
      body: 'Validation messages appear before saving if required fields are missing or unsafe. Saving adds the medicine to the active prescription chart.',
      ref: prescriptionSaveRef,
    },
    {
      key: 'task-button',
      title: 'Create a task',
      body: 'Use New task to add a general follow-up task, or create tasks from individual prescriptions when the work relates to a specific medicine.',
      ref: taskButtonRef,
    },
    {
      key: 'task-title',
      title: 'Task details',
      body: 'Give the task a clear title so the required action is visible in the task list.',
      ref: taskTitleRef,
    },
    {
      key: 'task-profession',
      title: 'Assigned profession',
      body: 'Choose who should pick up the task, such as doctor, nurse, pharmacist, or another profession.',
      ref: taskProfessionRef,
    },
    {
      key: 'task-description',
      title: 'Additional detail',
      body: 'Use the detail box for context, urgency, or exact follow-up instructions.',
      ref: taskDescriptionRef,
    },
    {
      key: 'task-list',
      title: 'Task list',
      body: 'The Tasks panel shows open and completed tasks. From here users can complete, reopen, suppress, or review task history.',
      ref: taskListRef,
    },
  ]), []);
  const missingSearchPair = false;
  const searchPairMessage = '';

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
    await onCreatePatient({
      ...generatedPatient,
      isPrivate: newPatientPrivate,
    });
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
    if (!selectedPatient || !allergyDraft.drug || !allergyDraft.reaction) {
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
            <p className="text-muted mb-0">Search by NHS number, hospital number, first name, or surname. Unique identifiers are still the safest option.</p>
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

  useEffect(() => {
    if (selectedPatient || showCreateModal || !currentUser) {
      return;
    }

    if (recentPatients?.length) {
      setShowTutorial(false);
      setTutorialStep(0);
      return;
    }

    setShowTutorial(true);
    setTutorialStep(0);
  }, [currentUser, recentPatients, selectedPatient, showCreateModal]);

  useEffect(() => {
    if (!showTutorial || selectedPatient) {
      return;
    }

    if (tutorialSteps[tutorialStep]?.key === 'recent') {
      setShowRecentPatients(true);
    }

    const targetNode = tutorialSteps[tutorialStep]?.ref?.current;
    if (targetNode?.scrollIntoView) {
      targetNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedPatient, showTutorial, tutorialStep, tutorialSteps]);

  useEffect(() => {
    if (!showTutorial || selectedPatient) {
      setTutorialCardStyle({});
      return;
    }

    const updateTutorialCardPosition = () => {
      const targetNode = tutorialSteps[tutorialStep]?.ref?.current;
      if (!targetNode) {
        setTutorialCardStyle({});
        return;
      }

      const rect = targetNode.getBoundingClientRect();
      const cardWidth = Math.min(420, window.innerWidth - 32);
      const gutter = 16;
      const canPlaceRight = rect.right + gutter + cardWidth <= window.innerWidth - 16;
      const canPlaceLeft = rect.left - gutter - cardWidth >= 16;

      let left;
      let top;

      if (canPlaceRight) {
        left = rect.right + gutter;
        top = Math.max(16, rect.top);
      } else if (canPlaceLeft) {
        left = rect.left - cardWidth - gutter;
        top = Math.max(16, rect.top);
      } else {
        left = Math.max(16, Math.min(rect.left, window.innerWidth - cardWidth - 16));
        top = Math.min(window.innerHeight - 220, rect.bottom + gutter);
      }

      setTutorialCardStyle({
        width: `${cardWidth}px`,
        top: `${Math.max(16, top)}px`,
        left: `${Math.max(16, left)}px`,
      });
    };

    updateTutorialCardPosition();
    window.addEventListener('resize', updateTutorialCardPosition);
    window.addEventListener('scroll', updateTutorialCardPosition, true);

    return () => {
      window.removeEventListener('resize', updateTutorialCardPosition);
      window.removeEventListener('scroll', updateTutorialCardPosition, true);
    };
  }, [selectedPatient, showTutorial, tutorialStep, tutorialSteps]);

  useEffect(() => {
    if (!showChartTutorial || !selectedPatient) {
      return;
    }

    const activeStep = chartTutorialSteps[chartTutorialStep];
    if (activeStep?.key?.startsWith('allergy-') && !isDischargedEpisode) {
      setShowAllergyManagementModal(true);
    } else if (showAllergyManagementModal) {
      setShowAllergyManagementModal(false);
    }

    if (activeStep?.key?.startsWith('med-rec')) {
      setShowPharmacyPanel(true);
    } else if (showPharmacyPanel) {
      setShowPharmacyPanel(false);
    }

    if (activeStep?.key?.startsWith('task-')) {
      setShowTasksPanel(true);
    } else if (showTasksPanel) {
      setShowTasksPanel(false);
    }

    const targetNode = activeStep?.ref?.current;
    if (targetNode?.scrollIntoView) {
      targetNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [chartTutorialStep, chartTutorialSteps, isDischargedEpisode, selectedPatient, showAllergyManagementModal, showChartTutorial, showPharmacyPanel, showTasksPanel]);

  useEffect(() => {
    if (!showChartTutorial || !selectedPatient) {
      setChartTutorialCardStyle({});
      return;
    }

    const updateChartTutorialCardPosition = () => {
      const activeStep = chartTutorialSteps[chartTutorialStep];
      if (activeStep?.key?.startsWith('prescribe-') && activeStep.key !== 'prescribe-button') {
        const cardWidth = Math.min(360, window.innerWidth - 32);
        setChartTutorialCardStyle({
          width: `${cardWidth}px`,
          top: 'auto',
          left: window.innerWidth < 768 ? '16px' : 'auto',
          right: '16px',
          bottom: '16px',
          maxHeight: '42vh',
          overflowY: 'auto',
        });
        return;
      }

      const targetNode = activeStep?.ref?.current;
      if (!targetNode) {
        setChartTutorialCardStyle({});
        return;
      }

      const rect = targetNode.getBoundingClientRect();
      const cardWidth = Math.min(440, window.innerWidth - 32);
      const gutter = 16;
      const canPlaceRight = rect.right + gutter + cardWidth <= window.innerWidth - 16;
      const canPlaceLeft = rect.left - gutter - cardWidth >= 16;

      let left;
      let top;

      if (canPlaceRight) {
        left = rect.right + gutter;
        top = Math.max(16, rect.top);
      } else if (canPlaceLeft) {
        left = rect.left - cardWidth - gutter;
        top = Math.max(16, rect.top);
      } else {
        left = Math.max(16, Math.min(rect.left, window.innerWidth - cardWidth - 16));
        top = Math.min(window.innerHeight - 240, rect.bottom + gutter);
      }

      setChartTutorialCardStyle({
        width: `${cardWidth}px`,
        top: `${Math.max(16, top)}px`,
        left: `${Math.max(16, left)}px`,
      });
    };

    updateChartTutorialCardPosition();
    window.addEventListener('resize', updateChartTutorialCardPosition);
    window.addEventListener('scroll', updateChartTutorialCardPosition, true);

    return () => {
      window.removeEventListener('resize', updateChartTutorialCardPosition);
      window.removeEventListener('scroll', updateChartTutorialCardPosition, true);
    };
  }, [chartTutorialStep, chartTutorialSteps, selectedPatient, showChartTutorial]);

  const closeTutorial = () => {
    setShowTutorial(false);
    setTutorialStep(0);
  };

  const closeChartTutorial = ({ reset = false } = {}) => {
    setShowChartTutorial(false);
    setShowChartTutorialExitConfirm(false);
    if (reset) {
      setChartTutorialStep(0);
    }
  };

  const requestCloseChartTutorial = () => {
    if (chartTutorialStep > 0) {
      setShowChartTutorialExitConfirm(true);
      return;
    }
    closeChartTutorial();
  };

  const finishChartTutorial = () => {
    closeChartTutorial({ reset: true });
  };

  const activeTutorialStep = showTutorial ? tutorialSteps[tutorialStep] : null;
  const activeChartTutorialStep = showChartTutorial ? chartTutorialSteps[chartTutorialStep] : null;
  const isTutorialTargetActive = (key) => activeTutorialStep?.key === key;
  const isChartTutorialTargetActive = (key) => activeChartTutorialStep?.key === key;

  return (
    <>
      <Container className="mt-2 mb-2">
        {!selectedPatient ? (
          <>
            <div className="container-shadow mt-2 student-epma-header">

                <h3 className="mb-1">EPMA</h3>
                <p className="mb-0">Search a training patient or admit your own autogenerated test patient.</p>
                <Button type="button" variant="outline-light" className="btn-sm mt-2" onClick={onBack}>
                  <i className="bi bi-arrow-left"></i>{' '}
                  Back
                </Button>
            </div>

            <Row className="g-2 mt-1 align-items-stretch">
              <Col lg="auto">
                <div
                  ref={admitPatientRef}
                  className={isTutorialTargetActive('admit') ? 'epma-tutorial-target epma-tutorial-target--active' : ''}
                >
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
                      <div className="text-muted epma-entry-card__title">Admit New Patient</div>
                    </Card.Body>
                  </Card>
                </div>
              </Col>
              <Col lg>
                <div
                  ref={searchPanelRef}
                  className={isTutorialTargetActive('search') ? 'epma-tutorial-target epma-tutorial-target--active' : ''}
                >
                  {renderSearchPanel(false)}
                </div>
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
          <div
            ref={recentPatientsRef}
            className={isTutorialTargetActive('recent') ? 'epma-tutorial-target epma-tutorial-target--active' : ''}
          >
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
          </div>
        ) : null}
      </Container>

      {showTutorial && !selectedPatient ? (
        <div className="epma-tutorial-overlay" role="dialog" aria-modal="true" aria-labelledby="epmaTutorialTitle">
          <div className="epma-tutorial-overlay__backdrop" onClick={closeTutorial} />
          <Card className="epma-tutorial-card container-shadow" style={tutorialCardStyle}>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                <div>
                  <div className="epma-tutorial-card__eyebrow">
                    Step {tutorialStep + 1} of {tutorialSteps.length}
                  </div>
                  <h4 id="epmaTutorialTitle" className="mb-1">{activeTutorialStep?.title}</h4>
                </div>
                <button type="button" className="epma-close-button" onClick={closeTutorial} aria-label="Skip tutorial">
                  <i className="bi bi-x-lg" aria-hidden="true" />
                </button>
              </div>
              <p className="mb-0">{activeTutorialStep?.body}</p>
              <div className="epma-tutorial-card__actions">
                <Button type="button" variant="outline-secondary" onClick={closeTutorial}>
                  Skip
                </Button>
                <div className="d-flex gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline-secondary"
                    onClick={() => setTutorialStep((current) => Math.max(0, current - 1))}
                    disabled={tutorialStep === 0}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (tutorialStep === tutorialSteps.length - 1) {
                        closeTutorial();
                        return;
                      }
                      setTutorialStep((current) => current + 1);
                    }}
                  >
                    {tutorialStep === tutorialSteps.length - 1 ? 'Finish' : 'Next'}
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>
      ) : null}

      {showChartTutorial && selectedPatient ? (
        <div className="epma-tutorial-overlay" role="dialog" aria-modal="true" aria-labelledby="epmaChartTutorialTitle">
          <div className="epma-tutorial-overlay__backdrop" onClick={showChartTutorialExitConfirm ? undefined : requestCloseChartTutorial} />
          {showChartTutorialExitConfirm ? (
            <Card
              className="epma-tutorial-card container-shadow"
              style={{
                width: 'min(420px, calc(100vw - 2rem))',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <Card.Body>
                <div className="epma-tutorial-card__eyebrow">
                  Step {chartTutorialStep + 1} of {chartTutorialSteps.length}
                </div>
                <h4 id="epmaChartTutorialTitle" className="mb-2">Leave chart guide?</h4>
                <p className="mb-0">
                  You are part way through the guide. You can continue now, or leave and resume from this step when you reopen Chart guide.
                </p>
                <div className="epma-tutorial-card__actions">
                  <Button type="button" variant="outline-secondary" onClick={() => closeChartTutorial()}>
                    Leave guide
                  </Button>
                  <Button type="button" onClick={() => setShowChartTutorialExitConfirm(false)}>
                    Continue tutorial
                  </Button>
                </div>
              </Card.Body>
            </Card>
          ) : (
          <Card className="epma-tutorial-card container-shadow" style={chartTutorialCardStyle}>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                <div>
                  <div className="epma-tutorial-card__eyebrow">
                    Step {chartTutorialStep + 1} of {chartTutorialSteps.length}
                  </div>
                  <h4 id="epmaChartTutorialTitle" className="mb-1">{activeChartTutorialStep?.title}</h4>
                </div>
                <button type="button" className="epma-close-button" onClick={requestCloseChartTutorial} aria-label="Skip chart guide">
                  <i className="bi bi-x-lg" aria-hidden="true" />
                </button>
              </div>
              <p className="mb-0">{activeChartTutorialStep?.body}</p>
              <div className="epma-tutorial-card__actions">
                <Button type="button" variant="outline-secondary" onClick={requestCloseChartTutorial}>
                  Skip
                </Button>
                <div className="d-flex gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline-secondary"
                    onClick={() => {
                      setShowChartTutorialExitConfirm(false);
                      setChartTutorialStep((current) => Math.max(0, current - 1));
                    }}
                    disabled={chartTutorialStep === 0}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (chartTutorialStep === chartTutorialSteps.length - 1) {
                        finishChartTutorial();
                        return;
                      }
                      setShowChartTutorialExitConfirm(false);
                      setChartTutorialStep((current) => current + 1);
                    }}
                  >
                    {chartTutorialStep === chartTutorialSteps.length - 1 ? 'Finish' : 'Next'}
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>
          )}
        </div>
      ) : null}

      {selectedPatient ? (
        <>
          <div
            ref={chartSubnavRef}
            className={isChartTutorialTargetActive('chart-nav') ? 'epma-tutorial-target epma-tutorial-target--active' : ''}
          >
          <div className="epma-subnav">
            <div className="epma-subnav__inner">
              <button type="button" className="epma-subnav__link" onClick={onBackToFinder}>
                <i className="bi bi-arrow-left-short" aria-hidden="true" />
                Back to patient finder
              </button>
              <button
                type="button"
                className="epma-subnav__link"
                onClick={() => {
                  setShowChartTutorial(true);
                  setShowChartTutorialExitConfirm(false);
                }}
              >
                <i className="bi bi-question-circle" aria-hidden="true" />
                {chartTutorialStep > 0 ? 'Resume chart guide' : 'Chart guide'}
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
          </div>

          {isDischargedEpisode ? (
            <div className="viewport-band">
              <Alert variant="warning" className="mt-3 mb-0">
                This episode is discharged and view only. Re-admit the patient to resume editing.
              </Alert>
            </div>
          ) : null}

          <div
            ref={patientBannerRef}
            className={isChartTutorialTargetActive('patient-banner') || isChartTutorialTargetActive('vte') ? 'epma-tutorial-target epma-tutorial-target--active' : ''}
          >
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
              medicationHistory={selectedPatient.caseNotes?.medicationHistory || {}}
              vteAssessment={derivedVteAssessment}
              onOpenAllergyManagement={isDischargedEpisode ? undefined : () => setShowAllergyManagementModal(true)}
              onOpenMedicationHistory={() => setShowPharmacyPanel(true)}
              onOpenVteAssessment={() => setClinicalNotesLaunchRequest({ templateKey: 'vteAssessment', nonce: Date.now() })}
              onSaveMeasurements={isDischargedEpisode ? undefined : (payload) => onUpdateMeasurements(selectedPatient.id, payload)}
              onDeleteMeasurement={isDischargedEpisode ? undefined : (measurementId) => onDeleteMeasurement(selectedPatient.id, measurementId)}
            />
          </div>
          </div>

          <div
            ref={patientRecordsRef}
            className={isChartTutorialTargetActive('patient-records') || isChartTutorialTargetActive('med-rec') ? 'epma-tutorial-target epma-tutorial-target--active' : ''}
          >
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
              prescriptions={selectedPatient.prescriptions || []}
                commonConditions={commonConditions}
                drugLibrary={drugLibrary}
                defaultAuthor={currentUser?.displayName || 'Student user'}
                onSaveCaseNotes={(payload) => onUpdateCaseNotes(selectedPatient.id, payload)}
                launchClinicalNoteTemplateRequest={clinicalNotesLaunchRequest}
                pharmacyPanelOpen={showPharmacyPanel}
                onPharmacyPanelOpenChange={setShowPharmacyPanel}
                tasksPanelOpen={showTasksPanel}
                onTasksPanelOpenChange={setShowTasksPanel}
                activeChartTutorialStepKey={activeChartTutorialStep?.key || ''}
                tutorialRefs={{
                  medRecPanel: medRecPanelRef,
                  medRecDetails: medRecDetailsRef,
                  medRecMedicines: medRecMedicinesRef,
                  medRecNotes: medRecNotesRef,
                  taskList: taskListRef,
                }}
              />
          </div>
          </div>

          <div
            ref={prescriptionChartRef}
            className={isChartTutorialTargetActive('prescribing') ? 'epma-tutorial-target epma-tutorial-target--active' : ''}
          >
          <div className="viewport-band mt-3">
            <Prescription
              prescriptions={selectedPatient.prescriptions || []}
              prescribingStatus={!isDischargedEpisode}
              drugLibrary={drugLibrary}
              patient={selectedPatient}
              caseNotes={selectedPatient.caseNotes || {}}
              onChange={(nextPrescriptions) => onUpdatePrescriptions(selectedPatient.id, nextPrescriptions)}
              onSaveCaseNotes={(payload) => onUpdateCaseNotes(selectedPatient.id, payload)}
              onApprovalToast={onApprovalToast}
              onVerifyWitness={onVerifyWitness}
              onBlockedPrescribe={onBlockedPrescribe}
              administratorName={currentUser?.displayName || 'Student user'}
              prescriberName={currentUser?.displayName || 'Student user'}
              activeChartTutorialStepKey={activeChartTutorialStep?.key || ''}
              tutorialRefs={{
                prescribeButton: prescribeButtonRef,
                prescriptionDrug: prescriptionDrugRef,
                prescriptionDose: prescriptionDoseRef,
                prescriptionRouteFrequency: prescriptionRouteFrequencyRef,
                prescriptionTiming: prescriptionTimingRef,
                prescriptionIndication: prescriptionIndicationRef,
                prescriptionSave: prescriptionSaveRef,
                taskButton: taskButtonRef,
                taskTitle: taskTitleRef,
                taskProfession: taskProfessionRef,
                taskDescription: taskDescriptionRef,
              }}
            />
          </div>
          </div>
        </>
      ) : null}

      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Admit a test patient</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Use the form below to admit a new test patient to the system</p>
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
            <Form.Group className="mb-0" controlId="newPatientPrivate">
              <Form.Check
                type="switch"
                checked={newPatientPrivate}
                onChange={(event) => setNewPatientPrivate(event.target.checked)}
                label="Only I can see and interact with this patient"
              />
              <div className="text-muted small mt-1">
                Leave this on for private practice patients. Turn it off only if you want this patient to be available for other users..
              </div>
            </Form.Group>
          </Form>

          <Alert variant="info">
            <strong>Generated patient preview</strong>
            <div className="mt-2">{generatedPatient.fullName}</div>
            <div>{generatedPatient.dateOfBirth}</div>
            <div>{generatedPatient.address}</div>
            <div>{generatedPatient.stayType} | {generatedPatient.wardName}</div>
            <div>{generatedPatient.gender} | {generatedPatient.weight} | {generatedPatient.height}</div>
            <div>{newPatientPrivate ? 'Restricted patient only accessible to you' : 'Patient visible to other users'}</div>
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="outline-secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
          <Button type="button" onClick={handleCreate}>Admit New Patient</Button>
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
           
            <div className="d-flex gap-2 flex-wrap">
              <Button type="button" variant="outline-secondary" onClick={() => setShowHistoryModal(true)}>Allergy History</Button>
            </div>
          </div>

          <div
            ref={allergyEditorRef}
            className={`epma-allergy-editor border rounded px-3 py-3 mt-2 ${isChartTutorialTargetActive('allergy-open') ? 'epma-tutorial-target epma-tutorial-target--active' : ''}`}
          >
            <div
              ref={allergyNkdaRef}
              className={isChartTutorialTargetActive('allergy-nkda') ? 'epma-tutorial-target epma-tutorial-target--active' : ''}
            >
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
              <Col md={3}>
                <Form.Group
                  ref={allergyDrugRef}
                  controlId="allergyDrug"
                  className={isChartTutorialTargetActive('allergy-drug') ? 'epma-tutorial-target epma-tutorial-target--active' : ''}
                >
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
                <Form.Group
                  ref={allergyReactionFieldRef}
                  controlId="allergyReaction"
                  className={isChartTutorialTargetActive('allergy-reaction') ? 'epma-tutorial-target epma-tutorial-target--active' : ''}
                >
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
              <Col md={3}>
                <Form.Group
                  ref={allergyInfoRef}
                  controlId="allergyReason"
                  className={isChartTutorialTargetActive('allergy-info') ? 'epma-tutorial-target epma-tutorial-target--active' : ''}
                >
                  <Form.Label>Additional Info</Form.Label>
                  <Form.Control
                    as="input"
                    rows={3}
                    value={allergyReason}
                    onChange={(event) => {
                      setAllergyFormError('');
                      setAllergyReason(event.target.value);
                    }}
                    
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group
                  ref={allergySaveRef}
                  controlId="allergySave"
                  className={isChartTutorialTargetActive('allergy-save') ? 'epma-tutorial-target epma-tutorial-target--active' : ''}
                >
                  <Form.Label>Save Allergy</Form.Label>
                    <Button type="button" onClick={handleSaveAllergy} disabled={!allergyDraft.drug || !allergyDraft.reaction}>
                      Save allergy
                    </Button>
                </Form.Group>
              </Col>


              
            </Row>

          <div
            ref={allergyListRef}
            className={isChartTutorialTargetActive('allergy-list') ? 'epma-tutorial-target epma-tutorial-target--active' : ''}
          >
          <h6 className="mt-4 mb-2">Current allergies</h6>
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
            <Alert variant="light" className="mb-0 mt-3">No allergies recorded</Alert>
          )}
          </div>


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
