import { validationResult } from "express-validator";
import mongoose from "mongoose";

import { Organization, OrganizationMembership, Proposal, ReferralCode, User } from "../../models/index.js";
import { generateCode } from "../../utils/util.js";
import Logger from "../../utils/logger.js";
import { sendEmailWithTemplate } from "../email/email.js";
import { submittedProposal } from "../../views/proposal.js";
import { dedupePopulatedUserOrganizations } from "../../utils/dedupe-user-organizations-response.js";
import {
  COMPOSER_PROPOSAL_STATUSES,
  syncComposerProposalStatus,
} from "../../utils/proposal-composer-status.js";

/**
 * Org Mongo ids the user may act within: embedded `User.organizations` plus
 * `OrganizationMembership` (canonical) so access matches the org profile UI.
 *
 * @param {import('mongoose').Document} user
 * @returns {Promise<string[]>}
 */
async function mongoOrganizationIdsForUser(user) {
  await dedupePopulatedUserOrganizations(user, { persist: true });
  const ids = new Set();
  for (const entry of user.organizations || []) {
    const id = entry?._id ?? entry;
    if (id != null && String(id) !== "undefined") {
      ids.add(String(id));
    }
  }
  const memberships = await OrganizationMembership.find({ user: user._id })
    .select("organization")
    .lean();
  for (const row of memberships) {
    if (row.organization != null) {
      ids.add(String(row.organization));
    }
  }
  return [...ids];
}

/**
 * Shared filter for director/org proposal lists (year window + archived + org + title).
 * @param {{ year: string|number, org?: string, filter?: string, showArchived?: string, viewerUserId?: string }} args
 * When `org` is set: everyone sees `submitted`; the signed-in viewer also sees their own composer drafts (`createdBy`).
 */
function buildProposalListQuery({ year, org, filter, showArchived, viewerUserId }) {
  const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
  const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

  const andParts = [
    { createdAt: { $gte: startDate, $lte: endDate } },
  ];

  if (org) {
    andParts.push({ organization: org });
  }

  if (showArchived === 'only') {
    andParts.push({ archived: true });
  } else if (showArchived !== 'true') {
    andParts.push({
      $or: [{ archived: false }, { archived: { $exists: false } }],
    });
  }

  if (org) {
    if (viewerUserId && mongoose.isValidObjectId(String(viewerUserId))) {
      const uid = new mongoose.Types.ObjectId(String(viewerUserId));
      andParts.push({
        $or: [
          { status: 'submitted' },
          { status: { $in: COMPOSER_PROPOSAL_STATUSES }, createdBy: uid },
        ],
      });
    } else {
      andParts.push({ status: 'submitted' });
    }
  } else {
    andParts.push({ status: { $nin: COMPOSER_PROPOSAL_STATUSES } });
  }

  if (filter && String(filter).length !== 0) {
    andParts.push({ projectTitle: { $regex: String(filter).toLowerCase(), $options: 'i' } });
  }

  if (andParts.length === 1) {
    return andParts[0];
  }
  return { $and: andParts };
}

/** Sort fields that exist on Proposal (indexed query path). */
function getMongoSortForProposalList(sort, dir, { org } = {}) {
  const d = dir === 'asc' ? 1 : -1;
  let secondary;
  switch (sort) {
    case 'projectTitle':
      secondary = { projectTitle: d };
      break;
    case 'amountRequested':
      secondary = { amountRequested: d };
      break;
    case 'totalProjectCost':
      secondary = { totalProjectCost: d };
      break;
    case 'score':
      secondary = { score: d };
      break;
    case 'createdOn':
    default:
      secondary = { createdAt: d };
      break;
  }
  // Org lists: viewer composer drafts first, then submitted — each group by chosen column.
  if (org) {
    return { status: 1, ...secondary };
  }
  return secondary;
}

function composerSortRank(status) {
  return COMPOSER_PROPOSAL_STATUSES.includes(status) ? 0 : 1;
}

