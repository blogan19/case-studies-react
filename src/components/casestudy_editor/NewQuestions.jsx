import React, { useEffect, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
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

const AddQuestions = ({ closeModal, setQuestions, previousResult }) => {
  const [recordState, setRecordState] = useState([{ ...emptyQuestion }]);

  useEffect(() => {
    if (Array.isArray(previousResult) && previousResult.length > 0) {
      setRecordState(previousResult.map(mapPreviousQuestion));
    }
  }, [previousResult]);

  const addRecord = () => {
    setRecordState((current) => [...current, { ...emptyQuestion }]);
  };

  const updateRecord = (index, name, value) => {
    setRecordState((current) => current.map((record, recordIndex) => (recordIndex === index ? { ...record, [name]: value } : record)));
  };

  const removeRecord = (index) => {
    setRecordState((current) => (current.length === 1 ? [{ ...emptyQuestion }] : current.filter((_item, recordIndex) => recordIndex !== index)));
  };

  const saveRecord = () => {
    const questionList = recordState.map((item, index) => {
      const answerOptions = [item.opt1, item.opt2, item.opt3, item.opt4, item.opt5].filter(Boolean);
      const answerKeywords = item.answerKeywordsText.split(',').map((keyword) => keyword.trim()).filter(Boolean);

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
          questionTitle: item.questionTitle,
          questionText: item.questionText,
          answer: answerKeywords,
          answerKeywords,
          taskConfig,
          answerExplanation: item.answerExplanation,
        };
      }

      return {
        questionNumber: index + 1,
        questionType: item.questionType,
        questionTitle: item.questionTitle,
        questionText: item.questionText,
        answerOptions,
        answer: item.questionType === 'MultipleAnswer'
          ? answerKeywords
          : item.questionType === 'Calculation'
            ? Number(answerKeywords[0] || 0)
            : answerOptions[Number(item.answer)],
        optionsLabels: item.questionType === 'MultipleAnswer' ? answerOptions : undefined,
        answerExplanation: item.answerExplanation,
      };
    });

    setQuestions(questionList);
    closeModal();
  };

  return (
    <>
      {recordState.map((item, index) => {
        const answer = item.answer;
        return (
          <div key={`question-${index}`} className="container-shadow mt-3 p-3">
            <Form>
              <Row className="mb-3 align-items-center">
                <Col>
                  <h3>Question {index + 1}</h3>
                </Col>
                <Col xs="auto">
                  <Button type="button" variant="danger" onClick={() => removeRecord(index)}>
                    <i className="bi bi-trash3" />
                  </Button>
                </Col>
              </Row>
              <Row className="mb-3">
                <Form.Group as={Col} controlId={`questionType-${index}`}>
                  <Form.Label>Activity Type</Form.Label>
                  <Form.Select value={item.questionType} onChange={(event) => updateRecord(index, 'questionType', event.target.value)}>
                    <option value="MultipleChoice">Multiple choice</option>
                    <option value="DrugChoice">Drug choice</option>
                    <option value="Calculation">Calculation</option>
                    <option value="MultipleAnswer">Multi-part answer</option>
                    <option value="CarePlan">Reflection</option>
                    <option value="WorkthroughTask">Workthrough task</option>
                  </Form.Select>
                </Form.Group>
                {item.questionType === 'WorkthroughTask' ? (
                  <Form.Group as={Col} controlId={`taskType-${index}`}>
                    <Form.Label>Task Category</Form.Label>
                    <Form.Select value={item.taskType} onChange={(event) => updateRecord(index, 'taskType', event.target.value)}>
                      <option value="General">General</option>
                      <option value="AddAllergy">Add allergy</option>
                      <option value="PrescribeMedication">Prescribe medication</option>
                      <option value="MedicationReview">Medication review</option>
                      <option value="Verification">Pharmacist verification</option>
                    </Form.Select>
                  </Form.Group>
                ) : null}
              </Row>
              <Row className="mb-3">
                <Form.Group as={Col} controlId={`questionTitle-${index}`}>
                  <Form.Label>Question Title</Form.Label>
                  <Form.Control value={item.questionTitle} onChange={(event) => updateRecord(index, 'questionTitle', event.target.value)} />
                </Form.Group>
              </Row>
              <Row className="mb-3">
                <Form.Group as={Col} controlId={`questionText-${index}`}>
                  <Form.Label>Question Text</Form.Label>
                  <Form.Control value={item.questionText} onChange={(event) => updateRecord(index, 'questionText', event.target.value)} />
                </Form.Group>
              </Row>
              {item.questionType === 'MultipleChoice' || item.questionType === 'DrugChoice' ? (
                <>
                  <Row className="mb-3">
                    <Form.Group as={Col} controlId={`questionAnswers-${index}`}>
                      <Form.Label>Answer Options (Use between two and five options)</Form.Label>
                      {[1, 2, 3, 4, 5].map((optionNumber) => {
                        const field = `opt${optionNumber}`;
                        return (
                          <InputGroup className="mb-3" key={field}>
                            <Form.Control
                              type="text"
                              placeholder={`Answer Option ${optionNumber}`}
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
                  {answer === '' ? <p className="text-danger">You have not selected a correct answer.</p> : null}
                </>
              ) : null}

              {item.questionType === 'MultipleAnswer' ? (
                <Row className="mb-3">
                  <Form.Group as={Col}>
                    <Form.Label>Field Labels</Form.Label>
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

              {item.questionType === 'Calculation' || item.questionType === 'MultipleAnswer' || item.questionType === 'WorkthroughTask' ? (
                <Row className="mb-3">
                  <Form.Group as={Col} controlId={`questionKeywords-${index}`}>
                    <Form.Label>
                      {item.questionType === 'WorkthroughTask' ? 'Expected keywords / answers' : 'Expected answer values'}
                    </Form.Label>
                    <Form.Control
                      value={item.answerKeywordsText}
                      onChange={(event) => updateRecord(index, 'answerKeywordsText', event.target.value)}
                      placeholder={item.questionType === 'WorkthroughTask' ? 'e.g. codeine, rash' : 'Comma-separated expected values'}
                    />
                    <Form.Text className="text-muted">
                      Separate multiple expected words or values with commas.
                    </Form.Text>
                  </Form.Group>
                </Row>
              ) : null}

              {item.questionType === 'WorkthroughTask' && item.taskType === 'AddAllergy' ? (
                <Row className="mb-3">
                  <Form.Group as={Col} controlId={`expectedDrug-${index}`}>
                    <Form.Label>Expected allergy drug</Form.Label>
                    <Form.Control value={item.expectedDrug} onChange={(event) => updateRecord(index, 'expectedDrug', event.target.value)} />
                  </Form.Group>
                  <Form.Group as={Col} controlId={`expectedReaction-${index}`}>
                    <Form.Label>Expected reaction</Form.Label>
                    <Form.Control value={item.expectedReaction} onChange={(event) => updateRecord(index, 'expectedReaction', event.target.value)} />
                  </Form.Group>
                </Row>
              ) : null}

              {item.questionType === 'WorkthroughTask' && item.taskType === 'PrescribeMedication' ? (
                <>
                  <Row className="mb-3">
                    <Form.Group as={Col} controlId={`expectedDrug-${index}`}>
                      <Form.Label>Expected drug</Form.Label>
                      <Form.Control value={item.expectedDrug} onChange={(event) => updateRecord(index, 'expectedDrug', event.target.value)} />
                    </Form.Group>
                    <Form.Group as={Col} controlId={`expectedRoute-${index}`}>
                      <Form.Label>Expected route</Form.Label>
                      <Form.Control value={item.expectedRoute} onChange={(event) => updateRecord(index, 'expectedRoute', event.target.value)} />
                    </Form.Group>
                  </Row>
                  <Row className="mb-3">
                    <Form.Group as={Col} controlId={`expectedFrequency-${index}`}>
                      <Form.Label>Expected frequency</Form.Label>
                      <Form.Control value={item.expectedFrequency} onChange={(event) => updateRecord(index, 'expectedFrequency', event.target.value)} />
                    </Form.Group>
                    <Form.Group as={Col} controlId={`expectedIndication-${index}`}>
                      <Form.Label>Expected indication</Form.Label>
                      <Form.Control value={item.expectedIndication} onChange={(event) => updateRecord(index, 'expectedIndication', event.target.value)} />
                    </Form.Group>
                  </Row>
                </>
              ) : null}

              {item.questionType === 'CarePlan' ? (
                <Alert variant="light">This activity collects free-text reflection and is not auto-marked.</Alert>
              ) : null}
              <Row className="mb-3">
                <Form.Group as={Col} controlId={`questionExplanation-${index}`}>
                  <Form.Label>Answer Explanation</Form.Label>
                  <Form.Control value={item.answerExplanation} onChange={(event) => updateRecord(index, 'answerExplanation', event.target.value)} />
                </Form.Group>
              </Row>
            </Form>
          </div>
        );
      })}
      <div className="container-shadow mt-3 p-3">
        <Button type="button" onClick={addRecord} variant="outline-info" className="mt-3 mb-3">Add Question</Button>{' '}
        <Button type="button" onClick={saveRecord} variant="success" className="mt-3 mb-3">Save Questions</Button>
      </div>
    </>
  );
};

export default AddQuestions;
