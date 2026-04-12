const baseUrl = process.env.SMOKE_BASE_URL || 'http://localhost:4000';

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...options.headers,
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`${path} failed: ${payload.error || response.statusText}`);
  }

  return payload;
}

async function main() {
  console.log(`Running smoke test against ${baseUrl}`);

  const educatorLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'demo@casestudy.local', password: 'Demo123!' }),
  });
  console.log('Educator login OK');

  const studentLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'student@casestudy.local', password: 'Student123!' }),
  });
  console.log('Student login OK');

  const educatorToken = educatorLogin.token;
  const studentToken = studentLogin.token;

  const educatorCases = await request('/api/case-studies', { token: educatorToken });
  if (!educatorCases.caseStudies.length) {
    throw new Error('No educator case studies found');
  }
  const caseStudy = educatorCases.caseStudies[0];
  console.log(`Educator case list OK (${educatorCases.caseStudies.length} cases)`);

  const analytics = await request(`/api/case-studies/${caseStudy.id}/analytics`, { token: educatorToken });
  console.log(`Analytics OK (attempts=${analytics.analytics.attempts})`);

  const library = await request('/api/library', { token: studentToken });
  if (!library.caseStudies.length) {
    throw new Error('No published library cases found');
  }
  console.log(`Student library OK (${library.caseStudies.length} cases)`);

  const started = await request(`/api/case-studies/${library.caseStudies[0].id}/start`, {
    method: 'POST',
    token: studentToken,
  });
  console.log(`Case session start OK (${started.session.id})`);

  const session = await request(`/api/case-sessions/${started.session.id}`, { token: studentToken });
  const snapshot = session.session.caseSnapshot;
  const answers = {};

  for (const question of snapshot.questions || []) {
    const key = String(question.questionNumber);
    if (question.questionType === 'MultipleChoice' || question.questionType === 'DrugChoice') {
      answers[key] = question.answerOptions?.[0] || '';
    } else if (question.questionType === 'Calculation') {
      answers[key] = String(question.answer ?? '');
    } else if (question.questionType === 'MultipleAnswer') {
      answers[key] = Array.isArray(question.answer) ? question.answer.map(String) : [];
    } else if (question.questionType === 'CarePlan') {
      answers[key] = 'Smoke test reflection';
    }
  }

  await request(`/api/case-sessions/${started.session.id}`, {
    method: 'PUT',
    token: studentToken,
    body: JSON.stringify({ answers, progress: { reflection: 'Smoke test save' } }),
  });
  console.log('Case session save OK');

  const completed = await request(`/api/case-sessions/${started.session.id}/complete`, {
    method: 'POST',
    token: studentToken,
    body: JSON.stringify({ answers, progress: { reflection: 'Smoke test submit' } }),
  });
  console.log(`Case session complete OK (score=${completed.grading.score}%)`);

  const liveCode = caseStudy.activeSessionCode;
  if (liveCode) {
    const liveSession = await request(`/api/sessions/${liveCode}`);
    console.log(`Live session lookup OK (${liveCode})`);

    await request(`/api/sessions/${liveCode}/responses`, {
      method: 'POST',
      body: JSON.stringify({
        questionNumber: String(liveSession.session.stepIndex + 1),
        answer: 'Smoke test answer',
        participantId: 'smoke-test-guest',
        participantName: 'Smoke Test Guest',
      }),
    });
    const summary = await request(`/api/sessions/${liveCode}/responses`);
    console.log(`Live response summary OK (${Object.keys(summary.summary || {}).length} question groups)`);
  } else {
    console.log('No active live session code available to verify');
  }

  console.log('Smoke test passed');
}

main().catch((error) => {
  console.error('Smoke test failed');
  console.error(error.message);
  process.exit(1);
});