function compareProposalsForList(a, b, sort, dir, { org } = {}) {
  if (org) {
    const rankDiff = composerSortRank(a.status) - composerSortRank(b.status);
    if (rankDiff !== 0) {
      return rankDiff;
    }
  }

  const d = dir === 'asc' ? 1 : -1;
  switch (sort) {
    case 'organization': {
      const an = a.organization?.name ?? '';
      const bn = b.organization?.name ?? '';
      return d * an.localeCompare(bn);
    }
    case 'sponsor': {
      const aSponsor = a.sponsor != null ? 1 : 0;
      const bSponsor = b.sponsor != null ? 1 : 0;
      return d * (aSponsor - bSponsor);
    }
    case 'votes':
      return d * ((a?.votes?.length ?? 0) - (b?.votes?.length ?? 0));
    case 'projectTitle': {
      const an = a.projectTitle ?? '';
      const bn = b.projectTitle ?? '';
      return d * an.localeCompare(bn);
    }
    case 'amountRequested':
      return d * ((a.amountRequested ?? 0) - (b.amountRequested ?? 0));
    case 'totalProjectCost':
      return d * ((a.totalProjectCost ?? 0) - (b.totalProjectCost ?? 0));
    case 'score':
      return d * ((a.score ?? 0) - (b.score ?? 0));
    case 'createdOn':
    default:
      return d * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
}

function usesInMemoryProposalSort(sort) {
  return sort === 'organization' || sort === 'sponsor' || sort === 'votes';
}

/** Organization Mongo `_id` whether `organization` is populated or an ObjectId ref. */
function proposalOrgMongoId(proposal) {
  const o = proposal?.organization;
  if (o == null) {
    return '';
  }
  if (typeof o === 'object' && o !== null && '_id' in o) {
    return String(o._id);
  }
  return String(o);
}

/**
 * Who may call PUT /proposal/:id
 * - Composer (`draft` / `ready_to_submit`): the creator (`createdBy`); if `createdBy` is missing, any member of the proposal’s organization (legacy rows); or any foundation director (`accessLevel` > 1) helping an organization finish/submit its proposal.
 * - Submitted: members of the proposal’s organization (collaborative edits on the proposal page) or any foundation director (`accessLevel` > 1).
 */
async function canUserUpdateProposal(decoded, before) {
  if (!decoded?.userID) {
    return { ok: false, status: 401, message: 'Unauthorized' };
  }
  const uid = String(decoded.userID);
  const access = Number(decoded.accessLevel) || 0;
  const isDirector = access > 1;

  const user = await User.findOne({ _id: decoded.userID }).populate('organizations');
  if (!user) {
    return { ok: false, status: 403, message: 'Forbidden' };
  }
  await dedupePopulatedUserOrganizations(user, { persist: true });
  const orgIds = user.organizations.map((org) => String(org._id));
  const inProposalOrg = orgIds.includes(proposalOrgMongoId(before));

  if (COMPOSER_PROPOSAL_STATUSES.includes(before.status)) {
    const creator = before.createdBy != null ? String(before.createdBy) : null;
    if (creator && creator === uid) {
      return { ok: true };
    }
    if (!creator && inProposalOrg) {
      return { ok: true };
    }
    // Director and up (accessLevel > 1: director, president, admin) can edit and submit composer
    // drafts on behalf of an organization (e.g. helping an applicant finish their proposal). This
    // mirrors the access these roles already have to GET any proposal and edit submitted ones below.
    if (isDirector) {
      return { ok: true };
    }
    return {
      ok: false,
      status: 403,
      message: 'You can only edit your own draft proposals.',
    };
  }

  if (isDirector || inProposalOrg) {
    return { ok: true };
  }

  return { ok: false, status: 403, message: 'Forbidden' };
}

/**
 * Who may GET /proposal/:id (Mongo `_id`).
 * Directors; otherwise members of the proposal’s organization (submitted or composer drafts).
 */
async function canUserGetProposal(decoded, proposal) {
  if (!decoded?.userID) {
    return { ok: false, status: 401, message: 'Unauthorized' };
  }
  const access = Number(decoded.accessLevel) || 0;
  if (access > 1) {
    return { ok: true };
  }

  const user = await User.findOne({ _id: decoded.userID }).populate('organizations');
  if (!user) {
    return { ok: false, status: 403, message: 'Forbidden' };
  }
  await dedupePopulatedUserOrganizations(user, { persist: true });
  const orgIds = user.organizations.map((org) => String(org._id));
  const proposalOrgId = proposalOrgMongoId(proposal);
  if (proposalOrgId && orgIds.includes(proposalOrgId)) {
    return { ok: true };
  }
  return { ok: false, status: 403, message: 'Forbidden' };
}

async function applyReferralCodeIfPresent(proposal, effectiveReferralCode) {
  if (!effectiveReferralCode) {
    return { applied: false };
  }
  const refCode = await findActiveReferralCode(effectiveReferralCode);
  if (!refCode) {
    return { applied: false, invalid: true };
  }
  proposal.sponsor = refCode.director._id ?? refCode.director;
  Logger.info(`Proposal auto-sponsored by director ${refCode.director} via referral code ${effectiveReferralCode}`);
  return { applied: true, refCode };
}

async function findActiveReferralCode(code) {
  const trimmed = String(code || '').trim();
  if (!trimmed) {
    return null;
  }
  let refCode = await ReferralCode.findOne({ code: trimmed, active: true })
    .populate('director', 'email firstName lastName');
  if (refCode) {
    return refCode;
  }
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return ReferralCode.findOne({
    code: new RegExp(`^${escaped}$`, 'i'),
    active: true,
  }).populate('director', 'email firstName lastName');
}

async function resolveUserReferralFallback(decoded, referralCode) {
  let effectiveReferralCode = referralCode;
  if (!effectiveReferralCode) {
    const user = await User.findOne({ _id: decoded.userID });
    if (user?.referralCode) {
      effectiveReferralCode = user.referralCode;
      Logger.info(`Using stored referral code ${effectiveReferralCode} from user ${decoded.userID}`);
    }
  }
  return effectiveReferralCode;
}

async function sendProposalSubmissionEmail(decoded, proposal) {
  const userID = decoded.userID;
  const user = await User.findOne({ _id: userID });
  const data = {
    email: user.email,
    projectTitle: proposal.projectTitle,
  };
  const to = user.email;
  const subject = 'Thank You For Creating A Proposal';
  await sendEmailWithTemplate(to, subject, submittedProposal, data);
  Logger.info(`Proposal submission email sent successfully to ${to}`);
}

/** Composer client expects populated `organization` (name, organizationID) for headers. */
async function proposalDocForComposerResponse(proposalMongoId) {
  return Proposal.findById(proposalMongoId).populate(
    'organization',
    'name organizationID description',
  );
}

export const createProposal = async (req, res) => {
  Logger.info(`creating proposal`);

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    Logger.error(`We have Errors: ${errors.array()}`)
    return res.status(422).json({ error: errors.array() });
  }

  try {
    const { decoded, body } = req;
    const { proposal, orgID, referralCode } = body;

    const organization = await Organization.findOne({ _id: orgID });
    if (!organization) {
      Logger.error(`Error creating proposal for organization ${orgID}`);
      return res.status(500).send({ code: "PROP001", message: `Error creating proposal for organization ${orgID}` });
    }

    const isDraft = body.status === 'draft' || proposal.status === 'draft';

    if (isDraft) {
      const existingDraft = await Proposal.findOne({
        organization: orgID,
        status: { $in: COMPOSER_PROPOSAL_STATUSES },
        createdBy: decoded.userID,
      });
      if (existingDraft) {
        Logger.info(`Reusing existing composer proposal ${existingDraft._id} for org ${orgID}`);
        await syncComposerProposalStatus(existingDraft);
        return res.status(200).send(await proposalDocForComposerResponse(existingDraft._id));
      }
    }

    let newID = generateCode();
    proposal.proposalID = newID;
    proposal.organization = orgID;
    proposal.status = isDraft ? 'draft' : 'submitted';
    proposal.createdBy = decoded.userID;

    if (!isDraft) {
      const effectiveReferralCode = await resolveUserReferralFallback(decoded, referralCode);
      await applyReferralCodeIfPresent(proposal, effectiveReferralCode);
    }

    const newProposal = await Proposal.create(proposal);
    if (!newProposal) {
      Logger.error('Error creating proposal');
      return res.status(500).send({ code: "PROP001", message: 'Error creating proposal' });
    }

    organization.proposals.push(newProposal._id);
    await organization.save();

    if (!isDraft) {
      try {
        await sendProposalSubmissionEmail(decoded, newProposal);
      } catch (emailError) {
        Logger.error(`Failed to send proposal submission email:`, emailError);
      }
    } else {
      Logger.info(`Draft proposal ${newProposal._id} created (no submission email)`);
      const draftDoc = await Proposal.findById(newProposal._id);
      if (draftDoc) {
        await syncComposerProposalStatus(draftDoc);
      }
    }

    return res.status(200).send(await proposalDocForComposerResponse(newProposal._id));
  }
  catch (e) {
    console.log('e', e);
    Logger.error('Error creating proposal');
    return res.status(500).send({ code: "PROP001", message: e.message });
  }
};

