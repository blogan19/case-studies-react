import React, { useEffect, useMemo, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Table from 'react-bootstrap/Table';
import Icon from './Patient_record_icon';

const normalizeTasks = (caseNotes = {}) => (Array.isArray(caseNotes?.tasks) ? caseNotes.tasks : [])
  .map((item, index) => ({
    id: String(item?.id || `task-${index}`).trim(),
    title: String(item?.title || '').trim(),
    description: String(item?.description || '').trim(),
    assignedProfession: String(item?.assignedProfession || '').trim(),
    linkedPrescriptionId: String(item?.linkedPrescriptionId || '').trim(),
    linkedDrug: String(item?.linkedDrug || '').trim(),
    status: String(item?.status || 'open').trim() || 'open',
    createdAt: String(item?.createdAt || '').trim(),
    createdBy: String(item?.createdBy || '').trim(),
    completedAt: String(item?.completedAt || '').trim(),
    completedBy: String(item?.completedBy || '').trim(),
    suppressedAt: String(item?.suppressedAt || '').trim(),
    suppressedBy: String(item?.suppressedBy || '').trim(),
    suppressionReason: String(item?.suppressionReason || '').trim(),
  }))
  .filter((item) => item.title);

const formatDateTime = (value) => {
  if (!value) {
    return 'Not recorded';
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('en-GB');
};

const getTaskStatusLabel = (status) => {
  if (status === 'complete') {
    return 'Complete';
  }
  if (status === 'suppressed') {
    return 'Suppressed';
  }
  return 'Open';
};

const getTaskRowClassName = (status) => {
  if (status === 'complete') {
    return 'epma-task-row epma-task-row--complete';
  }
  if (status === 'suppressed') {
    return 'epma-task-row epma-task-row--suppressed';
  }
  return 'epma-task-row';
};

const TaskTable = ({ tasks, readOnly, onCompleteToggle, onOpenSuppressModal, emptyLabel }) => (
  <Table responsive bordered size="sm" className="container-shadow mb-0">
    <thead>
      <tr className="blue-back text-white">
        <th>Task</th>
        <th>Profession</th>
        <th>Linked to</th>
        <th>Created</th>
        <th>Status</th>
        <th className="text-end">Action</th>
      </tr>
    </thead>
    <tbody>
      {tasks.length ? tasks.map((task) => (
        <tr key={task.id} className={getTaskRowClassName(task.status)}>
          <td>
            <div className="fw-semibold">{task.title}</div>
            {task.description ? <div className="small text-muted">{task.description}</div> : null}
            {task.completedAt ? (
              <div className="small text-muted mt-1">
                Completed {formatDateTime(task.completedAt)} by {task.completedBy || 'Unknown user'}
              </div>
            ) : null}
          </td>
          <td>{task.assignedProfession || 'Not set'}</td>
          <td>{task.linkedDrug || 'General task'}</td>
          <td>
            <div>{formatDateTime(task.createdAt)}</div>
            <div className="small text-muted">{task.createdBy || 'Unknown user'}</div>
          </td>
          <td>{getTaskStatusLabel(task.status)}</td>
          <td className="text-end">
            {!readOnly && (task.status === 'open' || task.status === 'complete') ? (
              <div className="d-flex justify-content-end gap-2 flex-wrap">
                <Button
                  type="button"
                  size="sm"
                  variant={task.status === 'complete' ? 'outline-secondary' : 'outline-success'}
                  onClick={() => onCompleteToggle(task.id, task.status === 'complete' ? 'open' : 'complete')}
                >
                  {task.status === 'complete' ? 'Reopen' : 'Complete'}
                </Button>
                {task.status === 'open' ? (
                  <Button type="button" size="sm" variant="outline-danger" onClick={() => onOpenSuppressModal(task.id)}>
                    Suppress
                  </Button>
                ) : null}
              </div>
            ) : null}
          </td>
        </tr>
      )) : (
        <tr>
          <td colSpan={6} className="text-center text-muted">{emptyLabel}</td>
        </tr>
      )}
    </tbody>
  </Table>
);

const Tasks = ({ case_notes, onSaveCaseNotes, defaultAuthor = 'Student user', readOnly = false, showPanel, onShowPanelChange, activeChartTutorialStepKey = '', tutorialRefs = {} }) => {
  const [show, setShow] = useState(false);
  const [showSuppressModal, setShowSuppressModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [suppressingTaskId, setSuppressingTaskId] = useState('');
  const [suppressionReason, setSuppressionReason] = useState('');
  const tasks = useMemo(() => normalizeTasks(case_notes), [case_notes]);
  const openTaskCount = useMemo(() => tasks.filter((task) => task.status === 'open').length, [tasks]);
  const openTasks = useMemo(() => tasks.filter((task) => task.status === 'open'), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((task) => task.status === 'complete'), [tasks]);
  const historicalTasks = useMemo(
    () => tasks.filter((task) => task.status === 'suppressed').sort((left, right) => new Date(right.suppressedAt || 0) - new Date(left.suppressedAt || 0)),
    [tasks]
  );
  const taskLabel = `Tasks (${openTaskCount})`;

  useEffect(() => {
    if (typeof showPanel === 'boolean') {
      setShow(showPanel);
    }
  }, [showPanel]);

  const handleShowChange = (nextShow) => {
    setShow(nextShow);
    onShowPanelChange?.(nextShow);
  };

  const saveTasks = async ({ nextTasks, fieldLabel, previousValue, nextValue, successMessage }) => {
    if (!onSaveCaseNotes) {
      return;
    }

    await onSaveCaseNotes({
      fieldKey: 'tasks',
      fieldLabel,
      previousValue,
      nextValue,
      caseNotes: {
        ...(case_notes || {}),
        tasks: nextTasks,
      },
      successMessage,
    });
  };

  const updateTaskStatus = async (taskId, status) => {
    const existingTask = tasks.find((task) => task.id === taskId);
    if (!existingTask) {
      return;
    }

    const nextTask = {
      ...existingTask,
      status,
      completedAt: status === 'complete' ? new Date().toISOString() : '',
      completedBy: status === 'complete' ? defaultAuthor : '',
      suppressedAt: '',
      suppressedBy: '',
      suppressionReason: '',
    };

    await saveTasks({
      nextTasks: tasks.map((task) => (task.id === taskId ? nextTask : task)),
      fieldLabel: status === 'complete' ? 'Completed task' : 'Reopened task',
      previousValue: existingTask,
      nextValue: nextTask,
      successMessage: status === 'complete' ? 'Task completed.' : 'Task reopened.',
    });
  };

  const openSuppressModal = (taskId) => {
    setSuppressingTaskId(taskId);
    setSuppressionReason('');
    setShowSuppressModal(true);
  };

  const closeSuppressModal = () => {
    setShowSuppressModal(false);
    setSuppressingTaskId('');
    setSuppressionReason('');
  };

  const suppressTask = async () => {
    const existingTask = tasks.find((task) => task.id === suppressingTaskId);
    if (!existingTask || !suppressionReason.trim()) {
      return;
    }

    const nextTask = {
      ...existingTask,
      status: 'suppressed',
      suppressedAt: new Date().toISOString(),
      suppressedBy: defaultAuthor,
      suppressionReason: suppressionReason.trim(),
      completedAt: '',
      completedBy: '',
    };

    await saveTasks({
      nextTasks: tasks.map((task) => (task.id === suppressingTaskId ? nextTask : task)),
      fieldLabel: 'Suppressed task',
      previousValue: existingTask,
      nextValue: nextTask,
      successMessage: 'Task suppressed.',
    });

    closeSuppressModal();
  };

  return (
    <>
      <td onClick={() => handleShowChange(true)}>
        <Icon logo="bi bi-list-task" title_text={taskLabel} />
      </td>
      <Offcanvas show={show} onHide={() => handleShowChange(false)} style={{ width: '90%' }}>
        <Offcanvas.Header closeButton className="blue-back text-white">
          <Offcanvas.Title className="d-flex w-100 justify-content-between align-items-center gap-3">
            <span>{taskLabel}</span>
            <Button type="button" size="sm" variant="light" className="mr-3" onClick={() => setShowHistoryModal(true)}>
              Task history
            </Button>
            {'  '}
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <div
            ref={tutorialRefs.taskList}
            className={`mb-4 ${activeChartTutorialStepKey === 'task-list' ? 'epma-tutorial-target epma-tutorial-target--active' : ''}`}
          >
            <h5 className="mb-2">Open tasks</h5>
            <TaskTable
              tasks={openTasks}
              readOnly={readOnly}
              onCompleteToggle={updateTaskStatus}
              onOpenSuppressModal={openSuppressModal}
              emptyLabel="No open tasks."
            />
          </div>
          <div>
            <h5 className="mb-2">Completed tasks</h5>
            <TaskTable
              tasks={completedTasks}
              readOnly={readOnly}
              onCompleteToggle={updateTaskStatus}
              onOpenSuppressModal={openSuppressModal}
              emptyLabel="No completed tasks."
            />
          </div>
        </Offcanvas.Body>
      </Offcanvas>

      <Modal show={showHistoryModal} onHide={() => setShowHistoryModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>Task history</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table responsive bordered size="sm" className="container-shadow mb-0">
            <thead>
              <tr className="blue-back text-white">
                <th>Task</th>
                <th>Profession</th>
                <th>Linked to</th>
                <th>Created</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {historicalTasks.length ? historicalTasks.map((task) => (
                <tr key={task.id} className={getTaskRowClassName(task.status)}>
                  <td>
                    <div className="fw-semibold">{task.title}</div>
                    {task.description ? <div className="small text-muted">{task.description}</div> : null}
                  </td>
                  <td>{task.assignedProfession || 'Not set'}</td>
                  <td>{task.linkedDrug || 'General task'}</td>
                  <td>
                    <div>{formatDateTime(task.createdAt)}</div>
                    <div className="small text-muted">{task.createdBy || 'Unknown user'}</div>
                  </td>
                  <td>
                    <div className="fw-semibold">Suppressed</div>
                    <div className="small text-muted">
                      {formatDateTime(task.suppressedAt)} by {task.suppressedBy || 'Unknown user'}
                    </div>
                    <div className="epma-task-suppression-reason">
                      Reason: {task.suppressionReason || 'No reason recorded'}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="text-center text-muted">No suppressed task history recorded yet.</td>
                </tr>
              )}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>

      <Modal show={showSuppressModal} onHide={closeSuppressModal}>
        <Modal.Header closeButton>
          <Modal.Title>Suppress task</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning" className="mb-3">
            Suppress this task when it is no longer needed so the record keeps the reason for closing it out.
          </Alert>
          <Form.Group controlId="taskSuppressionReason">
            <Form.Label>Reason for suppression</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={suppressionReason}
              onChange={(event) => setSuppressionReason(event.target.value)}
              placeholder="Document why this task is no longer required"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="outline-secondary" onClick={closeSuppressModal}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={suppressTask} disabled={!suppressionReason.trim()}>
            Confirm suppression
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default Tasks;
