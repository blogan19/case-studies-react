import React, { useEffect, useMemo, useRef, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Table from 'react-bootstrap/Table';
import Icon from './Patient_record_icon';
import MedicationHistory from './Medication_history';

const normalizeCaseNotes = (caseNotes = {}) => {
  const normalized = caseNotes && typeof caseNotes === 'object' ? caseNotes : {};
  const pastMedicalSurgicalHistory = Array.isArray(normalized.pastMedicalSurgicalHistory)
    ? normalized.pastMedicalSurgicalHistory
      .map((item) => {
        if (typeof item === 'string') {
          return { text: item.trim(), code: '' };
        }
        return {
          text: String(item?.text || item?.label || '').trim(),
          code: String(item?.code || item?.icd10Code || '').trim(),
        };
      })
      .filter((item) => item.text)
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
    medicationHistory: normalized.medicationHistory && typeof normalized.medicationHistory === 'object'
      ? normalized.medicationHistory
      : {},
    notes: Array.isArray(normalized.notes) ? normalized.notes : [],
  };
};

const getFieldValue = (caseNotes, fieldKey) => {
  switch (fieldKey) {
    case 'presentingComplaint':
      return caseNotes.presentingComplaint;
    case 'historyPresentingComplaint':
      return caseNotes.historyPresentingComplaint;
    case 'functionalBaseline':
      return caseNotes.functionalBaseline;
    case 'familyHistory':
      return caseNotes.familyHistory;
    case 'socialHistory.alcohol':
      return caseNotes.socialHistory.alcohol;
    case 'socialHistory.smoking':
      return caseNotes.socialHistory.smoking;
    case 'socialHistory.recreationalDrugs':
      return caseNotes.socialHistory.recreationalDrugs;
    case 'socialHistory.occupation':
      return caseNotes.socialHistory.occupation;
    case 'socialHistory.homeEnvironment':
      return caseNotes.socialHistory.homeEnvironment;
    default:
      return '';
  }
};

const setFieldValue = (caseNotes, fieldKey, nextValue) => {
  const nextCaseNotes = {
    ...caseNotes,
    socialHistory: {
      ...(caseNotes.socialHistory || {}),
    },
  };

  switch (fieldKey) {
    case 'presentingComplaint':
      nextCaseNotes.presentingComplaint = nextValue;
      break;
    case 'historyPresentingComplaint':
      nextCaseNotes.historyPresentingComplaint = nextValue;
      break;
    case 'functionalBaseline':
      nextCaseNotes.functionalBaseline = nextValue;
      break;
    case 'familyHistory':
      nextCaseNotes.familyHistory = nextValue;
      break;
    case 'socialHistory.alcohol':
      nextCaseNotes.socialHistory.alcohol = nextValue;
      break;
    case 'socialHistory.smoking':
      nextCaseNotes.socialHistory.smoking = nextValue;
      break;
    case 'socialHistory.recreationalDrugs':
      nextCaseNotes.socialHistory.recreationalDrugs = nextValue;
      break;
    case 'socialHistory.occupation':
      nextCaseNotes.socialHistory.occupation = nextValue;
      break;
    case 'socialHistory.homeEnvironment':
      nextCaseNotes.socialHistory.homeEnvironment = nextValue;
      break;
    default:
      break;
  }

  return nextCaseNotes;
};

const formatHistoryValue = (value) => {
  if (Array.isArray(value)) {
    return value.length
      ? value.map((item) => `${item.text || 'Unspecified'}${item.code ? ` (${item.code})` : ''}`).join(', ')
      : 'No entries recorded';
  }

  return String(value || '').trim() || 'No entry recorded';
};

const renderClickableValue = (content, onClick) => (
  <div
    role="button"
    tabIndex={0}
    className="text-start"
    onClick={onClick}
    onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick();
      }
    }}
  >
    {content}
  </div>
);

