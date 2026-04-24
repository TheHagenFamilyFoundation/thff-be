import { validationResult } from "express-validator";
import Logger from '../../utils/logger.js';
import { Organization, OrganizationInfo, User, Invite, Proposal } from '../../models/index.js';
import { generateCode } from "../../utils/util.js";
import {
  migrateOrganizationUsersToMemberships,
  membershipUserId,
  logOrganizationUserFetchDiagnostics,
} from '../../utils/organization-membership.js';
import {
  ensureMembershipsBackfilledForOrganization,
  addMemberToOrganization,
  removeMemberFromOrganization,
  organizationHasMember,
  loadOrganizationApiPayload,
} from '../../utils/organization-membership-store.js';
import Config from '../../config/config.js';
import { registerOrganization } from "../../views/organization.js";
import { inviteUser, organizationAddedUser } from "../../views/invite.js";
import { sendEmailWithTemplate } from "../email/email.js";

/**
 * Org ids that have at least one qualifying proposal with createdAt in calendar year.
 * @returns {Promise<undefined|Array>} undefined = no year filter; [] = none match
 */
async function distinctOrganizationIdsForProposalYear(yearRaw) {
  const y = parseInt(String(yearRaw), 10);
  if (Number.isNaN(y) || y < 1990 || y > 2100) {
    return [];
  }
  const startDate = new Date(`${y}-01-01T00:00:00.000Z`);
  const endDate = new Date(`${y}-12-31T23:59:59.999Z`);
  return Proposal.find({
    createdAt: { $gte: startDate, $lte: endDate },
    $or: [{ archived: false }, { archived: { $exists: false } }],
  }).distinct('organization');
}

/**
 * @param {string|undefined} filter
 * @param {undefined|Array} yearOrgIds — undefined = ignore year; [] = impossible match
 */
function buildOrganizationListMatchQuery(filter, yearOrgIds) {
  let query = {};
  if (filter && String(filter).length !== 0) {
    query = { name: { $regex: filter, $options: 'i' } };
  }
  if (yearOrgIds !== undefined) {
    query = { ...query, _id: { $in: yearOrgIds.length ? yearOrgIds : [] } };
  }
  return query;
}

/** @returns {Promise<undefined|Array>} */
async function resolveYearOrgIds(yearParam) {
  if (yearParam === undefined || yearParam === null || String(yearParam).trim() === '') {
    return undefined;
  }
  return distinctOrganizationIdsForProposalYear(yearParam);
}

export const getOrganization = async (req, res) => {
  Logger.info('Inside getOrganization');
  console.log('1req.params', req.params);
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    Logger.error(`We have Errors: ${errors.array()}`)
    console.log('errors:', errors.array());
    return res.status(422).json({ error: errors.array() });
  }
  console.log('2req.params', req.params);
  const { id } = req.params;
  console.log('Organization id?', id)
  try {
    let organization = await Organization.findOne({ _id: id });
    if (!organization) {
      return res.status(404).json({ code: 'ORG005', message: 'Organization not found' });
    }
    await migrateOrganizationUsersToMemberships(organization);

    const loaded = await loadOrganizationApiPayload(id);
    if (!loaded) {
      return res.status(404).json({ code: 'ORG005', message: 'Organization not found' });
    }
    const { payload, rawMembershipRows, memberships } = loaded;

    Logger.debug(`sending back organization ${id}`);
    await logOrganizationUserFetchDiagnostics(
      id,
      rawMembershipRows,
      { users: memberships },
      payload,
    );
    return res.status(200).send(payload);
  }
  catch (e) {
    console.log('e', e);
    Logger.error(`Error getting organization ${id}`);
    return res.status(500).json(e.message);
  }
};

