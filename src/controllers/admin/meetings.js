import { validationResult } from "express-validator";

import Meeting from "../../models/meeting.js";
import { Proposal } from "../../models/index.js";
import Logger from "../../utils/logger.js";
import { generateCode } from "../../utils/util.js";

const ACCESS_LEVEL_PRESIDENT = 3;

function isPresidentOrAdmin(decoded) {
  return decoded.accessLevel >= ACCESS_LEVEL_PRESIDENT;
}

const MEETING_POPULATE = [
  { path: 'submissionYear' },
  { path: 'startedBy', select: 'firstName lastName email' },
  { path: 'completedBy', select: 'firstName lastName email' },
  {
    path: 'allocations.proposal',
    select: 'projectTitle proposalID amountRequested totalProjectCost score votes sponsor',
  },
  { path: 'allocations.organization', select: 'name organizationID' }
];

async function populateMeeting(meetingId) {
  const meeting = await Meeting.findById(meetingId).populate(MEETING_POPULATE);
  if (meeting) {
    const proposals = meeting.allocations
      .map(a => a.proposal)
      .filter(Boolean);
    await Proposal.populate(proposals, { path: 'sponsor', select: 'firstName lastName email' });
  }
  return meeting;
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

    // Load all non-archived proposals for this year
    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

    const proposals = await Proposal.find({
      createdAt: { $gte: startDate, $lte: endDate },
      $or: [{ archived: false }, { archived: { $exists: false } }]
    }).populate('organization', 'name organizationID');

    const allocations = proposals.map(p => ({
      proposal: p._id,
      organization: p.organization?._id,
      amountRequested: p.amountRequested || 0,
      amountGranted: 0
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

    if (meeting.status === 'completed') {
      return res.status(400).json({ code: "MTG008", message: "Cannot update a completed meeting" });
    }

    if (totalBudget !== undefined) meeting.totalBudget = totalBudget;
    if (notes !== undefined) meeting.notes = notes;

    if (status && status !== meeting.status) {
      if (status === 'in_progress' && meeting.status === 'setup') {
        meeting.originalBudget = meeting.totalBudget;
        meeting.status = 'in_progress';
      } else if (status === 'setup' && meeting.status === 'in_progress') {
        meeting.status = 'setup';
      }
    }

    await meeting.save();

    const populated = await populateMeeting(id);

    Logger.info(`Meeting updated: ${id}`);
    return res.status(200).json(populated);
  } catch (err) {
    Logger.error(`Error updating meeting: ${err.message}`);
    return res.status(500).json({ code: "MTG009", message: err.message });
  }
};

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

    if (meeting.status === 'completed') {
      return res.status(400).json({ code: "MTG008", message: "Cannot update a completed meeting" });
    }

    // Update each allocation's amountGranted
    for (const update of allocations) {
      const alloc = meeting.allocations.id(update._id);
      if (alloc && update.amountGranted !== undefined) {
        alloc.amountGranted = update.amountGranted;
      }
    }

    await meeting.save();

    const populated = await populateMeeting(id);

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

    meeting.totalAllocated = meeting.allocations.reduce((sum, a) => sum + (a.amountGranted || 0), 0);
    meeting.status = 'completed';
    meeting.completedBy = decoded.userID;
    meeting.completedAt = new Date();
    await meeting.save();

    const populated = await populateMeeting(id);

    Logger.info(`Meeting completed: ${id}`);
    return res.status(200).json(populated);
  } catch (err) {
    Logger.error(`Error completing meeting: ${err.message}`);
    return res.status(500).json({ code: "MTG014", message: err.message });
  }
};

export const reopenMeeting = async (req, res) => {
  Logger.verbose('Inside reopenMeeting');

  try {
    const { decoded } = req;

    if (!isPresidentOrAdmin(decoded)) {
      return res.status(403).json({ code: "MTG021", message: "Only the president or admin can reopen meetings" });
    }

    const { id } = req.params;

    const meeting = await Meeting.findById(id);
    if (!meeting) {
      return res.status(404).json({ code: "MTG005", message: "Meeting not found" });
    }

    if (meeting.status !== 'completed') {
      return res.status(400).json({ code: "MTG022", message: "Only completed meetings can be reopened" });
    }

    meeting.status = 'in_progress';
    meeting.completedBy = undefined;
    meeting.completedAt = undefined;
    meeting.totalAllocated = 0;
    await meeting.save();

    const populated = await populateMeeting(id);

    Logger.info(`Meeting reopened: ${id}`);
    return res.status(200).json(populated);
  } catch (err) {
    Logger.error(`Error reopening meeting: ${err.message}`);
    return res.status(500).json({ code: "MTG023", message: err.message });
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

    Logger.info(`Meeting ${id} archived: ${archived}`);
    return res.status(200).json(meeting);
  } catch (err) {
    Logger.error(`Error archiving meeting: ${err.message}`);
    return res.status(500).json({ code: "MTG017", message: err.message });
  }
};

export const removeAllocation = async (req, res) => {
  Logger.verbose('Inside removeAllocation');

  try {
    const { decoded } = req;

    if (!isPresidentOrAdmin(decoded)) {
      return res.status(403).json({ code: "MTG018", message: "Only the president or admin can remove allocations" });
    }

    const { id, allocationId } = req.params;

    const meeting = await Meeting.findById(id);
    if (!meeting) {
      return res.status(404).json({ code: "MTG005", message: "Meeting not found" });
    }

    if (meeting.status !== 'setup') {
      return res.status(400).json({ code: "MTG019", message: "Allocations can only be removed during setup" });
    }

    meeting.allocations = meeting.allocations.filter(
      a => a._id.toString() !== allocationId
    );
    await meeting.save();

    const updated = await populateMeeting(id);

    Logger.info(`Allocation ${allocationId} removed from meeting ${id}`);
    return res.status(200).json(updated);
  } catch (err) {
    Logger.error(`Error removing allocation: ${err.message}`);
    return res.status(500).json({ code: "MTG020", message: err.message });
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

    const totalAllocated = meeting.allocations.reduce((sum, a) => sum + (a.amountGranted || 0), 0);
    const totalRequested = meeting.allocations.reduce((sum, a) => sum + (a.amountRequested || 0), 0);
    const funded = meeting.allocations.filter(a => a.amountGranted > 0);
    const unfunded = meeting.allocations.filter(a => !a.amountGranted || a.amountGranted === 0);

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
        proposalCount: meeting.allocations.length,
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
      }))
    };

    return res.status(200).json(summary);
  } catch (err) {
    Logger.error(`Error getting meeting summary: ${err.message}`);
    return res.status(500).json({ code: "MTG015", message: err.message });
  }
};
