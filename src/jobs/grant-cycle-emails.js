/**
 * Scheduled grant-cycle reminders (run daily via cron + `npm run grant-cycle-emails`).
 * Gated by GRANT_CYCLE_EMAILS_ENABLED — off by default until tested in staging.
 *
 * - 24h after creation: email creator if proposal is still `draft` (incomplete composer).
 * - On UTC calendar day 14 days before May 1 (grant year): orgs with any proposal in that year (submitted or composer) — time to ensure proposals are ready.
 * - On UTC calendar day 3 days before May 1: same org set — final nudge before the soft target.
 */

import Config from '../config/config.js';
import Logger from '../utils/logger.js';
import { sendEmailWithTemplate } from '../controllers/email/email.js';
import {
  proposalDraftStillIncomplete24h,
  grantCycleSoftDeadlineTwoWeeks,
  grantCycleSoftDeadlineThreeDays,
} from '../views/grant-cycle-reminder-templates.js';
import {
  Organization,
  Proposal,
  SubmissionYear,
} from '../models/index.js';
import { COMPOSER_PROPOSAL_STATUSES } from '../utils/proposal-composer-status.js';

const MS_DAY = 86400000;

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

function sameUtcCalendarDay(a, b) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear()
    && a.getUTCMonth() === b.getUTCMonth()
    && a.getUTCDate() === b.getUTCDate()
  );
}

function addUtcDays(base, deltaDays) {
  const d = new Date(base.getTime());
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d;
}

