import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Table from 'react-bootstrap/Table';
import Icon from './Patient_record_icon';

const NOTE_TEMPLATES = {
  freeText: { label: 'Free text progress note', sections: [] },
  wardRound: { label: 'Ward round note', sections: [['currentIssues', 'Current issues'], ['examination', 'Examination / observations'], ['resultsReviewed', 'Results reviewed'], ['assessment', 'Assessment / impression'], ['plan', 'Plan'], ['escalation', 'Escalation / ceiling of care'], ['dischargeCriteria', 'Discharge criteria / estimated discharge']] },
  sbar: { label: 'SBAR escalation / referral', sections: [['situation', 'Situation'], ['background', 'Background'], ['assessment', 'Assessment'], ['recommendation', 'Recommendation']] },
  clerkingAddendum: { label: 'Clerking addendum', sections: [['summary', 'Summary'], ['newInformation', 'New information'], ['assessment', 'Assessment'], ['plan', 'Plan']] },
  dischargePlanning: { label: 'Discharge planning note', sections: [['barriers', 'Current barriers'], ['destination', 'Expected destination'], ['estimatedDate', 'Estimated discharge date'], ['actions', 'Actions required'], ['plan', 'Plan / next review']] },
  mdtHandover: { label: 'MDT / handover note', sections: [['discussion', 'Discussion summary'], ['risks', 'Key risks / concerns'], ['actions', 'Actions agreed'], ['owners', 'Named owners / handover']] },
  vteAssessment: { label: 'VTE assessment', sections: [['mobility', 'Mobility'], ['thrombosisPatientFactors', 'Thrombosis risk - patient related'], ['thrombosisAdmissionFactors', 'Thrombosis risk - admission related'], ['bleedingPatientFactors', 'Bleeding risk - patient related'], ['bleedingAdmissionFactors', 'Bleeding risk - admission related'], ['plan', 'Plan / rationale']] },
};

const VTE_COMPLETE_STATUS = 'Complete';
const VTE_NOT_DONE_STATUS = 'Not done';
const VTE_MOBILITY_OPTIONS = [
  'Surgical patient',
  'Medical patient expected to have significantly reduced mobility relative to normal state',
  'Medical patient not expected to have significantly reduced mobility relative to normal state',
];

const VTE_RISK_GROUPS = [
  {
    key: 'thrombosisPatientFactors',
    title: 'Thrombosis risk - patient related',
    items: [
      'Age > 60',
      'Active cancer or cancer treatment',
      'Dehydration',
      'Obesity (BMI >30 kg/m2)',
      'Known thrombophilias',
      'One or more significant medical comorbidities',
      'Personal history or first-degree relative with a history of VTE',
      'Use of hormone replacement therapy',
      'Use of oestrogen-containing contraceptive therapy',
      'Varicose veins with phlebitis',
      'Pregnancy or < 6 weeks post partum',
    ],
  },
  {
    key: 'thrombosisAdmissionFactors',
    title: 'Thrombosis risk - admission related',
    items: [
      'Significantly reduced mobility for 3 days or more',
      'Hip or knee replacement',
      'Hip fracture',
      'Total anaesthetic + surgical time > 90 minutes',
      'Surgery involving pelvis or lower limb with total anaesthetic + surgical time > 60 minutes',
      'Acute surgical admission with inflammatory or intra-abdominal condition',
      'Critical care admission',
      'Surgery with significant reduction in mobility',
    ],
  },
  {
    key: 'bleedingPatientFactors',
    title: 'Bleeding risk - patient related',
    items: [
      'Active bleeding',
      'Acquired bleeding disorders',
      'Concurrent use of anticoagulants known to increase the risk of bleeding',
      'Acute stroke',
      'Thrombocytopaenia (platelets < 75 x 10^9/l)',
      'Uncontrolled systolic hypertension (230/120 mmHg or higher)',
      'Untreated inherited bleeding disorders',
    ],
  },
  {
    key: 'bleedingAdmissionFactors',
    title: 'Bleeding risk - admission related',
    items: [
      'Neurosurgery, spinal surgery or eye surgery',
      'Other procedure with high bleeding risk',
      'Lumbar puncture/epidural/spinal anaesthesia expected within the next 12 hours',
      'Lumbar puncture/epidural/spinal anaesthesia within the previous 4 hours',
    ],
  },
];

