import mongoose from 'mongoose';

import Config from '../../config/config.js';
import Logger from '../../utils/logger.js';
import { renderEmailWithTemplate, sendHtmlEmail } from './email.js';
import { wrapSolicitationPlainHtml } from '../../views/layout.js';
import { defaultSolicitationMessagePlain } from '../../views/solicitation-email-default-plain.js';
import { grantNotificationEmail } from '../../views/grant-notification-email.js';
import {
  OutboundEmail,
  ReferralCode,
  User,
  Meeting,
  Organization,
} from '../../models/index.js';

const ACCESS_DIRECTOR = 2;
const ACCESS_PRESIDENT = 3;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

/** FE_URL may omit the scheme; Mailgun needs absolute hrefs for clickable links. */
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

function directorFirstLast(director) {
  const first = director?.firstName || '';
  const last = director?.lastName || '';
  return `${first} ${last}`.trim();
}

/** Whole string looks like one email address (not a human “Jane Doe”). */
function looksLikeEmailOnlyString(s) {
  const t = String(s || '').trim();
  if (!t) {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(t);
}

/** True display name for templates — empty if unset, if name is the account email, or if “name” is email-shaped. */
function directorDisplayNameForTokens(director) {
  const name = directorFirstLast(director);
  if (!name) {
    return '';
  }
  const email = director?.email ? String(director.email).trim() : '';
  const nameCompact = name.replace(/\s+/g, '');
  if (email) {
    if (normalizeEmail(name) === normalizeEmail(email) || normalizeEmail(nameCompact) === normalizeEmail(email)) {
      return '';
    }
  }
  if (looksLikeEmailOnlyString(name)) {
    return '';
  }
  return name;
}

/** Text after “… your sponsoring director ” — never “email at email”. */
function buildDirectorContactSuffix(director) {
  const name = directorDisplayNameForTokens(director);
  const email = director?.email ? String(director.email).trim() : '';
  if (name && email) {
    return `${name} at ${email}`;
  }
  if (email) {
    return `at ${email}`;
  }
  if (name) {
    return name;
  }
  return 'A board member';
}

/** Collapse accidental “addr@x at addr@x” from legacy templates or bad profile data. */
function dedupeEmailAtEmail(text, emailRaw) {
  const email = String(emailRaw || '').trim();
  if (!email) {
    return text;
  }
  const esc = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return String(text).replace(new RegExp(`${esc}\\s+at\\s+${esc}`, 'gi'), `at ${email}`);
}

/**
 * “… sponsoring director user@x.com at user@x.com” → “… sponsoring director at user@x.com”
 * (handles legacy {{DIRECTOR_NAME}} at {{DIRECTOR_EMAIL}} when both expanded to the same address).
 */
function collapseSponsoringDirectorDuplicateEmail(text) {
  return String(text).replace(
    /(sponsoring director)\s+(\S+@\S+)\s+at\s+\2/gi,
    '$1 at $2'
  );
}

const MAX_SOLICITATION_PLAIN = 50000;
/** Max HTML size for a customized grant notification body (legacy htmlBody override). */
const MAX_GRANT_CUSTOM_HTML = 600000;
/** Max plain-text length for the editable grant message paragraph. */
const MAX_GRANT_MESSAGE_PLAIN = 50000;

function defaultGrantMessagePlain() {
  return (
    'We are grateful for the work your organization does in the community. ' +
    'This award reflects our confidence in your program and our mission to serve as a catalyst for change.'
  );
}

/**
 * Build Handlebars data for grantNotificationEmail from a funded row and optional plain message.
 */
function buildGrantNotificationTemplateData(row, meetingYear, messagePlain) {
  const recipientName = row.contactPerson ? row.contactPerson.split(',')[0].trim() : 'Friend';
  const mp = messagePlain !== undefined && messagePlain !== null ? String(messagePlain) : defaultGrantMessagePlain();
  const messageBodyHtml = plainTextToSafeEmailHtml(mp);
  return {
    recipientName,
    organizationName: row.organizationName,
    meetingYear,
    proposalTitle: row.proposalTitle || '',
    messageBodyHtml,
  };
}

function escapeHtmlForEmail(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeHtmlAttr(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Plain text → safe HTML for email: line breaks, and URLs become real <a href> links
 * (bare URLs in HTML are often not clickable in many mail clients).
 * Includes http(s), mailto:, and bare localhost / 127.0.0.1 with port (common when FE_URL has no scheme).
 */
function plainTextToSafeEmailHtml(text) {
  if (text == null || !String(text).trim()) return '';
  const str = String(text).replace(/\r\n/g, '\n');
  const urlRegex =
    /(https?:\/\/[^\s<]+|mailto:[^\s<]+|(?:localhost|127\.0\.0\.1):\d+(?:\/[^\s<]*)?)/gi;
  let out = '';
  let lastIndex = 0;
  let match;
  while ((match = urlRegex.exec(str)) !== null) {
    if (match.index > lastIndex) {
      out += escapeHtmlForEmail(str.slice(lastIndex, match.index)).replace(/\n/g, '<br />');
    }
    const url = match[1];
    const hrefUrl =
      /^https?:\/\//i.test(url) || /^mailto:/i.test(url) ? url : `http://${url}`;
    out += `<a href="${escapeHtmlAttr(hrefUrl)}" style="color: #0d9488; word-break: break-all;">${escapeHtmlForEmail(url)}</a>`;
    lastIndex = match.index + match[0].length;
  }
  out += escapeHtmlForEmail(str.slice(lastIndex)).replace(/\n/g, '<br />');
  return out;
}

function resolveSolicitationMessagePlain(messagePlain) {
  if (messagePlain === undefined || messagePlain === null) {
    return defaultSolicitationMessagePlain;
  }
  return String(messagePlain);
}

/**
 * Solicitation email = exactly the plain-text message (with optional placeholders), converted to HTML.
 * Nothing is appended after the user's text. Placeholders are substituted inside the text before escaping:
 * {{REFERRAL_LINK}}, {{DIRECTOR_NAME}}, {{DIRECTOR_EMAIL}}, {{DIRECTOR_CONTACT}}, {{GRANT_YEAR}}
 * DIRECTOR_NAME = first/last only (empty if unset, or if name equals the account email).
 * DIRECTOR_CONTACT = suffix after “… sponsoring director ” in the default line.
 */
async function buildSolicitationEmailContent(decoded, referralCode, { messagePlain }) {
  const director = await User.findById(decoded.userID).select('firstName lastName email');
  const directorNameToken = directorDisplayNameForTokens(director);
  const directorEmail = director?.email ? String(director.email).trim() : '';
  const directorContactSuffix = buildDirectorContactSuffix(director);
  const referralLink = `${absoluteFrontendBase()}/referral?ref=${encodeURIComponent(referralCode.code)}`;
  const grantYear = String(new Date().getFullYear());

  const rawPlain = resolveSolicitationMessagePlain(messagePlain);
  let withPlaceholders = rawPlain
    .replace(/\{\{REFERRAL_LINK\}\}/g, referralLink)
    .replace(/\{\{DIRECTOR_NAME\}\}/g, directorNameToken)
    .replace(/\{\{DIRECTOR_EMAIL\}\}/g, directorEmail || '—')
    .replace(/\{\{DIRECTOR_CONTACT\}\}/g, directorContactSuffix)
    .replace(/\{\{GRANT_YEAR\}\}/g, grantYear);

  withPlaceholders = dedupeEmailAtEmail(withPlaceholders, directorEmail);
  withPlaceholders = collapseSponsoringDirectorDuplicateEmail(withPlaceholders);

  if (!directorNameToken && directorEmail) {
    withPlaceholders = withPlaceholders.replace(/(director)\s{2,}(at\s)/gi, '$1 $2');
  }

  const bodyHtml = plainTextToSafeEmailHtml(withPlaceholders);
  const htmlBody = wrapSolicitationPlainHtml(bodyHtml);
  const subject = 'Invitation to apply — The Hagen Family Foundation';
  return { htmlBody, subject, messagePlainUsed: rawPlain };
}

/**
 * Same contact resolution as getFundedContacts in meetings controller (funded allocations only).
 */
async function loadFundedOrgContacts(meetingId) {
  const meeting = await Meeting.findById(meetingId)
    .select('_id meetingID year status totalBudget totalAllocated allocations')
    .populate({
      path: 'allocations.organization',
      select: 'name organizationID info',
      populate: { path: 'info', select: 'contactPerson contactPersonTitle contactPersonPhoneNumber email phone address city state zip website' },
    })
    .populate('allocations.proposal', 'organization projectTitle');

  if (!meeting) {
    return null;
  }

  const fundedAllocations = meeting.allocations.filter((a) => (a.amountGranted || 0) > 0);
  const orgIds = [
    ...new Set(
      fundedAllocations
        .map((a) => {
          if (a.organization?._id) return a.organization._id.toString();
          if (a.organization) return a.organization.toString();
          if (a.proposal?.organization) return a.proposal.organization.toString();
          return null;
        })
        .filter(Boolean),
    ),
  ];

  const byOrgId = new Map();
  for (const a of fundedAllocations) {
    if (a.organization?._id) {
      byOrgId.set(a.organization._id.toString(), a.organization);
    }
  }

  const missingOrgIds = orgIds.filter((orgId) => !byOrgId.has(orgId));
  if (missingOrgIds.length > 0) {
    const organizations = await Organization.find({ _id: { $in: missingOrgIds } })
      .select('name organizationID info')
      .populate('info', 'contactPerson contactPersonTitle contactPersonPhoneNumber email phone address city state zip website')
      .lean();

    organizations.forEach((org) => {
      byOrgId.set(org._id.toString(), org);
    });
  }

  const rows = orgIds.map((orgId) => {
    const orgAllocations = fundedAllocations.filter((a) => {
      const allocOrgId =
        a.organization?._id?.toString() || a.organization?.toString() || a.proposal?.organization?.toString();
      return allocOrgId === orgId;
    });
    const totalGranted = orgAllocations.reduce((sum, a) => sum + (a.amountGranted || 0), 0);
    const org = byOrgId.get(orgId);
    const info = org?.info || {};
    const primaryProposal = orgAllocations.find((a) => a.proposal)?.proposal;

    return {
      organizationId: org?._id,
      organizationName: org?.name || 'Unknown Organization',
      amountGranted: totalGranted,
      proposalTitle: primaryProposal?.projectTitle || null,
      email: info.email || null,
      contactPerson: info.contactPerson || null,
    };
  });

  return { meeting, rows };
}

async function persistOutbound(doc) {
  return OutboundEmail.create(doc);
}

export const getSolicitationEmailById = async (req, res) => {
  try {
    const { decoded } = req;
    if (decoded.accessLevel < ACCESS_DIRECTOR) {
      return res.status(403).json({ message: 'Only directors can view solicitation emails' });
    }

    if (!decoded.userID) {
      return res.status(401).json({ message: 'Invalid session' });
    }

    const { id } = req.params;
    if (!id || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid email id' });
    }

    let senderId;
    try {
      senderId = new mongoose.Types.ObjectId(String(decoded.userID));
    } catch (e) {
      return res.status(400).json({ message: 'Invalid session user' });
    }

    const doc = await OutboundEmail.findOne({
      _id: id,
      type: 'solicitation',
      sentBy: senderId,
    })
      .populate('referralCode', 'code label')
      .lean();

    if (!doc) {
      return res.status(404).json({ message: 'Email not found' });
    }

    return res.status(200).json(doc);
  } catch (e) {
    Logger.error(`getSolicitationEmailById: ${e.message}`);
    return res.status(500).json({ message: 'Error loading email' });
  }
};

export const listMySolicitationEmails = async (req, res) => {
  try {
    const { decoded } = req;
    if (decoded.accessLevel < ACCESS_DIRECTOR) {
      return res.status(403).json({ message: 'Only directors can view solicitation emails' });
    }

    const { referralCodeId, year: yearRaw } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 10));
    const skip = (page - 1) * pageSize;

    const q = { type: 'solicitation', sentBy: decoded.userID };

    let yearCodeIds = null;
    if (yearRaw != null && String(yearRaw).trim() !== '') {
      const y = parseInt(String(yearRaw), 10);
      if (!Number.isNaN(y) && y >= 2000 && y <= 2100) {
        const start = new Date(Date.UTC(y, 0, 1));
        const end = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
        const codesInYear = await ReferralCode.find({
          director: decoded.userID,
          createdAt: { $gte: start, $lte: end },
        })
          .select('_id')
          .lean();
        yearCodeIds = codesInYear.map((c) => c._id);
      }
    }

    const yearHasNoCodes = Array.isArray(yearCodeIds) && yearCodeIds.length === 0;

    if (yearHasNoCodes) {
      q.referralCode = new mongoose.Types.ObjectId();
    } else if (referralCodeId && yearCodeIds && yearCodeIds.length > 0) {
      let rid;
      try {
        rid = new mongoose.Types.ObjectId(String(referralCodeId));
      } catch (e) {
        return res.status(400).json({ message: 'Invalid referralCodeId' });
      }
      const allowed = yearCodeIds.some((id) => id.equals(rid));
      q.referralCode = allowed ? rid : new mongoose.Types.ObjectId();
    } else if (referralCodeId) {
      q.referralCode = referralCodeId;
    } else if (yearCodeIds && yearCodeIds.length > 0) {
      q.referralCode = { $in: yearCodeIds };
    }

    const [items, total] = await Promise.all([
      OutboundEmail.find(q)
        .select('-htmlBody')
        .populate('referralCode', 'code label createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      OutboundEmail.countDocuments(q),
    ]);

    return res.status(200).json({ items, total, page, pageSize });
  } catch (e) {
    Logger.error(`listMySolicitationEmails: ${e.message}`);
    return res.status(500).json({ message: 'Error loading solicitation emails' });
  }
};

export const previewSolicitationEmail = async (req, res) => {
  try {
    const { decoded } = req;
    if (decoded.accessLevel < ACCESS_DIRECTOR) {
      return res.status(403).json({ message: 'Only directors can preview solicitation emails' });
    }

    const { referralCodeId, messagePlain } = req.body;
    if (!referralCodeId) {
      return res.status(400).json({ message: 'referralCodeId is required' });
    }

    const referralCode = await ReferralCode.findOne({
      _id: referralCodeId,
      director: decoded.userID,
    });

    if (!referralCode) {
      return res.status(404).json({ message: 'Referral code not found' });
    }

    if (messagePlain != null && String(messagePlain).length > MAX_SOLICITATION_PLAIN) {
      return res.status(400).json({ message: `Message must be ${MAX_SOLICITATION_PLAIN} characters or less` });
    }

    const subject = 'Invitation to apply — The Hagen Family Foundation';
    const built = await buildSolicitationEmailContent(decoded, referralCode, { messagePlain });

    return res.status(200).json({
      subject,
      html: built.htmlBody,
      plainText: built.messagePlainUsed,
    });
  } catch (e) {
    Logger.error(`previewSolicitationEmail: ${e.message}`);
    return res.status(500).json({ message: e.message || 'Error building preview' });
  }
};

export const sendSolicitationEmail = async (req, res) => {
  try {
    const { decoded } = req;
    if (decoded.accessLevel < ACCESS_DIRECTOR) {
      return res.status(403).json({ message: 'Only directors can send solicitation emails' });
    }

    const { referralCodeId, to, messagePlain } = req.body;
    const emailTo = normalizeEmail(to);
    if (!referralCodeId || !emailTo) {
      return res.status(400).json({ message: 'referralCodeId and to are required' });
    }

    if (messagePlain != null && String(messagePlain).length > MAX_SOLICITATION_PLAIN) {
      return res.status(400).json({ message: `Message must be ${MAX_SOLICITATION_PLAIN} characters or less` });
    }

    const referralCode = await ReferralCode.findOne({
      _id: referralCodeId,
      director: decoded.userID,
    }).populate('director', 'email firstName lastName');

    if (!referralCode) {
      return res.status(404).json({ message: 'Referral code not found' });
    }

    const subject = 'Invitation to apply — The Hagen Family Foundation';
    const built = await buildSolicitationEmailContent(decoded, referralCode, { messagePlain });
    const { htmlBody, messagePlainUsed } = built;

    const mailgunBody = await sendHtmlEmail(emailTo, subject, htmlBody);

    const saved = await persistOutbound({
      type: 'solicitation',
      to: emailTo,
      subject,
      sentBy: decoded.userID,
      referralCode: referralCode._id,
      solicitationMessagePlain: messagePlainUsed,
      htmlBody,
      mailgunMessageId: mailgunBody?.id || null,
    });

    const populated = await OutboundEmail.findById(saved._id)
      .select('-htmlBody')
      .populate('referralCode', 'code label')
      .lean();

    return res.status(200).json(populated);
  } catch (e) {
    Logger.error(`sendSolicitationEmail: ${e.message}`);
    return res.status(500).json({ message: e.message || 'Error sending solicitation email' });
  }
};

export const resendSolicitationEmail = async (req, res) => {
  try {
    const { decoded } = req;
    if (decoded.accessLevel < ACCESS_DIRECTOR) {
      return res.status(403).json({ message: 'Only directors can resend solicitation emails' });
    }

    const { id } = req.params;
    const original = await OutboundEmail.findOne({
      _id: id,
      type: 'solicitation',
      sentBy: decoded.userID,
    }).populate('referralCode', 'code label director');

    if (!original) {
      return res.status(404).json({ message: 'Email not found' });
    }

    const ref = original.referralCode;
    if (!ref) {
      return res.status(400).json({ message: 'Original referral code missing' });
    }

    const { htmlBody } = await buildSolicitationEmailContent(decoded, ref, {
      messagePlain: original.solicitationMessagePlain,
    });

    const mailgunBody = await sendHtmlEmail(original.to, original.subject, htmlBody);

    const saved = await persistOutbound({
      type: 'solicitation',
      to: original.to,
      subject: original.subject,
      sentBy: decoded.userID,
      referralCode: ref._id,
      solicitationMessagePlain: original.solicitationMessagePlain,
      htmlBody,
      mailgunMessageId: mailgunBody?.id || null,
      resendOf: original._id,
    });

    const populated = await OutboundEmail.findById(saved._id)
      .select('-htmlBody')
      .populate('referralCode', 'code label')
      .lean();

    return res.status(200).json(populated);
  } catch (e) {
    Logger.error(`resendSolicitationEmail: ${e.message}`);
    return res.status(500).json({ message: e.message || 'Error resending email' });
  }
};

export const listMeetingOutboundEmails = async (req, res) => {
  try {
    const { decoded } = req;
    if (decoded.accessLevel < ACCESS_DIRECTOR) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { id } = req.params;
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize ?? '10'), 10) || 10));
    const skip = (page - 1) * pageSize;

    const query = { meeting: id, type: 'grant_notification' };
    const total = await OutboundEmail.countDocuments(query);

    const emails = await OutboundEmail.find(query)
      .select('-htmlBody')
      .populate('sentBy', 'firstName lastName email')
      .populate('organization', 'name organizationID')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    return res.status(200).json({
      items: emails,
      total,
      page,
      pageSize,
    });
  } catch (e) {
    Logger.error(`listMeetingOutboundEmails: ${e.message}`);
    return res.status(500).json({ message: 'Error loading meeting emails' });
  }
};

