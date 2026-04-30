import React, { useEffect, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Container from 'react-bootstrap/Container';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Table from 'react-bootstrap/Table';
import Icon from './Patient_record_icon';
import MedicationHistory from './Medication_history';

const Pharmacy = ({ case_notes = {}, case_notes_history = [], prescriptions = [], drugLibrary, onSaveCaseNotes, showPanel, onShowPanelChange, activeChartTutorialStepKey = '', tutorialRefs = {} }) => {
  const [show, setShow] = useState(false);
  const [showMedicationHistory, setShowMedicationHistory] = useState(false);
  const medicationHistory = case_notes?.medicationHistory || {};
  const historyEntries = Array.isArray(case_notes_history) ? case_notes_history : [];

  useEffect(() => {
    if (typeof showPanel === 'boolean') {
      setShow(showPanel);
    }
  }, [showPanel]);

  const handleShowChange = (nextShow) => {
    setShow(nextShow);
    onShowPanelChange?.(nextShow);
  };

  return (
    <>
     

       <td onClick={() => handleShowChange(true)}>
          <Icon logo="bi bi-capsule-pill" title_text="Pharmacy" />
        </td>

       <Offcanvas show={show} onHide={() => handleShowChange(false)} style={{ width: '90%' }}>
        <Offcanvas.Header closeButton className="blue-back text-white">
          <Offcanvas.Title>Pharmacy</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
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
                  <td className="p-0">
                    <Container>
                      <div
                        ref={tutorialRefs.medRecPanel}
                        className={activeChartTutorialStepKey === 'med-rec' ? 'epma-tutorial-target epma-tutorial-target--active' : ''}
                      >
                        <MedicationHistory
                          medicationHistory={medicationHistory}
                          caseNotesHistory={historyEntries}
                          prescriptions={prescriptions}
                          drugLibrary={drugLibrary}
                          showHistoryModal={showMedicationHistory}
                          onOpenHistoryModal={() => setShowMedicationHistory(true)}
                          onCloseHistoryModal={() => setShowMedicationHistory(false)}
                            onClosePanel={() => handleShowChange(false)}
                          hideInlineHistoryButton
                          activeChartTutorialStepKey={activeChartTutorialStepKey}
                          tutorialRefs={tutorialRefs}
                          onSaveMedicationHistory={(nextMedicationHistory) => onSaveCaseNotes?.({
                            fieldKey: 'medicationHistory',
                            fieldLabel: 'Medication history',
                            successMessage: 'Medication history updated.',
                            caseNotes: {
                              ...case_notes,
                              medicationHistory: nextMedicationHistory,
                            },
                          })}
                        />
                      </div>
                    </Container>
                  </td>
                </tr>
              </tbody>
            </Table>
          </Container>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
};

export default Pharmacy;