export const updateProposal = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    Logger.error(`We have Errors: ${errors.array()}`)
    return res.status(422).json({ error: errors.array() });
  }
  const { id } = req.params;
  const updatePayload = req.body;
  const { decoded } = req;

  const referralCodeInput =
    typeof updatePayload.referralCode === 'string' ? updatePayload.referralCode.trim() : '';
  const clearSponsor = updatePayload.clearSponsor === true;
  const updateFields = { ...updatePayload };
  delete updateFields.referralCode;
  delete updateFields.clearSponsor;

  try {
    const before = await Proposal.findOne({ _id: id });
    if (!before) {
      return res.status(404).json({ message: 'Proposal not found' });
    }

    const authz = await canUserUpdateProposal(decoded, before);
    if (!authz.ok) {
      return res.status(authz.status).json({ message: authz.message });
    }

    if (clearSponsor && referralCodeInput) {
      return res.status(400).json({ message: 'Cannot add and remove a sponsor in the same request' });
    }

    const wasDraftLike = before.status === 'draft' || before.status === 'ready_to_submit';

    const updatedFieldKeys = Object.keys(updateFields);
    let updatedProposal = null;

    if (updatedFieldKeys.length === 1) {
      const proposal = await Proposal.findOne({ _id: id });
      const key = updatedFieldKeys[0];
      if (key === 'status' && updateFields[key] === 'draft') {
        // Composer status is derived server-side; ignore client autosave `draft`
      } else {
        proposal[key] = updateFields[key];
      }
      await proposal.save();
      updatedProposal = proposal;
    } else if (updatedFieldKeys.length > 1) {
      const updateClean = { ...updateFields };
      if (updateClean.status === 'draft') {
        delete updateClean.status;
      }
      await Proposal.updateOne(
        { _id: id },
        { $set: updateClean },
      );
      updatedProposal = await Proposal.findOne({ _id: id });
    } else {
      updatedProposal = await Proposal.findOne({ _id: id });
    }

    let final = await Proposal.findOne({ _id: id });
    if (final && final.status !== 'submitted') {
      await syncComposerProposalStatus(final);
      final = await Proposal.findOne({ _id: id });
      updatedProposal = final;
    }

    if (wasDraftLike && final?.status === 'submitted') {
      const effectiveReferralCode = await resolveUserReferralFallback(decoded, referralCodeInput || updatePayload.referralCode);
      let docForEmail = final;
      if (effectiveReferralCode && !final.sponsor) {
        const result = await applyReferralCodeIfPresent(final, effectiveReferralCode);
        if (result.invalid) {
          return res.status(404).json({ message: 'Invalid or expired referral code' });
        }
        if (result.applied) {
          await final.save();
          docForEmail = await Proposal.findOne({ _id: id });
          updatedProposal = docForEmail;
        }
      }
      try {
        await sendProposalSubmissionEmail(decoded, docForEmail);
      } catch (emailError) {
        Logger.error(`Failed to send proposal submission email after draft submit:`, emailError);
      }
    } else if (referralCodeInput && final?.status === 'submitted') {
      if (final.sponsor) {
        return res.status(409).json({ message: 'This proposal already has a sponsor' });
      }
      const refCode = await findActiveReferralCode(referralCodeInput);
      if (!refCode) {
        return res.status(404).json({ message: 'Invalid or expired referral code' });
      }
      final.sponsor = refCode.director._id ?? refCode.director;
      await final.save();
      await User.updateOne({ _id: decoded.userID }, { referralCode: refCode.code });
      final = await Proposal.findOne({ _id: id })
        .populate('organization')
        .populate('sponsor', 'email firstName lastName');
      updatedProposal = final;
      Logger.info(`Proposal ${id} sponsored via referral code ${refCode.code}`);
    } else if (clearSponsor) {
      if (!final?.sponsor) {
        return res.status(400).json({ message: 'This proposal does not have a sponsor' });
      }
      final.sponsor = undefined;
      await final.save();
      await User.updateOne({ _id: decoded.userID }, { $unset: { referralCode: 1 } });
      final = await Proposal.findOne({ _id: id })
        .populate('organization')
        .populate('sponsor', 'email firstName lastName');
      updatedProposal = final;
      Logger.info(`Proposal ${id} sponsor removed by user ${decoded.userID}`);
    }

    const responseProposal = updatedProposal ?? final;
    const populatedProposal = responseProposal
      ? await Proposal.findOne({ _id: responseProposal._id ?? id })
        .populate('organization')
        .populate('sponsor', 'email firstName lastName')
      : null;

    return res.status(200).json({
      message: "Proposal Updated",
      proposal: populatedProposal ?? responseProposal,
    });

  }
  catch (e) {
    Logger.error(`Error updating proposal ${id}`);
    return res.status(500).json(e.message);
  }

}