/** Full grant notification record including htmlBody (for viewing sent mail in the app). */
export const getMeetingGrantOutboundEmailById = async (req, res) => {
  try {
    const { decoded } = req;
    if (decoded.accessLevel < ACCESS_DIRECTOR) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { id: meetingId, emailId } = req.params;
    if (!mongoose.isValidObjectId(meetingId) || !mongoose.isValidObjectId(emailId)) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    const doc = await OutboundEmail.findOne({
      _id: emailId,
      meeting: meetingId,
      type: 'grant_notification',
    })
      .select('subject to htmlBody createdAt organizationName proposalTitle')
      .lean();

    if (!doc) {
      return res.status(404).json({ message: 'Email not found' });
    }

    return res.status(200).json(doc);
  } catch (e) {
    Logger.error(`getMeetingGrantOutboundEmailById: ${e.message}`);
    return res.status(500).json({ message: 'Error loading email' });
  }
};

/** Same recipient list as send, without sending — for UI preview before POST send-grant-notifications. */
export const previewGrantMeetingNotifications = async (req, res) => {
  try {
    const { decoded } = req;
    if (decoded.accessLevel < ACCESS_DIRECTOR) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { id } = req.params;
    const meeting = await Meeting.findById(id).select('_id status year').lean();
    if (!meeting) {
      return res.status(404).json({ code: 'MTG005', message: 'Meeting not found' });
    }

    if (meeting.status !== 'completed') {
      return res.status(400).json({ message: 'Meeting must be completed before previewing grant emails' });
    }

    const loaded = await loadFundedOrgContacts(id);
    if (!loaded) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    const { meeting: m, rows } = loaded;
    const previewRows = rows.map((row) => {
      const hasEmail = !!(row.email && String(row.email).trim());
      return {
        organizationName: row.organizationName,
        email: hasEmail ? normalizeEmail(row.email) : null,
        amountGranted: row.amountGranted,
        proposalTitle: row.proposalTitle || '',
        willSend: hasEmail,
        skipReason: hasEmail ? null : 'No organization email on file',
      };
    });

    const ready = previewRows.filter((r) => r.willSend).length;
    const skipped = previewRows.filter((r) => !r.willSend).length;

    const defaultMsg = defaultGrantMessagePlain();
    const emailPreviews = rows
      .filter((r) => r.email && String(r.email).trim())
      .map((row) => {
        const subject = `Grant award — ${row.organizationName} (${m.year})`;
        const html = renderEmailWithTemplate(
          grantNotificationEmail,
          buildGrantNotificationTemplateData(row, m.year, defaultMsg),
        );
        return {
          organizationId: row.organizationId ? String(row.organizationId) : null,
          organizationName: row.organizationName,
          subject,
          messagePlain: defaultMsg,
          html,
        };
      });

    return res.status(200).json({
      meeting: { _id: m._id, year: m.year },
      rows: previewRows,
      counts: { ready, skipped },
      emailPreviews,
    });
  } catch (e) {
    Logger.error(`previewGrantMeetingNotifications: ${e.message}`);
    return res.status(500).json({ message: e.message || 'Error loading grant email preview' });
  }
};

