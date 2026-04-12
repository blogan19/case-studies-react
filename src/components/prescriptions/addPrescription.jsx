import React, { useEffect, useMemo, useRef, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import ListGroup from 'react-bootstrap/ListGroup';
import Row from 'react-bootstrap/Row';
import fallbackDrugList from './drugList.json';
import { formatDateTimeLabel, getFrequencySchedule, normalizeAdminTimes } from './chartUtils';

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

const parsePrescriptionStart = (dateValue, timeValue) => {
  if (!dateValue || !timeValue) {
    return null;
  }

  const parsed = new Date(`${dateValue}T${timeValue}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

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

  const [drugSearch, setDrugSearch] = useState('');
  const [selectedDrugId, setSelectedDrugId] = useState('');
  const [freeFormDrug, setFreeFormDrug] = useState(false);
  const [selectedOrderSetId, setSelectedOrderSetId] = useState('');
  const [showOrderSetSelector, setShowOrderSetSelector] = useState(true);
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
  const [indication, setIndication] = useState('');
  const [stat, setStat] = useState(false);
  const [whenRequired, setWhenRequired] = useState(false);
  const [maxDose24h, setMaxDose24h] = useState('');
  const [amendmentReason, setAmendmentReason] = useState('');
  const [administrations, setAdministrations] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [allergyOverrideAccepted, setAllergyOverrideAccepted] = useState(false);

  const selectedDrug = useMemo(
    () => catalogue.items.find((item) => String(item.id) === String(selectedDrugId)) || null,
    [catalogue.items, selectedDrugId]
  );
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

    return catalogue.items
      .filter((item) => normalizeDrugLabel(item).toLowerCase().includes(searchTerm))
      .slice(0, 12);
  }, [catalogue.items, drugSearch, freeFormDrug]);

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
  const effectiveFrequencyLabel = stat
    ? 'Stat'
    : whenRequired
      ? 'When required'
      : (useSpecificAdminTimes ? customFrequencyName.trim() : frequency);
  const defaultScheduledTimes = useMemo(
    () => (stat
      ? normalizeAdminTimes(startTime ? [startTime] : [])
      : getFrequencySchedule(frequency, frequencyOptions)),
    [frequency, frequencyOptions, startTime, stat]
  );
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
        if (candidate >= startDateTime) {
          return candidate;
        }
      }
    }

    return null;
  }, [customAdminTimes, defaultScheduledTimes, startDate, startTime, stat, useSpecificAdminTimes, whenRequired]);
  const isEditingPrescription = Boolean(editPrescription && editPrescription !== '');

  useEffect(() => {
    if (!editPrescription || editPrescription === '') {
      return;
    }

    const matchedDrug = catalogue.items.find((item) => normalizeDrugLabel(item).toLowerCase() === normalizeDrugLabel({
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
    setAmendmentReason('');
    setAllergyOverrideAccepted(false);
    setStat(Boolean(editPrescription.stat));
    setWhenRequired(Boolean(editPrescription.whenRequired));
    setMaxDose24h(editPrescription.maxDose24h || '');
    setAdministrations(Array.isArray(editPrescription.administrations) ? editPrescription.administrations : []);
    setSelectedOrderSetId(editPrescription.orderSetId || '');

    const existingTimes = normalizeAdminTimes(editPrescription.scheduledTimes || []);
    const editingStat = Boolean(editPrescription.stat);
    const editingWhenRequired = Boolean(editPrescription.whenRequired);
    const matchedFrequencyOption = frequencyOptions.find(
      (item) => String(item.label || '').trim().toLowerCase() === String(editPrescription.frequency || '').trim().toLowerCase()
    );
    const matchedFrequencyTimes = matchedFrequencyOption ? normalizeAdminTimes(matchedFrequencyOption.defaultAdminTimes || []) : [];
    const isCustomTimed = !editingStat && !editingWhenRequired && existingTimes.length > 0 && JSON.stringify(existingTimes) !== JSON.stringify(matchedFrequencyTimes);

    setFrequency(matchedFrequencyOption?.label || '');
    setUseSpecificAdminTimes(isCustomTimed);
    setCustomFrequencyName(isCustomTimed ? (editPrescription.frequency || '') : '');
    setCustomAdminTimes(isCustomTimed ? existingTimes : []);

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
      }
    }
  }, [catalogue.items, editPrescription, frequencyOptions]);

  const selectDrug = (drugItem) => {
    setSelectedDrugId(drugItem.id);
    setFreeFormDrug(false);
    setDrugSearch(normalizeDrugLabel(drugItem));
    setStrength(drugItem.strength || '');
    setUnit(drugItem.unit || '');
    setForm(drugItem.form || '');
    setRoute(drugItem.defaultRoute || '');
    setDose(drugItem.defaultDose || '');
    setDoseType('fixed');
    setDoseMin('');
    setDoseMax('');
    setDoseIncrement('');
    setSelectedOrderSetId('');
    setShowOrderSetSelector(true);
    setIndication(drugItem.defaultIndication || '');
    setValidationErrors((current) => ({ ...current, drug: '', dose: '', route: '' }));
    setAllergyOverrideAccepted(false);
    window.setTimeout(() => routeRef.current?.focus(), 0);
  };

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
    setFrequency(matchedFrequency?.label || orderSet.frequency || '');
    setRoute(matchedRoute?.label || orderSet.route || route);
    setIndication(orderSet.indication || indication);
    setWhenRequired(false);
    setStat(false);
    setUseSpecificAdminTimes(false);
    setCustomFrequencyName('');
    setCustomAdminTimes([]);
    setValidationErrors((current) => ({
      ...current,
      dose: '',
      doseRange: '',
      frequency: '',
      route: '',
    }));
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
    setWhenRequired(false);
    setStat(false);
    setUseSpecificAdminTimes(false);
    setCustomFrequencyName('');
    setCustomAdminTimes([]);
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
    setAllergyOverrideAccepted(false);
  };

  const validateForm = () => {
    const nextErrors = {};
    const today = new Date();
    const selectedStartDate = startDate ? new Date(`${startDate}T${startTime || '00:00'}`) : null;

    if ((!freeFormDrug && !selectedDrugId) || !selectedDrugName) {
      nextErrors.drug = 'Select a drug before completing the prescription.';
    }
    if (doseType === 'fixed' && !dose) {
      nextErrors.dose = 'Dose is required.';
    }
    if (doseType === 'range') {
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
    if (!unit) {
      nextErrors.unit = 'Unit is required.';
    }
    if (!route) {
      nextErrors.route = 'Route is required.';
    }
    if (!startDate) {
      nextErrors.startDate = 'Start date is required.';
    }
    if (stopDate && startDate && stopDate < startDate) {
      nextErrors.stopDate = 'Stop date cannot be earlier than the start date.';
    }
    if (!stat && !whenRequired && !useSpecificAdminTimes && !frequency) {
      nextErrors.frequency = 'Select a frequency.';
    }
    if (useSpecificAdminTimes && !customFrequencyName.trim()) {
      nextErrors.customFrequencyName = 'Enter a frequency name for this prescription.';
    }
    if (useSpecificAdminTimes && !customAdminTimes.length) {
      nextErrors.customAdminTimes = 'Add at least one administration time.';
    }
    if (whenRequired && !maxDose24h.trim()) {
      nextErrors.maxDose24h = 'Enter a maximum number of doses in 24 hours.';
    }
    if (whenRequired && Number(maxDose24h) <= 0) {
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
    if (selectedStartDate && selectedStartDate < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
      nextErrors.startDate = 'Medication cannot start in the past.';
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
    const stopDateTime = stopDate ? new Date(`${stopDate}T00:00`) : null;
    const resolvedDrugName = selectedDrugName;
    const resolvedFrequency = effectiveFrequencyLabel;
    const displayDose = doseType === 'range' ? `${doseMin}-${doseMax}${unit}` : `${dose}${unit}`;
    const scheduledTimes = stat
      ? normalizeAdminTimes([startTime])
      : whenRequired
        ? []
        : getFrequencySchedule(
            resolvedFrequency,
            frequencyOptions,
            useSpecificAdminTimes ? customAdminTimes : []
          );

    const script = {
      ...editPrescription,
      drugindex: freeFormDrug ? 'freeform' : selectedDrugId,
      drug: resolvedDrugName,
      dose: displayDose,
      doseType,
      doseValue: doseType === 'fixed' ? dose : '',
      doseMin: doseType === 'range' ? doseMin : '',
      doseMax: doseType === 'range' ? doseMax : '',
      doseIncrement: doseType === 'range' ? doseIncrement : '',
      unit,
      frequency: resolvedFrequency,
      route,
      strength,
      form,
      stat,
      whenRequired,
      maxDose24h: whenRequired ? maxDose24h.trim() : '',
      orderSetId: selectedOrderSetId && selectedOrderSetId !== 'custom' ? selectedOrderSetId : '',
      start_date: startDateTime.toISOString(),
      end_date: stat ? startDateTime.toISOString() : (stopDateTime ? stopDateTime.toISOString() : ''),
      indication,
      prescriber: prescriberName,
      administrations,
      scheduledTimes,
      criticalMedicine: freeFormDrug ? Boolean(editPrescription?.criticalMedicine) : Boolean(selectedDrug?.criticalMedicine),
      controlledDrug: freeFormDrug ? Boolean(editPrescription?.controlledDrug) : Boolean(selectedDrug?.controlledDrug),
      requiresWitness: freeFormDrug ? Boolean(editPrescription?.requiresWitness) : Boolean(selectedDrug?.requiresWitness),
      status: editPrescription?.status || 'active',
      pharmacistApprovalStatus: editPrescription?.pharmacistApprovalStatus || {
        approved: false,
        approvedBy: '',
        approvedAt: '',
      },
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

    const doseSummary = doseType === 'range'
      ? [doseMin && doseMax ? `${doseMin}-${doseMax}` : '', unit].filter(Boolean).join('')
      : [dose, unit].filter(Boolean).join('');
    const orderSummary = [selectedDrugName, doseSummary, route, effectiveFrequencyLabel].filter(Boolean).join(' ');
    const start = parsePrescriptionStart(startDate, startTime);
    const stop = stopDate ? new Date(`${stopDate}T00:00`) : null;
    let activeSummary = 'no stop date specified';

    if (stat) {
      activeSummary = 'stat dose only';
    } else if (start && stop && !Number.isNaN(stop.getTime())) {
      const dayCount = Math.max(1, Math.ceil((stop.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1);
      activeSummary = `prescription will be active for ${dayCount} day${dayCount === 1 ? '' : 's'}`;
    }

    const firstDoseSummary = whenRequired
      ? 'first administration is when clinically required'
      : firstDoseDateTime
        ? `first administration is due at ${formatDateTimeLabel(firstDoseDateTime)}`
        : 'first administration has not been calculated yet';

    return `${orderSummary || 'Prescription details incomplete'}, ${activeSummary}, ${firstDoseSummary}.`;
  }, [
    dose,
    doseMax,
    doseMin,
    doseType,
    effectiveFrequencyLabel,
    firstDoseDateTime,
    restOfFormVisible,
    route,
    selectedDrugName,
    startDate,
    startTime,
    stat,
    stopDate,
    unit,
    whenRequired,
  ]);

  return (
    <Form noValidate autoComplete="off">
      <Row className="mb-3">
        <Col xs={12}>
          <h5 className="mb-3">1. Search for a drug</h5>
        </Col>
        <Form.Group as={Col} md={8} controlId="formDrugSearch">
          <Form.Label>Drug</Form.Label>
          <Form.Control
            value={drugSearch}
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

      {restOfFormVisible ? (
        <>
          {!freeFormDrug && selectedDrugOrderSets.length && showOrderSetSelector ? (
            <Row className="mb-3">
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
            {doseType === 'fixed' ? (
              <Form.Group as={Col} md={3} controlId="formDose">
                <Form.Label>Dose <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="number"
                  step="any"
                  value={dose}
                  onChange={(event) => setDose(event.target.value)}
                  isInvalid={Boolean(validationErrors.dose)}
                  autoComplete="off"
                  name="prescription-fixed-dose"
                />
                <Form.Control.Feedback type="invalid">{validationErrors.dose}</Form.Control.Feedback>
              </Form.Group>
            ) : (
              <Col md={4}>
                <Form.Label>Dose range <span className="text-danger">*</span></Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control
                    type="number"
                    step="any"
                    value={doseMin}
                    onChange={(event) => {
                      setDoseMin(event.target.value);
                      setValidationErrors((current) => ({ ...current, doseRange: '' }));
                    }}
                    placeholder="Min"
                    isInvalid={Boolean(validationErrors.doseRange)}
                    autoComplete="off"
                    name="prescription-dose-min"
                  />
                  <Form.Control
                    type="number"
                    step="any"
                    value={doseMax}
                    onChange={(event) => {
                      setDoseMax(event.target.value);
                      setValidationErrors((current) => ({ ...current, doseRange: '' }));
                    }}
                    placeholder="Max"
                    isInvalid={Boolean(validationErrors.doseRange)}
                    autoComplete="off"
                    name="prescription-dose-max"
                  />
                </div>
              </Col>
            )}
            {doseType === 'range' ? (
              <Form.Group as={Col} md={2} controlId="formDoseIncrement">
                <Form.Label>Increment <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="number"
                  step="any"
                  value={doseIncrement}
                  onChange={(event) => {
                    setDoseIncrement(event.target.value);
                    setValidationErrors((current) => ({ ...current, doseRange: '' }));
                  }}
                  placeholder="e.g. 2.5"
                  isInvalid={Boolean(validationErrors.doseRange)}
                  autoComplete="off"
                  name="prescription-dose-increment"
                />
                {validationErrors.doseRange ? <div className="text-danger small mt-1">{validationErrors.doseRange}</div> : null}
              </Form.Group>
            ) : null}
            <Form.Group as={Col} md={doseType === 'range' ? 3 : 3} controlId="formDoseUnit">
              <Form.Label>Unit <span className="text-danger">*</span></Form.Label>
              <Form.Control
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

          <Row className="mb-3">
            <Form.Group as={Col} md={4} controlId="formRoute">
              <Form.Label>Route <span className="text-danger">*</span></Form.Label>
              <Form.Select
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
              </Form.Group>
            ) : null}
          </Row>

          {!stat && !whenRequired ? (
            <>
              <Row className="mb-3">
                <Form.Group as={Col} md={6} controlId="formFrequency">
                  <Form.Label>Frequency <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    value={frequency}
                    onChange={(event) => {
                      setFrequency(event.target.value);
                      setValidationErrors((current) => ({ ...current, frequency: '' }));
                    }}
                    isInvalid={Boolean(validationErrors.frequency)}
                    disabled={useSpecificAdminTimes}
                  >
                    <option value="">Select frequency</option>
                    {frequencyOptions.map((item) => <option value={item.label} key={item.id}>{item.label}</option>)}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">{validationErrors.frequency}</Form.Control.Feedback>
                  {frequency && firstDoseDateTime ? (
                    <div className="small text-muted mt-2">
                      First dose due: {formatDateTimeLabel(firstDoseDateTime)}
                    </div>
                  ) : frequency ? (
                    <div className="small text-muted mt-2">This frequency does not create a scheduled first dose.</div>
                  ) : null}
                </Form.Group>
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
                  />
                </Form.Group>
              </Row>

              {useSpecificAdminTimes ? (
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
              ) : (
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
              )}
            </>
          ) : null}

          {selectedDrug?.requiresWitness ? (
            <Row className="mb-3">
              <Col xs={12}>
                <Alert variant="warning" className="mb-0">This drug requires a witness when the administration is charted.</Alert>
              </Col>
            </Row>
          ) : null}

          <Row className="mb-3">
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
              <Form.Label>Start time <span className="text-danger">*</span></Form.Label>
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
              <Form.Control.Feedback type="invalid">{validationErrors.startTime}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group as={Col} md={4} controlId="formStopDate">
              <Form.Label>Stop date</Form.Label>
              <Form.Control
                value={stopDate}
                type="date"
                min={startDate || defaultDate}
                onChange={(event) => {
                  setStopDate(event.target.value);
                  setValidationErrors((current) => ({ ...current, stopDate: '' }));
                }}
                isInvalid={Boolean(validationErrors.stopDate)}
              />
              <Form.Control.Feedback type="invalid">{validationErrors.stopDate}</Form.Control.Feedback>
            </Form.Group>
          </Row>

          <Row className="mb-3">
            <Form.Group as={Col} controlId="formIndication">
              <Form.Label>Indication</Form.Label>
              <Form.Control
                value={indication}
                onChange={(event) => setIndication(event.target.value)}
                autoComplete="off"
                name="prescription-indication"
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
                  onChange={(event) => setAmendmentReason(event.target.value)}
                  placeholder="Optional"
                  autoComplete="off"
                  name="prescription-amendment-reason"
                />
              </Form.Group>
            </Row>
          ) : null}

          {allowHistoricalAdministrations ? (
            <Row className="mb-3">
              <Col xs={12}>
                <Alert variant="light" className="mb-0">
                  Existing historical administration authoring is only available in case-building mode and is not used for student prescribing.
                </Alert>
              </Col>
            </Row>
          ) : null}

          <Row className="align-items-center g-3">
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
        </>
      ) : null}
    </Form>
  );
};

export default AddPrescription;
