import React, { useEffect, useMemo, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Row from 'react-bootstrap/Row';

const emptyQuestion = {
  questionNumber: '',
  questionType: 'MultipleChoice',
  taskType: 'General',
  questionTitle: '',
  questionText: '',
  opt1: '',
  opt2: '',
  opt3: '',
  opt4: '',
  opt5: '',
  answer: '',
  answerKeywordsText: '',
  expectedDrug: '',
  expectedReaction: '',
  expectedRoute: '',
  expectedFrequency: '',
  expectedIndication: '',
  answerExplanation: '',
};

const questionTypeLabels = {
  MultipleChoice: 'Multiple choice',
  DrugChoice: 'Drug choice',
  Calculation: 'Calculation',
  MultipleAnswer: 'Multiple answer question',
  CarePlan: 'Reflection',
};

const getDrugName = (item) => String(item?.drugName || item?.drug_name || item?.name || item || '').trim();

const getDrugLibraryNames = (drugLibrary) => Array.from(new Set((drugLibrary?.items || [])
  .map(getDrugName)
  .filter(Boolean)))
  .sort((left, right) => left.localeCompare(right, 'en-GB', { sensitivity: 'base' }));

const mapPreviousQuestion = (question) => ({
  ...emptyQuestion,
  ...question,
  taskType: question.taskType || 'General',
  answer: Array.isArray(question.answerOptions) ? question.answerOptions.findIndex((item) => item === question.answer).toString() : '',
  answerKeywordsText: Array.isArray(question.answerKeywords)
    ? question.answerKeywords.join(', ')
    : Array.isArray(question.answer)
      ? question.answer.join(', ')
      : (question.questionType === 'Calculation' ? String(question.answer ?? '') : ''),
  expectedDrug: question.taskConfig?.drug || '',
  expectedReaction: question.taskConfig?.reaction || '',
  expectedRoute: question.taskConfig?.route || '',
  expectedFrequency: question.taskConfig?.frequency || '',
  expectedIndication: question.taskConfig?.indication || '',
  opt1: question.answerOptions?.[0] || '',
  opt2: question.answerOptions?.[1] || '',
  opt3: question.answerOptions?.[2] || '',
  opt4: question.answerOptions?.[3] || '',
  opt5: question.answerOptions?.[4] || '',
});

const getAnswerOptions = (question) => [question.opt1, question.opt2, question.opt3, question.opt4, question.opt5]
  .map((item) => item.trim())
  .filter(Boolean);

const getKeywordList = (question) => question.answerKeywordsText
  .split(',')
  .map((keyword) => keyword.trim())
  .filter(Boolean);

const getQuestionSummary = (question, index) => {
  if (question.questionTitle.trim()) {
    return question.questionTitle.trim();
  }

  if (question.questionText.trim()) {
    return question.questionText.trim();
  }

  return `Question ${index + 1}`;
};

const validateQuestion = (question, drugNameSet = new Set()) => {
  const issues = [];
  const answerOptions = getAnswerOptions(question);
  const keywords = getKeywordList(question);

  if (!question.questionTitle.trim()) {
    issues.push('Add a question title.');
  }

  if (!question.questionText.trim()) {
    issues.push('Add question text.');
  }

  if (question.questionType === 'MultipleChoice' || question.questionType === 'DrugChoice') {
    if (answerOptions.length < 2) {
      issues.push('Provide at least two answer options.');
    }

    if (question.answer === '' || !answerOptions[Number(question.answer)]) {
      issues.push('Choose the correct answer option.');
    }
  }

  if (question.questionType === 'DrugChoice') {
    if (drugNameSet.size === 0) {
      issues.push('The drug library must contain medicines before drug choice questions can be saved.');
    }

    if (answerOptions.some((option) => !drugNameSet.has(option))) {
      issues.push('Drug choice options must be selected from the drug library.');
    }
  }

  if (question.questionType === 'Calculation' && keywords.length === 0) {
    issues.push('Add the expected numeric answer.');
  }

  if (question.questionType === 'MultipleAnswer') {
    if (answerOptions.length === 0) {
      issues.push('Add at least one field label.');
    }

    if (keywords.length === 0) {
      issues.push('Add the expected answer values.');
    }
  }

  if (question.questionType === 'WorkthroughTask') {
    if (question.taskType === 'AddAllergy') {
      if (!question.expectedDrug.trim()) {
        issues.push('Add the expected allergy drug.');
      }

      if (!question.expectedReaction.trim()) {
        issues.push('Add the expected allergy reaction.');
      }
    }

    if (question.taskType === 'PrescribeMedication') {
      if (!question.expectedDrug.trim()) {
        issues.push('Add the expected drug.');
      }

      if (!question.expectedRoute.trim()) {
        issues.push('Add the expected route.');
      }

      if (!question.expectedFrequency.trim()) {
        issues.push('Add the expected frequency.');
      }
    }

    if (
      question.taskType !== 'AddAllergy'
      && question.taskType !== 'PrescribeMedication'
      && keywords.length === 0
    ) {
      issues.push('Add expected keywords or answers for this task.');
    }
  }

  return issues;
};

const buildQuestionPayload = (item, index) => {
  const answerOptions = getAnswerOptions(item);
  const answerKeywords = getKeywordList(item);

  if (item.questionType === 'WorkthroughTask') {
    const taskConfig = {
      drug: item.expectedDrug,
      reaction: item.expectedReaction,
      route: item.expectedRoute,
      frequency: item.expectedFrequency,
      indication: item.expectedIndication,
    };

    return {
      questionNumber: index + 1,
      questionType: item.questionType,
      taskType: item.taskType || 'General',
      questionTitle: item.questionTitle.trim(),
      questionText: item.questionText.trim(),
      answer: answerKeywords,
      answerKeywords,
      taskConfig,
      answerExplanation: item.answerExplanation.trim(),
    };
  }

  return {
    questionNumber: index + 1,
    questionType: item.questionType,
    questionTitle: item.questionTitle.trim(),
    questionText: item.questionText.trim(),
    answerOptions,
    answer: item.questionType === 'MultipleAnswer'
      ? answerKeywords
      : item.questionType === 'Calculation'
        ? Number(answerKeywords[0] || 0)
        : answerOptions[Number(item.answer)],
    optionsLabels: item.questionType === 'MultipleAnswer' ? answerOptions : undefined,
    answerExplanation: item.answerExplanation.trim(),
  };
};

const AddQuestions = ({ closeModal, setQuestions, previousResult, drugLibrary }) => {
  const [recordState, setRecordState] = useState([{ ...emptyQuestion }]);
  const [expandedQuestionIndex, setExpandedQuestionIndex] = useState(0);
  const [showValidation, setShowValidation] = useState(false);
  const [drugSearchByQuestion, setDrugSearchByQuestion] = useState({});
  const drugLibraryNames = useMemo(() => getDrugLibraryNames(drugLibrary), [drugLibrary]);
  const drugNameSet = useMemo(() => new Set(drugLibraryNames), [drugLibraryNames]);

  useEffect(() => {
    if (Array.isArray(previousResult) && previousResult.length > 0) {
      setRecordState(previousResult.map(mapPreviousQuestion));
      setExpandedQuestionIndex(0);
      return;
    }

    setRecordState([{ ...emptyQuestion }]);
    setExpandedQuestionIndex(0);
  }, [previousResult]);

  const validations = useMemo(
    () => recordState.map((question) => validateQuestion(question, drugNameSet)),
    [drugNameSet, recordState],
  );

  const invalidQuestions = validations
    .map((issues, index) => ({ index, issues }))
    .filter((item) => item.issues.length > 0);

  const addRecord = () => {
    setRecordState((current) => [...current, { ...emptyQuestion }]);
    setExpandedQuestionIndex(recordState.length);
  };

  const updateRecord = (index, name, value) => {
    setRecordState((current) => current.map((record, recordIndex) => {
      if (recordIndex !== index) {
        return record;
      }

      if (name === 'questionType') {
        return {
          ...emptyQuestion,
          ...record,
          questionType: value,
          taskType: value === 'WorkthroughTask' ? record.taskType || 'General' : 'General',
          answer: value === 'MultipleChoice' || value === 'DrugChoice' ? record.answer : '',
          answerKeywordsText: ['Calculation', 'MultipleAnswer', 'WorkthroughTask'].includes(value)
            ? record.answerKeywordsText
            : '',
          expectedDrug: value === 'WorkthroughTask' ? record.expectedDrug : '',
          expectedReaction: value === 'WorkthroughTask' ? record.expectedReaction : '',
          expectedRoute: value === 'WorkthroughTask' ? record.expectedRoute : '',
          expectedFrequency: value === 'WorkthroughTask' ? record.expectedFrequency : '',
          expectedIndication: value === 'WorkthroughTask' ? record.expectedIndication : '',
          opt1: ['MultipleChoice', 'DrugChoice', 'MultipleAnswer'].includes(value) ? record.opt1 : '',
          opt2: ['MultipleChoice', 'DrugChoice', 'MultipleAnswer'].includes(value) ? record.opt2 : '',
          opt3: ['MultipleChoice', 'DrugChoice', 'MultipleAnswer'].includes(value) ? record.opt3 : '',
          opt4: ['MultipleChoice', 'DrugChoice', 'MultipleAnswer'].includes(value) ? record.opt4 : '',
          opt5: ['MultipleChoice', 'DrugChoice', 'MultipleAnswer'].includes(value) ? record.opt5 : '',
        };
      }

      return { ...record, [name]: value };
    }));
  };

  const setDrugSearch = (index, value) => {
    setDrugSearchByQuestion((current) => ({ ...current, [index]: value }));
  };

  const addDrugOption = (index, drugName) => {
    const selectedDrugName = String(drugName || '').trim();
    if (!selectedDrugName || !drugNameSet.has(selectedDrugName)) {
      return;
    }

    setRecordState((current) => current.map((record, recordIndex) => {
      if (recordIndex !== index) {
        return record;
      }

      const currentOptions = getAnswerOptions(record);
      if (currentOptions.includes(selectedDrugName) || currentOptions.length >= 5) {
        return record;
      }

      const nextOptions = [...currentOptions, selectedDrugName];
      return {
        ...record,
        opt1: nextOptions[0] || '',
        opt2: nextOptions[1] || '',
        opt3: nextOptions[2] || '',
        opt4: nextOptions[3] || '',
        opt5: nextOptions[4] || '',
        answer: record.answer === '' && nextOptions.length === 1 ? '0' : record.answer,
      };
    }));
    setDrugSearch(index, '');
  };

  const removeDrugOption = (index, optionIndex) => {
    setRecordState((current) => current.map((record, recordIndex) => {
      if (recordIndex !== index) {
        return record;
      }

      const nextOptions = getAnswerOptions(record).filter((_option, currentOptionIndex) => currentOptionIndex !== optionIndex);
      const currentAnswerIndex = record.answer === '' ? -1 : Number(record.answer);
      const nextAnswer = (() => {
        if (currentAnswerIndex === optionIndex) {
          return '';
        }
        if (currentAnswerIndex > optionIndex) {
          return String(currentAnswerIndex - 1);
        }
        return record.answer;
      })();

      return {
        ...record,
        opt1: nextOptions[0] || '',
        opt2: nextOptions[1] || '',
        opt3: nextOptions[2] || '',
        opt4: nextOptions[3] || '',
        opt5: nextOptions[4] || '',
        answer: nextAnswer,
      };
    }));
  };

  const removeRecord = (index) => {
    setRecordState((current) => {
      if (current.length === 1) {
        setExpandedQuestionIndex(0);
        return [{ ...emptyQuestion }];
      }

      const next = current.filter((_item, recordIndex) => recordIndex !== index);
      setExpandedQuestionIndex((currentExpanded) => Math.max(0, Math.min(next.length - 1, currentExpanded === index ? index - 1 : currentExpanded)));
      return next;
    });
  };

  const duplicateRecord = (index) => {
    setRecordState((current) => {
      const source = current[index];
      const duplicate = { ...source };
      const next = [...current.slice(0, index + 1), duplicate, ...current.slice(index + 1)];
      setExpandedQuestionIndex(index + 1);
      return next;
    });
  };

  const moveRecord = (index, direction) => {
    setRecordState((current) => {
      const targetIndex = index + direction;

      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      setExpandedQuestionIndex(targetIndex);
      return next;
    });
  };

  const saveRecord = () => {
    if (invalidQuestions.length > 0) {
      setShowValidation(true);
      setExpandedQuestionIndex(invalidQuestions[0].index);
      return;
    }

    setQuestions(recordState.map((item, index) => buildQuestionPayload(item, index)));
  };

  return (
    <div className="question-editor">
      <div className="question-editor__summary container-shadow p-3 mb-3">
        <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
          <div>
            <h4 className="mb-1">Question set builder</h4>
            <p className="text-muted mb-0">
              Build, reorder, duplicate, and validate questions from one place before saving them back into the case study.
            </p>
          </div>
          <div className="d-flex gap-2 flex-wrap">
            <Button type="button" variant="primary" onClick={addRecord}>Add question</Button>
            <Button type="button" variant="success" onClick={saveRecord}>Save questions</Button>
          </div>
        </div>
        {showValidation && invalidQuestions.length > 0 ? (
          <Alert variant="danger" className="mt-3 mb-0">
            <strong>Some questions still need attention.</strong>
            <div className="mt-2">
              {invalidQuestions.map((item) => (
                <div key={`validation-${item.index}`}>
                  Question {item.index + 1}: {item.issues[0]}
                </div>
              ))}
            </div>
          </Alert>
        ) : null}
      </div>

      <div className="question-editor__nav container-shadow p-3 mb-3">
        <div className="question-editor__nav-list">
          {recordState.map((item, index) => {
            const issues = validations[index];
            const isExpanded = expandedQuestionIndex === index;
            return (
              <button
                key={`question-nav-${index}`}
                type="button"
                className={`question-editor__nav-item${isExpanded ? ' question-editor__nav-item--active' : ''}`}
                onClick={() => setExpandedQuestionIndex(index)}
              >
                <div className="d-flex justify-content-between align-items-start gap-2">
                  <div>
                    <div className="fw-semibold">Question {index + 1}</div>
                    <div className="small text-muted">{getQuestionSummary(item, index)}</div>
                  </div>
                  <Badge bg={issues.length ? 'warning' : 'success'} text={issues.length ? 'dark' : undefined}>
                    {issues.length ? 'Needs work' : 'Ready'}
                  </Badge>
                </div>
                <div className="mt-2 d-flex gap-2 flex-wrap align-items-center">
                  <Badge bg="primary">{questionTypeLabels[item.questionType] || item.questionType}</Badge>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {recordState.map((item, index) => {
        const answer = item.answer;
        const issues = validations[index];
        const isExpanded = expandedQuestionIndex === index;

        return (
          <div key={`question-${index}`} className="container-shadow mt-3 p-3">
            <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
              <div>
                <div className="d-flex gap-2 flex-wrap align-items-center mb-2">
                  <h3 className="mb-0">Question {index + 1}</h3>
                  <Badge bg="primary">{questionTypeLabels[item.questionType] || item.questionType}</Badge>
                  <Badge bg={issues.length ? 'warning' : 'success'} text={issues.length ? 'dark' : undefined}>
                    {issues.length ? `${issues.length} issue${issues.length === 1 ? '' : 's'}` : 'Ready'}
                  </Badge>
                </div>
                <div className="text-muted">{getQuestionSummary(item, index)}</div>
              </div>
              <div className="d-flex gap-2 flex-wrap">
                <Button type="button" variant="secondary" onClick={() => setExpandedQuestionIndex(isExpanded ? -1 : index)}>
                  {isExpanded ? 'Collapse' : 'Edit'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => moveRecord(index, -1)} disabled={index === 0}>
                  <i className="bi bi-arrow-up" />
                </Button>
                <Button type="button" variant="secondary" onClick={() => moveRecord(index, 1)} disabled={index === recordState.length - 1}>
                  <i className="bi bi-arrow-down" />
                </Button>
                <Button type="button" variant="secondary" onClick={() => duplicateRecord(index)}>
                  <i className="bi bi-copy" />
                </Button>
                <Button type="button" variant="danger" onClick={() => removeRecord(index)}>
                  <i className="bi bi-trash3" />
                </Button>
              </div>
            </div>

            {issues.length > 0 ? (
              <Alert variant="warning" className="mt-3 mb-0">
                {issues.map((issue) => (
                  <div key={`${index}-${issue}`}>{issue}</div>
                ))}
              </Alert>
            ) : null}

            {isExpanded ? (
              <Form className="mt-3">
                <Row className="mb-3">
                  <Form.Group as={Col} md={6} controlId={`questionType-${index}`}>
                    <Form.Label>Activity type</Form.Label>
                    <Form.Select value={item.questionType} onChange={(event) => updateRecord(index, 'questionType', event.target.value)}>
                      <option value="MultipleChoice">Multiple choice</option>
                      <option value="DrugChoice">Drug choice</option>
                      <option value="Calculation">Calculation</option>
                      <option value="MultipleAnswer">Multiple answer question</option>
                      <option value="CarePlan">Reflection</option>
                    </Form.Select>
                  </Form.Group>
                </Row>

                <Row className="mb-3">
                  <Form.Group as={Col} controlId={`questionTitle-${index}`}>
                    <Form.Label>Question title</Form.Label>
                    <Form.Control
                      value={item.questionTitle}
                      onChange={(event) => updateRecord(index, 'questionTitle', event.target.value)}
                    />
                  </Form.Group>
                </Row>

                <Row className="mb-3">
                  <Form.Group as={Col} controlId={`questionText-${index}`}>
                    <Form.Label>Question text</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={item.questionText}
                      onChange={(event) => updateRecord(index, 'questionText', event.target.value)}
                      placeholder="Write the prompt exactly as the learner will see it."
                    />
                  </Form.Group>
                </Row>

                {item.questionType === 'MultipleChoice' ? (
                  <>
                    <Row className="mb-3">
                      <Form.Group as={Col} controlId={`questionAnswers-${index}`}>
                        <Form.Label>Answer options</Form.Label>
                        <Form.Text className="d-block text-muted mb-2">
                          Add between two and five options, then select the correct one.
                        </Form.Text>
                        {[1, 2, 3, 4, 5].map((optionNumber) => {
                          const field = `opt${optionNumber}`;
                          return (
                            <InputGroup className="mb-3" key={field}>
                              <Form.Control
                                type="text"
                                placeholder={`Answer option ${optionNumber}`}
                                value={item[field]}
                                onChange={(event) => updateRecord(index, field, event.target.value)}
                                style={answer === String(optionNumber - 1) ? { border: 'solid 3px green' } : {}}
                              />
                              <InputGroup.Radio name={`answer-${index}`} value={optionNumber - 1} checked={answer === String(optionNumber - 1)} onChange={(event) => updateRecord(index, 'answer', event.target.value)} />
                            </InputGroup>
                          );
                        })}
                      </Form.Group>
                    </Row>
                  </>
                ) : null}

                {item.questionType === 'DrugChoice' ? (
                  <Row className="mb-3">
                    <Form.Group as={Col} controlId={`drugChoiceAnswers-${index}`}>
                      <Form.Label>Drug library answer options</Form.Label>
                      <Form.Text className="d-block text-muted mb-2">
                        Search the drug library, add two to five medicines, then mark the correct answer.
                      </Form.Text>
                      <InputGroup className="mb-2">
                        <Form.Control
                          type="search"
                          value={drugSearchByQuestion[index] || ''}
                          onChange={(event) => setDrugSearch(index, event.target.value)}
                          placeholder="Search drug library"
                          list={`drug-choice-library-${index}`}
                          disabled={getAnswerOptions(item).length >= 5}
                        />
                        <Button
                          type="button"
                          variant="outline-primary"
                          disabled={!drugNameSet.has(String(drugSearchByQuestion[index] || '').trim()) || getAnswerOptions(item).length >= 5}
                          onClick={() => addDrugOption(index, drugSearchByQuestion[index])}
                        >
                          Add
                        </Button>
                      </InputGroup>
                      <datalist id={`drug-choice-library-${index}`}>
                        {drugLibraryNames.map((drugName) => <option key={drugName} value={drugName} />)}
                      </datalist>
                      <div className="d-flex gap-2 flex-wrap mb-2">
                        {drugLibraryNames
                          .filter((drugName) => {
                            const search = String(drugSearchByQuestion[index] || '').trim().toLowerCase();
                            if (!search || getAnswerOptions(item).includes(drugName)) {
                              return false;
                            }
                            return drugName.toLowerCase().includes(search);
                          })
                          .slice(0, 8)
                          .map((drugName) => (
                            <Button
                              key={drugName}
                              type="button"
                              size="sm"
                              variant="outline-secondary"
                              disabled={getAnswerOptions(item).length >= 5}
                              onClick={() => addDrugOption(index, drugName)}
                            >
                              {drugName}
                            </Button>
                          ))}
                      </div>
                      {getAnswerOptions(item).length ? (
                        <div className="question-editor__drug-options">
                          {getAnswerOptions(item).map((option, optionIndex) => (
                            <div key={`${option}-${optionIndex}`} className="d-flex align-items-center gap-2 flex-wrap border rounded p-2 mb-2">
                              <Form.Check
                                type="radio"
                                name={`answer-${index}`}
                                id={`drug-answer-${index}-${optionIndex}`}
                                label="Correct"
                                value={optionIndex}
                                checked={answer === String(optionIndex)}
                                onChange={(event) => updateRecord(index, 'answer', event.target.value)}
                              />
                              <strong>{option}</strong>
                              <Button type="button" size="sm" variant="outline-danger" onClick={() => removeDrugOption(index, optionIndex)}>
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Alert variant="light" className="mb-0">No drug options added yet.</Alert>
                      )}
                    </Form.Group>
                  </Row>
                ) : null}

                {item.questionType === 'MultipleAnswer' ? (
                  <Row className="mb-3">
                    <Form.Group as={Col}>
                      <Form.Label>Field labels</Form.Label>
                      <Form.Text className="d-block text-muted mb-2">
                        These become the labelled answer fields learners fill in.
                      </Form.Text>
                      {[1, 2, 3, 4, 5].map((optionNumber) => {
                        const field = `opt${optionNumber}`;
                        return (
                          <Form.Control
                            key={field}
                            className="mb-2"
                            type="text"
                            placeholder={`Label ${optionNumber}`}
                            value={item[field]}
                            onChange={(event) => updateRecord(index, field, event.target.value)}
                          />
                        );
                      })}
                    </Form.Group>
                  </Row>
                ) : null}

                {item.questionType === 'Calculation' || item.questionType === 'MultipleAnswer' ? (
                  <Row className="mb-3">
                    <Form.Group as={Col} controlId={`questionKeywords-${index}`}>
                      <Form.Label>Expected answer values</Form.Label>
                      <Form.Control
                        value={item.answerKeywordsText}
                        onChange={(event) => updateRecord(index, 'answerKeywordsText', event.target.value)}
                        placeholder="Comma-separated expected values"
                      />
                      <Form.Text className="text-muted">
                        Separate multiple expected words or values with commas.
                      </Form.Text>
                    </Form.Group>
                  </Row>
                ) : null}

                {item.questionType === 'CarePlan' ? (
                  <Alert variant="light">This activity collects free-text reflection and is not auto-marked.</Alert>
                ) : null}

                <Row className="mb-0">
                  <Form.Group as={Col} controlId={`questionExplanation-${index}`}>
                    <Form.Label>Answer explanation</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={item.answerExplanation}
                      onChange={(event) => updateRecord(index, 'answerExplanation', event.target.value)}
                      placeholder="Optional teaching explanation shown after review."
                    />
                  </Form.Group>
                </Row>
              </Form>
            ) : null}
          </div>
        );
      })}

      <div className="container-shadow mt-3 p-3 d-flex gap-2 flex-wrap justify-content-between align-items-center">
        <div className="text-muted">
          {recordState.length} question{recordState.length === 1 ? '' : 's'} in this set
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <Button type="button" onClick={addRecord} variant="primary">Add question</Button>
          <Button type="button" onClick={saveRecord} variant="success">Save questions</Button>
        </div>
      </div>
    </div>
  );
};

export default AddQuestions;
