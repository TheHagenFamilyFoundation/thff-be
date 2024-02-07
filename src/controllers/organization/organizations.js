import { validationResult } from "express-validator";
import Logger from '../../utils/logger.js';
import { Organization } from '../../models/index.js'
import { OrganizationInfo } from '../../models/index.js'
import { User } from "../../models/index.js";
import { generateCode } from "../../utils/util.js";

export const getOrganization = async (req, res) => {
  Logger.info('Inside getOrganization');
  console.log('Inside getOrganization', req.query);
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    Logger.error(`We have Errors: ${errors.array()}`)
    return res.status(422).json({ error: errors.array() });
  }

  const { organizationID } = req.query;
  console.log('Organization id?', organizationID)
  try {
    const organization = await Organization.findOne({ organizationID: organizationID })
      .populate('info')
      .populate('users')
      .populate('proposals')
      .populate('doc501c3');

    Logger.debug(`sending back organization ${organization}`);
    return res.status(200).send(organization);
  }
  catch (e) {
    console.log('e', e);
    Logger.error(`Error getting organization ${organizationID}`);
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
    createdOrg.save();

    let user = await User.findOne({ _id: userID });
    console.log('user', user); //debug

    user.organizations.push(createdOrgId);
    await user.save();

    // let payload = {
    //   orgName: createdOrgInfo.legalName,
    //   email: user.email,
    // };


    //send email to emailController

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
    let { limit, skip, filter, sort, dir } = req.query;

    let query = {};

    if (filter && filter.length !== 0) {
      query.where = { name: { contains: filter } };
    }

    let organizations = await Organization.find(query).populate('users').populate('proposals');

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
