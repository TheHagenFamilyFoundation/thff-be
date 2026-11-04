/**
 * Scheduled grant-cycle mail (EventBridge each morning, or `npm run grant-cycle-emails`).
 * Gated by GRANT_CYCLE_EMAILS_ENABLED — off until explicitly enabled.
 *
 * - January: if the current calendar year has no submission year yet, create it
 *   active with openedAt on January 1. A year a director already closed is left closed.
 *   The portal is not opened on any other month, and it is not opened automatically
 *   just because the clock rolls past January 1 unless this job is enabled.
 * - 7 days after openedAt (catch-up through day 21): email every organization that
 *   the portal is open.
 * - 14 days before May 1, and 7 days before May 1 (each with a 3-day catch-up):
 *   email organizations that have a draft, ready-to-submit, or submitted proposal
 *   created in that grant year.
 * - 24h after creation: email the creator if a proposal is still `draft`
 *   in the open grant year. No open year means this reminder waits.
 *
 * User profile settings `emailGrantDeadlineReminders` and `emailPortalOpenNotices`
 * default to on. A matching user who turns one off is skipped.
 *
 * Preview: pass { dryRun: true } or { trialTo }. Those modes do not write sent-at
 * stamps and do not create a submission year. `--force` is only honored for preview.
 */

import Config from '../config/config.js';
import Logger from '../utils/logger.js';
import { generateCode } from '../utils/util.js';
import { sendEmailWithTemplate } from '../controllers/email/email.js';
import {
  proposalDraftStillIncomplete24h,
  grantCycleSoftDeadlineTwoWeeks,
  grantCycleSoftDeadlineWeekOf,
  grantCyclePortalOpen,
} from '../views/grant-cycle-reminder-templates.js';
import {
  Organization,
  Proposal,
  SubmissionYear,
  User,
  UserSetting,
} from '../models/index.js';
import { triggerDayFor } from './grant-cycle-schedule.js';

const MS_DAY = 86400000;
const TRIGGER_CATCHUP_DAYS = 3;
const PORTAL_OPEN_EMAIL_MIN_DAYS = 7;
const PORTAL_OPEN_EMAIL_MAX_DAYS = 21;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function absoluteFrontendBase() {
  let fe = String(Config.feURL || '').trim().replace(/\/$/, '');
  if (!fe) {
    fe = 'http://localhost:4200';
  }
  if (!/^https?:\/\//i.test(fe)) {
    fe = /\b(localhost|127\.0\.0\.1)\b/i.test(fe) ? `http://${fe}` : `https://${fe}`;
  }
  return fe;
}

export function utcDateOnly(value) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function addUtcDays(base, deltaDays) {
  const d = utcDateOnly(base);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d;
}

export function daysBetweenUtc(earlier, later) {
  return Math.round((utcDateOnly(later).getTime() - utcDateOnly(earlier).getTime()) / MS_DAY);
}

/** True on the trigger day and for a few days after, so a missed cron still sends once. */
export function isWithinTriggerWindow(now, triggerDay, catchupDays = TRIGGER_CATCHUP_DAYS) {
  const delta = daysBetweenUtc(triggerDay, now);
  return delta >= 0 && delta <= catchupDays;
}

export function mayFirstUtc(grantYear) {
  return new Date(Date.UTC(grantYear, 4, 1, 12, 0, 0, 0));
}

function yearWindow(grantYear) {
  return {
    start: new Date(`${grantYear}-01-01T00:00:00.000Z`),
    end: new Date(`${grantYear}-12-31T23:59:59.999Z`),
  };
}

function softDeadlineLabel(grantYear) {
  return `May 1, ${grantYear}`;
}

function isPreview(options) {
  return !!(options?.dryRun || options?.trialTo);
}

function isForced(options, key) {
  return !!(options?.force?.has('all') || options?.force?.has(key));
}