export const createOrganization = async (req, res) => {
  Logger.info('Inside createOrganization');
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    Logger.error(`We have Errors: ${errors.array()}`)
    return res.status(422).json({ error: errors.array() });
  }

  try {
    console.log('inside the try');

    console.log('req.body', req.body);
    const { decoded, body } = req;
    console.log('decoded', decoded);
    const query = {
      legalName: body.orgInfo.legalName,
    };

    console.log("query - ", query);

    //check for duplicate organization
    //compare legalnames

    let orgInfoCheck = await OrganizationInfo.find(query);

    if (orgInfoCheck.length > 0) {
      Logger.error("Duplicate Organization");
      return res
        .status(400)
        .send({ code: "ORG001", message: "Duplicate Organization" });
    }

    const userID = decoded.userID;

    let newOrg = {
      description: req.body.description,
      name: req.body.orgInfo.legalName,
      organizationID: generateCode(),
      users: [],
    };

    //get id for organization to add the org info
    let createdOrg = await Organization.create(newOrg);
    Logger.info("createdOrg", createdOrg);
    console.log("createdOrg", createdOrg);

    const createdOrgId = createdOrg._id;

    let newOrgInfo = req.body.orgInfo;
    const organizationInfoID = generateCode();
    newOrgInfo.organizationInfoID = organizationInfoID;

    //validate done in the route
    newOrgInfo.organization = createdOrgId;

    const createdOrgInfo = await OrganizationInfo.create(newOrgInfo);
    console.log('createdOrgInfo', createdOrgInfo);

    createdOrg.info = createdOrgInfo._id;
    await createdOrg.save();

    let user = await User.findOne({ _id: userID });
    console.log('user', user); //debug

    await addMemberToOrganization(createdOrgId, userID, new Date());

    const data = {
      email: user.email,
    };

    const to = user.email;
    const subject = 'Thank You For Registering A Organization';

    try {
      await sendEmailWithTemplate(to, subject, registerOrganization, data);
      Logger.info(`Organization registration email sent successfully to ${to}`);
    } catch (emailError) {
      Logger.error(`Failed to send organization registration email to ${to}:`, emailError);
      // Continue even if email fails - organization is still created
    }

    return res.status(200).json({
      message: "Org Created",
      org: createdOrg,
    });
  }
  catch (e) {
    console.log('e', e);

    if (e.code === 11000) {
      console.error('Duplicate key error. Document already exists!');
      return res
        .status(400)
        .send({ code: "ORG001", message: "Duplicate Organization" });
    }

    //generic error creating organization
    Logger.error('Error creating organization');
    return res.status(500).json(e.message);
  }
};

export const getOrganizations = async (req, res) => {
  try {
    const { limit, skip, filter, sort, dir, year, includeTotal } = req.query;

    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 500);
    const skipNum = Math.max(parseInt(skip, 10) || 0, 0);

    const yearOrgIds = await resolveYearOrgIds(year);
    const matchQuery = buildOrganizationListMatchQuery(filter, yearOrgIds);

    const wantTotal = includeTotal === '1' || includeTotal === 'true';
    let total;
    if (wantTotal) {
      total = await Organization.countDocuments(matchQuery);
    }

    const sortKey = sort || 'createdOn';
    const direction = dir === 'asc' ? 1 : -1;

    let sortField;
    if (sortKey === 'name') {
      sortField = 'name';
    } else if (sortKey === 'createdOn') {
      sortField = 'createdAt';
    } else if (sortKey === 'users') {
      sortField = 'userCount';
    } else if (sortKey === 'proposals') {
      sortField = 'proposalCount';
    } else {
      sortField = 'createdAt';
    }

    const pipeline = [
      { $match: matchQuery },
      {
        $lookup: {
          from: 'organizationmemberships',
          localField: '_id',
          foreignField: 'organization',
          as: '_membershipDocs',
        },
      },
      {
        $addFields: {
          _membershipCount: { $size: { $ifNull: ['$_membershipDocs', []] } },
        },
      },
      {
        $addFields: {
          userCount: {
            $cond: {
              if: { $gt: ['$_membershipCount', 0] },
              then: '$_membershipCount',
              else: { $size: { $ifNull: ['$users', []] } },
            },
          },
          proposalCount: { $size: { $ifNull: ['$proposals', []] } },
        },
      },
      { $project: { _membershipDocs: 0, _membershipCount: 0 } },
      { $sort: { [sortField]: direction } },
      { $skip: skipNum },
      { $limit: limitNum },
    ];

    const rows = await Organization.aggregate(pipeline);

    const orgs = rows.map((doc) => {
      const uc = doc.userCount || 0;
      const pc = doc.proposalCount || 0;
      const { users, proposals, userCount, proposalCount, ...rest } = doc;
      return {
        ...rest,
        users: Array(uc).fill(null),
        proposals: Array(pc).fill(null),
      };
    });

    if (wantTotal) {
      return res.status(200).json({ items: orgs, total });
    }
    return res.status(200).json(orgs);
  } catch (err) {
    Logger.error(`Error Retrieving Organizations ${err.message}`);
    return res.status(400).send({ code: "ORG003", message: err.message });
  }
};