const CaseNotes = ({ case_notes, case_notes_history = [], commonConditions = [], drugLibrary, onSaveCaseNotes }) => {
  const [show, setShow] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMedicationHistory, setShowMedicationHistory] = useState(false);
  const [editingField, setEditingField] = useState('');
  const [textDraft, setTextDraft] = useState('');
  const [pmhDraft, setPmhDraft] = useState([]);
  const [activeConditionIndex, setActiveConditionIndex] = useState(-1);
  const [savingField, setSavingField] = useState(false);
  const conditionInputRefs = useRef([]);
  const currentNotes = useMemo(() => normalizeCaseNotes(case_notes), [case_notes]);
  const historyEntries = Array.isArray(case_notes_history) ? case_notes_history : [];
  const conditionOptions = Array.isArray(commonConditions) ? commonConditions : [];

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
    if (!onSaveCaseNotes) {
      cancelEditing();
      return;
    }

    setSavingField(true);
    try {
      const nextCaseNotes = setFieldValue(currentNotes, fieldKey, textDraft.trim());
      await onSaveCaseNotes({
        fieldKey,
        fieldLabel,
        caseNotes: nextCaseNotes,
      });
      cancelEditing();
    } finally {
      setSavingField(false);
    }
  };

  const savePmhField = async () => {
    if (!onSaveCaseNotes) {
      cancelEditing();
      return;
    }

    setSavingField(true);
    try {
      const nextCaseNotes = {
        ...currentNotes,
        pastMedicalSurgicalHistory: pmhDraft
          .map((item) => ({
            text: String(item.text || '').trim(),
            code: String(item.code || '').trim(),
          }))
          .filter((item) => item.text),
      };
      await onSaveCaseNotes({
        fieldKey: 'pastMedicalSurgicalHistory',
        fieldLabel: 'Past medical / surgical history',
        caseNotes: nextCaseNotes,
      });
      cancelEditing();
    } finally {
      setSavingField(false);
    }
  };

  const updateConditionDraft = (index, nextText) => {
    const matchedCondition = conditionOptions.find((item) => {
      const candidate = String(nextText || '').trim().toLowerCase();
      return candidate && (
        String(item.label || '').trim().toLowerCase() === candidate ||
        String(item.icd10Code || '').trim().toLowerCase() === candidate
      );
    });

    setPmhDraft((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) {
        return item;
      }

      return matchedCondition
        ? { text: matchedCondition.label, code: matchedCondition.icd10Code || '' }
        : { text: nextText, code: '' };
    }));
  };

  const selectConditionSuggestion = (index, condition) => {
    setPmhDraft((current) => {
      const next = current.map((item, itemIndex) => (
        itemIndex === index
          ? { text: condition.label, code: condition.icd10Code || '' }
          : item
      ));
      const lastItem = next[next.length - 1];
      if (lastItem && String(lastItem.text || '').trim()) {
        next.push({ text: '', code: '' });
      }
      return next;
    });
    const nextIndex = index + 1;
    setActiveConditionIndex(nextIndex);
    window.setTimeout(() => {
      conditionInputRefs.current[nextIndex]?.focus();
    }, 0);
  };

  const socialHistory = currentNotes.socialHistory || {};
  const noteTimeline = Array.isArray(currentNotes.notes) ? currentNotes.notes : [];

  return (
    <>
      <td onClick={() => setShow(true)}>
        <Icon logo="bi bi-collection" title_text="Clinical Notes" />
      </td>
      <Offcanvas show={show} onHide={() => setShow(false)} style={{ width: '100%' }}>
        <Offcanvas.Header closeButton className="blue-back text-white">
          <Offcanvas.Title>Case Notes</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Container>
            <Table className="tbl-notes container-shadow">
              <thead>
                <tr className="blue-back text-white">
                  <th colSpan={2}>
                    <div className="d-flex justify-content-between align-items-center gap-3">
                      <h4 className="mb-0">History</h4>
                      <Button type="button" size="sm" variant="light" onClick={() => setShowHistory(true)}>
                        History
                      </Button>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>Presenting complaint</th>
                  <td>
                    {editingField === 'presentingComplaint' ? (
                      <>
                        <Form.Control as="textarea" rows={2} value={textDraft} onChange={(event) => setTextDraft(event.target.value)} />
                        <div className="d-flex gap-2 mt-2">
                          <Button type="button" size="sm" onClick={() => saveTextField('presentingComplaint', 'Presenting complaint')} disabled={savingField}>Save</Button>
                          <Button type="button" size="sm" variant="outline-secondary" onClick={cancelEditing} disabled={savingField}>Cancel</Button>
                        </div>
                      </>
                    ) : renderClickableValue(currentNotes.presentingComplaint || <span className="text-muted">Click to add presenting complaint</span>, () => startEditing('presentingComplaint'))}
                  </td>
                </tr>
                <tr>
                  <th>History of presenting complaint</th>
                  <td>
                    {editingField === 'historyPresentingComplaint' ? (
                      <>
                        <Form.Control as="textarea" rows={4} value={textDraft} onChange={(event) => setTextDraft(event.target.value)} />
                        <div className="d-flex gap-2 mt-2">
                          <Button type="button" size="sm" onClick={() => saveTextField('historyPresentingComplaint', 'History of presenting complaint')} disabled={savingField}>Save</Button>
                          <Button type="button" size="sm" variant="outline-secondary" onClick={cancelEditing} disabled={savingField}>Cancel</Button>
                        </div>
                      </>
                    ) : renderClickableValue(currentNotes.historyPresentingComplaint || <span className="text-muted">Click to add history of presenting complaint</span>, () => startEditing('historyPresentingComplaint'))}
                  </td>
                </tr>
                <tr>
                  <th>Past medical / surgical history</th>
                  <td>
                    {editingField === 'pastMedicalSurgicalHistory' ? (
                      <>
                        {pmhDraft.map((item, index) => (
                          <div key={`condition-${index}`} className="d-flex gap-2 align-items-start mb-2">
                            <div className="flex-grow-1">
                              <Form.Control
                                type="text"
                                ref={(element) => {
                                  conditionInputRefs.current[index] = element;
                                }}
                                value={item.text}
                                onChange={(event) => {
                                  updateConditionDraft(index, event.target.value);
                                  setActiveConditionIndex(index);
                                }}
                                onFocus={() => setActiveConditionIndex(index)}
                                onBlur={() => {
                                  window.setTimeout(() => setActiveConditionIndex((current) => (current === index ? -1 : current)), 150);
                                }}
                                placeholder="Start typing a condition"
                                autoComplete="off"
                              />
                              {item.code ? <div className="small text-muted mt-1">ICD-10: {item.code}</div> : null}
                              {activeConditionIndex === index && String(item.text || '').trim().length >= 3 ? (
                                <div className="list-group mt-2">
                                  {conditionOptions
                                    .filter((option) => String(option.label || '').toLowerCase().includes(String(item.text || '').trim().toLowerCase()))
                                    .slice(0, 8)
                                    .map((option) => (
                                      <button
                                        key={option.id || option.label}
                                        type="button"
                                        className="list-group-item list-group-item-action text-start"
                                        onMouseDown={(event) => {
                                          event.preventDefault();
                                          selectConditionSuggestion(index, option);
                                        }}
                                      >
                                        {option.label}
                                        {option.icd10Code ? <span className="text-muted"> ({option.icd10Code})</span> : null}
                                      </button>
                                    ))}
                                </div>
                              ) : null}
                            </div>
                            <Button type="button" size="sm" variant="outline-danger" onClick={() => setPmhDraft((current) => current.filter((_entry, itemIndex) => itemIndex !== index))}>
                              Remove
                            </Button>
                          </div>
                        ))}
                        <div className="d-flex gap-2 flex-wrap mt-2">
                          <Button type="button" size="sm" variant="outline-secondary" onClick={() => setPmhDraft((current) => [...current, { text: '', code: '' }])}>
                            Add condition
                          </Button>
                          <Button type="button" size="sm" onClick={savePmhField} disabled={savingField}>Save</Button>
                          <Button type="button" size="sm" variant="outline-secondary" onClick={cancelEditing} disabled={savingField}>Cancel</Button>
                        </div>
                      </>
                    ) : renderClickableValue(
                      currentNotes.pastMedicalSurgicalHistory.length ? (
                        <ul className="mb-0 ps-3">
                          {currentNotes.pastMedicalSurgicalHistory.map((item, index) => (
                            <li key={`${item.text}-${index}`}>
                              {item.text}
                            </li>
                          ))}
                        </ul>
                      ) : <span className="text-muted">Click to add past medical / surgical history</span>,
                      () => startEditing('pastMedicalSurgicalHistory')
                    )}
                  </td>
                </tr>
                <tr>
                  <th>Functional baseline</th>
                  <td>
                    {editingField === 'functionalBaseline' ? (
                      <>
                        <Form.Control as="textarea" rows={3} value={textDraft} onChange={(event) => setTextDraft(event.target.value)} />
                        <div className="d-flex gap-2 mt-2">
                          <Button type="button" size="sm" onClick={() => saveTextField('functionalBaseline', 'Functional baseline')} disabled={savingField}>Save</Button>
                          <Button type="button" size="sm" variant="outline-secondary" onClick={cancelEditing} disabled={savingField}>Cancel</Button>
                        </div>
                      </>
                    ) : renderClickableValue(currentNotes.functionalBaseline || <span className="text-muted">Click to add functional baseline</span>, () => startEditing('functionalBaseline'))}
                  </td>
                </tr>
                <tr>
                  <th>Family history</th>
                  <td>
                    {editingField === 'familyHistory' ? (
                      <>
                        <Form.Control as="textarea" rows={3} value={textDraft} onChange={(event) => setTextDraft(event.target.value)} />
                        <div className="d-flex gap-2 mt-2">
                          <Button type="button" size="sm" onClick={() => saveTextField('familyHistory', 'Family history')} disabled={savingField}>Save</Button>
                          <Button type="button" size="sm" variant="outline-secondary" onClick={cancelEditing} disabled={savingField}>Cancel</Button>
                        </div>
                      </>
                    ) : renderClickableValue(currentNotes.familyHistory || <span className="text-muted">Click to add family history</span>, () => startEditing('familyHistory'))}
                  </td>
                </tr>
                <tr>
                  <th>Social History</th>
                  <td>
                    <Table className="mb-0">
                      <tbody>
                        {[
                          ['socialHistory.alcohol', 'Alcohol', socialHistory.alcohol],
                          ['socialHistory.smoking', 'Smoking history', socialHistory.smoking],
                          ['socialHistory.recreationalDrugs', 'Recreational drugs', socialHistory.recreationalDrugs],
                          ['socialHistory.occupation', 'Occupation', socialHistory.occupation],
                          ['socialHistory.homeEnvironment', 'Home environment', socialHistory.homeEnvironment],
                        ].map(([fieldKey, label, value]) => (
                          <tr key={fieldKey}>
                            <th>{label}</th>
                            <td>
                              {editingField === fieldKey ? (
                                <>
                                  <Form.Control as="textarea" rows={2} value={textDraft} onChange={(event) => setTextDraft(event.target.value)} />
                                  <div className="d-flex gap-2 mt-2">
                                    <Button type="button" size="sm" onClick={() => saveTextField(fieldKey, label)} disabled={savingField}>Save</Button>
                                    <Button type="button" size="sm" variant="outline-secondary" onClick={cancelEditing} disabled={savingField}>Cancel</Button>
                                  </div>
                                </>
                              ) : renderClickableValue(value || <span className="text-muted">Click to add {String(label).toLowerCase()}</span>, () => startEditing(fieldKey))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </td>
                </tr>
              </tbody>
            </Table>
          </Container>

          <Container>
            <Table className="tbl-notes container-shadow">
              <thead>
                <tr className="blue-back text-white">
                  <th>
                    <div className="d-flex justify-content-between align-items-center gap-3">
                      <h4 className="mb-0">Medication history</h4>
                      <Button type="button" size="sm" variant="light" onClick={() => setShowMedicationHistory(true)}>
                        History
                      </Button>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th className="p-0">
                    <Container>
                      <MedicationHistory
                        medicationHistory={currentNotes.medicationHistory || {}}
                        caseNotesHistory={historyEntries}
                        drugLibrary={drugLibrary}
                        showHistoryModal={showMedicationHistory}
                        onOpenHistoryModal={() => setShowMedicationHistory(true)}
                        onCloseHistoryModal={() => setShowMedicationHistory(false)}
                        hideInlineHistoryButton
                        onSaveMedicationHistory={(nextMedicationHistory) => onSaveCaseNotes?.({
                          fieldKey: 'medicationHistory',
                          fieldLabel: 'Medication history',
                          successMessage: 'Medication history updated.',
                          caseNotes: {
                            ...currentNotes,
                            medicationHistory: nextMedicationHistory,
                          },
                        })}
                      />
                    </Container>
                  </th>
                </tr>
              </tbody>
            </Table>
          </Container>
                          
                        

          <Container>
            <Table className="tbl-notes container-shadow">
              <thead>
                <tr className="blue-back text-white"><th colSpan={4}><h4 className="mb-0">Case Notes</h4></th></tr>
                <tr><th>Date</th><th>Location</th><th>Author</th></tr>
              </thead>
              <tbody>
                {noteTimeline.length ? noteTimeline.map((item, index) => (
                  <React.Fragment key={`${item.note_date || 'note'}-${index}`}>
                    <tr className="lightblue-back">
                      <th>{item.note_date || 'Not recorded'}</th>
                      <th>{item.note_location || 'Not recorded'}</th>
                      <th>{item.note_author || 'Not recorded'}</th>
                    </tr>
                    <tr>
                      <td colSpan={3}>{item.note_content || 'No content recorded.'}</td>
                    </tr>
                  </React.Fragment>
                )) : (
                  <tr>
                    <td colSpan={3} className="text-center text-muted">No case notes recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </Table>
          </Container>
        </Offcanvas.Body>
      </Offcanvas>

      <Modal show={showHistory} onHide={() => setShowHistory(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Case notes history</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table responsive bordered size="sm">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Field</th>
                <th>Previous value</th>
                <th>New value</th>
                <th>Username</th>
              </tr>
            </thead>
            <tbody>
              {historyEntries.length ? historyEntries.slice().reverse().map((entry, index) => (
                <tr key={`${entry.timestamp}-${index}`}>
                  <td>{new Date(entry.timestamp).toLocaleString('en-GB')}</td>
                  <td>{entry.fieldLabel || entry.fieldKey || 'Case notes'}</td>
                  <td>{formatHistoryValue(entry.previousValue)}</td>
                  <td>{formatHistoryValue(entry.nextValue)}</td>
                  <td>{entry.actor || 'Unknown user'}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="text-center text-muted">No case notes history recorded yet.</td>
                </tr>
              )}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default CaseNotes;