const createNoteId = () => `clinical-note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const formatDateInputValue = (date) => date.toISOString().slice(0, 10);
const formatTimeInputValue = (date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

const parseNoteDateTime = (value) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (raw.includes('T') || raw.includes('-')) {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const [datePart = '', timePart = ''] = raw.split(' ');
  const [day, month, year] = datePart.split('/').map(Number);
  const [hour = 0, minute = 0] = timePart.split(':').map(Number);
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day, hour, minute);
};

const formatNoteDateTime = (value) => {
  const parsed = parseNoteDateTime(value);
  return parsed ? parsed.toLocaleString('en-GB') : 'Not recorded';
};

const buildTemplateSections = (templateKey, existingSections = []) => {
  const template = NOTE_TEMPLATES[templateKey] || NOTE_TEMPLATES.freeText;
  const lookup = new Map((Array.isArray(existingSections) ? existingSections : []).map((section) => [section.key, section]));
  return template.sections.map(([key, label]) => {
    const existingValue = String(lookup.get(key)?.value || '').trim();
    if (templateKey === 'vteAssessment' && key === 'plan' && !existingValue) {
      const legacySummary = ['riskFactors', 'bleedingRisk', 'contraindications', 'pharmacologicalProphylaxis', 'mechanicalProphylaxis']
        .map((legacyKey) => {
          const legacySection = lookup.get(legacyKey);
          return legacySection?.value ? `${legacySection.label}: ${legacySection.value}` : '';
        })
        .filter(Boolean)
        .join('\n');
      return { key, label, value: legacySummary };
    }
    return { key, label, value: existingValue };
  });
};

const parseSelectedValues = (value) => {
  const rawValue = String(value || '').trim();
  if (!rawValue) return [];
  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed.map((item) => String(item || '').trim()).filter(Boolean) : [];
  } catch (_error) {
    return rawValue.split(/\r?\n|,\s*/).map((item) => String(item || '').trim()).filter(Boolean);
  }
};

const getSectionValue = (sections = [], sectionKey) => String((sections || []).find((section) => section.key === sectionKey)?.value || '');

const getSelectedVteFactors = (sections = [], sectionKey) => parseSelectedValues(getSectionValue(sections, sectionKey));

const buildVteSummarySections = (sections = []) => {
  const mobility = getSectionValue(sections, 'mobility');
  const plan = getSectionValue(sections, 'plan');
  return [
    mobility ? `Mobility: ${mobility}` : '',
    ...VTE_RISK_GROUPS.map((group) => {
      const selected = getSelectedVteFactors(sections, group.key);
      return `${group.title}: ${selected.length ? selected.join('; ') : 'None selected'}`;
    }),
    plan ? `Plan / rationale: ${plan}` : '',
  ].filter(Boolean);
};

const normalizeVteAssessment = (value) => {
  const normalized = value && typeof value === 'object' ? value : {};
  const legacyStatus = String(normalized.status || '').trim().toLowerCase();
  const hasAssessmentNote = Boolean(normalized.noteId || normalized.authoredAt || normalized.outcome || legacyStatus === 'complete');
  return {
    status: hasAssessmentNote ? VTE_COMPLETE_STATUS : VTE_NOT_DONE_STATUS,
    noteId: String(normalized.noteId || '').trim(),
    authoredAt: String(normalized.authoredAt || '').trim(),
    author: String(normalized.author || '').trim(),
    outcome: String(normalized.outcome || '').trim(),
  };
};

const normalizeNoteEntry = (item, index) => {
  if (!item || typeof item !== 'object') return null;
  const noteType = NOTE_TEMPLATES[item.noteType] ? item.noteType : 'freeText';
  return {
    id: String(item.id || `clinical-note-${index}`).trim(),
    noteType,
    title: String(item.title || item.note_title || '').trim(),
    authoredAt: String(item.authoredAt || item.note_date || '').trim(),
    location: String(item.location || item.note_location || '').trim(),
    author: String(item.author || item.note_author || '').trim(),
    content: String(item.content || item.note_content || '').trim(),
    sections: buildTemplateSections(noteType, item.sections || []),
    assessmentStatus: noteType === 'vteAssessment' ? VTE_COMPLETE_STATUS : '',
    signed: false,
    locked: false,
  };
};

const createNoteDraft = (templateKey, defaultAuthor, note) => {
  const authored = parseNoteDateTime(note?.authoredAt) || new Date();
  const noteType = note?.noteType && NOTE_TEMPLATES[note.noteType] ? note.noteType : templateKey;
  return {
    id: note?.id || '',
    noteType,
    title: String(note?.title || (noteType === 'vteAssessment' ? NOTE_TEMPLATES.vteAssessment.label : '')).trim(),
    authoredDate: formatDateInputValue(authored),
    authoredTime: formatTimeInputValue(authored),
    location: String(note?.location || '').trim(),
    author: String(defaultAuthor || '').trim(),
    content: String(note?.content || '').trim(),
    sections: buildTemplateSections(noteType, note?.sections || []),
    assessmentStatus: noteType === 'vteAssessment' ? VTE_COMPLETE_STATUS : '',
    signed: false,
  };
};

const normalizeCaseNotes = (caseNotes = {}) => {
  const normalized = caseNotes && typeof caseNotes === 'object' ? caseNotes : {};
  const notes = (Array.isArray(normalized.notes) ? normalized.notes : []).map((item, index) => normalizeNoteEntry(item, index)).filter(Boolean);
  const vteNote = notes.find((item) => item.noteType === 'vteAssessment');
  const normalizedVteAssessment = normalizeVteAssessment(normalized.vteAssessment);
  const pastMedicalSurgicalHistory = Array.isArray(normalized.pastMedicalSurgicalHistory)
    ? normalized.pastMedicalSurgicalHistory.map((item) => (typeof item === 'string' ? { text: item.trim(), code: '' } : { text: String(item?.text || item?.label || '').trim(), code: String(item?.code || item?.icd10Code || '').trim() })).filter((item) => item.text)
    : [];
  return {
    presentingComplaint: String(normalized.presentingComplaint || '').trim(),
    historyPresentingComplaint: String(normalized.historyPresentingComplaint || '').trim(),
    pastMedicalSurgicalHistory,
    functionalBaseline: String(normalized.functionalBaseline || '').trim(),
    familyHistory: String(normalized.familyHistory || '').trim(),
    socialHistory: {
      alcohol: String(normalized.socialHistory?.alcohol || '').trim(),
      smoking: String(normalized.socialHistory?.smoking || '').trim(),
      recreationalDrugs: String(normalized.socialHistory?.recreationalDrugs || '').trim(),
      occupation: String(normalized.socialHistory?.occupation || '').trim(),
      homeEnvironment: String(normalized.socialHistory?.homeEnvironment || '').trim(),
    },
    medicationHistory: normalized.medicationHistory && typeof normalized.medicationHistory === 'object' ? normalized.medicationHistory : {},
    vteAssessment: {
      ...normalizedVteAssessment,
      status: vteNote ? VTE_COMPLETE_STATUS : VTE_NOT_DONE_STATUS,
      noteId: vteNote ? (normalizedVteAssessment.noteId || vteNote.id) : '',
      authoredAt: vteNote ? (normalizedVteAssessment.authoredAt || vteNote.authoredAt) : '',
      author: vteNote ? (normalizedVteAssessment.author || vteNote.author) : '',
      outcome: vteNote ? (normalizedVteAssessment.outcome || buildVteSummarySections(vteNote.sections).join('\n')) : '',
    },
    notes,
    tasks: Array.isArray(normalized.tasks) ? normalized.tasks : [],
  };
};

const getFieldValue = (caseNotes, fieldKey) => {
  if (fieldKey === 'presentingComplaint') return caseNotes.presentingComplaint;
  if (fieldKey === 'historyPresentingComplaint') return caseNotes.historyPresentingComplaint;
  if (fieldKey === 'functionalBaseline') return caseNotes.functionalBaseline;
  if (fieldKey === 'familyHistory') return caseNotes.familyHistory;
  if (fieldKey === 'socialHistory.alcohol') return caseNotes.socialHistory.alcohol;
  if (fieldKey === 'socialHistory.smoking') return caseNotes.socialHistory.smoking;
  if (fieldKey === 'socialHistory.recreationalDrugs') return caseNotes.socialHistory.recreationalDrugs;
  if (fieldKey === 'socialHistory.occupation') return caseNotes.socialHistory.occupation;
  if (fieldKey === 'socialHistory.homeEnvironment') return caseNotes.socialHistory.homeEnvironment;
  return '';
};

const setFieldValue = (caseNotes, fieldKey, nextValue) => {
  const nextCaseNotes = { ...caseNotes, socialHistory: { ...(caseNotes.socialHistory || {}) } };
  if (fieldKey === 'presentingComplaint') nextCaseNotes.presentingComplaint = nextValue;
  if (fieldKey === 'historyPresentingComplaint') nextCaseNotes.historyPresentingComplaint = nextValue;
  if (fieldKey === 'functionalBaseline') nextCaseNotes.functionalBaseline = nextValue;
  if (fieldKey === 'familyHistory') nextCaseNotes.familyHistory = nextValue;
  if (fieldKey === 'socialHistory.alcohol') nextCaseNotes.socialHistory.alcohol = nextValue;
  if (fieldKey === 'socialHistory.smoking') nextCaseNotes.socialHistory.smoking = nextValue;
  if (fieldKey === 'socialHistory.recreationalDrugs') nextCaseNotes.socialHistory.recreationalDrugs = nextValue;
  if (fieldKey === 'socialHistory.occupation') nextCaseNotes.socialHistory.occupation = nextValue;
  if (fieldKey === 'socialHistory.homeEnvironment') nextCaseNotes.socialHistory.homeEnvironment = nextValue;
  return nextCaseNotes;
};

const formatHistoryValue = (value) => {
  if (Array.isArray(value)) return value.length ? value.map((item) => `${item.text || 'Unspecified'}${item.code ? ` (${item.code})` : ''}`).join(', ') : 'No entries recorded';
  if (value && typeof value === 'object') {
    if (value.noteType || value.content || value.sections) {
      const label = NOTE_TEMPLATES[value.noteType]?.label || 'Clinical note';
      const body = String(value.content || '').trim() || (Array.isArray(value.sections) ? value.sections.map((section) => section.value).find(Boolean) : '') || '';
      return [label, value.title, body].filter(Boolean).join(' - ') || 'Clinical note updated';
    }
    if (value.title || value.linkedDrug || value.assignedProfession) {
      return [
        value.title,
        value.linkedDrug ? `Linked to ${value.linkedDrug}` : '',
        value.assignedProfession ? `For ${value.assignedProfession}` : '',
        value.status || '',
        value.suppressionReason ? `Reason: ${value.suppressionReason}` : '',
      ].filter(Boolean).join(' - ');
    }
    return Object.entries(value)
      .filter(([, itemValue]) => String(itemValue || '').trim())
      .map(([key, itemValue]) => `${key}: ${itemValue}`)
      .join(', ') || 'Updated';
  }
  return String(value || '').trim() || 'No entry recorded';
};

const renderClickableValue = (content, onClick) => (
  <div role="button" tabIndex={0} className="text-start" onClick={onClick} onKeyDown={(event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onClick(); }
  }}>
    {content}
  </div>
);

const renderNoteBody = (note) => {
  if (note.noteType === 'freeText') return note.content ? <div style={{ whiteSpace: 'pre-wrap' }}>{note.content}</div> : <span className="text-muted">No content recorded.</span>;
  if (note.noteType === 'vteAssessment') {
    const mobility = getSectionValue(note.sections, 'mobility');
    const plan = getSectionValue(note.sections, 'plan');
    return (
      <div className="vte-assessment-summary">
        <div className="mb-2"><span className="fw-semibold">Mobility:</span> {mobility || 'Not recorded'}</div>
        <div className="row g-3">
          {VTE_RISK_GROUPS.map((group) => {
            const selected = getSelectedVteFactors(note.sections, group.key);
            return (
              <div key={group.key} className="col-md-6">
                <div className="fw-semibold">{group.title}</div>
                {selected.length ? (
                  <ul className="mb-0 ps-3">
                    {selected.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                ) : <div className="text-muted">None selected</div>}
              </div>
            );
          })}
        </div>
        {plan ? <div className="mt-3"><div className="fw-semibold">Plan / rationale</div><div style={{ whiteSpace: 'pre-wrap' }}>{plan}</div></div> : null}
      </div>
    );
  }
  const sections = (note.sections || []).filter((section) => section.value);
  if (!sections.length) return <span className="text-muted">No structured content recorded.</span>;
  return sections.map((section) => (
    <div key={section.key} className="mb-2">
      <div className="fw-semibold">{section.label}</div>
      <div style={{ whiteSpace: 'pre-wrap' }}>{section.value}</div>
    </div>
  ));
};

const CaseNotes = ({ case_notes, case_notes_history = [], commonConditions = [], onSaveCaseNotes, defaultAuthor = 'Student user', readOnly = false, launchTemplateRequest = null }) => {
  const [show, setShow] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editingField, setEditingField] = useState('');
  const [textDraft, setTextDraft] = useState('');
  const [pmhDraft, setPmhDraft] = useState([]);
  const [activeConditionIndex, setActiveConditionIndex] = useState(-1);
  const [savingField, setSavingField] = useState(false);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState('');
  const [noteDraft, setNoteDraft] = useState(createNoteDraft('freeText', defaultAuthor));
  const [historyFilter, setHistoryFilter] = useState({ noteId: '', mode: 'section', title: 'History section history' });
  const conditionInputRefs = useRef([]);
  const currentNotes = useMemo(() => normalizeCaseNotes(case_notes), [case_notes]);
  const historyEntries = useMemo(() => (Array.isArray(case_notes_history) ? case_notes_history : []), [case_notes_history]);
  const conditionOptions = Array.isArray(commonConditions) ? commonConditions : [];
  const noteTimeline = useMemo(() => [...(currentNotes.notes || [])].sort((left, right) => (parseNoteDateTime(right.authoredAt)?.getTime() || 0) - (parseNoteDateTime(left.authoredAt)?.getTime() || 0)), [currentNotes.notes]);
  const filteredHistoryEntries = useMemo(() => {
    const baseEntries = historyFilter.mode === 'clinicalNotes'
      ? historyEntries.filter((entry) => entry.fieldKey === 'clinicalNote')
      : historyEntries.filter((entry) => entry.fieldKey !== 'clinicalNote');
    return historyFilter.noteId ? baseEntries.filter((entry) => entry.noteId === historyFilter.noteId) : baseEntries;
  }, [historyEntries, historyFilter.mode, historyFilter.noteId]);

  useEffect(() => {
    if (!editingField) {
      setTextDraft('');
      setPmhDraft([]);
      setActiveConditionIndex(-1);
    }
  }, [editingField]);

  const startEditing = (fieldKey) => {
    setEditingField(fieldKey);
    if (fieldKey === 'pastMedicalSurgicalHistory') {
      setPmhDraft(currentNotes.pastMedicalSurgicalHistory.length ? currentNotes.pastMedicalSurgicalHistory : [{ text: '', code: '' }]);
      setActiveConditionIndex(-1);
      return;
    }
    setTextDraft(getFieldValue(currentNotes, fieldKey));
  };

  const cancelEditing = () => {
    setEditingField('');
    setTextDraft('');
    setPmhDraft([]);
    setActiveConditionIndex(-1);
  };

  const saveTextField = async (fieldKey, fieldLabel) => {
    if (!onSaveCaseNotes) return cancelEditing();
    setSavingField(true);
    try {
      await onSaveCaseNotes({ fieldKey, fieldLabel, caseNotes: setFieldValue(currentNotes, fieldKey, textDraft.trim()) });
      cancelEditing();
    } finally {
      setSavingField(false);
    }
  };

  const savePmhField = async () => {
    if (!onSaveCaseNotes) return cancelEditing();
    setSavingField(true);
    try {
      await onSaveCaseNotes({
        fieldKey: 'pastMedicalSurgicalHistory',
        fieldLabel: 'Past medical / surgical history',
        caseNotes: {
          ...currentNotes,
          pastMedicalSurgicalHistory: pmhDraft.map((item) => ({ text: String(item.text || '').trim(), code: String(item.code || '').trim() })).filter((item) => item.text),
        },
      });
      cancelEditing();
    } finally {
      setSavingField(false);
    }
  };

  const updateConditionDraft = (index, nextText) => {
    const matchedCondition = conditionOptions.find((item) => {
      const candidate = String(nextText || '').trim().toLowerCase();
      return candidate && (String(item.label || '').trim().toLowerCase() === candidate || String(item.icd10Code || '').trim().toLowerCase() === candidate);
    });
    setPmhDraft((current) => current.map((item, itemIndex) => (itemIndex !== index ? item : (matchedCondition ? { text: matchedCondition.label, code: matchedCondition.icd10Code || '' } : { text: nextText, code: '' }))));
  };

  const selectConditionSuggestion = (index, condition) => {
    setPmhDraft((current) => {
      const next = current.map((item, itemIndex) => (itemIndex === index ? { text: condition.label, code: condition.icd10Code || '' } : item));
      if (String(next[next.length - 1]?.text || '').trim()) next.push({ text: '', code: '' });
      return next;
    });
    const nextIndex = index + 1;
    setActiveConditionIndex(nextIndex);
    window.setTimeout(() => conditionInputRefs.current[nextIndex]?.focus(), 0);
  };

  const openSectionHistory = () => {
    setHistoryFilter({ noteId: '', mode: 'section', title: 'History section history' });
    setShowHistory(true);
  };

  const openClinicalNotesHistory = (noteId = '', title = 'Clinical notes history') => {
    setHistoryFilter({ noteId, mode: 'clinicalNotes', title });
    setShowHistory(true);
  };

  const openNewNoteEditor = () => {
    setEditingNoteId('');
    setNoteDraft(createNoteDraft('freeText', defaultAuthor));
    setShowNoteEditor(true);
  };

  const openEditNoteEditor = useCallback((note) => {
    setEditingNoteId(note.id);
    setNoteDraft(createNoteDraft(note.noteType, defaultAuthor, note));
    setShowNoteEditor(true);
  }, [defaultAuthor]);

  const openTemplateEditor = useCallback((templateKey) => {
    const templateNote = noteTimeline.find((item) => item.noteType === templateKey);
    if (templateNote) {
      openEditNoteEditor(templateNote);
      return;
    }
    setEditingNoteId('');
    setNoteDraft(createNoteDraft(templateKey, defaultAuthor));
    setShowNoteEditor(true);
  }, [defaultAuthor, noteTimeline, openEditNoteEditor]);

  const updateNoteDraft = (key, value) => setNoteDraft((current) => ({ ...current, [key]: value }));
  const updateTemplate = (templateKey) => setNoteDraft((current) => ({
    ...current,
    noteType: templateKey,
    title: templateKey === 'vteAssessment' && !String(current.title || '').trim() ? NOTE_TEMPLATES.vteAssessment.label : current.title,
    content: templateKey === 'freeText' ? current.content : '',
    sections: buildTemplateSections(templateKey),
    assessmentStatus: templateKey === 'vteAssessment' ? VTE_COMPLETE_STATUS : '',
  }));
  const updateDraftSection = (sectionKey, value) => setNoteDraft((current) => ({ ...current, sections: (current.sections || []).map((section) => (section.key === sectionKey ? { ...section, value } : section)) }));
  const updateVteFactor = (sectionKey, item, checked) => {
    setNoteDraft((current) => {
      const selected = new Set(getSelectedVteFactors(current.sections, sectionKey));
      if (checked) {
        selected.add(item);
      } else {
        selected.delete(item);
      }
      return {
        ...current,
        sections: (current.sections || []).map((section) => (
          section.key === sectionKey ? { ...section, value: JSON.stringify([...selected]) } : section
        )),
      };
    });
  };
  const noteHasBodyContent = (draft) => {
    if (draft.noteType === 'freeText') return Boolean(String(draft.content || '').trim());
    if (draft.noteType === 'vteAssessment') {
      return Boolean(getSectionValue(draft.sections, 'mobility'))
        || VTE_RISK_GROUPS.some((group) => getSelectedVteFactors(draft.sections, group.key).length)
        || Boolean(String(getSectionValue(draft.sections, 'plan') || '').trim());
    }
    return (draft.sections || []).some((section) => String(section.value || '').trim());
  };

  useEffect(() => {
    if (!launchTemplateRequest?.templateKey) {
      return;
    }
    setShow(true);
    openTemplateEditor(launchTemplateRequest.templateKey);
  }, [launchTemplateRequest, openTemplateEditor]);

  const saveClinicalNote = async () => {
    if (!onSaveCaseNotes) return setShowNoteEditor(false);
    const authoredAt = noteDraft.authoredDate && noteDraft.authoredTime ? new Date(`${noteDraft.authoredDate}T${noteDraft.authoredTime}`) : null;
    const fixedAuthor = String(defaultAuthor || noteDraft.author || '').trim();
    if (!authoredAt || Number.isNaN(authoredAt.getTime()) || !fixedAuthor || !noteHasBodyContent(noteDraft)) return;
    setSavingField(true);
    try {
      const existingNote = noteTimeline.find((item) => item.id === editingNoteId) || null;
      const nextNote = {
        id: editingNoteId || createNoteId(),
        noteType: noteDraft.noteType,
        title: String(noteDraft.title || (noteDraft.noteType === 'vteAssessment' ? NOTE_TEMPLATES.vteAssessment.label : '')).trim(),
        authoredAt: authoredAt.toISOString(),
        location: String(noteDraft.location || '').trim(),
        author: fixedAuthor,
        content: noteDraft.noteType === 'freeText' ? String(noteDraft.content || '').trim() : '',
        sections: noteDraft.noteType === 'freeText' ? [] : (noteDraft.sections || []).map((section) => ({ key: section.key, label: section.label, value: String(section.value || '').trim() })),
        assessmentStatus: noteDraft.noteType === 'vteAssessment' ? VTE_COMPLETE_STATUS : '',
        signed: false,
        locked: false,
      };
      const nextNotes = editingNoteId ? currentNotes.notes.map((item) => (item.id === editingNoteId ? nextNote : item)) : [nextNote, ...currentNotes.notes];
      const nextCaseNotes = { ...currentNotes, notes: nextNotes };
      if (nextNote.noteType === 'vteAssessment') {
        nextCaseNotes.vteAssessment = {
          status: VTE_COMPLETE_STATUS,
          noteId: nextNote.id,
          authoredAt: nextNote.authoredAt,
          author: nextNote.author,
          outcome: buildVteSummarySections(nextNote.sections).join('\n'),
        };
      }
      await onSaveCaseNotes({
        fieldKey: 'clinicalNote',
        fieldLabel: editingNoteId ? 'Updated clinical note' : 'Added clinical note',
        noteId: nextNote.id,
        previousValue: existingNote,
        nextValue: nextNote,
        caseNotes: nextCaseNotes,
        successMessage: editingNoteId ? 'Clinical note updated.' : 'Clinical note added.',
      });
      setShowNoteEditor(false);
      setEditingNoteId('');
      setNoteDraft(createNoteDraft('freeText', defaultAuthor));
    } finally {
      setSavingField(false);
    }
  };

  const socialHistory = currentNotes.socialHistory || {};
  const activeTemplate = NOTE_TEMPLATES[noteDraft.noteType] || NOTE_TEMPLATES.freeText;
  const overlayRoot = typeof document !== 'undefined' ? document.body : null;
  return (
    <>
      <td onClick={() => setShow(true)}>
        <Icon logo="bi bi-collection" title_text="Clinical Notes" />
      </td>
      {overlayRoot ? createPortal(
      <>
      <Offcanvas show={show} onHide={() => setShow(false)} style={{ width: '90%' }}>
        <Offcanvas.Header closeButton className="blue-back text-white">
          <Offcanvas.Title>Clinical Notes</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Container>
            <Table className="tbl-notes container-shadow">
              <thead>
                <tr className="blue-back text-white">
                  <th colSpan={2}>
                    <div className="d-flex justify-content-between align-items-center gap-3">
                      <h4 className="mb-0">History</h4>
                      <Button type="button" size="sm" variant="light" onClick={openSectionHistory}>History</Button>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr><th>Presenting complaint</th><td>{editingField === 'presentingComplaint' ? (<><Form.Control as="textarea" rows={2} value={textDraft} onChange={(event) => setTextDraft(event.target.value)} /><div className="d-flex gap-2 mt-2"><Button type="button" size="sm" onClick={() => saveTextField('presentingComplaint', 'Presenting complaint')} disabled={savingField}>Save</Button><Button type="button" size="sm" variant="outline-secondary" onClick={cancelEditing} disabled={savingField}>Cancel</Button></div></>) : (readOnly ? (currentNotes.presentingComplaint || <span className="text-muted">No presenting complaint recorded.</span>) : renderClickableValue(currentNotes.presentingComplaint || <span className="text-muted">Click to add presenting complaint</span>, () => startEditing('presentingComplaint')))}</td></tr>
                <tr><th>History of presenting complaint</th><td>{editingField === 'historyPresentingComplaint' ? (<><Form.Control as="textarea" rows={4} value={textDraft} onChange={(event) => setTextDraft(event.target.value)} /><div className="d-flex gap-2 mt-2"><Button type="button" size="sm" onClick={() => saveTextField('historyPresentingComplaint', 'History of presenting complaint')} disabled={savingField}>Save</Button><Button type="button" size="sm" variant="outline-secondary" onClick={cancelEditing} disabled={savingField}>Cancel</Button></div></>) : (readOnly ? (currentNotes.historyPresentingComplaint || <span className="text-muted">No history recorded.</span>) : renderClickableValue(currentNotes.historyPresentingComplaint || <span className="text-muted">Click to add history of presenting complaint</span>, () => startEditing('historyPresentingComplaint')))}</td></tr>
                <tr>
                  <th>Past medical / surgical history</th>
                  <td>
                    {editingField === 'pastMedicalSurgicalHistory' ? (
                      <>
                        {pmhDraft.map((item, index) => (
                          <div key={`condition-${index}`} className="d-flex gap-2 align-items-start mb-2">
                            <div className="flex-grow-1">
                              <Form.Control ref={(element) => { conditionInputRefs.current[index] = element; }} value={item.text} onChange={(event) => { updateConditionDraft(index, event.target.value); setActiveConditionIndex(index); }} onFocus={() => setActiveConditionIndex(index)} onBlur={() => { window.setTimeout(() => setActiveConditionIndex((current) => (current === index ? -1 : current)), 150); }} placeholder="Start typing a condition" autoComplete="off" />
                              {item.code ? <div className="small text-muted mt-1">ICD-10: {item.code}</div> : null}
                              {activeConditionIndex === index && String(item.text || '').trim().length >= 3 ? <div className="list-group mt-2">{conditionOptions.filter((option) => String(option.label || '').toLowerCase().includes(String(item.text || '').trim().toLowerCase())).slice(0, 8).map((option) => <button key={option.id || option.label} type="button" className="list-group-item list-group-item-action text-start" onMouseDown={(event) => { event.preventDefault(); selectConditionSuggestion(index, option); }}>{option.label}</button>)}</div> : null}
                            </div>
                            <Button type="button" size="sm" variant="outline-danger" onClick={() => setPmhDraft((current) => current.filter((_entry, itemIndex) => itemIndex !== index))}>Remove</Button>
                          </div>
                        ))}
                        <div className="d-flex gap-2 flex-wrap mt-2"><Button type="button" size="sm" variant="outline-secondary" onClick={() => setPmhDraft((current) => [...current, { text: '', code: '' }])}>Add condition</Button><Button type="button" size="sm" onClick={savePmhField} disabled={savingField}>Save</Button><Button type="button" size="sm" variant="outline-secondary" onClick={cancelEditing} disabled={savingField}>Cancel</Button></div>
                      </>
                    ) : (readOnly ? (currentNotes.pastMedicalSurgicalHistory.length ? <ul className="mb-0 ps-3">{currentNotes.pastMedicalSurgicalHistory.map((item, index) => <li key={`${item.text}-${index}`}>{item.text}</li>)}</ul> : <span className="text-muted">No past medical / surgical history recorded.</span>) : renderClickableValue(currentNotes.pastMedicalSurgicalHistory.length ? <ul className="mb-0 ps-3">{currentNotes.pastMedicalSurgicalHistory.map((item, index) => <li key={`${item.text}-${index}`}>{item.text}</li>)}</ul> : <span className="text-muted">Click to add past medical / surgical history</span>, () => startEditing('pastMedicalSurgicalHistory')))}
                  </td>
                </tr>
                <tr><th>Functional baseline</th><td>{editingField === 'functionalBaseline' ? (<><Form.Control as="textarea" rows={3} value={textDraft} onChange={(event) => setTextDraft(event.target.value)} /><div className="d-flex gap-2 mt-2"><Button type="button" size="sm" onClick={() => saveTextField('functionalBaseline', 'Functional baseline')} disabled={savingField}>Save</Button><Button type="button" size="sm" variant="outline-secondary" onClick={cancelEditing} disabled={savingField}>Cancel</Button></div></>) : (readOnly ? (currentNotes.functionalBaseline || <span className="text-muted">No functional baseline recorded.</span>) : renderClickableValue(currentNotes.functionalBaseline || <span className="text-muted">Click to add functional baseline</span>, () => startEditing('functionalBaseline')))}</td></tr>
                <tr><th>Family history</th><td>{editingField === 'familyHistory' ? (<><Form.Control as="textarea" rows={3} value={textDraft} onChange={(event) => setTextDraft(event.target.value)} /><div className="d-flex gap-2 mt-2"><Button type="button" size="sm" onClick={() => saveTextField('familyHistory', 'Family history')} disabled={savingField}>Save</Button><Button type="button" size="sm" variant="outline-secondary" onClick={cancelEditing} disabled={savingField}>Cancel</Button></div></>) : (readOnly ? (currentNotes.familyHistory || <span className="text-muted">No family history recorded.</span>) : renderClickableValue(currentNotes.familyHistory || <span className="text-muted">Click to add family history</span>, () => startEditing('familyHistory')))}</td></tr>
                <tr><th>Social history</th><td><Table className="mb-0"><tbody>{[['socialHistory.alcohol', 'Alcohol', socialHistory.alcohol], ['socialHistory.smoking', 'Smoking history', socialHistory.smoking], ['socialHistory.recreationalDrugs', 'Recreational drugs', socialHistory.recreationalDrugs], ['socialHistory.occupation', 'Occupation', socialHistory.occupation], ['socialHistory.homeEnvironment', 'Home environment', socialHistory.homeEnvironment]].map(([fieldKey, label, value]) => <tr key={fieldKey}><th>{label}</th><td>{editingField === fieldKey ? (<><Form.Control as="textarea" rows={2} value={textDraft} onChange={(event) => setTextDraft(event.target.value)} /><div className="d-flex gap-2 mt-2"><Button type="button" size="sm" onClick={() => saveTextField(fieldKey, label)} disabled={savingField}>Save</Button><Button type="button" size="sm" variant="outline-secondary" onClick={cancelEditing} disabled={savingField}>Cancel</Button></div></>) : (readOnly ? (value || <span className="text-muted">No information recorded.</span>) : renderClickableValue(value || <span className="text-muted">Click to add {String(label).toLowerCase()}</span>, () => startEditing(fieldKey)))}</td></tr>)}</tbody></Table></td></tr>
              </tbody>
            </Table>
          </Container>
          <Container className="mt-4">
            <Table className="tbl-notes container-shadow">
              <thead>
                <tr className="blue-back text-white">
                  <th colSpan={3}><div className="d-flex justify-content-between align-items-center gap-3 flex-wrap"><h4 className="mb-0">Clinical notes</h4><div className="d-flex gap-2 flex-wrap"><Button type="button" size="sm" variant="light" onClick={() => openClinicalNotesHistory()}>History</Button>{!readOnly ? <Button type="button" size="sm" variant="light" onClick={openNewNoteEditor}><i className="bi bi-plus-circle me-1" aria-hidden="true" />New clinical note</Button> : null}</div></div></th>
                </tr>
                <tr><th>Date / time</th><th>Location</th><th>Author</th></tr>
              </thead>
              <tbody>
                {noteTimeline.length ? noteTimeline.map((item) => (
                  <React.Fragment key={item.id}>
                    <tr className="lightblue-back"><th colSpan={3}><div className="d-flex justify-content-between align-items-center gap-3 flex-wrap"><div className="d-flex align-items-center gap-2 flex-wrap"><span className="fw-semibold">{NOTE_TEMPLATES[item.noteType]?.label || 'Clinical note'}</span>{item.title ? <span>{item.title}</span> : null}</div><div className="d-flex gap-2">{!readOnly ? <Button type="button" size="sm" variant="outline-primary" onClick={() => openEditNoteEditor(item)}>Edit</Button> : null}<Button type="button" size="sm" variant="outline-secondary" onClick={() => openClinicalNotesHistory(item.id, `${item.title || NOTE_TEMPLATES[item.noteType]?.label || 'Clinical note'} history`)}>History</Button></div></div></th></tr>
                    <tr><td>{formatNoteDateTime(item.authoredAt)}</td><td>{item.location || 'Not recorded'}</td><td>{item.author || 'Not recorded'}</td></tr>
                    <tr><td colSpan={3}>{renderNoteBody(item)}</td></tr>
                  </React.Fragment>
                )) : <tr><td colSpan={3} className="text-center text-muted">No clinical notes recorded yet.</td></tr>}
              </tbody>
            </Table>
          </Container>
        </Offcanvas.Body>
      </Offcanvas>
      <Modal show={showNoteEditor} onHide={() => setShowNoteEditor(false)} size="lg">
        <Modal.Header closeButton><Modal.Title>{editingNoteId ? 'Edit clinical note' : 'New clinical note'}</Modal.Title></Modal.Header>
        <Modal.Body>
          <Table responsive bordered size="sm" className="mb-4">
            <tbody>
              <tr><th style={{ width: '25%' }}>Note type</th><td><Form.Select value={noteDraft.noteType} onChange={(event) => updateTemplate(event.target.value)}>{Object.entries(NOTE_TEMPLATES).map(([key, template]) => <option key={key} value={key}>{template.label}</option>)}</Form.Select></td></tr>
              <tr><th>Title</th><td><Form.Control value={noteDraft.title} onChange={(event) => updateNoteDraft('title', event.target.value)} placeholder="Optional note title" /></td></tr>
              <tr><th>Date / time</th><td><div className="d-flex gap-2 flex-wrap"><Form.Control type="date" value={noteDraft.authoredDate} onChange={(event) => updateNoteDraft('authoredDate', event.target.value)} /><Form.Control type="time" value={noteDraft.authoredTime} onChange={(event) => updateNoteDraft('authoredTime', event.target.value)} /></div></td></tr>
              <tr><th>Location</th><td><Form.Control value={noteDraft.location} onChange={(event) => updateNoteDraft('location', event.target.value)} placeholder="Ward, clinic, phone referral, MDT, etc." /></td></tr>
              <tr><th>Author</th><td><div className="form-control-plaintext fw-semibold">{String(defaultAuthor || noteDraft.author || '').trim() || 'Not recorded'}</div></td></tr>
            </tbody>
          </Table>
          <div className="mb-3">
            <div className="fw-semibold mb-2">{activeTemplate.label}</div>
            {noteDraft.noteType === 'freeText'
              ? <Form.Control as="textarea" rows={8} value={noteDraft.content} onChange={(event) => updateNoteDraft('content', event.target.value)} placeholder="Enter clinical note content" />
              : noteDraft.noteType === 'vteAssessment' ? (
                <div className="d-grid gap-3">
                  <Form.Group>
                    <Form.Label>Mobility</Form.Label>
                    <div className="d-grid gap-2">
                      {VTE_MOBILITY_OPTIONS.map((option) => (
                        <Form.Check
                          key={option}
                          type="radio"
                          id={`vte-mobility-${option}`}
                          name="vteMobility"
                          label={option}
                          checked={getSectionValue(noteDraft.sections, 'mobility') === option}
                          onChange={() => updateDraftSection('mobility', option)}
                        />
                      ))}
                    </div>
                  </Form.Group>
                  <div className="row g-3">
                    {VTE_RISK_GROUPS.map((group) => {
                      const selected = getSelectedVteFactors(noteDraft.sections, group.key);
                      return (
                        <div key={group.key} className="col-md-6">
                          <div className="fw-semibold mb-2">{group.title}</div>
                          <div className="d-grid gap-2">
                            {group.items.map((item) => (
                              <Form.Check
                                key={item}
                                type="checkbox"
                                id={`${group.key}-${item}`}
                                label={item}
                                checked={selected.includes(item)}
                                onChange={(event) => updateVteFactor(group.key, item, event.target.checked)}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <Form.Group>
                    <Form.Label>Plan / rationale</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={getSectionValue(noteDraft.sections, 'plan')}
                      onChange={(event) => updateDraftSection('plan', event.target.value)}
                    />
                  </Form.Group>
                </div>
              ) : <div className="d-grid gap-3">{(noteDraft.sections || []).map((section) => <Form.Group key={section.key}><Form.Label>{section.label}</Form.Label><Form.Control as="textarea" rows={3} value={section.value} onChange={(event) => updateDraftSection(section.key, event.target.value)} /></Form.Group>)}</div>}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="outline-secondary" onClick={() => setShowNoteEditor(false)}>Cancel</Button>
          <Button type="button" onClick={saveClinicalNote} disabled={savingField || !noteDraft.authoredDate || !noteDraft.authoredTime || !String(defaultAuthor || noteDraft.author || '').trim() || !noteHasBodyContent(noteDraft)}>Save note</Button>
        </Modal.Footer>
      </Modal>
      <Modal show={showHistory} onHide={() => setShowHistory(false)} size="xl">
        <Modal.Header closeButton><Modal.Title>{historyFilter.title}</Modal.Title></Modal.Header>
        <Modal.Body>
          <Table responsive bordered size="sm">
            <thead><tr><th>Timestamp</th><th>Field</th><th>Previous value</th><th>New value</th><th>Username</th></tr></thead>
            <tbody>
              {filteredHistoryEntries.length ? filteredHistoryEntries.slice().reverse().map((entry, index) => <tr key={`${entry.timestamp}-${index}`}><td>{new Date(entry.timestamp).toLocaleString('en-GB')}</td><td>{entry.fieldLabel || entry.fieldKey || 'Case notes'}</td><td>{formatHistoryValue(entry.previousValue)}</td><td>{formatHistoryValue(entry.nextValue)}</td><td>{entry.actor || 'Unknown user'}</td></tr>) : <tr><td colSpan={5} className="text-center text-muted">No case notes history recorded yet.</td></tr>}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>
      </>,
      overlayRoot
      ) : null}
    </>
  );
};

export default CaseNotes;