export const getProposal = async (req, res) => {

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    Logger.error(`We have Errors: ${errors.array()}`)
    return res.status(422).json({ error: errors.array() });
  }

  const { id } = req.params;

  if (!mongoose.isValidObjectId(String(id))) {
    return res.status(404).json({ message: 'Proposal not found' });
  }

  try {

    const proposal = await Proposal.findOne({ _id: id })
      .populate('organization')
      .populate('sponsor');

    if (!proposal) {
      Logger.warn(`getProposal: not found id=${id}`);
      return res.status(404).json({ message: 'Proposal not found' });
    }

    const gate = await canUserGetProposal(req.decoded, proposal);
    if (!gate.ok) {
      return res.status(gate.status).json({ message: gate.message });
    }

    Logger.info(
      `getProposal ok id=${proposal._id} proposalID=${proposal.proposalID} title=${String(proposal.projectTitle || '').slice(0, 80)}`
    );
    return res.status(200).json(proposal);

  }
  catch (e) {
    Logger.error(`Error getting proposal ${id}: ${e.message}`);
    return res.status(500).json(e.message);
  }

}

//get proposals - plural
export const getProposals = async (req, res) => {
  Logger.info('Inside getProposals');
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    Logger.error(`We have Errors: ${errors.array()}`)
    return res.status(422).json({ error: errors.array() });
  }

  if (req.query.proposalID || req.query.id) {

    const query = req.query.id ? { _id: req.query.id } : { proposalID: req.query.proposalID }
    //single get proposal
    const proposal = await Proposal.findOne(query)
      .populate('organization')
      .populate('votes')
      .populate('sponsor')

    console.log('returning proposal', proposal);
    return res.status(200).json(proposal);

  } else {

    let {
      year,
      org,
      limit,
      skip,
      filter,
      sort,
      dir,
      showArchived,
      includeTotal,
    } = req.query;

    try {
      const query = buildProposalListQuery({
        year,
        org,
        filter,
        showArchived,
        viewerUserId: req.decoded?.userID,
      });

      const wantTotal =
        includeTotal === '1' || includeTotal === 'true' || includeTotal === true;

      let total = 0;
      if (wantTotal) {
        total = await Proposal.countDocuments(query);
      }

      const skipNum = Math.max(parseInt(String(skip ?? '0'), 10) || 0, 0);
      const limitNum = Math.min(Math.max(parseInt(String(limit ?? '10'), 10) || 10, 1), 500);

      const effectiveSort = sort || 'createdOn';

      const populateProps = (q) =>
        q.populate('organization').populate('votes').populate('sponsor');

      let props;

      if (usesInMemoryProposalSort(effectiveSort)) {
        let proposals = await populateProps(Proposal.find(query));
        proposals.sort((a, b) =>
          compareProposalsForList(a, b, effectiveSort, dir, { org: !!org })
        );
        props = proposals.slice(skipNum, skipNum + limitNum);
      } else {
        props = await populateProps(
          Proposal.find(query)
            .sort(getMongoSortForProposalList(effectiveSort, dir, { org: !!org }))
            .skip(skipNum)
            .limit(limitNum)
        );
      }

      if (wantTotal) {
        return res.status(200).json({ items: props, total });
      }
      return res.status(200).json(props);

    } catch (e) {
      console.log('e', e);
      Logger.error('Error retrieving proposals');
      return res.status(400).send({ code: "PROP003", message: e.message });
    }
  }
}

