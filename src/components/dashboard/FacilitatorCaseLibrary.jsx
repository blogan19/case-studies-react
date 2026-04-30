import React, { useEffect, useMemo, useRef, useState } from 'react';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Table from 'react-bootstrap/Table';
import { getCaseStudyPublishValidation, hasManualStageProgression, hasStagedLiveCase, normalizeCaseStudy } from '../../lib/caseStudy';

const formatDateTime = (value) => {
  if (!value) {
    return 'Not yet';
  }
  try {
    return new Date(value).toLocaleString('en-GB');
  } catch (_error) {
    return value;
  }
};

const getStatusMeta = (caseStudy) => {
  if (caseStudy.status === 'live_classroom') {
    return { label: 'Live classroom', badge: 'warning', availability: 'Join code', availabilityBadge: 'warning' };
  }

  if (caseStudy.status === 'self_paced' || caseStudy.studentAccessEnabled) {
    return { label: 'Case Study Published', badge: 'primary', availability: 'Student access on', availabilityBadge: 'success' };
  }

  if (caseStudy.status === 'archived') {
    return { label: 'Archived', badge: 'secondary', availability: 'Students off', availabilityBadge: 'danger' };
  }

  if (caseStudy.status === 'closed') {
    return { label: 'Closed', badge: 'secondary', availability: 'Students off', availabilityBadge: 'danger' };
  }

  return { label: 'Draft', badge: 'secondary', availability: 'Not Published', availabilityBadge: 'danger' };
};

const getCaseStudyDraft = (caseStudy) => normalizeCaseStudy({
  ...(caseStudy?.draftData || {}),
  id: caseStudy?.id || '',
});

const getStudentShareSummary = (caseStudy) => {
  const studentShares = (caseStudy.shares || []).filter((share) => share.shareType === 'student');
  if (!studentShares.length) {
    return 'Not directly shared with students.';
  }

  const names = studentShares
    .slice(0, 3)
    .map((share) => share.recipientName || share.recipientEmail)
    .filter(Boolean);
  const extraCount = studentShares.length - names.length;
  return `Shared with ${names.join(', ')}${extraCount > 0 ? ` and ${extraCount} more` : ''}.`;
};

const CaseStudyStatus = ({ caseStudy, onToggleStudentAccess, onEndLiveClassroom }) => {
  const meta = getStatusMeta(caseStudy);
  const isLivePresentation = caseStudy.status === 'live_classroom';
  const isLiveCaseStudy = caseStudy.status === 'self_paced' || caseStudy.studentAccessEnabled;

  
  return (
    <div className="facilitator-library-status">
      <div className="facilitator-library-card__badges">
        {isLivePresentation || isLiveCaseStudy ? (
          <Button
            type="button"
            size="sm"
            variant={meta.badge}
            className="facilitator-library-status-pill"
            title={isLivePresentation ? 'End live classroom' : 'Turn self-paced access off'}
            onClick={() => {
              if (isLivePresentation) {
                onEndLiveClassroom?.(caseStudy.id);
                return;
              }
              onToggleStudentAccess?.(caseStudy.id, false);
            }}
          >
            {meta.label}
          </Button>
        ) : (
          <Badge bg={meta.badge}>{meta.label}</Badge>
        )}
        {meta.availability ? <Badge bg={meta.availabilityBadge}>{meta.availability}</Badge> : null}
      </div>
      <div className="small text-muted mt-2">
        {isLivePresentation
          ? `Available to the live classroom${caseStudy.activeSessionCode ? ` using code ${caseStudy.activeSessionCode}` : ''}.`
          : isLiveCaseStudy
            ? 'Available as a self-paced case from student links.'
            : 'Not currently available to students.'}
      </div>
      <div className="small text-muted">{getStudentShareSummary(caseStudy)}</div>
    </div>
  );
};

const ActionIconButton = ({ label, icon, variant, onClick }) => (
  <Button
    type="button"
    size="sm"
    variant={variant}
    className="facilitator-library-action-button"
    onClick={onClick}
    title={label}
    aria-label={label}
  >
    <i className={`bi ${icon}`} aria-hidden="true" />
  </Button>
);

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'live_classroom', label: 'Live presentation' },
  { value: 'self_paced', label: 'Case study' },
  { value: 'closed', label: 'Closed' },
  { value: 'archived', label: 'Archived' },
];

const PAGE_SIZE = 20;

const includesSearchText = (value, searchTerm) => String(value || '').toLowerCase().includes(searchTerm);

const getPageCount = (items) => Math.max(1, Math.ceil(items.length / PAGE_SIZE));