/** POST body: { organizationId, messagePlain } — re-render full HTML for preview dialog after plain-text edits. */
export const renderGrantNotificationPreview = async (req, res) => {
  try {
    const { decoded } = req;
    if (decoded.accessLevel < ACCESS_DIRECTOR) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { id } = req.params;
    const { organizationId, messagePlain: messagePlainRaw } = req.body || {};

    if (!organizationId || !mongoose.isValidObjectId(String(organizationId))) {
      return res.status(400).json({ message: 'Invalid organizationId' });
    }

    const mp = typeof messagePlainRaw === 'string' ? messagePlainRaw : defaultGrantMessagePlain();
    if (mp.length > MAX_GRANT_MESSAGE_PLAIN) {
      return res.status(400).json({ message: 'Message too long' });
    }

    const meeting = await Meeting.findById(id).select('_id status year').lean();
    if (!meeting || meeting.status !== 'completed') {
      return res.status(400).json({ message: 'Meeting must be completed' });
    }

    const loaded = await loadFundedOrgContacts(id);
    if (!loaded) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    const { meeting: m, rows } = loaded;
    const row = rows.find((r) => r.organizationId && String(r.organizationId) === String(organizationId));
    if (!row || !row.email || !String(row.email).trim()) {
      return res.status(404).json({ message: 'Organization not in send list for this meeting' });
    }

    const data = buildGrantNotificationTemplateData(row, m.year, mp);
    const html = renderEmailWithTemplate(grantNotificationEmail, data);
    return res.status(200).json({ html });
  } catch (e) {
    Logger.error(`renderGrantNotificationPreview: ${e.message}`);
    return res.status(500).json({ message: 'Error rendering preview' });
  }
};

