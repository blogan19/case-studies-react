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
  importDrugLibrary(csvContent, token, replaceExisting = true) {
    return request('/drug-library/import', {
      method: 'POST',
      token,
      body: JSON.stringify({ csvContent, replaceExisting }),
    });
  },
  listCaseStudies(token) {
    return request('/case-studies', { token });
  },
  listLibrary(token) {
    return request('/library', { token });
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
  archiveCaseStudy(id, token) {
    return request(`/case-studies/${id}/archive`, { method: 'POST', token });
  },
  publishCaseStudy(id, data, token) {
    return request(`/case-studies/${id}/publish`, { method: 'POST', token, body: JSON.stringify({ data }) });
  },
  getCaseAnalytics(id, token) {
    return request(`/case-studies/${id}/analytics`, { token });
  },
  listMySessions(token) {
    return request('/my-sessions', { token });
  },
  startCaseSession(id, token) {
    return request(`/case-studies/${id}/start`, { method: 'POST', token });
  },
  getCaseSession(id, token) {
    return request(`/case-sessions/${id}`, { token });
  },
  saveCaseSession(id, answers, progress, token) {
    return request(`/case-sessions/${id}`, { method: 'PUT', token, body: JSON.stringify({ answers, progress }) });
  },
  completeCaseSession(id, answers, progress, token) {
    return request(`/case-sessions/${id}/complete`, { method: 'POST', token, body: JSON.stringify({ answers, progress }) });
  },
  getSession(sessionCode) {
    return request(`/sessions/${sessionCode}`);
  },
  getSessionResponses(sessionCode) {
    return request(`/sessions/${sessionCode}/responses`);
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
  controlSession(sessionCode, stepIndex, revealAnswers, token) {
    return request(`/sessions/${sessionCode}/control`, {
      method: 'POST',
      token,
      body: JSON.stringify({ stepIndex, revealAnswers }),
    });
  },
};

export function createSessionEventSource(sessionCode) {
  return new EventSource(`${API_ROOT}/sessions/${sessionCode}/stream`);
}
