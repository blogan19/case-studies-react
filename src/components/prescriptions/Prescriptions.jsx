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

const PrescriptionCard = ({
  prescribingStatus,
  prescription,
  index,
  admissionDate,
  editPrescription,
  onStartPrescription,
  onStopPrescription,
  onSuspendDose,
  onChartAdministration,
  onExitSuspendMode,
  onToggleApproval,
  frequencyOptions,
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const [suspendMode, setSuspendMode] = useState(false);
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
    prescriber,
    administrations = [],
    scheduledTimes = [],
    status = 'active',
    amendmentHistory = [],
    pharmacistApprovalStatus = { approved: false, approvedBy: '', approvedAt: '' },
    criticalMedicine = false,
    controlledDrug = false,
    requiresWitness = false,
  } = prescription;
  const approvalLabel = pharmacistApprovalStatus?.approved
    ? `Approved by ${pharmacistApprovalStatus.approvedBy || 'Unknown user'}${pharmacistApprovalStatus.approvedAt ? ` on ${formatDateTimeLabel(new Date(pharmacistApprovalStatus.approvedAt))}` : ''}`
    : 'Not approved';

  const sortedAdministrations = useMemo(
    () => [...administrations].sort((a, b) => (parseDateTime(b.adminDateTime) || 0) - (parseDateTime(a.adminDateTime) || 0)),
    [administrations]
  );
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
            role="button"
            tabIndex={0}
            onClick={() => setShowHistory(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
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
                {prescribingStatus ? (
                  <Dropdown
                    show={showInlineMenu}
                    align="end"
                    className="prescription-inline-menu"
                    onMouseEnter={() => setShowInlineMenu(true)}
                    onMouseLeave={() => setShowInlineMenu(false)}
                    onToggle={(nextShow) => setShowInlineMenu(nextShow)}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <Dropdown.Toggle
                      variant="link"
                      size="sm"
                      id={`prescription-actions-${index}`}
                      className="prescription-inline-menu__toggle"
                      onClick={(event) => {
                        event.stopPropagation();
                        setShowInlineMenu((current) => !current);
                      }}
                    >
                      Edit
                    </Dropdown.Toggle>
                    <Dropdown.Menu onClick={(event) => event.stopPropagation()}>
                      {status === 'active' && !suspendMode ? <Dropdown.Item onClick={() => { setSuspendMode(true); setShowInlineMenu(false); }}>Suspend mode</Dropdown.Item> : null}
                      {status !== 'active' ? <Dropdown.Item onClick={() => { onStartPrescription(index); setShowInlineMenu(false); }}>Start</Dropdown.Item> : null}
                      {status === 'active' ? <Dropdown.Item onClick={() => { onStopPrescription(index); setShowInlineMenu(false); }}>Stop</Dropdown.Item> : null}
                      <Dropdown.Item onClick={() => { editPrescription(index); setShowInlineMenu(false); }}>Edit</Dropdown.Item>
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
                <span><strong>Dose:</strong> {dose || 'Not set'}</span>
                <span><strong>Frequency:</strong> {whenRequired && maxDose24h ? `${frequency} (max ${maxDose24h}/24h)` : (frequency || 'Not set')}</span>
                <span><strong>Route:</strong> {route || 'Not set'}</span>
              </div>
              <div className="prescription-chart-row__supporting">
                <span><strong>Start:</strong> {stat ? formatPrescriptionDateTime(start_date) : (formatPrescriptionDate(start_date) || 'Not set')}</span>
                <span><strong>Indication:</strong> {indication || 'Not recorded'}</span>
                <span><strong>Prescriber:</strong> {prescriber || 'Not recorded'}</span>
              </div>
              <div className="prescription-chart-row__approval">
                <strong>Pharm approval:</strong>
                <OverlayTrigger
                  placement="top"
                  overlay={<Tooltip id={`approval-${index}`}>{approvalLabel}</Tooltip>}
                >
                  <button
                    type="button"
                    className={`prescription-approval-toggle ${pharmacistApprovalStatus?.approved ? 'prescription-approval-toggle--approved' : ''}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleApproval(index);
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
                  <button
                    type="button"
                    className="admin-suspend-toggle btn btn-sm btn-primary"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSuspendMode(false);
                      onExitSuspendMode(index);
                    }}
                  >
                    Exit suspend mode
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
                    onClick={() => onChartAdministration(index, new Date(), { type: 'prn' })}
                    disabled={!prescribingStatus}
                  >
                    Administer
                  </Button>
                </div>
              ) : (
                <AdministrationTimeline
                  administrationList={administrations}
                  frequency={frequency}
                  scheduledTimes={scheduledTimes}
                  frequencyOptions={frequencyOptions}
                  admissionDate={admissionDate}
                  startDate={start_date}
                  endDate={end_date}
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
                <th>Prescriber</th>
                <th>Pharmacist approval</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{drug}</td>
                <td>{dose}</td>
                <td>{whenRequired && maxDose24h ? `${frequency} (max ${maxDose24h}/24h)` : frequency}</td>
                <td>{route}</td>
                <td>{stat ? (formatPrescriptionDateTime(start_date) || 'Not set') : (formatPrescriptionDate(start_date) || 'Not set')}</td>
                <td>{formatPrescriptionDate(end_date) || 'Open ended'}</td>
                <td>{indication || 'Not recorded'}</td>
                <td>{prescriber || 'Not recorded'}</td>
                <td>{approvalLabel}</td>
                <td>{status}</td>
              </tr>
            </tbody>
          </Table>

          <h5 className="mt-4">Amendment history</h5>
          <Table responsive bordered size="sm">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {amendmentHistory.length ? amendmentHistory.slice().reverse().map((item, itemIndex) => (
                <tr key={`${item.timestamp}-${itemIndex}`}>
                  <td>{formatDateTimeLabel(new Date(item.timestamp))}</td>
                  <td>{item.action}</td>
                  <td>{item.actor || 'Unknown user'}</td>
                  <td>{item.reason}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="text-center text-muted">No amendment history recorded yet.</td>
                </tr>
              )}
            </tbody>
          </Table>

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
