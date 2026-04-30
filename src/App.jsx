import React, { useCallback, useEffect, useState } from 'react';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Modal from 'react-bootstrap/Modal';
import Row from 'react-bootstrap/Row';
import Toast from 'react-bootstrap/Toast';
import ToastContainer from 'react-bootstrap/ToastContainer';
import NavBar from './components/NavBar';
import './style.css';
import Login from './components/Login';
import FacilitatorHome from './components/dashboard/FacilitatorHome';
import FacilitatorCaseAuthoringWorkspace from './components/dashboard/FacilitatorCaseAuthoringWorkspace';
import FacilitatorCaseLibrary from './components/dashboard/FacilitatorCaseLibrary';
import FacilitatorCaseResults from './components/dashboard/FacilitatorCaseResults';
import FacilitatorAttemptReview from './components/dashboard/FacilitatorAttemptReview';
import FacilitatorAdminWorkspace from './components/dashboard/FacilitatorAdminWorkspace';
import FacilitatorCasePresentation from './components/dashboard/FacilitatorCasePresentation';
import StudentDashboard from './components/dashboard/StudentDashboard';
import StudentHome from './components/dashboard/StudentHome';
import StudentEpmaWorkspace from './components/dashboard/StudentEpmaWorkspace';
import CaseSessionPlayer from './components/player/CaseSessionPlayer';
import LiveSessionView from './components/player/LiveSessionView';
import AppFooter from './components/AppFooter';
import PrivacyPolicyModal from './components/PrivacyPolicyModal';
import { api, createSessionEventSource } from './lib/api';
import { createDraftCaseStudy, getSampleCaseStudy, gradeAnswers, normalizeCaseStudy } from './lib/caseStudy';

const STORAGE_KEY = 'case-study-auth';
const SESSION_KEY = 'case-study-live-session';
const PARTICIPANT_KEY = 'case-study-live-participant';
const getPendingSharedCaseId = () => new URLSearchParams(window.location.search).get('sharedCase');
const getPendingPresentationCaseId = () => new URLSearchParams(window.location.search).get('presentCase');
const hydrateDraftFromCaseStudy = (caseStudy) => normalizeCaseStudy({
  ...(caseStudy?.draftData || {}),
  id: caseStudy?.id || '',
});

