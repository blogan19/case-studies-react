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
import LecturerDashboard from './components/dashboard/LecturerDashboard';
import StudentDashboard from './components/dashboard/StudentDashboard';
import StudentHome from './components/dashboard/StudentHome';
import StudentEpmaWorkspace from './components/dashboard/StudentEpmaWorkspace';
import CaseSessionPlayer from './components/player/CaseSessionPlayer';
import LiveSessionView from './components/player/LiveSessionView';
import LecturerLiveView from './components/player/LecturerLiveView';
import AppFooter from './components/AppFooter';
import { api, createSessionEventSource } from './lib/api';
import { createDraftCaseStudy, getSampleCaseStudy, normalizeCaseStudy } from './lib/caseStudy';

const STORAGE_KEY = 'case-study-auth';
const SESSION_KEY = 'case-study-live-session';
const PARTICIPANT_KEY = 'case-study-live-participant';

const App = () => {
  const [currentView, setCurrentView] = useState('public');
  const [loginModal, setLoginModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [studentError, setStudentError] = useState('');
  const [notice, setNotice] = useState(null);
  const [token, setToken] = useState(() => window.localStorage.getItem(STORAGE_KEY) || '');
  const [user, setUser] = useState(null);
  const [caseStudies, setCaseStudies] = useState([]);
  const [library, setLibrary] = useState([]);
  const [drugLibrary, setDrugLibrary] = useState({ items: [], metadata: { routes: [], frequencies: [], nonAdmins: [] } });
  const [commonConditions, setCommonConditions] = useState([]);
  const [studentSessions, setStudentSessions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [draft, setDraft] = useState(() => createDraftCaseStudy());
  const [activeCaseSession, setActiveCaseSession] = useState(null);
  const [grading, setGrading] = useState(null);
  const [sessionInput, setSessionInput] = useState(() => window.localStorage.getItem(SESSION_KEY) || '');
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

  const refreshEducatorData = async (authToken, preferredCaseId = null) => {
    const response = await api.listCaseStudies(authToken);
    setCaseStudies(response.caseStudies);
    const selectedCase = response.caseStudies.find((item) => item.id === preferredCaseId) || response.caseStudies[0] || null;

    if (selectedCase) {
      setDraft(normalizeCaseStudy({ id: selectedCase.id, ...selectedCase.draftData }));
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
      setDraft(createDraftCaseStudy());
      setLiveSessionCode('');
      setLiveSessionState(null);
      setLiveResponses({});
      setAnalytics(null);
    }
  };

  const refreshStudentData = async (authToken) => {
    const [libraryResponse, sessionsResponse] = await Promise.all([api.listLibrary(authToken), api.listMySessions(authToken)]);
    setLibrary(libraryResponse.caseStudies);
    setStudentSessions(sessionsResponse.sessions);
  };

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
      setLibrary([]);
      setStudentSessions([]);
      setRecentPatients([]);
      setRecentPatientAccesses([]);
      setCommonConditions([]);
      return undefined;
    }

    let cancelled = false;
    const hydrate = async () => {
      try {
        const me = await api.me(token);
        if (cancelled) return;
        setUser(me.user);
        await Promise.all([refreshDrugLibrary(), refreshCommonConditions(token)]);

        if (me.user.role === 'educator') {
          await refreshEducatorData(token);
          if (!cancelled) setCurrentView('educator');
        } else {
          await refreshStudentData(token);
          await Promise.all([refreshRecentPatients(), refreshRecentPatientAccesses()]);
          if (!cancelled) setCurrentView('student-home');
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
  }, [refreshCommonConditions, refreshRecentPatientAccesses, refreshRecentPatients, token]);

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
    let cancelled = false;

    const connectToSession = async () => {
      try {
        const response = await api.getSession(connectedSessionCode);
        if (cancelled) return;
        setLiveSessionState(response.session);
        setStudentCaseStudy(normalizeCaseStudy(response.session.payload));
        const responses = await api.getSessionResponses(connectedSessionCode);
        if (cancelled) return;
        setLiveResponses(responses.summary || {});
        setStudentError('');
        eventSource = createSessionEventSource(connectedSessionCode);
        eventSource.addEventListener('case-update', (event) => {
          const session = JSON.parse(event.data);
          setLiveSessionState(session);
          setStudentCaseStudy(normalizeCaseStudy(session.payload));
        });
        eventSource.addEventListener('response-update', (event) => {
          setLiveResponses(JSON.parse(event.data));
        });
        eventSource.onerror = () => {
          setStudentError('Live updates paused. Try reconnecting to the session.');
        };
      } catch (error) {
        if (!cancelled) {
          setStudentError(error.message);
        }
      }
    };

    connectToSession();
    return () => {
      cancelled = true;
      if (eventSource) eventSource.close();
    };
  }, [connectedSessionCode]);

  const handleAuthSubmit = async ({ email, password, displayName, mode, role }) => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const response = mode === 'login' ? await api.login(email, password) : await api.register(email, password, displayName, role);
      window.localStorage.setItem(STORAGE_KEY, response.token);
      setToken(response.token);
      setUser(response.user);
      setLoginModal(false);
      setCurrentView(response.user.role === 'educator' ? 'educator' : 'student-home');
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
    setActiveCaseSession(null);
    setGrading(null);
    setCurrentView('public');
    showNotice('Signed out.', 'info');
  };

  const handleForgotPassword = () => {
    showNotice('Password reset is not configured in this demo yet. Use the demo credentials or create a new account.', 'info');
  };

  const handleSave = async (nextDraft) => {
    setSaveLoading(true);
    try {
      const response = nextDraft.id ? await api.updateCaseStudy(nextDraft.id, nextDraft, token) : await api.createCaseStudy(nextDraft, token);
      const savedDraft = normalizeCaseStudy({ id: response.caseStudy.id, ...response.caseStudy.draftData });
      setDraft(savedDraft);
      await refreshEducatorData(token, savedDraft.id);
      if (liveSessionCode) {
        const liveResponse = await api.pushSession(liveSessionCode, savedDraft, token);
        setLiveSessionState(liveResponse.session);
      }
      showNotice(nextDraft.id ? 'Case study updated.' : 'Case study created.');
      return savedDraft;
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
    setDraft(normalizeCaseStudy({ id: response.caseStudy.id, ...response.caseStudy.draftData }));
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

  const handlePublish = async (nextDraft) => {
    let publishDraft = nextDraft;
    if (!publishDraft.id) {
      publishDraft = await handleSave(nextDraft);
      if (!publishDraft?.id) return;
    }

    setSaveLoading(true);
    try {
      const response = await api.publishCaseStudy(publishDraft.id, publishDraft, token);
      setLiveSessionCode(response.session.sessionCode);
      setLiveSessionState(response.session);
      setLiveResponses({});
      setSessionInput(response.session.sessionCode);
      setConnectedSessionCode(response.session.sessionCode);
      setStudentCaseStudy(normalizeCaseStudy(response.session.payload));
      await refreshEducatorData(token, publishDraft.id);
      showNotice(`Case published. Live code: ${response.session.sessionCode}`);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCloneCase = async (caseId) => {
    await api.cloneCaseStudy(caseId, token);
    await refreshEducatorData(token);
    showNotice('Case cloned.');
  };

  const handleArchiveCase = async (caseId) => {
    await api.archiveCaseStudy(caseId, token);
    await refreshEducatorData(token);
    showNotice('Case archived.', 'info');
  };

  const handleRefreshAnalytics = async (caseId) => {
    const response = await api.getCaseAnalytics(caseId, token);
    setAnalytics(response.analytics);
    showNotice('Analytics refreshed.', 'info');
  };

  const handleImportDrugLibrary = async (csvContent, replaceExisting) => {
    await api.importDrugLibrary(csvContent, token, replaceExisting);
    await refreshDrugLibrary();
    showNotice('Drug library imported.', 'success');
  };

  const handleSyncLive = async (caseData) => {
    if (!liveSessionCode) return;
    const response = await api.pushSession(liveSessionCode, caseData, token);
    setLiveSessionState(response.session);
    showNotice('Live classroom view synced.', 'info');
  };

  const handleSetLiveStep = async (stepIndex) => {
    if (!liveSessionCode || !liveSessionState) return;
    const response = await api.controlSession(liveSessionCode, stepIndex, liveSessionState.revealAnswers, token);
    setLiveSessionState(response.session);
    showNotice(`Moved live session to question ${response.session.stepIndex + 1}.`, 'info');
  };

  const handleSetLiveReveal = async (revealAnswers) => {
    if (!liveSessionCode || !liveSessionState) return;
    const response = await api.controlSession(liveSessionCode, liveSessionState.stepIndex, revealAnswers, token);
    setLiveSessionState(response.session);
    showNotice(revealAnswers ? 'Answer revealed to students.' : 'Answer hidden from students.', 'info');
  };

  const handleStartCase = async (caseId) => {
    const started = await api.startCaseSession(caseId, token);
    const loaded = await api.getCaseSession(started.session.id, token);
    setActiveCaseSession(loaded.session);
    setGrading(null);
    setCurrentView('player');
    await refreshStudentData(token);
    showNotice('Case session opened.', 'info');
  };

  const handleResumeSession = async (sessionId) => {
    const loaded = await api.getCaseSession(sessionId, token);
    setActiveCaseSession(loaded.session);
    setGrading(null);
    setCurrentView('player');
    showNotice('Session loaded.', 'info');
  };

  const handleSaveCaseSession = async (answers, progress) => {
    if (!activeCaseSession) return;
    setSaveLoading(true);
    try {
      const updated = await api.saveCaseSession(activeCaseSession.id, answers, progress, token);
      setActiveCaseSession((current) => ({ ...current, answers, progress, status: 'in_progress', updatedAt: updated.session.updated_at || current.updatedAt }));
      await refreshStudentData(token);
      showNotice('Progress saved.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSubmitCaseSession = async (answers, progress) => {
    if (!activeCaseSession) return;
    setSaveLoading(true);
    try {
      const completed = await api.completeCaseSession(activeCaseSession.id, answers, progress, token);
      setActiveCaseSession((current) => ({ ...current, answers, progress: { ...progress, breakdown: completed.grading.breakdown }, status: 'completed', score: completed.grading.score, completedAt: completed.session.completed_at || current.completedAt, updatedAt: completed.session.updated_at || current.updatedAt }));
      setGrading(completed.grading);
      await refreshStudentData(token);
      showNotice(`Case submitted. Score: ${completed.grading.score}%`);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleJoinLive = (event) => {
    if (event?.preventDefault) {
      event.preventDefault();
    }
    if (!sessionInput.trim()) {
      setStudentError('Enter a live session code to join the class case.');
      return false;
    }
    setConnectedSessionCode(sessionInput.trim().toUpperCase());
    setCurrentView('live');
    showNotice(`Joined live session ${sessionInput.trim().toUpperCase()}.`, 'info');
    return true;
  };

  const handleLeaveLive = () => {
    window.localStorage.removeItem(SESSION_KEY);
    setConnectedSessionCode('');
    setLiveSessionState(null);
    setLiveResponses({});
    setStudentError('');
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
    showNotice('Live answer submitted.', 'success');
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

  const renderMainView = () => {
    if (currentView === 'educator' && user?.role === 'educator') {
      return (
        <LecturerDashboard
          caseStudy={draft}
          caseStudies={caseStudies}
          analytics={analytics}
          liveState={liveSessionState}
          liveResponses={liveResponses}
          drugLibrary={drugLibrary}
          onChange={setDraft}
          onImportDrugLibrary={handleImportDrugLibrary}
          onSave={handleSave}
          onLoadCase={handleLoadCase}
          onPublish={handlePublish}
          onClone={handleCloneCase}
          onArchive={handleArchiveCase}
          onRefreshAnalytics={handleRefreshAnalytics}
          onSyncLive={handleSyncLive}
          onSetLiveStep={handleSetLiveStep}
          onSetLiveReveal={handleSetLiveReveal}
          isSaving={saveLoading}
          activeSessionCode={liveSessionCode}
        />
      );
    }

    if (currentView === 'lecturer-live' && user?.role === 'educator') {
      return (
        <LecturerLiveView
          liveState={liveSessionState || {
            sessionCode: liveSessionCode,
            payload: draft,
            stepIndex: 0,
            revealAnswers: false,
          }}
          liveResponses={liveResponses}
          onChangeStep={handleSetLiveStep}
          onToggleReveal={handleSetLiveReveal}
        />
      );
    }

    if (currentView === 'player' && activeCaseSession) {
      return <CaseSessionPlayer session={activeCaseSession} drugLibrary={drugLibrary} onSave={handleSaveCaseSession} onSubmit={handleSubmitCaseSession} onBack={() => setCurrentView('student-cases')} saving={saveLoading} grading={grading} notice={notice} />;
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
          onSubmitAnswer={handleSubmitLiveResponse}
          onLeave={handleLeaveLive}
        />
      );
    }

    if (currentView === 'student-cases' && user?.role === 'student') {
      return <StudentDashboard library={library} sessions={studentSessions} onStartCase={handleStartCase} onResumeSession={handleResumeSession} onBack={() => setCurrentView('student-home')} />;
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
          onOpenCases={() => setCurrentView('student-cases')}
          onOpenEpma={handleOpenEpmaWorkspace}
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
                <h1 className="login-landing__title">Sign in to continue</h1>
                <p className="login-landing__copy">
                  Access student and educator workflows, join live teaching sessions, and pick up where you left off.
                </p>
                <Login
                  onSubmit={handleAuthSubmit}
                  loading={authLoading}
                  error={authError}
                  onForgotPassword={handleForgotPassword}
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
          onOpenCases={() => setCurrentView('student-cases')}
          onOpenEpma={handleOpenEpmaWorkspace}
          onSelectPatient={handleSelectPatient}
          onLoginClick={() => setLoginModal(true)}
          onCreateAccountClick={() => setLoginModal(true)}
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
        {!(currentView === 'player' || (currentView === 'student-epma' && selectedPatient)) ? <AppFooter /> : null}
      </div>
      <ToastContainer position="top-end" className="p-3 app-toast-container">
        <Toast show={Boolean(notice)} onClose={() => setNotice(null)} delay={4000} autohide bg={notice?.variant || 'success'}>
          <Toast.Body className="text-white fw-semibold">{notice?.message}</Toast.Body>
        </Toast>
      </ToastContainer>
      <Modal show={loginModal} onHide={() => { if (token) { setLoginModal(false); } }} backdrop={token ? true : 'static'} keyboard={Boolean(token)}>
        <Modal.Header closeButton={Boolean(token)}>
          <Modal.Title>Sign in to the teaching platform</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Login
            onSubmit={handleAuthSubmit}
            loading={authLoading}
            error={authError}
            onForgotPassword={handleForgotPassword}
          />
        </Modal.Body>
      </Modal>
    </>
  );
};

export default App;