export const countProposals = async (req, res) => {
  try {
    const { year, org, filter, showArchived } = req.query;
    const query = buildProposalListQuery({
      year,
      org,
      filter,
      showArchived,
      viewerUserId: req.decoded?.userID,
    });
    const count = await Proposal.countDocuments(query);
    return res.status(200).json(count);
  }
  catch (err) {
    Logger.error(`Error Retrieving Proposal Count: ${err}`);
    return res.status(400).send({ code: "PROP002", message: err.message });
  }
}

// GET /proposal/my-proposals?year=2026
// Returns all proposals for the current user's organizations for the given year
export const getMyProposals = async (req, res) => {
  Logger.info('Inside getMyProposals');

  try {
    const { decoded } = req;
    const { year } = req.query;

    if (!year) {
      return res.status(400).json({ message: 'year query parameter is required' });
    }

    // Get user with their organizations
    const user = await User.findOne({ _id: decoded.userID }).populate('organizations');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await dedupePopulatedUserOrganizations(user, { persist: true });

    Logger.info(`getMyProposals - user ${user.email} has ${user.organizations.length} org(s)`);

    // Get org IDs
    const orgIds = user.organizations.map(org => org._id);

    if (orgIds.length === 0) {
      return res.status(200).json([]);
    }

    // Query proposals directly
    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

    const submittedQuery = {
      organization: { $in: orgIds },
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $nin: COMPOSER_PROPOSAL_STATUSES },
    };
    const draftQuery = {
      organization: { $in: orgIds },
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $in: COMPOSER_PROPOSAL_STATUSES },
    };

    const proposals = await Proposal.find({ $or: [submittedQuery, draftQuery] })
      .populate('organization', 'name organizationID')
      .populate('sponsor', 'email firstName lastName')
      .sort({ updatedAt: -1 });

    Logger.info(`getMyProposals - found ${proposals.length} proposal(s) for year ${year}`);

    return res.status(200).json(proposals);
  } catch (e) {
    Logger.error(`Error getting my proposals: ${e.message}`);
    return res.status(500).json({ message: 'Error getting proposals' });
  }
};