export const addUserToOrganization = async (req, res) => {
  Logger.info('Inside addUserToOrganization');

  try {
    const { orgID } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ code: 'ORG004', message: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find the organization
    const organization = await Organization.findOne({ _id: orgID });
    if (!organization) {
      return res.status(404).json({ code: 'ORG005', message: 'Organization not found' });
    }

    // Find the user by email
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      // User doesn't exist — create an invite and send email
      const existingInvite = await Invite.findOne({
        email: normalizedEmail,
        organization: orgID,
        status: 'pending'
      });

      if (existingInvite) {
        return res.status(400).json({ code: 'ORG010', message: 'An invite has already been sent to this email' });
      }

      // Get the inviter's ID from the decoded token
      const invitedBy = req.decoded?.userID || null;

      const invite = await Invite.create({
        email: normalizedEmail,
        organization: orgID,
        invitedBy,
        status: 'pending'
      });

      // Send invite email
      let feURL = Config.feURL;
      if (!feURL.startsWith('http://') && !feURL.startsWith('https://')) {
        feURL = feURL.includes('localhost') ? `http://${feURL}` : `https://${feURL}`;
      }

      const data = {
        email: normalizedEmail,
        organizationName: organization.name,
        registerLink: `${feURL}/sign-up`
      };

      try {
        await sendEmailWithTemplate(normalizedEmail, `You've been invited to join ${organization.name} on THFF`, inviteUser, data);
        Logger.info(`Invite email sent to ${normalizedEmail} for organization ${organization.name}`);
      } catch (emailError) {
        Logger.error(`Failed to send invite email to ${normalizedEmail}:`, emailError);
        // Invite is still created even if email fails
      }

      return res.status(200).json({
        message: 'Invite sent! They will be added automatically when they create an account.',
        invited: true,
        invite
      });
    }

    await migrateOrganizationUsersToMemberships(organization);
    await ensureMembershipsBackfilledForOrganization(orgID);

    if (await organizationHasMember(orgID, user._id)) {
      return res.status(400).json({ code: 'ORG007', message: 'User is already a member of this organization' });
    }

    await addMemberToOrganization(orgID, user._id, new Date());

    // Notify existing user that they were added to an organization.
    let feURL = Config.feURL;
    if (!feURL.startsWith('http://') && !feURL.startsWith('https://')) {
      feURL = feURL.includes('localhost') ? `http://${feURL}` : `https://${feURL}`;
    }

    const existingUserEmailData = {
      organizationName: organization.name,
      signInLink: `${feURL}/sign-in`
    };

    try {
      await sendEmailWithTemplate(
        normalizedEmail,
        `You've been added to ${organization.name} on THFF`,
        organizationAddedUser,
        existingUserEmailData
      );
      Logger.info(`Organization-added email sent to ${normalizedEmail} for organization ${organization.name}`);
    } catch (emailError) {
      Logger.error(`Failed to send organization-added email to ${normalizedEmail}:`, emailError);
      // Membership updates should still succeed if email fails.
    }

    Logger.info(`User ${user.email} added to organization ${organization.name}`);
    const loaded = await loadOrganizationApiPayload(orgID);
    if (!loaded) {
      return res.status(404).json({ code: 'ORG005', message: 'Organization not found' });
    }
    return res.status(200).json({
      message: 'User added to organization',
      invited: false,
      organization: loaded.payload,
    });
  } catch (e) {
    Logger.error(`Error adding user to organization: ${e.message}`);
    return res.status(500).json({ code: 'ORG008', message: e.message });
  }
};