/**
 * Live sends require an active submission year. Preview runs fall back to the
 * latest year so a closed portal can still be counted and sampled.
 */
async function resolveSubmissionYear(options) {
  const active = await SubmissionYear.findOne({ active: true }).lean();
  if (active) {
    return active;
  }
  if (!isPreview(options)) {
    return null;
  }
  const latest = await SubmissionYear.findOne({}).sort({ year: -1 }).lean();
  if (latest) {
    return { ...latest, previewFallback: true };
  }
  const year = (options.now || new Date()).getUTCFullYear();
  return {
    year,
    openedAt: new Date(Date.UTC(year, 0, 1, 12, 0, 0, 0)),
    previewFallback: true,
  };
}

/** Organizations with a draft, ready-to-submit, or submitted proposal in the grant year. */
async function deadlineReminderOrganizationIds(grantYear) {
  const { start, end } = yearWindow(grantYear);
  const orgIds = await Proposal.distinct('organization', {
    createdAt: { $gte: start, $lte: end },
    status: { $in: ['draft', 'ready_to_submit', 'submitted'] },
    archived: { $ne: true },
    organization: { $ne: null },
  });
  return [...new Set(orgIds.map(String))];
}

function firstNameFromContact(contactPerson) {
  if (!contactPerson) {
    return '';
  }
  return String(contactPerson).split(',')[0].trim();
}

/**
 * Org contact email plus each member user. Rows are later merged by email.
 */
async function recipientRowsForOrganizations(orgIds) {
  const uniq = [...new Set((orgIds || []).map((id) => String(id)))];
  if (uniq.length === 0) {
    return [];
  }
  const orgs = await Organization.find({ _id: { $in: uniq } })
    .select('name info users')
    .populate('info', 'contactPerson email')
    .populate('users.user', 'firstName email')
    .lean();

  const rows = [];
  for (const org of orgs) {
    const organizationName = org.name || 'Unknown Organization';
    const info = org.info || {};
    if (info.email) {
      rows.push({
        email: info.email,
        recipientFirstName: firstNameFromContact(info.contactPerson),
        organizationName,
      });
    }
    for (const membership of org.users || []) {
      const user = membership?.user;
      if (!user?.email) {
        continue;
      }
      rows.push({
        email: user.email,
        recipientFirstName: user.firstName || '',
        organizationName,
      });
    }
  }
  return rows;
}

/**
 * Merge rows by normalized email; join distinct organization names with " / ".
 */
function mergeRowsByEmail(rows) {
  const map = new Map();
  for (const row of rows) {
    const em = normalizeEmail(row.email);
    if (!em) {
      continue;
    }
    const existing = map.get(em);
    if (!existing) {
      map.set(em, {
        email: row.email.trim(),
        recipientFirstName: row.recipientFirstName || '',
        names: new Set([row.organizationName].filter(Boolean)),
      });
    } else {
      if (row.organizationName) {
        existing.names.add(row.organizationName);
      }
      if (!existing.recipientFirstName && row.recipientFirstName) {
        existing.recipientFirstName = row.recipientFirstName;
      }
    }
  }
  return [...map.values()].map((v) => {
    const names = [...v.names];
    return {
      email: v.email,
      recipientFirstName: v.recipientFirstName,
      organizationName: names.length === 0 ? 'your organization' : names.join(' / '),
    };
  });
}

