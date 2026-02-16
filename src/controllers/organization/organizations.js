import { validationResult } from "express-validator";
import Logger from '../../utils/logger.js';
import { Organization, OrganizationInfo, User, Invite, Proposal } from '../../models/index.js';
import { generateCode } from "../../utils/util.js";
import Config from '../../config/config.js';
import { registerOrganization } from "../../views/organization.js";
import { inviteUser } from "../../views/invite.js";
import { sendEmailWithTemplate } from "../email/email.js";

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
    const organization = await Organization.findOne({ _id: id })
      .populate('info')
      .populate('users')
      .populate({
        path: 'proposals',
        options: { limit: 10 }
      })
      .populate('doc501c3');

    Logger.debug(`sending back organization ${organization}`);
    return res.status(200).send(organization);
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
      users: [userID]
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

    user.organizations.push(createdOrgId);
    await user.save();

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
    let { limit, skip, filter, sort, dir, year } = req.query;

    let query = {};

    if (filter && filter.length !== 0) {
      query = { name: { $regex: filter, $options: 'i' } };
    }

    // If year is provided, only return organizations that have proposals in that year
    if (year) {
      const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
      const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

      const proposals = await Proposal.find({
        createdAt: { $gte: startDate, $lte: endDate },
        $or: [{ archived: false }, { archived: { $exists: false } }]
      }).distinct('organization');

      query = { ...query, _id: { $in: proposals } };
    }

    let organizations = await Organization.find(query)
      .populate('users')
      .populate({
        path: 'proposals',
        options: { limit: 10 }
      })

    //sort
    //for notes
    // ASC  -> a.length - b.length
    // DESC -> b.length - a.length
    switch (sort) {

      case 'users':
        organizations.sort(function (a, b) {
          return dir === 'asc' ? (a.users.length - b.users.length) : (b.users.length - a.users.length);
        });
        break;
      case 'proposals':
        organizations.sort(function (a, b) {
          return dir === 'asc' ? (a.proposals.length - b.proposals.length) : (b.proposals.length - a.proposals.length);
        });
        break;
      case 'createdOn':
        organizations.sort(function (a, b) {
          return dir === 'asc' ? (new Date(a.createdAt) - new Date(b.createdAt)) : (new Date(b.createdAt) - new Date(a.createdAt));
        });
        break;
      case 'name':
        if (dir === 'asc') {
          organizations.sort((a, b) => b.name.localeCompare(a.name));
        }
        else {
          organizations.sort((a, b) => a.name.localeCompare(b.name))
        }

        break;
    }

    //skip and limit
    let orgs = organizations.slice(skip, +skip + +limit);

    return res.status(200).json(orgs);
  }
  catch (err) {
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

    // User exists — add them directly
    if (organization.users.some(u => u.toString() === user._id.toString())) {
      return res.status(400).json({ code: 'ORG007', message: 'User is already a member of this organization' });
    }

    // Add user to organization's users array
    organization.users.push(user._id);
    await organization.save();

    // Add organization to user's organizations array
    user.organizations.push(organization._id);
    await user.save();

    // Return updated organization with populated users
    const updatedOrg = await Organization.findOne({ _id: orgID }).populate('users');

    Logger.info(`User ${user.email} added to organization ${organization.name}`);
    return res.status(200).json({ message: 'User added to organization', invited: false, organization: updatedOrg });
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

    // Find the user
    const user = await User.findOne({ _id: userID });
    if (!user) {
      return res.status(404).json({ code: 'ORG006', message: 'User not found' });
    }

    // Remove user from organization's users array
    organization.users = organization.users.filter(u => u.toString() !== userID);
    await organization.save();

    // Remove organization from user's organizations array
    user.organizations = user.organizations.filter(o => o.toString() !== orgID);
    await user.save();

    // Return updated organization with populated users
    const updatedOrg = await Organization.findOne({ _id: orgID }).populate('users');

    Logger.info(`User ${user.email} removed from organization ${organization.name}`);
    return res.status(200).json({ message: 'User removed from organization', organization: updatedOrg });
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

    let query = {};
    if (filter && filter.length !== 0) {
      query = { name: { $regex: filter, $options: 'i' } };
    }

    // If year is provided, only count organizations that have proposals in that year
    if (year) {
      const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
      const endDate = new Date(`${year}-12-31T23:59:59.999Z`);

      const proposals = await Proposal.find({
        createdAt: { $gte: startDate, $lte: endDate },
        $or: [{ archived: false }, { archived: { $exists: false } }]
      }).distinct('organization');

      query = { ...query, _id: { $in: proposals } };
    }

    const count = await Organization.find(query).count();
    return res.status(200).json(count);
  }
  catch (err) {
    Logger.error(`Error Retrieving Organization Count: ${err}`);
    return res.status(400).send({ code: "ORG002", message: err.message });
  }

}
