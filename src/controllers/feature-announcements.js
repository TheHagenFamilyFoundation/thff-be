import jwt from 'jsonwebtoken';
import FeatureAnnouncement from '../models/feature-announcement.js';
import {
  GrantCycleNoticeSchedule,
  Meeting,
  Organization,
  OrganizationMembership,
  OutboundEmail,
  User,
} from '../models/index.js';
import { sendHtmlEmail } from './email/email.js';
import { wrapInLayout } from '../views/layout.js';
import Logger from '../utils/logger.js';
import Config from '../config/config.js';
import { endOfEasternDay } from '../utils/eastern-day.js';
import {
  describeGrantCycleNotices,
  parseUtcDay,
  scheduleYearContext,
} from '../jobs/grant-cycle-schedule.js';
function toPublic(doc) {
  return {
    id: String(doc._id),
    key: doc.key,
    title: doc.title,
    body: doc.body,
    linkLabel: doc.linkLabel || '',
    link: doc.link || '',
    queryParams: doc.queryParams || null,
  };
}

function readSession(req) {
  const header = req.headers.authorization;
  if (!header) {
    return { userId: null, invalid: false };
  }
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  try {
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
    if (!decoded?.userID) {
      return { userId: null, invalid: true };
    }
    return { userId: String(decoded.userID), invalid: false };
  } catch {
    return { userId: null, invalid: true };
  }
}

function formatGrantAmount(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    return '';
  }
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

function grantNoticeBody(row) {
  const org = row.organizationName || 'Your organization';
  const title = row.proposalTitle ? ` for ${row.proposalTitle}` : '';
  const amount = formatGrantAmount(row.amountGranted);
  if (amount) {
    return `${org} received a grant of ${amount}${title}.`;
  }
  return `${org} received a grant notification${title}.`;
}

/** Grant emails already sent, shown only to members of that organization. */
async function grantNoticesForUser(userId) {
  const user = await User.findById(userId).select('email organizations').lean();
  if (!user) {
    return [];
  }

  const memberships = await OrganizationMembership.find({ user: userId }).select('organization').lean();
  const orgIds = [
    ...new Set([
      ...(user.organizations || []).map((id) => String(id)),
      ...memberships.map((row) => String(row.organization)),
    ].filter(Boolean)),
  ];
  const email = String(user.email || '').trim().toLowerCase();
  const or = [];
  if (orgIds.length) {
    or.push({ organization: { $in: orgIds } });
  }
  if (email) {
    or.push({ to: email });
  }
  if (!or.length) {
    return [];
  }

  const currentMeetings = await Meeting.find({ year: { $gte: 2027 } }).select('_id').lean();
  const rows = await OutboundEmail.find({
    type: 'grant_notification',
    meeting: { $in: currentMeetings.map((meeting) => meeting._id) },
    $or: or,
  })
    .select('subject organizationName proposalTitle amountGranted proposal createdAt')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return rows.map((row) => ({
    id: String(row._id),
    key: `grant-notification:${row._id}`,
    title: row.subject || 'Grant award',
    body: grantNoticeBody(row),
    linkLabel: row.proposal ? 'View proposal' : '',
    link: row.proposal ? `/pages/proposal/${row.proposal}` : '',
    queryParams: null,
  }));
}

function requireDirector(req, res) {
  const level = Number(req.decoded?.accessLevel || 0);
  if (level < 2) {
    res.status(403).json({ message: 'Only a director can change home page notices' });
    return false;
  }
  return true;
}

function requirePresident(req, res) {
  const level = Number(req.decoded?.accessLevel || 0);
  if (level < 3) {
    res.status(403).json({ message: 'Only a president or admin can send site notices' });
    return false;
  }
  return true;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isDeliverableEmail(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)) {
    return false;
  }
  return !email.endsWith('@example.com') && !email.endsWith('@example.org');
}

function roleLabel(level) {
  const value = Number(level);
  if (value >= 4) {
    return 'Admin';
  }
  if (value >= 3) {
    return 'President';
  }
  if (value >= 2) {
    return 'Director';
  }
  return 'User';
}

function isObjectId(value) {
  return /^[a-f0-9]{24}$/i.test(String(value || ''));
}