/** Drop addresses whose user turned this notification off. Missing settings stay opted in. */
async function dropOptedOut(rows, settingField) {
  const emails = [...new Set(rows.map((row) => normalizeEmail(row.email)).filter(Boolean))];
  if (emails.length === 0) {
    return { kept: [], optedOut: 0 };
  }

  const users = await User.aggregate([
    {
      $project: {
        emailLower: { $toLower: { $ifNull: ['$email', ''] } },
      },
    },
    { $match: { emailLower: { $in: emails } } },
  ]);

  if (users.length === 0) {
    return { kept: rows, optedOut: 0 };
  }

  const settings = await UserSetting.find({
    userID: { $in: users.map((user) => user._id) },
    [settingField]: false,
  }).select('userID').lean();

  const optedOutIds = new Set(settings.map((setting) => String(setting.userID)));
  const optedOutEmails = new Set(
    users
      .filter((user) => optedOutIds.has(String(user._id)))
      .map((user) => user.emailLower),
  );

  const kept = rows.filter((row) => !optedOutEmails.has(normalizeEmail(row.email)));
  return { kept, optedOut: rows.length - kept.length };
}

async function deliverRows(rows, { subject, template, buildData, dryRun, trialTo }) {
  if (dryRun) {
    return { sent: 0, failed: 0, recipients: rows.length, dryRun: true };
  }

  if (trialTo) {
    const sample = rows[0] || {
      recipientFirstName: '',
      organizationName: 'your organization',
    };
    try {
      await sendEmailWithTemplate(trialTo, `[Trial] ${subject}`, template, buildData(sample));
      return { sent: 1, failed: 0, recipients: rows.length, trial: true };
    } catch (e) {
      Logger.error(`grant-cycle trial send failed: ${e.message}`);
      return { sent: 0, failed: 1, recipients: rows.length, trial: true, error: e.message };
    }
  }

  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await sendEmailWithTemplate(row.email, subject, template, buildData(row));
      sent += 1;
    } catch (e) {
      failed += 1;
      Logger.error(`grant-cycle email failed for ${row.email}: ${e.message}`);
    }
  }
  return { sent, failed, recipients: rows.length };
}

async function userWantsDeadlineReminders(userId) {
  if (!userId) {
    return true;
  }
  const setting = await UserSetting.findOne({ userID: userId })
    .select('emailGrantDeadlineReminders')
    .lean();
  return setting?.emailGrantDeadlineReminders !== false;
}

