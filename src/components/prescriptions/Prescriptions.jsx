import React, { useMemo, useState } from 'react';
import Card from 'react-bootstrap/Card';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Dropdown from 'react-bootstrap/Dropdown';
import Modal from 'react-bootstrap/Modal';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Table from 'react-bootstrap/Table';
import Tooltip from 'react-bootstrap/Tooltip';
import AdministrationTimeline from './AdministrationTimeline';
import { formatDateTimeLabel } from './chartUtils';

const WEEKDAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function parseDateTime(value) {
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
}

function formatPrescriptionDate(value) {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-GB');
  }

  return value;
}

function formatPrescriptionDateTime(value) {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return formatDateTimeLabel(parsed);
  }

  return value;
}

function formatPrescriptionStop(value) {
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
}

function normalizeHistoryReason(value) {
  const normalized = String(value || '').trim();
  return normalized && normalized !== 'No reason recorded' ? normalized : '';
}

function formatHistoryDetails(value) {
  return String(value || '').replace(
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z/g,
    (match) => {
      const parsed = new Date(match);
      return Number.isNaN(parsed.getTime()) ? match : formatDateTimeLabel(parsed);
    }
  );
}

function formatHistoryAction(entry) {
  if (entry?.details && String(entry.details).trim() !== 'Initial prescription created.') {
    return String(entry.action || 'updated').trim();
  }
  return String(entry?.action || '').trim() || 'updated';
}

function extractLatestInrResult(biochemistry = {}) {
  const matchingEntry = Object.values(biochemistry || {}).find((item) => String(item?.name || '').trim().toLowerCase() === 'inr');
  if (!matchingEntry || !Array.isArray(matchingEntry.results)) {
    return null;
  }

  return [...matchingEntry.results]
    .filter((item) => String(item?.result || '').trim())
    .sort((left, right) => {
      const leftTime = parseDateTime(left?.datetime)?.getTime() || new Date(left?.datetime || 0).getTime() || 0;
      const rightTime = parseDateTime(right?.datetime)?.getTime() || new Date(right?.datetime || 0).getTime() || 0;
      return rightTime - leftTime;
    })[0] || null;
}

function formatWarfarinWeekdaySummary(schedule = {}, unit = '') {
  return WEEKDAY_ORDER
    .map((day) => {
      const dose = String(schedule?.[day] ?? '').trim();
      return dose ? `${day.slice(0, 3)} ${dose}${unit ? ` ${unit}` : ''}` : null;
    })
    .filter(Boolean)
    .join(', ');
}

