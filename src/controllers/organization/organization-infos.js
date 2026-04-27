import { validationResult } from "express-validator";
import Logger from '../../utils/logger.js';
import { OrganizationInfo } from '../../models/index.js';
import { Organization } from '../../models/index.js';

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

export const updateOrganizationInfo = async (req, res) => {
  try {
    Logger.info('updating', req.query);
    Logger.info('updated field', req.body); // check for full update now

    const existingInfo = await OrganizationInfo.findOne({
      organizationInfoID: req.query.organizationInfoID,
    });
    if (!existingInfo) {
      return res.status(404).json({ message: 'Organization info not found' });
    }

    const updatedInfo = await OrganizationInfo.updateOne(
      { organizationInfoID: req.query.organizationInfoID },
      req.body
    );

    Logger.info('updatedInfo', updatedInfo);

    // if legal name changed then change the organization object name to legal name
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
      info: updatedInfo,
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