export async function sendProposalDraft24hReminders(options = {}) {
  const preview = isPreview(options);
  const activeYear = await resolveSubmissionYear(options);
  if (!activeYear?.year || (!preview && !activeYear._id)) {
    return { skipped: true, reason: 'no_active_year' };
  }
  const softYear = activeYear.year;
  const { start, end } = yearWindow(softYear);
  const cutoff = new Date(Date.now() - MS_DAY);
  const createdBefore = new Date(Math.min(cutoff.getTime(), end.getTime()));
  if (createdBefore < start) {
    return { skipped: true, reason: 'no_drafts_in_year', grantYear: softYear, scanned: 0, wouldSend: 0 };
  }

  const proposals = await Proposal.find({
    status: 'draft',
    draftReminderSentAt: { $exists: false },
    createdBy: { $exists: true, $ne: null },
    createdAt: { $gte: start, $lte: createdBefore },
  })
    .populate('createdBy', 'firstName email')
    .populate('organization', 'name')
    .limit(500);

  let sent = 0;
  let failed = 0;
  let optedOut = 0;
  let skippedNoEmail = 0;

  const pending = [];
  for (const proposal of proposals) {
    const user = proposal.createdBy;
    const to = user?.email ? String(user.email).trim() : '';
    if (!to || !normalizeEmail(to)) {
      skippedNoEmail += 1;
      if (!preview) {
        await Proposal.updateOne({ _id: proposal._id }, { $set: { draftReminderSentAt: new Date() } });
      }
      continue;
    }
    if (!(await userWantsDeadlineReminders(user._id))) {
      optedOut += 1;
      if (!preview) {
        await Proposal.updateOne({ _id: proposal._id }, { $set: { draftReminderSentAt: new Date() } });
      }
      continue;
    }
    pending.push({ proposal, user, to });
  }

  if (options.dryRun) {
    return {
      sent: 0,
      failed: 0,
      scanned: proposals.length,
      wouldSend: pending.length,
      optedOut,
      skippedNoEmail,
      dryRun: true,
    };
  }

  if (options.trialTo) {
    const sample = pending[0];
    const data = sample
      ? {
        recipientFirstName: sample.user.firstName || '',
        organizationName: sample.proposal.organization?.name || 'your organization',
        projectTitle: sample.proposal.projectTitle?.trim() || '(untitled draft)',
        softDeadlineDateLabel: softDeadlineLabel(softYear),
        portalUrl: `${absoluteFrontendBase()}/pages/welcome`,
      }
      : {
        recipientFirstName: '',
        organizationName: 'your organization',
        projectTitle: '(untitled draft)',
        softDeadlineDateLabel: softDeadlineLabel(softYear),
        portalUrl: `${absoluteFrontendBase()}/pages/welcome`,
      };
    try {
      await sendEmailWithTemplate(
        options.trialTo,
        '[Trial] You still have a proposal draft — The Hagen Family Foundation',
        proposalDraftStillIncomplete24h,
        data,
      );
      sent = 1;
    } catch (e) {
      failed = 1;
      Logger.error(`sendProposalDraft24hReminders trial: ${e.message}`);
    }
    return { sent, failed, scanned: proposals.length, wouldSend: pending.length, optedOut, trial: true };
  }

  for (const item of pending) {
    const data = {
      recipientFirstName: item.user.firstName || '',
      organizationName: item.proposal.organization?.name || 'your organization',
      projectTitle: item.proposal.projectTitle?.trim() || '(untitled draft)',
      softDeadlineDateLabel: softDeadlineLabel(softYear),
      portalUrl: `${absoluteFrontendBase()}/pages/welcome`,
    };
    try {
      await sendEmailWithTemplate(
        item.to,
        'You still have a proposal draft — The Hagen Family Foundation',
        proposalDraftStillIncomplete24h,
        data,
      );
      await Proposal.updateOne({ _id: item.proposal._id }, { $set: { draftReminderSentAt: new Date() } });
      sent += 1;
    } catch (e) {
      failed += 1;
      Logger.error(`sendProposalDraft24hReminders: failed for proposal ${item.proposal._id}: ${e.message}`);
    }
  }

  return { sent, failed, scanned: proposals.length, optedOut, skippedNoEmail };
}

async function loadDeadlineRecipients(grantYear) {
  const orgIds = await deadlineReminderOrganizationIds(grantYear);
  const orgRows = await recipientRowsForOrganizations(orgIds);
  const merged = mergeRowsByEmail(orgRows);
  const filtered = await dropOptedOut(merged, 'emailGrantDeadlineReminders');
  return {
    organizations: orgIds.length,
    ...filtered,
  };
}

async function sendSoftDeadlineReminder(options, {
  label,
  forceKey,
  sentAtField,
  dayOffset,
  subjectFor,
  template,
}) {
  const preview = isPreview(options);
  const now = options.now || new Date();
  const activeYear = await resolveSubmissionYear(options);
  if (!activeYear?.year) {
    Logger.info(`${label}: no active submission year`);
    return { skipped: true, reason: 'no_active_year' };
  }
  if (!preview && activeYear[sentAtField]) {
    return { skipped: true, reason: 'already_sent' };
  }

  const grantYear = activeYear.year;
  const scheduledDay = await triggerDayFor(grantYear, forceKey, activeYear.openedAt);
  const triggerDay = scheduledDay || addUtcDays(mayFirstUtc(grantYear), dayOffset);
  const forced = isForced(options, forceKey);
  if (!forced && !isWithinTriggerWindow(now, triggerDay)) {
    return {
      skipped: true,
      reason: 'not_trigger_day',
      triggerDay: triggerDay.toISOString(),
      grantYear,
    };
  }

  const { organizations, kept, optedOut } = await loadDeadlineRecipients(grantYear);
  const portalUrl = `${absoluteFrontendBase()}/pages/welcome`;
  const softLabel = softDeadlineLabel(grantYear);
  const subject = subjectFor(softLabel);
  const result = await deliverRows(kept, {
    subject,
    template,
    dryRun: options.dryRun,
    trialTo: options.trialTo,
    buildData: (row) => ({
      recipientFirstName: row.recipientFirstName,
      organizationName: row.organizationName,
      grantYear: String(grantYear),
      softDeadlineDateLabel: softLabel,
      portalUrl,
    }),
  });

  if (!preview && activeYear._id) {
    await SubmissionYear.updateOne(
      { _id: activeYear._id },
      { $set: { [sentAtField]: new Date() } },
    );
  }

  return {
    ...result,
    optedOut,
    organizations,
    grantYear,
    triggerDay: triggerDay.toISOString(),
    forced,
    previewFallback: !!activeYear.previewFallback,
  };
}

