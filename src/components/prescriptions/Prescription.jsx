import React, { useMemo, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Card from 'react-bootstrap/Card';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Table from 'react-bootstrap/Table';
import Tooltip from 'react-bootstrap/Tooltip';
import AddPrescription from './addPrescription.jsx';
import PrescriptionCard from './Prescriptions';
import { buildUpcomingScheduledSlots, formatDateTimeLabel, parseChartDate, parseDateTime } from './chartUtils';

const todayLabel = () => new Date().toLocaleDateString('en-GB');
const formatPrescriptionDate = (value) => {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-GB');
  }

  return value;
};

const formatPrescriptionDateTime = (value) => {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return formatDateTimeLabel(parsed);
  }

  return value;
};

const formatPrescriptionStop = (value) => {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.getHours() === 0 && parsed.getMinutes() === 0
      ? parsed.toLocaleDateString('en-GB')
      : formatDateTimeLabel(parsed);
  }

  return value;
};

const normalizeHistoryReason = (value) => {
  const normalized = String(value || '').trim();
  return normalized && normalized !== 'No reason recorded' ? normalized : '';
};

const formatHistoryDetails = (value) => String(value || '').replace(
  /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z/g,
  (match) => {
    const parsed = new Date(match);
    return Number.isNaN(parsed.getTime()) ? match : formatDateTimeLabel(parsed);
  }
);

const formatHistoryAction = (entry) => {
  if (entry?.details && String(entry.details).trim() !== 'Initial prescription created.') {
    return String(entry.action || 'updated').trim();
  }
  return String(entry?.action || '').trim() || 'updated';
};

const formatHoursSinceAdministration = (value) => {
  if (!value) {
    return '';
  }

  const parsed = parseDateTime(value) || parseChartDate(value) || new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const diffHours = Math.max(0, Math.round(((Date.now() - parsed.getTime()) / (1000 * 60 * 60)) * 10) / 10);
  return `${diffHours}h ago`;
};

