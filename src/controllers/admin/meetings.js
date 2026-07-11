import { validationResult } from "express-validator";

import Meeting from "../../models/meeting.js";
import Organization from "../../models/organization.js";
import { Proposal } from "../../models/index.js";
import Logger from "../../utils/logger.js";
import { generateCode } from "../../utils/util.js";
import { COMPOSER_PROPOSAL_STATUSES } from "../../utils/proposal-composer-status.js";
import {
  logBudgetChanged,
  logGrantChanged,
  logRestored,
  logSetAside,
} from "../../utils/meeting-events.js";
import { emitMeetingUpdate } from "../../socket/index.js";

const ACCESS_LEVEL_PRESIDENT = 3;

function isPresidentOrAdmin(decoded) {
  return decoded.accessLevel >= ACCESS_LEVEL_PRESIDENT;
}

/** Treat missing flag as active (older documents). */
function allocationIsActive(a) {
  return a.activeInMeeting !== false;
}

function sumGrantedActiveAllocations(meeting) {
  return meeting.allocations
    .filter(allocationIsActive)
    .reduce((sum, a) => sum + (a.amountGranted || 0), 0);
}

/** Active allocations with no grant → set aside (grant cleared). Used when completing a meeting. */
function setAsideUnfundedActiveAllocations(meeting) {
  let moved = 0;
  for (const alloc of meeting.allocations) {
    if (allocationIsActive(alloc) && !(alloc.amountGranted > 0)) {
      alloc.activeInMeeting = false;
      alloc.amountGranted = 0;
      moved += 1;
    }
  }
  return moved;
}

const MEETING_POPULATE = [
  { path: 'submissionYear' },
  { path: 'startedBy', select: 'firstName lastName email' },
  { path: 'completedBy', select: 'firstName lastName email' },
  {
    path: 'allocations.proposal',
    populate: {
      path: 'sponsor',
      select: 'firstName lastName email',
    },
  },
  { path: 'allocations.organization', select: 'name organizationID' },
  { path: 'events.user', select: 'firstName lastName email' },
];

async function populateMeeting(meetingId) {
  return Meeting.findById(meetingId).populate(MEETING_POPULATE);
}

/** Proposal titles for allocation audit entries. */
async function proposalLabelById(meeting) {
  const ids = [
    ...new Set(
      meeting.allocations
        .map((a) => a.proposal)
        .filter(Boolean)
        .map((id) => String(id))
    ),
  ];
  if (ids.length === 0) {
    return new Map();
  }
  const proposals = await Proposal.find({ _id: { $in: ids } })
    .select('projectTitle organization')
    .populate('organization', 'name')
    .lean();
  const map = new Map();
  for (const p of proposals) {
    map.set(String(p._id), {
      proposalTitle: p.projectTitle?.trim() || 'Untitled',
      organizationName: p.organization?.name?.trim() || '',
    });
  }
  return map;
}

function allocationAuditContext(labelMap, alloc) {
  const pid = alloc.proposal ? String(alloc.proposal) : '';
  const labels = labelMap.get(pid) || {};
  return {
    allocationId: alloc._id,
    proposalTitle: labels.proposalTitle || 'Untitled',
    organizationName: labels.organizationName || '',
  };
}

export const createMeeting = async (req, res) => {
  Logger.verbose('Inside createMeeting');

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: errors.array() });
  }

  try {
    const { decoded } = req;

    if (!isPresidentOrAdmin(decoded)) {
      return res.status(403).json({ code: "MTG001", message: "Only the president or admin can create meetings" });
    }

    const { submissionYear, year, totalBudget, notes } = req.body;

    const existing = await Meeting.findOne({ submissionYear, status: { $ne: 'completed' } });
    if (existing) {
      return res.status(400).json({ code: "MTG002", message: "An active meeting already exists for this submission year" });
    }

    // Load non-archived, submitted proposals for this year only.
    // Intentionally exclude composer rows (`draft` / `ready_to_submit`); those are not part of the grant meeting until submitted.
    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

    const proposals = await Proposal.find({
      createdAt: { $gte: startDate, $lte: endDate },
      $or: [{ archived: false }, { archived: { $exists: false } }],
      status: { $nin: COMPOSER_PROPOSAL_STATUSES }
    }).populate('organization', 'name organizationID');

    const allocations = proposals.map(p => ({
      proposal: p._id,
      organization: p.organization?._id,
      amountRequested: p.amountRequested || 0,
      amountGranted: 0,
      activeInMeeting: true
    }));

    const meeting = await Meeting.create({
      meetingID: generateCode(),
      submissionYear,
      year,
      totalBudget: totalBudget || 0,
      status: 'setup',
      allocations,
      startedBy: decoded.userID,
      notes: notes || ''
    });

    const populated = await populateMeeting(meeting._id);

    Logger.info(`Meeting created: ${meeting._id}`);
    return res.status(200).json(populated);
  } catch (err) {
    Logger.error(`Error creating meeting: ${err.message}`);
    return res.status(500).json({ code: "MTG003", message: err.message });
  }
};