export const sendGrantMeetingNotifications = async (req, res) => {
  try {
    const { decoded } = req;
    if (decoded.accessLevel < ACCESS_PRESIDENT) {
      return res.status(403).json({ message: 'Only the president or admin can send grant notifications' });
    }

    const { id } = req.params;
    const meeting = await Meeting.findById(id);
    if (!meeting) {
      return res.status(404).json({ code: 'MTG005', message: 'Meeting not found' });
    }

    if (meeting.status !== 'completed') {
      return res.status(400).json({ message: 'Meeting must be completed before sending grant notifications' });
    }

    const loaded = await loadFundedOrgContacts(id);
    if (!loaded) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    const { meeting: m, rows } = loaded;
    const results = [];
    const errors = [];

    /** Optional map org Mongo id → { subject?, htmlBody } from JSON body (president-edited previews). */
    let customizationByOrgId = null;
    const rawBody = req.body;
    if (rawBody && typeof rawBody === 'object' && Array.isArray(rawBody.customizations)) {
      customizationByOrgId = new Map();
      for (const c of rawBody.customizations) {
        const oid = c?.organizationId;
        if (!oid || !mongoose.isValidObjectId(String(oid))) {
          continue;
        }
        const htmlBodyLegacy = typeof c.htmlBody === 'string' ? c.htmlBody.trim() : '';
        if (htmlBodyLegacy.length > MAX_GRANT_CUSTOM_HTML) {
          return res.status(400).json({ message: 'Email body exceeds maximum length' });
        }
        const messagePlain = typeof c.messagePlain === 'string' ? c.messagePlain : undefined;
        if (messagePlain !== undefined && messagePlain.length > MAX_GRANT_MESSAGE_PLAIN) {
          return res.status(400).json({ message: 'Message too long' });
        }
        const subj = typeof c.subject === 'string' ? c.subject.trim() : '';
        customizationByOrgId.set(String(oid), {
          subject: subj || undefined,
          htmlBody: htmlBodyLegacy || undefined,
          messagePlain,
        });
      }
    }

    for (const row of rows) {
      if (!row.email) {
        errors.push({ organizationName: row.organizationName, error: 'No organization email on file' });
        continue;
      }

      const defaultSubject = `Grant award — ${row.organizationName} (${m.year})`;

      const orgKey = row.organizationId ? String(row.organizationId) : null;
      const custom = orgKey && customizationByOrgId ? customizationByOrgId.get(orgKey) : null;

      let subject = defaultSubject;
      let htmlBody;
      if (custom?.htmlBody) {
        htmlBody = custom.htmlBody;
        if (custom.subject) {
          subject = custom.subject;
        }
      } else {
        const mp =
          custom && typeof custom.messagePlain === 'string'
            ? custom.messagePlain
            : defaultGrantMessagePlain();
        htmlBody = renderEmailWithTemplate(
          grantNotificationEmail,
          buildGrantNotificationTemplateData(row, m.year, mp),
        );
        if (custom?.subject) {
          subject = custom.subject;
        }
      }

      try {
        const mailgunBody = await sendHtmlEmail(row.email, subject, htmlBody);
        const saved = await persistOutbound({
          type: 'grant_notification',
          to: normalizeEmail(row.email),
          subject,
          sentBy: decoded.userID,
          meeting: m._id,
          organization: row.organizationId,
          organizationName: row.organizationName,
          amountGranted: row.amountGranted,
          proposalTitle: row.proposalTitle || undefined,
          htmlBody,
          mailgunMessageId: mailgunBody?.id || null,
        });
        results.push(saved);
      } catch (sendErr) {
        Logger.error(`sendGrantMeetingNotifications row: ${sendErr.message}`);
        errors.push({ organizationName: row.organizationName, error: sendErr.message });
      }
    }

    const populated = await OutboundEmail.find({ _id: { $in: results.map((r) => r._id) } })
      .select('-htmlBody')
      .populate('sentBy', 'firstName lastName email')
      .populate('organization', 'name organizationID')
      .lean();

    return res.status(200).json({
      sent: populated,
      skipped: errors,
      counts: { sent: results.length, skipped: errors.length },
    });
  } catch (e) {
    Logger.error(`sendGrantMeetingNotifications: ${e.message}`);
    return res.status(500).json({ message: e.message || 'Error sending grant notifications' });
  }
};