function toNoticeUser(user) {
  const email = String(user.email || '').trim().toLowerCase();
  if (!isDeliverableEmail(email)) {
    return null;
  }
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  const organizations = [...new Set(
    (user.organizations || [])
      .map((org) => (org && typeof org === 'object' ? org.name : ''))
      .map((orgName) => String(orgName || '').trim())
      .filter(Boolean),
  )].sort((a, b) => a.localeCompare(b));
  return {
    id: String(user._id),
    email,
    name,
    role: roleLabel(user.accessLevel),
    organizations,
  };
}

async function countDeliverableUsers() {
  const users = await User.find({ email: { $exists: true, $ne: '' } }).select('email').lean();
  let total = 0;
  for (const user of users) {
    if (isDeliverableEmail(String(user.email || '').trim().toLowerCase())) {
      total += 1;
    }
  }
  return total;
}

async function usersByIds(ids) {
  const wanted = [...new Set(
    (Array.isArray(ids) ? ids : [])
      .map((id) => String(id || '').trim())
      .filter(isObjectId),
  )];
  if (!wanted.length) {
    return [];
  }
  const users = await User.find({ _id: { $in: wanted } })
    .select('email firstName lastName accessLevel organizations')
    .populate('organizations', 'name')
    .lean();
  const byId = new Map(
    users.map(toNoticeUser).filter(Boolean).map((user) => [user.id, user]),
  );
  return wanted.map((id) => byId.get(id)).filter(Boolean);
}