export const removeUserFromOrganization = async (req, res) => {
  Logger.info('Inside removeUserFromOrganization');

  try {
    const { orgID, userID } = req.params;

    // Find the organization
    const organization = await Organization.findOne({ _id: orgID });
    if (!organization) {
      return res.status(404).json({ code: 'ORG005', message: 'Organization not found' });
    }

    const user = await User.findOne({ _id: userID });

    await migrateOrganizationUsersToMemberships(organization);
    await ensureMembershipsBackfilledForOrganization(orgID);

    const wasMember =
      (await organizationHasMember(orgID, userID)) ||
      (organization.users || []).some((m) => membershipUserId(m) === userID);
    if (!wasMember) {
      return res.status(404).json({ code: 'ORG011', message: 'User is not a member of this organization' });
    }

    await removeMemberFromOrganization(orgID, userID);

    Logger.info(
      `Membership ${userID} removed from organization ${organization.name}` +
        (user ? ` (user ${user.email})` : ' (no User document; dangling ref cleared)')
    );
    const loadedRm = await loadOrganizationApiPayload(orgID);
    if (!loadedRm) {
      return res.status(404).json({ code: 'ORG005', message: 'Organization not found' });
    }
    return res.status(200).json({
      message: 'User removed from organization',
      organization: loadedRm.payload,
    });
  } catch (e) {
    Logger.error(`Error removing user from organization: ${e.message}`);
    return res.status(500).json({ code: 'ORG009', message: e.message });
  }
};

export const getOrganizationInvites = async (req, res) => {
  Logger.info('Inside getOrganizationInvites');

  try {
    const { orgID } = req.params;

    const invites = await Invite.find({ organization: orgID, status: 'pending' })
      .populate('invitedBy', 'email firstName lastName')
      .sort({ createdAt: -1 });

    return res.status(200).json(invites);
  } catch (e) {
    Logger.error(`Error getting invites: ${e.message}`);
    return res.status(500).json({ code: 'ORG011', message: e.message });
  }
};

export const resendInvite = async (req, res) => {
  Logger.info('Inside resendInvite');

  try {
    const { inviteID } = req.params;

    const invite = await Invite.findOne({ _id: inviteID, status: 'pending' }).populate('organization', 'name');
    if (!invite) {
      return res.status(404).json({ code: 'ORG014', message: 'Invite not found' });
    }

    let feURL = Config.feURL;
    if (!feURL.startsWith('http://') && !feURL.startsWith('https://')) {
      feURL = feURL.includes('localhost') ? `http://${feURL}` : `https://${feURL}`;
    }

    const orgName = invite.organization?.name || 'an organization';

    const data = {
      email: invite.email,
      organizationName: orgName,
      registerLink: `${feURL}/sign-up`
    };

    await sendEmailWithTemplate(
      invite.email,
      `Reminder: You've been invited to join ${orgName} on THFF`,
      inviteUser,
      data
    );

    Logger.info(`Invite email resent to ${invite.email} for organization ${orgName}`);
    return res.status(200).json({ message: 'Invite resent', invite });
  } catch (e) {
    Logger.error(`Error resending invite: ${e.message}`);
    return res.status(500).json({ code: 'ORG015', message: e.message });
  }
};

export const cancelInvite = async (req, res) => {
  Logger.info('Inside cancelInvite');

  try {
    const { inviteID } = req.params;

    const invite = await Invite.findOne({ _id: inviteID, status: 'pending' });
    if (!invite) {
      return res.status(404).json({ code: 'ORG012', message: 'Invite not found' });
    }

    invite.status = 'cancelled';
    await invite.save();

    Logger.info(`Invite ${inviteID} cancelled`);
    return res.status(200).json({ message: 'Invite cancelled', invite });
  } catch (e) {
    Logger.error(`Error cancelling invite: ${e.message}`);
    return res.status(500).json({ code: 'ORG013', message: e.message });
  }
};

export const countOrganizations = async (req, res) => {
  try {
    const { filter, year } = req.query;

    const yearOrgIds = await resolveYearOrgIds(year);
    const query = buildOrganizationListMatchQuery(filter, yearOrgIds);

    const count = await Organization.countDocuments(query);
    return res.status(200).json(count);
  } catch (err) {
    Logger.error(`Error Retrieving Organization Count: ${err}`);
    return res.status(400).send({ code: "ORG002", message: err.message });
  }

};