export async function sendGrantCycleTwoWeeksBeforeMay1(options = {}) {
  return sendSoftDeadlineReminder(options, {
    label: 'sendGrantCycleTwoWeeksBeforeMay1',
    forceKey: 'two-weeks',
    sentAtField: 'grantCycleEmailTwoWeeksBeforeSoftDeadlineSentAt',
    dayOffset: -14,
    subjectFor: (softLabel) => `Grant cycle reminder — soft deadline ${softLabel}`,
    template: grantCycleSoftDeadlineTwoWeeks,
  });
}

export async function sendGrantCycleWeekOfMay1(options = {}) {
  return sendSoftDeadlineReminder(options, {
    label: 'sendGrantCycleWeekOfMay1',
    forceKey: 'week-of',
    sentAtField: 'grantCycleEmailOneWeekBeforeSoftDeadlineSentAt',
    dayOffset: -7,
    subjectFor: (softLabel) => `This week: grant soft deadline ${softLabel}`,
    template: grantCycleSoftDeadlineWeekOf,
  });
}

/**
 * Create the current calendar year's submission year on a January run when it
 * does not exist yet. Does not reopen a year a director has turned off.
 */
export async function ensureJanuaryPortalOpen(options = {}) {
  const now = options.now || new Date();
  const year = now.getUTCFullYear();
  if (now.getUTCMonth() !== 0) {
    return { skipped: true, reason: 'not_january', year };
  }

  const existing = await SubmissionYear.findOne({ year }).lean();
  if (existing) {
    return {
      skipped: true,
      reason: existing.active ? 'already_exists' : 'closed_by_director',
      year,
      active: existing.active,
    };
  }

  if (isPreview(options)) {
    return { skipped: true, reason: 'would_create', year, preview: true };
  }

  const openedAt = new Date(Date.UTC(year, 0, 1, 12, 0, 0, 0));
  const created = await SubmissionYear.create({
    subID: generateCode(),
    year,
    active: true,
    openedAt,
  });
  Logger.info(`ensureJanuaryPortalOpen: created submission year ${year}`);
  return { created: true, year, id: String(created._id), openedAt: openedAt.toISOString() };
}

