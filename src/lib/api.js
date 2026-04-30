const API_ROOT = '/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_ROOT}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...options.headers,
    },
    ...options,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new Error(payload?.error || 'Request failed');
  }

  return payload;
}

export const api = {
  login(email, password) {
    return request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  },
  register(email, password, displayName, role) {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName, role }),
    });
  },
  verifyWitness(username, password, token) {
    return request('/auth/verify-witness', {
      method: 'POST',
      token,
      body: JSON.stringify({ username, password }),
    });
  },
  me(token) {
    return request('/auth/me', { token });
  },
  getDrugLibrary() {
    return request('/drug-library');
  },
  getCommonConditions(token) {
    return request('/common-conditions', { token });
  },
  searchTestPatients(searchFields, token) {
    const search = new URLSearchParams();
    Object.entries(searchFields || {}).forEach(([key, value]) => {
      if (value) {
        search.set(key, value);
      }
    });
    return request(`/test-patients/search?${search.toString()}`, { token });
  },
  listRecentTestPatients(token) {
    return request('/test-patients/recent', { token });
  },
  listRecentPatientAccesses(token) {
    return request('/test-patients/recent-accesses', { token });
  },
  getTestPatient(id, token) {
    return request(`/test-patients/${id}`, { token });
  },
  createTestPatient(data, token) {
    return request('/test-patients', {
      method: 'POST',
      token,
      body: JSON.stringify(data),
    });
  },
  updateTestPatientAllergies(id, payload, token) {
    return request(`/test-patients/${id}/allergies`, {
      method: 'PUT',
      token,
      body: JSON.stringify(payload),
    });
  },
  updateTestPatientCaseNotes(id, payload, token) {
    return request(`/test-patients/${id}/case-notes`, {
      method: 'PUT',
      token,
      body: JSON.stringify(payload),
    });
  },
  updateTestPatientPrescriptions(id, prescriptions, token) {
    return request(`/test-patients/${id}/prescriptions`, {
      method: 'PUT',
      token,
      body: JSON.stringify({ prescriptions }),
    });
  },
  updateTestPatientMeasurements(id, payload, token) {
    return request(`/test-patients/${id}/measurements`, {
      method: 'PUT',
      token,
      body: JSON.stringify(payload),
    });
  },
  deleteTestPatientMeasurement(patientId, measurementId, token) {
    return request(`/test-patients/${patientId}/measurements/${measurementId}`, {
      method: 'DELETE',
      token,
    });
  },
  dischargeTestPatient(id, token) {
    return request(`/test-patients/${id}/discharge`, {
      method: 'POST',
      token,
    });
  },
  readmitTestPatient(id, payload, token) {
    return request(`/test-patients/${id}/readmit`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    });
  },
  previewDrugLibraryImport(csvContent, token, replaceExisting = true) {
      return request('/drug-library/import/preview', {
        method: 'POST',
        token,
        body: JSON.stringify({ csvContent, replaceExisting }),
      });
  },
  importDrugLibrary(csvContent, token, replaceExisting = true, confirmedMissing = null) {
      return request('/drug-library/import', {
        method: 'POST',
        token,
        body: JSON.stringify({ csvContent, replaceExisting, confirmedMissing }),
      });
  },
  createDrugLibraryItem(payload, token) {
      return request('/drug-library/items', {
        method: 'POST',
        token,
        body: JSON.stringify(payload),
      });
    },
  createRouteOption(label, token) {
    return request('/admin/routes', {
      method: 'POST',
      token,
      body: JSON.stringify({ label }),
    });
  },
  updateRouteOption(id, label, sortOrder, token) {
    return request(`/admin/routes/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify({ label, sortOrder }),
    });
  },
  importRouteOptions(csvContent, token) {
    return request('/admin/routes/import', {
      method: 'POST',
      token,
      body: JSON.stringify({ csvContent }),
    });
  },
  deleteRouteOption(id, token) {
    return request(`/admin/routes/${id}`, {
      method: 'DELETE',
      token,
    });
  },
  createFrequencyOption(label, defaultAdminTimes, token) {
    return request('/admin/frequencies', {
      method: 'POST',
      token,
      body: JSON.stringify({ label, defaultAdminTimes }),
    });
  },
  updateFrequencyOption(id, label, defaultAdminTimes, sortOrder, token) {
    return request(`/admin/frequencies/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify({ label, defaultAdminTimes, sortOrder }),
    });
  },
  importFrequencyOptions(csvContent, token) {
    return request('/admin/frequencies/import', {
      method: 'POST',
      token,
      body: JSON.stringify({ csvContent }),
    });
  },
  deleteFrequencyOption(id, token) {
    return request(`/admin/frequencies/${id}`, {
      method: 'DELETE',
      token,
    });
  },
  createIndicationOption(label, token) {
    return request('/admin/indications', {
      method: 'POST',
      token,
      body: JSON.stringify({ label }),
    });
  },
  updateIndicationOption(id, label, token) {
    return request(`/admin/indications/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify({ label }),
    });
  },
  importIndicationOptions(csvContent, token) {
    return request('/admin/indications/import', {
      method: 'POST',
      token,
      body: JSON.stringify({ csvContent }),
    });
  },
  deleteIndicationOption(id, token) {
    return request(`/admin/indications/${id}`, {
      method: 'DELETE',
      token,
    });
  },
  createUnitOption(label, token) {
    return request('/admin/units', {
      method: 'POST',
      token,
      body: JSON.stringify({ label }),
    });
  },
  updateUnitOption(id, label, token) {
    return request(`/admin/units/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify({ label }),
    });
  },
  importUnitOptions(csvContent, token) {
    return request('/admin/units/import', {
      method: 'POST',
      token,
      body: JSON.stringify({ csvContent }),
    });
  },
  deleteUnitOption(id, token) {
    return request(`/admin/units/${id}`, {
      method: 'DELETE',
      token,
    });
  },
  createFormOption(label, token) {
    return request('/admin/forms', {
      method: 'POST',
      token,
      body: JSON.stringify({ label }),
    });
  },
  updateFormOption(id, label, token) {
    return request(`/admin/forms/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify({ label }),
    });
  },
  importFormOptions(csvContent, token) {
    return request('/admin/forms/import', {
      method: 'POST',
      token,
      body: JSON.stringify({ csvContent }),
    });
  },
  createCriticalMedicine(drugId, token) {
    return request('/admin/critical-medicines', {
      method: 'POST',
      token,
      body: JSON.stringify({ drugId }),
    });
  },
  deleteCriticalMedicine(id, token) {
    return request(`/admin/critical-medicines/${id}`, {
      method: 'DELETE',
      token,
    });
  },
  createControlledDrug(drugId, token) {
    return request('/admin/controlled-drugs', {
      method: 'POST',
      token,
      body: JSON.stringify({ drugId }),
    });
  },
  deleteControlledDrug(id, token) {
    return request(`/admin/controlled-drugs/${id}`, {
      method: 'DELETE',
      token,
    });
  },
  createOrderSet(payload, token) {
    return request('/admin/order-sets', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    });
  },
  updateOrderSet(id, payload, token) {
    return request(`/admin/order-sets/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify(payload),
    });
  },
  deleteOrderSet(id, token) {
    return request(`/admin/order-sets/${id}`, {
      method: 'DELETE',
      token,
    });
  },
  deleteFormOption(id, token) {
    return request(`/admin/forms/${id}`, {
      method: 'DELETE',
      token,
    });
  },
  listUserAccounts(token) {
    return request('/admin/users', { token });
  },
  suspendUserAccount(id, reason, token) {
    return request(`/admin/users/${id}/suspend`, {
      method: 'POST',
      token,
      body: JSON.stringify({ reason }),
    });
  },
  restoreUserAccount(id, token) {
    return request(`/admin/users/${id}/restore`, {
      method: 'POST',
      token,
    });
  },
  removeUserAccountAccess(id, reason, token) {
    return request(`/admin/users/${id}/remove-access`, {
      method: 'POST',
      token,
      body: JSON.stringify({ reason }),
    });
  },
  updateDrugLibraryItem(id, payload, token) {
      return request(`/drug-library/items/${id}`, {
        method: 'PUT',
        token,
        body: JSON.stringify(payload),
      });
    },
    deleteDrugLibraryItem(id, token) {
      return request(`/drug-library/items/${id}`, {
        method: 'DELETE',
        token,
      });
    },
  listCaseStudies(token) {
    return request('/case-studies', { token });
  },
  listCaseStudyWorkspace(token) {
    return request('/case-studies/workspace', { token });
  },
  listLibrary(token) {
    return request('/library', { token });
  },
  listCaseStudySetsWorkspace(token) {
    return request('/case-study-sets/workspace', { token });
  },
  getCaseStudy(id, token) {
    return request(`/case-studies/${id}`, { token });
  },
  createCaseStudy(data, token) {
    return request('/case-studies', { method: 'POST', token, body: JSON.stringify({ data }) });
  },
  updateCaseStudy(id, data, token) {
    return request(`/case-studies/${id}`, { method: 'PUT', token, body: JSON.stringify({ data }) });
  },
  cloneCaseStudy(id, token) {
    return request(`/case-studies/${id}/clone`, { method: 'POST', token });
  },
  copySharedCaseStudy(id, token) {
    return request(`/case-studies/${id}/copy-shared`, { method: 'POST', token });
  },
  archiveCaseStudy(id, token) {
    return request(`/case-studies/${id}/archive`, { method: 'POST', token });
  },
  unarchiveCaseStudy(id, token) {
    return request(`/case-studies/${id}/unarchive`, { method: 'POST', token });
  },
  deleteCaseStudy(id, token) {
    return request(`/case-studies/${id}`, { method: 'DELETE', token });
  },
  shareCaseStudy(id, email, shareType, token) {
    return request(`/case-studies/${id}/share`, {
      method: 'POST',
      token,
      body: JSON.stringify({ email, shareType }),
    });
  },
  revokeCaseStudyShare(caseId, shareId, token) {
    return request(`/case-studies/${caseId}/shares/${shareId}`, {
      method: 'DELETE',
      token,
    });
  },
  createCaseStudySet(data, token) {
    return request('/case-study-sets', {
      method: 'POST',
      token,
      body: JSON.stringify({ data }),
    });
  },
  updateCaseStudySet(id, data, token) {
    return request(`/case-study-sets/${id}`, {
      method: 'PUT',
      token,
      body: JSON.stringify({ data }),
    });
  },
  deleteCaseStudySet(id, token) {
    return request(`/case-study-sets/${id}`, {
      method: 'DELETE',
      token,
    });
  },
  shareCaseStudySet(id, email, token) {
    return request(`/case-study-sets/${id}/share`, {
      method: 'POST',
      token,
      body: JSON.stringify({ email }),
    });
  },
  setCaseStudyStudentAccess(id, enabled, token) {
    return request(`/case-studies/${id}/student-access`, {
      method: 'POST',
      token,
      body: JSON.stringify({ enabled }),
    });
  },
  publishCaseStudy(id, data, mode, token) {
    return request(`/case-studies/${id}/publish`, { method: 'POST', token, body: JSON.stringify({ data, mode }) });
  },
  endLiveClassroom(id, token) {
    return request(`/case-studies/${id}/live-classroom/end`, { method: 'POST', token });
  },
  getCaseAnalytics(id, token) {
    return request(`/case-studies/${id}/analytics`, { token });
  },
  getFacilitatorCaseAttempt(caseId, sessionId, token) {
    return request(`/case-studies/${caseId}/attempts/${sessionId}`, { token });
  },
  saveFacilitatorCaseAttemptReview(caseId, sessionId, mark, feedback, token) {
    return request(`/case-studies/${caseId}/attempts/${sessionId}/review`, {
      method: 'PUT',
      token,
      body: JSON.stringify({ mark, feedback }),
    });
  },
  resetFacilitatorCaseAttempt(caseId, sessionId, token) {
    return request(`/case-studies/${caseId}/attempts/${sessionId}/reset`, {
      method: 'POST',
      token,
    });
  },
  listMySessions(token) {
    return request('/my-sessions', { token });
  },
  favouriteCaseStudy(id, token) {
    return request(`/case-studies/${id}/favourite`, { method: 'POST', token });
  },
  unfavouriteCaseStudy(id, token) {
    return request(`/case-studies/${id}/favourite`, { method: 'DELETE', token });
  },
  startCaseSession(id, token) {
    return request(`/case-studies/${id}/start`, { method: 'POST', token });
  },
  getCaseSession(id, token) {
    return request(`/case-sessions/${id}`, { token });
  },
  saveCaseSession(id, answers, progress, token, caseSnapshot = undefined) {
    return request(`/case-sessions/${id}`, { method: 'PUT', token, body: JSON.stringify({ answers, progress, caseSnapshot }) });
  },
  completeCaseSession(id, answers, progress, token, caseSnapshot = undefined) {
    return request(`/case-sessions/${id}/complete`, { method: 'POST', token, body: JSON.stringify({ answers, progress, caseSnapshot }) });
  },
  getSession(sessionCode) {
    return request(`/sessions/${sessionCode}`);
  },
  getSessionResponses(sessionCode) {
    return request(`/sessions/${sessionCode}/responses`);
  },
  joinSession(sessionCode, participantId, participantName, token) {
    return request(`/sessions/${sessionCode}/join`, {
      method: 'POST',
      token,
      body: JSON.stringify({ participantId, participantName }),
    });
  },
  pushSession(sessionCode, data, token) {
    return request(`/sessions/${sessionCode}/push`, { method: 'POST', token, body: JSON.stringify({ data }) });
  },
  submitSessionResponse(sessionCode, questionNumber, answer, participantId, participantName, token) {
    return request(`/sessions/${sessionCode}/responses`, {
      method: 'POST',
      token,
      body: JSON.stringify({ questionNumber, answer, participantId, participantName }),
    });
  },
  controlSession(sessionCode, stepIndex, revealAnswers, token, presentationStage = undefined, stageIndex = undefined, revealedQuestionNumbers = undefined) {
    return request(`/sessions/${sessionCode}/control`, {
      method: 'POST',
      token,
      body: JSON.stringify({ stepIndex, revealAnswers, presentationStage, stageIndex, revealedQuestionNumbers }),
    });
  },
};

export function createSessionEventSource(sessionCode) {
  return new EventSource(`${API_ROOT}/sessions/${sessionCode}/stream`);
}