async function allDeliverableUsers() {
  const users = await User.find({ email: { $exists: true, $ne: '' } })
    .select('email')
    .lean();
  return users
    .map((user) => {
      const email = String(user.email || '').trim().toLowerCase();
      if (!isDeliverableEmail(email)) {
        return null;
      }
      return { id: String(user._id), email };
    })
    .filter(Boolean);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function levelsMatching(query) {
  if (query.length < 3) {
    return [];
  }
  return [
    ['admin', 4],
    ['president', 3],
    ['director', 2],
    ['user', 1],
  ].filter(([label]) => label.startsWith(query)).map(([, level]) => level);
}

function audienceLabel(recipients) {
  const count = Array.isArray(recipients) ? recipients.length : 0;
  if (!count) {
    return 'Everyone';
  }
  return count === 1 ? '1 user' : `${count} users`;
}

function noticeHtml(title, body, link, linkLabel) {
  const paragraphs = escapeHtml(body)
    .split(/\n{2,}/)
    .map((part) => `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #334155;">${part.replace(/\n/g, '<br>')}</p>`)
    .join('');
  let button = '';
  if (link) {
    const href = link.startsWith('/')
      ? `${String(Config.feURL || '').replace(/\/$/, '')}${link}`
      : link;
    button = `<p style="margin: 24px 0 0 0;"><a href="${escapeHtml(href)}" style="color: #0f766e; font-weight: 600;">${escapeHtml(linkLabel || 'Open')}</a></p>`;
  }
  return wrapInLayout(
    `<h1 style="margin: 0 0 16px 0; font-size: 22px; line-height: 1.3; color: #0f172a;">${escapeHtml(title)}</h1>${paragraphs}${button}`,
  );
}

async function deliverNoticeEmails(addresses, subject, html) {
  let sent = 0;
  let failed = 0;
  for (const to of addresses) {
    try {
      await sendHtmlEmail(to, subject, html);
      sent += 1;
    } catch (err) {
      failed += 1;
      Logger.error(`deliverNoticeEmails ${to}: ${err.message}`);
    }
  }
  Logger.info(`Site notice email finished: sent ${sent}, failed ${failed}`);
}

/**
 * Notices whose window includes now.
 * `?preview=1` is honored outside production and also returns notices that have not started yet.
 */
export const listFeatureAnnouncements = async (req, res) => {
  try {
    const session = readSession(req);
    if (session.invalid) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    const now = new Date();
    const preview = req.query.preview === '1' && Config.nodeEnv !== 'production';
    const query = preview
      ? { endsOn: { $gte: now } }
      : { startsOn: { $lte: now }, endsOn: { $gte: now } };

    const rows = await FeatureAnnouncement.find(query).sort({ startsOn: 1 }).lean();
    const visible = rows.filter((doc) => {
      const recipients = doc.recipients || [];
      if (!recipients.length) {
        return true;
      }
      return Boolean(session.userId) && recipients.some((id) => String(id) === session.userId);
    });
    const grants = session.userId ? await grantNoticesForUser(session.userId) : [];
    return res.status(200).json([...grants, ...visible.map(toPublic)]);
  } catch (err) {
    Logger.error(`listFeatureAnnouncements: ${err.message}`);
    return res.status(500).json({ message: 'Could not load announcements' });
  }
};

export const manageSiteNotices = async (req, res) => {
  if (!requirePresident(req, res)) {
    return;
  }
  try {
    const notices = await FeatureAnnouncement.find().sort({ startsOn: -1 }).limit(20).lean();
    return res.status(200).json({
      notices: notices.map((doc) => ({
        ...toPublic(doc),
        startsOn: doc.startsOn,
        endsOn: doc.endsOn,
        audience: audienceLabel(doc.recipients),
      })),
    });
  } catch (err) {
    Logger.error(`manageSiteNotices: ${err.message}`);
    return res.status(500).json({ message: 'Could not load notices' });
  }
};

/** Count only. The page uses this to confirm an all-emails send without listing addresses. */
export const countNoticeRecipients = async (req, res) => {
  if (!requirePresident(req, res)) {
    return;
  }
  try {
    const total = await countDeliverableUsers();
    return res.status(200).json({ total });
  } catch (err) {
    Logger.error(`countNoticeRecipients: ${err.message}`);
    return res.status(500).json({ message: 'Could not count emails' });
  }
};

/** A short search result the president can add. An empty query returns nothing. */
export const searchNoticeRecipients = async (req, res) => {
  if (!requirePresident(req, res)) {
    return;
  }
  const q = String(req.query.q || '').trim();
  if (q.length < 2) {
    return res.status(200).json({ users: [] });
  }
  try {
    const regex = new RegExp(escapeRegex(q), 'i');
    const orgs = await Organization.find({ name: regex }).select('_id').limit(30).lean();
    const or = [
      { email: regex },
      { firstName: regex },
      { lastName: regex },
      {
        $expr: {
          $regexMatch: {
            input: {
              $trim: {
                input: {
                  $concat: [
                    { $ifNull: ['$firstName', ''] },
                    ' ',
                    { $ifNull: ['$lastName', ''] },
                  ],
                },
              },
            },
            regex: escapeRegex(q),
            options: 'i',
          },
        },
      },
    ];
    if (orgs.length) {
      or.push({ organizations: { $in: orgs.map((org) => org._id) } });
    }
    const levels = levelsMatching(q.toLowerCase());
    if (levels.length) {
      or.push({ accessLevel: { $in: levels } });
    }
    const users = await User.find({ email: { $exists: true, $ne: '' }, $or: or })
      .select('email firstName lastName accessLevel organizations')
      .populate('organizations', 'name')
      .limit(15)
      .lean();
    return res.status(200).json({ users: users.map(toNoticeUser).filter(Boolean) });
  } catch (err) {
    Logger.error(`searchNoticeRecipients: ${err.message}`);
    return res.status(500).json({ message: 'Could not search users' });
  }
};

export const sendSiteNotice = async (req, res) => {
  if (!requirePresident(req, res)) {
    return;
  }
  try {
    const title = String(req.body?.title || '').trim();
    const body = String(req.body?.body || '').trim();
    const link = String(req.body?.link || '').trim();
    const linkLabel = String(req.body?.linkLabel || '').trim();
    const email = req.body?.email === true;

    if (!title || title.length > 140) {
      return res.status(400).json({ message: 'Add a title of 140 characters or less' });
    }
    if (!body || body.length > 4000) {
      return res.status(400).json({ message: 'Add a message of 4000 characters or less' });
    }
    if (link && !link.startsWith('/') && !/^https:\/\//i.test(link)) {
      return res.status(400).json({ message: 'Link must start with / or https://' });
    }
    if (email && (!Config.mailgunKey || !Config.mailgunDomain)) {
      return res.status(400).json({ message: 'Email is not configured' });
    }

    const allEmails = req.body?.allEmails === true;
    const chosen = allEmails
      ? await allDeliverableUsers()
      : await usersByIds(req.body?.recipients);
    if (!chosen.length) {
      return res.status(400).json({ message: allEmails ? 'No emails to send to' : 'Choose at least one user' });
    }
    const addresses = chosen.map((user) => user.email);
    if (email && !addresses.length) {
      return res.status(400).json({ message: 'Choose at least one user to email' });
    }

    const endsOn = endOfEasternDay(req.body?.endsOn);
    if (!endsOn || Number.isNaN(endsOn.getTime()) || endsOn.getTime() < Date.now()) {
      return res.status(400).json({ message: 'Choose an end date that is today or later' });
    }
    const created = await FeatureAnnouncement.create({
      key: `site-notice-${Date.now()}`,
      title,
      body,
      link: link || undefined,
      linkLabel: linkLabel || undefined,
      queryParams: null,
      startsOn: new Date(),
      endsOn,
      recipients: chosen.map((user) => user.id),
    });

    let emailQueued = 0;
    if (email) {
      emailQueued = addresses.length;
      const html = noticeHtml(title, body, link, linkLabel);
      setImmediate(() => {
        deliverNoticeEmails(addresses, title, html);
      });
    }

    return res.status(200).json({
      bell: toPublic(created.toObject()),
      bellRecipientCount: chosen.length,
      emailQueued,
    });
  } catch (err) {
    Logger.error(`sendSiteNotice: ${err.message}`);
    return res.status(400).json({ message: err.message });
  }
};

export const createFeatureAnnouncement = async (req, res) => {
  if (!requireDirector(req, res)) {
    return;
  }
  try {
    const created = await FeatureAnnouncement.create(req.body);
    return res.status(201).json(toPublic(created.toObject()));
  } catch (err) {
    Logger.error(`createFeatureAnnouncement: ${err.message}`);
    return res.status(400).json({ message: err.message });
  }
};

export const updateFeatureAnnouncement = async (req, res) => {
  if (!requireDirector(req, res)) {
    return;
  }
  try {
    const updated = await FeatureAnnouncement.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).lean();
    if (!updated) {
      return res.status(404).json({ message: 'Announcement not found' });
    }
    return res.status(200).json(toPublic(updated));
  } catch (err) {
    Logger.error(`updateFeatureAnnouncement: ${err.message}`);
    return res.status(400).json({ message: err.message });
  }
};