export async function sendGrantCyclePortalOpenNotice(options = {}) {
  const preview = isPreview(options);
  const now = options.now || new Date();
  const activeYear = await resolveSubmissionYear(options);
  if (!activeYear?.year) {
    Logger.info('sendGrantCyclePortalOpenNotice: no active submission year');
    return { skipped: true, reason: 'no_active_year' };
  }
  if (!preview && activeYear.grantCycleEmailPortalOpenSentAt) {
    return { skipped: true, reason: 'already_sent', grantYear: activeYear.year };
  }

  const forced = isForced(options, 'portal-open');
  if (!activeYear.openedAt && !forced) {
    return { skipped: true, reason: 'no_opened_at', grantYear: activeYear.year };
  }

  const scheduledOpen = await triggerDayFor(activeYear.year, 'portal-open', activeYear.openedAt);
  const daysSinceOpen = activeYear.openedAt
    ? daysBetweenUtc(new Date(activeYear.openedAt), now)
    : null;
  const defaultOpenDay = activeYear.openedAt
    ? addUtcDays(new Date(activeYear.openedAt), PORTAL_OPEN_EMAIL_MIN_DAYS)
    : null;
  const customOpenDay = scheduledOpen
    && defaultOpenDay
    && utcDateOnly(scheduledOpen).getTime() !== utcDateOnly(defaultOpenDay).getTime();
  if (customOpenDay) {
    if (!forced && !isWithinTriggerWindow(now, scheduledOpen)) {
      return {
        skipped: true,
        reason: 'not_trigger_day',
        triggerDay: scheduledOpen.toISOString(),
        grantYear: activeYear.year,
      };
    }
  } else if (
    !forced
    && (daysSinceOpen < PORTAL_OPEN_EMAIL_MIN_DAYS || daysSinceOpen > PORTAL_OPEN_EMAIL_MAX_DAYS)
  ) {
    return {
      skipped: true,
      reason: 'not_trigger_window',
      daysSinceOpen,
      grantYear: activeYear.year,
      openedAt: new Date(activeYear.openedAt).toISOString(),
    };
  }

  const orgIds = (await Organization.distinct('_id')).map(String);
  const merged = mergeRowsByEmail(await recipientRowsForOrganizations(orgIds));
  const { kept, optedOut } = await dropOptedOut(merged, 'emailPortalOpenNotices');
  const grantYear = activeYear.year;
  const softLabel = softDeadlineLabel(grantYear);
  const portalUrl = `${absoluteFrontendBase()}/pages/welcome`;
  const result = await deliverRows(kept, {
    subject: `The ${grantYear} grant portal is open`,
    template: grantCyclePortalOpen,
    dryRun: options.dryRun,
    trialTo: options.trialTo,
    buildData: (row) => ({
      recipientFirstName: row.recipientFirstName,
      organizationName: row.organizationName,
      grantYear: String(grantYear),
      softDeadlineDateLabel: softLabel,
      portalUrl,
    }),
  });

  if (!preview && activeYear._id) {
    await SubmissionYear.updateOne(
      { _id: activeYear._id },
      { $set: { grantCycleEmailPortalOpenSentAt: new Date() } },
    );
  }

  return {
    ...result,
    optedOut,
    organizations: orgIds.length,
    grantYear,
    daysSinceOpen,
    forced,
    previewFallback: !!activeYear.previewFallback,
  };
}

export async function runAllGrantCycleEmailTasks(options = {}) {
  const preview = isPreview(options);
  if (!Config.grantCycleEmailsEnabled && !preview) {
    Logger.info(
      'runAllGrantCycleEmailTasks: skipped — set GRANT_CYCLE_EMAILS_ENABLED=true to run grant-cycle reminders',
    );
    return { disabled: true };
  }

  const selected = (key) => (
    !options.force
    || options.force.size === 0
    || options.force.has('all')
    || options.force.has(key)
  );
  const notSelected = { skipped: true, reason: 'not_selected' };

  const januaryOpen = (!options.force || options.force.size === 0 || options.force.has('all'))
    ? await ensureJanuaryPortalOpen(options)
    : notSelected;
  const draft24h = selected('draft-24h')
    ? await sendProposalDraft24hReminders(options)
    : notSelected;
  const twoWeek = selected('two-weeks')
    ? await sendGrantCycleTwoWeeksBeforeMay1(options)
    : notSelected;
  const weekOf = selected('week-of')
    ? await sendGrantCycleWeekOfMay1(options)
    : notSelected;
  const portalOpen = selected('portal-open')
    ? await sendGrantCyclePortalOpenNotice(options)
    : notSelected;
  return { januaryOpen, draft24h, twoWeek, weekOf, portalOpen };
}