const FacilitatorCaseLibrary = ({
  ownedCaseStudies = [],
  caseStudySets = [],
  onBack,
  onCreateCaseStudy,
  onEditCaseStudy,
  onViewResults,
  onDeleteCaseStudy,
  onArchiveCaseStudy,
  onUnarchiveCaseStudy,
  onToggleStudentAccess,
  onEndLiveClassroom,
  onTestCaseStudy,
  onPublishCaseStudy,
  onPresentCaseStudy,
  onCopyPresentationLink,
  onShareCaseStudy,
  onRevokeCaseStudyShare,
  onCopyStudentLink,
  onCreateCaseStudySet,
  onUpdateCaseStudySet,
  onDeleteCaseStudySet,
  onShareCaseStudySet,
  onRefreshCaseStudies,
}) => {
  const filterControlsRef = useRef(null);
  const caseTableRef = useRef(null);
  const firstActionsRef = useRef(null);
  const firstPublishRef = useRef(null);
  const setsSectionRef = useRef(null);
  const [shareTarget, setShareTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [historyLoadingId, setHistoryLoadingId] = useState('');
  const [sharesTarget, setSharesTarget] = useState(null);
  const [caseSearch, setCaseSearch] = useState('');
  const [casePage, setCasePage] = useState(1);
  const [setSearch, setSetSearch] = useState('');
  const [setPage, setSetPage] = useState(1);
  const [shareEmail, setShareEmail] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [shareSubmitting, setShareSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [revokeSubmitting, setRevokeSubmitting] = useState('');
  const [shareError, setShareError] = useState('');
  const [setEditorTarget, setSetEditorTarget] = useState(null);
  const [showSetEditor, setShowSetEditor] = useState(false);
  const [setFields, setSetFields] = useState({ title: '', description: '', caseStudyIds: [] });
  const [setSubmitting, setSetSubmitting] = useState(false);
  const [caseStudySetDeleteTarget, setCaseStudySetDeleteTarget] = useState(null);
  const [caseStudySetShareTarget, setCaseStudySetShareTarget] = useState(null);
  const [caseStudySetShareEmail, setCaseStudySetShareEmail] = useState('');
  const [caseStudySetShareSubmitting, setCaseStudySetShareSubmitting] = useState(false);
  const [publishTarget, setPublishTarget] = useState(null);
  const [publishSubmitting, setPublishSubmitting] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialCardStyle, setTutorialCardStyle] = useState({});

  const totals = useMemo(() => ({
    owned: ownedCaseStudies.length,
  }), [ownedCaseStudies.length]);
  const sortedOwnedCaseStudies = useMemo(
    () => [...ownedCaseStudies].sort((left, right) => String(left.title || '').localeCompare(String(right.title || ''), 'en-GB', { sensitivity: 'base' })),
    [ownedCaseStudies]
  );
  const caseSearchTerm = caseSearch.trim().toLowerCase();
  const filteredOwnedCaseStudies = useMemo(() => {
    return sortedOwnedCaseStudies.filter((caseStudy) => {
      const matchesStatus = (() => {
        if (statusFilter === 'all') {
          return true;
        }
        if (statusFilter === 'self_paced') {
          return caseStudy.status === 'self_paced' || caseStudy.studentAccessEnabled;
        }
        return caseStudy.status === statusFilter;
      })();

      if (!matchesStatus) {
        return false;
      }

      if (!caseSearchTerm) {
        return true;
      }

      return [
        caseStudy.title,
        caseStudy.draftData?.short_description,
        caseStudy.summary,
        caseStudy.activeSessionCode,
      ].some((value) => includesSearchText(value, caseSearchTerm));
    });
  }, [sortedOwnedCaseStudies, statusFilter, caseSearchTerm]);
  const casePageCount = useMemo(() => getPageCount(filteredOwnedCaseStudies), [filteredOwnedCaseStudies]);
  const pagedOwnedCaseStudies = useMemo(() => {
    const startIndex = (casePage - 1) * PAGE_SIZE;
    return filteredOwnedCaseStudies.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredOwnedCaseStudies, casePage]);
  const sortedCaseStudySets = useMemo(
    () => [...caseStudySets].sort((left, right) => String(left.title || '').localeCompare(String(right.title || ''), 'en-GB', { sensitivity: 'base' })),
    [caseStudySets]
  );
  const setSearchTerm = setSearch.trim().toLowerCase();
  const filteredCaseStudySets = useMemo(() => (
    sortedCaseStudySets.filter((caseStudySet) => {
      if (!setSearchTerm) {
        return true;
      }

      return [
        caseStudySet.title,
        caseStudySet.description,
        ...(caseStudySet.caseStudies || []).map((item) => item.title),
      ].some((value) => includesSearchText(value, setSearchTerm));
    })
  ), [sortedCaseStudySets, setSearchTerm]);
  const setPageCount = useMemo(() => getPageCount(filteredCaseStudySets), [filteredCaseStudySets]);
  const pagedCaseStudySets = useMemo(() => {
    const startIndex = (setPage - 1) * PAGE_SIZE;
    return filteredCaseStudySets.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredCaseStudySets, setPage]);
  const eligibleSetCaseStudies = useMemo(
    () => sortedOwnedCaseStudies.filter((caseStudy) => caseStudy.status !== 'live_classroom'),
    [sortedOwnedCaseStudies]
  );
  const tutorialSteps = useMemo(() => ([
    {
      key: 'filters',
      title: 'Filter and find cases',
      body: 'Use status filters and search to narrow the library by title, description, or live classroom code.',
      ref: filterControlsRef,
    },
    {
      key: 'cases',
      title: 'Review case status',
      body: 'Each row shows the case name, current publication status, student availability, recent activity, and last updated date.',
      ref: caseTableRef,
    },
    {
      key: 'actions',
      title: 'Manage each case',
      body: 'Use these actions to edit, review results, share, manage student shares, present live cases, copy links, archive, or delete.',
      ref: firstActionsRef,
    },
    {
      key: 'publish',
      title: 'Publish or present',
      body: 'Start a live classroom for real-time teaching, or publish a self-paced case study for students to complete independently.',
      ref: firstPublishRef,
    },
    {
      key: 'sets',
      title: 'Group cases into sets',
      body: 'Case study sets let you bundle related non-live cases and share the whole group with students.',
      ref: setsSectionRef,
    },
  ]), []);

  React.useEffect(() => {
    setCasePage(1);
  }, [statusFilter, caseSearch]);

  React.useEffect(() => {
    if (casePage > casePageCount) {
      setCasePage(casePageCount);
    }
  }, [casePage, casePageCount]);

  React.useEffect(() => {
    setSetPage(1);
  }, [setSearch]);

  React.useEffect(() => {
    if (setPage > setPageCount) {
      setSetPage(setPageCount);
    }
  }, [setPage, setPageCount]);

  useEffect(() => {
    if (!showTutorial) {
      return;
    }

    const targetNode = tutorialSteps[tutorialStep]?.ref?.current;
    if (targetNode?.scrollIntoView) {
      targetNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [showTutorial, tutorialStep, tutorialSteps]);

  useEffect(() => {
    if (!showTutorial) {
      setTutorialCardStyle({});
      return undefined;
    }

    const updateTutorialCardPosition = () => {
      const targetNode = tutorialSteps[tutorialStep]?.ref?.current;
      if (!targetNode) {
        setTutorialCardStyle({
          width: 'min(420px, calc(100vw - 2rem))',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        });
        return;
      }

      const rect = targetNode.getBoundingClientRect();
      const cardWidth = Math.min(420, window.innerWidth - 32);
      const gutter = 16;
      const canPlaceRight = rect.right + gutter + cardWidth <= window.innerWidth - 16;
      const canPlaceLeft = rect.left - gutter - cardWidth >= 16;
      let left;
      let top;

      if (canPlaceRight) {
        left = rect.right + gutter;
        top = rect.top;
      } else if (canPlaceLeft) {
        left = rect.left - gutter - cardWidth;
        top = rect.top;
      } else {
        left = Math.max(16, Math.min(rect.left, window.innerWidth - cardWidth - 16));
        top = rect.bottom + gutter;
        if (top + 240 > window.innerHeight) {
          top = Math.max(16, rect.top - 240 - gutter);
        }
      }

      setTutorialCardStyle({
        width: `${cardWidth}px`,
        top: `${Math.max(16, top)}px`,
        left: `${Math.max(16, left)}px`,
        transform: 'none',
      });
    };

    updateTutorialCardPosition();
    window.addEventListener('resize', updateTutorialCardPosition);
    window.addEventListener('scroll', updateTutorialCardPosition, true);
    return () => {
      window.removeEventListener('resize', updateTutorialCardPosition);
      window.removeEventListener('scroll', updateTutorialCardPosition, true);
    };
  }, [showTutorial, tutorialStep, tutorialSteps]);

  const closeTutorial = () => {
    setShowTutorial(false);
    setTutorialStep(0);
  };

  const isTutorialTargetActive = (key) => showTutorial && tutorialSteps[tutorialStep]?.key === key;

  const openShareModal = (caseStudy) => {
    setShareTarget(caseStudy);
    setShareEmail('');
    setShareError('');
  };

  const closeShareModal = () => {
    setShareTarget(null);
    setShareEmail('');
    setShareSubmitting(false);
    setShareError('');
  };

  const openDeleteModal = (caseStudy) => {
    setDeleteTarget(caseStudy);
    setDeleteSubmitting(false);
  };

  const closeDeleteModal = () => {
    setDeleteTarget(null);
    setDeleteSubmitting(false);
  };

  const openHistoryModal = async (caseStudy) => {
    setHistoryLoadingId(caseStudy.id);
    try {
      const refreshed = await onRefreshCaseStudies?.(caseStudy.id);
      const refreshedCase = (refreshed?.ownedCaseStudies || []).find((item) => item.id === caseStudy.id);
      setHistoryTarget(refreshedCase || caseStudy);
    } finally {
      setHistoryLoadingId('');
    }
  };

  const closeHistoryModal = () => {
    setHistoryTarget(null);
  };

  const openSharesModal = (caseStudy) => {
    setSharesTarget(caseStudy);
    setRevokeSubmitting('');
  };

  const closeSharesModal = () => {
    setSharesTarget(null);
    setRevokeSubmitting('');
  };

  const submitShare = async (event) => {
    event.preventDefault();
    if (!shareTarget) {
      return;
    }
    setShareSubmitting(true);
    setShareError('');
    try {
      await onShareCaseStudy(shareTarget.id, shareEmail.trim());
      closeShareModal();
    } catch (error) {
      setShareError(error.message || 'Unable to share this case study.');
      setShareSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    setDeleteSubmitting(true);
    try {
      await onDeleteCaseStudy(deleteTarget.id);
      closeDeleteModal();
    } catch (_error) {
      setDeleteSubmitting(false);
    }
  };

  const revokeShare = async (caseStudyId, shareId) => {
    if (!onRevokeCaseStudyShare) {
      return;
    }
    setRevokeSubmitting(shareId);
    try {
      await onRevokeCaseStudyShare(caseStudyId, shareId);
    } finally {
      setRevokeSubmitting('');
    }
  };

  const openSetEditor = (caseStudySet = null) => {
    setSetEditorTarget(caseStudySet);
    setSetFields({
      title: caseStudySet?.title || '',
      description: caseStudySet?.description || '',
      caseStudyIds: (caseStudySet?.caseStudies || []).map((item) => item.caseStudyId),
    });
    setShowSetEditor(true);
  };

  const closeSetEditor = () => {
    setShowSetEditor(false);
    setSetEditorTarget(null);
    setSetFields({ title: '', description: '', caseStudyIds: [] });
    setSetSubmitting(false);
  };

  const submitSetEditor = async (event) => {
    event?.preventDefault?.();
    setSetSubmitting(true);
    try {
      const payload = {
        title: setFields.title.trim(),
        description: setFields.description.trim(),
        caseStudyIds: setFields.caseStudyIds,
      };
      if (setEditorTarget?.id) {
        await onUpdateCaseStudySet(setEditorTarget.id, payload);
      } else {
        await onCreateCaseStudySet(payload);
      }
      closeSetEditor();
    } catch (_error) {
      setSetSubmitting(false);
    }
  };

  const toggleSetCaseStudy = (caseStudyId) => {
    setSetFields((current) => ({
      ...current,
      caseStudyIds: current.caseStudyIds.includes(caseStudyId)
        ? current.caseStudyIds.filter((item) => item !== caseStudyId)
        : [...current.caseStudyIds, caseStudyId],
    }));
  };

  const confirmDeleteSet = async () => {
    if (!caseStudySetDeleteTarget) {
      return;
    }
    setSetSubmitting(true);
    try {
      await onDeleteCaseStudySet(caseStudySetDeleteTarget.id);
      setCaseStudySetDeleteTarget(null);
      setSetSubmitting(false);
    } catch (_error) {
      setSetSubmitting(false);
    }
  };

  const openPublishModal = (caseStudy, mode) => {
    setPublishTarget({ caseStudy, mode });
    setPublishSubmitting(false);
  };

  const closePublishModal = () => {
    setPublishTarget(null);
    setPublishSubmitting(false);
  };

  const submitPublish = async () => {
    if (!publishTarget || !onPublishCaseStudy) {
      return;
    }

    setPublishSubmitting(true);
    try {
      await onPublishCaseStudy(publishTarget.caseStudy.id, publishTarget.mode);
      closePublishModal();
    } catch (_error) {
      setPublishSubmitting(false);
    }
  };

  const submitSetShare = async (event) => {
    event?.preventDefault?.();
    if (!caseStudySetShareTarget) {
      return;
    }
    setCaseStudySetShareSubmitting(true);
    try {
      await onShareCaseStudySet(caseStudySetShareTarget.id, caseStudySetShareEmail.trim());
      setCaseStudySetShareTarget(null);
      setCaseStudySetShareEmail('');
      setCaseStudySetShareSubmitting(false);
    } catch (_error) {
      setCaseStudySetShareSubmitting(false);
    }
  };

  return (
    <>
      <div className="student-page">
        <Container fluid className="mt-4 mb-5 px-4 student-page__content facilitator-library-shell">
          <div className="student-dashboard-shell">
            <div className="student-dashboard-header">
              <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                <div>
                  <h2 className="mb-2">View and share case studies</h2>
                  <p className="student-dashboard-header__copy mb-1">
                    Manage your own case studies, share them with students, and review usage statistics.
                  </p>
                </div>
              </div>
              <Button type="button" variant="outline-light" className="btn-sm" onClick={onBack}>
                <i className="bi bi-arrow-left" aria-hidden="true" />{' '}
                Back
              </Button>
              {' '}
              <Button
                type="button"
                variant="light"
                className="btn-sm"
                onClick={() => {
                  setTutorialStep(0);
                  setShowTutorial(true);
                }}
              >
                <i className="bi bi-question-circle" aria-hidden="true" />{' '}
                Tutorial
              </Button>
            </div>

            <div className="student-dashboard-section">
              <div className="student-dashboard-section__header">
                <h4 className="mb-1">My case studies</h4>
                <p className="student-dashboard-header__copy mb-0">
                  {totals.owned} owned case{totals.owned === 1 ? '' : 's'} available.
                </p>
              </div>
              <div
                ref={filterControlsRef}
                className={isTutorialTargetActive('filters') ? 'epma-tutorial-target epma-tutorial-target--active' : ''}
              >
                <div className="d-flex gap-2 flex-wrap">
                  {FILTER_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      size="sm"
                      variant={statusFilter === option.value ? 'primary' : 'outline-secondary'}
                      onClick={() => setStatusFilter(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
                <div className="d-flex justify-content-between align-items-end gap-3 flex-wrap mt-3">
                <Form.Group controlId="facilitatorCaseSearch" className="mb-0" style={{ minWidth: '280px', flex: '1 1 320px' }}>
                  <Form.Label className="small text-muted mb-1">Search case studies</Form.Label>
                  <Form.Control
                    type="search"
                    value={caseSearch}
                    onChange={(event) => setCaseSearch(event.target.value)}
                    placeholder="Search by title, description, or live code"
                  />
                </Form.Group>
                <div className="small text-muted">
                  Showing {filteredOwnedCaseStudies.length ? ((casePage - 1) * PAGE_SIZE) + 1 : 0}
                  {' '}-{' '}
                  {Math.min(casePage * PAGE_SIZE, filteredOwnedCaseStudies.length)}
                  {' '}of {filteredOwnedCaseStudies.length}
                </div>
                </div>
              </div>
              {filteredOwnedCaseStudies.length ? (
                <>
                <div
                  ref={caseTableRef}
                  className={`table-responsive ${isTutorialTargetActive('cases') ? 'epma-tutorial-target epma-tutorial-target--active' : ''}`}
                >
                  <Table bordered hover className="facilitator-library-table align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Case study</th>
                        <th>Status</th>
                        <th>Updated</th>
                        <th>History</th>
                        <th>Actions</th>
                        <th>Publish</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedOwnedCaseStudies.map((caseStudy) => (
                        <tr key={caseStudy.id}>
                          <td>
                            <div className="fw-semibold">{caseStudy.title}</div>
                            <div className="small text-muted">
                              {caseStudy.draftData?.short_description || caseStudy.summary || 'No description added yet.'}
                            </div>
                            {caseStudy.activeSessionCode ? (
                              <div className="small text-muted">Live code {caseStudy.activeSessionCode}</div>
                            ) : null}
                          </td>
                          <td>
                            <CaseStudyStatus
                              caseStudy={caseStudy}
                              onToggleStudentAccess={onToggleStudentAccess}
                              onEndLiveClassroom={onEndLiveClassroom}
                            />
                          </td>
                          <td className="small">{formatDateTime(caseStudy.updatedAt)}</td>
                          <td>
                              <Button type="button" size="sm" variant="outline-dark" onClick={() => openHistoryModal(caseStudy)} disabled={historyLoadingId === caseStudy.id}>
                                {historyLoadingId === caseStudy.id
                                  ? 'Loading history...'
                                  : caseStudy.recentAccesses?.length ? `View history (${caseStudy.recentAccesses.length})` : 'View history'}
                              </Button>
                          </td>
                          <td>
                            <div
                              ref={casePage === 1 && pagedOwnedCaseStudies[0]?.id === caseStudy.id ? firstActionsRef : null}
                              className={`facilitator-library-card__actions ${isTutorialTargetActive('actions') && casePage === 1 && pagedOwnedCaseStudies[0]?.id === caseStudy.id ? 'epma-tutorial-target epma-tutorial-target--active' : ''}`}
                            >
                              
                              <ActionIconButton label="Edit case study" icon="bi-pencil-square" variant="primary" onClick={() => onEditCaseStudy(caseStudy.id)} />
                              <ActionIconButton label="Test case study" icon="bi-play-circle-fill" variant="success" onClick={() => onTestCaseStudy(caseStudy.id)} />
                              <ActionIconButton label="View results" icon="bi-clipboard-data" variant="dark" onClick={() => onViewResults(caseStudy.id)} />
                              <ActionIconButton label="Share case study" icon="bi-share-fill" variant="info" onClick={() => openShareModal(caseStudy)} />
                              <ActionIconButton
                                label="Manage student shares"
                                icon="bi-people-fill"
                                variant="secondary"
                                onClick={() => openSharesModal(caseStudy)}
                              />
                              
                              {caseStudy.status === 'live_classroom' && caseStudy.activeSessionCode ? (
                                <>
                                  <ActionIconButton label="Present live case" icon="bi-easel-fill" variant="success" onClick={() => onPresentCaseStudy(caseStudy.id)} />
                                  <ActionIconButton label="Copy presentation link" icon="bi-link-45deg" variant="secondary" onClick={() => onCopyPresentationLink(caseStudy.id)} />
                                  <ActionIconButton label="End live session" icon="bi-stop-circle-fill" variant="warning" onClick={() => onEndLiveClassroom(caseStudy.id)} />
                                </>
                              ) : null}
                              {(caseStudy.status === 'self_paced' || caseStudy.studentAccessEnabled) ? (
                                <ActionIconButton label="Copy student link" icon="bi-link-45deg" variant="secondary" onClick={() => onCopyStudentLink(caseStudy.id)} />
                              ) : null}
                              {caseStudy.status !== 'archived' ? (
                                <ActionIconButton
                                  label="Archive case study"
                                  icon="bi-archive-fill"
                                  variant="secondary"
                                  onClick={() => onArchiveCaseStudy(caseStudy.id)}
                                />
                              ) : null}
                              {caseStudy.status === 'archived' ? (
                                <ActionIconButton
                                  label="Restore archived case"
                                  icon="bi-arrow-counterclockwise"
                                  variant="success"
                                  onClick={() => onUnarchiveCaseStudy(caseStudy.id)}
                                />
                              ) : null}
                              <ActionIconButton label="Delete case study" icon="bi-trash-fill" variant="danger" onClick={() => openDeleteModal(caseStudy)} />
                            </div>
                          </td>
                          <td
                            ref={casePage === 1 && pagedOwnedCaseStudies[0]?.id === caseStudy.id ? firstPublishRef : null}
                            className={isTutorialTargetActive('publish') && casePage === 1 && pagedOwnedCaseStudies[0]?.id === caseStudy.id ? 'epma-tutorial-target epma-tutorial-target--active' : ''}
                          >
                            {caseStudy.status !== 'archived' ? (
                                <>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="success"
                                    onClick={() => openPublishModal(caseStudy, 'live_classroom')}
                                  >
                                    {caseStudy.status === 'live_classroom' ? 'Update live classroom' : 'Start live classroom'}
                                  </Button>
                                  {' '}
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="info"
                                    onClick={() => openPublishModal(caseStudy, 'self_paced')}
                                  >
                                    {caseStudy.status === 'self_paced' || caseStudy.studentAccessEnabled ? 'Update Case Study' : 'Publish Case Study'}
                                  </Button>
                                </>
                              ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
                {casePageCount > 1 ? (
                  <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap mt-3">
                    <div className="small text-muted">Page {casePage} of {casePageCount}</div>
                    <div className="d-flex gap-2 flex-wrap">
                      <Button type="button" size="sm" variant="outline-secondary" onClick={() => setCasePage((current) => Math.max(1, current - 1))} disabled={casePage === 1}>
                        Previous
                      </Button>
                      <Button type="button" size="sm" variant="outline-secondary" onClick={() => setCasePage((current) => Math.min(casePageCount, current + 1))} disabled={casePage === casePageCount}>
                        Next
                      </Button>
                    </div>
                  </div>
                ) : null}
                </>
              ) : (
                <div className="student-dashboard-empty">
                  <i className="bi bi-folder2-open" aria-hidden="true" />
                  <div>{ownedCaseStudies.length ? 'No case studies match this filter.' : 'No case studies in your workspace yet.'}</div>
                </div>
              )}
            </div>

            <div
              ref={setsSectionRef}
              className={`student-dashboard-section ${isTutorialTargetActive('sets') ? 'epma-tutorial-target epma-tutorial-target--active' : ''}`}
            >
              <div className="student-dashboard-section__header">
                <h4 className="mb-1">Case study sets</h4>
                <p className="student-dashboard-header__copy mb-0">
                  Group non-live case studies into sets and share the whole set with students.
                </p>
              </div>
              <div className="d-flex justify-content-end mb-3">
                <Button type="button" variant="primary" onClick={() => openSetEditor()}>
                  Create case study set
                </Button>
              </div>
              <div className="d-flex justify-content-between align-items-end gap-3 flex-wrap">
                <Form.Group controlId="facilitatorSetSearch" className="mb-0" style={{ minWidth: '280px', flex: '1 1 320px' }}>
                  <Form.Label className="small text-muted mb-1">Search case study sets</Form.Label>
                  <Form.Control
                    type="search"
                    value={setSearch}
                    onChange={(event) => setSetSearch(event.target.value)}
                    placeholder="Search by set title, description, or included case"
                  />
                </Form.Group>
                <div className="small text-muted">
                  Showing {filteredCaseStudySets.length ? ((setPage - 1) * PAGE_SIZE) + 1 : 0}
                  {' '}-{' '}
                  {Math.min(setPage * PAGE_SIZE, filteredCaseStudySets.length)}
                  {' '}of {filteredCaseStudySets.length}
                </div>
              </div>
              {filteredCaseStudySets.length ? (
                <>
                <div className="table-responsive">
                  <Table bordered hover className="facilitator-library-table align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Set</th>
                        <th>Included cases</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedCaseStudySets.map((caseStudySet) => (
                        <tr key={caseStudySet.id}>
                          <td>
                            <div className="fw-semibold">{caseStudySet.title}</div>
                            <div className="small text-muted">{caseStudySet.description || 'No description added yet.'}</div>
                          </td>
                          <td className="small">{(caseStudySet.caseStudies || []).map((item) => item.title).join(', ') || 'No cases added yet.'}</td>
                          <td>
                            <div className="facilitator-library-card__actions">
                              <ActionIconButton label="Edit case study set" icon="bi-pencil-square" variant="primary" onClick={() => openSetEditor(caseStudySet)} />
                              <ActionIconButton label="Share case study set" icon="bi-share-fill" variant="info" onClick={() => { setCaseStudySetShareTarget(caseStudySet); setCaseStudySetShareEmail(''); }} />
                              <ActionIconButton label="Delete case study set" icon="bi-trash-fill" variant="danger" onClick={() => setCaseStudySetDeleteTarget(caseStudySet)} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
                {setPageCount > 1 ? (
                  <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap mt-3">
                    <div className="small text-muted">Page {setPage} of {setPageCount}</div>
                    <div className="d-flex gap-2 flex-wrap">
                      <Button type="button" size="sm" variant="outline-secondary" onClick={() => setSetPage((current) => Math.max(1, current - 1))} disabled={setPage === 1}>
                        Previous
                      </Button>
                      <Button type="button" size="sm" variant="outline-secondary" onClick={() => setSetPage((current) => Math.min(setPageCount, current + 1))} disabled={setPage === setPageCount}>
                        Next
                      </Button>
                    </div>
                  </div>
                ) : null}
                </>
              ) : (
                <div className="student-dashboard-empty">
                  <i className="bi bi-collection" aria-hidden="true" />
                  <div>{caseStudySets.length ? 'No case study sets match this search.' : 'No case study sets yet.'}</div>
                </div>
              )}
            </div>
          </div>
        </Container>
      </div>

      {showTutorial ? (
        <div className="epma-tutorial-overlay" role="dialog" aria-modal="true" aria-labelledby="caseLibraryTutorialTitle">
          <div className="epma-tutorial-overlay__backdrop" onClick={closeTutorial} />
          <Card className="epma-tutorial-card container-shadow" style={tutorialCardStyle}>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                <div>
                  <div className="epma-tutorial-card__eyebrow">
                    Step {tutorialStep + 1} of {tutorialSteps.length}
                  </div>
                  <h4 id="caseLibraryTutorialTitle" className="mb-1">{tutorialSteps[tutorialStep]?.title}</h4>
                </div>
                <button type="button" className="epma-close-button" onClick={closeTutorial} aria-label="Skip tutorial">
                  <i className="bi bi-x-lg" aria-hidden="true" />
                </button>
              </div>
              <p className="mb-0">{tutorialSteps[tutorialStep]?.body}</p>
              <div className="epma-tutorial-card__actions">
                <Button type="button" variant="outline-secondary" onClick={closeTutorial}>
                  Skip
                </Button>
                <div className="d-flex gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline-secondary"
                    onClick={() => setTutorialStep((current) => Math.max(0, current - 1))}
                    disabled={tutorialStep === 0}
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (tutorialStep === tutorialSteps.length - 1) {
                        closeTutorial();
                        return;
                      }
                      setTutorialStep((current) => current + 1);
                    }}
                  >
                    {tutorialStep === tutorialSteps.length - 1 ? 'Finish' : 'Next'}
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>
      ) : null}

      <Modal show={Boolean(shareTarget)} onHide={closeShareModal}>
        <Modal.Header closeButton>
          <Modal.Title>Share case study</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={submitShare}>
            <div className="mb-3">
              <div className="fw-semibold">{shareTarget?.title}</div>
              <div className="small text-muted">
                Share this case study with a student by email.
              </div>
            </div>
            <Form.Group className="mb-3" controlId="shareCaseEmail">
              <Form.Label>Email address</Form.Label>
              <Form.Control
                type="email"
                value={shareEmail}
                onChange={(event) => setShareEmail(event.target.value)}
                placeholder="name@example.com"
              />
            </Form.Group>
            <Alert variant="info" className="mb-3">
              Students still need to be logged in, and the case must have student access turned on to open from the shared link.
            </Alert>
            {shareError ? <Alert variant="danger">{shareError}</Alert> : null}
            <div className="d-flex justify-content-end gap-2">
              <Button type="button" variant="secondary" onClick={closeShareModal}>Cancel</Button>
              <Button type="submit" disabled={!shareEmail.trim() || shareSubmitting}>
                {shareSubmitting ? 'Sharing...' : 'Share case study'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      <Modal show={Boolean(deleteTarget)} onHide={closeDeleteModal}>
        <Modal.Header closeButton>
          <Modal.Title>Delete case study</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-2">Delete <strong>{deleteTarget?.title}</strong> from your workspace?</p>
          <div className="small text-muted">
            This cannot be undone.
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={closeDeleteModal}>Cancel</Button>
          <Button type="button" variant="danger" onClick={confirmDelete} disabled={deleteSubmitting}>
            {deleteSubmitting ? 'Deleting...' : 'Confirm delete'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(historyTarget)} onHide={closeHistoryModal}>
        <Modal.Header closeButton>
          <Modal.Title>Student access history</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="fw-semibold mb-3">{historyTarget?.title}</div>
          {historyTarget?.recentAccesses?.length ? (
            <div className="facilitator-library-access-list">
              {historyTarget.recentAccesses.map((attempt, index) => (
                <div key={`${attempt.learnerEmail}-${attempt.updatedAt}-${index}`} className="facilitator-library-access-list__item">
                  <div className="fw-semibold">{attempt.learnerName || attempt.learnerEmail}</div>
                  <div className="small text-muted">{attempt.learnerEmail}</div>
                  <div className="small text-muted">
                    {attempt.accessType === 'live_session'
                      ? `Viewed live session${attempt.sessionCode ? ` ${attempt.sessionCode}` : ''}`
                      : 'Opened self-paced case'}{' '}
                    {formatDateTime(attempt.startedAt)}
                  </div>
                  <div className="small text-muted">Last activity {formatDateTime(attempt.updatedAt)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted">No student access recorded yet.</div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={closeHistoryModal}>Close</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(sharesTarget)} onHide={closeSharesModal}>
        <Modal.Header closeButton>
          <Modal.Title>Manage student shares</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="fw-semibold mb-3">{sharesTarget?.title}</div>
          {sharesTarget?.shares?.filter((share) => share.shareType === 'student').length ? (
            <div className="facilitator-library-access-list">
              {sharesTarget.shares.filter((share) => share.shareType === 'student').map((share) => (
                <div key={share.id} className="facilitator-library-access-list__item">
                  <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                    <div>
                      <div className="fw-semibold">{share.recipientName || share.recipientEmail}</div>
                      <div className="small text-muted">{share.recipientEmail}</div>
                      <div className="small text-muted">Shared {formatDateTime(share.sharedAt)}</div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      onClick={() => revokeShare(sharesTarget.id, share.id)}
                      disabled={revokeSubmitting === share.id}
                    >
                      {revokeSubmitting === share.id ? 'Removing...' : 'Remove'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted">This case study has not been shared with any students yet.</div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={closeSharesModal}>Close</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(publishTarget)} onHide={closePublishModal}>
        <Modal.Header closeButton>
          <Modal.Title>
            {publishTarget?.mode === 'live_classroom' ? 'Start live classroom' : 'Publish self-paced'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {publishTarget ? (() => {
            const draft = getCaseStudyDraft(publishTarget.caseStudy);
            const validation = getCaseStudyPublishValidation(draft);
            const stagedNeedsLiveControl = hasManualStageProgression(draft) && publishTarget.mode !== 'live_classroom';
            const isQuestionTriggeredStagedCase = hasStagedLiveCase(draft) && !hasManualStageProgression(draft);
            return (
              <>
                <div className="mb-3">
                  <div className="fw-semibold">{publishTarget.caseStudy.title}</div>
                  <div className="small text-muted">
                    {publishTarget.mode === 'live_classroom'
                      ? 'Students will join with a live classroom code.'
                      : 'Students will be able to open the published version from shared links.'}
                  </div>
                </div>
                <div className="facilitator-validation-list">
                  {validation.requiredChecks.map((check) => (
                    <div
                      key={check.key}
                      className={`facilitator-validation-list__item${check.passed ? ' facilitator-validation-list__item--pass' : ' facilitator-validation-list__item--fail'}`}
                    >
                      <div className="fw-semibold">{check.label}</div>
                      <div className="small">{check.passed ? 'Ready' : 'Still needed'}</div>
                    </div>
                  ))}
                </div>
                {stagedNeedsLiveControl ? (
                  <Alert variant="warning" className="mt-3 mb-0">
                    This staged case includes manually advanced stages, so it can only be started as a live classroom session. To publish it as a normal case study, set each later stage to trigger after a question is answered.
                  </Alert>
                ) : !validation.ready ? (
                  <Alert variant="warning" className="mt-3 mb-0">
                    Complete the required items in the editor before publishing this case.
                  </Alert>
                ) : isQuestionTriggeredStagedCase && publishTarget.mode !== 'live_classroom' ? (
                  <Alert variant="info" className="mt-3 mb-0">
                    This staged case will publish as a normal case study. Students will move through the stages automatically after answering the configured trigger questions.
                  </Alert>
                ) : (
                  <Alert variant="info" className="mt-3 mb-0">
                    Publishing uses the latest saved draft. Unsaved editor changes will not be included.
                  </Alert>
                )}
              </>
            );
          })() : null}
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={closePublishModal}>Cancel</Button>
          <Button
            type="button"
            variant={publishTarget?.mode === 'live_classroom' ? 'success' : 'info'}
            onClick={submitPublish}
            disabled={publishSubmitting || (publishTarget ? (
              !getCaseStudyPublishValidation(getCaseStudyDraft(publishTarget.caseStudy)).ready
              || (hasManualStageProgression(getCaseStudyDraft(publishTarget.caseStudy)) && publishTarget.mode !== 'live_classroom')
            ) : true)}
          >
            {publishSubmitting
              ? 'Publishing...'
              : publishTarget?.mode === 'live_classroom'
                ? 'Start live classroom'
                : 'Publish self-paced'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showSetEditor} onHide={closeSetEditor} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{setEditorTarget ? 'Edit case study set' : 'Create case study set'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={submitSetEditor}>
            <Form.Group className="mb-3" controlId="caseStudySetTitle">
              <Form.Label>Set title</Form.Label>
              <Form.Control
                type="text"
                value={setFields.title}
                onChange={(event) => setSetFields((current) => ({ ...current, title: event.target.value }))}
                placeholder="e.g. Cardiology revision set"
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="caseStudySetDescription">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={setFields.description}
                onChange={(event) => setSetFields((current) => ({ ...current, description: event.target.value }))}
                placeholder="Optional short summary for students"
              />
            </Form.Group>
            <Form.Group controlId="caseStudySetCases">
              <Form.Label>Include case studies</Form.Label>
              <div className="border rounded p-3 facilitator-library-set-list">
                {eligibleSetCaseStudies.length ? eligibleSetCaseStudies.map((caseStudy) => (
                  <Form.Check
                    key={caseStudy.id}
                    type="checkbox"
                    id={`set-case-${caseStudy.id}`}
                    className="mb-2"
                    label={`${caseStudy.title} (${caseStudy.status === 'self_paced' || caseStudy.studentAccessEnabled ? 'live case study' : 'not live'})`}
                    checked={setFields.caseStudyIds.includes(caseStudy.id)}
                    onChange={() => toggleSetCaseStudy(caseStudy.id)}
                  />
                )) : <div className="text-muted small">No eligible case studies available.</div>}
              </div>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={closeSetEditor}>Cancel</Button>
          <Button type="button" onClick={submitSetEditor} disabled={!setFields.title.trim() || setSubmitting}>
            {setSubmitting ? 'Saving...' : 'Save set'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(caseStudySetDeleteTarget)} onHide={() => setCaseStudySetDeleteTarget(null)}>
        <Modal.Header closeButton>
          <Modal.Title>Delete case study set</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Delete <strong>{caseStudySetDeleteTarget?.title}</strong>?
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={() => setCaseStudySetDeleteTarget(null)}>Cancel</Button>
          <Button type="button" variant="danger" onClick={confirmDeleteSet} disabled={setSubmitting}>
            {setSubmitting ? 'Deleting...' : 'Delete set'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={Boolean(caseStudySetShareTarget)} onHide={() => setCaseStudySetShareTarget(null)}>
        <Modal.Header closeButton>
          <Modal.Title>Share case study set</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={submitSetShare}>
            <div className="mb-3">
              <div className="fw-semibold">{caseStudySetShareTarget?.title}</div>
              <div className="small text-muted">Share this whole set with a student by email.</div>
            </div>
            <Form.Group controlId="caseStudySetShareEmail">
              <Form.Label>Email address</Form.Label>
              <Form.Control
                type="email"
                value={caseStudySetShareEmail}
                onChange={(event) => setCaseStudySetShareEmail(event.target.value)}
                placeholder="name@example.com"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={() => setCaseStudySetShareTarget(null)}>Cancel</Button>
          <Button type="button" onClick={submitSetShare} disabled={!caseStudySetShareEmail.trim() || caseStudySetShareSubmitting}>
            {caseStudySetShareSubmitting ? 'Sharing...' : 'Share set'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default FacilitatorCaseLibrary;