const PrescriptionCard = ({
  prescribingStatus,
  prescription,
  index,
  activeTasks = [],
  admissionDate,
  biochemistry = {},
  editPrescription,
  onStartPrescription,
  onStopPrescription,
  onRemovePrescription,
  deletePrescription,
  onSuspendDose,
  onChartAdministration,
  onExitSuspendMode,
  onToggleApproval,
  onCreateTask,
  frequencyOptions,
  globalSuspendMode = false,
  isSuspendOwner = false,
  onEnterSuspendMode,
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const [showInlineMenu, setShowInlineMenu] = useState(false);
  const {
    drug,
    dose,
    frequency,
    route,
    strength,
    form,
    stat,
    whenRequired,
    maxDose24h,
    start_date,
    end_date,
    indication,
    prescriptionNote,
    warfarinWeekdaySchedule = null,
    prescriber,
    administrations = [],
    scheduledTimes = [],
    status = 'active',
    amendmentHistory = [],
    pharmacistApprovalStatus = { approved: false, approvedBy: '', approvedAt: '' },
    criticalMedicine = false,
    controlledDrug = false,
    requiresWitness = false,
    variableDoseSchedule = null,
    unit = '',
  } = prescription;
  const approvalLabel = pharmacistApprovalStatus?.approved
    ? `Approved by ${pharmacistApprovalStatus.approvedBy || 'Unknown user'}${pharmacistApprovalStatus.approvedAt ? ` on ${formatDateTimeLabel(new Date(pharmacistApprovalStatus.approvedAt))}` : ''}`
    : 'Not approved';
  const displayDose = warfarinWeekdaySchedule ? (formatWarfarinWeekdaySummary(warfarinWeekdaySchedule, unit) || dose || 'Not set') : (dose || 'Not set');
  const displayFrequency = whenRequired && maxDose24h ? `${frequency} (max ${maxDose24h}/24h)` : (frequency || 'Not set');
  const displayRoute = route || 'Not set';
  const taskTooltip = activeTasks.length ? (
    <Tooltip id={`task-flag-${index}`}>
      <div className="text-start">
        {activeTasks.map((task) => (
          <div key={task.id} className="mb-2">
            <div><strong>{task.title}</strong></div>
            {task.assignedProfession ? <div>Assigned to: {task.assignedProfession}</div> : null}
            {task.description ? <div>{task.description}</div> : null}
          </div>
        ))}
      </div>
    </Tooltip>
  ) : null;

  const sortedAdministrations = useMemo(
    () => [...administrations].sort((a, b) => (parseDateTime(b.adminDateTime) || 0) - (parseDateTime(a.adminDateTime) || 0)),
    [administrations]
  );
  const latestAdministration = sortedAdministrations[0] || null;
  const latestInrResult = useMemo(() => extractLatestInrResult(biochemistry), [biochemistry]);
  const suspendMode = globalSuspendMode && isSuspendOwner;
  const interactionLocked = globalSuspendMode;
  const handleRemovePrescription = onRemovePrescription || deletePrescription;
  const handleChartAction = (slotDate, administration, action) => {
    if (!prescribingStatus) {
      return;
    }

    if (action === 'administer') {
      if (onChartAdministration) {
        onChartAdministration(index, slotDate, administration);
      }
      return;
    }

    if (onSuspendDose) {
      onSuspendDose(index, slotDate, administration);
    }
  };

  return (
    <>
      <Card className="bg-white mt-2 rounded container-shadow prescription-chart-card">
        <Card.Body className="py-2 px-3">
          <div
            className="prescription-chart-row"
            role={interactionLocked ? undefined : 'button'}
            tabIndex={interactionLocked ? -1 : 0}
            onClick={() => {
              if (!interactionLocked) {
                setShowHistory(true);
              }
            }}
            onKeyDown={(event) => {
              if (!interactionLocked && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault();
                setShowHistory(true);
              }
            }}
          >
            <div className="prescription-chart-row__summary">
              <div className="prescription-chart-row__headline d-flex align-items-center gap-2 flex-wrap">
                <strong className="prescription-chart-row__drug">
                  {[drug?.charAt(0).toUpperCase() + drug?.slice(1), strength, form].filter(Boolean).join(' ')}
                </strong>
                {whenRequired ? <Badge bg="primary">PRN</Badge> : null}
                {activeTasks.length ? (
                  <OverlayTrigger placement="bottom" overlay={taskTooltip}>
                    <Badge bg="warning" text="dark" className="prescription-task-flag">
                      Task
                    </Badge>
                  </OverlayTrigger>
                ) : null}
                {prescribingStatus ? (
                  <Dropdown
                    show={!interactionLocked && showInlineMenu}
                    align="end"
                    className="prescription-inline-menu"
                    onMouseEnter={() => {
                      if (!interactionLocked) {
                        setShowInlineMenu(true);
                      }
                    }}
                    onMouseLeave={() => setShowInlineMenu(false)}
                    onToggle={(nextShow) => {
                      if (!interactionLocked) {
                        setShowInlineMenu(nextShow);
                      }
                    }}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <Dropdown.Toggle
                      variant="link"
                      size="sm"
                      id={`prescription-actions-${index}`}
                      className="prescription-inline-menu__toggle"
                      disabled={interactionLocked}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!interactionLocked) {
                          setShowInlineMenu((current) => !current);
                        }
                      }}
                    >
                      Edit
                    </Dropdown.Toggle>
                    <Dropdown.Menu onClick={(event) => event.stopPropagation()}>
                      {status === 'active' && !globalSuspendMode ? <Dropdown.Item onClick={() => { onEnterSuspendMode(index); setShowInlineMenu(false); }}>Suspend mode</Dropdown.Item> : null}
                      {status !== 'active' && onStartPrescription ? <Dropdown.Item onClick={() => { onStartPrescription(index); setShowInlineMenu(false); }}>Start</Dropdown.Item> : null}
                      {status === 'active' && onStopPrescription ? <Dropdown.Item onClick={() => { onStopPrescription(index); setShowInlineMenu(false); }}>Stop</Dropdown.Item> : null}
                      {prescribingStatus && onCreateTask ? <Dropdown.Item onClick={() => { onCreateTask(index); setShowInlineMenu(false); }}>Add task</Dropdown.Item> : null}
                      <Dropdown.Item onClick={() => { editPrescription(index); setShowInlineMenu(false); }}>Edit</Dropdown.Item>
                      {handleRemovePrescription ? (
                        <Dropdown.Item
                          className="text-danger"
                          onClick={() => {
                            handleRemovePrescription(index);
                            setShowInlineMenu(false);
                          }}
                        >
                          Remove
                        </Dropdown.Item>
                      ) : null}
                    </Dropdown.Menu>
                  </Dropdown>
                ) : null}
                {stat ? <Badge bg="info">Stat</Badge> : null}
                {criticalMedicine ? <Badge bg="danger">Critical</Badge> : null}
                {controlledDrug ? <Badge bg="warning" text="dark">CD</Badge> : null}
                {requiresWitness ? <Badge bg="secondary">Witness</Badge> : null}
                {status !== 'active' ? <Badge bg={status === 'suspended' ? 'warning' : 'secondary'}>{status}</Badge> : null}
                </div>
                <div className="prescription-chart-row__meta">
                  <span className="prescription-chart-row__key-field prescription-chart-row__key-field--dose">
                    <strong>Dose</strong>
                    <span>{displayDose}</span>
                  </span>
                  <span className="prescription-chart-row__key-field prescription-chart-row__key-field--frequency">
                    <strong>Frequency</strong>
                    <span>{displayFrequency}</span>
                  </span>
                  <span className="prescription-chart-row__key-field prescription-chart-row__key-field--route">
                    <strong>Route</strong>
                    <span>{displayRoute}</span>
                  </span>
                </div>
                <div className="prescription-chart-row__supporting">
                  <span><strong>Start:</strong> {stat ? formatPrescriptionDateTime(start_date) : (formatPrescriptionDate(start_date) || 'Not set')}</span>
                  <span><strong>Stop:</strong> {formatPrescriptionStop(end_date) || 'Open ended'}</span>
                  <span><strong>Indication:</strong> {indication || 'Not recorded'}</span>
                  <span><strong>Prescriber:</strong> {prescriber || 'Not recorded'}</span>
                </div>
                {latestInrResult ? (
                  <div className="prescription-chart-row__supporting">
                    <span><strong>Latest INR:</strong> {latestInrResult.result} on {latestInrResult.datetime}</span>
                  </div>
                ) : null}
                {prescriptionNote ? (
                <div className="prescription-chart-row__supporting">
                  <span><strong>Note:</strong> {prescriptionNote}</span>
                </div>
              ) : null}
              <div className="prescription-chart-row__approval">
                <strong>Pharm approval:</strong>
                <OverlayTrigger
                  placement="top"
                  overlay={<Tooltip id={`approval-${index}`}>{approvalLabel}</Tooltip>}
                >
                  <button
                    type="button"
                    className={`prescription-approval-toggle ${pharmacistApprovalStatus?.approved ? 'prescription-approval-toggle--approved' : ''}`}
                    disabled={interactionLocked}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!interactionLocked) {
                        onToggleApproval(index);
                      }
                    }}
                    onKeyDown={(event) => event.stopPropagation()}
                    aria-label={pharmacistApprovalStatus?.approved ? 'Unapprove prescription' : 'Approve prescription'}
                  >
                    <i className="bi bi-check-lg" aria-hidden="true" />
                  </button>
                </OverlayTrigger>
              </div>
              {prescribingStatus && status === 'active' && suspendMode ? (
                <div className="prescription-chart-row__inline-action">
                  <div class="alert alert-info mb-2" role="alert">
                    To suspend or resume a specific scheduled dose, click on the dose time in the administration timeline.
                  </div>
                  <button
                      type="button"
                      className="admin-suspend-toggle btn btn-sm btn-danger"
                      onClick={(event) => {
                        event.stopPropagation();
                        onExitSuspendMode(index);
                      }}
                    >
                    You are currently in suspend mode for this prescription. Click to exit suspend mode.
                  </button>
                </div>
              ) : null}
            </div>

            <div className="prescription-chart-row__admins" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
              {whenRequired ? (
                <div className="prn-admin-panel">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (!interactionLocked) {
                        onChartAdministration(index, new Date(), { type: 'prn' });
                      }
                    }}
                    disabled={!prescribingStatus || interactionLocked}
                  >
                    Administer
                  </Button>
                  <div className="small text-muted mt-2">
                    <strong>Last administered:</strong> {latestAdministration?.adminDateTime || 'Not yet charted'}
                  </div>
                </div>
              ) : (
                <AdministrationTimeline
                  administrationList={administrations}
                    frequency={frequency}
                    scheduledTimes={scheduledTimes}
                    variableDoseSchedule={variableDoseSchedule}
                    warfarinWeekdaySchedule={warfarinWeekdaySchedule}
                    unit={unit}
                  frequencyOptions={frequencyOptions}
                  admissionDate={admissionDate}
                  startDate={start_date}
                  endDate={end_date}
                  isStat={Boolean(stat)}
                  isCriticalMedicine={criticalMedicine}
                  suspendMode={suspendMode}
                  onSelectScheduledDose={prescribingStatus ? handleChartAction : undefined}
                />
              )}
            </div>
          </div>
        </Card.Body>
      </Card>

      <Modal show={showHistory} onHide={() => setShowHistory(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>{drug} order history</Modal.Title>
        </Modal.Header>
        <Modal.Body>
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
                  <th>Note</th>
                  <th>Prescriber</th>
                  <th>Pharmacist approval</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                  <td>{drug}</td>
                  <td>{displayDose}</td>
                  <td>{displayFrequency}</td>
                  <td>{displayRoute}</td>
                  <td>{stat ? (formatPrescriptionDateTime(start_date) || 'Not set') : (formatPrescriptionDate(start_date) || 'Not set')}</td>
                  <td>{formatPrescriptionStop(end_date) || 'Open ended'}</td>
                  <td>{indication || 'Not recorded'}</td>
                  <td>{prescriptionNote || 'Not recorded'}</td>
                  <td>{prescriber || 'Not recorded'}</td>
                  <td>{approvalLabel}</td>
                <td>{status}</td>
              </tr>
            </tbody>
          </Table>

          <h5 className="mt-4">Amendment history</h5>
          {(() => {
            const amendmentEntries = amendmentHistory.slice().reverse();
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
              {sortedAdministrations.length ? sortedAdministrations.map((item, itemIndex) => (
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
        </Modal.Body>
      </Modal>
    </>
  );
};

export default PrescriptionCard;
