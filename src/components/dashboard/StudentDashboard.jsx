import React, { useMemo, useState } from 'react';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import Table from 'react-bootstrap/Table';

const LIBRARY_PAGE_SIZE = 10;

const formatDateTime = (value) => {
  if (!value) {
    return 'Not yet';
  }

  try {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch (_error) {
    return String(value);
  }
};

const getAttemptLabel = (attemptNumber) => (attemptNumber ? `${attemptNumber}` : '');

const getAttemptPolicy = (caseStudy) => (
  caseStudy?.publishedData?.allowMultipleAttempts ? 'Multiple attempts allowed' : 'One attempt only'
);

const StudentDashboard = ({
  library,
  caseStudySets = [],
  sessions,
  liveSessions = [],
  onStartCase,
  onResumeSession,
  onRejoinLiveSession,
  onToggleFavourite,
  onBack,
}) => {
  const [selectedSet, setSelectedSet] = useState(null);
  const [librarySearch, setLibrarySearch] = useState('');
  const [showFavouritesOnly, setShowFavouritesOnly] = useState(false);
  const [libraryPage, setLibraryPage] = useState(1);
  const libraryLookup = useMemo(() => Object.fromEntries((library || []).map((item) => [item.id, item])), [library]);
  const sessionsByCaseStudyId = useMemo(() => (
    (sessions || []).reduce((lookup, session) => {
      const key = session.caseStudyId;
      if (!key) {
        return lookup;
      }
      return {
        ...lookup,
        [key]: [...(lookup[key] || []), session],
      };
    }, {})
  ), [sessions]);
  const activeSessionByCaseStudyId = useMemo(() => (
    Object.fromEntries(
      Object.entries(sessionsByCaseStudyId).map(([caseStudyId, caseSessions]) => [
        caseStudyId,
        caseSessions.find((session) => session.status === 'in_progress') || null,
      ])
    )
  ), [sessionsByCaseStudyId]);
  const revisionLibraryItems = useMemo(() => {
    const caseStudyRows = (library || []).map((caseStudy) => {
      const existingSession = activeSessionByCaseStudyId[caseStudy.id];
      const caseSessions = sessionsByCaseStudyId[caseStudy.id] || [];
      const allowMultipleAttempts = Boolean(caseStudy.publishedData?.allowMultipleAttempts);
      const completedAttempt = caseSessions.find((session) => session.status === 'completed') || null;
      const publishedTimestamp = caseStudy.publishedAt ? new Date(caseStudy.publishedAt).getTime() : 0;
      const sessionStartedTimestamp = existingSession?.startedAt ? new Date(existingSession.startedAt).getTime() : 0;
      const hasUpdatedPublishedVersion = Boolean(existingSession && publishedTimestamp && sessionStartedTimestamp && publishedTimestamp > sessionStartedTimestamp);
      const nextAttemptNumber = caseSessions.length + 1;
      const isSingleAttemptCompleted = !allowMultipleAttempts && completedAttempt && !existingSession;
      const actionLabel = (() => {
        if (hasUpdatedPublishedVersion) {
          return 'Start updated case';
        }
        if (existingSession) {
          return `Resume ${getAttemptLabel(existingSession.attemptNumber)}`;
        }
        if (isSingleAttemptCompleted) {
          return `Review ${getAttemptLabel(completedAttempt.attemptNumber)}`;
        }
        if (allowMultipleAttempts && caseSessions.length) {
          return `Start attempt ${nextAttemptNumber}`;
        }
        return 'Start case';
      })();
      const sessionStatus = (() => {
        if (hasUpdatedPublishedVersion) {
          return 'Updated';
        }
        if (existingSession) {
          return `${getAttemptLabel(existingSession.attemptNumber)} in progress`;
        }
        if (isSingleAttemptCompleted) {
          return 'Completed';
        }
        if (caseSessions.length) {
          return `${caseSessions.length} attempt${caseSessions.length === 1 ? '' : 's'}`;
        }
        return '';
      })();

      return {
        id: caseStudy.id,
        type: 'case-study',
        title: caseStudy.title,
        topic: caseStudy.publishedData?.revision_topic || 'General',
        description: caseStudy.publishedData?.short_description || caseStudy.summary || 'Interactive revision case',
        isFavourite: Boolean(caseStudy.isFavourite),
        attemptPolicy: getAttemptPolicy(caseStudy),
        actionLabel,
        sessionStatus,
        onAction: () => {
          if (hasUpdatedPublishedVersion) {
            onStartCase(caseStudy.id);
            return;
          }
          if (existingSession) {
            onResumeSession(existingSession.id);
            return;
          }
          if (isSingleAttemptCompleted) {
            onResumeSession(completedAttempt.id);
            return;
          }
          onStartCase(caseStudy.id);
        },
      };
    });
    const caseStudySetRows = (caseStudySets || []).map((caseStudySet) => ({
      id: caseStudySet.id,
      type: 'case-study-set',
      title: caseStudySet.title,
      topic: 'Case study set',
      description: caseStudySet.description || `${caseStudySet.caseStudies?.length || 0} case studies`,
      isFavourite: false,
      actionLabel: 'Open set',
      onAction: () => setSelectedSet(caseStudySet),
    }));

    return [...caseStudyRows, ...caseStudySetRows].sort((left, right) => {
      if (left.isFavourite !== right.isFavourite) {
        return left.isFavourite ? -1 : 1;
      }
      if (left.type !== right.type) {
        return left.type === 'case-study' ? -1 : 1;
      }
      return String(left.title || '').localeCompare(String(right.title || ''));
    });
  }, [activeSessionByCaseStudyId, caseStudySets, library, onResumeSession, onStartCase, sessionsByCaseStudyId]);
  const filteredLibrary = useMemo(() => {
    const search = librarySearch.trim().toLowerCase();
    return revisionLibraryItems.filter((item) => {
      if (showFavouritesOnly && !item.isFavourite) {
        return false;
      }

      if (!search) {
        return true;
      }

      return [item.title, item.topic, item.description, item.type === 'case-study-set' ? 'case study set' : 'case study']
        .some((value) => String(value || '').toLowerCase().includes(search));
    });
  }, [librarySearch, revisionLibraryItems, showFavouritesOnly]);
  const caseStudyActionLookup = useMemo(() => Object.fromEntries(
    revisionLibraryItems
      .filter((item) => item.type === 'case-study')
      .map((item) => [item.id, item])
  ), [revisionLibraryItems]);
  const libraryPageCount = Math.max(1, Math.ceil(filteredLibrary.length / LIBRARY_PAGE_SIZE));
  const pagedLibrary = useMemo(() => {
    const startIndex = (libraryPage - 1) * LIBRARY_PAGE_SIZE;
    return filteredLibrary.slice(startIndex, startIndex + LIBRARY_PAGE_SIZE);
  }, [filteredLibrary, libraryPage]);

  React.useEffect(() => {
    setLibraryPage(1);
  }, [librarySearch, showFavouritesOnly]);

  React.useEffect(() => {
    if (libraryPage > libraryPageCount) {
      setLibraryPage(libraryPageCount);
    }
  }, [libraryPage, libraryPageCount]);

  return (
    <div className="student-page">
      <Container className="mt-4 student-page__content">
        <div className="student-dashboard-shell">
          <div className="student-dashboard-header shadow-sm rounded mb-1">
            <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
              <div>
                <h2 className="mb-2">Case studies</h2>
                <p className="student-dashboard-header__copy mb-0">
                  Browse your saved work, revisit live teaching sessions, and search the organisation case library.
                </p>
                <Button type="button" variant="outline-light" className="btn-sm mt-2" onClick={onBack}>
                  <i className="bi bi-arrow-left" aria-hidden="true" />{' '}
                  Back
                </Button>
              </div>
            </div>
          </div>

          <section className="student-dashboard-section">
            <div className="student-dashboard-section__header">
              <h4>My saved case sessions</h4>
              <p className="text-muted mb-0">Resume in-progress work or review completed submissions.</p>
            </div>
            {sessions.length ? (
              <div className="table-responsive">
                <Table hover className="student-dashboard-table align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Case study</th>
                      <th>Attempt</th>
                      <th>Status</th>
                      <th>Started</th>
                      <th>Last updated</th>
                      <th>Score</th>
                      <th>Facilitator review</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session) => (
                      <tr key={session.id}>
                        <td>
                          <div className="fw-semibold">{session.title}</div>
                          <div className="small text-muted">{session.summary || 'Saved revision session'}</div>
                        </td>
                        <td>{getAttemptLabel(session.attemptNumber)}</td>
                        <td>
                          <Badge bg={session.status === 'completed' ? 'success' : 'warning'} text={session.status === 'completed' ? undefined : 'dark'}>
                            {session.status === 'completed' ? 'Completed' : 'In progress'}
                          </Badge>
                        </td>
                        <td>{formatDateTime(session.startedAt)}</td>
                        <td>{formatDateTime(session.updatedAt)}</td>
                        <td>{session.facilitatorMark != null ? `${session.facilitatorMark}%` : session.score != null ? `${session.score}%` : 'Not graded'}</td>
                        <td>
                          {session.facilitatorMarkedAt ? (
                            <div>
                              <Badge bg="success">Reviewed</Badge>
                              {session.facilitatorFeedback ? <div className="small text-muted mt-1">{session.facilitatorFeedback}</div> : null}
                            </div>
                          ) : (
                            <span className="text-muted">Awaiting review</span>
                          )}
                        </td>
                        <td className="text-end">
                          <Button type="button" size="sm" variant="primary" onClick={() => onResumeSession(session.id)}>
                            {session.status === 'completed' ? 'Review' : 'Resume'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            ) : (
              <div className="student-dashboard-empty">
                <i className="bi bi-inbox" aria-hidden="true" />
                <p className="mb-0">No saved case sessions yet.</p>
              </div>
            )}
          </section>
          <section className="student-dashboard-section">
            <div className="student-dashboard-section__header">
              <h4>Revision library</h4>
              <p className="text-muted mb-0">Search both case studies and case study sets, then filter to favourites when you want to find starred items quickly.</p>
            </div>
            <div className="student-dashboard-library-search">
              <div className="student-dashboard-library-search__controls">
                <InputGroup>
                  <InputGroup.Text>
                    <i className="bi bi-search" aria-hidden="true" />
                  </InputGroup.Text>
                  <Form.Control
                    type="search"
                    value={librarySearch}
                    onChange={(event) => setLibrarySearch(event.target.value)}
                    placeholder="Search case studies and case study sets by name, topic, or description"
                    aria-label="Search revision library"
                  />
                </InputGroup>
                <Form.Check
                  id="revision-library-favourites-only"
                  type="switch"
                  label="Favourites only"
                  checked={showFavouritesOnly}
                  onChange={(event) => setShowFavouritesOnly(event.target.checked)}
                />
              </div>
              <div className="small text-muted">
                {filteredLibrary.length} of {revisionLibraryItems.length} library items shown
              </div>
            </div>
            {revisionLibraryItems.length ? (
              <>
                <div className="table-responsive">
                  <Table hover size="sm" className="student-dashboard-table align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Favourite</th>
                        <th>Type</th>
                        <th>Title</th>
                        <th>Topic</th>
                        <th>Attempts</th>
                        <th>Status</th>
                        <th>Description</th>
                        <th className="text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedLibrary.map((item) => (
                        <tr key={`${item.type}-${item.id}`}>
                          <td className="text-center">
                            {item.type === 'case-study' ? (
                              <Button
                                type="button"
                                variant="link"
                                size="sm"
                                className={`student-library-card__favourite ${item.isFavourite ? 'is-active' : ''}`}
                                onClick={() => onToggleFavourite(item.id, item.isFavourite)}
                                aria-label={item.isFavourite ? `Remove ${item.title} from favourites` : `Add ${item.title} to favourites`}
                              >
                                <i className={`bi ${item.isFavourite ? 'bi-star-fill' : 'bi-star'}`} aria-hidden="true" />
                              </Button>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            <Badge bg={item.type === 'case-study-set' ? 'secondary' : 'primary'}>
                              {item.type === 'case-study-set' ? 'Set' : 'Case study'}
                            </Badge>
                          </td>
                          <td className="fw-semibold">{item.title}</td>
                          <td>{item.topic}</td>
                          <td>{item.attemptPolicy || '-'}</td>
                          <td>
                            {item.sessionStatus ? (
                              <Badge bg="warning" text="dark">{item.sessionStatus}</Badge>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>{item.description}</td>
                          <td className="text-end">
                            <Button type="button" size="sm" variant="primary" onClick={item.onAction}>
                              {item.actionLabel}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
                <div className="student-dashboard-library-pagination">
                  <div className="small text-muted">
                    Page {libraryPage} of {libraryPageCount}
                  </div>
                  <div className="d-flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline-secondary"
                      onClick={() => setLibraryPage((current) => Math.max(1, current - 1))}
                      disabled={libraryPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline-secondary"
                      onClick={() => setLibraryPage((current) => Math.min(libraryPageCount, current + 1))}
                      disabled={libraryPage === libraryPageCount}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="student-dashboard-empty">
                <i className="bi bi-folder2-open" aria-hidden="true" />
                <p className="mb-0">No live case studies or case study sets are available right now.</p>
              </div>
            )}
            {revisionLibraryItems.length && filteredLibrary.length === 0 ? (
              <div className="student-dashboard-empty">
                <i className="bi bi-search" aria-hidden="true" />
                <p className="mb-0">No case studies or case study sets match that search yet.</p>
              </div>
            ) : null}
          </section>
          <section className="student-dashboard-section">
            <div className="student-dashboard-section__header">
              <h4>Previously viewed live sessions</h4>
              <p className="text-muted mb-0">See live teaching sessions you have joined and any scored answers you submitted.</p>
            </div>
            {liveSessions.length ? (
              <div className="table-responsive">
                <Table hover className="student-dashboard-table align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Case study</th>
                      <th>Session code</th>
                      <th>Status</th>
                      <th>Answered</th>
                      <th>Score</th>
                      <th>Last viewed</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liveSessions.map((session) => (
                      <tr key={session.id}>
                        <td>
                          <div className="fw-semibold">{session.title}</div>
                          <div className="small text-muted">{session.summary || 'Live classroom case study'}</div>
                        </td>
                        <td>{session.sessionCode}</td>
                        <td>
                          <Badge bg={session.status === 'active' ? 'success' : 'secondary'}>
                            {session.status === 'active' ? 'Live now' : 'Ended'}
                          </Badge>
                        </td>
                        <td>
                          {session.answeredCount || 0}
                          {session.totalQuestions ? ` / ${session.totalQuestions}` : ''}
                        </td>
                        <td>{session.score != null ? `${session.score}%` : 'No scored test'}</td>
                        <td>{formatDateTime(session.lastViewedAt)}</td>
                        <td className="text-end">
                          {session.status === 'active' ? (
                            <Button type="button" size="sm" variant="primary" onClick={() => onRejoinLiveSession(session.sessionCode)}>
                              Rejoin
                            </Button>
                          ) : (
                            <span className="small text-muted">View only</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            ) : (
              <div className="student-dashboard-empty">
                <i className="bi bi-broadcast" aria-hidden="true" />
                <p className="mb-0">No live sessions viewed yet.</p>
              </div>
            )}
          </section>

        </div>
      </Container>

      <Modal show={Boolean(selectedSet)} onHide={() => setSelectedSet(null)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{selectedSet?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedSet?.description ? <p className="text-muted">{selectedSet.description}</p> : null}
          <Row className="g-3">
            {(selectedSet?.caseStudies || []).map((caseStudy) => {
              const availableCase = libraryLookup[caseStudy.caseStudyId];
              const actionItem = caseStudyActionLookup[caseStudy.caseStudyId];
              return (
                <Col md={6} key={caseStudy.caseStudyId}>
                  <div className="border rounded p-3 h-100 d-flex flex-column gap-2">
                    <div className="fw-semibold">{caseStudy.title}</div>
                    <div className="small text-muted">{caseStudy.summary || 'Interactive revision case'}</div>
                    <div className="mt-auto">
                      <Button
                        type="button"
                        size="sm"
                        variant={availableCase ? 'primary' : 'outline-secondary'}
                        disabled={!availableCase}
                        onClick={() => {
                          if (!availableCase || !actionItem) {
                            return;
                          }
                          setSelectedSet(null);
                          actionItem.onAction();
                        }}
                      >
                        {availableCase ? actionItem?.actionLabel || 'Start case' : 'Not currently live'}
                      </Button>
                    </div>
                  </div>
                </Col>
              );
            })}
          </Row>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default StudentDashboard;