function schedulePayload(yearContext, notices) {
  return {
    year: yearContext.year,
    projected: !!yearContext.projected,
    jobEnabled: !!Config.grantCycleEmailsEnabled,
    notices,
  };
}

export const getGrantCycleNoticeSchedule = async (req, res) => {
  if (!requirePresident(req, res)) {
    return;
  }
  try {
    const yearContext = await scheduleYearContext();
    const notices = await describeGrantCycleNotices(yearContext);
    return res.status(200).json(schedulePayload(yearContext, notices));
  } catch (err) {
    Logger.error(`getGrantCycleNoticeSchedule: ${err.message}`);
    return res.status(500).json({ message: 'Could not load automatic notices' });
  }
};

export const updateGrantCycleNoticeSchedule = async (req, res) => {
  if (!requirePresident(req, res)) {
    return;
  }
  try {
    const yearContext = await scheduleYearContext();
    const current = await describeGrantCycleNotices(yearContext);
    const sentOn = (key) => {
      const notice = current.find((item) => item.key === key);
      return notice?.sentAt ? parseUtcDay(notice.sendsOn) : null;
    };
    const portalOpenOn = sentOn('portal-open') || parseUtcDay(req.body?.portalOpenOn);
    const twoWeeksOn = sentOn('two-weeks') || parseUtcDay(req.body?.twoWeeksOn);
    const weekOfOn = sentOn('week-of') || parseUtcDay(req.body?.weekOfOn);
    if (!portalOpenOn || !twoWeeksOn || !weekOfOn) {
      return res.status(400).json({ message: 'Each notice needs a send date' });
    }
    await GrantCycleNoticeSchedule.findOneAndUpdate(
      { year: yearContext.year },
      { $set: { portalOpenOn, twoWeeksOn, weekOfOn } },
      { upsert: true, new: true },
    );
    const notices = await describeGrantCycleNotices(await scheduleYearContext());
    return res.status(200).json(schedulePayload(yearContext, notices));
  } catch (err) {
    Logger.error(`updateGrantCycleNoticeSchedule: ${err.message}`);
    return res.status(400).json({ message: err.message });
  }
};

export const deleteFeatureAnnouncement = async (req, res) => {
  if (!requireDirector(req, res)) {
    return;
  }
  try {
    const deleted = await FeatureAnnouncement.findByIdAndDelete(req.params.id).lean();
    if (!deleted) {
      return res.status(404).json({ message: 'Announcement not found' });
    }
    return res.status(200).json({ deleted: true, id: String(deleted._id) });
  } catch (err) {
    Logger.error(`deleteFeatureAnnouncement: ${err.message}`);
    return res.status(400).json({ message: err.message });
  }
};