const formatIsoDateForInput = (date) => date.toISOString().slice(0, 10);
const formatTimeForInput = (date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
const parseInputDateTime = (dateValue, timeValue) => {
  if (!dateValue || !timeValue) {
    return null;
  }

  const parsed = new Date(`${dateValue}T${timeValue}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getStatAutoStopDate = (prescription) => {
  if (!prescription?.stat || !prescription?.start_date) {
    return null;
  }

  const parsedStart = new Date(prescription.start_date);
  if (Number.isNaN(parsedStart.getTime())) {
    return null;
  }

  return new Date(parsedStart.getTime() + (24 * 60 * 60 * 1000));
};

const normalizePrescriptionForDisplay = (prescription) => {
  const autoStopDate = getStatAutoStopDate(prescription);
  const shouldAutoStop = Boolean(autoStopDate && autoStopDate <= new Date());

  if (!shouldAutoStop) {
    return prescription;
  }

  return {
    ...prescription,
    status: 'stopped',
    end_date: autoStopDate.toISOString(),
  };
};

const createPrescriptionId = () => `prescription-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const normalizePrescriptionId = (prescription) => String(prescription?.id || '').trim();
const ensurePrescriptionIds = (items = []) => {
  let changed = false;
  const nextItems = (Array.isArray(items) ? items : []).map((item) => {
    if (normalizePrescriptionId(item)) {
      return item;
    }
    changed = true;
    return {
      ...item,
      id: createPrescriptionId(),
    };
  });

  return { nextItems, changed };
};

const createTaskId = () => `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const TASK_PROFESSIONS = ['Doctor', 'Nurse', 'Pharmacist', 'Dietitian', 'Physiotherapist', 'Radiographer', 'Other'];
const normalizeTasks = (caseNotes = {}) => (Array.isArray(caseNotes?.tasks) ? caseNotes.tasks : [])
  .map((item, index) => ({
    id: String(item?.id || `task-${index}`).trim(),
    title: String(item?.title || '').trim(),
    description: String(item?.description || '').trim(),
    assignedProfession: String(item?.assignedProfession || '').trim(),
    linkedPrescriptionId: String(item?.linkedPrescriptionId || '').trim(),
    linkedDrug: String(item?.linkedDrug || '').trim(),
    status: String(item?.status || 'open').trim() || 'open',
    createdAt: String(item?.createdAt || '').trim(),
    createdBy: String(item?.createdBy || '').trim(),
    completedAt: String(item?.completedAt || '').trim(),
    completedBy: String(item?.completedBy || '').trim(),
    suppressedAt: String(item?.suppressedAt || '').trim(),
    suppressedBy: String(item?.suppressedBy || '').trim(),
    suppressionReason: String(item?.suppressionReason || '').trim(),
  }))
  .filter((item) => item.title);
const administrationKeyItems = [
  {
    short: 'Sch',
    toneClass: 'prescription-chart-key__item--scheduled',
    description: 'Scheduled dose. This is a planned administration slot that has not been charted yet.',
  },
  {
    short: 'Due',
    toneClass: 'prescription-chart-key__item--due',
    description: 'Due dose. Click the cell to chart administration when it is overdue or within the next 90 minutes.',
  },
  {
    short: 'Held',
    toneClass: 'prescription-chart-key__item--held',
    description: 'Held dose. In suspend mode you can click this cell again to remove the hold.',
  },
  {
    short: 'Overdue',
    toneClass: 'prescription-chart-key__item--overdue',
    description: 'Overdue dose. Standard medicines become overdue 120 minutes after the due time; critical medicines become overdue after 30 minutes.',
  },
  {
    short: 'Adm',
    toneClass: 'prescription-chart-key__item--administered',
    description: 'Administered dose. This has already been charted and is no longer available for scheduling actions.',
  },
  {
    short: 'Missed',
    toneClass: 'prescription-chart-key__item--missed',
    description: 'Missed or non-administered dose. This slot has a recorded outcome other than administered.',
  },
];

const Prescriptions = ({
  prescriptions = [],
  prescribingStatus,
  drugLibrary,
  patient,
  allergies = [],
  caseNotes,
  onChange,
  onSaveCaseNotes,
  onApprovalToast,
  prescriberName,
  administratorName = 'Student user',
  onVerifyWitness,
  onBlockedPrescribe,
  allowPrescribeWithoutAllergyStatus = false,
  allowHistoricalAdministrations = false,
  allowPrescriptionRemoval = false,
  activeChartTutorialStepKey = '',
  tutorialRefs = {},
}) => {
  const [show, setShow] = React.useState(false);
  const [prescriptionList, setPrescriptions] = React.useState(prescriptions);
  const [sortMode, setSortMode] = React.useState('grouped-alpha');
  const [editingPrescription, setEditingPrescription] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [actionModal, setActionModal] = useState({ show: false, type: '', index: null, slotDateTime: '', existingAdminDateTime: '' });
  const [administrationModal, setAdministrationModal] = useState({
    show: false,
    index: null,
    slotDateTime: '',
    requiresWitness: false,
    outcome: 'administered',
    requiresVariableDose: false,
    scheduledDose: '',
    unit: '',
  });
  const [actionReason, setActionReason] = useState('');
  const [holdCount, setHoldCount] = useState(1);
  const [suspendReasonCache, setSuspendReasonCache] = useState({});
  const [administrationNote, setAdministrationNote] = useState('');
  const [actualDose, setActualDose] = useState('');
  const [actualAdministrationDate, setActualAdministrationDate] = useState('');
  const [actualAdministrationTime, setActualAdministrationTime] = useState('');
  const [witnessUsername, setWitnessUsername] = useState('');
  const [witnessPassword, setWitnessPassword] = useState('');
  const [administrationError, setAdministrationError] = useState('');
  const [stoppedHistoryPrescription, setStoppedHistoryPrescription] = useState(null);
  const [activeSuspendPrescriptionIndex, setActiveSuspendPrescriptionIndex] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskProfession, setTaskProfession] = useState('');
  const [taskLinkedPrescriptionIndex, setTaskLinkedPrescriptionIndex] = useState(null);
  const [taskError, setTaskError] = useState('');
  const missedDoseOptions = useMemo(() => drugLibrary?.metadata?.nonAdmins || [], [drugLibrary]);
  const tasks = useMemo(() => normalizeTasks(caseNotes), [caseNotes]);
  const activeTaskLookup = useMemo(() => {
    const lookup = new Map();

    tasks.forEach((task) => {
      if (task.status !== 'open') {
        return;
      }

      const linkedPrescriptionId = String(task.linkedPrescriptionId || '').trim();
      if (!linkedPrescriptionId) {
        return;
      }

      const existingTasks = lookup.get(linkedPrescriptionId) || [];
      existingTasks.push(task);
      lookup.set(linkedPrescriptionId, existingTasks);
    });

    return lookup;
  }, [tasks]);

  React.useEffect(() => {
    const { nextItems, changed } = ensurePrescriptionIds(prescriptions);
    setPrescriptions(nextItems);

    if (changed && onChange) {
      onChange(nextItems, { suppressToast: true });
    }
  }, [onChange, prescriptions]);

  React.useEffect(() => {
    if (activeChartTutorialStepKey?.startsWith('prescribe-') && activeChartTutorialStepKey !== 'prescribe-button') {
      setShow(true);
      return;
    }
    if (activeChartTutorialStepKey && !activeChartTutorialStepKey.startsWith('prescribe-')) {
      setShow(false);
      setEditingPrescription('');
      setEditingIndex(null);
    }
  }, [activeChartTutorialStepKey]);

  React.useEffect(() => {
    if (activeChartTutorialStepKey && ['task-title', 'task-profession', 'task-description'].includes(activeChartTutorialStepKey)) {
      setTaskLinkedPrescriptionIndex(null);
      setTaskTitle('');
      setTaskDescription('');
      setTaskProfession('');
      setTaskError('');
      setShowTaskModal(true);
      return;
    }
    if (activeChartTutorialStepKey && (!activeChartTutorialStepKey.startsWith('task-') || activeChartTutorialStepKey === 'task-list')) {
      setShowTaskModal(false);
      setTaskTitle('');
      setTaskDescription('');
      setTaskProfession('');
      setTaskLinkedPrescriptionIndex(null);
      setTaskError('');
    }
  }, [activeChartTutorialStepKey]);

  const commitPrescriptions = (nextPrescriptions, options = {}) => {
    setPrescriptions(nextPrescriptions);
    if (onChange) {
      onChange(nextPrescriptions, options);
    }
  };

  const sortedPrescriptions = useMemo(() => {
    const next = prescriptionList.map((item, index) => ({
      prescription: normalizePrescriptionForDisplay(item),
      originalIndex: index,
    }));
    next.sort((a, b) => {
      const aDrug = String(a.prescription.drug || '').trim().toLowerCase();
      const bDrug = String(b.prescription.drug || '').trim().toLowerCase();
      const aPrn = Boolean(a.prescription.whenRequired);
      const bPrn = Boolean(b.prescription.whenRequired);

      if (sortMode === 'grouped-alpha') {
        if (aPrn !== bPrn) {
          return aPrn ? 1 : -1;
        }
        return aDrug.localeCompare(bDrug);
      }

      if (sortMode === 'alpha') {
        return aDrug.localeCompare(bDrug);
      }

      const aDate = parseChartDate(a.prescription.start_date)?.getTime() || 0;
      const bDate = parseChartDate(b.prescription.start_date)?.getTime() || 0;
      if (aDate !== bDate) {
        return aDate - bDate;
      }
      return aDrug.localeCompare(bDrug);
    });
    return next;
  }, [prescriptionList, sortMode]);
  const activePrescriptions = sortedPrescriptions.filter(({ prescription }) => prescription?.status !== 'stopped');
  const stoppedPrescriptions = sortedPrescriptions.filter(({ prescription }) => prescription?.status === 'stopped');
  const firstPrnIndex = sortMode === 'grouped-alpha'
    ? activePrescriptions.findIndex(({ prescription }) => Boolean(prescription?.whenRequired))
    : -1;

  const closeEditor = () => {
    setShow(false);
    setEditingPrescription('');
    setEditingIndex(null);
  };

  const hasAllergyStatus = allowPrescribeWithoutAllergyStatus
    || Boolean(patient?.nkda)
    || Boolean((patient?.allergies || []).length)
    || Boolean((allergies || []).length);

  const handleOpenPrescribe = () => {
    if (!hasAllergyStatus) {
      if (onBlockedPrescribe) {
        onBlockedPrescribe('Record NKDA or add an allergy status before prescribing.');
      }
      return;
    }
    setShow(true);
  };

  const handleNew = (script) => {
    commitPrescriptions([...prescriptionList, script]);
  };

  const handleEditOpen = (index) => {
    setSuspendReasonCache((current) => ({ ...current, [index]: undefined }));
    setEditingPrescription(prescriptionList[index]);
    setEditingIndex(index);
    setShow(true);
  };

  const handleSaveEdit = (script, index) => {
    commitPrescriptions(prescriptionList.map((item, itemIndex) => (itemIndex === index ? script : item)));
  };

  const handleRemovePrescription = (index) => {
    if (!allowPrescriptionRemoval) {
      return;
    }

    const prescription = prescriptionList[index];
    const label = prescription?.drug || 'this prescription';
    const confirmed = window.confirm(`Remove ${label} from this case study? This will delete it from the case template rather than move it to stopped medications.`);

    if (!confirmed) {
      return;
    }

    commitPrescriptions(prescriptionList.filter((_item, itemIndex) => itemIndex !== index));
  };

  const openActionModal = (type, index) => {
    setSuspendReasonCache((current) => ({ ...current, [index]: undefined }));
    setActionModal({ show: true, type, index, slotDateTime: '', existingAdminDateTime: '' });
    setActionReason('');
    setHoldCount(1);
  };

  const openSuspendDoseModal = (index, slotDate, administration) => {
    const cachedReason = suspendReasonCache[index];
    if (cachedReason?.trim()) {
      applyDoseLevelAction(
        index,
        administration?.adminNote?.toLowerCase().includes('held') ? 'unsuspend-dose' : 'hold-dose',
        formatDateTimeLabel(slotDate),
        administration?.adminDateTime || '',
        cachedReason
      );
      return;
    }

    setActionModal({
      show: true,
      type: administration?.adminNote?.toLowerCase().includes('held') ? 'unsuspend-dose' : 'hold-dose',
      index,
      slotDateTime: formatDateTimeLabel(slotDate),
      existingAdminDateTime: administration?.adminDateTime || '',
    });
    setActionReason('');
    setHoldCount(1);
  };

  const applyDoseLevelAction = (index, actionType, slotDateTime, existingAdminDateTime, reason) => {
    const nextPrescriptions = prescriptionList.map((item, itemIndex) => {
      if (itemIndex !== index) {
        return item;
      }

      const amendmentHistory = [...(item.amendmentHistory || [])];

      if (actionType === 'hold-dose') {
        return {
          ...item,
          administrations: [
            ...(item.administrations || []),
            {
              adminDateTime: slotDateTime,
              administeredBy: 'Student user',
              adminNote: `Held - ${reason.trim()}`,
            },
          ],
          amendmentHistory: [
            ...amendmentHistory,
            {
              action: 'suspend-dose',
              reason: `${reason.trim()} (${slotDateTime})`,
              timestamp: new Date().toISOString(),
              actor: 'Student user',
            },
          ],
        };
      }

      if (actionType === 'unsuspend-dose') {
        return {
          ...item,
          administrations: (item.administrations || []).filter((entry) => entry.adminDateTime !== existingAdminDateTime),
          amendmentHistory: [
            ...amendmentHistory,
            {
              action: 'unsuspend-dose',
              reason: `${reason.trim()} (${slotDateTime})`,
              timestamp: new Date().toISOString(),
              actor: 'Student user',
            },
          ],
        };
      }

      return item;
    });

    commitPrescriptions(nextPrescriptions);
    setSuspendReasonCache((current) => ({ ...current, [index]: reason.trim() }));
  };

  const closeActionModal = () => {
    setActionModal({ show: false, type: '', index: null, slotDateTime: '', existingAdminDateTime: '' });
    setActionReason('');
    setHoldCount(1);
  };

  const openAdministrationModal = (index, slotDate) => {
    const prescription = prescriptionList[index] || {};
    const now = new Date();
    const slotTime = formatTimeForInput(slotDate);
    const variableDoseSchedule = prescription.variableDoseSchedule || {};
    const scheduledDose = String(variableDoseSchedule?.[slotTime]?.dose ?? variableDoseSchedule?.[slotTime] ?? '').trim();
    setAdministrationModal({
      show: true,
      index,
      slotDateTime: formatDateTimeLabel(slotDate),
      requiresWitness: Boolean(prescription.requiresWitness),
      outcome: 'administered',
      whenRequired: Boolean(prescription.whenRequired),
      doseType: prescription.doseType || 'fixed',
      doseMin: prescription.doseMin || '',
      doseMax: prescription.doseMax || '',
      doseIncrement: prescription.doseIncrement || '',
      requiresVariableDose: Boolean(Object.keys(variableDoseSchedule).length),
      scheduledDose,
      unit: prescription.unit || '',
    });
    setAdministrationNote('');
    setActualDose(scheduledDose);
    setActualAdministrationDate(formatIsoDateForInput(now));
    setActualAdministrationTime(formatTimeForInput(now));
    setWitnessUsername('');
    setWitnessPassword('');
    setAdministrationError('');
  };

  const closeAdministrationModal = () => {
    setAdministrationModal({
      show: false,
      index: null,
      slotDateTime: '',
      requiresWitness: false,
      outcome: 'administered',
      whenRequired: false,
      requiresVariableDose: false,
      scheduledDose: '',
      unit: '',
    });
    setAdministrationNote('');
    setActualDose('');
    setActualAdministrationDate('');
    setActualAdministrationTime('');
    setWitnessUsername('');
    setWitnessPassword('');
    setAdministrationError('');
  };

  const openTaskModal = (prescriptionIndex = null) => {
    const linkedPrescription = prescriptionIndex !== null ? prescriptionList[prescriptionIndex] || null : null;
    setTaskLinkedPrescriptionIndex(prescriptionIndex);
    setTaskTitle(linkedPrescription ? `Review ${linkedPrescription.drug}` : '');
    setTaskDescription('');
    setTaskProfession('');
    setTaskError('');
    setShowTaskModal(true);
  };

  const closeTaskModal = () => {
    setShowTaskModal(false);
    setTaskTitle('');
    setTaskDescription('');
    setTaskProfession('');
    setTaskLinkedPrescriptionIndex(null);
    setTaskError('');
  };

  const administrationModalPrescription = administrationModal.index !== null ? prescriptionList[administrationModal.index] || null : null;
  const taskLinkedPrescription = taskLinkedPrescriptionIndex !== null ? prescriptionList[taskLinkedPrescriptionIndex] || null : null;
  const administrationModalRecentAdmins = [...(administrationModalPrescription?.administrations || [])]
    .sort((left, right) => {
      const leftTime = (parseDateTime(left.adminDateTime) || new Date(left.adminDateTime || 0)).getTime();
      const rightTime = (parseDateTime(right.adminDateTime) || new Date(right.adminDateTime || 0)).getTime();
      return rightTime - leftTime;
    })
    .slice(0, 5);
  const administrationModalLatestAdmin = administrationModalRecentAdmins[0] || null;

  const applyAdministration = async () => {
    if (administrationModal.index === null) {
      return;
    }

    const recordingAdministration = administrationModal.outcome === 'administered';
    const actualAdministrationDateTime = parseInputDateTime(actualAdministrationDate, actualAdministrationTime);
    if (recordingAdministration && !actualAdministrationDateTime) {
      setAdministrationError('Enter a valid administration date and time.');
      return;
    }

    const signedAtLabel = recordingAdministration
      ? formatDateTimeLabel(actualAdministrationDateTime)
      : formatDateTimeLabel(new Date());
    let actualDoseSuffix = '';
    if (recordingAdministration && administrationModal.doseType === 'range') {
      const selectedDose = Number(actualDose);
      const min = Number(administrationModal.doseMin);
      const max = Number(administrationModal.doseMax);
      const increment = Number(administrationModal.doseIncrement);
      const incrementFits = Math.abs(((selectedDose - min) / increment) - Math.round((selectedDose - min) / increment)) <= 0.000001;

      if (!actualDose || Number.isNaN(selectedDose) || selectedDose < min || selectedDose > max || !incrementFits) {
        setAdministrationError(`Enter an administered dose between ${administrationModal.doseMin}${administrationModal.unit} and ${administrationModal.doseMax}${administrationModal.unit} in increments of ${administrationModal.doseIncrement}${administrationModal.unit}.`);
        return;
      }

      actualDoseSuffix = ` Dose administered: ${actualDose}${administrationModal.unit}.`;
    } else if (recordingAdministration && administrationModal.requiresVariableDose) {
      const selectedDose = Number(actualDose);
      if (!actualDose || Number.isNaN(selectedDose) || selectedDose <= 0) {
        setAdministrationError('Enter the dose administered for this insulin administration.');
        return;
      }

      actualDoseSuffix = ` Dose administered: ${actualDose}${administrationModal.unit}.`;
    }

    let witnessSuffix = '';
    if (recordingAdministration && administrationModal.requiresWitness) {
      if (!onVerifyWitness) {
        setAdministrationError('Witness verification is not available right now.');
        return;
      }

      try {
        const result = await onVerifyWitness(witnessUsername, witnessPassword);
        witnessSuffix = ` Witnessed by ${result.witness.displayName}.`;
      } catch (error) {
        setAdministrationError(error.message);
        return;
      }
    }

    const nextPrescriptions = prescriptionList.map((item, itemIndex) => {
      if (itemIndex !== administrationModal.index) {
        return item;
      }

      const administrationDateTime = recordingAdministration && (item.stat || item.whenRequired)
        ? signedAtLabel
        : recordingAdministration
          ? signedAtLabel
          : administrationModal.slotDateTime;
      const scheduledSlotDateTime = !item.whenRequired ? administrationModal.slotDateTime : '';
      const scheduledVsActualSuffix = recordingAdministration && scheduledSlotDateTime && administrationDateTime !== scheduledSlotDateTime
        ? ` (Scheduled ${scheduledSlotDateTime})`
        : '';

      return {
        ...item,
        administrations: [
          ...(item.administrations || []),
          {
            adminDateTime: administrationDateTime,
            scheduledSlotDateTime,
            administeredBy: administratorName,
            actualDose: recordingAdministration && (administrationModal.doseType === 'range' || administrationModal.requiresVariableDose) ? actualDose : '',
            adminNote: `${recordingAdministration ? 'Administered' : 'Missed'}${actualDoseSuffix}${administrationNote.trim() ? ` - ${administrationNote.trim()}` : ''}${witnessSuffix}`,
          },
        ],
        amendmentHistory: [
          ...(item.amendmentHistory || []),
          {
            action: recordingAdministration ? 'administered-dose' : 'missed-dose',
            reason: `${administrationDateTime}${scheduledVsActualSuffix}${actualDoseSuffix}${administrationNote.trim() ? ` - ${administrationNote.trim()}` : ''}${witnessSuffix}`,
            timestamp: new Date().toISOString(),
            actor: administratorName,
          },
        ],
      };
    });

    commitPrescriptions(nextPrescriptions);
    closeAdministrationModal();
  };

  const saveTask = async () => {
    if (!onSaveCaseNotes) {
      closeTaskModal();
      return;
    }

    if (!taskTitle.trim()) {
      setTaskError('Enter a task title.');
      return;
    }

    let linkedPrescription = taskLinkedPrescription;
    let nextPrescriptions = prescriptionList;

    if (linkedPrescription && !normalizePrescriptionId(linkedPrescription)) {
      const assignedPrescriptionId = createPrescriptionId();
      nextPrescriptions = prescriptionList.map((item, itemIndex) => (
        itemIndex === taskLinkedPrescriptionIndex
          ? { ...item, id: assignedPrescriptionId }
          : item
      ));
      linkedPrescription = nextPrescriptions[taskLinkedPrescriptionIndex] || linkedPrescription;
      commitPrescriptions(nextPrescriptions, { suppressToast: true });
    }

    const nextTask = {
      id: createTaskId(),
      title: taskTitle.trim(),
      description: taskDescription.trim(),
      assignedProfession: taskProfession,
      linkedPrescriptionId: normalizePrescriptionId(linkedPrescription),
      linkedDrug: linkedPrescription?.drug || '',
      status: 'open',
      createdAt: new Date().toISOString(),
      createdBy: administratorName,
      completedAt: '',
      completedBy: '',
    };

    await onSaveCaseNotes({
      fieldKey: 'tasks',
      fieldLabel: 'Added task',
      previousValue: null,
      nextValue: nextTask,
      caseNotes: {
        ...(caseNotes || {}),
        tasks: [nextTask, ...tasks],
      },
      successMessage: 'Task added.',
    });

    closeTaskModal();
  };

  const applyPrescriptionAction = () => {
    if (!actionReason.trim() || actionModal.index === null) {
      return;
    }

    if (actionModal.type === 'start') {
      const sourcePrescription = prescriptionList[actionModal.index];
      if (!sourcePrescription) {
        return;
      }

      const timestamp = new Date().toISOString();
      const nextPrescriptions = prescriptionList.map((item, itemIndex) => {
        if (itemIndex !== actionModal.index) {
          return item;
        }

        return {
          ...item,
          amendmentHistory: [
            ...(item.amendmentHistory || []),
            {
              action: 'restarted-as-new-prescription',
              reason: actionReason.trim(),
              timestamp,
              actor: 'Student user',
            },
          ],
        };
      });

      nextPrescriptions.push({
        ...sourcePrescription,
        status: 'active',
        start_date: timestamp,
        end_date: '',
        administrations: [],
        pharmacistApprovalStatus: {
          approved: false,
          approvedBy: '',
          approvedAt: '',
        },
        amendmentHistory: [
          {
            action: 'created-from-stopped-prescription',
            reason: actionReason.trim(),
            timestamp,
            actor: 'Student user',
          },
        ],
      });

      commitPrescriptions(nextPrescriptions);
      closeActionModal();
      return;
    }

    const nextPrescriptions = prescriptionList.map((item, itemIndex) => {
      if (itemIndex !== actionModal.index) {
        return item;
      }

      const amendmentHistory = [
        ...(item.amendmentHistory || []),
        {
          action: actionModal.type,
          reason: actionReason.trim(),
          timestamp: new Date().toISOString(),
          actor: 'Student user',
        },
      ];

      if (actionModal.type === 'stop') {
        return {
          ...item,
          status: 'stopped',
          end_date: todayLabel(),
          amendmentHistory,
        };
      }

      if (actionModal.type === 'suspend') {
        const heldAdministrations = buildUpcomingScheduledSlots(
          item.frequency,
          item.administrations || [],
          holdCount,
          drugLibrary?.metadata?.frequencyOptions || [],
          item.scheduledTimes || [],
          item.start_date ? new Date(item.start_date) : null
        ).map((scheduledDate) => ({
          adminDateTime: formatDateTimeLabel(scheduledDate),
          administeredBy: 'Student user',
          adminNote: `Held - ${actionReason.trim()}`,
        }));

        return {
          ...item,
          status: 'suspended',
          administrations: [...(item.administrations || []), ...heldAdministrations],
          amendmentHistory,
        };
      }

      if (actionModal.type === 'hold-dose') {
        return item;
      }

      if (actionModal.type === 'unsuspend-dose') {
        return item;
      }

      return item;
    });

    if (actionModal.type === 'hold-dose' || actionModal.type === 'unsuspend-dose') {
      applyDoseLevelAction(
        actionModal.index,
        actionModal.type,
        actionModal.slotDateTime,
        actionModal.existingAdminDateTime,
        actionReason
      );
      closeActionModal();
      return;
    }

    commitPrescriptions(nextPrescriptions);

    closeActionModal();
  };

  const handleToggleApproval = (index) => {
    const nextPrescriptions = prescriptionList.map((item, itemIndex) => {
      if (itemIndex !== index) {
        return item;
      }

      const isApproved = Boolean(item?.pharmacistApprovalStatus?.approved);
      return {
        ...item,
        pharmacistApprovalStatus: {
          approved: !isApproved,
          approvedBy: !isApproved ? administratorName : '',
          approvedAt: !isApproved ? new Date().toISOString() : '',
        },
        amendmentHistory: [
          ...(item.amendmentHistory || []),
          {
            action: !isApproved ? 'approved' : 'unapproved',
            reason: !isApproved ? 'Pharmacist approval recorded' : 'Pharmacist approval removed',
            timestamp: new Date().toISOString(),
            actor: administratorName,
          },
        ],
      };
    });

    const toggledPrescription = nextPrescriptions[index];
    commitPrescriptions(nextPrescriptions, { suppressToast: true });
    if (onApprovalToast) {
      onApprovalToast(
        toggledPrescription?.pharmacistApprovalStatus?.approved
          ? `${toggledPrescription?.drug || 'Prescription'} approved by ${toggledPrescription?.pharmacistApprovalStatus?.approvedBy || 'Unknown user'} on ${toggledPrescription?.pharmacistApprovalStatus?.approvedAt ? formatDateTimeLabel(new Date(toggledPrescription.pharmacistApprovalStatus.approvedAt)) : 'Unknown time'}.`
          : `${toggledPrescription?.drug || 'Prescription'} approval removed.`
      );
    }
  };

  return (
    <>
      <Container fluid className="prescription-tools text-break mt-3 px-0">
        <Container fluid className="prescription-chart-header border blue-back text-white py-3 container-shadow rounded">
          <Row className="align-items-center g-3">
            <Col lg={6}>
              <div className="prescription-chart-header__section">
                <h4 className="mb-0">Prescription chart</h4>
              </div>
            </Col>
            <Col lg={6} className="d-flex flex-column align-items-lg-end">
              <div className="prescription-chart-header__section prescription-chart-header__section--key">
                <div className="prescription-chart-key">
                  {administrationKeyItems.map((item) => (
                    <OverlayTrigger
                      key={item.short}
                      placement="bottom"
                      overlay={<Tooltip id={`admin-key-${item.short}`}>{item.description}</Tooltip>}
                    >
                      <span className={`prescription-chart-key__item ${item.toneClass}`}>
                        {item.short}
                      </span>
                    </OverlayTrigger>
                  ))}
                </div>
              </div>
            </Col>
            <Col lg={12}>
              <hr className="prescription-chart-header__rule" />
            </Col>
              <Col lg={12} className="d-flex justify-content-between align-items-center gap-2 flex-wrap">
                <div className="d-flex gap-2 flex-wrap">
                  {prescribingStatus ? (
                    <span
                      ref={tutorialRefs.prescribeButton}
                      className={activeChartTutorialStepKey === 'prescribe-button' ? 'epma-tutorial-target epma-tutorial-target--active' : ''}
                    >
                      <Button type="button" variant="outline-light" className="btn-sm" onClick={handleOpenPrescribe}>Prescribe medication</Button>
                    </span>
                  ) : null}
                  {prescribingStatus ? (
                    <span
                      ref={tutorialRefs.taskButton}
                      className={activeChartTutorialStepKey === 'task-button' ? 'epma-tutorial-target epma-tutorial-target--active' : ''}
                    >
                      <Button type="button" variant="outline-light" className="btn-sm" onClick={() => openTaskModal()}>New task</Button>
                    </span>
                  ) : null}
                </div>
              <ButtonGroup aria-label="Prescription tools">
                <Button
                  type="button"
                  variant={sortMode === 'grouped-alpha' ? 'light' : 'outline-light'}
                  className="btn-sm"
                  onClick={() => setSortMode('grouped-alpha')}
                >
                  Default order
                </Button>
                <Button
                  type="button"
                  variant={sortMode === 'alpha' ? 'light' : 'outline-light'}
                  className="btn-sm"
                  onClick={() => setSortMode('alpha')}
                >
                  A-Z
                </Button>
                <Button
                  type="button"
                  variant={sortMode === 'start-date' ? 'light' : 'outline-light'}
                  className="btn-sm"
                  onClick={() => setSortMode('start-date')}
                >
                  Start date
                </Button>
              </ButtonGroup>
            </Col>
          </Row>
        </Container>
      </Container>
        <Container fluid className="mb-4 px-0">
        {activePrescriptions.map(({ prescription, originalIndex }, displayIndex) => (
          <React.Fragment key={`${prescription.drug}-${originalIndex}`}>
            {firstPrnIndex === displayIndex ? (
              <Card className="bg-white mt-3 rounded container-shadow prescription-divider-card">
                <Card.Body className="py-0 px-0">
                  <div className="prescription-section-banner blue-back text-white">
                    PRN medications
                  </div>
                </Card.Body>
              </Card>
            ) : null}
            <PrescriptionCard
              index={originalIndex}
              prescribingStatus={prescribingStatus}
                prescription={prescription}
                activeTasks={activeTaskLookup.get(normalizePrescriptionId(prescription)) || []}
                admissionDate={patient?.admittedAt || patient?.createdAt}
                biochemistry={patient?.biochemistry || {}}
                editPrescription={handleEditOpen}
              onStartPrescription={(_index) => openActionModal('start', originalIndex)}
              onStopPrescription={(_index) => openActionModal('stop', originalIndex)}
                onRemovePrescription={allowPrescriptionRemoval ? () => handleRemovePrescription(originalIndex) : undefined}
                onSuspendDose={(_index, slotDate, administration) => openSuspendDoseModal(originalIndex, slotDate, administration)}
                onChartAdministration={(_index, slotDate) => openAdministrationModal(originalIndex, slotDate)}
                onExitSuspendMode={(_index) => {
                  setSuspendReasonCache((current) => ({ ...current, [originalIndex]: undefined }));
                  setActiveSuspendPrescriptionIndex((current) => (current === originalIndex ? null : current));
                }}
                onEnterSuspendMode={(_index) => setActiveSuspendPrescriptionIndex(originalIndex)}
                onToggleApproval={handleToggleApproval}
                onCreateTask={(_index) => openTaskModal(originalIndex)}
                frequencyOptions={drugLibrary?.metadata?.frequencyOptions || []}
                globalSuspendMode={activeSuspendPrescriptionIndex !== null}
                isSuspendOwner={activeSuspendPrescriptionIndex === originalIndex}
              />
          </React.Fragment>
        ))}
        {stoppedPrescriptions.length ? (
          <Card className="bg-white mt-4 rounded container-shadow prescription-stopped-card">
            <Card.Body className="py-0 px-0">
              <div className="prescription-section-banner blue-back text-white">
                Stopped medications
              </div>
              <div className="py-3 px-3">
              <Table responsive hover size="sm" className="mb-0">
                <thead>
                  <tr>
                    <th>Drug</th>
                    <th>Dose</th>
                    <th>Route</th>
                    <th>Stopped</th>
                    <th>Prescriber</th>
                    <th>Pharm approval</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stoppedPrescriptions.map(({ prescription, originalIndex }) => (
                    <tr
                      key={`stopped-${prescription.drug}-${originalIndex}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => setStoppedHistoryPrescription(prescription)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setStoppedHistoryPrescription(prescription);
                        }
                      }}
                    >
                      <td>{prescription.drug || 'Not recorded'}</td>
                      <td>{prescription.dose || 'Not set'}</td>
                      <td>{prescription.route || 'Not set'}</td>
                      <td>{formatPrescriptionStop(prescription.end_date) || 'Not recorded'}</td>
                      <td>{prescription.prescriber || 'Not recorded'}</td>
                      <td>{prescription.pharmacistApprovalStatus?.approved ? 'Approved' : 'Not approved'}</td>
                      <td className="text-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline-primary"
                          onClick={(event) => {
                            event.stopPropagation();
                            openActionModal('start', originalIndex);
                          }}
                        >
                          Restart
                        </Button>
                        {allowPrescriptionRemoval ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline-danger"
                            className="ms-2"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleRemovePrescription(originalIndex);
                            }}
                          >
                            Remove
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              </div>
            </Card.Body>
          </Card>
        ) : null}
      </Container>
      <Modal show={Boolean(stoppedHistoryPrescription)} onHide={() => setStoppedHistoryPrescription(null)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>{stoppedHistoryPrescription?.drug || 'Prescription'} order history</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {stoppedHistoryPrescription ? (
            <>
              <h5>Order details</h5>
              <Table responsive bordered size="sm">
                <thead>
                  <tr>
                    <th>Drug</th>
                    <th>Dose</th>
                    <th>Frequency</th>
                    <th>Route</th>
                    <th>Start</th>
                    <th>Stop</th>
                    <th>Indication</th>
                    <th>Prescriber</th>
                    <th>Pharmacist approval</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{stoppedHistoryPrescription.drug}</td>
                    <td>{stoppedHistoryPrescription.dose}</td>
                    <td>{stoppedHistoryPrescription.whenRequired && stoppedHistoryPrescription.maxDose24h ? `${stoppedHistoryPrescription.frequency} (max ${stoppedHistoryPrescription.maxDose24h}/24h)` : stoppedHistoryPrescription.frequency}</td>
                    <td>{stoppedHistoryPrescription.route}</td>
                    <td>{stoppedHistoryPrescription.stat ? (formatPrescriptionDateTime(stoppedHistoryPrescription.start_date) || 'Not set') : (formatPrescriptionDate(stoppedHistoryPrescription.start_date) || 'Not set')}</td>
                    <td>{formatPrescriptionStop(stoppedHistoryPrescription.end_date) || 'Open ended'}</td>
                    <td>{stoppedHistoryPrescription.indication || 'Not recorded'}</td>
                    <td>{stoppedHistoryPrescription.prescriber || 'Not recorded'}</td>
                    <td>
                      {stoppedHistoryPrescription.pharmacistApprovalStatus?.approved
                        ? `Approved by ${stoppedHistoryPrescription.pharmacistApprovalStatus.approvedBy || 'Unknown user'}${stoppedHistoryPrescription.pharmacistApprovalStatus.approvedAt ? ` on ${formatDateTimeLabel(new Date(stoppedHistoryPrescription.pharmacistApprovalStatus.approvedAt))}` : ''}`
                        : 'Not approved'}
                    </td>
                    <td>{stoppedHistoryPrescription.status}</td>
                  </tr>
                </tbody>
              </Table>

              <h5 className="mt-4">Amendment history</h5>
              {(() => {
                const amendmentEntries = (stoppedHistoryPrescription.amendmentHistory || []).slice().reverse();
                const showReasonColumn = amendmentEntries.some((entry) => normalizeHistoryReason(entry.reason));
                return (
              <Table responsive bordered size="sm">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Actor</th>
                    <th>Details</th>
                    {showReasonColumn ? <th>Reason</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {amendmentEntries.length ? amendmentEntries.map((item, itemIndex) => (
                    <tr key={`${item.timestamp}-${itemIndex}`}>
                      <td>{formatDateTimeLabel(new Date(item.timestamp))}</td>
                      <td>{formatHistoryAction(item)}</td>
                      <td>{item.actor || 'Unknown user'}</td>
                      <td>{formatHistoryDetails(item.details) || 'No further detail recorded.'}</td>
                      {showReasonColumn ? <td>{normalizeHistoryReason(item.reason)}</td> : null}
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={showReasonColumn ? 5 : 4} className="text-center text-muted">No amendment history recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </Table>
                );
              })()}

              <h5 className="mt-4">Administration history</h5>
              <Table responsive bordered size="sm">
                <thead>
                  <tr>
                    <th>Scheduled / actual time</th>
                    <th>Administrator</th>
                    <th>Status / reason</th>
                  </tr>
                </thead>
                <tbody>
                  {[...(stoppedHistoryPrescription.administrations || [])]
                    .sort((left, right) => {
                      const leftTime = new Date(left.adminDateTime || 0).getTime();
                      const rightTime = new Date(right.adminDateTime || 0).getTime();
                      return rightTime - leftTime;
                    })
                    .length ? [...(stoppedHistoryPrescription.administrations || [])]
                      .sort((left, right) => {
                        const leftTime = new Date(left.adminDateTime || 0).getTime();
                        const rightTime = new Date(right.adminDateTime || 0).getTime();
                        return rightTime - leftTime;
                      })
                      .map((item, itemIndex) => (
                        <tr key={`${item.adminDateTime}-${itemIndex}`}>
                          <td>{item.adminDateTime}</td>
                          <td>{item.administeredBy || 'Not recorded'}</td>
                          <td>{item.adminNote || 'No note recorded'}</td>
                        </tr>
                      )) : (
                    <tr>
                      <td colSpan={3} className="text-center text-muted">No administrations recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </>
          ) : null}
        </Modal.Body>
      </Modal>
      <Modal show={show} onHide={closeEditor} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>{editingPrescription ? 'Amend prescription' : 'Prescribe medication'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <AddPrescription
            newPrescription={handleNew}
            closeModal={closeEditor}
            editPrescription={editingPrescription}
            editPrescriptionIndex={editingIndex}
            saveEdit={handleSaveEdit}
            drugLibrary={drugLibrary}
            patient={patient}
            prescriberName={prescriberName}
            actorName={prescriberName}
            allowHistoricalAdministrations={allowHistoricalAdministrations}
            activeChartTutorialStepKey={activeChartTutorialStepKey}
            tutorialRefs={tutorialRefs}
          />
        </Modal.Body>
      </Modal>

      <Modal show={actionModal.show} onHide={closeActionModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            {actionModal.type === 'stop' ? 'Stop prescription' : null}
            {actionModal.type === 'start' ? 'Restart prescription' : null}
            {actionModal.type === 'suspend' ? 'Suspend administrations' : null}
            {actionModal.type === 'hold-dose' ? 'Suspend scheduled dose' : null}
            {actionModal.type === 'unsuspend-dose' ? 'Unsuspend scheduled dose' : null}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {actionModal.type === 'hold-dose' || actionModal.type === 'unsuspend-dose' ? (
            <Alert variant="info">
              Selected administration slot: <strong>{actionModal.slotDateTime}</strong>
            </Alert>
          ) : null}
          {actionModal.type === 'suspend' ? (
            <Form.Group className="mb-3" controlId="holdCount">
              <Form.Label>Administrations to hold</Form.Label>
              <Form.Select value={holdCount} onChange={(event) => setHoldCount(Number(event.target.value))}>
                {[1, 2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count}</option>)}
              </Form.Select>
            </Form.Group>
          ) : null}
          <Form.Group controlId="actionReason">
            <Form.Label>Documented reason for amendment</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={actionReason}
              onChange={(event) => setActionReason(event.target.value)}
              placeholder="Enter the reason for this medication change"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="outline-secondary" onClick={closeActionModal}>Cancel</Button>
          <Button type="button" onClick={applyPrescriptionAction} disabled={!actionReason.trim()}>
            Confirm action
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={administrationModal.show} onHide={closeAdministrationModal}>
        <Modal.Header closeButton>
          <Modal.Title>Chart administration</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info">
            {administrationModal.whenRequired ? (
              <>This PRN medication will be charted as administered at <strong>{administrationModal.slotDateTime}</strong>.</>
            ) : (
              <>Selected administration slot: <strong>{administrationModal.slotDateTime}</strong></>
            )}
          </Alert>
          {administrationModal.whenRequired ? (
            <>
              <div className="prn-admin-modal-summary">
                <div><strong>Last administered:</strong> {administrationModalLatestAdmin?.adminDateTime || 'Not yet charted'}</div>
                <div>{administrationModalLatestAdmin?.adminDateTime ? formatHoursSinceAdministration(administrationModalLatestAdmin.adminDateTime) : 'No administrations yet'}</div>
              </div>
              <Table responsive bordered size="sm" className="mb-3 prn-admin-panel__table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Administrator</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {administrationModalRecentAdmins.length ? administrationModalRecentAdmins.map((item, itemIndex) => (
                    <tr key={`${item.adminDateTime}-${itemIndex}`}>
                      <td>{item.adminDateTime}</td>
                      <td>{item.administeredBy || 'Not recorded'}</td>
                      <td>{item.adminNote || 'No note recorded'}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={3} className="text-center text-muted">No administrations recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </>
          ) : null}
          {!administrationModal.whenRequired ? (
            <Form.Group className="mb-3" controlId="administrationOutcome">
              <Form.Label>Outcome</Form.Label>
              <div className="administration-outcome-buttons">
                <Button
                  type="button"
                  variant={administrationModal.outcome === 'administered' ? 'primary' : 'outline-primary'}
                  onClick={() => {
                    setAdministrationModal((current) => ({ ...current, outcome: 'administered' }));
                    setAdministrationError('');
                  }}
                >
                  Administered
                </Button>
                <Button
                  type="button"
                  variant={administrationModal.outcome === 'missed' ? 'danger' : 'outline-danger'}
                  onClick={() => {
                    setAdministrationModal((current) => ({ ...current, outcome: 'missed' }));
                    setAdministrationError('');
                  }}
                >
                  Missed dose
                </Button>
              </div>
            </Form.Group>
            ) : null}
            {administrationModal.outcome === 'administered' ? (
              <Row className="g-3 mb-3">
                <Form.Group as={Col} md={6} controlId="actualAdministrationDate">
                  <Form.Label>Actual administration date</Form.Label>
                  <Form.Control
                    type="date"
                    value={actualAdministrationDate}
                    onChange={(event) => {
                      setActualAdministrationDate(event.target.value);
                      setAdministrationError('');
                    }}
                  />
                </Form.Group>
                <Form.Group as={Col} md={6} controlId="actualAdministrationTime">
                  <Form.Label>Actual administration time</Form.Label>
                  <Form.Control
                    type="time"
                    value={actualAdministrationTime}
                    onChange={(event) => {
                      setActualAdministrationTime(event.target.value);
                      setAdministrationError('');
                    }}
                  />
                </Form.Group>
              </Row>
            ) : null}
            <Form.Group className="mb-3" controlId="administrationNote">
            <Form.Label>{administrationModal.outcome === 'missed' ? 'Reason for missed dose' : 'Administration note'}</Form.Label>
            {administrationModal.outcome === 'missed' && !administrationModal.whenRequired ? (
              <Form.Select
                value={administrationNote}
                onChange={(event) => setAdministrationNote(event.target.value)}
              >
                <option value="">Select a reason</option>
                {missedDoseOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </Form.Select>
            ) : (
              <Form.Control
                as="textarea"
                rows={2}
                value={administrationNote}
                onChange={(event) => setAdministrationNote(event.target.value)}
                placeholder="Optional note for this administration"
              />
            )}
          </Form.Group>
          {administrationModal.outcome === 'administered' && (administrationModal.doseType === 'range' || administrationModal.requiresVariableDose) ? (
            <Form.Group className="mb-3" controlId="actualDose">
              <Form.Label>
                {administrationModal.requiresVariableDose
                  ? `Dose administered${administrationModal.scheduledDose ? ` (scheduled ${administrationModal.scheduledDose}${administrationModal.unit})` : ''}`
                  : `Dose administered (${administrationModal.doseMin}-${administrationModal.doseMax}${administrationModal.unit}, increments of ${administrationModal.doseIncrement}${administrationModal.unit})`}
              </Form.Label>
              <Form.Control
                type="number"
                step="any"
                value={actualDose}
                onChange={(event) => {
                  setActualDose(event.target.value);
                  setAdministrationError('');
                }}
              />
            </Form.Group>
          ) : null}
          {administrationModal.outcome === 'administered' && administrationModal.requiresWitness ? (
            <>
              <Alert variant="warning">This medication requires a witness.</Alert>
              <Form.Group className="mb-3" controlId="witnessUsername">
                <Form.Label>Witness username</Form.Label>
                <Form.Control value={witnessUsername} onChange={(event) => setWitnessUsername(event.target.value)} />
              </Form.Group>
              <Form.Group className="mb-3" controlId="witnessPassword">
                <Form.Label>Witness password</Form.Label>
                <Form.Control type="password" value={witnessPassword} onChange={(event) => setWitnessPassword(event.target.value)} />
              </Form.Group>
            </>
          ) : null}
          {administrationError ? <Alert variant="danger" className="mb-0">{administrationError}</Alert> : null}
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="outline-secondary" onClick={closeAdministrationModal}>Cancel</Button>
          <Button
            type="button"
            onClick={applyAdministration}
            disabled={
              (administrationModal.outcome === 'administered' && administrationModal.requiresWitness && (!witnessUsername.trim() || !witnessPassword.trim()))
              || (administrationModal.outcome === 'administered' && (administrationModal.doseType === 'range' || administrationModal.requiresVariableDose) && !actualDose)
              || (administrationModal.outcome === 'missed' && !administrationNote.trim())
            }
          >
            {administrationModal.whenRequired ? 'Administer medication' : administrationModal.outcome === 'missed' ? 'Record missed dose' : 'Chart administration'}
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal show={showTaskModal} onHide={closeTaskModal}>
        <Modal.Header closeButton>
          <Modal.Title>{taskLinkedPrescription ? `Add task for ${taskLinkedPrescription.drug}` : 'New general task'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {taskLinkedPrescription ? (
            <Alert variant="info">
              This task will be linked to <strong>{taskLinkedPrescription.drug}</strong>.
            </Alert>
          ) : null}
          <Form.Group
            ref={tutorialRefs.taskTitle}
            className={`mb-3 ${activeChartTutorialStepKey === 'task-title' ? 'epma-tutorial-target epma-tutorial-target--active' : ''}`}
            controlId="taskTitle"
          >
            <Form.Label>Task</Form.Label>
            <Form.Control value={taskTitle} onChange={(event) => { setTaskTitle(event.target.value); setTaskError(''); }} placeholder="Task Name" />
          </Form.Group>
          <Form.Group
            ref={tutorialRefs.taskProfession}
            className={`mb-3 ${activeChartTutorialStepKey === 'task-profession' ? 'epma-tutorial-target epma-tutorial-target--active' : ''}`}
            controlId="taskProfession"
          >
            <Form.Label>Assigned to</Form.Label>
            <Form.Select value={taskProfession} onChange={(event) => setTaskProfession(event.target.value)}>
              <option  value=""  disabled>Select a profession</option>
              {TASK_PROFESSIONS.map((profession) => <option key={profession} value={profession}>{profession}</option>)}
            </Form.Select>
          </Form.Group>
          <Form.Group
            ref={tutorialRefs.taskDescription}
            className={activeChartTutorialStepKey === 'task-description' ? 'epma-tutorial-target epma-tutorial-target--active' : ''}
            controlId="taskDescription"
          >
            <Form.Label>Additional detail</Form.Label>
            <Form.Control as="textarea" rows={3} value={taskDescription} onChange={(event) => setTaskDescription(event.target.value)} placeholder="Detail" />
          </Form.Group>
          {taskError ? <Alert variant="danger" className="mt-3 mb-0">{taskError}</Alert> : null}
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="outline-secondary" onClick={closeTaskModal}>Cancel</Button>
          <Button type="button" onClick={saveTask}>Save task</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default Prescriptions;
