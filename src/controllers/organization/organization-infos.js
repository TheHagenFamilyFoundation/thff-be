import { validationResult } from "express-validator";
import Logger from '../../utils/logger.js';
import { OrganizationInfo } from '../../models/index.js';
import { Organization } from '../../models/index.js';
import { coerceOrgInfoZipForStorage } from '../../utils/org-info-zip.js';
import { generateCode } from '../../utils/util.js';

const PATCH_BLOCKLIST = new Set([
  '_id',
  '__v',
  'organizationInfoID',
  'createdAt',
  'updatedAt',
]);

function sanitizeOrgInfoPayload(body) {
  const payload = { ...body };
  for (const key of PATCH_BLOCKLIST) {
    delete payload[key];
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'zip')) {
    payload.zip = coerceOrgInfoZipForStorage(payload.zip);
  }
  return payload;
}

export const getOrganizationInfo = async (req, res) => {
  Logger.info('Inside getOrganizationInfo');
  console.log('Inside getOrganizationInfo', req.query);
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    Logger.error(`We have Errors: ${errors.array()}`)
    return res.status(422).json({ error: errors.array() });
  }

  const { organization } = req.query;
  console.log('Organization info id?', organization)
  try {
    const organizationInfo = await OrganizationInfo.findOne({ organization: organization })

    Logger.debug(`sending back organization info ${organizationInfo}`);
    return res.status(200).send(organizationInfo);
  }
  catch (e) {
    Logger.error(`Error getting organization info in organization ${organization}`);
    return res.status(500).json(e.message);
  }
};

export const createOrganizationInfo = async (req, res) => {
  Logger.info('Inside createOrganizationInfo');

  try {
    const payload = sanitizeOrgInfoPayload(req.body);
    const organizationId = payload.organization;

    if (!organizationId) {
      return res.status(400).json({ message: 'organization is required' });
    }

    const org = await Organization.findOne({ _id: organizationId });
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const existing = await OrganizationInfo.findOne({ organization: organizationId });
    if (existing) {
      Logger.info(`Organization info already exists for org ${organizationId}`);
      return res.status(200).json({
        message: 'Organization info already exists',
        result: existing,
      });
    }

    payload.organizationInfoID = generateCode();
    const created = await OrganizationInfo.create(payload);

    if (!org.info) {
      org.info = created._id;
      await org.save();
    }

    if (payload.legalName && org.name !== payload.legalName) {
      await Organization.updateOne({ _id: organizationId }, { name: payload.legalName });
    }

    Logger.info(`Created organization info ${created.organizationInfoID} for org ${organizationId}`);
    return res.status(201).json({
      message: 'Org Info Created',
      result: created,
    });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(400).json({
        code: 'ORG001',
        message: 'Duplicate Organization',
      });
    }
    Logger.error(`Error creating organization info: ${e.message}`);
    return res.status(500).json({ message: 'Error creating organization info' });
  }
};

export const updateOrganizationInfo = async (req, res) => {
  try {
    Logger.info('updating', req.query);
    Logger.info('updated field', req.body);

    const existingInfo = await OrganizationInfo.findOne({
      organizationInfoID: req.query.organizationInfoID,
    });
    if (!existingInfo) {
      return res.status(404).json({ message: 'Organization info not found' });
    }

    const payload = sanitizeOrgInfoPayload(req.body);

    const savedInfo = await OrganizationInfo.findOneAndUpdate(
      { organizationInfoID: req.query.organizationInfoID },
      payload,
      { new: true, runValidators: true },
    );

    Logger.info(`Organization info updated: ${req.query.organizationInfoID}`);

    if (req.body.legalName) {
      Logger.info('updating org object');
      const orgId = existingInfo.organization;
      const orgToUpdate = await Organization.findOne({ _id: orgId });
      Logger.info('before - orgToUpdate', orgToUpdate);
      if (orgToUpdate) {
        const updatedOrg = await Organization.updateOne(
          { _id: orgId },
          { name: req.body.legalName }
        );
        Logger.info('updatedOrg', updatedOrg);
      } else {
        Logger.error('organization not found - detached', orgId);
        return res.status(500).json({
          message: 'Org Not Found',
        });
      }
      Logger.info('found org', orgToUpdate);
    }

    return res.status(200).json({
      message: 'Org Info Updated',
      info: savedInfo,
    });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(400).json({
        code: 'ORG001',
        message: 'Duplicate Organization',
      });
    }
    Logger.error(`Error updating organization info: ${e.message}`);
    return res.status(500).json({ message: 'Error updating organization info' });
  }
};