// GET /proposal/my-drafts?organization=<mongoObjectId> (optional)
export const getMyDrafts = async (req, res) => {
  Logger.info('Inside getMyDrafts');

  try {
    const { decoded } = req;
    const { organization } = req.query;

    const user = await User.findOne({ _id: decoded.userID }).populate('organizations');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const orgIdStrs = await mongoOrganizationIdsForUser(user);
    const access = Number(decoded.accessLevel) || 0;
    const isDirector = access > 1;

    if (orgIdStrs.length === 0 && !isDirector) {
      return res.status(200).json([]);
    }

    const q = { status: { $in: COMPOSER_PROPOSAL_STATUSES } };

    if (organization) {
      const allowed =
        isDirector || orgIdStrs.some((oid) => String(oid) === String(organization));
      if (!allowed) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      q.organization = organization;
    } else {
      if (orgIdStrs.length === 0) {
        return res.status(200).json([]);
      }
      q.organization = { $in: orgIdStrs };
    }

    const drafts = await Proposal.find(q)
      .populate('organization', 'name organizationID')
      .sort({ updatedAt: -1 });

    Logger.info(`getMyDrafts - found ${drafts.length} draft(s)`);

    return res.status(200).json(drafts);
  } catch (e) {
    Logger.error(`Error getting my drafts: ${e.message}`);
    return res.status(500).json({ message: 'Error getting drafts' });
  }
};

/**
 * GET /proposal/my-proposals-exists
 * Single check: any proposal (any year, draft or submitted) for the user's organizations.
 * Used by the app for nav + route guard instead of many my-proposals?year= calls.
 */
export const getMyProposalsExists = async (req, res) => {
  Logger.info('Inside getMyProposalsExists');

  try {
    const { decoded } = req;
    const user = await User.findOne({ _id: decoded.userID }).populate('organizations');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await dedupePopulatedUserOrganizations(user, { persist: true });

    const orgIds = user.organizations.map((org) => org._id);

    if (orgIds.length === 0) {
      return res.status(200).json({ hasAny: false });
    }

    const exists = await Proposal.exists({ organization: { $in: orgIds } });

    return res.status(200).json({ hasAny: !!exists });
  } catch (e) {
    Logger.error(`Error getMyProposalsExists: ${e.message}`);
    return res.status(500).json({ message: 'Error checking proposals' });
  }
};

/**
 * DELETE /proposal/:id — applicant org member may delete composer proposals only (draft / ready_to_submit).
 */