function mayFirstUtc(grantYear) {
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

/** Organizations with at least one non-archived proposal in the grant calendar year (submitted or composer). */
async function distinctOrganizationIdsWithProposalsInGrantYear(grantYear) {
  const { start, end } = yearWindow(grantYear);
  const submittedOrgIds = await Proposal.distinct('organization', {
    createdAt: { $gte: start, $lte: end },
    status: 'submitted',
    archived: { $ne: true },
  });
  const composerOrgIds = await Proposal.distinct('organization', {
    createdAt: { $gte: start, $lte: end },
    status: { $in: COMPOSER_PROPOSAL_STATUSES },
    archived: { $ne: true },
  });
  return new Set([...submittedOrgIds.map(String), ...composerOrgIds.map(String)]);
}

async function orgPrimaryContactRows(orgIds) {
  const uniq = [...new Set((orgIds || []).map((id) => String(id)))];
  if (uniq.length === 0) {
    return [];
  }
  const orgs = await Organization.find({ _id: { $in: uniq } })
    .select('name info')
    .populate('info', 'contactPerson email')
    .lean();

  return orgs.map((org) => {
    const info = org.info || {};
    const first = info.contactPerson ? String(info.contactPerson).split(',')[0].trim() : '';
    return {
      organizationId: String(org._id),
      organizationName: org.name || 'Unknown Organization',
      email: info.email || null,
      recipientFirstName: first || '',
    };
  });
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

export async function sendProposalDraft24hReminders() {
  const activeYear = await SubmissionYear.findOne({ active: true }).select('year').lean();
  const softYear = activeYear?.year ?? new Date().getUTCFullYear();

  const cutoff = new Date(Date.now() - MS_DAY);
  const proposals = await Proposal.find({
    status: 'draft',
    draftReminderSentAt: { $exists: false },
    createdBy: { $exists: true, $ne: null },
    createdAt: { $lte: cutoff },
  })
    .populate('createdBy', 'firstName email')
    .populate('organization', 'name')
    .limit(500);

  let sent = 0;
  let failed = 0;

  for (const p of proposals) {
    const user = p.createdBy;
    const to = user?.email ? String(user.email).trim() : '';
    if (!to || !normalizeEmail(to)) {
      Logger.warn(`sendProposalDraft24hReminders: skip proposal ${p._id} — no creator email`);
      await Proposal.updateOne({ _id: p._id }, { $set: { draftReminderSentAt: new Date() } });
      continue;
    }
    const orgName = p.organization?.name || 'your organization';
    const data = {
      recipientFirstName: user.firstName || '',
      organizationName: orgName,
      projectTitle: p.projectTitle?.trim() || '(untitled draft)',
      softDeadlineDateLabel: softDeadlineLabel(softYear),
      portalUrl: `${absoluteFrontendBase()}/pages/welcome`,
    };
    try {
      await sendEmailWithTemplate(
        to,
        'You still have a proposal draft — The Hagen Family Foundation',
        proposalDraftStillIncomplete24h,
        data,
      );
      await Proposal.updateOne({ _id: p._id }, { $set: { draftReminderSentAt: new Date() } });
      sent += 1;
    } catch (e) {
      failed += 1;
      Logger.error(`sendProposalDraft24hReminders: failed for proposal ${p._id}: ${e.message}`);
    }
  }

  return { sent, failed, scanned: proposals.length };
}

export async function sendGrantCycleTwoWeeksBeforeMay1() {
  const activeYear = await SubmissionYear.findOne({ active: true }).lean();
  if (!activeYear?.year) {
    Logger.info('sendGrantCycleTwoWeeksBeforeMay1: no active submission year');
    return { skipped: true, reason: 'no_active_year' };
  }
  if (activeYear.grantCycleEmailTwoWeeksBeforeSoftDeadlineSentAt) {
    return { skipped: true, reason: 'already_sent' };
  }

  const y = activeYear.year;
  const may1 = mayFirstUtc(y);
  const triggerDay = addUtcDays(may1, -14);
  const now = new Date();
  if (!sameUtcCalendarDay(now, triggerDay)) {
    return { skipped: true, reason: 'not_trigger_day', triggerDay: triggerDay.toISOString() };
  }

  const orgIdSet = await distinctOrganizationIdsWithProposalsInGrantYear(y);
  const orgRows = await orgPrimaryContactRows([...orgIdSet]);
  const merged = mergeRowsByEmail(orgRows.filter((r) => r.email));

  const portalUrl = `${absoluteFrontendBase()}/pages/welcome`;
  const softLabel = softDeadlineLabel(y);
  let sent = 0;
  let failed = 0;

  for (const row of merged) {
    try {
      await sendEmailWithTemplate(
        row.email,
        `Grant cycle reminder — soft deadline ${softLabel}`,
        grantCycleSoftDeadlineTwoWeeks,
        {
          recipientFirstName: row.recipientFirstName,
          organizationName: row.organizationName,
          grantYear: String(y),
          softDeadlineDateLabel: softLabel,
          portalUrl,
        },
      );
      sent += 1;
    } catch (e) {
      failed += 1;
      Logger.error(`sendGrantCycleTwoWeeksBeforeMay1: ${row.email} ${e.message}`);
    }
  }

  await SubmissionYear.updateOne(
    { _id: activeYear._id },
    { $set: { grantCycleEmailTwoWeeksBeforeSoftDeadlineSentAt: new Date() } },
  );

  return { sent, failed, recipients: merged.length, grantYear: y };
}

export async function sendGrantCycleThreeDaysBeforeMay1() {
  const activeYear = await SubmissionYear.findOne({ active: true }).lean();
  if (!activeYear?.year) {
    Logger.info('sendGrantCycleThreeDaysBeforeMay1: no active submission year');
    return { skipped: true, reason: 'no_active_year' };
  }
  if (activeYear.grantCycleEmailThreeDaysBeforeSoftDeadlineSentAt) {
    return { skipped: true, reason: 'already_sent' };
  }

  const y = activeYear.year;
  const may1 = mayFirstUtc(y);
  const triggerDay = addUtcDays(may1, -3);
  const now = new Date();
  if (!sameUtcCalendarDay(now, triggerDay)) {
    return { skipped: true, reason: 'not_trigger_day', triggerDay: triggerDay.toISOString() };
  }

  const orgIdSet = await distinctOrganizationIdsWithProposalsInGrantYear(y);
  const orgRows = await orgPrimaryContactRows([...orgIdSet]);
  const merged = mergeRowsByEmail(orgRows.filter((r) => r.email));

  const portalUrl = `${absoluteFrontendBase()}/pages/welcome`;
  const softLabel = softDeadlineLabel(y);
  let sent = 0;
  let failed = 0;

  for (const row of merged) {
    try {
      await sendEmailWithTemplate(
        row.email,
        `Wrap up your proposal — soft deadline ${softLabel}`,
        grantCycleSoftDeadlineThreeDays,
        {
          recipientFirstName: row.recipientFirstName,
          organizationName: row.organizationName,
          grantYear: String(y),
          softDeadlineDateLabel: softLabel,
          portalUrl,
        },
      );
      sent += 1;
    } catch (e) {
      failed += 1;
      Logger.error(`sendGrantCycleThreeDaysBeforeMay1: ${row.email} ${e.message}`);
    }
  }

  await SubmissionYear.updateOne(
    { _id: activeYear._id },
    { $set: { grantCycleEmailThreeDaysBeforeSoftDeadlineSentAt: new Date() } },
  );

  return { sent, failed, recipients: merged.length, grantYear: y };
}

export async function runAllGrantCycleEmailTasks() {
  if (!Config.grantCycleEmailsEnabled) {
    Logger.info(
      'runAllGrantCycleEmailTasks: skipped — set GRANT_CYCLE_EMAILS_ENABLED=true to run grant-cycle reminders',
    );
    return { disabled: true };
  }

  const draft24h = await sendProposalDraft24hReminders();
  const twoWeek = await sendGrantCycleTwoWeeksBeforeMay1();
  const threeDay = await sendGrantCycleThreeDaysBeforeMay1();
  return { draft24h, twoWeek, threeDay };
}
