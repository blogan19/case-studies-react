import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import ListGroup from 'react-bootstrap/ListGroup';
import Row from 'react-bootstrap/Row';
import Table from 'react-bootstrap/Table';
import fallbackDrugList from './drugList.json';
import { dateMatchesFrequency, formatDateTimeLabel, getFrequencySchedule, normalizeAdminTimes } from './chartUtils';

const createPrescriptionId = () => `prescription-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const buildHalfHourOptions = () => {
  const options = [];
  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += 30) {
      options.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    }
  }
  return options;
};

const halfHourOptions = buildHalfHourOptions();

const roundToNearestHalfHour = (date) => {
  const rounded = new Date(date);
  const minutes = rounded.getMinutes();
  const roundedMinutes = minutes < 15 ? 0 : minutes < 45 ? 30 : 60;
  rounded.setSeconds(0, 0);
  if (roundedMinutes === 60) {
    rounded.setHours(rounded.getHours() + 1, 0, 0, 0);
  } else {
    rounded.setMinutes(roundedMinutes, 0, 0);
  }
  return rounded;
};

const normalizeDrugLabel = (item) => [item.drugName, item.strength, item.form].filter(Boolean).join(' ');
const isInsulinCategory = (item) => String(item?.category || '').trim().toLowerCase() === 'insulin';
const normalizeDrugName = (value) => String(value || '').trim().toLowerCase();
const WEEKLY_ONLY_DRUGS = ['methotrexate'];
const WEEKLY_ONLY_FREQUENCY_LABEL = 'Once weekly';
const WARFARIN_DRUGS = ['warfarin'];
const WARFARIN_DEFAULT_ADMIN_TIME = '18:00';
const WEEKDAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TUTORIAL_PRESCRIBE_DETAIL_STEPS = new Set([
  'prescribe-dose',
  'prescribe-route-frequency',
  'prescribe-timing',
  'prescribe-indication',
  'prescribe-save',
]);

function stripPrnSuffix(label) {
  return String(label || '').replace(/\s+prn$/i, '').trim();
}

function formatPrnFrequencyLabel(label) {
  const baseLabel = stripPrnSuffix(label);
  return baseLabel ? `${baseLabel} PRN` : 'When required';
}

const isWarfarinMedicine = (itemOrName) => WARFARIN_DRUGS.includes(normalizeDrugName(
  typeof itemOrName === 'string' ? itemOrName : itemOrName?.drugName
));

function normalizeComparableValue(value, key = '') {
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (value && typeof value === 'object') {
    return JSON.stringify(value);
  }
  if (['start_date', 'end_date'].includes(key)) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return formatDateTimeLabel(parsed);
    }
  }
  return String(value ?? '').trim();
}

function describePrescriptionChanges(previousPrescription, nextPrescription) {
  if (!previousPrescription) {
    return 'Initial prescription created.';
  }

  const fields = [
    { key: 'drug', label: 'Drug' },
    { key: 'dose', label: 'Dose' },
    { key: 'route', label: 'Route' },
    { key: 'frequency', label: 'Frequency' },
    { key: 'indication', label: 'Indication' },
    { key: 'prescriptionNote', label: 'Prescription note' },
    { key: 'start_date', label: 'Start' },
    { key: 'end_date', label: 'Stop' },
    { key: 'stat', label: 'Stat' },
    { key: 'whenRequired', label: 'PRN' },
    { key: 'maxDose24h', label: 'PRN max in 24h' },
    { key: 'scheduledTimes', label: 'Administration times' },
    { key: 'variableDoseSchedule', label: 'Variable dose schedule' },
  ];

  const changes = fields.flatMap(({ key, label }) => {
    const previousValue = normalizeComparableValue(previousPrescription[key], key);
    const nextValue = normalizeComparableValue(nextPrescription[key], key);

    if (previousValue === nextValue) {
      return [];
    }

    return [`${label}: ${previousValue || 'Not recorded'} -> ${nextValue || 'Not recorded'}`];
  });

  return changes.length ? changes.join('; ') : 'Prescription updated without a visible field change.';
}
const isWeeklyOnlyMedicine = (itemOrName) => WEEKLY_ONLY_DRUGS.includes(normalizeDrugName(
  typeof itemOrName === 'string' ? itemOrName : itemOrName?.drugName
));
const scoreDrugSearchItem = (item) => [
  item.defaultRoute,
  item.usualFrequencies,
  item.defaultDose,
  item.maximumDose,
  item.notes,
].reduce((total, value) => total + (String(value || '').trim() ? 1 : 0), 0);

const dedupeDrugSearchResults = (items = []) => {
  const bestByLabel = new Map();

  items.forEach((item) => {
    const label = normalizeDrugLabel(item).trim().toLowerCase();
    if (!label) {
      return;
    }

    const existing = bestByLabel.get(label);
    if (!existing || scoreDrugSearchItem(item) > scoreDrugSearchItem(existing)) {
      bestByLabel.set(label, item);
    }
  });

  return [...bestByLabel.values()];
};

const normalizeVariableDoseSchedule = (schedule = {}, slots = []) => {
  const next = {};
  normalizeAdminTimes(slots).forEach((slot) => {
    const current = schedule?.[slot];
    next[slot] = {
      dose: String(current?.dose ?? current ?? '').trim(),
    };
  });
  return next;
};

const normalizeWarfarinWeekdaySchedule = (schedule = {}) => WEEKDAY_ORDER.reduce((next, day) => ({
  ...next,
  [day]: String(schedule?.[day]?.dose ?? schedule?.[day] ?? '').trim(),
}), {});

const formatWarfarinWeekdaySummary = (schedule = {}, unit = '') => WEEKDAY_ORDER
  .map((day) => {
    const dose = String(schedule?.[day] ?? '').trim();
    return dose ? `${day.slice(0, 3)} ${dose}${unit ? ` ${unit}` : ''}` : null;
  })
  .filter(Boolean)
  .join(', ');

const parseDisplayDateTime = (value) => {
  if (!value) {
    return null;
  }

  const [datePart = '', timePart = ''] = String(value).trim().split(' ');
  const [day, month, year] = datePart.split('/').map(Number);
  const [hour = 0, minute = 0] = timePart.split(':').map(Number);

  if (!day || !month || !year) {
    return null;
  }

  return new Date(year, month - 1, day, hour, minute);
};

const extractLatestInrResult = (biochemistry = {}) => {
  const matchingEntry = Object.values(biochemistry || {}).find((item) => String(item?.name || '').trim().toLowerCase() === 'inr');
  if (!matchingEntry || !Array.isArray(matchingEntry.results)) {
    return null;
  }

  return [...matchingEntry.results]
    .filter((item) => String(item?.result || '').trim())
    .sort((left, right) => {
      const leftTime = parseDisplayDateTime(left?.datetime)?.getTime() || new Date(left?.datetime || 0).getTime() || 0;
      const rightTime = parseDisplayDateTime(right?.datetime)?.getTime() || new Date(right?.datetime || 0).getTime() || 0;
      return rightTime - leftTime;
    })[0] || null;
};

const formatVariableDoseSummary = (schedule = {}, unit = '') => {
  const slots = normalizeAdminTimes(Object.keys(schedule || {}));
  return slots
    .map((slot) => {
      const dose = String(schedule?.[slot]?.dose ?? schedule?.[slot] ?? '').trim();
      return dose ? `${slot} ${dose}${unit ? ` ${unit}` : ''}` : null;
    })
    .filter(Boolean)
    .join(', ');
};

const parsePrescriptionStart = (dateValue, timeValue) => {
  if (!dateValue || !timeValue) {
    return null;
  }

  const parsed = new Date(`${dateValue}T${timeValue}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const createAdministrationTemplateId = () => `admin-template-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const getHistoricalTemplateTimes = ({ stat, whenRequired, startTime, scheduledTimes }) => {
  if (stat) {
    return normalizeAdminTimes(startTime ? [startTime] : []);
  }

  if (whenRequired) {
    return normalizeAdminTimes(startTime ? [startTime] : ['08:00']);
  }

  return normalizeAdminTimes(scheduledTimes);
};

const getFirstVisibleValidationMessage = (validationErrors = {}) => Object.values(validationErrors).find((value) => String(value || '').trim()) || '';

const buildHistoricalAdministrationTemplate = ({ timelineDays, times, existingEntries = [] }) => {
  const safeDays = Math.max(0, Number(timelineDays || 0));
  const existingLookup = new Map(
    (Array.isArray(existingEntries) ? existingEntries : []).map((item) => [
      `${item.relativeDayOffset}|${item.time}`,
      item,
    ])
  );

  const entries = [];
  for (let dayOffset = safeDays * -1; dayOffset <= -1; dayOffset += 1) {
    times.forEach((time) => {
      const key = `${dayOffset}|${time}`;
      const existing = existingLookup.get(key);
      entries.push({
        id: existing?.id || createAdministrationTemplateId(),
        relativeDayOffset: dayOffset,
        time,
        status: existing?.status || 'administered',
        note: existing?.note || '',
      });
    });
  }

  return entries;
};

const resolveHistoricalAdministrationPreview = ({ template, startTime, stopDateTime, stat }) => {
  const timelineDays = Math.max(0, Number(template?.timelineDays || 0));
  const baseDate = new Date();
  const [startHour, startMinute] = String(startTime || '08:00').split(':').map(Number);
  const resolvedStartDate = new Date(baseDate);
  resolvedStartDate.setHours(startHour || 0, startMinute || 0, 0, 0);
  resolvedStartDate.setDate(resolvedStartDate.getDate() - timelineDays);

  let resolvedEndDate = null;
  if (stat) {
    resolvedEndDate = new Date(resolvedStartDate);
  } else if (stopDateTime && !Number.isNaN(stopDateTime.getTime())) {
    const currentTimelineStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), startHour || 0, startMinute || 0);
    const durationMs = Math.max(0, stopDateTime.getTime() - currentTimelineStart.getTime());
    resolvedEndDate = new Date(resolvedStartDate.getTime() + durationMs);
  }

  const administrations = (template?.entries || [])
    .filter((item) => item.status && item.status !== 'scheduled')
    .map((item) => {
      const [hour, minute] = String(item.time || '08:00').split(':').map(Number);
      const administrationDate = new Date(baseDate);
      administrationDate.setHours(hour || 0, minute || 0, 0, 0);
      administrationDate.setDate(administrationDate.getDate() + Number(item.relativeDayOffset || 0));
      const baseNote = item.status === 'missed'
        ? 'Missed'
        : item.status === 'held'
          ? 'Held'
          : 'Administered';
      return {
        adminDateTime: formatDateTimeLabel(administrationDate),
        administeredBy: 'Case template',
        adminNote: item.note ? `${baseNote} - ${item.note}` : baseNote,
      };
    });

  return {
    resolvedStartDate,
    resolvedEndDate,
    administrations,
  };
};

const formatHistoricalDayOffset = (value) => `${Math.abs(Number(value || 0))} day${Math.abs(Number(value || 0)) === 1 ? '' : 's'} before case opens`;

const AddPrescription = ({
  newPrescription,
  editPrescription,
  editPrescriptionIndex,
  saveEdit,
  closeModal,
  drugLibrary,
  patient,
  prescriberName = 'Dr Test',
  actorName = 'Student user',
  allowHistoricalAdministrations = false,
  activeChartTutorialStepKey = '',
  tutorialRefs = {},
}) => {
  const routeRef = useRef(null);
  const defaultDateTime = roundToNearestHalfHour(new Date());
  const defaultDate = defaultDateTime.toISOString().slice(0, 10);
  const defaultTime = `${String(defaultDateTime.getHours()).padStart(2, '0')}:${String(defaultDateTime.getMinutes()).padStart(2, '0')}`;

  const catalogue = useMemo(() => ({
    ...(drugLibrary || {
      items: (fallbackDrugList.drugs || []).map((item, index) => ({
        id: String(index),
        drugName: item[0] || '',
        strength: item[1] || '',
        unit: item[2] || '',
        form: item[3] || '',
        defaultRoute: item[4] || '',
        criticalMedicine: false,
        controlledDrug: false,
        requiresWitness: false,
      })),
      metadata: {
        routes: fallbackDrugList.routes || [],
        frequencies: fallbackDrugList.frequencies || [],
        nonAdmins: fallbackDrugList.nonAdmins || [],
      },
    }),
    metadata: {
      ...(drugLibrary?.metadata || {
        routes: fallbackDrugList.routes || [],
        frequencies: fallbackDrugList.frequencies || [],
        nonAdmins: fallbackDrugList.nonAdmins || [],
      }),
      frequencyOptions: drugLibrary?.metadata?.frequencyOptions?.length
        ? drugLibrary.metadata.frequencyOptions
        : (drugLibrary?.metadata?.frequencies || fallbackDrugList.frequencies || []).map((item, index) => ({
            id: `frequency-${index}`,
            label: item,
            defaultAdminTimes: getFrequencySchedule(item),
          })),
      routeOptions: drugLibrary?.metadata?.routeOptions?.length
        ? drugLibrary.metadata.routeOptions
        : (drugLibrary?.metadata?.routes || fallbackDrugList.routes || []).map((item, index) => ({
            id: `route-${index}`,
            label: item,
          })),
      reactionOptions: drugLibrary?.metadata?.reactionOptions || [],
      orderSets: drugLibrary?.metadata?.orderSets || [],
    },
  }), [drugLibrary]);
  const prescribableDrugItems = useMemo(() => {
    const baseItems = Array.isArray(catalogue.items) ? catalogue.items : [];
    const nextItems = [...baseItems];

    WARFARIN_DRUGS.forEach((drugName) => {
      const matchingItems = baseItems.filter((item) => normalizeDrugName(item.drugName) === drugName);
      if (!matchingItems.length) {
        return;
      }

      const existingGeneric = matchingItems.find((item) => !String(item.strength || '').trim());
      if (existingGeneric) {
        return;
      }

      const template = matchingItems[0];
      nextItems.unshift({
        ...template,
        id: `generic-${drugName}`,
        strength: '',
        form: '',
        defaultDose: '',
      });
    });

    return nextItems;
  }, [catalogue.items]);
  const tutorialDrugCandidate = useMemo(() => {
    const safeItems = prescribableDrugItems.filter((item) => !isWarfarinMedicine(item) && !isInsulinCategory(item));
    return safeItems.find((item) => normalizeDrugName(item.drugName).includes('paracetamol'))
      || safeItems.find((item) => item.defaultDose && item.defaultRoute && item.usualFrequencies && item.unit)
      || safeItems[0]
      || null;
  }, [prescribableDrugItems]);

  const [drugSearch, setDrugSearch] = useState('');
  const [selectedDrugId, setSelectedDrugId] = useState('');
  const [freeFormDrug, setFreeFormDrug] = useState(false);
  const [selectedOrderSetId, setSelectedOrderSetId] = useState('');
  const [showOrderSetSelector, setShowOrderSetSelector] = useState(true);
  const [showLibraryBrowser, setShowLibraryBrowser] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [doseType, setDoseType] = useState('fixed');
  const [dose, setDose] = useState('');
  const [doseMin, setDoseMin] = useState('');
  const [doseMax, setDoseMax] = useState('');
  const [doseIncrement, setDoseIncrement] = useState('');
  const [unit, setUnit] = useState('');
  const [frequency, setFrequency] = useState('');
  const [customFrequencyName, setCustomFrequencyName] = useState('');
  const [useSpecificAdminTimes, setUseSpecificAdminTimes] = useState(false);
  const [selectedAdminTime, setSelectedAdminTime] = useState('08:00');
  const [customAdminTimes, setCustomAdminTimes] = useState([]);
  const [route, setRoute] = useState('');
  const [form, setForm] = useState('');
  const [strength, setStrength] = useState('');
  const [startDate, setStartDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState(defaultTime);
  const [stopDate, setStopDate] = useState('');
  const [stopTime, setStopTime] = useState('23:59');
  const [indication, setIndication] = useState('');
  const [prescriptionNote, setPrescriptionNote] = useState('');
  const [warfarinWeekdaySchedule, setWarfarinWeekdaySchedule] = useState(() => normalizeWarfarinWeekdaySchedule({}));
  const [stat, setStat] = useState(false);
  const [whenRequired, setWhenRequired] = useState(false);
  const [maxDose24h, setMaxDose24h] = useState('');
  const [amendmentReason, setAmendmentReason] = useState('');
  const [administrations, setAdministrations] = useState([]);
  const [authorHistoricalAdministrations, setAuthorHistoricalAdministrations] = useState(false);
  const [historicalAdministrationDays, setHistoricalAdministrationDays] = useState(3);
  const [historicalAdministrationTemplate, setHistoricalAdministrationTemplate] = useState([]);
  const [variableDoseSchedule, setVariableDoseSchedule] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [allergyOverrideAccepted, setAllergyOverrideAccepted] = useState(false);
  const validationSummaryMessage = useMemo(
    () => (validationAttempted ? getFirstVisibleValidationMessage(validationErrors) : ''),
    [validationAttempted, validationErrors]
  );

  const selectedDrug = useMemo(
    () => prescribableDrugItems.find((item) => String(item.id) === String(selectedDrugId)) || null,
    [prescribableDrugItems, selectedDrugId]
  );
  const isWeeklyOnlyDrug = useMemo(
    () => isWeeklyOnlyMedicine(freeFormDrug ? drugSearch : selectedDrug),
    [drugSearch, freeFormDrug, selectedDrug]
  );
  const isVariableDoseMedicine = useMemo(
    () => isInsulinCategory(selectedDrug) || Boolean(editPrescription?.variableDoseSchedule && Object.keys(editPrescription.variableDoseSchedule).length),
    [editPrescription?.variableDoseSchedule, selectedDrug]
  );
  const isWarfarinDrug = useMemo(
    () => isWarfarinMedicine(freeFormDrug ? drugSearch : selectedDrug) || Boolean(editPrescription?.warfarinWeekdaySchedule && Object.keys(editPrescription.warfarinWeekdaySchedule).length),
    [drugSearch, editPrescription?.warfarinWeekdaySchedule, freeFormDrug, selectedDrug]
  );
  const latestInrResult = useMemo(() => extractLatestInrResult(patient?.biochemistry || {}), [patient?.biochemistry]);
  const selectedDrugMaximumDose = useMemo(() => {
    const rawValue = String(selectedDrug?.maximumDose || '').trim();
    if (!rawValue) {
      return null;
    }

    const numericValue = Number(rawValue);
    return Number.isNaN(numericValue) ? null : numericValue;
  }, [selectedDrug]);
  const liveMaximumDoseError = useMemo(() => {
    if (selectedDrugMaximumDose === null) {
      return { dose: '', doseRange: '' };
    }

    if (doseType === 'fixed' && dose) {
      const numericDose = Number(dose);
      if (!Number.isNaN(numericDose) && numericDose > selectedDrugMaximumDose) {
        return {
          dose: `This is above the maximum dose of ${selectedDrugMaximumDose}${unit || ''}.`,
          doseRange: '',
        };
      }
    }

    if (doseType === 'range' && doseMax) {
      const numericDoseMax = Number(doseMax);
      if (!Number.isNaN(numericDoseMax) && numericDoseMax > selectedDrugMaximumDose) {
        return {
          dose: '',
          doseRange: `This is above the maximum dose of ${selectedDrugMaximumDose}${unit || ''}.`,
        };
      }
    }

    return { dose: '', doseRange: '' };
  }, [dose, doseMax, doseType, selectedDrugMaximumDose, unit]);
  const selectedDrugName = useMemo(() => {
    if (freeFormDrug) {
      return drugSearch.trim();
    }
    return selectedDrug?.drugName || '';
  }, [drugSearch, freeFormDrug, selectedDrug]);
  const orderSets = useMemo(() => catalogue.metadata.orderSets || [], [catalogue.metadata.orderSets]);
  const selectedDrugOrderSets = useMemo(
    () => orderSets.filter((item) => item.drugName?.trim().toLowerCase() === selectedDrugName.trim().toLowerCase()),
    [orderSets, selectedDrugName]
  );

  const drugResults = useMemo(() => {
    const searchTerm = drugSearch.trim().toLowerCase();
    if (freeFormDrug || searchTerm.length < 3) {
      return [];
    }

    return dedupeDrugSearchResults(prescribableDrugItems
      .filter((item) => normalizeDrugLabel(item).toLowerCase().includes(searchTerm))
    ).slice(0, 12);
  }, [drugSearch, freeFormDrug, prescribableDrugItems]);
  const libraryResults = useMemo(() => {
    const searchTerm = librarySearch.trim().toLowerCase();
    const drugMatches = prescribableDrugItems
        .filter((item) => {
        if (!searchTerm) {
          return true;
        }
        return normalizeDrugLabel(item).toLowerCase().includes(searchTerm);
      })
      .map((item) => ({
        key: `drug-${item.id}`,
        type: 'drug',
        title: normalizeDrugLabel(item),
        subtitle: [item.defaultRoute, item.defaultDose ? `Default dose ${item.defaultDose}${item.unit || ''}` : '', item.defaultIndication].filter(Boolean).join(' | '),
        item,
        }));
    const orderSetMatches = orderSets
      .filter((item) => {
        const label = [item.drugName, item.label, item.route, item.frequency, item.indication].filter(Boolean).join(' ');
        if (!searchTerm) {
          return true;
        }
        return label.toLowerCase().includes(searchTerm);
      })
      .map((item) => ({
        key: `orderset-${item.id}`,
        type: 'orderSet',
        title: `${item.drugName} - ${item.label}`,
        subtitle: [item.route, item.frequency, item.indication].filter(Boolean).join(' | '),
        item,
      }));

    return [...drugMatches, ...orderSetMatches].slice(0, 200);
  }, [librarySearch, orderSets, prescribableDrugItems]);

  const allergyWarnings = useMemo(() => {
    if (!selectedDrugName || patient?.nkda) {
      return { blocking: [], advisory: [] };
    }

    const reactionLookup = new Map((catalogue.metadata.reactionOptions || []).map((item) => [item.label, item]));
    const matches = (patient?.allergies || []).filter((item) => String(item.drug || '').trim().toLowerCase() === selectedDrugName.trim().toLowerCase());
    return {
      blocking: matches.filter((item) => reactionLookup.get(item.reaction)?.blocksPrescribing),
      advisory: matches.filter((item) => !reactionLookup.get(item.reaction)?.blocksPrescribing),
    };
  }, [catalogue.metadata.reactionOptions, patient, selectedDrugName]);

  const frequencyOptions = useMemo(() => catalogue.metadata.frequencyOptions || [], [catalogue.metadata.frequencyOptions]);
  const routeOptions = useMemo(() => catalogue.metadata.routeOptions || [], [catalogue.metadata.routeOptions]);
  const indicationOptions = useMemo(() => catalogue.metadata.indicationOptions || [], [catalogue.metadata.indicationOptions]);
  const indicationSearchTerm = String(indication || '').trim().toLowerCase();
  const filteredIndicationOptions = useMemo(() => {
    if (indicationSearchTerm.length < 3) {
      return [];
    }

    return indicationOptions
      .filter((item) => String(item?.label || '').trim().toLowerCase().includes(indicationSearchTerm))
      .slice(0, 12);
  }, [indicationOptions, indicationSearchTerm]);
  const prnFrequencyLabel = useMemo(
    () => stripPrnSuffix(useSpecificAdminTimes ? customFrequencyName.trim() : frequency),
    [customFrequencyName, frequency, useSpecificAdminTimes]
  );
  const effectiveFrequencyLabel = stat
    ? 'Stat'
    : whenRequired
      ? formatPrnFrequencyLabel(prnFrequencyLabel)
      : (useSpecificAdminTimes ? customFrequencyName.trim() : frequency);
  const defaultScheduledTimes = useMemo(
    () => (stat
      ? normalizeAdminTimes(startTime ? [startTime] : [])
      : getFrequencySchedule(frequency, frequencyOptions)),
    [frequency, frequencyOptions, startTime, stat]
  );
  const insulinDoseSlots = useMemo(
    () => (!stat && !whenRequired && isVariableDoseMedicine
      ? normalizeAdminTimes(useSpecificAdminTimes ? customAdminTimes : defaultScheduledTimes)
      : []),
    [customAdminTimes, defaultScheduledTimes, isVariableDoseMedicine, stat, useSpecificAdminTimes, whenRequired]
  );
  const effectiveVariableDoseSchedule = useMemo(() => {
    const currentHasValues = Object.keys(variableDoseSchedule || {}).length > 0;
    const fallbackSchedule = editPrescription?.variableDoseSchedule || {};
    const sourceSchedule = currentHasValues ? variableDoseSchedule : fallbackSchedule;
    const relevantSlots = insulinDoseSlots.length ? insulinDoseSlots : Object.keys(sourceSchedule || {});
    return normalizeVariableDoseSchedule(sourceSchedule, relevantSlots);
  }, [editPrescription?.variableDoseSchedule, insulinDoseSlots, variableDoseSchedule]);
  const firstDoseDateTime = useMemo(() => {
    const startDateTime = parsePrescriptionStart(startDate, startTime);
    if (!startDateTime) {
      return null;
    }

    if (stat) {
      return startDateTime;
    }
    if (whenRequired) {
      return null;
    }

    const candidateTimes = useSpecificAdminTimes ? customAdminTimes : defaultScheduledTimes;
    const sortedTimes = normalizeAdminTimes(candidateTimes);
    for (let dayOffset = 0; dayOffset < 14; dayOffset += 1) {
      const candidateDay = new Date(startDateTime);
      candidateDay.setDate(candidateDay.getDate() + dayOffset);
      for (const slotTime of sortedTimes) {
        const [hour, minute] = slotTime.split(':').map(Number);
        const candidate = new Date(candidateDay.getFullYear(), candidateDay.getMonth(), candidateDay.getDate(), hour, minute);
        if (candidate >= startDateTime && dateMatchesFrequency(effectiveFrequencyLabel, candidate, startDateTime)) {
          return candidate;
        }
      }
    }

    return null;
  }, [customAdminTimes, defaultScheduledTimes, effectiveFrequencyLabel, startDate, startTime, stat, useSpecificAdminTimes, whenRequired]);
  const isEditingPrescription = Boolean(editPrescription && editPrescription !== '');

  useEffect(() => {
    if (editPrescription && editPrescription !== '') {
      return;
    }

    setDrugSearch('');
    setSelectedDrugId('');
    setFreeFormDrug(false);
    setSelectedOrderSetId('');
    setShowOrderSetSelector(true);
    setShowLibraryBrowser(false);
    setLibrarySearch('');
    setDoseType('fixed');
    setDose('');
    setDoseMin('');
    setDoseMax('');
    setDoseIncrement('');
    setUnit('');
    setFrequency('');
    setCustomFrequencyName('');
    setUseSpecificAdminTimes(false);
    setSelectedAdminTime('08:00');
    setCustomAdminTimes([]);
    setRoute('');
    setForm('');
    setStrength('');
    setStartDate(defaultDate);
    setStartTime(defaultTime);
    setStopDate('');
    setStopTime('23:59');
    setIndication('');
    setPrescriptionNote('');
    setWarfarinWeekdaySchedule(normalizeWarfarinWeekdaySchedule({}));
    setStat(false);
    setWhenRequired(false);
    setMaxDose24h('');
    setAmendmentReason('');
    setAdministrations([]);
    setAuthorHistoricalAdministrations(false);
    setHistoricalAdministrationDays(3);
    setHistoricalAdministrationTemplate([]);
    setVariableDoseSchedule({});
    setValidationErrors({});
    setValidationAttempted(false);
    setAllergyOverrideAccepted(false);
  }, [defaultDate, defaultTime, editPrescription]);

  useEffect(() => {
    if (!editPrescription || editPrescription === '') {
      return;
    }

      const matchedDrug = prescribableDrugItems.find((item) => normalizeDrugLabel(item).toLowerCase() === normalizeDrugLabel({
        drugName: editPrescription.drug || '',
        strength: editPrescription.strength || '',
        form: editPrescription.form || '',
      }).toLowerCase() || item.drugName?.toLowerCase() === String(editPrescription.drug || '').toLowerCase());

    if (editPrescription.drugindex === 'freeform' || !matchedDrug) {
      setFreeFormDrug(true);
      setDrugSearch(editPrescription.drug || '');
    } else {
      setSelectedDrugId(matchedDrug.id);
      setDrugSearch(normalizeDrugLabel(matchedDrug));
    }

    setDose(String(editPrescription.dose || '').replace(editPrescription.unit || '', ''));
    setDoseType(editPrescription.doseType || 'fixed');
    setDoseMin(editPrescription.doseMin || '');
    setDoseMax(editPrescription.doseMax || '');
    setDoseIncrement(editPrescription.doseIncrement || '');
    setUnit(editPrescription.unit || matchedDrug?.unit || '');
    setRoute(editPrescription.route || matchedDrug?.defaultRoute || '');
    setStrength(editPrescription.strength || matchedDrug?.strength || '');
    setForm(editPrescription.form || matchedDrug?.form || '');
    setIndication(editPrescription.indication || '');
    setPrescriptionNote(editPrescription.prescriptionNote || editPrescription.note || '');
    setWarfarinWeekdaySchedule(normalizeWarfarinWeekdaySchedule(editPrescription.warfarinWeekdaySchedule || {}));
    setAmendmentReason('');
    setAllergyOverrideAccepted(false);
    setStat(Boolean(editPrescription.stat));
    setWhenRequired(Boolean(editPrescription.whenRequired));
    setStopTime('23:59');
    setMaxDose24h(editPrescription.maxDose24h || '');
    setAdministrations(Array.isArray(editPrescription.administrations) ? editPrescription.administrations : []);
    const existingTemplate = editPrescription.administrationTemplate || null;
      setAuthorHistoricalAdministrations(Boolean(existingTemplate?.enabled));
      setHistoricalAdministrationDays(Number(existingTemplate?.timelineDays || editPrescription.historicalAdministrationDays || 3));
      setHistoricalAdministrationTemplate(Array.isArray(existingTemplate?.entries) ? existingTemplate.entries : []);
      setVariableDoseSchedule(normalizeVariableDoseSchedule(editPrescription.variableDoseSchedule || {}, Object.keys(editPrescription.variableDoseSchedule || {})));
    setSelectedOrderSetId(editPrescription.orderSetId || '');

    const existingTimes = normalizeAdminTimes(editPrescription.scheduledTimes || []);
    const editingStat = Boolean(editPrescription.stat);
    const editingWhenRequired = Boolean(editPrescription.whenRequired);
    const editableFrequencyLabel = editingWhenRequired
      ? stripPrnSuffix(editPrescription.frequency || '')
      : String(editPrescription.frequency || '').trim();
    const matchedFrequencyOption = frequencyOptions.find(
      (item) => String(item.label || '').trim().toLowerCase() === editableFrequencyLabel.trim().toLowerCase()
    );
    const matchedFrequencyTimes = matchedFrequencyOption ? normalizeAdminTimes(matchedFrequencyOption.defaultAdminTimes || []) : [];
    const isCustomTimed = !editingStat && !editingWhenRequired && existingTimes.length > 0 && JSON.stringify(existingTimes) !== JSON.stringify(matchedFrequencyTimes);

    setFrequency(matchedFrequencyOption?.label || (editingWhenRequired ? editableFrequencyLabel : ''));
    setUseSpecificAdminTimes(isCustomTimed);
    setCustomFrequencyName(isCustomTimed ? (editPrescription.frequency || '') : '');
    setCustomAdminTimes(isCustomTimed ? existingTimes : []);

    if (existingTemplate?.enabled) {
      const parsedTemplateStart = editPrescription.start_date ? new Date(editPrescription.start_date) : null;
      if (parsedTemplateStart && !Number.isNaN(parsedTemplateStart.getTime())) {
        setStartDate(defaultDate);
        setStartTime(`${String(parsedTemplateStart.getHours()).padStart(2, '0')}:${String(parsedTemplateStart.getMinutes()).padStart(2, '0')}`);
      }

      if (!editPrescription.stat && editPrescription.end_date && parsedTemplateStart && !Number.isNaN(parsedTemplateStart.getTime())) {
        const parsedTemplateStop = new Date(editPrescription.end_date);
        if (!Number.isNaN(parsedTemplateStop.getTime())) {
          const durationDays = Math.max(1, Math.ceil((parsedTemplateStop.getTime() - parsedTemplateStart.getTime()) / (24 * 60 * 60 * 1000)) + 1);
          const rebasedStop = new Date(`${defaultDate}T00:00`);
          rebasedStop.setDate(rebasedStop.getDate() + durationDays - 1);
          setStopDate(rebasedStop.toISOString().slice(0, 10));
          setStopTime(`${String(parsedTemplateStop.getHours()).padStart(2, '0')}:${String(parsedTemplateStop.getMinutes()).padStart(2, '0')}`);
        }
      }
    } else {
      if (editPrescription.start_date) {
        const parsedStart = new Date(editPrescription.start_date);
        if (!Number.isNaN(parsedStart.getTime())) {
          setStartDate(parsedStart.toISOString().slice(0, 10));
          setStartTime(`${String(parsedStart.getHours()).padStart(2, '0')}:${String(parsedStart.getMinutes()).padStart(2, '0')}`);
        } else {
          setStartDate(editPrescription.start_date);
        }
      }

      if (editPrescription.end_date) {
        const parsedStop = new Date(editPrescription.end_date);
        if (!Number.isNaN(parsedStop.getTime())) {
          setStopDate(parsedStop.toISOString().slice(0, 10));
          setStopTime(`${String(parsedStop.getHours()).padStart(2, '0')}:${String(parsedStop.getMinutes()).padStart(2, '0')}`);
        }
      }
    }
  }, [defaultDate, editPrescription, frequencyOptions, prescribableDrugItems]);

  useEffect(() => {
    if (!isVariableDoseMedicine) {
      setVariableDoseSchedule({});
      return;
    }

    setVariableDoseSchedule((current) => {
      const sourceSchedule = Object.keys(current || {}).length ? current : (editPrescription?.variableDoseSchedule || {});
      return normalizeVariableDoseSchedule(sourceSchedule, insulinDoseSlots);
    });
  }, [editPrescription?.variableDoseSchedule, insulinDoseSlots, isVariableDoseMedicine]);

  useEffect(() => {
    if (!isWeeklyOnlyDrug) {
      return;
    }

    setStat(false);
    setWhenRequired(false);
    setUseSpecificAdminTimes(false);
    setCustomFrequencyName('');
    setCustomAdminTimes([]);
    setFrequency((current) => (String(current || '').trim().toLowerCase() === WEEKLY_ONLY_FREQUENCY_LABEL.toLowerCase()
      ? current
      : WEEKLY_ONLY_FREQUENCY_LABEL));
  }, [isWeeklyOnlyDrug]);

  useEffect(() => {
    if (!isWarfarinDrug) {
      return;
    }

    setStat(false);
    setWhenRequired(false);
    setMaxDose24h('');
    setUseSpecificAdminTimes(true);
    setFrequency((current) => current || 'Once daily');
    setCustomFrequencyName((current) => current || 'Once daily');
    setCustomAdminTimes((current) => (current.length ? current : [WARFARIN_DEFAULT_ADMIN_TIME]));
    setSelectedAdminTime((current) => current || WARFARIN_DEFAULT_ADMIN_TIME);
    setStartTime((current) => current || WARFARIN_DEFAULT_ADMIN_TIME);
  }, [isWarfarinDrug]);

  const selectDrug = useCallback((drugItem) => {
    const matchedFrequency = frequencyOptions.find(
      (item) => item.label.trim().toLowerCase() === String(drugItem.usualFrequencies || '').trim().toLowerCase()
    );
    const weeklyFrequency = frequencyOptions.find(
      (item) => item.label.trim().toLowerCase() === WEEKLY_ONLY_FREQUENCY_LABEL.toLowerCase()
    );
    const lockedWeekly = isWeeklyOnlyMedicine(drugItem);

    setSelectedDrugId(drugItem.id);
    setFreeFormDrug(false);
    setDrugSearch(normalizeDrugLabel(drugItem));
    setStrength(isWarfarinMedicine(drugItem) ? '' : (drugItem.strength || ''));
    setUnit(drugItem.unit || '');
    setForm(drugItem.form || '');
    setRoute(drugItem.defaultRoute || '');
    setDose(drugItem.defaultDose || '');
    setFrequency(isWarfarinMedicine(drugItem) ? 'Once daily' : (lockedWeekly ? (weeklyFrequency?.label || WEEKLY_ONLY_FREQUENCY_LABEL) : (matchedFrequency?.label || drugItem.usualFrequencies || '')));
    setDoseType('fixed');
    setDoseMin('');
    setDoseMax('');
    setDoseIncrement('');
    setSelectedOrderSetId('');
    setShowOrderSetSelector(true);
    setIndication('');
    setPrescriptionNote('');
    setVariableDoseSchedule({});
    setWarfarinWeekdaySchedule(normalizeWarfarinWeekdaySchedule({}));
    setStat(false);
    setWhenRequired(false);
      setUseSpecificAdminTimes(isWarfarinMedicine(drugItem));
      setCustomFrequencyName(isWarfarinMedicine(drugItem) ? 'Once daily' : '');
      setCustomAdminTimes(isWarfarinMedicine(drugItem) ? [WARFARIN_DEFAULT_ADMIN_TIME] : []);
      setSelectedAdminTime(isWarfarinMedicine(drugItem) ? WARFARIN_DEFAULT_ADMIN_TIME : '08:00');
      setStartTime(isWarfarinMedicine(drugItem) ? WARFARIN_DEFAULT_ADMIN_TIME : defaultTime);
      setWarfarinWeekdaySchedule(normalizeWarfarinWeekdaySchedule({}));
      setValidationErrors((current) => ({ ...current, drug: '', dose: '', route: '' }));
    setAllergyOverrideAccepted(false);
    window.setTimeout(() => routeRef.current?.focus(), 0);
  }, [defaultTime, frequencyOptions]);

  useEffect(() => {
    if (
      TUTORIAL_PRESCRIBE_DETAIL_STEPS.has(activeChartTutorialStepKey)
      && tutorialDrugCandidate
      && !selectedDrugId
      && !freeFormDrug
      && !editPrescription
    ) {
      selectDrug(tutorialDrugCandidate);
    }
  }, [activeChartTutorialStepKey, editPrescription, freeFormDrug, selectDrug, selectedDrugId, tutorialDrugCandidate]);

  const regenerateHistoricalAdministrations = useCallback(() => {
    const times = getHistoricalTemplateTimes({
      stat,
      whenRequired,
      startTime,
      scheduledTimes: stat
        ? normalizeAdminTimes(startTime ? [startTime] : [])
        : whenRequired
          ? normalizeAdminTimes(startTime ? [startTime] : ['08:00'])
          : getFrequencySchedule(
              effectiveFrequencyLabel,
              frequencyOptions,
              useSpecificAdminTimes ? customAdminTimes : []
            ),
    });
    setHistoricalAdministrationTemplate((current) => buildHistoricalAdministrationTemplate({
      timelineDays: historicalAdministrationDays,
      times,
      existingEntries: current,
    }));
    setValidationErrors((current) => ({ ...current, historicalAdministrationTemplate: '' }));
  }, [
    customAdminTimes,
    effectiveFrequencyLabel,
    frequencyOptions,
    historicalAdministrationDays,
    startTime,
    stat,
    useSpecificAdminTimes,
    whenRequired,
  ]);

  useEffect(() => {
    if (!authorHistoricalAdministrations) {
      return;
    }

    regenerateHistoricalAdministrations();
  }, [authorHistoricalAdministrations, regenerateHistoricalAdministrations]);

  const handleToggleFreeFormDrug = (checked) => {
    setFreeFormDrug(checked);
    setSelectedDrugId('');
    setDrugSearch('');
    setStrength('');
    setUnit('');
    setForm('');
    setRoute('');
    setDose('');
    setDoseType('fixed');
    setDoseMin('');
    setDoseMax('');
    setDoseIncrement('');
    setSelectedOrderSetId('');
    setShowOrderSetSelector(true);
    setAllergyOverrideAccepted(false);
  };

  const openLibraryBrowser = () => {
    setShowLibraryBrowser((current) => !current);
    setLibrarySearch('');
  };

  const applyOrderSet = (orderSet) => {
    const matchedRoute = routeOptions.find((item) => item.label.trim().toLowerCase() === String(orderSet.route || '').trim().toLowerCase());
    const matchedFrequency = frequencyOptions.find((item) => item.label.trim().toLowerCase() === String(orderSet.frequency || '').trim().toLowerCase());
    setSelectedOrderSetId(orderSet.id);
    setShowOrderSetSelector(false);
    setDoseType('fixed');
    setDose(orderSet.dose || '');
    setDoseMin('');
    setDoseMax('');
    setDoseIncrement('');
    setUnit(orderSet.unit || unit);
    setFrequency(isWeeklyOnlyMedicine(orderSet.drugName) ? WEEKLY_ONLY_FREQUENCY_LABEL : (matchedFrequency?.label || orderSet.frequency || ''));
    setRoute(matchedRoute?.label || orderSet.route || route);
    setIndication('');
    setPrescriptionNote('');
    setWarfarinWeekdaySchedule(normalizeWarfarinWeekdaySchedule({}));
    setWhenRequired(false);
    setStat(false);
    setUseSpecificAdminTimes(isWarfarinMedicine(orderSet.drugName));
    setCustomFrequencyName(isWarfarinMedicine(orderSet.drugName) ? 'Once daily' : '');
    setCustomAdminTimes(isWarfarinMedicine(orderSet.drugName) ? [WARFARIN_DEFAULT_ADMIN_TIME] : []);
    setSelectedAdminTime(isWarfarinMedicine(orderSet.drugName) ? WARFARIN_DEFAULT_ADMIN_TIME : '08:00');
    setStartTime(isWarfarinMedicine(orderSet.drugName) ? WARFARIN_DEFAULT_ADMIN_TIME : startTime);
    setValidationErrors((current) => ({
      ...current,
      dose: '',
      doseRange: '',
      frequency: '',
      route: '',
    }));
  };

  const selectOrderSetFromLibrary = (orderSet) => {
    const matchedDrug = prescribableDrugItems.find((item) => String(item.drugName || '').trim().toLowerCase() === String(orderSet.drugName || '').trim().toLowerCase());
    if (matchedDrug) {
      selectDrug(matchedDrug);
    } else {
      setSelectedDrugId('');
      setFreeFormDrug(true);
      setDrugSearch(orderSet.drugName || '');
      setStrength('');
      setForm('');
    }
    applyOrderSet(orderSet);
    setShowLibraryBrowser(false);
    setLibrarySearch('');
  };

  const pickOwnOrderSet = () => {
    setSelectedOrderSetId('custom');
    setShowOrderSetSelector(false);
    setDoseType('fixed');
    setDose('');
    setDoseMin('');
    setDoseMax('');
    setDoseIncrement('');
    setFrequency('');
    setRoute('');
    setIndication('');
    setPrescriptionNote('');
    setWarfarinWeekdaySchedule(normalizeWarfarinWeekdaySchedule({}));
    setWhenRequired(false);
    setStat(false);
    setUseSpecificAdminTimes(false);
    setCustomFrequencyName('');
    setCustomAdminTimes([]);
    setVariableDoseSchedule({});
    setValidationErrors((current) => ({
      ...current,
      dose: '',
      doseRange: '',
      frequency: '',
      route: '',
    }));
  };

  const addCustomAdminTime = () => {
    setCustomAdminTimes((current) => normalizeAdminTimes([...current, selectedAdminTime]));
  };

  const removeCustomAdminTime = (timeToRemove) => {
    setCustomAdminTimes((current) => current.filter((item) => item !== timeToRemove));
  };

  const updateVariableDoseForSlot = (slot, value) => {
    setVariableDoseSchedule((current) => ({
      ...current,
      [slot]: {
        dose: value,
      },
    }));
    setValidationErrors((current) => ({ ...current, variableDoseSchedule: '' }));
  };

  const updateWarfarinDoseForDay = (day, value) => {
    setWarfarinWeekdaySchedule((current) => ({
      ...current,
      [day]: value,
    }));
    setValidationErrors((current) => ({ ...current, warfarinWeekdaySchedule: '' }));
  };

  const clearSelectedDrug = () => {
    setSelectedDrugId('');
    setDrugSearch('');
    setSelectedOrderSetId('');
    setShowOrderSetSelector(true);
    setDoseType('fixed');
    setDose('');
    setDoseMin('');
    setDoseMax('');
    setDoseIncrement('');
    setUnit('');
    setFrequency('');
    setRoute('');
    setForm('');
    setStrength('');
    setIndication('');
    setPrescriptionNote('');
    setWarfarinWeekdaySchedule(normalizeWarfarinWeekdaySchedule({}));
    setAllergyOverrideAccepted(false);
    setVariableDoseSchedule({});
    setWarfarinWeekdaySchedule(normalizeWarfarinWeekdaySchedule({}));
    setSelectedAdminTime('08:00');
  };

  useEffect(() => {
    if (!isWarfarinDrug || stat || whenRequired) {
      return;
    }

    setFrequency('Once daily');
    setUseSpecificAdminTimes(true);
    setCustomFrequencyName('Once daily');
    setCustomAdminTimes([WARFARIN_DEFAULT_ADMIN_TIME]);
    setSelectedAdminTime(WARFARIN_DEFAULT_ADMIN_TIME);
    setStartTime(WARFARIN_DEFAULT_ADMIN_TIME);
  }, [isWarfarinDrug, stat, whenRequired]);

  const validateForm = () => {
    const nextErrors = {};
    const today = new Date();
    const selectedStartDate = startDate ? new Date(`${startDate}T${startTime || '00:00'}`) : null;

    if ((!freeFormDrug && !selectedDrugId) || !selectedDrugName) {
      nextErrors.drug = 'Select a drug before completing the prescription.';
    }
    if (isWarfarinDrug) {
      const missingDays = WEEKDAY_ORDER.filter((day) => {
        const enteredDose = String(warfarinWeekdaySchedule?.[day] ?? '').trim();
        const numericDose = Number(enteredDose);
        return !enteredDose || Number.isNaN(numericDose) || numericDose < 0;
      });
      if (missingDays.length) {
        nextErrors.warfarinWeekdaySchedule = 'Enter a valid warfarin dose for each weekday.';
      }
    }
    if (isVariableDoseMedicine && !stat && !whenRequired) {
      if (!insulinDoseSlots.length) {
        nextErrors.variableDoseSchedule = 'Select a frequency or administration times for this insulin.';
      } else {
        const missingSlots = insulinDoseSlots.filter((slot) => {
          const enteredDose = String(effectiveVariableDoseSchedule?.[slot]?.dose ?? '').trim();
          const numericDose = Number(enteredDose);
          return !enteredDose || Number.isNaN(numericDose) || numericDose <= 0;
        });

        if (missingSlots.length) {
          nextErrors.variableDoseSchedule = 'Enter a dose for each insulin administration time.';
        }
      }
    } else if (!isWarfarinDrug && doseType === 'fixed' && !dose) {
      nextErrors.dose = 'Dose is required.';
    }
    if (!isVariableDoseMedicine && !isWarfarinDrug && doseType === 'range') {
      const min = Number(doseMin);
      const max = Number(doseMax);
      const increment = Number(doseIncrement);
      if (!doseMin || !doseMax || !doseIncrement) {
        nextErrors.doseRange = 'Minimum, maximum and increment are required for a dose range.';
      } else if (Number.isNaN(min) || Number.isNaN(max) || Number.isNaN(increment)) {
        nextErrors.doseRange = 'Dose range values must be valid numbers.';
      } else if (min >= max) {
        nextErrors.doseRange = 'Minimum dose must be lower than maximum dose.';
      } else if (increment <= 0) {
        nextErrors.doseRange = 'Dose increment must be greater than zero.';
      } else if (Math.abs(((max - min) / increment) - Math.round((max - min) / increment)) > 0.000001) {
        nextErrors.doseRange = 'Dose increment must fit exactly between the minimum and maximum dose.';
      }
    }
    if (selectedDrugMaximumDose !== null && !isVariableDoseMedicine && !isWarfarinDrug) {
      if (doseType === 'fixed' && dose) {
        const numericDose = Number(dose);
        if (!Number.isNaN(numericDose) && numericDose > selectedDrugMaximumDose) {
          nextErrors.dose = `This is above the maximum dose of ${selectedDrugMaximumDose}${unit || ''}.`;
        }
      }
      if (doseType === 'range' && doseMax) {
        const numericDoseMax = Number(doseMax);
        if (!Number.isNaN(numericDoseMax) && numericDoseMax > selectedDrugMaximumDose) {
          nextErrors.doseRange = `This is above the maximum dose of ${selectedDrugMaximumDose}${unit || ''}.`;
        }
      }
    }
    if (!unit) {
      nextErrors.unit = 'Unit is required.';
    }
    if (!route) {
      nextErrors.route = 'Route is required.';
    }
    if (!startDate) {
      nextErrors.startDate = 'Start date is required.';
    }
    const selectedStopDateTime = stopDate ? new Date(`${stopDate}T${stopTime || '23:59'}`) : null;
    if (selectedStopDateTime && Number.isNaN(selectedStopDateTime.getTime())) {
      nextErrors.stopDate = 'Enter a valid stop date and time.';
    } else if (selectedStopDateTime && selectedStartDate && selectedStopDateTime < selectedStartDate) {
      nextErrors.stopDate = 'Stop date and time cannot be earlier than the start date and time.';
    }
    if (!stat && !whenRequired && !useSpecificAdminTimes && !frequency) {
      nextErrors.frequency = 'Select a frequency.';
    }
    if (isWeeklyOnlyDrug) {
      if (stat || whenRequired) {
        nextErrors.frequency = 'Methotrexate must be prescribed as a weekly scheduled medication.';
      } else if (useSpecificAdminTimes) {
        nextErrors.frequency = 'Methotrexate is locked to a standard once-weekly schedule.';
      } else if (String(frequency || '').trim().toLowerCase() !== WEEKLY_ONLY_FREQUENCY_LABEL.toLowerCase()) {
        nextErrors.frequency = 'Methotrexate can only be prescribed once weekly.';
      }
    }
    if (useSpecificAdminTimes && !customFrequencyName.trim()) {
      nextErrors.customFrequencyName = 'Enter a frequency name for this prescription.';
    }
    if (useSpecificAdminTimes && !customAdminTimes.length) {
      nextErrors.customAdminTimes = 'Add at least one administration time.';
    }
    if (whenRequired && maxDose24h.trim() && Number(maxDose24h) <= 0) {
      nextErrors.maxDose24h = 'Maximum doses in 24 hours must be greater than zero.';
    }
    if (selectedStartDate && Number.isNaN(selectedStartDate.getTime())) {
      nextErrors.startDate = 'Enter a valid start date and time.';
    }
    if (allergyWarnings.blocking.length) {
      nextErrors.drug = 'This drug is blocked by the recorded allergy list.';
    }
    if (allergyWarnings.advisory.length && !allergyOverrideAccepted) {
      nextErrors.allergyOverride = 'Acknowledge the allergy warning before prescribing.';
    }
    if (stat && !startTime) {
      nextErrors.startTime = 'Start time is required for a stat dose.';
    }
    if (!authorHistoricalAdministrations && selectedStartDate && selectedStartDate < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
      nextErrors.startDate = 'Medication cannot start in the past.';
    }
    if (authorHistoricalAdministrations && Number(historicalAdministrationDays) <= 0) {
      nextErrors.historicalAdministrationTemplate = 'Enter at least 1 day of historical administrations.';
    }
    if (authorHistoricalAdministrations && !historicalAdministrationTemplate.length) {
      nextErrors.historicalAdministrationTemplate = 'Generate a historical administration timeline for this case study.';
    }
    if (isEditingPrescription && !amendmentReason.trim()) {
      nextErrors.amendmentReason = 'Enter a reason for changing this prescription.';
    }

    setValidationErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleForm = () => {
    setValidationAttempted(true);
    if (!validateForm()) {
      return;
    }

    const startDateTime = new Date(`${startDate}T${startTime || '00:00'}`);
    const stopDateTime = stopDate ? new Date(`${stopDate}T${stopTime || '23:59'}`) : null;
    const resolvedDrugName = selectedDrugName;
    const resolvedFrequency = effectiveFrequencyLabel;
    const scheduledTimes = stat
      ? normalizeAdminTimes([startTime])
      : whenRequired
        ? []
        : getFrequencySchedule(
            resolvedFrequency,
            frequencyOptions,
            useSpecificAdminTimes ? customAdminTimes : []
          );
    const normalizedWarfarinWeekdaySchedule = isWarfarinDrug
      ? normalizeWarfarinWeekdaySchedule(warfarinWeekdaySchedule)
      : null;
    const normalizedVariableDoseSchedule = isVariableDoseMedicine
      ? normalizeVariableDoseSchedule(effectiveVariableDoseSchedule, scheduledTimes)
      : null;
    const displayDose = isWarfarinDrug
      ? formatWarfarinWeekdaySummary(normalizedWarfarinWeekdaySchedule, unit)
      : isVariableDoseMedicine
      ? formatVariableDoseSummary(normalizedVariableDoseSchedule, unit)
      : doseType === 'range'
        ? `${doseMin}-${doseMax}${unit}`
        : `${dose}${unit}`;
    const historicalTemplatePayload = authorHistoricalAdministrations
      ? {
          enabled: true,
          timelineDays: Number(historicalAdministrationDays || 0),
          entries: historicalAdministrationTemplate,
        }
      : null;
    const historicalPreview = historicalTemplatePayload
      ? resolveHistoricalAdministrationPreview({
          template: historicalTemplatePayload,
          startTime,
          stopDateTime,
          stat,
        })
      : null;

    const script = {
      ...editPrescription,
      id: editPrescription?.id || createPrescriptionId(),
      drugindex: freeFormDrug ? 'freeform' : selectedDrugId,
      drug: resolvedDrugName,
      dose: displayDose,
      doseType: isWarfarinDrug ? 'warfarin-weekday' : (isVariableDoseMedicine ? 'variable' : doseType),
      doseValue: (isVariableDoseMedicine || isWarfarinDrug) ? '' : (doseType === 'fixed' ? dose : ''),
      doseMin: (!isVariableDoseMedicine && !isWarfarinDrug && doseType === 'range') ? doseMin : '',
      doseMax: (!isVariableDoseMedicine && !isWarfarinDrug && doseType === 'range') ? doseMax : '',
      doseIncrement: (!isVariableDoseMedicine && !isWarfarinDrug && doseType === 'range') ? doseIncrement : '',
      unit,
      frequency: resolvedFrequency,
      route,
      strength: isWarfarinDrug ? '' : strength,
      form,
      stat,
      whenRequired,
      maxDose24h: whenRequired ? maxDose24h.trim() : '',
      orderSetId: selectedOrderSetId && selectedOrderSetId !== 'custom' ? selectedOrderSetId : '',
      start_date: historicalPreview ? historicalPreview.resolvedStartDate.toISOString() : startDateTime.toISOString(),
      end_date: historicalPreview
        ? (historicalPreview.resolvedEndDate ? historicalPreview.resolvedEndDate.toISOString() : '')
        : (stat ? startDateTime.toISOString() : (stopDateTime ? stopDateTime.toISOString() : '')),
      indication,
      prescriptionNote: prescriptionNote.trim(),
      prescriber: prescriberName,
      administrations: historicalPreview ? historicalPreview.administrations : administrations,
      administrationTemplate: historicalTemplatePayload,
      historicalAdministrationDays: historicalTemplatePayload?.timelineDays || 0,
      variableDoseSchedule: normalizedVariableDoseSchedule,
      warfarinWeekdaySchedule: normalizedWarfarinWeekdaySchedule,
      scheduledTimes,
      criticalMedicine: freeFormDrug ? Boolean(editPrescription?.criticalMedicine) : Boolean(selectedDrug?.criticalMedicine),
      controlledDrug: freeFormDrug ? Boolean(editPrescription?.controlledDrug) : Boolean(selectedDrug?.controlledDrug),
      requiresWitness: freeFormDrug ? Boolean(editPrescription?.requiresWitness) : Boolean(selectedDrug?.requiresWitness),
      status: editPrescription?.status || 'active',
      pharmacistApprovalStatus: editPrescription && editPrescription !== ''
        ? {
            approved: false,
            approvedBy: '',
            approvedAt: '',
          }
        : (editPrescription?.pharmacistApprovalStatus || {
            approved: false,
            approvedBy: '',
            approvedAt: '',
          }),
      amendmentHistory: [
        ...(editPrescription?.amendmentHistory || []),
        {
          action: editPrescription && editPrescription !== '' ? 'amended' : 'created',
          reason: amendmentReason.trim() || 'No reason recorded',
          timestamp: new Date().toISOString(),
          actor: actorName,
        },
      ],
      customFrequency: useSpecificAdminTimes,
    };
    const amendmentDetails = describePrescriptionChanges(editPrescription, script);
    script.amendmentHistory = [
      ...(editPrescription?.amendmentHistory || []),
      {
        action: editPrescription && editPrescription !== '' ? 'amended' : 'created',
        details: amendmentDetails,
        reason: amendmentReason.trim(),
        timestamp: new Date().toISOString(),
        actor: actorName,
      },
    ];

    if (editPrescription && editPrescription !== '') {
      saveEdit(script, editPrescriptionIndex);
    } else {
      newPrescription(script);
    }
    closeModal();
  };

  const restOfFormVisible = freeFormDrug || Boolean(selectedDrugId);
  const prescriptionSummary = useMemo(() => {
    if (!restOfFormVisible) {
      return '';
    }

    const doseSummary = isWarfarinDrug
      ? formatWarfarinWeekdaySummary(warfarinWeekdaySchedule, unit)
      : isVariableDoseMedicine
      ? formatVariableDoseSummary(effectiveVariableDoseSchedule, unit)
      : doseType === 'range'
        ? [doseMin && doseMax ? `${doseMin}-${doseMax}` : '', unit].filter(Boolean).join('')
        : [dose, unit].filter(Boolean).join('');
    const orderSummary = [selectedDrugName, doseSummary, route, effectiveFrequencyLabel].filter(Boolean).join(' ');
    const start = parsePrescriptionStart(startDate, startTime);
    const stop = stopDate ? new Date(`${stopDate}T${stopTime || '23:59'}`) : null;
    let activeSummary = 'no stop date specified';

    if (stat) {
      activeSummary = 'stat dose';
    } else if (start && stop && !Number.isNaN(stop.getTime())) {
      const dayCount = Math.max(1, Math.ceil((stop.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1);
      activeSummary = `prescription will be active for ${dayCount} day${dayCount === 1 ? '' : 's'} and stop at ${formatDateTimeLabel(stop)}`;
    }

    const firstDoseSummary = whenRequired
      ? 'first administration is when clinically required'
      : firstDoseDateTime
        ? `first administration is due at ${formatDateTimeLabel(firstDoseDateTime)}`
        : 'first administration has not been calculated yet';

    if (stat) {
      return `${orderSummary || 'Prescription details incomplete'}, stat dose is due at ${start ? formatDateTimeLabel(start) : 'the selected time'}${prescriptionNote.trim() ? `. Note: ${prescriptionNote.trim()}` : '.'}`;
    }

    return `${orderSummary || 'Prescription details incomplete'}, ${activeSummary}, ${firstDoseSummary}${prescriptionNote.trim() ? ` Note: ${prescriptionNote.trim()}.` : '.'}`;
  }, [
    dose,
    doseMax,
    doseMin,
    doseType,
    effectiveVariableDoseSchedule,
    effectiveFrequencyLabel,
    firstDoseDateTime,
    isWarfarinDrug,
    isVariableDoseMedicine,
    prescriptionNote,
    restOfFormVisible,
    route,
    selectedDrugName,
    startDate,
    startTime,
    stat,
    stopDate,
    stopTime,
    unit,
    warfarinWeekdaySchedule,
    whenRequired,
  ]);

  return (
    <Form noValidate autoComplete="off">
      <Row
        ref={tutorialRefs.prescriptionDrug}
        className={`mb-3 ${activeChartTutorialStepKey === 'prescribe-drug' ? 'epma-tutorial-target epma-tutorial-target--active' : ''}`}
      >
        <Col xs={12}>
          <div className="d-flex align-items-center justify-content-between gap-3 mb-3">
            <h5 className="mb-0">1. Search for a drug</h5>
            <Button type="button" variant="link" className="p-0 prescription-library-link" onClick={openLibraryBrowser}>
              <i className="bi bi-search me-1" aria-hidden="true" />
              Search full drug library
            </Button>
          </div>
        </Col>
        <Form.Group as={Col} md={8} controlId="formDrugSearch">
          <Form.Label>Drug</Form.Label>
                      <Form.Control
                        value={drugSearch}
                        onFocus={() => {
                          setShowLibraryBrowser(false);
                        }}
                        onChange={(event) => {
                          setDrugSearch(event.target.value);
                          if (!freeFormDrug) {
                            setSelectedDrugId('');
                          }
              setValidationErrors((current) => ({ ...current, drug: '' }));
            }}
            placeholder="Type at least 3 characters"
            isInvalid={Boolean(validationErrors.drug)}
            autoComplete="off"
            name="prescription-drug-search"
            readOnly={Boolean(selectedDrugId) && !freeFormDrug}
          />
          <Form.Control.Feedback type="invalid">{validationErrors.drug}</Form.Control.Feedback>
          {selectedDrugId && !freeFormDrug ? (
            <div className="d-flex gap-3 flex-wrap mt-2">
              <Button type="button" variant="link" className="p-0" onClick={clearSelectedDrug}>
                Change selected drug
              </Button>
              {selectedDrugOrderSets.length && !showOrderSetSelector ? (
                <Button type="button" variant="link" className="p-0" onClick={() => setShowOrderSetSelector(true)}>
                  Change order set
                </Button>
              ) : null}
            </div>
          ) : null}
          {!freeFormDrug && !selectedDrugId && drugSearch.trim().length >= 3 ? (
            drugResults.length ? (
              <ListGroup className="mt-2 epma-allergy-search-results">
                {drugResults.map((item) => (
                  <ListGroup.Item key={item.id} action as="button" type="button" onClick={() => selectDrug(item)}>
                    {normalizeDrugLabel(item)}
                  </ListGroup.Item>
                ))}
              </ListGroup>
            ) : (
              <div className="small text-muted mt-2">No matching drugs found.</div>
            )
          ) : drugSearch.trim().length > 0 && drugSearch.trim().length < 3 && !selectedDrugId && !freeFormDrug ? (
            <div className="small text-muted mt-2">Type at least 3 characters to search drugs.</div>
          ) : null}
          {allergyWarnings.blocking.length ? (
            <Alert variant="danger" className="mt-3 mb-0">
              Prescribing blocked because this patient has a recorded allergy to {selectedDrugName} with a blocking reaction: {allergyWarnings.blocking.map((item) => item.reaction).join(', ')}.
            </Alert>
          ) : null}
          {allergyWarnings.advisory.length ? (
            <Alert variant={allergyOverrideAccepted ? 'success' : 'warning'} className="mt-3 mb-0">
              <div>
                {allergyOverrideAccepted
                  ? `Allergy overridden for ${selectedDrugName}.`
                  : `This patient has a recorded allergy or intolerance to ${selectedDrugName}: ${allergyWarnings.advisory.map((item) => item.reaction).join(', ')}.`}
              </div>
              <Form.Check
                className="mt-2"
                type="checkbox"
                checked={allergyOverrideAccepted}
                label={allergyOverrideAccepted ? 'Allergy overridden' : 'Override allergy warning and continue prescribing'}
                onChange={(event) => {
                  setAllergyOverrideAccepted(event.target.checked);
                  setValidationErrors((current) => ({ ...current, allergyOverride: '' }));
                }}
                isInvalid={Boolean(validationErrors.allergyOverride)}
                feedback={validationErrors.allergyOverride}
                feedbackType="invalid"
              />
            </Alert>
          ) : null}
          {isWeeklyOnlyDrug ? (
            <Alert variant="warning" className="mt-3 mb-0">
              <strong>Methotrexate safety lock:</strong> this medicine is restricted to a standard once-weekly schedule and cannot be prescribed as stat, PRN, or multiple times per week.
            </Alert>
          ) : null}
        </Form.Group>
        {!selectedDrugId ? (
          <Form.Group as={Col} md={4} controlId="formDrugNotInList" className="d-flex align-items-end">
            <Form.Check
              type="checkbox"
              checked={freeFormDrug}
              label="Drug not in list"
              onChange={(event) => handleToggleFreeFormDrug(event.target.checked)}
            />
          </Form.Group>
        ) : null}
      </Row>
      {showLibraryBrowser ? (
        <Row className="mb-3">
          <Col xs={12}>
            <div className="prescription-admin-times-panel">
              <Form.Group controlId="fullLibrarySearch">
                <Form.Label>Browse the full drug and order set library</Form.Label>
                <Form.Control
                  value={librarySearch}
                  onChange={(event) => setLibrarySearch(event.target.value)}
                  placeholder="Search all medicines and order sets"
                />
              </Form.Group>
              <ListGroup className="mt-3 prescription-library-results">
                {libraryResults.length ? libraryResults.map((result) => (
                  <ListGroup.Item
                    key={result.key}
                    action
                    as="button"
                    type="button"
                    onClick={() => {
                      if (result.type === 'drug') {
                        selectDrug(result.item);
                        setShowLibraryBrowser(false);
                        setLibrarySearch('');
                      } else {
                        selectOrderSetFromLibrary(result.item);
                      }
                    }}
                  >
                    <div className="d-flex justify-content-between gap-3 align-items-start">
                      <div>
                        <div className="fw-semibold">{result.title}</div>
                        {result.subtitle ? <div className="small text-muted">{result.subtitle}</div> : null}
                      </div>
                      <span className="small text-muted">{result.type === 'orderSet' ? 'Order set' : 'Drug'}</span>
                    </div>
                  </ListGroup.Item>
                )) : (
                  <ListGroup.Item className="text-muted">No library matches found.</ListGroup.Item>
                )}
              </ListGroup>
            </div>
          </Col>
        </Row>
      ) : null}

      {restOfFormVisible ? (
        <>
          {!freeFormDrug && selectedDrugOrderSets.length && showOrderSetSelector ? (
            <Row
              ref={tutorialRefs.prescriptionDose}
              className={`mb-3 prescription-priority-fields prescription-priority-fields--dose ${activeChartTutorialStepKey === 'prescribe-dose' ? 'epma-tutorial-target epma-tutorial-target--active' : ''}`}
            >
              <Col xs={12}>
                <div className="prescription-admin-times-panel">
                  <Form.Label className="mb-2">Order set</Form.Label>
                  <ListGroup>
                    {selectedDrugOrderSets.map((orderSet) => (
                      <ListGroup.Item
                        key={orderSet.id}
                        action
                        as="button"
                        type="button"
                        active={selectedOrderSetId === orderSet.id}
                        onClick={(event) => {
                          event.preventDefault();
                          applyOrderSet(orderSet);
                        }}
                      >
                        <div className="fw-semibold">{orderSet.label}</div>
                        <div className="small">
                          {orderSet.dose}{orderSet.unit} | {orderSet.frequency} | {orderSet.route}
                        </div>
                      </ListGroup.Item>
                    ))}
                    <ListGroup.Item
                      action
                      as="button"
                      type="button"
                      active={selectedOrderSetId === 'custom'}
                      onClick={(event) => {
                        event.preventDefault();
                        pickOwnOrderSet();
                      }}
                    >
                      Pick my own
                    </ListGroup.Item>
                  </ListGroup>
                </div>
              </Col>
            </Row>
          ) : null}
          {!freeFormDrug && selectedDrugOrderSets.length && !showOrderSetSelector && selectedOrderSetId !== 'custom' ? (
            <Row className="mb-3">
              <Col xs={12}>
                <Alert variant="light" className="mb-0">
                  <span>
                    Order set: {selectedDrugOrderSets.find((item) => item.id === selectedOrderSetId)?.label || 'Selected'}
                  </span>
                </Alert>
              </Col>
            </Row>
          ) : null}

            <Row className="mb-3">
              <Col xs={12}>
                <h5 className="mb-3">2. Prescription details</h5>
              </Col>
              {!isVariableDoseMedicine && !isWarfarinDrug ? (
                <Form.Group as={Col} md={3} controlId="formDoseType">
                <Form.Label>Dose type <span className="text-danger">*</span></Form.Label>
                <Form.Select
                  value={doseType}
                  onChange={(event) => {
                    setDoseType(event.target.value);
                    setValidationErrors((current) => ({ ...current, dose: '', doseRange: '' }));
                  }}
                >
                  <option value="fixed">Fixed dose</option>
                  <option value="range">Dose range</option>
                </Form.Select>
              </Form.Group>
              ) : isWarfarinDrug ? (
                <Form.Group as={Col} md={3} controlId="formDoseTypeWarfarin">
                  <Form.Label>Dose type</Form.Label>
                  <Form.Control value="Warfarin weekday doses" readOnly plaintext className="px-2" />
                </Form.Group>
              ) : (
                <Form.Group as={Col} md={3} controlId="formDoseTypeVariable">
                <Form.Label>Dose type</Form.Label>
                <Form.Control value="Variable insulin doses" readOnly plaintext className="px-2" />
              </Form.Group>
            )}
              {!isVariableDoseMedicine && !isWarfarinDrug && doseType === 'fixed' ? (
              <Form.Group as={Col} md={3} controlId="formDose">
                <Form.Label className="prescription-priority-label">Dose <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  className="prescription-priority-control"
                  type="number"
                  step="any"
                  value={dose}
                  onChange={(event) => setDose(event.target.value)}
                  isInvalid={Boolean(validationErrors.dose || liveMaximumDoseError.dose)}
                  autoComplete="off"
                  name="prescription-fixed-dose"
                />
                <Form.Control.Feedback type="invalid">
                  {validationErrors.dose || liveMaximumDoseError.dose}
                </Form.Control.Feedback>
                {selectedDrugMaximumDose !== null ? (
                  <div className="small text-muted mt-1">Maximum dose: {selectedDrugMaximumDose}{unit || ''}</div>
                ) : null}
              </Form.Group>
              ) : !isVariableDoseMedicine && !isWarfarinDrug ? (
              <Col md={4}>
                <Form.Label className="prescription-priority-label">Dose range <span className="text-danger">*</span></Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control
                    className="prescription-priority-control"
                    type="number"
                    step="any"
                    value={doseMin}
                    onChange={(event) => {
                      setDoseMin(event.target.value);
                      setValidationErrors((current) => ({ ...current, doseRange: '' }));
                    }}
                    placeholder="Min"
                    isInvalid={Boolean(validationErrors.doseRange || liveMaximumDoseError.doseRange)}
                    autoComplete="off"
                    name="prescription-dose-min"
                  />
                  <Form.Control
                    className="prescription-priority-control"
                    type="number"
                    step="any"
                    value={doseMax}
                    onChange={(event) => {
                      setDoseMax(event.target.value);
                      setValidationErrors((current) => ({ ...current, doseRange: '' }));
                    }}
                    placeholder="Max"
                    isInvalid={Boolean(validationErrors.doseRange || liveMaximumDoseError.doseRange)}
                    autoComplete="off"
                    name="prescription-dose-max"
                  />
                </div>
                {selectedDrugMaximumDose !== null ? (
                  <div className="small text-muted mt-1">Maximum dose: {selectedDrugMaximumDose}{unit || ''}</div>
                ) : null}
              </Col>
            ) : (
              <Form.Group as={Col} md={6} controlId="formVariableDoseSummary">
                <Form.Label className="prescription-priority-label">Insulin dose schedule</Form.Label>
                <Alert variant="info" className="mb-0 py-2">
                  Set the dose against each administration time below. The chart will keep morning, lunchtime, and evening doses separate.
                </Alert>
              </Form.Group>
            )}
              {!isVariableDoseMedicine && !isWarfarinDrug && doseType === 'range' ? (
              <Form.Group as={Col} md={2} controlId="formDoseIncrement">
                <Form.Label className="prescription-priority-label">Increment <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  className="prescription-priority-control"
                  type="number"
                  step="any"
                  value={doseIncrement}
                  onChange={(event) => {
                    setDoseIncrement(event.target.value);
                    setValidationErrors((current) => ({ ...current, doseRange: '' }));
                  }}
                  placeholder="e.g. 2.5"
                  isInvalid={Boolean(validationErrors.doseRange || liveMaximumDoseError.doseRange)}
                  autoComplete="off"
                  name="prescription-dose-increment"
                />
                {(validationErrors.doseRange || liveMaximumDoseError.doseRange) ? (
                  <div className="text-danger small mt-1">
                    {validationErrors.doseRange || liveMaximumDoseError.doseRange}
                  </div>
                ) : null}
              </Form.Group>
            ) : null}
              <Form.Group as={Col} md={3} controlId="formDoseUnit">
                <Form.Label className="prescription-priority-label">Unit <span className="text-danger">*</span></Form.Label>
              <Form.Control
                className="prescription-priority-control"
                type="text"
                value={unit}
                readOnly={!freeFormDrug}
                onChange={(event) => setUnit(event.target.value)}
                autoComplete="off"
                name="prescription-dose-unit"
              />
              {validationAttempted && !unit ? <div className="text-danger small mt-1">{validationErrors.unit || 'Unit is required.'}</div> : null}
            </Form.Group>
          </Row>

          <Row
            ref={tutorialRefs.prescriptionRouteFrequency}
            className={`mb-3 prescription-priority-fields prescription-priority-fields--route ${activeChartTutorialStepKey === 'prescribe-route-frequency' ? 'epma-tutorial-target epma-tutorial-target--active' : ''}`}
          >
            <Form.Group as={Col} md={4} controlId="formRoute">
              <Form.Label className="prescription-priority-label">Route <span className="text-danger">*</span></Form.Label>
              <Form.Select
                className="prescription-priority-control"
                ref={routeRef}
                value={route}
                onChange={(event) => {
                  setRoute(event.target.value);
                  setValidationErrors((current) => ({ ...current, route: '' }));
                }}
                isInvalid={Boolean(validationErrors.route)}
              >
                <option value="">Select route</option>
                {routeOptions.map((item) => <option value={item.label} key={item.id}>{item.label}</option>)}
              </Form.Select>
              <Form.Control.Feedback type="invalid">{validationErrors.route}</Form.Control.Feedback>
            </Form.Group>
          </Row>

          <Row className="mb-3">
            <Form.Group as={Col} md={4} controlId="formWhenRequired">
              <Form.Check
                type="checkbox"
                checked={whenRequired}
                label="When required"
                disabled={isWeeklyOnlyDrug || isWarfarinDrug}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setWhenRequired(checked);
                  if (checked) {
                    setStat(false);
                    setUseSpecificAdminTimes(false);
                    setCustomAdminTimes([]);
                    setFrequency('');
                  }
                }}
              />
            </Form.Group>
            <Form.Group as={Col} md={4} controlId="formStatDose">
              <Form.Check
                type="checkbox"
                checked={stat}
                label="Stat dose"
                disabled={isWeeklyOnlyDrug || isWarfarinDrug}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setStat(checked);
                  if (checked) {
                    setWhenRequired(false);
                    setUseSpecificAdminTimes(false);
                    setCustomAdminTimes([]);
                    setFrequency('');
                  }
                }}
              />
            </Form.Group>
            {whenRequired ? (
              <Form.Group as={Col} md={4} controlId="formMaxDose24h">
                <Form.Label>Max doses in 24 hours</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  value={maxDose24h}
                  onChange={(event) => {
                    setMaxDose24h(event.target.value);
                    setValidationErrors((current) => ({ ...current, maxDose24h: '' }));
                  }}
                  isInvalid={Boolean(validationErrors.maxDose24h)}
                  autoComplete="off"
                  name="prescription-max-dose-24h"
                />
                <Form.Control.Feedback type="invalid">{validationErrors.maxDose24h}</Form.Control.Feedback>
                <div className="small text-muted mt-2">Optional. Leave blank if you only want to record this as PRN without a 24-hour cap.</div>
              </Form.Group>
            ) : null}
          </Row>

          {!stat ? (
            <>
              {!isWarfarinDrug ? (
              <Row className="mb-3 prescription-priority-fields prescription-priority-fields--frequency">
                <Form.Group as={Col} md={6} controlId="formFrequency">
                  <Form.Label className="prescription-priority-label">Frequency {!whenRequired ? <span className="text-danger">*</span> : null}</Form.Label>
                  <Form.Select
                    className="prescription-priority-control"
                    value={frequency}
                    onChange={(event) => {
                      setFrequency(event.target.value);
                      setValidationErrors((current) => ({ ...current, frequency: '' }));
                    }}
                    isInvalid={Boolean(validationErrors.frequency)}
                    disabled={useSpecificAdminTimes || isWeeklyOnlyDrug}
                  >
                    <option value="">{whenRequired ? 'Optional frequency description' : 'Select frequency'}</option>
                    {(isWeeklyOnlyDrug
                      ? frequencyOptions.filter((item) => item.label.trim().toLowerCase() === WEEKLY_ONLY_FREQUENCY_LABEL.toLowerCase())
                      : frequencyOptions
                    ).map((item) => <option value={item.label} key={item.id}>{item.label}</option>)}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">{validationErrors.frequency}</Form.Control.Feedback>
                  {whenRequired ? (
                    <div className="small text-muted mt-2">
                      {frequency ? `This will be shown as ${formatPrnFrequencyLabel(frequency)}.` : 'Leave blank to display this as plain When required.'}
                    </div>
                  ) : frequency && firstDoseDateTime ? (
                    <div className="small text-muted mt-2">
                      First dose due: {formatDateTimeLabel(firstDoseDateTime)}
                    </div>
                  ) : frequency ? (
                    <div className="small text-muted mt-2">This frequency does not create a scheduled first dose.</div>
                  ) : null}
                </Form.Group>
                {!whenRequired ? (
                  <Form.Group as={Col} md={6} controlId="formUseSpecificAdminTimes">
                    <Form.Check
                      type="switch"
                      className="mt-md-4"
                      checked={useSpecificAdminTimes}
                      label="Use specific administration times"
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setUseSpecificAdminTimes(checked);
                        if (!checked) {
                          setCustomAdminTimes([]);
                          setCustomFrequencyName('');
                        } else {
                          setFrequency('');
                        }
                      }}
                      disabled={isWeeklyOnlyDrug}
                    />
                  </Form.Group>
                ) : (
                  <Col md={6} className="d-flex align-items-end">
                    <div className="small text-muted">PRN medicines do not create scheduled administration times.</div>
                  </Col>
                )}
              </Row>
              ) : null}

              {!whenRequired && (useSpecificAdminTimes || isWarfarinDrug) ? (
                <>
                  <Row className="mb-3">
                    <Form.Group as={Col} md={6} controlId="formCustomFrequencyName">
                      <Form.Label>Frequency name <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        value={customFrequencyName}
                        onChange={(event) => {
                          setCustomFrequencyName(event.target.value);
                          setValidationErrors((current) => ({ ...current, customFrequencyName: '' }));
                        }}
                        placeholder="e.g. Parkinson's schedule"
                        isInvalid={Boolean(validationErrors.customFrequencyName)}
                        autoComplete="off"
                        name="prescription-custom-frequency-name"
                      />
                      <Form.Control.Feedback type="invalid">{validationErrors.customFrequencyName}</Form.Control.Feedback>
                      {customFrequencyName && firstDoseDateTime ? (
                        <div className="small text-muted mt-2">
                          First dose due: {formatDateTimeLabel(firstDoseDateTime)}
                        </div>
                      ) : customFrequencyName ? (
                        <div className="small text-muted mt-2">Add administration times to calculate the first dose.</div>
                      ) : null}
                    </Form.Group>
                    <Form.Group as={Col} md={3} controlId="formSpecificAdminTime">
                      <Form.Label>Administration time</Form.Label>
                      <Form.Select value={selectedAdminTime} onChange={(event) => setSelectedAdminTime(event.target.value)}>
                        {halfHourOptions.map((time) => <option key={time} value={time}>{time}</option>)}
                      </Form.Select>
                    </Form.Group>
                    <Col md={3} className="d-flex align-items-end">
                      <Button type="button" variant="outline-primary" onClick={addCustomAdminTime}>Add time</Button>
                    </Col>
                  </Row>
                  <Row className="mb-3">
                    <Col xs={12}>
                      <div className="prescription-admin-times-list">
                        {customAdminTimes.map((time) => (
                          <button type="button" key={time} className="prescription-admin-time-pill" onClick={() => removeCustomAdminTime(time)}>
                            {time} <span aria-hidden="true">&times;</span>
                          </button>
                        ))}
                      </div>
                      {validationErrors.customAdminTimes ? <div className="text-danger small mt-2">{validationErrors.customAdminTimes}</div> : null}
                    </Col>
                  </Row>
                </>
              ) : !whenRequired ? (
                frequency ? (
                  <Row className="mb-3">
                    <Col xs={12}>
                      <div className="prescription-admin-times-panel">
                        <Form.Label className="mb-1">Standard administration times</Form.Label>
                        <div className="prescription-admin-times-list mt-2">
                          {defaultScheduledTimes.length ? defaultScheduledTimes.map((time) => (
                            <span key={time} className="prescription-admin-time-pill prescription-admin-time-pill--locked">{time}</span>
                          )) : (
                            <span className="text-muted small">No scheduled administrations for this frequency.</span>
                          )}
                        </div>
                      </div>
                    </Col>
                  </Row>
                ) : null
              ) : null}
            </>
          ) : null}

            {!stat && !whenRequired && isVariableDoseMedicine && insulinDoseSlots.length ? (
              <Row className="mb-3">
              <Col xs={12}>
                <div className="prescription-admin-times-panel">
                  <Form.Label className="mb-2">Dose by administration time <span className="text-danger">*</span></Form.Label>
                  <Row className="g-3">
                    {insulinDoseSlots.map((slot) => (
                      <Form.Group as={Col} md={4} key={slot} controlId={`formVariableDose-${slot.replace(':', '-')}`}>
                        <Form.Label>{slot}</Form.Label>
                        <Form.Control
                          type="number"
                          step="any"
                          min="0"
                          value={effectiveVariableDoseSchedule?.[slot]?.dose ?? ''}
                          onChange={(event) => updateVariableDoseForSlot(slot, event.target.value)}
                          placeholder={`Dose in ${unit || 'units'}`}
                          isInvalid={Boolean(validationErrors.variableDoseSchedule)}
                          autoComplete="off"
                          name={`prescription-variable-dose-${slot}`}
                        />
                      </Form.Group>
                    ))}
                  </Row>
                  {validationErrors.variableDoseSchedule ? (
                    <div className="text-danger small mt-2">{validationErrors.variableDoseSchedule}</div>
                  ) : (
                    <div className="small text-muted mt-2">
                      These time-specific doses will carry through to the administration chart.
                    </div>
                  )}
                </div>
              </Col>
            </Row>
            ) : null}

            {latestInrResult ? (
              <Row className="mb-3">
                <Col xs={12}>
                  <Alert variant="light" className="mb-0 py-2">
                    <strong>Latest INR:</strong> {latestInrResult.result} on {latestInrResult.datetime}
                  </Alert>
                </Col>
              </Row>
            ) : null}

            {isWarfarinDrug ? (
              <Row className="mb-3">
                <Col xs={12}>
                  <div className="prescription-admin-times-panel">
                    <Form.Label className="mb-2">Warfarin dose by weekday <span className="text-danger">*</span></Form.Label>
                    <Row className="g-3">
                      {WEEKDAY_ORDER.map((day) => (
                        <Form.Group as={Col} md={4} key={day} controlId={`formWarfarinDose-${day}`}>
                          <Form.Label>{day}</Form.Label>
                          <Form.Control
                            type="number"
                            step="any"
                            min="0"
                            value={warfarinWeekdaySchedule?.[day] ?? ''}
                            onChange={(event) => updateWarfarinDoseForDay(day, event.target.value)}
                            placeholder={`Dose in ${unit || 'mg'}`}
                            isInvalid={Boolean(validationErrors.warfarinWeekdaySchedule)}
                            autoComplete="off"
                            name={`prescription-warfarin-dose-${day.toLowerCase()}`}
                          />
                        </Form.Group>
                      ))}
                    </Row>
                    {validationErrors.warfarinWeekdaySchedule ? (
                      <div className="text-danger small mt-2">{validationErrors.warfarinWeekdaySchedule}</div>
                    ) : (
                      <div className="small text-muted mt-2">
                        Enter the planned warfarin dose for each weekday. These doses will show on the chart by day.
                      </div>
                    )}
                  </div>
                </Col>
              </Row>
            ) : null}
          </>
          ) : null}

          {selectedDrug?.requiresWitness ? (
            <Row className="mb-3">
              <Col xs={12}>
                <Alert variant="warning" className="mb-0">This drug requires a witness when the administration is charted.</Alert>
              </Col>
            </Row>
          ) : null}

          <Row
            ref={tutorialRefs.prescriptionTiming}
            className={`mb-3 ${activeChartTutorialStepKey === 'prescribe-timing' ? 'epma-tutorial-target epma-tutorial-target--active' : ''}`}
          >
            <Form.Group as={Col} md={4} controlId="formStartDate">
              <Form.Label>Start date <span className="text-danger">*</span></Form.Label>
              <Form.Control
                value={startDate}
                type="date"
                min={defaultDate}
                onChange={(event) => {
                  setStartDate(event.target.value);
                  setValidationErrors((current) => ({ ...current, startDate: '' }));
                }}
                isInvalid={Boolean(validationErrors.startDate)}
              />
              <Form.Control.Feedback type="invalid">{validationErrors.startDate}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group as={Col} md={4} controlId="formStartTime">
              <Form.Label>{stat ? 'Stat time' : 'Start time'} <span className="text-danger">*</span></Form.Label>
              {stat ? (
                <Form.Control
                  type="time"
                  step="300"
                  value={startTime}
                  onChange={(event) => {
                    setStartTime(event.target.value);
                    setValidationErrors((current) => ({ ...current, startTime: '' }));
                  }}
                  isInvalid={Boolean(validationErrors.startTime)}
                  autoComplete="off"
                  name="prescription-stat-time"
                />
              ) : (
                <Form.Select
                  value={startTime}
                  onChange={(event) => {
                    setStartTime(event.target.value);
                    setValidationErrors((current) => ({ ...current, startTime: '' }));
                  }}
                  isInvalid={Boolean(validationErrors.startTime)}
                >
                  {halfHourOptions.map((time) => <option key={time} value={time}>{time}</option>)}
                </Form.Select>
              )}
              <Form.Control.Feedback type="invalid">{validationErrors.startTime}</Form.Control.Feedback>
            </Form.Group>
            {!stat ? (
              <Form.Group as={Col} md={4} controlId="formStopDate">
                <Form.Label>Stop date</Form.Label>
                <Form.Control
                  value={stopDate}
                  type="date"
                  min={startDate || defaultDate}
                  onChange={(event) => {
                    setStopDate(event.target.value);
                    if (!event.target.value) {
                      setStopTime('23:59');
                    }
                    setValidationErrors((current) => ({ ...current, stopDate: '' }));
                  }}
                  isInvalid={Boolean(validationErrors.stopDate)}
                />
                {stopDate ? (
                  <Form.Control
                    className="mt-2"
                    type="time"
                    step="300"
                    value={stopTime}
                    onChange={(event) => {
                      setStopTime(event.target.value);
                      setValidationErrors((current) => ({ ...current, stopDate: '' }));
                    }}
                    isInvalid={Boolean(validationErrors.stopDate)}
                    autoComplete="off"
                    name="prescription-stop-time"
                  />
                ) : null}
                <Form.Control.Feedback type="invalid">{validationErrors.stopDate}</Form.Control.Feedback>
                {stopDate ? <div className="small text-muted mt-2">Doses due before this stop time will still appear on the final day.</div> : null}
              </Form.Group>
            ) : null}
          </Row>

          <Row
            ref={tutorialRefs.prescriptionIndication}
            className={`mb-3 ${activeChartTutorialStepKey === 'prescribe-indication' ? 'epma-tutorial-target epma-tutorial-target--active' : ''}`}
          >
              <Form.Group as={Col} controlId="formIndication">
                <Form.Label>Indication</Form.Label>
              <Form.Control
                value={indication}
                onChange={(event) => setIndication(event.target.value)}
                placeholder="Type at least 3 characters to search indications"
                autoComplete="off"
                name="prescription-indication"
              />
              {indicationSearchTerm.length > 0 && indicationSearchTerm.length < 3 ? (
                <div className="small text-muted mt-2">Type at least 3 characters to search the indications library.</div>
              ) : null}
              {filteredIndicationOptions.length ? (
                <ListGroup className="mt-2 epma-allergy-search-results">
                  {filteredIndicationOptions.map((item) => (
                    <ListGroup.Item
                      action
                      as="button"
                      type="button"
                      key={item.id}
                      active={indication === item.label}
                      onClick={() => setIndication(item.label)}
                    >
                      {item.label}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
                ) : null}
              </Form.Group>
            </Row>

            <Row className="mb-3">
              <Form.Group as={Col} controlId="formPrescriptionNote">
                <Form.Label>Prescription note</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={prescriptionNote}
                  onChange={(event) => setPrescriptionNote(event.target.value)}
                  placeholder="Optional note attached to this prescription"
                  autoComplete="off"
                  name="prescription-note"
                />
              </Form.Group>
            </Row>

            {isEditingPrescription ? (
            <Row className="mb-3">
              <Form.Group as={Col} controlId="formAmendmentReason">
                <Form.Label>Reason for amendment</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={amendmentReason}
                  onChange={(event) => {
                    setAmendmentReason(event.target.value);
                    setValidationErrors((current) => ({ ...current, amendmentReason: '' }));
                  }}
                  placeholder="Document why this prescription is being changed"
                  isInvalid={Boolean(validationErrors.amendmentReason)}
                  autoComplete="off"
                  name="prescription-amendment-reason"
                />
                <Form.Control.Feedback type="invalid">{validationErrors.amendmentReason}</Form.Control.Feedback>
              </Form.Group>
            </Row>
          ) : null}

            {allowHistoricalAdministrations ? (
              <Row className="mb-3">
              <Col xs={12}>
                <div className="prescription-admin-times-panel">
                  <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-3">
                    <div>
                      <h6 className="mb-1">Case study administration history</h6>
                      <div className="small text-muted">
                        Build a reusable timeline of administrations before the learner opens the chart. This will be converted into real dated entries for each student attempt.
                      </div>
                    </div>
                    <Form.Check
                      type="switch"
                      id="authorHistoricalAdministrations"
                      checked={authorHistoricalAdministrations}
                      label="Populate prior administrations"
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setAuthorHistoricalAdministrations(checked);
                        if (checked && !historicalAdministrationTemplate.length) {
                          window.setTimeout(() => regenerateHistoricalAdministrations(), 0);
                        }
                      }}
                    />
                  </div>
                  {authorHistoricalAdministrations ? (
                    <>
                      <Row className="g-3 align-items-end mb-3">
                        <Form.Group as={Col} md={4} controlId="historicalAdministrationDays">
                          <Form.Label>Days of prior chart history</Form.Label>
                          <Form.Control
                            type="number"
                            min="1"
                            max="14"
                            value={historicalAdministrationDays}
                            onChange={(event) => setHistoricalAdministrationDays(event.target.value)}
                          />
                        </Form.Group>
                        <Col md={4}>
                          <Button type="button" variant="outline-primary" onClick={regenerateHistoricalAdministrations}>
                            Generate administration timeline
                          </Button>
                        </Col>
                      </Row>
                      {validationErrors.historicalAdministrationTemplate ? (
                        <div className="text-danger small mb-3">{validationErrors.historicalAdministrationTemplate}</div>
                      ) : null}
                      <Table responsive bordered size="sm" className="mb-0">
                        <thead>
                          <tr>
                            <th>Relative day</th>
                            <th>Time</th>
                            <th>Status</th>
                            <th>Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historicalAdministrationTemplate.length ? historicalAdministrationTemplate.map((entry, index) => (
                            <tr key={entry.id || `${entry.relativeDayOffset}-${entry.time}-${index}`}>
                              <td>{formatHistoricalDayOffset(entry.relativeDayOffset)}</td>
                              <td>{entry.time}</td>
                              <td>
                                <Form.Select
                                  value={entry.status}
                                  onChange={(event) => setHistoricalAdministrationTemplate((current) => current.map((item, itemIndex) => (
                                    itemIndex === index ? { ...item, status: event.target.value } : item
                                  )))}
                                >
                                  <option value="administered">Administered</option>
                                  <option value="missed">Missed</option>
                                  <option value="held">Held</option>
                                  <option value="scheduled">Leave uncharted</option>
                                </Form.Select>
                              </td>
                              <td>
                                <Form.Control
                                  value={entry.note || ''}
                                  onChange={(event) => setHistoricalAdministrationTemplate((current) => current.map((item, itemIndex) => (
                                    itemIndex === index ? { ...item, note: event.target.value } : item
                                  )))}
                                  placeholder="Optional reason or note"
                                />
                              </td>
                            </tr>
                          )) : (
                            <tr>
                              <td colSpan={4} className="text-center text-muted">Generate a timeline to populate reusable case administrations.</td>
                            </tr>
                          )}
                        </tbody>
                      </Table>
                    </>
                  ) : null}
                </div>
              </Col>
              </Row>
            ) : null}

            {validationSummaryMessage ? (
              <Row className="mb-3">
                <Col xs={12}>
                  <Alert variant="danger" className="mb-0">
                    {validationSummaryMessage}
                  </Alert>
                </Col>
              </Row>
            ) : null}

            <Row
              ref={tutorialRefs.prescriptionSave}
              className={`align-items-center g-3 ${activeChartTutorialStepKey === 'prescribe-save' ? 'epma-tutorial-target epma-tutorial-target--active' : ''}`}
            >
            <Col lg={8}>
              <Alert variant="light" className="mb-0">
                <strong>Prescription summary</strong>
                <div>{prescriptionSummary}</div>
              </Alert>
            </Col>
            <Col lg={2}>
              <Button type="button" variant="outline-success" onClick={handleForm}>
                Prescribe medication
              </Button>
            </Col>
            <Col lg={2} className="text-lg-end">
              <Button type="button" variant="outline-danger" onClick={closeModal}>Cancel</Button>
            </Col>
          </Row>
    </Form>
  );
};

export default AddPrescription;