export const getMeetings = async (req, res) => {
  Logger.verbose('Inside getMeetings');

  try {
    const { year, status, showArchived } = req.query;
    let query = {};

    if (year) query.year = Number(year);
    if (status) query.status = status;

    if (showArchived === 'only') {
      query.archived = true;
    } else if (showArchived !== 'true') {
      query = { ...query, $or: [{ archived: false }, { archived: { $exists: false } }] };
    }

    const meetings = await Meeting.find(query)
      .populate('submissionYear')
      .populate('startedBy', 'firstName lastName email')
      .populate('completedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    return res.status(200).json(meetings);
  } catch (err) {
    Logger.error(`Error retrieving meetings: ${err.message}`);
    return res.status(400).json({ code: "MTG004", message: err.message });
  }
};

export const getMeeting = async (req, res) => {
  Logger.verbose('Inside getMeeting');

  try {
    const { id } = req.params;

    const meeting = await populateMeeting(id);

    if (!meeting) {
      return res.status(404).json({ code: "MTG005", message: "Meeting not found" });
    }

    return res.status(200).json(meeting);
  } catch (err) {
    Logger.error(`Error retrieving meeting: ${err.message}`);
    return res.status(400).json({ code: "MTG006", message: err.message });
  }
};

export const updateMeeting = async (req, res) => {
  Logger.verbose('Inside updateMeeting');

  try {
    const { decoded } = req;

    if (!isPresidentOrAdmin(decoded)) {
      return res.status(403).json({ code: "MTG007", message: "Only the president or admin can update meetings" });
    }

    const { id } = req.params;
    const { totalBudget, status, notes } = req.body;

    const meeting = await Meeting.findById(id);
    if (!meeting) {
      return res.status(404).json({ code: "MTG005", message: "Meeting not found" });
    }

    if (totalBudget !== undefined) {
      const newBudget = Number(totalBudget);
      const oldBudget = Number(meeting.totalBudget);
      if (Number.isFinite(newBudget) && newBudget !== oldBudget) {
        logBudgetChanged(meeting, decoded.userID, oldBudget, newBudget);
        meeting.totalBudget = newBudget;
      }
    }
    if (notes !== undefined) meeting.notes = notes;

    if (status && status !== meeting.status) {
      if (status === 'in_progress' && meeting.status === 'setup') {
        meeting.originalBudget = meeting.totalBudget;
        meeting.status = 'in_progress';
      } else if (status === 'setup' && meeting.status === 'in_progress') {
        meeting.status = 'setup';
      }
    }

    if (meeting.status === 'completed') {
      meeting.totalAllocated = sumGrantedActiveAllocations(meeting);
    }

    await meeting.save();

    const populated = await populateMeeting(id);
    emitMeetingUpdate(populated);

    Logger.info(`Meeting updated: ${id}`);
    return res.status(200).json(populated);
  } catch (err) {
    Logger.error(`Error updating meeting: ${err.message}`);
    return res.status(500).json({ code: "MTG009", message: err.message });
  }
};

function findAllocationById(meeting, allocationId) {
  const id = String(allocationId);
  const byString = meeting.allocations.find(
    (a) => a?._id != null && String(a._id) === id
  );
  if (byString) {
    return byString;
  }
  return meeting.allocations.id(id);
}

export const updateAllocations = async (req, res) => {
  Logger.verbose('Inside updateAllocations');

  try {
    const { decoded } = req;

    if (!isPresidentOrAdmin(decoded)) {
      return res.status(403).json({ code: "MTG010", message: "Only the president or admin can update allocations" });
    }

    const { id } = req.params;
    const { allocations } = req.body;

    const meeting = await Meeting.findById(id);
    if (!meeting) {
      return res.status(404).json({ code: "MTG005", message: "Meeting not found" });
    }

    let changed = false;
    const labelMap = await proposalLabelById(meeting);
    for (const update of allocations) {
      const alloc = findAllocationById(meeting, update._id);
      if (!alloc) {
        return res.status(404).json({ code: "MTG021", message: "Allocation not found" });
      }
      if (!allocationIsActive(alloc)) {
        continue;
      }
      if (update.amountGranted === undefined) {
        continue;
      }
      const amountGranted = Number(update.amountGranted);
      if (!Number.isFinite(amountGranted) || amountGranted < 0) {
        return res.status(400).json({ code: "MTG045", message: "amountGranted must be a non-negative number" });
      }
      if (alloc.amountGranted !== amountGranted) {
        const ctx = allocationAuditContext(labelMap, alloc);
        logGrantChanged(meeting, decoded.userID, {
          ...ctx,
          fromAmount: Number(alloc.amountGranted) || 0,
          toAmount: amountGranted,
        });
        alloc.amountGranted = amountGranted;
        changed = true;
      }
    }

    meeting.totalAllocated = sumGrantedActiveAllocations(meeting);
    if (changed) {
      meeting.markModified('allocations');
    }
    await meeting.save();

    const populated = await populateMeeting(id);
    emitMeetingUpdate(populated);

    Logger.info(`Meeting allocations updated: ${id}`);
    return res.status(200).json(populated);
  } catch (err) {
    Logger.error(`Error updating allocations: ${err.message}`);
    return res.status(500).json({ code: "MTG011", message: err.message });
  }
};

export const completeMeeting = async (req, res) => {
  Logger.verbose('Inside completeMeeting');

  try {
    const { decoded } = req;

    if (!isPresidentOrAdmin(decoded)) {
      return res.status(403).json({ code: "MTG012", message: "Only the president or admin can complete meetings" });
    }

    const { id } = req.params;

    const meeting = await Meeting.findById(id);
    if (!meeting) {
      return res.status(404).json({ code: "MTG005", message: "Meeting not found" });
    }

    if (meeting.status === 'completed') {
      return res.status(400).json({ code: "MTG013", message: "Meeting is already completed" });
    }

    const unfundedSetAside = setAsideUnfundedActiveAllocations(meeting);
    meeting.totalAllocated = sumGrantedActiveAllocations(meeting);
    meeting.status = 'completed';
    meeting.completedBy = decoded.userID;
    meeting.completedAt = new Date();
    await meeting.save();

    const populated = await populateMeeting(id);
    emitMeetingUpdate(populated);

    Logger.info(
      `Meeting completed: ${id}${unfundedSetAside ? ` (${unfundedSetAside} unfunded set aside)` : ''}`
    );
    return res.status(200).json(populated);
  } catch (err) {
    Logger.error(`Error completing meeting: ${err.message}`);
    return res.status(500).json({ code: "MTG014", message: err.message });
  }
};

export const archiveMeeting = async (req, res) => {
  Logger.verbose('Inside archiveMeeting');

  try {
    const { decoded } = req;

    if (!isPresidentOrAdmin(decoded)) {
      return res.status(403).json({ code: "MTG016", message: "Only the president or admin can archive meetings" });
    }

    const { id } = req.params;
    const { archived } = req.body;

    const meeting = await Meeting.findById(id);
    if (!meeting) {
      return res.status(404).json({ code: "MTG005", message: "Meeting not found" });
    }

    meeting.archived = archived;
    await meeting.save();

    emitMeetingUpdate(await populateMeeting(id));

    Logger.info(`Meeting ${id} archived: ${archived}`);
    return res.status(200).json(meeting);
  } catch (err) {
    Logger.error(`Error archiving meeting: ${err.message}`);
    return res.status(500).json({ code: "MTG017", message: err.message });
  }
};

/**
 * Set an allocation aside (activeInMeeting = false). Proposal stays on the meeting.
 * Allowed during setup and in_progress.
 */
export const removeAllocation = async (req, res) => {
  Logger.verbose('Inside removeAllocation (set aside)');

  try {
    const { decoded } = req;

    if (!isPresidentOrAdmin(decoded)) {
      return res.status(403).json({ code: "MTG018", message: "Only the president or admin can update allocations" });
    }

    const { id, allocationId } = req.params;

    const meeting = await Meeting.findById(id);
    if (!meeting) {
      return res.status(404).json({ code: "MTG005", message: "Meeting not found" });
    }

    if (meeting.status !== 'setup' && meeting.status !== 'in_progress' && meeting.status !== 'completed') {
      return res.status(400).json({ code: "MTG019", message: "Proposals can only be set aside during setup, while the meeting is in progress, or when editing a completed meeting" });
    }

    const alloc = meeting.allocations.id(allocationId);
    if (!alloc) {
      return res.status(404).json({ code: "MTG021", message: "Allocation not found" });
    }

    const labelMap = await proposalLabelById(meeting);
    const ctx = allocationAuditContext(labelMap, alloc);
    const priorGrant = Number(alloc.amountGranted) || 0;
    logSetAside(meeting, decoded.userID, { ...ctx, fromAmount: priorGrant });

    alloc.activeInMeeting = false;
    alloc.amountGranted = 0;
    meeting.totalAllocated = sumGrantedActiveAllocations(meeting);
    await meeting.save();

    const updated = await populateMeeting(id);
    emitMeetingUpdate(updated);

    Logger.info(`Allocation ${allocationId} set aside on meeting ${id}`);
    return res.status(200).json(updated);
  } catch (err) {
    Logger.error(`Error setting allocation aside: ${err.message}`);
    return res.status(500).json({ code: "MTG020", message: err.message });
  }
};

/** Move an allocation back to the active deliberation list (or set aside if active: false). */
export const setAllocationActive = async (req, res) => {
  Logger.verbose('Inside setAllocationActive');

  try {
    const { decoded } = req;
    if (!isPresidentOrAdmin(decoded)) {
      return res.status(403).json({ code: "MTG039", message: "Only the president or admin can update allocations" });
    }

    const { id, allocationId } = req.params;
    const active = req.body?.active;
    if (typeof active !== 'boolean') {
      return res.status(400).json({ code: "MTG040", message: "Request body must include active: true or false" });
    }

    const meeting = await Meeting.findById(id);
    if (!meeting) {
      return res.status(404).json({ code: "MTG005", message: "Meeting not found" });
    }

    if (meeting.status !== 'setup' && meeting.status !== 'in_progress' && meeting.status !== 'completed') {
      return res.status(400).json({ code: "MTG041", message: "Active list can only be changed during setup, while the meeting is in progress, or when editing a completed meeting" });
    }

    const alloc = meeting.allocations.id(allocationId);
    if (!alloc) {
      return res.status(404).json({ code: "MTG021", message: "Allocation not found" });
    }

    const labelMap = await proposalLabelById(meeting);
    const ctx = allocationAuditContext(labelMap, alloc);
    const priorGrant = Number(alloc.amountGranted) || 0;
    const wasActive = allocationIsActive(alloc);

    alloc.activeInMeeting = active;
    if (!active) {
      logSetAside(meeting, decoded.userID, { ...ctx, fromAmount: priorGrant });
      alloc.amountGranted = 0;
    } else if (!wasActive && active) {
      logRestored(meeting, decoded.userID, ctx);
    }
    meeting.markModified('allocations');
    meeting.totalAllocated = sumGrantedActiveAllocations(meeting);
    await meeting.save();

    const updated = await populateMeeting(id);
    emitMeetingUpdate(updated);
    Logger.info(`Allocation ${allocationId} activeInMeeting=${active} on meeting ${id}`);
    return res.status(200).json(updated);
  } catch (err) {
    Logger.error(`Error setAllocationActive: ${err.message}`);
    return res.status(500).json({ code: "MTG042", message: err.message });
  }
};

/**
 * Ensure the meeting has an allocation row for every submitted, non-archived proposal
 * in the meeting year (same rules as createMeeting). Archived / composer proposals stay out.
 * Idempotent — only appends missing rows.
 */
export const syncEligibleProposalsToMeeting = async (req, res) => {
  Logger.verbose('Inside syncEligibleProposalsToMeeting');

  try {
    const { decoded } = req;
    if (!isPresidentOrAdmin(decoded)) {
      return res.status(403).json({ code: "MTG036", message: "Only the president or admin can sync proposals" });
    }

    const { id } = req.params;
    const meeting = await Meeting.findById(id);
    if (!meeting) {
      return res.status(404).json({ code: "MTG005", message: "Meeting not found" });
    }

    if (meeting.status !== 'setup' && meeting.status !== 'in_progress' && meeting.status !== 'completed') {
      return res.status(400).json({ code: "MTG037", message: "Invalid meeting status for sync" });
    }

    const startDate = new Date(`${meeting.year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${meeting.year}-12-31T23:59:59.999Z`);

    const eligible = await Proposal.find({
      createdAt: { $gte: startDate, $lte: endDate },
      $or: [{ archived: false }, { archived: { $exists: false } }],
      status: { $nin: COMPOSER_PROPOSAL_STATUSES }
    }).select('_id organization amountRequested');

    const existingIds = new Set(
      meeting.allocations.map(a => (a.proposal && a.proposal.toString()) || '').filter(Boolean)
    );

    let changed = false;
    for (const p of eligible) {
      const pid = p._id.toString();
      if (existingIds.has(pid)) continue;
      if (!p.organization) continue;

      meeting.allocations.push({
        proposal: p._id,
        organization: p.organization,
        amountRequested: p.amountRequested || 0,
        amountGranted: 0,
        activeInMeeting: true
      });
      existingIds.add(pid);
      changed = true;
    }

    if (changed) {
      if (meeting.status === 'completed') {
        meeting.totalAllocated = sumGrantedActiveAllocations(meeting);
      }
      await meeting.save();
    }

    const populated = await populateMeeting(id);
    if (changed) {
      emitMeetingUpdate(populated);
    }
    Logger.info(`Meeting ${id} proposal sync: ${changed ? 'updated' : 'no changes'}`);
    return res.status(200).json(populated);
  } catch (err) {
    Logger.error(`Error syncing eligible proposals: ${err.message}`);
    return res.status(500).json({ code: "MTG038", message: err.message });
  }
};

export const getFundedContacts = async (req, res) => {
  Logger.verbose('Inside getFundedContacts');

  try {
    const { id } = req.params;
    const meeting = await Meeting.findById(id)
      .select('_id meetingID year status totalBudget totalAllocated allocations')
      .populate({
        path: 'allocations.organization',
        select: 'name organizationID info',
        populate: { path: 'info', select: 'contactPerson contactPersonTitle contactPersonPhoneNumber email phone address city state zip website' }
      })
      .populate('allocations.proposal', 'organization');
    if (!meeting) {
      return res.status(404).json({ code: "MTG005", message: "Meeting not found" });
    }

    const fundedAllocations = meeting.allocations.filter(
      a => allocationIsActive(a) && (a.amountGranted || 0) > 0
    );
    const orgIds = [
      ...new Set(
        fundedAllocations
          .map(a => {
            if (a.organization?._id) return a.organization._id.toString();
            if (a.organization) return a.organization.toString();
            if (a.proposal?.organization) return a.proposal.organization.toString();
            return null;
          })
          .filter(Boolean)
      )
    ];

    const byOrgId = new Map();
    for (const a of fundedAllocations) {
      if (a.organization?._id) {
        byOrgId.set(a.organization._id.toString(), a.organization);
      }
    }

    const missingOrgIds = orgIds.filter(orgId => !byOrgId.has(orgId));
    if (missingOrgIds.length > 0) {
      const organizations = await Organization
        .find({ _id: { $in: missingOrgIds } })
        .select('name organizationID info')
        .populate('info', 'contactPerson contactPersonTitle contactPersonPhoneNumber email phone address city state zip website')
        .lean();

      organizations.forEach(org => {
        byOrgId.set(org._id.toString(), org);
      });
    }

    const contacts = orgIds.map(orgId => {
      const orgAllocations = fundedAllocations.filter(a => {
        const allocOrgId = a.organization?._id?.toString() || a.organization?.toString() || a.proposal?.organization?.toString();
        return allocOrgId === orgId;
      });
      const totalGranted = orgAllocations.reduce((sum, a) => sum + (a.amountGranted || 0), 0);
      const totalRequested = orgAllocations.reduce((sum, a) => sum + (a.amountRequested || 0), 0);
      const org = byOrgId.get(orgId);
      const info = org?.info || {};

      return {
        organizationId: org?.organizationID || null,
        organizationName: org?.name || 'Unknown Organization',
        totals: {
          requested: totalRequested,
          granted: totalGranted,
          proposalCount: orgAllocations.length
        },
        contact: {
          contactPerson: info.contactPerson || null,
          contactPersonTitle: info.contactPersonTitle || null,
          email: info.email || null,
          phone: info.phone || info.contactPersonPhoneNumber || null,
          address: info.address || null,
          city: info.city || null,
          state: info.state || null,
          zip: info.zip || null,
          website: info.website || null
        }
      };
    }).sort((a, b) => (b.totals.granted || 0) - (a.totals.granted || 0));

    return res.status(200).json({
      meeting: {
        _id: meeting._id,
        meetingID: meeting.meetingID,
        year: meeting.year,
        status: meeting.status,
        totalBudget: meeting.totalBudget,
        totalAllocated: meeting.totalAllocated || fundedAllocations.reduce((sum, a) => sum + (a.amountGranted || 0), 0)
      },
      contacts
    });
  } catch (err) {
    Logger.error(`Error getting funded contacts: ${err.message}`);
    return res.status(500).json({ code: "MTG032", message: err.message });
  }
};

export const getMeetingSummary = async (req, res) => {
  Logger.verbose('Inside getMeetingSummary');

  try {
    const { id } = req.params;

    const meeting = await populateMeeting(id);

    if (!meeting) {
      return res.status(404).json({ code: "MTG005", message: "Meeting not found" });
    }

    const activeAllocs = meeting.allocations.filter(allocationIsActive);
    const setAsideAllocs = meeting.allocations.filter(a => !allocationIsActive(a));

    const totalAllocated = activeAllocs.reduce((sum, a) => sum + (a.amountGranted || 0), 0);
    const totalRequested = activeAllocs.reduce((sum, a) => sum + (a.amountRequested || 0), 0);
    const funded = activeAllocs.filter(a => a.amountGranted > 0);
    const unfunded = activeAllocs.filter(a => !a.amountGranted || a.amountGranted === 0);

    const summary = {
      meeting: {
        _id: meeting._id,
        meetingID: meeting.meetingID,
        year: meeting.year,
        status: meeting.status,
        totalBudget: meeting.totalBudget,
        notes: meeting.notes,
        startedBy: meeting.startedBy,
        completedBy: meeting.completedBy,
        completedAt: meeting.completedAt,
        createdAt: meeting.createdAt
      },
      totals: {
        budget: meeting.totalBudget,
        allocated: totalAllocated,
        remaining: meeting.totalBudget - totalAllocated,
        requested: totalRequested,
        proposalCount: activeAllocs.length,
        setAsideCount: setAsideAllocs.length,
        fundedCount: funded.length,
        unfundedCount: unfunded.length
      },
      funded: funded.map(a => ({
        _id: a._id,
        proposal: a.proposal,
        organization: a.organization,
        amountRequested: a.amountRequested,
        amountGranted: a.amountGranted
      })),
      unfunded: unfunded.map(a => ({
        _id: a._id,
        proposal: a.proposal,
        organization: a.organization,
        amountRequested: a.amountRequested,
        amountGranted: a.amountGranted
      })),
      setAside: setAsideAllocs.map(a => ({
        _id: a._id,
        proposal: a.proposal,
        organization: a.organization,
        amountRequested: a.amountRequested,
        amountGranted: a.amountGranted
      }))
    };

    return res.status(200).json(summary);
  } catch (err) {
    Logger.error(`Error getting meeting summary: ${err.message}`);
    return res.status(500).json({ code: "MTG015", message: err.message });
  }
};
