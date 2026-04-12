import React, { useMemo, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Row from 'react-bootstrap/Row';
import Table from 'react-bootstrap/Table';
import NewCaseForm from './components/casestudy_editor/NewPatientDetails';
import AddCaseNotes from './components/casestudy_editor/NewCaseNotes';
import AddMicrobiology from './components/casestudy_editor/NewMicrobiology';
import AddBiochemistry from './components/casestudy_editor/NewBiochemistry';
import AddObservations from './components/casestudy_editor/NewObservations';
import AddImages from './components/casestudy_editor/NewImages';
import AddQuestions from './components/casestudy_editor/NewQuestions';
import AddPrescription from './components/prescriptions/addPrescription';
import PatientDetails from './components/patient_records/Patient_details';
import CaseNotes from './components/patient_records/Case_notes';
import Laboratory from './components/patient_records/Laboratory';
import Observations from './components/patient_records/Observations';
import Imaging from './components/patient_records/Imaging';
import Prescription from './components/prescriptions/Prescriptions';
import QuestionContainer from './components/questions/QuestionContainer';
import ContentHeader from './components/Content_header';
import CaseStudyDisplay from './Case_study_display';
import { hasContent, isCaseStudyReady, normalizeCaseStudy } from './lib/caseStudy';
import DrugLibraryManager from './components/dashboard/DrugLibraryManager';

const CaseStudyEdit = ({
  caseStudy,
  caseStudies,
  drugLibrary,
  onImportDrugLibrary,
  onChange,
  onSave,
  onLoadCase,
  onPublish,
  isSaving,
  activeSessionCode,
}) => {
  const [showEditor, setShowEditor] = useState(false);
  const [editorMode, setEditorMode] = useState('demographics');
  const [showPreview, setShowPreview] = useState(false);
  const [editPrescription, setEditPrescription] = useState('');
  const [editPrescriptionIndex, setEditPrescriptionIndex] = useState(null);

  const draft = useMemo(() => normalizeCaseStudy(caseStudy), [caseStudy]);

  const completion = {
    details: Boolean(draft.case_study_name && draft.case_instructions),
    patient: hasContent(draft.patient),
    caseNotes: hasContent(draft.case_notes),
    prescriptions: hasContent(draft.prescriptionList),
    microbiology: hasContent(draft.microbiology),
    biochemistry: hasContent(draft.biochemistry),
    observations: hasContent(draft.observations),
    images: hasContent(draft.imaging),
    questions: hasContent(draft.questions),
  };

  const updateDraft = (patch) => onChange({ ...draft, ...patch });

  const upsertPrescription = (prescription) => {
    const next = [...draft.prescriptionList, prescription];
    updateDraft({ prescriptionList: next });
  };

  const saveEditedPrescription = (prescription, index) => {
    const next = draft.prescriptionList.map((item, itemIndex) =>
      itemIndex === index ? prescription : item
    );
    updateDraft({ prescriptionList: next });
  };

  const deletePrescription = (index) => {
    updateDraft({
      prescriptionList: draft.prescriptionList.filter((_item, itemIndex) => itemIndex !== index),
    });
  };

  const openEditor = (mode, prescriptionIndex = null) => {
    setEditorMode(mode);
    if (mode === 'prescriptions' && prescriptionIndex !== null) {
      setEditPrescription(draft.prescriptionList[prescriptionIndex]);
      setEditPrescriptionIndex(prescriptionIndex);
    } else {
      setEditPrescription('');
      setEditPrescriptionIndex(null);
    }
    setShowEditor(true);
  };

  const renderEditor = () => {
    switch (editorMode) {
      case 'demographics':
        return (
          <NewCaseForm
            closeNewPatient={() => setShowEditor(false)}
            patientDemographics={(patient) => updateDraft({ patient })}
            currentDemographics={draft.patient}
            setPatientAllergies={(allergies) => updateDraft({ allergies })}
            currentAllergies={draft.allergies}
          />
        );
      case 'prescriptions':
        return (
          <AddPrescription
            newPrescription={upsertPrescription}
            editPrescription={editPrescription}
            editPrescriptionIndex={editPrescriptionIndex}
            saveEdit={saveEditedPrescription}
            drugLibrary={drugLibrary}
            closeModal={() => setShowEditor(false)}
            allowHistoricalAdministrations
            actorName="Educator"
          />
        );
      case 'case_notes':
        return (
          <AddCaseNotes
            newCaseNotes={(caseNotes) => updateDraft({ case_notes: caseNotes })}
            previousNotes={draft.case_notes}
            closeModal={() => setShowEditor(false)}
          />
        );
      case 'microbiology':
        return (
          <AddMicrobiology
            setMicrobiology={(microbiology) => updateDraft({ microbiology })}
            previousResult={draft.microbiology}
            closeModal={() => setShowEditor(false)}
          />
        );
      case 'biochemistry':
        return (
          <AddBiochemistry
            setBiochemistry={(biochemistry) => updateDraft({ biochemistry })}
            previousResult={draft.biochemistry}
            closeModal={() => setShowEditor(false)}
          />
        );
      case 'observations':
        return (
          <AddObservations
            setObservations={(observations) => updateDraft({ observations })}
            previousResult={draft.observations}
            closeModal={() => setShowEditor(false)}
          />
        );
      case 'images':
        return (
          <AddImages
            setImages={(imaging) => updateDraft({ imaging })}
            previousResult={draft.imaging}
            closeModal={() => setShowEditor(false)}
          />
        );
      case 'questions':
        return (
          <AddQuestions
            setQuestions={(questions) => updateDraft({ questions })}
            previousResult={draft.questions}
            closeModal={() => setShowEditor(false)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Container className="mt-4 mb-4">
        <Row className="g-4">
          <Col lg={4}>
            <Card className="container-shadow h-100">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h4 className="mb-0">Your case studies</h4>
                  <Button variant="outline-primary" onClick={() => onChange(normalizeCaseStudy())}>
                    New draft
                  </Button>
                </div>
                {caseStudies.length === 0 ? (
                  <Alert variant="light">No saved case studies yet.</Alert>
                ) : (
                  caseStudies.map((item) => (
                    <Button
                      key={item.id}
                      variant={item.id === draft.id ? 'primary' : 'outline-primary'}
                      className="w-100 text-start mb-2"
                      onClick={() => onLoadCase(item.id)}
                    >
                      <strong>{item.title}</strong>
                      <br />
                      <small>{item.summary}</small>
                    </Button>
                  ))
                )}
              </Card.Body>
            </Card>
          </Col>
          <Col lg={8}>
            <Card className="container-shadow h-100">
              <Card.Body>
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                  <div>
                    <h3 className="mb-1">Builder workspace</h3>
                    <p className="text-muted mb-0">
                      Save your draft to PostgreSQL, then publish a live session for students.
                    </p>
                  </div>
                  <ButtonGroup>
                    <Button variant="outline-info" onClick={() => setShowPreview(true)}>
                      Preview
                    </Button>
                    <Button
                      variant="success"
                      onClick={() => onSave(draft)}
                      disabled={!isCaseStudyReady(draft) || isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => onPublish(draft)}
                      disabled={!draft.id || !isCaseStudyReady(draft) || isSaving}
                    >
                      Publish live
                    </Button>
                  </ButtonGroup>
                </div>
                {activeSessionCode ? (
                  <Alert variant="info">Students can join the live case with code {activeSessionCode}.</Alert>
                ) : null}

                <DrugLibraryManager
                  items={drugLibrary?.items || []}
                  metadata={drugLibrary?.metadata || {}}
                  onImport={onImportDrugLibrary}
                  importing={isSaving}
                />

                <ContentHeader title="Case Study Details" complete={completion.details ? 'true' : ''} />
                <Form className="mt-3">
                  <Form.Group className="mb-3" controlId="caseStudyName">
                    <Form.Label>Case study name</Form.Label>
                    <Form.Control
                      type="text"
                      value={draft.case_study_name}
                      onChange={(event) => updateDraft({ case_study_name: event.target.value })}
                    />
                  </Form.Group>
                  <Form.Group controlId="caseStudyInstructions">
                    <Form.Label>Case instructions</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={draft.case_instructions}
                      onChange={(event) => updateDraft({ case_instructions: event.target.value })}
                    />
                  </Form.Group>
                  <Row className="mt-3">
                    <Form.Group as={Col} controlId="caseStudyShortDescription">
                      <Form.Label>Brief description</Form.Label>
                      <Form.Control
                        type="text"
                        value={draft.short_description || ''}
                        onChange={(event) => updateDraft({ short_description: event.target.value })}
                      />
                    </Form.Group>
                    <Form.Group as={Col} controlId="caseStudyRevisionTopic">
                      <Form.Label>Revision topic</Form.Label>
                      <Form.Control
                        type="text"
                        value={draft.revision_topic || ''}
                        onChange={(event) => updateDraft({ revision_topic: event.target.value })}
                        placeholder="e.g. Cardiology"
                      />
                    </Form.Group>
                  </Row>
                </Form>

                <ContentHeader title="Patient Demographics" complete={completion.patient ? 'true' : ''} />
                <Container className="mt-3 px-0">
                  {completion.patient ? (
                    <PatientDetails patient={draft.patient} allergies={draft.allergies} />
                  ) : (
                    <Alert variant="light">Add the patient record to unlock the rest of the case.</Alert>
                  )}
                  <Button className="mt-3" variant="outline-primary" onClick={() => openEditor('demographics')}>
                    {completion.patient ? 'Edit patient details' : 'Add patient details'}
                  </Button>
                </Container>

                {completion.patient ? (
                  <>
                    <ContentHeader title="Case Notes" complete={completion.caseNotes ? 'true' : ''} />
                    <Container className="mt-3 px-0">
                      <Button variant="outline-primary" onClick={() => openEditor('case_notes')}>
                        {completion.caseNotes ? 'Edit case notes' : 'Add case notes'}
                      </Button>
                      {completion.caseNotes ? (
                        <Table bordered className="text-center container-shadow mt-3">
                          <tbody>
                            <tr />
                            <CaseNotes case_notes={draft.case_notes} />
                          </tbody>
                        </Table>
                      ) : null}
                    </Container>

                    <ContentHeader title="Prescriptions" complete={completion.prescriptions ? 'true' : ''} />
                    <Container className="mt-3 px-0">
                      <Button variant="outline-primary" onClick={() => openEditor('prescriptions')}>
                        Add prescription
                      </Button>
                      <div className="mt-3">
                        {draft.prescriptionList.map((prescription, index) => (
                          <Prescription
                            key={`${prescription.drug}-${index}`}
                            index={index}
                            prescribingStatus
                            prescription={prescription}
                            editPrescription={(itemIndex) => openEditor('prescriptions', itemIndex)}
                            deletePrescription={deletePrescription}
                          />
                        ))}
                      </div>
                    </Container>

                    <ContentHeader title="Microbiology" complete={completion.microbiology ? 'true' : ''} />
                    <Container className="mt-3 px-0">
                      <Button variant="outline-primary" onClick={() => openEditor('microbiology')}>
                        {completion.microbiology ? 'Edit microbiology' : 'Add microbiology'}
                      </Button>
                      {completion.microbiology ? (
                        <Table bordered className="text-center container-shadow mt-3">
                          <tbody>
                            <tr />
                            <Laboratory biochemistry={{}} microbiology={draft.microbiology} />
                          </tbody>
                        </Table>
                      ) : null}
                    </Container>

                    <ContentHeader title="Biochemistry" complete={completion.biochemistry ? 'true' : ''} />
                    <Container className="mt-3 px-0">
                      <Button variant="outline-primary" onClick={() => openEditor('biochemistry')}>
                        {completion.biochemistry ? 'Edit biochemistry' : 'Add biochemistry'}
                      </Button>
                      {completion.biochemistry ? (
                        <Table bordered className="text-center container-shadow mt-3">
                          <tbody>
                            <tr />
                            <Laboratory biochemistry={draft.biochemistry} microbiology={[]} />
                          </tbody>
                        </Table>
                      ) : null}
                    </Container>

                    <ContentHeader title="Observations" complete={completion.observations ? 'true' : ''} />
                    <Container className="mt-3 px-0">
                      <Button variant="outline-primary" onClick={() => openEditor('observations')}>
                        {completion.observations ? 'Edit observations' : 'Add observations'}
                      </Button>
                      {completion.observations ? (
                        <Table bordered className="text-center container-shadow mt-3">
                          <tbody>
                            <tr />
                            <Observations observations={draft.observations} />
                          </tbody>
                        </Table>
                      ) : null}
                    </Container>

                    <ContentHeader title="Images" complete={completion.images ? 'true' : ''} />
                    <Container className="mt-3 px-0">
                      <Button variant="outline-primary" onClick={() => openEditor('images')}>
                        {completion.images ? 'Edit images' : 'Add images'}
                      </Button>
                      {completion.images ? (
                        <Table bordered className="text-center container-shadow mt-3">
                          <tbody>
                            <tr />
                            <Imaging images={draft.imaging} />
                          </tbody>
                        </Table>
                      ) : null}
                    </Container>

                    <ContentHeader title="Case Study Questions" complete={completion.questions ? 'true' : ''} />
                    <Container className="mt-3 mb-5 px-0">
                      <Button variant="outline-primary" onClick={() => openEditor('questions')}>
                        {completion.questions ? 'Edit questions' : 'Add questions'}
                      </Button>
                      {completion.questions ? <QuestionContainer questions={draft.questions} /> : null}
                    </Container>
                  </>
                ) : null}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      <Offcanvas show={showEditor} onHide={() => setShowEditor(false)} placement="end" style={{ width: '100%' }}>
        <Offcanvas.Header closeButton className="blue-back text-white">
          <Offcanvas.Title>Edit case study</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>{renderEditor()}</Offcanvas.Body>
      </Offcanvas>

      <Modal show={showPreview} onHide={() => setShowPreview(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>{draft.case_study_name || 'Draft preview'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <CaseStudyDisplay data={draft} />
        </Modal.Body>
      </Modal>
    </>
  );
};

export default CaseStudyEdit;