export const deleteMyProposal = async (req, res) => {
  const { id } = req.params;
  const { decoded } = req;

  try {
    if (!id) {
      return res.status(400).json({ message: 'Proposal id is required' });
    }

    const proposal = await Proposal.findById(id).select('organization status');
    if (!proposal) {
      return res.status(404).json({ message: 'Proposal not found' });
    }

    if (!COMPOSER_PROPOSAL_STATUSES.includes(proposal.status)) {
      return res.status(403).json({
        message: 'Only in-progress proposals can be deleted. Contact support if you need to change a submitted proposal.',
      });
    }

    const user = await User.findOne({ _id: decoded.userID }).populate('organizations');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await dedupePopulatedUserOrganizations(user, { persist: true });
    const orgIds = user.organizations.map((org) => String(org._id));
    const proposalOrgId = String(proposal.organization);
    if (!orgIds.includes(proposalOrgId)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await Organization.updateOne(
      { _id: proposal.organization },
      { $pull: { proposals: proposal._id } },
    );
    await Proposal.deleteOne({ _id: id });

    Logger.info(`deleteMyProposal: user ${decoded.userID} deleted composer proposal ${id}`);
    return res.status(204).send();
  } catch (e) {
    Logger.error(`deleteMyProposal: ${e.message}`);
    return res.status(500).json({ message: 'Error deleting proposal' });
  }
};

export const archiveProposal = async (req, res) => {
  Logger.info('Inside archiveProposal');

  try {
    const { decoded } = req;

    // Only president (3) or admin (4) can archive
    if (decoded.accessLevel < 3) {
      return res.status(403).json({ message: 'Only the president can archive proposals' });
    }

    const { id } = req.params;
    const { archived } = req.body;

    const proposal = await Proposal.findOne({ _id: id });

    if (!proposal) {
      return res.status(404).json({ message: 'Proposal not found' });
    }

    proposal.archived = archived;
    await proposal.save();

    Logger.info(`Proposal ${id} archived: ${archived}`);
    return res.status(200).json(proposal);
  } catch (e) {
    Logger.error(`Error archiving proposal: ${e.message}`);
    return res.status(500).json({ message: 'Error archiving proposal' });
  }
};

export const sponsorProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const { sponsor } = req.body;

    let proposal = await Proposal.findOne({ _id: id });
    proposal.sponsor = sponsor;
    await proposal.save();
    return res.status(200).json(proposal);
  }
  catch (err) {
    Logger.error(`Error Sponsoring Proposal: ${err}`);
    return res.status(400).send({ code: "PROP007", message: err.message });
  }
};

/** Applicant applies a director referral code to an existing proposal without a sponsor. */
export const applyProposalReferralCode = async (req, res) => {
  Logger.info('Inside applyProposalReferralCode');
  try {
    const { id } = req.params;
    const { code } = req.body;
    const { decoded } = req;

    const trimmed = String(code || '').trim();
    if (!trimmed) {
      return res.status(400).json({ message: 'Referral code is required' });
    }

    if (!mongoose.isValidObjectId(String(id))) {
      return res.status(404).json({ message: 'Proposal not found' });
    }

    const proposal = await Proposal.findOne({ _id: id });
    if (!proposal) {
      return res.status(404).json({ message: 'Proposal not found' });
    }

    const authz = await canUserUpdateProposal(decoded, proposal);
    if (!authz.ok) {
      return res.status(authz.status).json({ message: authz.message });
    }

    if (proposal.sponsor) {
      return res.status(409).json({ message: 'This proposal already has a sponsor' });
    }

    const refCode = await findActiveReferralCode(trimmed);

    if (!refCode) {
      return res.status(404).json({ message: 'Invalid or expired referral code' });
    }

    proposal.sponsor = refCode.director._id ?? refCode.director;
    await proposal.save();

    await User.updateOne({ _id: decoded.userID }, { referralCode: refCode.code });

    const populated = await Proposal.findOne({ _id: id })
      .populate('organization')
      .populate('sponsor', 'email firstName lastName');

    const director = refCode.director;
    const sponsorName = `${director?.firstName || ''} ${director?.lastName || ''}`.trim()
      || director?.email
      || 'Unknown';

    Logger.info(`Proposal ${id} sponsored by director ${refCode.director._id ?? refCode.director} via referral code ${trimmed}`);

    return res.status(200).json({
      message: 'Sponsor applied',
      proposal: populated,
      code: refCode.code,
      sponsor: {
        name: sponsorName,
        email: director?.email,
      },
    });
  } catch (err) {
    Logger.error(`Error applying referral code to proposal: ${err.message}`);
    return res.status(500).json({ message: 'Error applying referral code' });
  }
};
