import { GrantCycleNoticeSchedule, SubmissionYear } from '../models/index.js';

function utcDateOnly(value) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function addUtcDays(base, deltaDays) {
  const date = utcDateOnly(base);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date;
}

function mayFirstUtc(grantYear) {
  return new Date(Date.UTC(grantYear, 4, 1, 12, 0, 0, 0));
}

export function formatUtcDay(value) {
  const date = utcDateOnly(value instanceof Date ? value : new Date(value));
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${date.getUTCFullYear()}-${month}-${day}`;
}

export function parseUtcDay(yyyyMmDd) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(yyyyMmDd || ''));
  if (!match) {
    return null;
  }
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function defaultPortalOpenOn(openedAt) {
  const opened = openedAt ? new Date(openedAt) : null;
  if (!opened || Number.isNaN(opened.getTime())) {
    return null;
  }
  return addUtcDays(opened, 7);
}

export async function scheduleYearContext(now = new Date()) {
  const active = await SubmissionYear.findOne({ active: true })
    .select('year openedAt grantCycleEmailPortalOpenSentAt grantCycleEmailTwoWeeksBeforeSoftDeadlineSentAt grantCycleEmailOneWeekBeforeSoftDeadlineSentAt')
    .lean();
  if (active?.year) {
    return { ...active, projected: false };
  }
  const year = now.getUTCMonth() >= 5 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
  const existing = await SubmissionYear.findOne({ year })
    .select('year openedAt grantCycleEmailPortalOpenSentAt grantCycleEmailTwoWeeksBeforeSoftDeadlineSentAt grantCycleEmailOneWeekBeforeSoftDeadlineSentAt')
    .lean();
  if (existing) {
    return { ...existing, projected: false };
  }
  return {
    year,
    openedAt: new Date(Date.UTC(year, 0, 1, 12, 0, 0, 0)),
    projected: true,
  };
}

export async function triggerDayFor(year, key, openedAt) {
  const saved = await GrantCycleNoticeSchedule.findOne({ year }).lean();
  if (key === 'portal-open' && saved?.portalOpenOn) {
    return utcDateOnly(saved.portalOpenOn);
  }
  if (key === 'two-weeks' && saved?.twoWeeksOn) {
    return utcDateOnly(saved.twoWeeksOn);
  }
  if (key === 'week-of' && saved?.weekOfOn) {
    return utcDateOnly(saved.weekOfOn);
  }
  if (key === 'portal-open') {
    return defaultPortalOpenOn(openedAt);
  }
  if (key === 'two-weeks') {
    return addUtcDays(mayFirstUtc(year), -14);
  }
  if (key === 'week-of') {
    return addUtcDays(mayFirstUtc(year), -7);
  }
  return null;
}

export async function describeGrantCycleNotices(yearContext) {
  const year = yearContext.year;
  const [portalOpenOn, twoWeeksOn, weekOfOn] = await Promise.all([
    triggerDayFor(year, 'portal-open', yearContext.openedAt),
    triggerDayFor(year, 'two-weeks', yearContext.openedAt),
    triggerDayFor(year, 'week-of', yearContext.openedAt),
  ]);
  const soft = `May 1, ${year}`;
  return [
    {
      key: 'portal-open',
      title: 'Portal is open',
      audience: 'Every organization',
      subject: `The ${year} grant portal is open`,
      summary: `Tells them the ${year} portal is open and they can submit a proposal. ${soft} is a soft target. Proposals are still accepted through the board meeting.`,
      sendsOn: portalOpenOn ? formatUtcDay(portalOpenOn) : '',
      sentAt: yearContext.grantCycleEmailPortalOpenSentAt || null,
    },
    {
      key: 'two-weeks',
      title: 'Two weeks before May 1',
      audience: 'Organizations with a draft, ready-to-submit, or submitted proposal for this year',
      subject: `Grant cycle reminder — soft deadline ${soft}`,
      summary: `Tells them the soft deadline is two weeks away and asks them to finish the proposal they already started.`,
      sendsOn: twoWeeksOn ? formatUtcDay(twoWeeksOn) : '',
      sentAt: yearContext.grantCycleEmailTwoWeeksBeforeSoftDeadlineSentAt || null,
    },
    {
      key: 'week-of',
      title: 'One week before May 1',
      audience: 'Organizations with a draft, ready-to-submit, or submitted proposal for this year',
      subject: `This week: grant soft deadline ${soft}`,
      summary: `Tells them the soft deadline is one week away. May 1 is not a hard cutoff.`,
      sendsOn: weekOfOn ? formatUtcDay(weekOfOn) : '',
      sentAt: yearContext.grantCycleEmailOneWeekBeforeSoftDeadlineSentAt || null,
    },
  ];
}
