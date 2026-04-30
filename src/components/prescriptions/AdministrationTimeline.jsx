import React, { useEffect, useMemo, useState } from 'react';
import Button from 'react-bootstrap/Button';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import { addDays, dateMatchesFrequency, formatDateTimeLabel, formatTimeLabel, getFrequencySchedule, parseChartDate, parseDateTime, startOfDay } from './chartUtils';

const defaultScaffoldSlots = ['08:00', '14:00', '20:00', '02:00'];
const WEEKDAY_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function sortTimes(times) {
  return [...times].sort((left, right) => {
    const [leftHour, leftMinute] = left.split(':').map(Number);
    const [rightHour, rightMinute] = right.split(':').map(Number);
    return (leftHour * 60 + leftMinute) - (rightHour * 60 + rightMinute);
  });
}

function differenceInDays(laterDate, earlierDate) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((startOfDay(laterDate) - startOfDay(earlierDate)) / msPerDay);
}

function formatDayLabel(date) {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function findMatchingAdministration(administrations, target) {
  const windowStart = new Date(target.getTime() - 3 * 60 * 60 * 1000);
  const windowEnd = new Date(target.getTime() + 3 * 60 * 60 * 1000);

  return administrations.find((item) => {
    const anchorDate = item.scheduledParsedDate || item.parsedDate;
    return anchorDate && anchorDate >= windowStart && anchorDate <= windowEnd;
  });
}

function getDisplaySlots(schedule) {
  if (schedule.length >= 4) {
    return sortTimes(schedule);
  }

  const merged = [...schedule];
  defaultScaffoldSlots.forEach((slot) => {
    if (!merged.includes(slot) && merged.length < 4) {
      merged.push(slot);
    }
  });
  return sortTimes(merged);
}

function parseAdmissionDateTime(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getCellDescriptor({ administration, candidate, now, startDate, endDate, suspendMode, isScheduledSlot, isCriticalMedicine }) {
  const beforeStart = startDate && candidate < startDate;
  const afterEnd = endDate && candidate > endDate;
  if (beforeStart || afterEnd) {
    return { status: 'unavailable', symbol: '', selectable: false };
  }

  if (administration) {
    const normalized = String(administration.adminNote || '').toLowerCase();
    if (normalized.includes('administered')) {
      return { status: 'administered', symbol: 'Adm', selectable: false };
    }
    if (normalized.includes('held')) {
      return { status: 'held', symbol: 'Held', selectable: suspendMode, action: suspendMode ? 'suspend' : undefined };
    }
    return { status: 'missed', symbol: 'Missed', selectable: false };
  }

  if (!isScheduledSlot) {
    return { status: 'empty', symbol: '', selectable: false };
  }

  const overdueThresholdMinutes = isCriticalMedicine ? 30 : 120;
  const minutesPastDue = Math.round((now.getTime() - candidate.getTime()) / (60 * 1000));

  if (!suspendMode && minutesPastDue >= overdueThresholdMinutes) {
    return {
      status: 'overdue',
      symbol: 'Overdue',
      selectable: true,
      action: 'administer',
    };
  }

  if (!suspendMode && candidate <= new Date(now.getTime() + 90 * 60 * 1000)) {
    return {
      status: 'due',
      symbol: 'Due',
      selectable: true,
      action: 'administer',
      upcoming: candidate >= now && candidate <= new Date(now.getTime() + 90 * 60 * 1000),
    };
  }

  if (candidate >= now) {
    const minutesUntilDose = Math.round((candidate.getTime() - now.getTime()) / (60 * 1000));
    return {
      status: suspendMode ? 'selectable' : 'scheduled',
      symbol: 'Sch',
      selectable: suspendMode,
      action: suspendMode ? 'suspend' : undefined,
      upcoming: minutesUntilDose >= 0 && minutesUntilDose <= 90,
    };
  }

  return { status: 'empty', symbol: '', selectable: false };
}

const AdministrationTimeline = ({
  administrationList = [],
  frequency = '',
  scheduledTimes = [],
  variableDoseSchedule = {},
  warfarinWeekdaySchedule = null,
  unit = '',
  frequencyOptions = [],
  admissionDate,
  startDate,
  endDate,
  isStat = false,
  isCriticalMedicine = false,
  suspendMode = false,
  onSelectScheduledDose,
}) => {
  const [windowOffset, setWindowOffset] = useState(0);

  const chart = useMemo(() => {
    const administrations = administrationList
      .map((item) => ({
        ...item,
        parsedDate: parseDateTime(item.adminDateTime),
        scheduledParsedDate: parseDateTime(item.scheduledSlotDateTime),
      }))
      .filter((item) => item.parsedDate)
      .sort((a, b) => a.parsedDate - b.parsedDate);

    const now = new Date();
    const today = startOfDay(new Date());
    const admissionDateTime = parseAdmissionDateTime(admissionDate);
    const admissionDay = startOfDay(admissionDateTime || parseChartDate(admissionDate) || today);
    const prescriptionStart = parseChartDate(startDate) || today;
    const earliestAdministrationDay = administrations.length
      ? startOfDay(administrations[0].scheduledParsedDate || administrations[0].parsedDate)
      : null;
    const earliestRelevantDay = earliestAdministrationDay && earliestAdministrationDay < admissionDay
      ? earliestAdministrationDay
      : admissionDay;
    const scheduledSlotTimes = getFrequencySchedule(frequency, frequencyOptions, scheduledTimes);
    const rowSlots = getDisplaySlots(scheduledSlotTimes);

    const firstVisibleBase = addDays(today, -3);
    const minWindowOffset = Math.min(0, differenceInDays(earliestRelevantDay, firstVisibleBase));
    const clampedWindowOffset = Math.max(minWindowOffset, windowOffset);

    const dayColumns = [-3, -2, -1, 0, 1, 2, 3].map((offset) => {
      const dayStart = addDays(today, offset + clampedWindowOffset);
      return {
        key: `day-${offset + clampedWindowOffset}`,
        label: formatDayLabel(dayStart),
        dayStart,
        isToday: dayStart.getTime() === today.getTime(),
      };
    });

      return {
        administrations,
        now,
        minWindowOffset,
        clampedWindowOffset,
        frequency,
        scheduledSlotTimes,
        rowSlots,
        dayColumns,
        startDate: earliestAdministrationDay && earliestAdministrationDay < prescriptionStart
          ? earliestAdministrationDay
          : (admissionDateTime && admissionDateTime > prescriptionStart ? admissionDateTime : prescriptionStart),
        endDate: endDate
          ? parseChartDate(endDate)
          : null,
      };
  }, [administrationList, admissionDate, endDate, frequency, frequencyOptions, scheduledTimes, startDate, windowOffset]);

  useEffect(() => {
    if (chart.minWindowOffset < 0 && windowOffset === 0) {
      setWindowOffset(chart.minWindowOffset);
    }
  }, [chart.minWindowOffset, windowOffset]);

  const renderCell = (column, slotTime) => {
    const [hour, minute] = slotTime.split(':').map(Number);
    const candidate = new Date(column.dayStart.getFullYear(), column.dayStart.getMonth(), column.dayStart.getDate(), hour, minute);
    const administration = findMatchingAdministration(chart.administrations, candidate);
    const weekdayName = WEEKDAY_ORDER[candidate.getDay()];
    const warfarinScheduledDose = String(warfarinWeekdaySchedule?.[weekdayName]?.dose ?? warfarinWeekdaySchedule?.[weekdayName] ?? '').trim();
    const scheduledDose = warfarinWeekdaySchedule
      ? warfarinScheduledDose
      : String(variableDoseSchedule?.[slotTime]?.dose ?? variableDoseSchedule?.[slotTime] ?? '').trim();
    const isScheduledSlot = chart.scheduledSlotTimes.includes(slotTime)
      && (!warfarinWeekdaySchedule || Boolean(scheduledDose))
      && dateMatchesFrequency(chart.frequency, candidate, chart.startDate);
    const descriptor = getCellDescriptor({
      administration,
      candidate,
      now: chart.now,
      startDate: chart.startDate,
      endDate: chart.endDate,
      suspendMode,
      isScheduledSlot,
      isCriticalMedicine,
    });

    const tooltip = (
      <Tooltip id={`admin-cell-${column.key}-${slotTime}`}>
        <div><strong>{`Scheduled ${slotTime}`}</strong></div>
        {scheduledDose ? <div>Scheduled dose: {scheduledDose}{unit ? ` ${unit}` : ''}</div> : null}
        {administration?.parsedDate ? <div>Actual time: {formatTimeLabel(administration.parsedDate)}</div> : null}
        {administration?.actualDose ? <div>Dose administered: {administration.actualDose}{unit ? ` ${unit}` : ''}</div> : null}
        <div>{administration?.adminNote || (descriptor.status === 'unavailable' ? 'Outside prescription date range' : 'No administration recorded')}</div>
        <div>
          {administration?.administeredBy
            || (descriptor.action === 'administer'
              ? 'Click to chart this administration'
              : descriptor.selectable
                ? 'Click to suspend this dose'
                : 'Awaiting administration')}
        </div>
        <div>{formatDateTimeLabel(candidate)}</div>
      </Tooltip>
    );

    const handleClick = () => {
      if (!descriptor.selectable || !onSelectScheduledDose) {
        return;
      }
      onSelectScheduledDose(candidate, administration, descriptor.action);
    };

    return (
      <OverlayTrigger key={`${column.key}-${slotTime}`} placement="top" overlay={tooltip}>
        <td
          className={`admin-chart__cell admin-chart__cell--${descriptor.status}${descriptor.upcoming ? ' admin-chart__cell--upcoming' : ''}`}
          onClick={handleClick}
          role={descriptor.selectable ? 'button' : undefined}
          tabIndex={descriptor.selectable ? 0 : -1}
          onKeyDown={(event) => {
            if (descriptor.selectable && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault();
              handleClick();
            }
          }}
        >
          <span className="admin-chart__symbol">{descriptor.symbol}</span>
        </td>
      </OverlayTrigger>
    );
  };

  return (
    <div className="admin-chart-panel">
      <div className="admin-chart-wrap">
        <table className="admin-chart-table">
          <thead>
            <tr>
              <th className="admin-chart__time-col">Time</th>
              {chart.dayColumns.map((column) => (
                <th key={column.key} className={column.isToday ? 'admin-chart__day--today' : ''}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chart.rowSlots.map((slotTime) => (
              <tr key={slotTime}>
                <td className="admin-chart__time-col">{slotTime}</td>
                {chart.dayColumns.map((column) => renderCell(column, slotTime))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={8} className="admin-chart__nav-row">
                <div className="admin-chart__nav-actions">
                  <Button
                    type="button"
                    size="sm"
                    variant="link"
                    className="admin-chart__nav-button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setWindowOffset((current) => Math.max(chart.minWindowOffset, current - 1));
                    }}
                    disabled={chart.clampedWindowOffset <= chart.minWindowOffset}
                  >
                    <i className="bi bi-arrow-left" /> Previous
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="link"
                    className="admin-chart__nav-button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setWindowOffset((current) => current + 1);
                    }}
                  >
                    Next <i className="bi bi-arrow-right" />
                  </Button>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default AdministrationTimeline;