const App = () => {
  const [currentView, setCurrentView] = useState('public');
  const [loginModal, setLoginModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authLoading, setAuthLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [studentError, setStudentError] = useState('');
  const [notice, setNotice] = useState(null);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [token, setToken] = useState(() => window.localStorage.getItem(STORAGE_KEY) || '');
  const [user, setUser] = useState(null);
  const [caseStudies, setCaseStudies] = useState([]);
  const [caseStudySets, setCaseStudySets] = useState([]);
  const [userAccounts, setUserAccounts] = useState([]);
  const [library, setLibrary] = useState([]);
  const [studentCaseStudySets, setStudentCaseStudySets] = useState([]);
  const [drugLibrary, setDrugLibrary] = useState({ items: [], metadata: { routes: [], frequencies: [], nonAdmins: [] } });
  const [commonConditions, setCommonConditions] = useState([]);
  const [studentSessions, setStudentSessions] = useState([]);
  const [studentLiveSessions, setStudentLiveSessions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [resultsCaseId, setResultsCaseId] = useState('');
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [savingAttemptReview, setSavingAttemptReview] = useState(false);
  const [draft, setDraft] = useState(() => createDraftCaseStudy());
  const [savedDraft, setSavedDraft] = useState(() => createDraftCaseStudy());
  const [activeCaseSession, setActiveCaseSession] = useState(null);
  const [caseTestReturnView, setCaseTestReturnView] = useState('educator-library');
  const [grading, setGrading] = useState(null);
  const [sessionInput, setSessionInput] = useState('');
  const [connectedSessionCode, setConnectedSessionCode] = useState(() => window.localStorage.getItem(SESSION_KEY) || '');
  const [liveSessionCode, setLiveSessionCode] = useState('');
  const [liveSessionState, setLiveSessionState] = useState(null);
  const [liveResponses, setLiveResponses] = useState({});
  const [studentCaseStudy, setStudentCaseStudy] = useState(getSampleCaseStudy());
  const [patientSearchResults, setPatientSearchResults] = useState([]);
  const [recentPatients, setRecentPatients] = useState([]);
  const [recentPatientAccesses, setRecentPatientAccesses] = useState([]);
  const [patientSearchState, setPatientSearchState] = useState('idle');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const isEducatorUser = user?.role === 'educator' || user?.role === 'educator_admin';
  const isEducatorAdmin = user?.role === 'educator_admin';
  const [participantId] = useState(() => {
    const existing = window.localStorage.getItem(PARTICIPANT_KEY);
    if (existing) {
      return existing;
    }
    const created = window.crypto?.randomUUID?.() || `guest-${Date.now()}`;
    window.localStorage.setItem(PARTICIPANT_KEY, created);
    return created;
  });

  useEffect(() => {
    if (!notice) {
      return undefined;
    }
    const timeoutId = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  useEffect(() => {
    if (!token) {
      setLoginModal(false);
    }
  }, [token]);

  const showNotice = (message, variant = 'success') => setNotice({ message, variant });

  const normaliseStudentSessionRecord = useCallback((sessionRecord, fallback = {}) => ({
    id: sessionRecord?.id || fallback.id,
    caseStudyId: sessionRecord?.caseStudyId || sessionRecord?.case_study_id || fallback.caseStudyId,
    title: sessionRecord?.title || fallback.title || 'Case study',
    summary: sessionRecord?.summary || fallback.summary || '',
    status: sessionRecord?.status || fallback.status || 'in_progress',
    answers: sessionRecord?.answers || fallback.answers || {},
    progress: sessionRecord?.progress || fallback.progress || {},
    score: sessionRecord?.score ?? fallback.score ?? null,
    facilitatorMark: sessionRecord?.facilitatorMark ?? sessionRecord?.facilitator_mark ?? fallback.facilitatorMark ?? null,
    facilitatorFeedback: sessionRecord?.facilitatorFeedback || sessionRecord?.facilitator_feedback || fallback.facilitatorFeedback || '',
    facilitatorMarkedAt: sessionRecord?.facilitatorMarkedAt || sessionRecord?.facilitator_marked_at || fallback.facilitatorMarkedAt || null,
    facilitatorMarkedByName: sessionRecord?.facilitatorMarkedByName || fallback.facilitatorMarkedByName || '',
    attemptNumber: sessionRecord?.attemptNumber || sessionRecord?.attempt_number || fallback.attemptNumber || null,
    startedAt: sessionRecord?.startedAt || sessionRecord?.started_at || fallback.startedAt || null,
    completedAt: sessionRecord?.completedAt || sessionRecord?.completed_at || fallback.completedAt || null,
    updatedAt: sessionRecord?.updatedAt || sessionRecord?.updated_at || fallback.updatedAt || null,
  }), []);

  const upsertStudentSession = useCallback((sessionRecord, fallback = {}) => {
    const normalised = normaliseStudentSessionRecord(sessionRecord, fallback);
    if (!normalised.id) {
      return;
    }

    setStudentSessions((current) => {
      const remaining = current.filter((item) => item.id !== normalised.id);
      return [normalised, ...remaining].sort((left, right) => {
        const leftTime = new Date(left.updatedAt || left.startedAt || 0).getTime();
        const rightTime = new Date(right.updatedAt || right.startedAt || 0).getTime();
        return rightTime - leftTime;
      });
    });
  }, [normaliseStudentSessionRecord]);

  const refreshDrugLibrary = async () => {
    const response = await api.getDrugLibrary();
    setDrugLibrary(response);
  };

  const refreshCommonConditions = useCallback(async (authToken = token) => {
    if (!authToken) {
      setCommonConditions([]);
      return;
    }

    const response = await api.getCommonConditions(authToken);
    setCommonConditions(response.conditions || []);
  }, [token]);

  const refreshUserAccounts = useCallback(async (authToken = token) => {
    if (!authToken) {
      setUserAccounts([]);
      return;
    }

    const response = await api.listUserAccounts(authToken);
    setUserAccounts(response.users || []);
  }, [token]);

  const refreshEducatorData = async (authToken, preferredCaseId = null) => {
    const [response, setsResponse] = await Promise.all([
      api.listCaseStudyWorkspace(authToken),
      api.listCaseStudySetsWorkspace(authToken),
    ]);
    setCaseStudies(response.ownedCaseStudies || []);
    setCaseStudySets(setsResponse.caseStudySets || []);
    const selectedCase = (response.ownedCaseStudies || []).find((item) => item.id === preferredCaseId)
      || (response.ownedCaseStudies || [])[0]
      || null;

    if (selectedCase) {
      const nextDraft = hydrateDraftFromCaseStudy(selectedCase);
      setDraft(nextDraft);
      setSavedDraft(nextDraft);
      setLiveSessionCode(selectedCase.activeSessionCode || '');
      const analyticsResponse = await api.getCaseAnalytics(selectedCase.id, authToken);
      setAnalytics(analyticsResponse.analytics);
      if (selectedCase.activeSessionCode) {
        const liveResponse = await api.getSession(selectedCase.activeSessionCode);
        setLiveSessionState(liveResponse.session);
        const responses = await api.getSessionResponses(selectedCase.activeSessionCode);
        setLiveResponses(responses.summary || {});
      } else {
        setLiveSessionState(null);
        setLiveResponses({});
      }
    } else {
      const emptyDraft = createDraftCaseStudy();
      setDraft(emptyDraft);
      setSavedDraft(emptyDraft);
      setLiveSessionCode('');
      setLiveSessionState(null);
      setLiveResponses({});
      setAnalytics(null);
    }
    return response;
  };

  const refreshStudentData = useCallback(async (authToken) => {
    const [libraryResult, sessionsResult] = await Promise.allSettled([
      api.listLibrary(authToken),
      api.listMySessions(authToken),
    ]);

    if (libraryResult.status === 'fulfilled') {
      setLibrary((libraryResult.value.caseStudies || []).slice().sort((left, right) => {
        if (Boolean(left.isFavourite) !== Boolean(right.isFavourite)) {
          return left.isFavourite ? -1 : 1;
        }
        return String(left.title || '').localeCompare(String(right.title || ''));
      }));
      setStudentCaseStudySets(libraryResult.value.caseStudySets || []);
    }

    if (sessionsResult.status === 'fulfilled') {
      setStudentSessions(sessionsResult.value.sessions || []);
      setStudentLiveSessions(sessionsResult.value.liveSessions || []);
    }
  }, []);

  const refreshStudentSessions = useCallback(async (authToken = token) => {
    if (!authToken) {
      setStudentSessions([]);
      setStudentLiveSessions([]);
      return;
    }

    const response = await api.listMySessions(authToken);
    setStudentSessions(response.sessions || []);
    setStudentLiveSessions(response.liveSessions || []);
  }, [token]);

  const refreshRecentPatients = useCallback(async () => {
    const response = await api.listRecentTestPatients(token);
    setRecentPatients(response.patients || []);
  }, [token]);

  const refreshRecentPatientAccesses = useCallback(async () => {
    const response = await api.listRecentPatientAccesses(token);
    setRecentPatientAccesses(response.patients || []);
  }, [token]);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setCaseStudies([]);
      setCaseStudySets([]);
      setUserAccounts([]);
      setLibrary([]);
      setStudentCaseStudySets([]);
      setStudentSessions([]);
      setStudentLiveSessions([]);
      setSavedDraft(createDraftCaseStudy());
      setResultsCaseId('');
      setSelectedAttempt(null);
      setRecentPatients([]);
      setRecentPatientAccesses([]);
      setCommonConditions([]);
      return undefined;
    }

    let cancelled = false;
    const hydrate = async () => {
      try {
        const pendingSharedCaseId = getPendingSharedCaseId();
        const pendingPresentationCaseId = getPendingPresentationCaseId();
        const me = await api.me(token);
        if (cancelled) return;
        setUser(me.user);
        await Promise.allSettled([refreshDrugLibrary(), refreshCommonConditions(token)]);

        if (me.user.role === 'educator' || me.user.role === 'educator_admin') {
          await Promise.allSettled([
            refreshEducatorData(token, pendingPresentationCaseId || null),
            me.user.role === 'educator_admin' ? refreshUserAccounts(token) : Promise.resolve(),
          ]);
          if (!cancelled) setCurrentView(pendingPresentationCaseId ? 'educator-present' : 'educator-home');
        } else {
          await Promise.allSettled([
            refreshStudentData(token),
            refreshRecentPatients(),
            refreshRecentPatientAccesses(),
          ]);
          if (!cancelled && !pendingSharedCaseId) setCurrentView('student-home');
        }
      } catch (_error) {
        if (!cancelled) {
          window.localStorage.removeItem(STORAGE_KEY);
          setToken('');
          setUser(null);
        }
      }
    };

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [refreshCommonConditions, refreshRecentPatientAccesses, refreshRecentPatients, refreshStudentData, refreshUserAccounts, token]);

  useEffect(() => {
    if (token) {
      return undefined;
    }

    let cancelled = false;
    const hydrateLibrary = async () => {
      try {
        const response = await api.getDrugLibrary();
        if (!cancelled) {
          setDrugLibrary(response);
        }
      } catch (_error) {
        if (!cancelled) {
          setDrugLibrary({ items: [], metadata: { routes: [], frequencies: [], nonAdmins: [] } });
        }
      }
    };

    hydrateLibrary();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!connectedSessionCode) {
      return undefined;
    }

    window.localStorage.setItem(SESSION_KEY, connectedSessionCode);
    let eventSource;
    let pollTimer;
    let cancelled = false;

    const applyLiveSession = (session) => {
      setLiveSessionState(session);
      setStudentCaseStudy(normalizeCaseStudy(session.payload));
      setStudentError('');
    };

    const pollLiveSession = async () => {
      try {
        const response = await api.getSession(connectedSessionCode);
        if (cancelled) return;
        applyLiveSession(response.session);
      } catch (_error) {
        // EventSource error messaging is enough here; the poller quietly retries.
      }
    };

    const connectToSession = async () => {
      try {
        const response = await api.getSession(connectedSessionCode);
        if (cancelled) return;
        applyLiveSession(response.session);
        if (token && user?.role === 'student') {
          await api.joinSession(connectedSessionCode, participantId, user?.displayName || 'Guest learner', token);
          if (!cancelled) {
            await refreshStudentData(token);
          }
        }
        const responses = await api.getSessionResponses(connectedSessionCode);
        if (cancelled) return;
        setLiveResponses(responses.summary || {});
        setStudentError('');
        eventSource = createSessionEventSource(connectedSessionCode);
        eventSource.addEventListener('case-update', (event) => {
          const session = JSON.parse(event.data);
          applyLiveSession(session);
        });
        eventSource.addEventListener('response-update', (event) => {
          setLiveResponses(JSON.parse(event.data));
        });
        eventSource.onopen = () => {
          setStudentError('');
        };
        eventSource.onerror = () => {
          setStudentError('Live updates paused. Try reconnecting to the session.');
        };
        pollTimer = window.setInterval(pollLiveSession, 5000);
      } catch (error) {
        if (!cancelled) {
          setStudentError(error.message);
        }
      }
    };

    connectToSession();
    return () => {
      cancelled = true;
      if (pollTimer) window.clearInterval(pollTimer);
      if (eventSource) eventSource.close();
    };
  }, [connectedSessionCode, participantId, refreshStudentData, token, user]);

  const handleAuthSubmit = async ({ email, password, displayName, mode, role }) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const response = mode === 'login' ? await api.login(email, password) : await api.register(email, password, displayName, role);
      if (!response.token || !response.user) {
        setLoginModal(false);
        showNotice(
          response.message || 'Registration request received.',
          response.user?.accountStatus === 'pending_approval' ? 'info' : 'success'
        );
        return;
      }
      window.localStorage.setItem(STORAGE_KEY, response.token);
      if (response.user.role === 'student') {
        await Promise.allSettled([
          refreshStudentData(response.token),
          refreshStudentSessions(response.token),
        ]);
      }
      setToken(response.token);
      setUser(response.user);
      setLoginModal(false);
      setCurrentView(response.user.role === 'educator' || response.user.role === 'educator_admin' ? 'educator-home' : 'student-home');
      showNotice(mode === 'login' ? 'Signed in successfully.' : 'Account created successfully.');
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setToken('');
    setUser(null);
    setLiveSessionCode('');
    setLiveSessionState(null);
    setLiveResponses({});
    setCaseStudies([]);
    setCaseStudySets([]);
    setLibrary([]);
    setStudentCaseStudySets([]);
    setSavedDraft(createDraftCaseStudy());
    setResultsCaseId('');
    setSelectedAttempt(null);
    setActiveCaseSession(null);
    setGrading(null);
    setCurrentView('public');
    showNotice('Signed out.', 'info');
  };

  const handleForgotPassword = () => {
    showNotice('Password reset is not configured in this demo yet. Use the demo credentials or create a new account.', 'info');
  };

  const handleOpenStudentCases = useCallback(async () => {
    if (token && user?.role === 'student') {
      await Promise.allSettled([
        refreshStudentData(token),
        refreshStudentSessions(token),
      ]);
    }
    setCurrentView('student-cases');
  }, [refreshStudentData, refreshStudentSessions, token, user]);

  useEffect(() => {
    if (currentView !== 'student-cases' || !token || user?.role !== 'student') {
      return;
    }

    refreshStudentSessions(token).catch(() => {
      showNotice('Unable to refresh saved case sessions right now.', 'warning');
    });
  }, [currentView, refreshStudentSessions, token, user]);

  const handleSave = async (nextDraft) => {
    setSaveLoading(true);
    try {
      const response = nextDraft.id ? await api.updateCaseStudy(nextDraft.id, nextDraft, token) : await api.createCaseStudy(nextDraft, token);
      const nextSavedDraft = hydrateDraftFromCaseStudy(response.caseStudy);
      setDraft(nextSavedDraft);
      setSavedDraft(nextSavedDraft);
      await refreshEducatorData(token, nextSavedDraft.id);
      if (liveSessionCode) {
        const liveResponse = await api.pushSession(liveSessionCode, nextSavedDraft, token);
        setLiveSessionState(liveResponse.session);
      }
      const savedCaseMeta = response.caseStudy || {};
      if (savedCaseMeta.status === 'self_paced' && savedCaseMeta.studentAccessEnabled) {
        showNotice('Changes saved. Update self-paced publishing from View and share case studies when ready.', 'warning');
      } else if (savedCaseMeta.status === 'live_classroom') {
        showNotice('Changes saved. Update the live classroom from View and share case studies when ready.', 'warning');
      } else {
        showNotice(nextDraft.id ? 'Case study updated.' : 'Case study created.');
      }
      return nextSavedDraft;
    } catch (error) {
      setAuthError(error.message);
      setLoginModal(true);
      return null;
    } finally {
      setSaveLoading(false);
    }
  };

  const handleLoadCase = async (caseStudyId) => {
    const response = await api.getCaseStudy(caseStudyId, token);
    const loadedDraft = hydrateDraftFromCaseStudy(response.caseStudy);
    setDraft(loadedDraft);
    setSavedDraft(loadedDraft);
    const selected = caseStudies.find((item) => item.id === caseStudyId);
    setLiveSessionCode(selected?.activeSessionCode || '');
    if (selected?.activeSessionCode) {
      const liveResponse = await api.getSession(selected.activeSessionCode);
      setLiveSessionState(liveResponse.session);
      const responses = await api.getSessionResponses(selected.activeSessionCode);
      setLiveResponses(responses.summary || {});
    } else {
      setLiveSessionState(null);
      setLiveResponses({});
    }
    const analyticsResponse = await api.getCaseAnalytics(caseStudyId, token);
    setAnalytics(analyticsResponse.analytics);
    showNotice('Case study loaded.', 'info');
  };

  const handlePublish = async (nextDraft, mode = 'self_paced') => {
    let publishDraft = nextDraft;
    if (!publishDraft.id) {
      publishDraft = await handleSave(nextDraft);
      if (!publishDraft?.id) return;
    }

    setSaveLoading(true);
    try {
      const response = await api.publishCaseStudy(publishDraft.id, publishDraft, mode, token);
      if (response.session) {
        setLiveSessionCode(response.session.sessionCode);
        setLiveSessionState(response.session);
        setLiveResponses({});
        setStudentCaseStudy(normalizeCaseStudy(response.session.payload));
      } else {
        setLiveSessionCode('');
        setLiveSessionState(null);
        setLiveResponses({});
      }
      await refreshEducatorData(token, publishDraft.id);
      showNotice(
        mode === 'live_classroom'
          ? `Live classroom started. Code: ${response.session?.sessionCode || ''}`
          : 'Case published for self-paced student access.'
      );
    } finally {
      setSaveLoading(false);
    }
  };

  const handlePublishFacilitatorCase = async (caseStudyId, mode = 'self_paced') => {
    const selected = caseStudies.find((item) => item.id === caseStudyId);
    if (!selected) {
      showNotice('Case study could not be found.', 'danger');
      return;
    }

    await handlePublish(hydrateDraftFromCaseStudy(selected), mode);
  };

  const openFacilitatorCaseTest = (caseStudy, returnView = 'educator-library') => {
    const testDraft = normalizeCaseStudy(hydrateDraftFromCaseStudy(caseStudy));
    setActiveCaseSession({
      id: `test-${caseStudy?.id || Date.now()}`,
      caseStudyId: caseStudy?.id || '',
      title: `Test: ${caseStudy?.title || testDraft.case_study_name || 'Case study'}`,
      summary: caseStudy?.summary || testDraft.short_description || '',
      status: 'in_progress',
      caseSnapshot: testDraft,
      answers: {},
      progress: {},
      score: null,
      attemptNumber: null,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isFacilitatorPreview: true,
    });
    setCaseTestReturnView(returnView);
    setGrading(null);
    setCurrentView('educator-test-player');
    showNotice('Test mode opened. This will not publish the case or save a student attempt.', 'info');
  };

  const handleTestFacilitatorCase = (caseStudyId) => {
    const selected = caseStudies.find((item) => item.id === caseStudyId);
    if (!selected) {
      showNotice('Case study could not be found.', 'danger');
      return;
    }
    openFacilitatorCaseTest(selected, 'educator-library');
  };

  const handleTestCurrentDraft = (currentDraft) => {
    const testDraft = normalizeCaseStudy(currentDraft || draft);
    setActiveCaseSession({
      id: `test-draft-${Date.now()}`,
      caseStudyId: testDraft.id || '',
      title: `Test: ${testDraft.case_study_name || 'Unsaved case study'}`,
      summary: testDraft.short_description || '',
      status: 'in_progress',
      caseSnapshot: testDraft,
      answers: {},
      progress: {},
      score: null,
      attemptNumber: null,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isFacilitatorPreview: true,
    });
    setCaseTestReturnView('educator-create');
    setGrading(null);
    setCurrentView('educator-test-player');
    showNotice('Testing the current draft. This will not publish the case or create a student attempt.', 'info');
  };

  const handleArchiveCase = async (caseId) => {
    await api.archiveCaseStudy(caseId, token);
    await refreshEducatorData(token);
    showNotice('Case archived.', 'info');
  };

  const handleUnarchiveCase = async (caseId) => {
    await api.unarchiveCaseStudy(caseId, token);
    await refreshEducatorData(token, caseId);
    showNotice('Case restored to draft.', 'info');
  };

  const handleRefreshAnalytics = async (caseId) => {
    const response = await api.getCaseAnalytics(caseId, token);
    setAnalytics(response.analytics);
    showNotice('Analytics refreshed.', 'info');
  };

  const handleOpenCaseResults = async (caseId) => {
    const response = await api.getCaseAnalytics(caseId, token);
    setAnalytics(response.analytics);
    setResultsCaseId(caseId);
    setSelectedAttempt(null);
    setCurrentView('educator-results');
  };

  const handleOpenFacilitatorPresentation = async (caseId) => {
    const selected = caseStudies.find((item) => item.id === caseId);
    if (!selected?.activeSessionCode) {
      showNotice('Start live classroom for this case first, then open it from the library.', 'warning');
      return;
    }

    await handleLoadCase(caseId);
    setCurrentView('educator-present');
  };

  const handleOpenFacilitatorAttempt = async (caseId, sessionId) => {
    try {
      const response = await api.getFacilitatorCaseAttempt(caseId, sessionId, token);
      setResultsCaseId(caseId);
      setSelectedAttempt(response.attempt);
      setCurrentView('educator-attempt');
    } catch (error) {
      showNotice(error.message || 'Unable to open this student attempt right now.', 'danger');
    }
  };

  const handleSaveFacilitatorAttemptReview = async (caseId, sessionId, mark, feedback) => {
    setSavingAttemptReview(true);
    try {
      const response = await api.saveFacilitatorCaseAttemptReview(caseId, sessionId, mark, feedback, token);
      setSelectedAttempt((current) => (
        current
          ? {
              ...current,
              ...response.attempt,
            }
          : response.attempt
      ));
      showNotice('Facilitator review saved.');
      await handleRefreshAnalytics(caseId);
    } catch (error) {
      showNotice(error.message || 'Unable to save facilitator review.', 'danger');
    } finally {
      setSavingAttemptReview(false);
    }
  };

  const handleResetFacilitatorAttempt = async (caseId, sessionId) => {
    setSavingAttemptReview(true);
    try {
      const response = await api.resetFacilitatorCaseAttempt(caseId, sessionId, token);
      setSelectedAttempt((current) => (
        current?.id === sessionId
          ? {
              ...current,
              ...response.attempt,
            }
          : current
      ));
      showNotice('Student attempt reset. The learner can take this case again.', 'success');
      await handleRefreshAnalytics(caseId);
    } catch (error) {
      showNotice(error.message || 'Unable to reset this student attempt.', 'danger');
    } finally {
      setSavingAttemptReview(false);
    }
  };

  const handlePreviewDrugLibraryImport = async (csvContent, replaceExisting = true) => {
    return api.previewDrugLibraryImport(csvContent, token, replaceExisting);
  };

  const handleImportDrugLibrary = async (csvContent, replaceExisting, confirmedMissing = null) => {
    await api.importDrugLibrary(csvContent, token, replaceExisting, confirmedMissing);
    await refreshDrugLibrary();
    showNotice('Drug library imported.', 'success');
  };

  const handleAddRouteOption = async (label) => {
    await api.createRouteOption(label, token);
    await refreshDrugLibrary();
    showNotice('Route added.', 'success');
  };

  const handleDeleteRouteOption = async (routeId) => {
    await api.deleteRouteOption(routeId, token);
    await refreshDrugLibrary();
    showNotice('Route removed.', 'info');
  };

  const handleUpdateRouteOption = async (routeId, label, sortOrder) => {
    await api.updateRouteOption(routeId, label, sortOrder, token);
    await refreshDrugLibrary();
    showNotice('Route updated.', 'success');
  };

  const handleMoveRouteOption = async (routeId, direction) => {
    const routeOptions = [...(drugLibrary?.metadata?.routeOptions || [])].sort((left, right) => left.sortOrder - right.sortOrder);
    const index = routeOptions.findIndex((item) => item.id === routeId);
    const swapIndex = direction === 'up' ? index - 1 : index + 1;

    if (index < 0 || swapIndex < 0 || swapIndex >= routeOptions.length) {
      return;
    }

    const current = routeOptions[index];
    const swap = routeOptions[swapIndex];

    await api.updateRouteOption(current.id, current.label, swap.sortOrder, token);
    await api.updateRouteOption(swap.id, swap.label, current.sortOrder, token);
    await refreshDrugLibrary();
    showNotice('Route order updated.', 'success');
  };

  const handleImportRouteOptions = async (csvContent) => {
    const response = await api.importRouteOptions(csvContent, token);
    await refreshDrugLibrary();
    showNotice(`${response.importedCount || 0} routes imported.`, 'success');
  };

  const handleAddFrequencyOption = async (label, defaultAdminTimes) => {
    await api.createFrequencyOption(label, defaultAdminTimes, token);
    await refreshDrugLibrary();
    showNotice('Frequency added.', 'success');
  };

  const handleDeleteFrequencyOption = async (frequencyId) => {
    await api.deleteFrequencyOption(frequencyId, token);
    await refreshDrugLibrary();
    showNotice('Frequency removed.', 'info');
  };

  const handleUpdateFrequencyOption = async (frequencyId, label, defaultAdminTimes, sortOrder) => {
    await api.updateFrequencyOption(frequencyId, label, defaultAdminTimes, sortOrder, token);
    await refreshDrugLibrary();
    showNotice('Frequency updated.', 'success');
  };

  const handleMoveFrequencyOption = async (frequencyId, direction) => {
    const frequencyOptions = [...(drugLibrary?.metadata?.frequencyOptions || [])].sort((left, right) => left.sortOrder - right.sortOrder);
    const index = frequencyOptions.findIndex((item) => item.id === frequencyId);
    const swapIndex = direction === 'up' ? index - 1 : index + 1;

    if (index < 0 || swapIndex < 0 || swapIndex >= frequencyOptions.length) {
      return;
    }

    const current = frequencyOptions[index];
    const swap = frequencyOptions[swapIndex];

    await api.updateFrequencyOption(current.id, current.label, (current.defaultAdminTimes || []).join(', '), swap.sortOrder, token);
    await api.updateFrequencyOption(swap.id, swap.label, (swap.defaultAdminTimes || []).join(', '), current.sortOrder, token);
    await refreshDrugLibrary();
    showNotice('Frequency order updated.', 'success');
  };

  const handleAddIndicationOption = async (label) => {
    await api.createIndicationOption(label, token);
    await refreshDrugLibrary();
    showNotice('Indication added.', 'success');
  };

  const handleDeleteIndicationOption = async (indicationId) => {
    await api.deleteIndicationOption(indicationId, token);
    await refreshDrugLibrary();
    showNotice('Indication removed.', 'info');
  };

  const handleUpdateIndicationOption = async (indicationId, label) => {
    await api.updateIndicationOption(indicationId, label, token);
    await refreshDrugLibrary();
    showNotice('Indication updated.', 'success');
  };

  const handleImportIndicationOptions = async (csvContent) => {
    const response = await api.importIndicationOptions(csvContent, token);
    await refreshDrugLibrary();
    showNotice(`${response.importedCount || 0} indications imported.`, 'success');
  };

  const handleAddUnitOption = async (label) => {
    await api.createUnitOption(label, token);
    await refreshDrugLibrary();
    showNotice('Unit added.', 'success');
  };

  const handleDeleteUnitOption = async (unitId) => {
    await api.deleteUnitOption(unitId, token);
    await refreshDrugLibrary();
    showNotice('Unit removed.', 'info');
  };

  const handleUpdateUnitOption = async (unitId, label) => {
    await api.updateUnitOption(unitId, label, token);
    await refreshDrugLibrary();
    showNotice('Unit updated.', 'success');
  };

  const handleImportUnitOptions = async (csvContent) => {
    const response = await api.importUnitOptions(csvContent, token);
    await refreshDrugLibrary();
    showNotice(`${response.importedCount || 0} units imported.`, 'success');
  };

  const handleAddFormOption = async (label) => {
    await api.createFormOption(label, token);
    await refreshDrugLibrary();
    showNotice('Form added.', 'success');
  };

  const handleDeleteFormOption = async (formId) => {
    await api.deleteFormOption(formId, token);
    await refreshDrugLibrary();
    showNotice('Form removed.', 'info');
  };

  const handleUpdateFormOption = async (formId, label) => {
    await api.updateFormOption(formId, label, token);
    await refreshDrugLibrary();
    showNotice('Form updated.', 'success');
  };

  const handleImportFormOptions = async (csvContent) => {
    const response = await api.importFormOptions(csvContent, token);
    await refreshDrugLibrary();
    showNotice(`${response.importedCount || 0} forms imported.`, 'success');
  };

  const handleImportFrequencyOptions = async (csvContent) => {
    const response = await api.importFrequencyOptions(csvContent, token);
    await refreshDrugLibrary();
    showNotice(`${response.importedCount || 0} frequencies imported.`, 'success');
  };

  const handleAddCriticalMedicine = async (drugId) => {
    await api.createCriticalMedicine(drugId, token);
    await refreshDrugLibrary();
    showNotice('Critical medicine added.', 'success');
  };

  const handleDeleteCriticalMedicine = async (criticalMedicineId) => {
    await api.deleteCriticalMedicine(criticalMedicineId, token);
    await refreshDrugLibrary();
    showNotice('Critical medicine removed.', 'info');
  };

  const handleAddControlledDrug = async (drugId) => {
    await api.createControlledDrug(drugId, token);
    await refreshDrugLibrary();
    showNotice('Controlled drug added.', 'success');
  };

  const handleDeleteControlledDrug = async (controlledDrugId) => {
    await api.deleteControlledDrug(controlledDrugId, token);
    await refreshDrugLibrary();
    showNotice('Controlled drug removed.', 'info');
  };

  const handleAddOrderSet = async (payload) => {
    await api.createOrderSet(payload, token);
    await refreshDrugLibrary();
    showNotice('Order set added.', 'success');
  };

  const handleUpdateOrderSet = async (orderSetId, payload) => {
    await api.updateOrderSet(orderSetId, payload, token);
    await refreshDrugLibrary();
    showNotice('Order set updated.', 'success');
  };

  const handleDeleteOrderSet = async (orderSetId) => {
    await api.deleteOrderSet(orderSetId, token);
    await refreshDrugLibrary();
    showNotice('Order set removed.', 'info');
  };

  const handleUpdateDrugLibraryItem = async (drugId, payload) => {
    await api.updateDrugLibraryItem(drugId, payload, token);
    await refreshDrugLibrary();
    showNotice('Drug updated.', 'success');
  };

  const handleCreateDrugLibraryItem = async (payload) => {
    await api.createDrugLibraryItem(payload, token);
    await refreshDrugLibrary();
    showNotice('Drug added.', 'success');
  };

  const handleDeleteDrugLibraryItem = async (drugId) => {
    await api.deleteDrugLibraryItem(drugId, token);
    await refreshDrugLibrary();
    showNotice('Drug removed.', 'info');
  };

  const handleSuspendUserAccount = async (userId, reason) => {
    await api.suspendUserAccount(userId, reason, token);
    await refreshUserAccounts(token);
    showNotice('User account suspended.', 'warning');
  };

  const handleRestoreUserAccount = async (userId) => {
    await api.restoreUserAccount(userId, token);
    await refreshUserAccounts(token);
    showNotice('User account restored.', 'success');
  };

  const handleRemoveUserAccountAccess = async (userId, reason) => {
    await api.removeUserAccountAccess(userId, reason, token);
    await refreshUserAccounts(token);
    showNotice('User access removed and retention review scheduled.', 'info');
  };

  const handleSetLiveStep = async (stepIndex) => {
    if (!liveSessionCode || !liveSessionState) return;
    const response = await api.controlSession(
      liveSessionCode,
      stepIndex,
      liveSessionState.revealAnswers,
      token,
      liveSessionState.presentationStage,
      liveSessionState.payload?.currentStageIndex,
      liveSessionState.payload?.revealedQuestionNumbers
    );
    setLiveSessionState(response.session);
    showNotice(`Moved live session to question ${response.session.stepIndex + 1}.`, 'info');
  };

  const handleSetLiveReveal = async (revealAnswers) => {
    if (!liveSessionCode || !liveSessionState) return;
    const response = await api.controlSession(
      liveSessionCode,
      liveSessionState.stepIndex,
      revealAnswers,
      token,
      liveSessionState.presentationStage,
      liveSessionState.payload?.currentStageIndex,
      liveSessionState.payload?.revealedQuestionNumbers
    );
    setLiveSessionState(response.session);
    showNotice(revealAnswers ? 'Answer revealed to students.' : 'Answer hidden from students.', 'info');
  };

  const handleRevealLiveQuestion = async (questionNumber) => {
    if (!liveSessionCode || !liveSessionState || !questionNumber) return;
    const currentRevealed = Array.isArray(liveSessionState.payload?.revealedQuestionNumbers)
      ? liveSessionState.payload.revealedQuestionNumbers.map(String)
      : [];
    const nextRevealed = currentRevealed.includes(String(questionNumber))
      ? currentRevealed.filter((item) => item !== String(questionNumber))
      : [...currentRevealed, String(questionNumber)];
    const response = await api.controlSession(
      liveSessionCode,
      liveSessionState.stepIndex,
      liveSessionState.revealAnswers,
      token,
      liveSessionState.presentationStage,
      liveSessionState.payload?.currentStageIndex,
      nextRevealed
    );
    setLiveSessionState(response.session);
    showNotice(nextRevealed.includes(String(questionNumber)) ? 'Answer revealed for this question.' : 'Answer hidden for this question.', 'info');
  };

  const handleSetLivePresentationStage = async (presentationStage) => {
    if (!liveSessionCode || !liveSessionState) return;
    const response = await api.controlSession(
      liveSessionCode,
      liveSessionState.stepIndex,
      liveSessionState.revealAnswers,
      token,
      presentationStage,
      liveSessionState.payload?.currentStageIndex,
      liveSessionState.payload?.revealedQuestionNumbers
    );
    setLiveSessionState(response.session);
    showNotice(
      presentationStage === 'initial' ? 'Presentation returned to the initial scenario.' : 'More case information has been revealed.',
      'info'
    );
  };

  const handleSetLiveStageIndex = async (stageIndex) => {
    if (!liveSessionCode || !liveSessionState) return;
    const response = await api.controlSession(
      liveSessionCode,
      liveSessionState.stepIndex,
      liveSessionState.revealAnswers,
      token,
      liveSessionState.presentationStage,
      stageIndex,
      liveSessionState.payload?.revealedQuestionNumbers
    );
    setLiveSessionState(response.session);
    showNotice(`Moved live case study to stage ${response.session.payload?.currentStageIndex + 1}.`, 'info');
  };

  const handleStartCase = async (caseId) => {
    try {
      const started = await api.startCaseSession(caseId, token);
      const loaded = await api.getCaseSession(started.session.id, token);
      setActiveCaseSession(loaded.session);
      upsertStudentSession(loaded.session);
      setGrading(null);
      setCurrentView('player');
      await refreshStudentData(token);
      showNotice(
        loaded.session?.attemptNumber ? `Attempt ${loaded.session.attemptNumber} opened.` : 'Case session opened.',
        'info'
      );
    } catch (error) {
      await refreshStudentData(token);
      showNotice(error.message || 'Unable to start this case study.', 'warning');
    }
  };

  const handleResumeSession = async (sessionId) => {
    const loaded = await api.getCaseSession(sessionId, token);
    setActiveCaseSession(loaded.session);
    setGrading(null);
    setCurrentView('player');
    showNotice('Session loaded.', 'info');
  };

  const handleSaveCaseSession = async (answers, progress, caseSnapshot) => {
    if (!activeCaseSession) return;
    if (activeCaseSession.isFacilitatorPreview) {
      setActiveCaseSession((current) => ({
        ...current,
        answers,
        progress,
        caseSnapshot: caseSnapshot || current.caseSnapshot,
        updatedAt: new Date().toISOString(),
      }));
      showNotice('Test progress kept in this preview only.', 'info');
      return;
    }
    setSaveLoading(true);
    try {
      const updated = await api.saveCaseSession(activeCaseSession.id, answers, progress, token, caseSnapshot);
      const savedCaseSnapshot = updated.session.case_snapshot || updated.session.caseSnapshot || caseSnapshot || activeCaseSession.caseSnapshot;
      const nextSession = {
        ...activeCaseSession,
        answers,
        progress,
        caseSnapshot: savedCaseSnapshot,
        status: 'in_progress',
        updatedAt: updated.session.updated_at || activeCaseSession.updatedAt,
      };
      setActiveCaseSession(nextSession);
      upsertStudentSession(updated.session, nextSession);
      await refreshStudentData(token);
      showNotice('Progress saved.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSubmitCaseSession = async (answers, progress, caseSnapshot) => {
    if (!activeCaseSession) return;
    if (activeCaseSession.isFacilitatorPreview) {
      const grade = gradeAnswers(caseSnapshot || activeCaseSession.caseSnapshot, answers);
      setActiveCaseSession((current) => ({
        ...current,
        answers,
        caseSnapshot: caseSnapshot || current.caseSnapshot,
        progress: { ...progress, breakdown: grade.breakdown },
        status: 'completed',
        score: grade.score,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      setGrading(grade);
      showNotice(`Test submitted. Score: ${grade.score}%`, 'info');
      return;
    }
    setSaveLoading(true);
    try {
      const completed = await api.completeCaseSession(activeCaseSession.id, answers, progress, token, caseSnapshot);
      const savedCaseSnapshot = completed.session.case_snapshot || completed.session.caseSnapshot || caseSnapshot || activeCaseSession.caseSnapshot;
      const nextSession = {
        ...activeCaseSession,
        answers,
        caseSnapshot: savedCaseSnapshot,
        progress: { ...progress, breakdown: completed.grading.breakdown },
        status: 'completed',
        score: completed.grading.score,
        completedAt: completed.session.completed_at || activeCaseSession.completedAt,
        updatedAt: completed.session.updated_at || activeCaseSession.updatedAt,
      };
      setActiveCaseSession(nextSession);
      upsertStudentSession(completed.session, nextSession);
      setGrading(completed.grading);
      await refreshStudentData(token);
      showNotice(`Case submitted. Score: ${completed.grading.score}%`);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleJoinLive = async (event, sessionCodeOverride = '') => {
    if (event?.preventDefault) {
      event.preventDefault();
    }
    const rawSessionCode = String(sessionCodeOverride || sessionInput || '').trim();
    if (!rawSessionCode) {
      setStudentError('Enter a live session code to join the class case.');
      return false;
    }
    const nextSessionCode = rawSessionCode.toUpperCase();
    if (token && user?.role === 'student') {
      try {
        await api.joinSession(nextSessionCode, participantId, user?.displayName || 'Guest learner', token);
        await refreshStudentData(token);
      } catch (error) {
        setStudentError(error.message || 'Unable to join this live session right now.');
        showNotice(error.message || 'Unable to join this live session right now.', 'danger');
        return false;
      }
    }
    setConnectedSessionCode(nextSessionCode);
    setCurrentView('live');
    showNotice(`Joined live session ${nextSessionCode}.`, 'info');
    return true;
  };

  const handleLeaveLive = async () => {
    window.localStorage.removeItem(SESSION_KEY);
    setConnectedSessionCode('');
    setSessionInput('');
    setLiveSessionState(null);
    setLiveResponses({});
    setStudentError('');
    if (token && user?.role === 'student') {
      await refreshStudentData(token);
    }
    setCurrentView(user?.role === 'student' ? 'student-home' : 'public');
    showNotice('Left the live session.', 'info');
  };

  const handleSubmitLiveResponse = async (questionNumber, answer) => {
    if (!connectedSessionCode) return;
    const participantName = user?.displayName || 'Guest learner';
    const response = await api.submitSessionResponse(
      connectedSessionCode,
      questionNumber,
      answer,
      participantId,
      participantName,
      token || undefined
    );
    setLiveResponses(response.summary || {});
    if (response.session) {
      setLiveSessionState(response.session);
      setStudentCaseStudy(normalizeCaseStudy(response.session.payload));
    }
    if (token && user?.role === 'student') {
      await refreshStudentData(token);
    }
    showNotice('Live answer submitted.', 'success');
  };

  const handleToggleFavouriteCaseStudy = async (caseStudyId, isFavourite) => {
    if (isFavourite) {
      await api.unfavouriteCaseStudy(caseStudyId, token);
      showNotice('Removed from favourites.', 'info');
    } else {
      await api.favouriteCaseStudy(caseStudyId, token);
      showNotice('Added to favourites.', 'success');
    }
    await refreshStudentData(token);
  };

  const handleRejoinLiveSession = async (sessionCode) => {
    setSessionInput(sessionCode);
    await handleJoinLive({ preventDefault() {} }, sessionCode);
  };

  const handleSearchPatient = async (searchFields) => {
    const hasCriteria = Object.values(searchFields || {}).some((value) => String(value || '').trim());
    if (!hasCriteria) {
      setPatientSearchState('idle');
      setPatientSearchResults([]);
      return;
    }

    const response = await api.searchTestPatients(searchFields, token);
    setPatientSearchResults(response.patients);
    setPatientSearchState(response.patients.length ? 'results' : 'not-found');
  };

  const handleSelectPatient = async (patientId) => {
    const [response] = await Promise.all([
      api.getTestPatient(patientId, token),
      refreshDrugLibrary(),
    ]);
    setSelectedPatient(response.patient);
    await Promise.all([refreshRecentPatients(), refreshRecentPatientAccesses()]);
    setCurrentView('student-epma');
  };

  const handleCreateTestPatient = async (patientData) => {
    const [response] = await Promise.all([
      api.createTestPatient(patientData, token),
      refreshDrugLibrary(),
    ]);
    setSelectedPatient(response.patient);
    setPatientSearchResults([]);
    setPatientSearchState('idle');
    await Promise.all([refreshRecentPatients(), refreshRecentPatientAccesses()]);
    setCurrentView('student-epma');
    showNotice(`Test patient ${response.patient.fullName} admitted.`, 'success');
  };

  const handleOpenEpmaWorkspace = async () => {
    setSelectedPatient(null);
    setPatientSearchResults([]);
    setPatientSearchState('idle');
    await Promise.all([refreshRecentPatients(), refreshRecentPatientAccesses(), refreshDrugLibrary()]);
    setCurrentView('student-epma');
  };

  const handleUpdatePatientAllergies = async (patientId, payload) => {
    const response = await api.updateTestPatientAllergies(patientId, payload, token);
    setSelectedPatient(response.patient);
    setPatientSearchResults((current) => current.map((item) => (item.id === patientId ? response.patient : item)));
    setRecentPatients((current) => [response.patient, ...current.filter((item) => item.id !== patientId)]);
    showNotice('Allergies updated.', 'success');
  };

  const handleUpdatePatientCaseNotes = async (patientId, payload) => {
    const response = await api.updateTestPatientCaseNotes(patientId, payload, token);
    setSelectedPatient(response.patient);
    setPatientSearchResults((current) => current.map((item) => (item.id === patientId ? response.patient : item)));
    setRecentPatients((current) => [response.patient, ...current.filter((item) => item.id !== patientId)]);
    showNotice(payload?.successMessage || 'Case notes updated.', 'success');
    return response.patient;
  };

  const handleUpdatePatientPrescriptions = async (patientId, prescriptions, options = {}) => {
    const response = await api.updateTestPatientPrescriptions(patientId, prescriptions, token);
    setSelectedPatient(response.patient);
    setPatientSearchResults((current) => current.map((item) => (item.id === patientId ? response.patient : item)));
    setRecentPatients((current) => [response.patient, ...current.filter((item) => item.id !== patientId)]);
    if (!options.suppressToast) {
      showNotice('Prescription chart updated.', 'success');
    }
  };

  const handleUpdatePatientMeasurements = async (patientId, payload) => {
    const response = await api.updateTestPatientMeasurements(patientId, payload, token);
    setSelectedPatient(response.patient);
    setPatientSearchResults((current) => current.map((item) => (item.id === patientId ? response.patient : item)));
    setRecentPatients((current) => [response.patient, ...current.filter((item) => item.id !== patientId)]);
    showNotice('Measurements updated.', 'success');
    return response.patient;
  };

  const handleDeletePatientMeasurement = async (patientId, measurementId) => {
    const response = await api.deleteTestPatientMeasurement(patientId, measurementId, token);
    setSelectedPatient(response.patient);
    setPatientSearchResults((current) => current.map((item) => (item.id === patientId ? response.patient : item)));
    setRecentPatients((current) => [response.patient, ...current.filter((item) => item.id !== patientId)]);
    showNotice('Measurement deleted.', 'success');
    return response.patient;
  };

  const handleDischargePatient = async (patientId) => {
    try {
      const response = await api.dischargeTestPatient(patientId, token);
      setSelectedPatient(null);
      setPatientSearchResults((current) => current.map((item) => (item.id === patientId ? response.patient : item)));
      await Promise.all([refreshRecentPatients(), refreshRecentPatientAccesses()]);
      setPatientSearchState('idle');
      setCurrentView('student-epma');
      showNotice(`Patient ${response.patient.fullName} discharged.`, 'success');
      return response.patient;
    } catch (error) {
      showNotice(error.message || 'Unable to discharge patient.', 'danger');
      throw error;
    }
  };

  const handleReadmitPatient = async (patientId, payload) => {
    try {
      const response = await api.readmitTestPatient(patientId, payload, token);
      setSelectedPatient(response.patient);
      setPatientSearchResults((current) => current.map((item) => (item.id === patientId ? response.patient : item)));
      await Promise.all([refreshRecentPatients(), refreshRecentPatientAccesses()]);
      setPatientSearchState('idle');
      setCurrentView('student-epma');
      showNotice(`Patient ${response.patient.fullName} re-admitted.`, 'success');
      return response.patient;
    } catch (error) {
      showNotice(error.message || 'Unable to re-admit patient.', 'danger');
      throw error;
    }
  };

  const handleVerifyWitness = async (username, password) => api.verifyWitness(username, password, token);
  const handleBlockedPrescribe = (message) => showNotice(message, 'danger');
  const handleApprovalToast = (message) => showNotice(message, 'success');
  const handleOpenCaseLibrary = () => setCurrentView('educator-library');
  const handleOpenAdminSettings = async () => {
    if (token && isEducatorAdmin) {
      await refreshUserAccounts(token);
    }
    setCurrentView('educator-admin');
  };
  const handleCreateFacilitatorCase = () => {
    const emptyDraft = createDraftCaseStudy();
    setDraft(emptyDraft);
    setSavedDraft(emptyDraft);
    setAnalytics(null);
    setLiveSessionCode('');
    setLiveSessionState(null);
    setLiveResponses({});
    setCurrentView('educator-create');
  };

  const handleEditFacilitatorCase = async (caseStudyId) => {
    const response = await api.getCaseStudy(caseStudyId, token);
    const loadedDraft = hydrateDraftFromCaseStudy(response.caseStudy);
    setDraft(loadedDraft);
    setSavedDraft(loadedDraft);
    setAnalytics(null);
    setCurrentView('educator-create');
  };

  const handleShareFacilitatorCase = async (caseStudyId, email) => {
    await api.shareCaseStudy(caseStudyId, email, 'student', token);
    await refreshEducatorData(token, caseStudyId);
    showNotice('Case study shared with student.');
  };

  const handleRevokeFacilitatorCaseShare = async (caseStudyId, shareId) => {
    await api.revokeCaseStudyShare(caseStudyId, shareId, token);
    await refreshEducatorData(token, caseStudyId);
    showNotice('Share removed.', 'info');
  };

  const handleCreateCaseStudySet = async (data) => {
    await api.createCaseStudySet(data, token);
    await refreshEducatorData(token);
    showNotice('Case study set created.');
  };

  const handleUpdateCaseStudySet = async (setId, data) => {
    await api.updateCaseStudySet(setId, data, token);
    await refreshEducatorData(token);
    showNotice('Case study set updated.');
  };

  const handleDeleteCaseStudySet = async (setId) => {
    await api.deleteCaseStudySet(setId, token);
    await refreshEducatorData(token);
    showNotice('Case study set deleted.', 'info');
  };

  const handleShareCaseStudySet = async (setId, email) => {
    await api.shareCaseStudySet(setId, email, token);
    await refreshEducatorData(token);
    showNotice('Case study set shared with student.');
  };

  const handleDeleteFacilitatorCase = async (caseStudyId) => {
    await api.deleteCaseStudy(caseStudyId, token);
    await refreshEducatorData(token);
    if (draft.id === caseStudyId) {
      const emptyDraft = createDraftCaseStudy();
      setDraft(emptyDraft);
      setSavedDraft(emptyDraft);
      setAnalytics(null);
    }
    showNotice('Case study deleted.', 'info');
  };

  const handleSetFacilitatorCaseStudentAccess = async (caseStudyId, enabled) => {
    await api.setCaseStudyStudentAccess(caseStudyId, enabled, token);
    await refreshEducatorData(token, caseStudyId);
    showNotice(enabled ? 'Self-paced student access turned on.' : 'Student access turned off.', enabled ? 'success' : 'info');
  };

  const handleEndFacilitatorLiveClassroom = async (caseStudyId) => {
    await api.endLiveClassroom(caseStudyId, token);
    if (draft.id === caseStudyId) {
      setLiveSessionCode('');
      setLiveSessionState(null);
      setLiveResponses({});
    }
    await refreshEducatorData(token, caseStudyId);
    showNotice('Live classroom ended.', 'info');
  };

  const handleCopyStudentShareLink = async (caseStudyId) => {
    const shareLink = `${window.location.origin}/?sharedCase=${encodeURIComponent(caseStudyId)}`;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareLink);
        showNotice('Student link copied. Learners will need to sign in before opening it.');
        return;
      }
    } catch (_error) {
      // Fall back to showing the link below.
    }
      showNotice(`Student share link: ${shareLink}`, 'info');
    };

  const handleCopyPresentationLink = async (caseStudyId) => {
    const presentationLink = `${window.location.origin}/?presentCase=${encodeURIComponent(caseStudyId)}`;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(presentationLink);
        showNotice('Presentation link copied. Facilitators will need to sign in before opening it.');
        return;
      }
    } catch (_error) {
      // Fall back to showing the link below.
    }
    showNotice(`Presentation link: ${presentationLink}`, 'info');
  };

  useEffect(() => {
    const sharedCaseId = getPendingSharedCaseId();
    if (!sharedCaseId || user?.role !== 'student' || !token) {
      return;
    }

    let cancelled = false;
    const openSharedCase = async () => {
      try {
        const started = await api.startCaseSession(sharedCaseId, token);
        const loaded = await api.getCaseSession(started.session.id, token);
        if (cancelled) {
          return;
        }
        setActiveCaseSession(loaded.session);
        setGrading(null);
        setCurrentView('player');
        await refreshStudentData(token);
        if (cancelled) {
          return;
        }
        showNotice(
          loaded.session?.attemptNumber ? `Shared case attempt ${loaded.session.attemptNumber} opened.` : 'Shared case session opened.',
          'info'
        );
        if (!cancelled) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (error) {
        if (!cancelled) {
          setCurrentView('student-cases');
          showNotice(error.message || 'This shared case study is not currently available.', 'warning');
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };

    openSharedCase();
    return () => {
      cancelled = true;
    };
  }, [token, user, refreshStudentData]);

  const renderMainView = () => {
    if (currentView === 'educator-home' && isEducatorUser) {
      return (
        <FacilitatorHome
          caseCount={caseStudies.length}
          showAdminTile={isEducatorAdmin}
          onCreateCaseStudy={handleCreateFacilitatorCase}
          onOpenCaseLibrary={handleOpenCaseLibrary}
          onOpenAdminSettings={handleOpenAdminSettings}
        />
      );
    }

    if (currentView === 'educator-library' && isEducatorUser) {
      return (
        <FacilitatorCaseLibrary
          ownedCaseStudies={caseStudies}
          caseStudySets={caseStudySets}
          onBack={() => setCurrentView('educator-home')}
          onCreateCaseStudy={handleCreateFacilitatorCase}
          onEditCaseStudy={handleEditFacilitatorCase}
          onViewResults={handleOpenCaseResults}
          onDeleteCaseStudy={handleDeleteFacilitatorCase}
            onArchiveCaseStudy={handleArchiveCase}
            onUnarchiveCaseStudy={handleUnarchiveCase}
            onToggleStudentAccess={handleSetFacilitatorCaseStudentAccess}
            onEndLiveClassroom={handleEndFacilitatorLiveClassroom}
            onTestCaseStudy={handleTestFacilitatorCase}
            onPublishCaseStudy={handlePublishFacilitatorCase}
            onPresentCaseStudy={handleOpenFacilitatorPresentation}
            onCopyPresentationLink={handleCopyPresentationLink}
            onShareCaseStudy={handleShareFacilitatorCase}
            onRevokeCaseStudyShare={handleRevokeFacilitatorCaseShare}
            onCreateCaseStudySet={handleCreateCaseStudySet}
            onUpdateCaseStudySet={handleUpdateCaseStudySet}
            onDeleteCaseStudySet={handleDeleteCaseStudySet}
          onShareCaseStudySet={handleShareCaseStudySet}
          onCopyStudentLink={handleCopyStudentShareLink}
          onRefreshCaseStudies={(caseStudyId) => refreshEducatorData(token, caseStudyId)}
        />
      );
    }

    if (currentView === 'educator-results' && isEducatorUser) {
      const resultsCase = caseStudies.find((item) => item.id === resultsCaseId) || null;
      return (
        <FacilitatorCaseResults
          caseStudy={resultsCase}
          analytics={analytics}
          onBack={() => setCurrentView('educator-library')}
          onRefresh={handleRefreshAnalytics}
          onOpenAttempt={handleOpenFacilitatorAttempt}
          onResetAttempt={handleResetFacilitatorAttempt}
        />
      );
    }

    if (currentView === 'educator-attempt' && isEducatorUser) {
      const resultsCase = caseStudies.find((item) => item.id === resultsCaseId) || null;
      return (
        <FacilitatorAttemptReview
          caseStudy={resultsCase}
          attempt={selectedAttempt}
          onBack={() => setCurrentView('educator-results')}
          onSaveReview={handleSaveFacilitatorAttemptReview}
          onResetAttempt={handleResetFacilitatorAttempt}
          savingReview={savingAttemptReview}
        />
      );
    }

    if (currentView === 'educator-create' && isEducatorUser) {
      const currentCaseMeta = caseStudies.find((item) => item.id === draft.id) || null;
      return (
        <FacilitatorCaseAuthoringWorkspace
          caseStudy={draft}
          savedCaseStudy={savedDraft}
          caseMeta={currentCaseMeta}
          drugLibrary={drugLibrary}
          commonConditions={commonConditions}
          onChange={setDraft}
          onSave={handleSave}
          isSaving={saveLoading}
          onBack={() => setCurrentView('educator-library')}
          onNotice={showNotice}
          onTestDraft={handleTestCurrentDraft}
        />
      );
    }

    if (currentView === 'educator-admin' && isEducatorAdmin) {
      return (
          <FacilitatorAdminWorkspace
            user={user}
            drugLibrary={drugLibrary}
            userAccounts={userAccounts}
            onBack={() => setCurrentView('educator-home')}
            onPreviewDrugLibraryImport={handlePreviewDrugLibraryImport}
            onImportDrugLibrary={handleImportDrugLibrary}
            onAddRoute={handleAddRouteOption}
            onDeleteRoute={handleDeleteRouteOption}
            onUpdateRoute={handleUpdateRouteOption}
            onMoveRoute={handleMoveRouteOption}
            onImportRoutes={handleImportRouteOptions}
            onAddFrequency={handleAddFrequencyOption}
            onDeleteFrequency={handleDeleteFrequencyOption}
            onUpdateFrequency={handleUpdateFrequencyOption}
            onMoveFrequency={handleMoveFrequencyOption}
            onImportFrequencies={handleImportFrequencyOptions}
            onAddIndication={handleAddIndicationOption}
            onDeleteIndication={handleDeleteIndicationOption}
            onUpdateIndication={handleUpdateIndicationOption}
            onImportIndications={handleImportIndicationOptions}
            onAddUnit={handleAddUnitOption}
            onDeleteUnit={handleDeleteUnitOption}
            onUpdateUnit={handleUpdateUnitOption}
            onImportUnits={handleImportUnitOptions}
            onAddForm={handleAddFormOption}
            onDeleteForm={handleDeleteFormOption}
            onUpdateForm={handleUpdateFormOption}
            onImportForms={handleImportFormOptions}
            onAddCriticalMedicine={handleAddCriticalMedicine}
            onDeleteCriticalMedicine={handleDeleteCriticalMedicine}
            onAddControlledDrug={handleAddControlledDrug}
            onDeleteControlledDrug={handleDeleteControlledDrug}
            onAddOrderSet={handleAddOrderSet}
            onUpdateOrderSet={handleUpdateOrderSet}
            onDeleteOrderSet={handleDeleteOrderSet}
            onUpdateDrug={handleUpdateDrugLibraryItem}
            onAddDrug={handleCreateDrugLibraryItem}
            onDeleteDrug={handleDeleteDrugLibraryItem}
            onSuspendUser={handleSuspendUserAccount}
            onRestoreUser={handleRestoreUserAccount}
            onRemoveUserAccess={handleRemoveUserAccountAccess}
            isSaving={saveLoading}
          />
        );
      }

    if (currentView === 'educator-present' && isEducatorUser) {
      return (
        <FacilitatorCasePresentation
          liveState={liveSessionState || {
            sessionCode: liveSessionCode,
            payload: draft,
            stepIndex: 0,
            revealAnswers: false,
          }}
          liveResponses={liveResponses}
          onBack={handleOpenCaseLibrary}
          onChangeStep={handleSetLiveStep}
          onToggleReveal={handleSetLiveReveal}
          onRevealQuestion={handleRevealLiveQuestion}
          onChangePresentationStage={handleSetLivePresentationStage}
          onChangeStageIndex={handleSetLiveStageIndex}
          onEndSession={() => handleEndFacilitatorLiveClassroom(draft.id)}
        />
      );
    }

    if (currentView === 'player' && activeCaseSession) {
      return <CaseSessionPlayer session={activeCaseSession} drugLibrary={drugLibrary} onSave={handleSaveCaseSession} onSubmit={handleSubmitCaseSession} onBack={handleOpenStudentCases} saving={saveLoading} grading={grading} notice={notice} />;
    }

    if (currentView === 'educator-test-player' && activeCaseSession && isEducatorUser) {
      return (
        <CaseSessionPlayer
          session={activeCaseSession}
          drugLibrary={drugLibrary}
          onSave={handleSaveCaseSession}
          onSubmit={handleSubmitCaseSession}
          onBack={() => {
            setActiveCaseSession(null);
            setGrading(null);
            setCurrentView(caseTestReturnView);
          }}
          saving={saveLoading}
          grading={grading}
          notice={notice}
          previewMode
          backLabel={caseTestReturnView === 'educator-create' ? 'Back to editor' : 'Back to case library'}
        />
      );
    }

    if (currentView === 'live') {
      return (
        <LiveSessionView
          liveState={liveSessionState || {
            sessionCode: connectedSessionCode,
            payload: studentCaseStudy,
            stepIndex: 0,
            revealAnswers: false,
          }}
          drugLibrary={drugLibrary}
          liveResponses={liveResponses}
          participantId={participantId}
          onSubmitAnswer={handleSubmitLiveResponse}
          onLeave={handleLeaveLive}
        />
      );
    }

    if (currentView === 'student-cases' && user?.role === 'student') {
      return (
        <StudentDashboard
          library={library}
          caseStudySets={studentCaseStudySets}
          sessions={studentSessions}
          liveSessions={studentLiveSessions}
          onStartCase={handleStartCase}
          onResumeSession={handleResumeSession}
          onRejoinLiveSession={handleRejoinLiveSession}
          onToggleFavourite={handleToggleFavouriteCaseStudy}
          onBack={() => setCurrentView('student-home')}
        />
      );
    }

    if (currentView === 'student-epma' && user?.role === 'student') {
      return (
        <StudentEpmaWorkspace
          currentUser={user}
          drugLibrary={drugLibrary}
          onBack={() => setCurrentView('student-home')}
          onBackToFinder={handleOpenEpmaWorkspace}
          onSearch={handleSearchPatient}
          onSelectPatient={handleSelectPatient}
          onCreatePatient={handleCreateTestPatient}
          onUpdateAllergies={handleUpdatePatientAllergies}
          onUpdateCaseNotes={handleUpdatePatientCaseNotes}
          onUpdatePrescriptions={handleUpdatePatientPrescriptions}
          onUpdateMeasurements={handleUpdatePatientMeasurements}
          onDeleteMeasurement={handleDeletePatientMeasurement}
          onDischargePatient={handleDischargePatient}
          onReadmitPatient={handleReadmitPatient}
          onVerifyWitness={handleVerifyWitness}
          onBlockedPrescribe={handleBlockedPrescribe}
          onApprovalToast={handleApprovalToast}
          searchResults={patientSearchResults}
          recentPatients={recentPatients}
          commonConditions={commonConditions}
          searchState={patientSearchState}
          selectedPatient={selectedPatient}
        />
      );
    }

    if (currentView === 'student-home' && user?.role === 'student') {
      return (
        <StudentHome
          onOpenCases={handleOpenStudentCases}
          onOpenEpma={handleOpenEpmaWorkspace}
          onBack={() => setCurrentView('public')}
          sessionInput={sessionInput}
          onSessionInputChange={setSessionInput}
          onJoinLive={handleJoinLive}
        />
      );
    }

    return (
      <div className="login-landing">
        <Container>
          <Row className="justify-content-center">
            <Col md={10} lg={7} xl={5}>
              <div className="app-panel login-landing__card">
                <div className="login-landing__eyebrow">MediCase Teaching Platform</div>
                <Login
                  onSubmit={handleAuthSubmit}
                  loading={authLoading}
                  error={authError}
                  onForgotPassword={handleForgotPassword}
                  initialMode={authMode}
                  onModeChange={setAuthMode}
                />
              </div>
            </Col>
          </Row>
        </Container>
      </div>
    );
  };

  return (
    <>
      {token ? (
        <NavBar
          user={user}
          currentView={currentView}
          onViewChange={setCurrentView}
          onOpenCaseLibrary={handleOpenCaseLibrary}
          onOpenAdminSettings={handleOpenAdminSettings}
          onOpenCases={handleOpenStudentCases}
          onOpenEpma={handleOpenEpmaWorkspace}
          onSelectPatient={handleSelectPatient}
          onLoginClick={() => {
            setAuthMode('login');
            setLoginModal(true);
          }}
          onCreateAccountClick={() => {
            setAuthMode('register');
            setLoginModal(true);
          }}
          onForgotPassword={handleForgotPassword}
          onLogout={handleLogout}
          activeSessionCode={liveSessionCode}
          sessionInput={sessionInput}
          onSessionInputChange={setSessionInput}
          onJoinLive={handleJoinLive}
          studentError={studentError}
          recentPatients={recentPatients}
          recentPatientAccesses={recentPatientAccesses}
        />
      ) : null}
      <div className={`app-page-shell ${token ? 'app-page-shell--authed' : ''}`}>
        {renderMainView()}
        {!(currentView === 'player' || (currentView === 'student-epma' && selectedPatient)) ? (
          <AppFooter onOpenPrivacyPolicy={() => setShowPrivacyPolicy(true)} />
        ) : null}
      </div>
      <PrivacyPolicyModal show={showPrivacyPolicy} onHide={() => setShowPrivacyPolicy(false)} />
      <ToastContainer position="top-end" className="p-3 mt-5 app-toast-container">
        <Toast show={Boolean(notice)} onClose={() => setNotice(null)} delay={4000} autohide bg={notice?.variant || 'success'}>
          <Toast.Body className="text-white fw-semibold">{notice?.message}</Toast.Body>
          
        </Toast>
      </ToastContainer>
      <Modal show={loginModal} onHide={() => { if (token) { setLoginModal(false); } }} backdrop={token ? true : 'static'} keyboard={Boolean(token)}>
        <Modal.Header closeButton={Boolean(token)}>
          <Modal.Title>{authMode === 'login' ? 'Sign in to the teaching platform' : 'Create your teaching platform account'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Login
            onSubmit={handleAuthSubmit}
            loading={authLoading}
            error={authError}
            onForgotPassword={handleForgotPassword}
            initialMode={authMode}
            onModeChange={setAuthMode}
          />
        </Modal.Body>
      </Modal>
    </>
  );
};

export default App;
