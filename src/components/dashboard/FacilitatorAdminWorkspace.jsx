import React, { useMemo, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Table from 'react-bootstrap/Table';
import DrugLibraryManager from './DrugLibraryManager';
import StudentTile from './StudentTile';

const routeCsvTemplate = 'label,sort_order\nOral,0\nIntravenous,1\nSubcutaneous,2\n';
const frequencyCsvTemplate = 'label,default_admin_times,sort_order\nOnce daily,08:00,0\nTwice daily,"08:00,20:00",1\nThree times daily,"08:00,14:00,20:00",2\n';
const indicationCsvTemplate = 'label\nHypertension\nInfection\nPain\n';
const unitCsvTemplate = 'label\nmg\nmL\ntablet\n';
const formCsvTemplate = 'label\ntablet\ncapsule\noral solution\n';
const MAX_VISIBLE_ROWS = 20;

const FacilitatorAdminWorkspace = ({
  user,
  drugLibrary,
  userAccounts = [],
  onBack,
  onPreviewDrugLibraryImport,
  onImportDrugLibrary,
  onAddRoute,
  onDeleteRoute,
  onUpdateRoute,
  onMoveRoute,
  onImportRoutes,
  onAddFrequency,
  onDeleteFrequency,
  onUpdateFrequency,
  onMoveFrequency,
  onImportFrequencies,
  onAddIndication,
  onDeleteIndication,
  onUpdateIndication,
  onImportIndications,
  onAddUnit,
  onDeleteUnit,
  onUpdateUnit,
  onImportUnits,
  onAddForm,
  onDeleteForm,
  onUpdateForm,
  onImportForms,
  onAddCriticalMedicine,
  onDeleteCriticalMedicine,
  onAddControlledDrug,
  onDeleteControlledDrug,
  onAddOrderSet,
  onUpdateOrderSet,
  onDeleteOrderSet,
  onUpdateDrug,
  onAddDrug,
  onDeleteDrug,
  onSuspendUser,
  onRestoreUser,
  onRemoveUserAccess,
  isSaving,
}) => {
  const [routeLabel, setRouteLabel] = useState('');
  const [frequencyLabel, setFrequencyLabel] = useState('');
  const [frequencyTimes, setFrequencyTimes] = useState('');
  const [routeUploadError, setRouteUploadError] = useState('');
  const [frequencyUploadError, setFrequencyUploadError] = useState('');
  const [indicationUploadError, setIndicationUploadError] = useState('');
  const [editingRouteId, setEditingRouteId] = useState('');
  const [editingRouteLabel, setEditingRouteLabel] = useState('');
  const [editingFrequencyId, setEditingFrequencyId] = useState('');
  const [editingFrequencyLabel, setEditingFrequencyLabel] = useState('');
  const [editingFrequencyTimes, setEditingFrequencyTimes] = useState('');
  const [indicationLabel, setIndicationLabel] = useState('');
  const [editingIndicationId, setEditingIndicationId] = useState('');
  const [editingIndicationLabel, setEditingIndicationLabel] = useState('');
  const [unitLabel, setUnitLabel] = useState('');
  const [editingUnitId, setEditingUnitId] = useState('');
  const [editingUnitLabel, setEditingUnitLabel] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [editingFormId, setEditingFormId] = useState('');
  const [editingFormLabel, setEditingFormLabel] = useState('');
  const [routeSearch, setRouteSearch] = useState('');
  const [frequencySearch, setFrequencySearch] = useState('');
  const [indicationSearch, setIndicationSearch] = useState('');
  const [unitSearch, setUnitSearch] = useState('');
  const [formSearch, setFormSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [unitUploadError, setUnitUploadError] = useState('');
  const [formUploadError, setFormUploadError] = useState('');
  const [criticalMedicineDrugId, setCriticalMedicineDrugId] = useState('');
  const [medicineRuleType, setMedicineRuleType] = useState('critical');
  const [medicineRuleMaxDose, setMedicineRuleMaxDose] = useState('');
  const [medicineRuleFilter, setMedicineRuleFilter] = useState('');
  const [orderSetSearch, setOrderSetSearch] = useState('');
  const [newOrderSet, setNewOrderSet] = useState({
    drugName: '',
    label: '',
    dose: '',
    unit: '',
    frequency: '',
    route: '',
    indication: '',
  });
  const [editingOrderSetId, setEditingOrderSetId] = useState('');
  const [editingOrderSet, setEditingOrderSet] = useState({
    drugName: '',
    label: '',
    dose: '',
    unit: '',
    frequency: '',
    route: '',
    indication: '',
  });
  const [activeAdminSection, setActiveAdminSection] = useState('');

  const routeOptions = useMemo(() => drugLibrary?.metadata?.routeOptions || [], [drugLibrary?.metadata?.routeOptions]);
  const frequencyOptions = useMemo(() => drugLibrary?.metadata?.frequencyOptions || [], [drugLibrary?.metadata?.frequencyOptions]);
  const indicationOptions = useMemo(() => drugLibrary?.metadata?.indicationOptions || [], [drugLibrary?.metadata?.indicationOptions]);
  const unitOptions = useMemo(() => drugLibrary?.metadata?.unitOptions || [], [drugLibrary?.metadata?.unitOptions]);
  const formOptions = useMemo(() => drugLibrary?.metadata?.formOptions || [], [drugLibrary?.metadata?.formOptions]);
  const criticalMedicineOptions = useMemo(() => drugLibrary?.metadata?.criticalMedicineOptions || [], [drugLibrary?.metadata?.criticalMedicineOptions]);
  const controlledDrugOptions = useMemo(() => drugLibrary?.metadata?.controlledDrugOptions || [], [drugLibrary?.metadata?.controlledDrugOptions]);
  const orderSets = useMemo(() => drugLibrary?.metadata?.orderSets || [], [drugLibrary?.metadata?.orderSets]);
  const controlledDrugLookup = useMemo(() => new Set((controlledDrugOptions || []).map((item) => String(item.drugName || '').trim().toLowerCase())), [controlledDrugOptions]);
  const availableCriticalMedicineDrugs = useMemo(() => {
    const currentLookup = new Set((criticalMedicineOptions || []).map((item) => String(item.drugName || '').trim().toLowerCase()));
    return (drugLibrary?.items || [])
      .filter((item) => {
        const label = String(item.drugName || '').trim().toLowerCase();
        if (!label) {
          return false;
        }
        if (medicineRuleType === 'critical') {
          return !currentLookup.has(label);
        }
        if (medicineRuleType === 'controlled') {
          return !controlledDrugLookup.has(label) && !item.controlledDrug;
        }
        if (medicineRuleType === 'insulin') {
          return String(item.category || '').trim().toLowerCase() !== 'insulin';
        }
        if (medicineRuleType === 'witness') {
          return !item.requiresWitness;
        }
        if (medicineRuleType === 'maxDose') {
          return true;
        }
        return true;
      })
      .sort((left, right) => String(left.drugName || '').localeCompare(String(right.drugName || '')));
  }, [controlledDrugLookup, criticalMedicineOptions, drugLibrary?.items, medicineRuleType]);
  const filteredOrderSets = useMemo(() => {
    const normalizedSearch = orderSetSearch.trim().toLowerCase();
    const matchingOrderSets = orderSets.filter((item) => {
      if (!normalizedSearch) {
        return true;
      }
      return [
        item.drugName,
        item.label,
        item.dose,
        item.unit,
        item.frequency,
        item.route,
        item.indication,
      ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
    });
    return matchingOrderSets.slice(0, MAX_VISIBLE_ROWS);
  }, [orderSetSearch, orderSets]);
  const filteredOrderSetCount = useMemo(() => {
    const normalizedSearch = orderSetSearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return orderSets.length;
    }
    return orderSets.filter((item) => (
      [
        item.drugName,
        item.label,
        item.dose,
        item.unit,
        item.frequency,
        item.route,
        item.indication,
      ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch))
    )).length;
  }, [orderSetSearch, orderSets]);

  const filteredRoutes = useMemo(() => {
    const normalizedSearch = routeSearch.trim().toLowerCase();
    const matchingRoutes = routeOptions.filter((route) => (
      !normalizedSearch || String(route.label || '').toLowerCase().includes(normalizedSearch)
    ));
    return matchingRoutes.slice(0, MAX_VISIBLE_ROWS);
  }, [routeOptions, routeSearch]);

  const filteredRouteCount = useMemo(() => {
    const normalizedSearch = routeSearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return routeOptions.length;
    }
    return routeOptions.filter((route) => String(route.label || '').toLowerCase().includes(normalizedSearch)).length;
  }, [routeOptions, routeSearch]);

  const filteredFrequencies = useMemo(() => {
    const normalizedSearch = frequencySearch.trim().toLowerCase();
    const matchingFrequencies = frequencyOptions.filter((frequency) => {
      if (!normalizedSearch) {
        return true;
      }
      return [
        frequency.label,
        (frequency.defaultAdminTimes || []).join(', '),
      ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
    });
    return matchingFrequencies.slice(0, MAX_VISIBLE_ROWS);
  }, [frequencyOptions, frequencySearch]);

  const filteredFrequencyCount = useMemo(() => {
    const normalizedSearch = frequencySearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return frequencyOptions.length;
    }
    return frequencyOptions.filter((frequency) => (
      [
        frequency.label,
        (frequency.defaultAdminTimes || []).join(', '),
      ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch))
    )).length;
  }, [frequencyOptions, frequencySearch]);

  const filteredIndications = useMemo(() => {
    const normalizedSearch = indicationSearch.trim().toLowerCase();
    const matchingIndications = indicationOptions.filter((indication) => (
      !normalizedSearch || String(indication.label || '').toLowerCase().includes(normalizedSearch)
    ));
    return matchingIndications.slice(0, MAX_VISIBLE_ROWS);
  }, [indicationOptions, indicationSearch]);

  const filteredIndicationCount = useMemo(() => {
    const normalizedSearch = indicationSearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return indicationOptions.length;
    }
    return indicationOptions.filter((indication) => String(indication.label || '').toLowerCase().includes(normalizedSearch)).length;
  }, [indicationOptions, indicationSearch]);

  const filteredUnits = useMemo(() => {
    const normalizedSearch = unitSearch.trim().toLowerCase();
    const matchingUnits = unitOptions.filter((unit) => (
      !normalizedSearch || String(unit.label || '').toLowerCase().includes(normalizedSearch)
    ));
    return matchingUnits.slice(0, MAX_VISIBLE_ROWS);
  }, [unitOptions, unitSearch]);

  const filteredUnitCount = useMemo(() => {
    const normalizedSearch = unitSearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return unitOptions.length;
    }
    return unitOptions.filter((unit) => String(unit.label || '').toLowerCase().includes(normalizedSearch)).length;
  }, [unitOptions, unitSearch]);

  const filteredForms = useMemo(() => {
    const normalizedSearch = formSearch.trim().toLowerCase();
    const matchingForms = formOptions.filter((form) => (
      !normalizedSearch || String(form.label || '').toLowerCase().includes(normalizedSearch)
    ));
    return matchingForms.slice(0, MAX_VISIBLE_ROWS);
  }, [formOptions, formSearch]);

  const filteredFormCount = useMemo(() => {
    const normalizedSearch = formSearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return formOptions.length;
    }
    return formOptions.filter((form) => String(form.label || '').toLowerCase().includes(normalizedSearch)).length;
  }, [formOptions, formSearch]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = userSearch.trim().toLowerCase();
    const matchingUsers = (userAccounts || []).filter((account) => {
      if (!normalizedSearch) {
        return true;
      }
      return [
        account.displayName,
        account.email,
        account.role,
        account.accountStatus,
      ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));
    });
    return matchingUsers.slice(0, MAX_VISIBLE_ROWS);
  }, [userAccounts, userSearch]);

  const filteredUserCount = useMemo(() => {
    const normalizedSearch = userSearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return userAccounts.length;
    }
    return (userAccounts || []).filter((account) => (
      [
        account.displayName,
        account.email,
        account.role,
        account.accountStatus,
      ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch))
    )).length;
  }, [userAccounts, userSearch]);

  const drugItems = useMemo(() => drugLibrary?.items || [], [drugLibrary?.items]);
  const drugSummary = useMemo(() => {
    const criticalLookup = new Set((criticalMedicineOptions || []).map((item) => String(item.drugName || '').trim().toLowerCase()));
    const categoryCounts = drugItems.reduce((counts, item) => {
      const category = String(item.category || 'Uncategorised').trim() || 'Uncategorised';
      return {
        ...counts,
        [category]: (counts[category] || 0) + 1,
      };
    }, {});
    const categories = Object.entries(categoryCounts)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 6)
      .map(([label, value]) => ({ label, value }));
    const summaryRows = [
      {
        key: 'insulin',
        label: 'Insulins',
        value: drugItems.filter((item) => String(item.category || '').trim().toLowerCase() === 'insulin').length,
        description: 'Insulin medicines use variable dose controls and time-specific dose schedules on the prescription form.',
      },
      {
        key: 'critical',
        label: 'Critical medicines',
        value: drugItems.filter((item) => criticalLookup.has(String(item.drugName || '').trim().toLowerCase()) || item.criticalMedicine).length,
        description: 'Critical medicines are flagged on the chart so missed or delayed doses stand out during administration.',
      },
      {
        key: 'controlled',
        label: 'Controlled drugs',
        value: drugItems.filter((item) => item.controlledDrug).length,
        description: 'Controlled drugs are marked with a CD badge to make additional governance checks visible.',
      },
      {
        key: 'witness',
        label: 'Witness required',
        value: drugItems.filter((item) => item.requiresWitness).length,
        description: 'Witness-required medicines prompt an extra check when administration is recorded.',
      },
      {
        key: 'maxDose',
        label: 'Max dose rules',
        value: drugItems.filter((item) => String(item.maximumDose || '').trim()).length,
        description: 'Maximum dose values warn prescribers when the entered dose is above the configured safe limit.',
      },
    ];

    return {
      categories,
      maxValue: Math.max(1, ...summaryRows.map((item) => item.value), ...categories.map((item) => item.value)),
      rows: summaryRows,
    };
  }, [criticalMedicineOptions, drugItems]);
  const selectedRuleSummary = useMemo(
    () => drugSummary.rows.find((item) => item.key === medicineRuleFilter) || null,
    [drugSummary.rows, medicineRuleFilter]
  );
  const filteredMedicineRuleDrugs = useMemo(() => {
    if (!medicineRuleFilter) {
      return [];
    }
    const criticalLookup = new Set((criticalMedicineOptions || []).map((item) => String(item.drugName || '').trim().toLowerCase()));
    return drugItems.filter((item) => {
      const drugName = String(item.drugName || '').trim().toLowerCase();
      if (medicineRuleFilter === 'insulin') {
        return String(item.category || '').trim().toLowerCase() === 'insulin';
      }
      if (medicineRuleFilter === 'critical') {
        return criticalLookup.has(drugName) || item.criticalMedicine;
      }
      if (medicineRuleFilter === 'controlled') {
        return controlledDrugLookup.has(drugName) || item.controlledDrug;
      }
      if (medicineRuleFilter === 'witness') {
        return item.requiresWitness;
      }
      if (medicineRuleFilter === 'maxDose') {
        return String(item.maximumDose || '').trim();
      }
      return false;
    }).sort((left, right) => String(left.drugName || '').localeCompare(String(right.drugName || '')));
  }, [controlledDrugLookup, criticalMedicineOptions, drugItems, medicineRuleFilter]);

  const adminSections = useMemo(() => ([
    {
      key: 'users',
      title: 'User accounts',
      eyebrow: `${userAccounts.length} account${userAccounts.length === 1 ? '' : 's'}`,
      description: 'Review facilitator and student access, suspend accounts, approve pending accounts, or remove access while preserving audit records.',
      icon: 'bi bi-people',
    },
    {
      key: 'lookups',
      title: 'Prescribing Parameters',
      eyebrow: `${routeOptions.length + frequencyOptions.length + indicationOptions.length + unitOptions.length + formOptions.length} values`,
      description: 'Maintain routes, frequencies, indications, units, and forms used by prescribing screens and drug-library imports.',
      icon: 'bi bi-list-check',
    },
    {
      key: 'rules',
      title: 'Prescribing rules',
      eyebrow: `${criticalMedicineOptions.length} critical`,
      description: 'Configure safety flags such as critical medicines, and review what the medicine-rule badges mean for chart users.',
      icon: 'bi bi-shield-check',
    },
    {
      key: 'orderSets',
      title: 'Order sets',
      eyebrow: `${orderSets.length} order set${orderSets.length === 1 ? '' : 's'}`,
      description: 'Create reusable prescribing shortcuts linked to medicines, dose, route, frequency, and indication.',
      icon: 'bi bi-prescription2',
    },
    {
      key: 'drugLibrary',
      title: 'Drug library',
      eyebrow: `${drugItems.length} drug${drugItems.length === 1 ? '' : 's'}`,
      description: 'Search, edit, add, delete, and import medicines in the shared catalogue used for prescribing defaults.',
      icon: 'bi bi-capsule-pill',
    },
  ]), [criticalMedicineOptions.length, drugItems.length, formOptions.length, frequencyOptions.length, indicationOptions.length, orderSets.length, routeOptions.length, unitOptions.length, userAccounts.length]);

  const activeAdminSectionLabel = adminSections.find((section) => section.key === activeAdminSection)?.title || '';

  const downloadTemplate = (filename, content) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const confirmRemoval = (label, entityType) => window.confirm(`Remove ${label} from ${entityType}? This change will affect future admin and prescribing selections.`);

  const promptSuspendUser = async (account) => {
    const reason = window.prompt(`Suspend ${account.displayName || account.email}.\n\nEnter a reason for the suspension:`);
    if (!reason || !reason.trim()) {
      return;
    }
    await onSuspendUser(account.id, reason.trim());
  };

  const promptRemoveUserAccess = async (account) => {
    const reason = window.prompt(
      `Remove access for ${account.displayName || account.email}.\n\nThis should be used when access must end but the record should be retained for review and audit.\n\nEnter a reason for removing access:`
    );
    if (!reason || !reason.trim()) {
      return;
    }
    await onRemoveUserAccess(account.id, reason.trim());
  };

  const readFileText = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read the selected file.'));
    reader.readAsText(file);
  });

  const handleAddRoute = async (event) => {
    event.preventDefault();
    await onAddRoute(routeLabel);
    setRouteLabel('');
  };

  const handleAddFrequency = async (event) => {
    event.preventDefault();
    await onAddFrequency(frequencyLabel, frequencyTimes);
    setFrequencyLabel('');
    setFrequencyTimes('');
  };

  const handleRouteUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      setRouteUploadError('');
      const csvContent = await readFileText(file);
      await onImportRoutes(csvContent);
    } catch (error) {
      setRouteUploadError(error.message || 'Unable to import routes from CSV.');
    }
  };

  const handleFrequencyUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      setFrequencyUploadError('');
      const csvContent = await readFileText(file);
      await onImportFrequencies(csvContent);
    } catch (error) {
      setFrequencyUploadError(error.message || 'Unable to import frequencies from CSV.');
    }
  };

  const handleAddIndication = async (event) => {
    event.preventDefault();
    await onAddIndication(indicationLabel);
    setIndicationLabel('');
  };

  const handleIndicationUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      setIndicationUploadError('');
      const csvContent = await readFileText(file);
      await onImportIndications(csvContent);
    } catch (error) {
      setIndicationUploadError(error.message || 'Unable to import indications from CSV.');
    }
  };

  const handleAddUnit = async (event) => {
    event.preventDefault();
    await onAddUnit(unitLabel);
    setUnitLabel('');
  };

  const handleUnitUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      setUnitUploadError('');
      const csvContent = await readFileText(file);
      await onImportUnits(csvContent);
    } catch (error) {
      setUnitUploadError(error.message || 'Unable to import units from CSV.');
    }
  };

  const handleAddForm = async (event) => {
    event.preventDefault();
    await onAddForm(formLabel);
    setFormLabel('');
  };

  const buildDrugUpdatePayload = (drug, overrides = {}) => ({
    drugName: drug.drugName || '',
    strength: drug.strength || '',
    unit: drug.unit || '',
    form: drug.form || '',
    defaultRoute: drug.defaultRoute || '',
    category: drug.category || '',
    usualFrequencies: drug.usualFrequencies || '',
    defaultDose: drug.defaultDose || '',
    maximumDose: drug.maximumDose || '',
    notes: drug.notes || '',
    requiresWitness: Boolean(drug.requiresWitness),
    ...overrides,
  });

  const handleAddCriticalMedicine = async (event) => {
    event.preventDefault();
    if (!criticalMedicineDrugId) {
      return;
    }
    const selectedDrug = drugItems.find((item) => item.id === criticalMedicineDrugId);
    if (!selectedDrug) {
      return;
    }
    if (medicineRuleType === 'critical') {
      await onAddCriticalMedicine(criticalMedicineDrugId);
    } else if (medicineRuleType === 'controlled') {
      await onAddControlledDrug?.(criticalMedicineDrugId);
    } else if (medicineRuleType === 'insulin') {
      await onUpdateDrug(selectedDrug.id, buildDrugUpdatePayload(selectedDrug, { category: 'Insulin' }));
    } else if (medicineRuleType === 'witness') {
      await onUpdateDrug(selectedDrug.id, buildDrugUpdatePayload(selectedDrug, { requiresWitness: true }));
    } else if (medicineRuleType === 'maxDose') {
      if (!medicineRuleMaxDose.trim()) {
        return;
      }
      await onUpdateDrug(selectedDrug.id, buildDrugUpdatePayload(selectedDrug, { maximumDose: medicineRuleMaxDose.trim() }));
    }
    setCriticalMedicineDrugId('');
    setMedicineRuleMaxDose('');
  };

  const removeMedicineRule = async (drug, ruleKey) => {
    if (ruleKey === 'critical') {
      const criticalOption = criticalMedicineOptions.find((item) => String(item.drugName || '').trim().toLowerCase() === String(drug.drugName || '').trim().toLowerCase());
      if (criticalOption) {
        await onDeleteCriticalMedicine(criticalOption.id);
      }
      return;
    }
    if (ruleKey === 'controlled') {
      const controlledOption = controlledDrugOptions.find((item) => String(item.drugName || '').trim().toLowerCase() === String(drug.drugName || '').trim().toLowerCase());
      if (controlledOption) {
        await onDeleteControlledDrug?.(controlledOption.id);
      }
      return;
    }
    if (ruleKey === 'insulin') {
      await onUpdateDrug(drug.id, buildDrugUpdatePayload(drug, { category: '' }));
      return;
    }
    if (ruleKey === 'witness') {
      await onUpdateDrug(drug.id, buildDrugUpdatePayload(drug, { requiresWitness: false }));
      return;
    }
    if (ruleKey === 'maxDose') {
      await onUpdateDrug(drug.id, buildDrugUpdatePayload(drug, { maximumDose: '' }));
    }
  };

  const handleAddOrderSet = async (event) => {
    event.preventDefault();
    await onAddOrderSet(newOrderSet);
    setNewOrderSet({
      drugName: '',
      label: '',
      dose: '',
      unit: '',
      frequency: '',
      route: '',
      indication: '',
    });
  };

  const startOrderSetEdit = (item) => {
    setEditingOrderSetId(item.id);
    setEditingOrderSet({
      drugName: item.drugName || '',
      label: item.label || '',
      dose: item.dose || '',
      unit: item.unit || '',
      frequency: item.frequency || '',
      route: item.route || '',
      indication: item.indication || '',
    });
  };

  const saveOrderSetEdit = async () => {
    await onUpdateOrderSet(editingOrderSetId, editingOrderSet);
    setEditingOrderSetId('');
    setEditingOrderSet({
      drugName: '',
      label: '',
      dose: '',
      unit: '',
      frequency: '',
      route: '',
      indication: '',
    });
  };

  const handleFormUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    try {
      setFormUploadError('');
      const csvContent = await readFileText(file);
      await onImportForms(csvContent);
    } catch (error) {
      setFormUploadError(error.message || 'Unable to import forms from CSV.');
    }
  };

  const startRouteEdit = (route) => {
    setEditingRouteId(route.id);
    setEditingRouteLabel(route.label);
  };

  const saveRouteEdit = async () => {
    const currentRoute = routeOptions.find((item) => item.id === editingRouteId);
    await onUpdateRoute(editingRouteId, editingRouteLabel, currentRoute?.sortOrder ?? 0);
    setEditingRouteId('');
    setEditingRouteLabel('');
  };

  const startFrequencyEdit = (frequency) => {
    setEditingFrequencyId(frequency.id);
    setEditingFrequencyLabel(frequency.label);
    setEditingFrequencyTimes((frequency.defaultAdminTimes || []).join(', '));
  };

  const saveFrequencyEdit = async () => {
    const currentFrequency = frequencyOptions.find((item) => item.id === editingFrequencyId);
    await onUpdateFrequency(editingFrequencyId, editingFrequencyLabel, editingFrequencyTimes, currentFrequency?.sortOrder ?? 0);
    setEditingFrequencyId('');
    setEditingFrequencyLabel('');
    setEditingFrequencyTimes('');
  };

  const startIndicationEdit = (indication) => {
    setEditingIndicationId(indication.id);
    setEditingIndicationLabel(indication.label);
  };

  const saveIndicationEdit = async () => {
    await onUpdateIndication(editingIndicationId, editingIndicationLabel);
    setEditingIndicationId('');
    setEditingIndicationLabel('');
  };

  const startUnitEdit = (unit) => {
    setEditingUnitId(unit.id);
    setEditingUnitLabel(unit.label);
  };

  const saveUnitEdit = async () => {
    await onUpdateUnit(editingUnitId, editingUnitLabel);
    setEditingUnitId('');
    setEditingUnitLabel('');
  };

  const startFormEdit = (form) => {
    setEditingFormId(form.id);
    setEditingFormLabel(form.label);
  };

  const saveFormEdit = async () => {
    await onUpdateForm(editingFormId, editingFormLabel);
    setEditingFormId('');
    setEditingFormLabel('');
  };

  return (
    <div className="student-page">
      <Container className="mt-4 mb-5 student-page__content">
        <div className="student-dashboard-shell">
          {!activeAdminSection ? (
            <div className="student-dashboard-header">
              <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                <div>
                  <h2 className="mb-2">Facilitator admin settings</h2>
                  <p className="student-dashboard-header__copy  mb-1">
                    Manage platform-wide prescribing settings for routes, frequencies, and the shared drug library.
                  </p>
                </div>
              </div>
              <Button type="button" variant="outline-light" className="btn-sm" onClick={onBack}><i className="bi-arrow-left"></i> Back</Button>
            </div>
          ): null}

          {!activeAdminSection ? (
            <>
              <Row className="g-4 mb-4">
                {adminSections.map((section) => (
                  <Col md={6} xl={4} key={section.key}>
                    <StudentTile
                      title={section.title}
                      description={section.description}
                      icon={section.icon}
                      eyebrow={section.eyebrow}
                      onClick={() => setActiveAdminSection(section.key)}
                      variant="blue"
                    />
                  </Col>
                ))}
              </Row>

            </>
          ) : (
            <div className="student-dashboard-header facilitator-admin-section-nav">
              <div>
                <h2 className=" text-light">Admin section</h2>
                <p className="mb-0 text-light">{activeAdminSectionLabel}</p>
              </div>
              <br/>
              <Button type="button" variant="outline-light" className="btn-sm" onClick={() => setActiveAdminSection('')}>
                <i className="bi-arrow-left"></i> Back
              </Button>
            </div>
          )}

          {activeAdminSection === 'users' ? (
          <>
          

          <div className="student-dashboard-section">
            <div className="student-dashboard-section__header">
              <h4 className="mb-1">User accounts</h4>
              <p className="student-dashboard-header__copy mb-0">
                Suspend access temporarily or remove access while retaining the minimum account record needed for audit and retention review.
              </p>
            </div>
            <Alert variant="warning" className="mb-0">
              Good practice is to suspend accounts for temporary issues, and use <strong>remove access</strong> when someone should no longer be able to log in. This does not hard-delete their record immediately; it keeps the minimum account record until the retention review date.
            </Alert>
            <Form.Group className="mt-3" controlId="adminUserSearch">
              <Form.Label><strong>Search user accounts</strong></Form.Label>
              <Form.Control
                type="search"
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="Search by name, email, role, or status"
              />
              <Form.Text className="text-muted">
                Showing {filteredUsers.length} of {filteredUserCount} matching users.
                {filteredUserCount > MAX_VISIBLE_ROWS ? ` Refine your search to narrow beyond the first ${MAX_VISIBLE_ROWS}.` : ''}
              </Form.Text>
            </Form.Group>
            <Table bordered responsive className="mt-3 facilitator-admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Linked records</th>
                  <th>Retention review</th>
                  <th className="facilitator-admin-table__action-col">Suspend Account</th>
                  <th className="facilitator-admin-table__action-col">Remove Access</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <div className="fw-semibold">{account.displayName}</div>
                      <div className="small text-muted">{account.email}</div>
                    </td>
                    <td>{account.role}</td>
                    <td>
                      <div className={`facilitator-user-status facilitator-user-status--${account.accountStatus}`}>
                        {account.accountStatus === 'access_removed'
                          ? 'Access removed'
                          : account.accountStatus === 'pending_approval'
                            ? 'Pending approval'
                            : account.accountStatus}
                      </div>
                      {account.accountStatus === 'suspended' && account.accessSuspendedReason ? (
                        <div className="small text-muted mt-1">
                          <strong>Suspend Reason:</strong> {account.accessSuspendedReason}
                        </div>
                      ) : null}
                      {account.accountStatus === 'access_removed' && account.accessRemovedReason ? (
                        <div className="small text-muted mt-1">
                          <strong>Remove Reason:</strong> {account.accessRemovedReason}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <div className="small">Cases: {account.ownedCaseStudyCount}</div>
                      <div className="small">Sessions: {account.caseSessionCount}</div>
                      <div className="small">Patients: {account.testPatientCount}</div>
                    </td>
                    <td>{account.retentionReviewAt ? new Date(account.retentionReviewAt).toLocaleDateString('en-GB') : 'Not scheduled'}</td>
                   
                        {account.id === user?.id ? (
                          <td colspan="2" className="text-center align-middle">
                            <strong>Current Logged-In User</strong>
                          </td>
                        ) : account.accountStatus === 'active' ? (
                          <>
                          <td className="text-center align-middle">
                            <Button variant="warning" onClick={() => promptSuspendUser(account)}>
                              <i class="bi bi-person-dash"></i>{''}
                            </Button>
                          </td>
                          <td className="text-center align-middle">
                            <Button variant="danger"   onClick={() => promptRemoveUserAccess(account)}>
                              <i class="bi bi-person-x"></i>{''}
                            </Button>
                            </td>
                          </>
                        ) : (
                          <td colspan="2" className="text-center align-middle">
                            <Button type="button" variant="success" size="sm" onClick={() => onRestoreUser(account.id)}>
                              {account.accountStatus === 'pending_approval' ? 'Approve Facilitator Account' : 'Restore Account'}
                            </Button>
                          </td>
                        )}
               
                  </tr>
                ))}
              </tbody>
            </Table>
            {!filteredUserCount ? <Alert variant="warning" className="mt-3 mb-0">{userAccounts.length ? 'No user accounts match your search.' : 'No user accounts available.'}</Alert> : null}
          </div>
            </>
          ) : null}

          {activeAdminSection === 'lookups' ? (
            <>
          <div className="student-dashboard-section">
            <div className="student-dashboard-section__header">
              <h4 className="mb-1">Routes</h4>
              <p className="student-dashboard-header__copy mb-0">
                Add or remove standard administration routes used in prescribing.
              </p>
            </div>
            <Form onSubmit={handleAddRoute}>
              <Row className="g-3 align-items-end">
                <Col md={8}>
                  <Form.Group controlId="adminRouteLabel">
                    <Form.Label>New route</Form.Label>
                    <Form.Control
                      type="text"
                      value={routeLabel}
                      onChange={(event) => setRouteLabel(event.target.value)}
                      placeholder="e.g. Subcutaneous"
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Button type="submit" variant="primary" disabled={isSaving || !routeLabel.trim()}>
                    Add route
                  </Button>
                </Col>
              </Row>
            </Form>
            <div className="d-flex gap-2 flex-wrap mt-3">
              <Button type="button" variant="secondary" onClick={() => downloadTemplate('routes-template.csv', routeCsvTemplate)}>
                Download route CSV template
              </Button>
              <Form.Group controlId="adminRouteCsvUpload" className="mb-0">
                <Form.Label className="visually-hidden">Upload routes CSV</Form.Label>
                <Form.Control type="file" accept=".csv,text/csv" onChange={handleRouteUpload} disabled={isSaving} />
              </Form.Group>
            </div>
            {routeUploadError ? <Alert variant="danger" className="mt-3 mb-0">{routeUploadError}</Alert> : null}
            <Form.Group className="mt-3" controlId="adminRouteSearch">
              <Form.Label>Search routes</Form.Label>
              <Form.Control
                type="search"
                value={routeSearch}
                onChange={(event) => setRouteSearch(event.target.value)}
                placeholder="Search routes"
              />
              <Form.Text className="text-muted">
                Showing {filteredRoutes.length} of {filteredRouteCount} matching routes.
                {filteredRouteCount > MAX_VISIBLE_ROWS ? ` Refine your search to narrow beyond the first ${MAX_VISIBLE_ROWS}.` : ''}
              </Form.Text>
            </Form.Group>
            <Table bordered  className="mt-3 facilitator-admin-table">
              <thead>
                <tr>
                  <th>Route</th>
                  <th className="facilitator-admin-table__sort-col">Sort</th>
                  <th className="facilitator-admin-table__action-col">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoutes.map((route) => (
                  <tr key={route.id}>
                    <td>
                      {editingRouteId === route.id ? (
                        <Form.Control
                          type="text"
                          value={editingRouteLabel}
                          onChange={(event) => setEditingRouteLabel(event.target.value)}
                        />
                      ) : route.label}
                    </td>
                    <td>
                      <div className="facilitator-admin-table__sort-controls">
                        <Button type="button" variant="secondary" size="sm" onClick={() => onMoveRoute(route.id, 'up')} disabled={isSaving || routeOptions[0]?.id === route.id}>
                          ↑
                        </Button>
                        <Button type="button" variant="secondary" size="sm" onClick={() => onMoveRoute(route.id, 'down')} disabled={isSaving || routeOptions[routeOptions.length - 1]?.id === route.id}>
                          ↓
                        </Button>
                      </div>
                    </td>
                    <td>
                      {editingRouteId === route.id ? (
                        <div className="facilitator-admin-table__actions">
                          <Button type="button" variant="primary" size="sm" onClick={saveRouteEdit} disabled={isSaving || !editingRouteLabel.trim()}>
                            Save
                          </Button>
                          <Button type="button" variant="secondary" size="sm" onClick={() => setEditingRouteId('')}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="facilitator-admin-table__actions">
                          <Button type="button" variant="primary" size="sm" onClick={() => startRouteEdit(route)}>
                            Edit
                          </Button>
                      <Button type="button" variant="danger" size="sm" onClick={() => {
                        if (confirmRemoval(route.label, 'routes')) {
                          onDeleteRoute(route.id);
                        }
                      }}>
                        Remove
                      </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {!filteredRouteCount ? <Alert variant="warning" className="mt-3 mb-0">{routeOptions.length ? 'No routes match your search.' : 'No routes have been added yet.'}</Alert> : null}
          </div>

          <div className="student-dashboard-section">
            <div className="student-dashboard-section__header">
              <h4 className="mb-1">Frequencies</h4>
              <p className="student-dashboard-header__copy mb-0">
                Manage standard frequencies and the default administration times they imply.
              </p>
            </div>
            <Form onSubmit={handleAddFrequency}>
              <Row className="g-3 align-items-end">
                <Col md={5}>
                  <Form.Group controlId="adminFrequencyLabel">
                    <Form.Label>New frequency</Form.Label>
                    <Form.Control
                      type="text"
                      value={frequencyLabel}
                      onChange={(event) => setFrequencyLabel(event.target.value)}
                      placeholder="e.g. Three times daily"
                    />
                  </Form.Group>
                </Col>
                <Col md={5}>
                  <Form.Group controlId="adminFrequencyTimes">
                    <Form.Label>Default admin times</Form.Label>
                    <Form.Control
                      type="text"
                      value={frequencyTimes}
                      onChange={(event) => setFrequencyTimes(event.target.value)}
                      placeholder="e.g. 08:00, 14:00, 20:00"
                    />
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Button type="submit" variant="primary" disabled={isSaving || !frequencyLabel.trim()}>
                    Add
                  </Button>
                </Col>
              </Row>
            </Form>
            <div className="d-flex gap-2 flex-wrap mt-3">
              <Button type="button" variant="secondary" onClick={() => downloadTemplate('frequencies-template.csv', frequencyCsvTemplate)}>
                Download frequency CSV template
              </Button>
              <Form.Group controlId="adminFrequencyCsvUpload" className="mb-0">
                <Form.Label className="visually-hidden">Upload frequencies CSV</Form.Label>
                <Form.Control type="file" accept=".csv,text/csv" onChange={handleFrequencyUpload} disabled={isSaving} />
              </Form.Group>
            </div>
            {frequencyUploadError ? <Alert variant="danger" className="mt-3 mb-0">{frequencyUploadError}</Alert> : null}
            <Form.Group className="mt-3" controlId="adminFrequencySearch">
              <Form.Label>Search frequencies</Form.Label>
              <Form.Control
                type="search"
                value={frequencySearch}
                onChange={(event) => setFrequencySearch(event.target.value)}
                placeholder="Search frequencies or administration times"
              />
              <Form.Text className="text-muted">
                Showing {filteredFrequencies.length} of {filteredFrequencyCount} matching frequencies.
                {filteredFrequencyCount > MAX_VISIBLE_ROWS ? ` Refine your search to narrow beyond the first ${MAX_VISIBLE_ROWS}.` : ''}
              </Form.Text>
            </Form.Group>
            <Table bordered responsive className="mt-3 facilitator-admin-table">
              <thead>
                <tr>
                  <th>Frequency</th>
                  <th>Default admin times</th>
                  <th className="facilitator-admin-table__sort-col">Sort</th>
                  <th className="facilitator-admin-table__action-col">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredFrequencies.map((frequency) => (
                  <tr key={frequency.id}>
                    <td>
                      {editingFrequencyId === frequency.id ? (
                        <Form.Control
                          type="text"
                          value={editingFrequencyLabel}
                          onChange={(event) => setEditingFrequencyLabel(event.target.value)}
                        />
                      ) : frequency.label}
                    </td>
                    <td>
                      {editingFrequencyId === frequency.id ? (
                        <Form.Control
                          type="text"
                          value={editingFrequencyTimes}
                          onChange={(event) => setEditingFrequencyTimes(event.target.value)}
                        />
                      ) : ((frequency.defaultAdminTimes || []).join(', ') || 'Not set')}
                    </td>
                    <td>
                      <div className="facilitator-admin-table__sort-controls">
                        <Button type="button" variant="secondary" size="sm" onClick={() => onMoveFrequency(frequency.id, 'up')} disabled={isSaving || frequencyOptions[0]?.id === frequency.id}>
                          ↑
                        </Button>
                        <Button type="button" variant="secondary" size="sm" onClick={() => onMoveFrequency(frequency.id, 'down')} disabled={isSaving || frequencyOptions[frequencyOptions.length - 1]?.id === frequency.id}>
                          ↓
                        </Button>
                      </div>
                    </td>
                    <td className="text-nowrap">
                      {editingFrequencyId === frequency.id ? (
                        <div className="facilitator-admin-table__actions">
                          <Button type="button" variant="primary" size="sm" onClick={saveFrequencyEdit} disabled={isSaving || !editingFrequencyLabel.trim()}>
                            Save
                          </Button>
                          <Button type="button" variant="secondary" size="sm" onClick={() => setEditingFrequencyId('')}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="facilitator-admin-table__actions">
                          <Button type="button" variant="primary" size="sm" onClick={() => startFrequencyEdit(frequency)}>
                            Edit
                          </Button>
                      <Button type="button" variant="danger" size="sm" onClick={() => {
                        if (confirmRemoval(frequency.label, 'frequencies')) {
                          onDeleteFrequency(frequency.id);
                        }
                      }}>
                        Remove
                      </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {!filteredFrequencyCount ? <Alert variant="warning" className="mt-3 mb-0">{frequencyOptions.length ? 'No frequencies match your search.' : 'No frequencies have been added yet.'}</Alert> : null}
          </div>

          <div className="student-dashboard-section">
            <div className="student-dashboard-section__header">
              <h4 className="mb-1">Indications</h4>
              <p className="student-dashboard-header__copy mb-0">
                Manage the shared prescribing indications library used in the prescribing search.
              </p>
            </div>
            <Form onSubmit={handleAddIndication}>
              <Row className="g-3 align-items-end">
                <Col md={8}>
                  <Form.Group controlId="adminIndicationLabel">
                    <Form.Label>New indication</Form.Label>
                    <Form.Control
                      type="text"
                      value={indicationLabel}
                      onChange={(event) => setIndicationLabel(event.target.value)}
                      placeholder="e.g. Hypertension"
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Button type="submit" variant="primary" disabled={isSaving || !indicationLabel.trim()}>
                    Add indication
                  </Button>
                </Col>
              </Row>
            </Form>
            <div className="d-flex gap-2 flex-wrap mt-3">
              <Button type="button" variant="secondary" onClick={() => downloadTemplate('indications-template.csv', indicationCsvTemplate)}>
                Download indication CSV template
              </Button>
              <Form.Group controlId="adminIndicationCsvUpload" className="mb-0">
                <Form.Label className="visually-hidden">Upload indications CSV</Form.Label>
                <Form.Control type="file" accept=".csv,text/csv" onChange={handleIndicationUpload} disabled={isSaving} />
              </Form.Group>
            </div>
            {indicationUploadError ? <Alert variant="danger" className="mt-3 mb-0">{indicationUploadError}</Alert> : null}
            <Form.Group className="mt-3" controlId="adminIndicationSearch">
              <Form.Label>Search indications</Form.Label>
              <Form.Control
                type="search"
                value={indicationSearch}
                onChange={(event) => setIndicationSearch(event.target.value)}
                placeholder="Search indications"
              />
              <Form.Text className="text-muted">
                Showing {filteredIndications.length} of {filteredIndicationCount} matching indications.
                {filteredIndicationCount > MAX_VISIBLE_ROWS ? ` Refine your search to narrow beyond the first ${MAX_VISIBLE_ROWS}.` : ''}
              </Form.Text>
            </Form.Group>
            <Table bordered responsive className="mt-3 facilitator-admin-table">
              <thead>
                <tr>
                  <th>Indication</th>
                  <th className="facilitator-admin-table__action-col">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredIndications.map((indication) => (
                  <tr key={indication.id}>
                    <td>
                      {editingIndicationId === indication.id ? (
                        <Form.Control
                          type="text"
                          value={editingIndicationLabel}
                          onChange={(event) => setEditingIndicationLabel(event.target.value)}
                        />
                      ) : indication.label}
                    </td>
                    <td>
                      {editingIndicationId === indication.id ? (
                        <div className="facilitator-admin-table__actions">
                          <Button type="button" variant="primary" size="sm" onClick={saveIndicationEdit} disabled={isSaving || !editingIndicationLabel.trim()}>
                            Save
                          </Button>
                          <Button type="button" variant="secondary" size="sm" onClick={() => setEditingIndicationId('')}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="facilitator-admin-table__actions">
                          <Button type="button" variant="primary" size="sm" onClick={() => startIndicationEdit(indication)}>
                            Edit
                          </Button>
                      <Button type="button" variant="danger" size="sm" onClick={() => {
                        if (confirmRemoval(indication.label, 'indications')) {
                          onDeleteIndication(indication.id);
                        }
                      }}>
                        Remove
                      </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {!filteredIndicationCount ? <Alert variant="warning" className="mt-3 mb-0">{indicationOptions.length ? 'No indications match your search.' : 'No indications have been added yet.'}</Alert> : null}
          </div>

          <div className="student-dashboard-section">
            <div className="student-dashboard-section__header">
              <h4 className="mb-1">Units</h4>
              <p className="student-dashboard-header__copy mb-0">
                Manage the shared medication units used across the prescribing tools.
              </p>
            </div>
            <Form onSubmit={handleAddUnit}>
              <Row className="g-3 align-items-end">
                <Col md={8}>
                  <Form.Group controlId="adminUnitLabel">
                    <Form.Label>New unit</Form.Label>
                    <Form.Control
                      type="text"
                      value={unitLabel}
                      onChange={(event) => setUnitLabel(event.target.value)}
                      placeholder="e.g. mg"
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Button type="submit" variant="primary" disabled={isSaving || !unitLabel.trim()}>
                    Add unit
                  </Button>
                </Col>
              </Row>
            </Form>
            <div className="d-flex gap-2 flex-wrap mt-3">
              <Button type="button" variant="secondary" onClick={() => downloadTemplate('units-template.csv', unitCsvTemplate)}>
                Download unit CSV template
              </Button>
              <Form.Group controlId="adminUnitCsvUpload" className="mb-0">
                <Form.Label className="visually-hidden">Upload units CSV</Form.Label>
                <Form.Control type="file" accept=".csv,text/csv" onChange={handleUnitUpload} disabled={isSaving} />
              </Form.Group>
            </div>
            {unitUploadError ? <Alert variant="danger" className="mt-3 mb-0">{unitUploadError}</Alert> : null}
            <Form.Group className="mt-3" controlId="adminUnitSearch">
              <Form.Label>Search units</Form.Label>
              <Form.Control
                type="search"
                value={unitSearch}
                onChange={(event) => setUnitSearch(event.target.value)}
                placeholder="Search units"
              />
              <Form.Text className="text-muted">
                Showing {filteredUnits.length} of {filteredUnitCount} matching units.
                {filteredUnitCount > MAX_VISIBLE_ROWS ? ` Refine your search to narrow beyond the first ${MAX_VISIBLE_ROWS}.` : ''}
              </Form.Text>
            </Form.Group>
            <Table bordered responsive className="mt-3 facilitator-admin-table">
              <thead>
                <tr>
                  <th>Unit</th>
                  <th className="facilitator-admin-table__action-col">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnits.map((unit) => (
                  <tr key={unit.id}>
                    <td>
                      {editingUnitId === unit.id ? (
                        <Form.Control
                          type="text"
                          value={editingUnitLabel}
                          onChange={(event) => setEditingUnitLabel(event.target.value)}
                        />
                      ) : unit.label}
                    </td>
                    <td>
                      {editingUnitId === unit.id ? (
                        <div className="facilitator-admin-table__actions">
                          <Button type="button" variant="primary" size="sm" onClick={saveUnitEdit} disabled={isSaving || !editingUnitLabel.trim()}>
                            Save
                          </Button>
                          <Button type="button" variant="secondary" size="sm" onClick={() => setEditingUnitId('')}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="facilitator-admin-table__actions">
                          <Button type="button" variant="primary" size="sm" onClick={() => startUnitEdit(unit)}>
                            Edit
                          </Button>
                      <Button type="button" variant="danger" size="sm" onClick={() => {
                        if (confirmRemoval(unit.label, 'units')) {
                          onDeleteUnit(unit.id);
                        }
                      }}>
                        Remove
                      </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {!filteredUnitCount ? <Alert variant="warning" className="mt-3 mb-0">{unitOptions.length ? 'No units match your search.' : 'No units have been added yet.'}</Alert> : null}
          </div>

          <div className="student-dashboard-section">
            <div className="student-dashboard-section__header">
              <h4 className="mb-1">Forms</h4>
              <p className="student-dashboard-header__copy mb-0">
                Manage the shared medication forms used across the prescribing tools.
              </p>
            </div>
            <Form onSubmit={handleAddForm}>
              <Row className="g-3 align-items-end">
                <Col md={8}>
                  <Form.Group controlId="adminFormLabel">
                    <Form.Label>New form</Form.Label>
                    <Form.Control
                      type="text"
                      value={formLabel}
                      onChange={(event) => setFormLabel(event.target.value)}
                      placeholder="e.g. tablet"
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Button type="submit" variant="primary" disabled={isSaving || !formLabel.trim()}>
                    Add form
                  </Button>
                </Col>
              </Row>
            </Form>
            <div className="d-flex gap-2 flex-wrap mt-3">
              <Button type="button" variant="secondary" onClick={() => downloadTemplate('forms-template.csv', formCsvTemplate)}>
                Download form CSV template
              </Button>
              <Form.Group controlId="adminFormCsvUpload" className="mb-0">
                <Form.Label className="visually-hidden">Upload forms CSV</Form.Label>
                <Form.Control type="file" accept=".csv,text/csv" onChange={handleFormUpload} disabled={isSaving} />
              </Form.Group>
            </div>
            {formUploadError ? <Alert variant="danger" className="mt-3 mb-0">{formUploadError}</Alert> : null}
            <Form.Group className="mt-3" controlId="adminFormSearch">
              <Form.Label>Search forms</Form.Label>
              <Form.Control
                type="search"
                value={formSearch}
                onChange={(event) => setFormSearch(event.target.value)}
                placeholder="Search forms"
              />
              <Form.Text className="text-muted">
                Showing {filteredForms.length} of {filteredFormCount} matching forms.
                {filteredFormCount > MAX_VISIBLE_ROWS ? ` Refine your search to narrow beyond the first ${MAX_VISIBLE_ROWS}.` : ''}
              </Form.Text>
            </Form.Group>
            <Table bordered responsive className="mt-3 facilitator-admin-table">
              <thead>
                <tr>
                  <th>Form</th>
                  <th className="facilitator-admin-table__action-col">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredForms.map((form) => (
                  <tr key={form.id}>
                    <td>
                      {editingFormId === form.id ? (
                        <Form.Control
                          type="text"
                          value={editingFormLabel}
                          onChange={(event) => setEditingFormLabel(event.target.value)}
                        />
                      ) : form.label}
                    </td>
                    <td>
                      {editingFormId === form.id ? (
                        <div className="facilitator-admin-table__actions">
                          <Button type="button" variant="primary" size="sm" onClick={saveFormEdit} disabled={isSaving || !editingFormLabel.trim()}>
                            Save
                          </Button>
                          <Button type="button" variant="secondary" size="sm" onClick={() => setEditingFormId('')}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="facilitator-admin-table__actions">
                          <Button type="button" variant="primary" size="sm" onClick={() => startFormEdit(form)}>
                            Edit
                          </Button>
                      <Button type="button" variant="danger" size="sm" onClick={() => {
                        if (confirmRemoval(form.label, 'forms')) {
                          onDeleteForm(form.id);
                        }
                      }}>
                        Remove
                      </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {!filteredFormCount ? <Alert variant="warning" className="mt-3 mb-0">{formOptions.length ? 'No forms match your search.' : 'No forms have been added yet.'}</Alert> : null}
          </div>
            </>
          ) : null}

          {activeAdminSection === 'rules' ? (
            <>
          <div className="student-dashboard-section">
            <div className="student-dashboard-section__header">
              <h4 className="mb-1">Critical medicines</h4>
              <p className="student-dashboard-header__copy mb-0">
                Pick drugs from the shared library and apply medicine safety rules used by prescribing and administration.
              </p>
            </div>
            <div className="facilitator-admin-rule-grid">
              {drugSummary.rows.map((item) => (
                <button
                  type="button"
                  className={`facilitator-admin-rule-card text-start ${medicineRuleFilter === item.key ? 'facilitator-admin-rule-card--active' : ''}`}
                  key={`rule-detail-${item.key}`}
                  onClick={() => setMedicineRuleFilter((current) => (current === item.key ? '' : item.key))}
                >
                  <div className="facilitator-admin-rule-card__count">{item.value}</div>
                  <div>
                    <h5>{item.label}</h5>
                    <p>{item.description}</p>
                  </div>
                </button>
              ))}
            </div>
            <Form onSubmit={handleAddCriticalMedicine}>
              <Row className="g-3 align-items-end">
                <Col md={3}>
                  <Form.Group controlId="adminMedicineRuleType">
                    <Form.Label>Rule</Form.Label>
                    <Form.Select
                      value={medicineRuleType}
                      onChange={(event) => {
                        setMedicineRuleType(event.target.value);
                        setCriticalMedicineDrugId('');
                        setMedicineRuleMaxDose('');
                      }}
                    >
                      <option value="critical">Critical medicine</option>
                      <option value="insulin">Insulin</option>
                      <option value="controlled">Controlled drug</option>
                      <option value="witness">Witness required</option>
                      <option value="maxDose">Maximum dose</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={medicineRuleType === 'maxDose' ? 5 : 6}>
                  <Form.Group controlId="adminCriticalMedicineDrug">
                    <Form.Label>Select drug from library</Form.Label>
                    <Form.Select value={criticalMedicineDrugId} onChange={(event) => setCriticalMedicineDrugId(event.target.value)}>
                      <option value="">Select drug</option>
                      {availableCriticalMedicineDrugs.map((item) => (
                        <option key={item.id} value={item.id}>
                          {[item.drugName, item.strength, item.form].filter(Boolean).join(' ')}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                {medicineRuleType === 'maxDose' ? (
                  <Col md={2}>
                    <Form.Group controlId="adminMedicineRuleMaxDose">
                      <Form.Label>Max dose</Form.Label>
                      <Form.Control
                        value={medicineRuleMaxDose}
                        onChange={(event) => setMedicineRuleMaxDose(event.target.value)}
                        placeholder="e.g. 4g/24h"
                      />
                    </Form.Group>
                  </Col>
                ) : null}
                <Col md={3}>
                  <Button type="submit" variant="primary" disabled={isSaving || !criticalMedicineDrugId || (medicineRuleType === 'maxDose' && !medicineRuleMaxDose.trim())}>
                    Add rule
                  </Button>
                </Col>
              </Row>
            </Form>
            {medicineRuleFilter ? (
              <div className="mt-4">
                <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap">
                  <div>
                    <h5 className="mb-1">{selectedRuleSummary?.label || 'Filtered medicines'}</h5>
                    <p className="text-muted mb-0">{filteredMedicineRuleDrugs.length} configured medicine{filteredMedicineRuleDrugs.length === 1 ? '' : 's'} in this category.</p>
                  </div>
                  <Button type="button" variant="outline-secondary" size="sm" onClick={() => setMedicineRuleFilter('')}>Clear filter</Button>
                </div>
                <Table bordered responsive className="mt-3 facilitator-admin-table">
                  <thead>
                    <tr>
                      <th>Drug</th>
                      <th>Category</th>
                      <th>Max dose</th>
                      <th>Rule detail</th>
                      <th className="facilitator-admin-table__action-col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMedicineRuleDrugs.map((item) => (
                      <tr key={`${medicineRuleFilter}-${item.id}`}>
                        <td>{[item.drugName, item.strength, item.form].filter(Boolean).join(' ')}</td>
                        <td>{item.category || 'Not set'}</td>
                        <td>{item.maximumDose || 'Not set'}</td>
                        <td>
                          {medicineRuleFilter === 'critical' ? 'Critical medicine' : null}
                          {medicineRuleFilter === 'controlled' ? 'Controlled drug' : null}
                          {medicineRuleFilter === 'insulin' ? 'Insulin category' : null}
                          {medicineRuleFilter === 'witness' ? 'Witness required' : null}
                          {medicineRuleFilter === 'maxDose' ? `Maximum dose: ${item.maximumDose}` : null}
                        </td>
                        <td>
                          <div className="facilitator-admin-table__actions">
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              onClick={() => {
                                if (confirmRemoval(item.drugName, selectedRuleSummary?.label || 'medicine rules')) {
                                  removeMedicineRule(item, medicineRuleFilter);
                                }
                              }}
                            >
                              Remove rule
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                {!filteredMedicineRuleDrugs.length ? (
                  <Alert variant="warning" className="mt-3 mb-0">
                    No medicines match this rule yet.
                  </Alert>
                ) : null}
              </div>
            ) : null}
            <Table bordered responsive className="mt-3 facilitator-admin-table">
              <thead>
                <tr>
                  <th>Drug</th>
                  <th className="facilitator-admin-table__action-col">Action</th>
                </tr>
              </thead>
              <tbody>
                {criticalMedicineOptions.map((item) => (
                  <tr key={item.id}>
                    <td>{item.drugName}</td>
                    <td>
                      <div className="facilitator-admin-table__actions">
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            if (confirmRemoval(item.drugName, 'critical medicines')) {
                              onDeleteCriticalMedicine(item.id);
                            }
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {!criticalMedicineOptions.length ? (
              <Alert variant="warning" className="mt-3 mb-0">
                No critical medicines are configured yet.
              </Alert>
            ) : null}
          </div>
            </>
          ) : null}

          {activeAdminSection === 'orderSets' ? (
          <div className="student-dashboard-section">
            <div className="student-dashboard-section__header">
              <h4 className="mb-1">Order sets</h4>
              <p className="student-dashboard-header__copy mb-0">
                Build reusable prescribing order sets linked to drugs from the shared library.
              </p>
            </div>
            <Form onSubmit={handleAddOrderSet}>
              <Row className="g-3 align-items-end">
                <Col md={4}>
                  <Form.Group controlId="adminOrderSetDrug">
                    <Form.Label>Drug</Form.Label>
                    <Form.Select
                      value={newOrderSet.drugName}
                      onChange={(event) => {
                        const selectedDrug = (drugLibrary?.items || []).find((item) => item.drugName === event.target.value);
                        setNewOrderSet((current) => ({
                          ...current,
                          drugName: event.target.value,
                          unit: selectedDrug?.unit || current.unit,
                        }));
                      }}
                    >
                      <option value="">Select drug</option>
                      {(drugLibrary?.items || []).map((item) => (
                        <option key={item.id} value={item.drugName}>
                          {[item.drugName, item.strength, item.form].filter(Boolean).join(' ')}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="adminOrderSetLabel">
                    <Form.Label>Order set label</Form.Label>
                    <Form.Control
                      type="text"
                      value={newOrderSet.label}
                      onChange={(event) => setNewOrderSet((current) => ({ ...current, label: event.target.value }))}
                      placeholder="e.g. 5mg once daily"
                    />
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group controlId="adminOrderSetDose">
                    <Form.Label>Dose</Form.Label>
                    <Form.Control
                      type="text"
                      value={newOrderSet.dose}
                      onChange={(event) => setNewOrderSet((current) => ({ ...current, dose: event.target.value }))}
                    />
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group controlId="adminOrderSetUnit">
                    <Form.Label>Unit</Form.Label>
                    <Form.Select value={newOrderSet.unit} onChange={(event) => setNewOrderSet((current) => ({ ...current, unit: event.target.value }))}>
                      <option value="">Select unit</option>
                      {unitOptions.map((option) => <option key={option.id} value={option.label}>{option.label}</option>)}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="adminOrderSetFrequency">
                    <Form.Label>Frequency</Form.Label>
                    <Form.Select value={newOrderSet.frequency} onChange={(event) => setNewOrderSet((current) => ({ ...current, frequency: event.target.value }))}>
                      <option value="">Select frequency</option>
                      {frequencyOptions.map((option) => <option key={option.id} value={option.label}>{option.label}</option>)}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="adminOrderSetRoute">
                    <Form.Label>Route</Form.Label>
                    <Form.Select value={newOrderSet.route} onChange={(event) => setNewOrderSet((current) => ({ ...current, route: event.target.value }))}>
                      <option value="">Select route</option>
                      {routeOptions.map((option) => <option key={option.id} value={option.label}>{option.label}</option>)}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group controlId="adminOrderSetIndication">
                    <Form.Label>Indication</Form.Label>
                    <Form.Select value={newOrderSet.indication} onChange={(event) => setNewOrderSet((current) => ({ ...current, indication: event.target.value }))}>
                      <option value="">Select indication</option>
                      {indicationOptions.map((option) => <option key={option.id} value={option.label}>{option.label}</option>)}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={12}>
                  <Button type="submit" variant="primary" disabled={isSaving || !newOrderSet.drugName || !newOrderSet.label.trim()}>
                    Add order set
                  </Button>
                </Col>
              </Row>
            </Form>
            <Form.Group className="mt-3" controlId="adminOrderSetSearch">
              <Form.Label>Search order sets</Form.Label>
              <Form.Control
                type="search"
                value={orderSetSearch}
                onChange={(event) => setOrderSetSearch(event.target.value)}
                placeholder="Search by drug, label, dose, route, frequency, or indication"
              />
              <Form.Text className="text-muted">
                Showing {filteredOrderSets.length} of {filteredOrderSetCount} matching order sets.
                {filteredOrderSetCount > MAX_VISIBLE_ROWS ? ` Refine your search to narrow beyond the first ${MAX_VISIBLE_ROWS}.` : ''}
              </Form.Text>
            </Form.Group>
            <Table bordered responsive className="mt-3 facilitator-admin-table">
              <thead>
                <tr>
                  <th>Drug</th>
                  <th>Label</th>
                  <th>Dose</th>
                  <th>Frequency</th>
                  <th>Route</th>
                  <th>Indication</th>
                  <th className="facilitator-admin-table__action-col">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrderSets.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {editingOrderSetId === item.id ? (
                        <Form.Select
                          value={editingOrderSet.drugName}
                          onChange={(event) => {
                            const selectedDrug = (drugLibrary?.items || []).find((drug) => drug.drugName === event.target.value);
                            setEditingOrderSet((current) => ({
                              ...current,
                              drugName: event.target.value,
                              unit: selectedDrug?.unit || current.unit,
                            }));
                          }}
                        >
                          <option value="">Select drug</option>
                          {(drugLibrary?.items || []).map((drug) => (
                            <option key={drug.id} value={drug.drugName}>
                              {[drug.drugName, drug.strength, drug.form].filter(Boolean).join(' ')}
                            </option>
                          ))}
                        </Form.Select>
                      ) : item.drugName}
                    </td>
                    <td>{editingOrderSetId === item.id ? <Form.Control value={editingOrderSet.label} onChange={(event) => setEditingOrderSet((current) => ({ ...current, label: event.target.value }))} /> : item.label}</td>
                    <td>
                      {editingOrderSetId === item.id ? (
                        <div className="d-flex gap-2">
                          <Form.Control value={editingOrderSet.dose} onChange={(event) => setEditingOrderSet((current) => ({ ...current, dose: event.target.value }))} />
                          <Form.Select value={editingOrderSet.unit} onChange={(event) => setEditingOrderSet((current) => ({ ...current, unit: event.target.value }))}>
                            <option value="">Unit</option>
                            {unitOptions.map((option) => <option key={option.id} value={option.label}>{option.label}</option>)}
                          </Form.Select>
                        </div>
                      ) : `${item.dose || ''}${item.unit || ''}`.trim() || 'Not set'}
                    </td>
                    <td>{editingOrderSetId === item.id ? (
                      <Form.Select value={editingOrderSet.frequency} onChange={(event) => setEditingOrderSet((current) => ({ ...current, frequency: event.target.value }))}>
                        <option value="">Select frequency</option>
                        {frequencyOptions.map((option) => <option key={option.id} value={option.label}>{option.label}</option>)}
                      </Form.Select>
                    ) : item.frequency || 'Not set'}</td>
                    <td>{editingOrderSetId === item.id ? (
                      <Form.Select value={editingOrderSet.route} onChange={(event) => setEditingOrderSet((current) => ({ ...current, route: event.target.value }))}>
                        <option value="">Select route</option>
                        {routeOptions.map((option) => <option key={option.id} value={option.label}>{option.label}</option>)}
                      </Form.Select>
                    ) : item.route || 'Not set'}</td>
                    <td>{editingOrderSetId === item.id ? (
                      <Form.Select value={editingOrderSet.indication} onChange={(event) => setEditingOrderSet((current) => ({ ...current, indication: event.target.value }))}>
                        <option value="">Select indication</option>
                        {indicationOptions.map((option) => <option key={option.id} value={option.label}>{option.label}</option>)}
                      </Form.Select>
                    ) : item.indication || 'Not set'}</td>
                    <td>
                      {editingOrderSetId === item.id ? (
                        <div className="facilitator-admin-table__actions">
                          <Button type="button" variant="primary" size="sm" onClick={saveOrderSetEdit} disabled={isSaving || !editingOrderSet.drugName || !editingOrderSet.label.trim()}>
                            Save
                          </Button>
                          <Button type="button" variant="secondary" size="sm" onClick={() => setEditingOrderSetId('')}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="facilitator-admin-table__actions">
                          <Button type="button" variant="primary" size="sm" onClick={() => startOrderSetEdit(item)}>
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => {
                              if (confirmRemoval(`${item.drugName} - ${item.label}`, 'order sets')) {
                                onDeleteOrderSet(item.id);
                              }
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {!filteredOrderSetCount ? (
              <Alert variant="warning" className="mt-3 mb-0">
                {orderSets.length ? 'No order sets match your search.' : 'No order sets have been added yet.'}
              </Alert>
            ) : null}
          </div>
          ) : null}

          {activeAdminSection === 'drugLibrary' ? (
          <DrugLibraryManager
            items={drugLibrary?.items || []}
            metadata={drugLibrary?.metadata || {}}
            onPreviewImport={onPreviewDrugLibraryImport}
            onImport={onImportDrugLibrary}
            onUpdateDrug={onUpdateDrug}
            onAddDrug={onAddDrug}
            onDeleteDrug={onDeleteDrug}
            importing={isSaving}
          />
          ) : null}
        </div>
      </Container>
    </div>
  );
};

export default FacilitatorAdminWorkspace;
