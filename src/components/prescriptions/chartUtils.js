export function parseDateTime(value) {
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

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function formatTimeLabel(date) {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTimeLabel(date) {
  return `${date.toLocaleDateString('en-GB')} ${formatTimeLabel(date)}`;
}

export function parseChartDate(value) {
  if (!value) {
    return null;
  }

  if (String(value).includes('-')) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const [day, month, year] = String(value).split('/').map(Number);
  if (!day || !month || !year) {
    return null;
  }

  return new Date(year, month - 1, day);
}

export function normalizeAdminTimes(times = []) {
  const uniqueTimes = Array.from(new Set((Array.isArray(times) ? times : [])
    .map((item) => String(item || '').trim())
    .filter((item) => /^\d{2}:\d{2}$/.test(item))));

  return uniqueTimes.sort((left, right) => {
    const [leftHour, leftMinute] = left.split(':').map(Number);
    const [rightHour, rightMinute] = right.split(':').map(Number);
    return (leftHour * 60 + leftMinute) - (rightHour * 60 + rightMinute);
  });
}

export function isWeeklyFrequency(frequency) {
  const normalized = String(frequency || '').trim().toLowerCase();
  return normalized === 'once weekly' || normalized === 'weekly';
}

export function dateMatchesFrequency(frequency, candidate, startDate) {
  if (!candidate) {
    return false;
  }

  if (!isWeeklyFrequency(frequency)) {
    return true;
  }

  if (!startDate) {
    return true;
  }

  const startOfCandidate = startOfDay(candidate);
  const startOfReference = startOfDay(startDate);
  const msPerDay = 24 * 60 * 60 * 1000;
  const dayDifference = Math.round((startOfCandidate - startOfReference) / msPerDay);

  return dayDifference >= 0 && dayDifference % 7 === 0;
}

export function getFrequencySchedule(frequency, frequencyOptions = [], explicitTimes = []) {
  const normalizedExplicitTimes = normalizeAdminTimes(explicitTimes);
  if (normalizedExplicitTimes.length) {
    return normalizedExplicitTimes;
  }

  const normalized = String(frequency || '').trim().toLowerCase();
  const configured = frequencyOptions.find((item) => String(item.label || '').trim().toLowerCase() === normalized);
  if (configured?.defaultAdminTimes?.length) {
    return normalizeAdminTimes(configured.defaultAdminTimes);
  }
  const presets = {
    'once daily': ['08:00'],
    'once weekly': ['08:00'],
    'weekly': ['08:00'],
    'each morning': ['08:00'],
    'once in the morning': ['08:00'],
    'once each morning': ['08:00'],
    'each night': ['20:00'],
    'once at night': ['20:00'],
    'twice daily': ['08:00', '20:00'],
    'three times daily': ['06:00', '14:00', '22:00'],
    'four times daily': ['06:00', '12:00', '18:00', '22:00'],
    'five times daily': ['06:00', '10:00', '14:00', '18:00', '22:00'],
    'six times daily': ['04:00', '08:00', '12:00', '16:00', '20:00', '00:00'],
    'four hourly': ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
    'three hourly': ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'],
    'six hourly': ['00:00', '06:00', '12:00', '18:00'],
    '6 hourly': ['00:00', '06:00', '12:00', '18:00'],
    'eight hourly': ['06:00', '14:00', '22:00'],
    'twelve hourly': ['08:00', '20:00'],
    'when required': [],
  };

  if (presets[normalized]) {
    return normalizeAdminTimes(presets[normalized]);
  }

  const numericMatch = normalized.match(/(\d+)\s*hour/);
  if (numericMatch) {
    const interval = Number(numericMatch[1]);
    const times = [];
    for (let hour = 0; hour < 24; hour += interval) {
      times.push(`${String(hour).padStart(2, '0')}:00`);
    }
    return normalizeAdminTimes(times);
  }

  return normalizeAdminTimes(['08:00', '20:00']);
}

export function buildUpcomingScheduledSlots(frequency, administrations = [], count = 1, frequencyOptions = [], explicitTimes = [], startDate = null) {
  const schedule = getFrequencySchedule(frequency, frequencyOptions, explicitTimes);
  if (!schedule.length) {
    return [];
  }
  const parsedAdministrations = administrations
    .map((item) => ({ ...item, parsedDate: parseDateTime(item.adminDateTime) }))
    .filter((item) => item.parsedDate)
    .sort((a, b) => a.parsedDate - b.parsedDate);

  const anchor = parsedAdministrations.length ? parsedAdministrations[parsedAdministrations.length - 1].parsedDate : new Date();
  const frequencyReference = startDate || parsedAdministrations[0]?.scheduledParsedDate || parsedAdministrations[0]?.parsedDate || anchor;
  const upcoming = [];
  let dayCursor = startOfDay(anchor);
  let safetyCounter = 0;

  while (upcoming.length < count && safetyCounter < 120) {
    const currentDay = new Date(dayCursor);
    for (const slot of schedule) {
      const [hour, minute] = slot.split(':').map(Number);
      const candidate = new Date(currentDay.getFullYear(), currentDay.getMonth(), currentDay.getDate(), hour, minute);
      if (candidate > anchor && dateMatchesFrequency(frequency, candidate, frequencyReference) && upcoming.length < count) {
        upcoming.push(candidate);
      }
    }
    dayCursor = addDays(dayCursor, 1);
    safetyCounter += 1;
  }

  return upcoming;
}
