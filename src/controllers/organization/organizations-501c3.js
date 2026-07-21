import { validationResult } from "express-validator";
import { GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import Logger from '../../utils/logger.js';
import { s3 } from '../../config/index.js';
import Organization from "../../models/organization.js";
import Organization501c3 from "../../models/organization-501c3.js";
import Config from "../../config/config.js";
import { generateUUID } from "../../utils/util.js";

export const upload501c3Doc = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    Logger.error(`We have Errors: ${errors.array()}`)
    return res.status(422).json({ error: errors.array() });
  }

  let orgID = req.params.orgId;

  try {

    Logger.info("uploading to s3");
    console.log('req.parms', req.params);
    console.log('req.files', req.files);

    let org = await Organization.findOne({
      organizationID: orgID,
    });

    if (!org) {
      Logger.error(`org ${orgID} not found`);
      return res
        .status(400)
        .send({ code: "ORG501C3002", message: 'Error Uploading 501c3 Doc' });
    }

    console.log('inside the upload org', org);

    if (!req.files || !req.files.doc501c3) {
      Logger.error(
        `No file received for org ${orgID}. content-type=${req.headers['content-type']} content-length=${req.headers['content-length']}`
      );
      return res
        .status(400)
        .send({ code: "ORG501C3005", message: 'No file received. Please re-select the document and try again.' });
    }

    let organizationID = org.id;

    Logger.info("orgID", orgID);

    let obj501c3 = await Organization501c3.findOne({
      organization: organizationID,
    });
    console.log('obj501c3', obj501c3);

    //delete the old if there exists one
    if (obj501c3) {
      const { fileName } = obj501c3;

      Logger.info(`fileName: ${fileName}`);

      //deleting the s3 object
      await deletes3(fileName);

      // then delete from db
      Logger.info(`deleting the ${organizationID} 501c3 from db`);

      await Organization501c3.deleteOne({ organization: organizationID });

    }

    //upload the new
    // upload to s3
    let fileUploaded = await uploads3(req, organizationID);
    if (!fileUploaded) {
      Logger.error('File Not Uploaded');
      return res
        .status(400)
        .send({ code: "ORG501C3002", message: 'Error Uploading 501c3' });
    }

    console.log('after fileUploaded', fileUploaded);

    const body = { //rename
      url: fileUploaded.files.Location,
      fileName: fileUploaded.files.Key,
      organization: organizationID
    };

    //create the 501c3 object
    let newOrg501c3 = await Organization501c3.create(body);
    console.log('newOrg501c3', newOrg501c3); //debug

    org.doc501c3 = newOrg501c3._id;
    await org.save();

    return res.status(200).json({
      message: "Uploading the 501c3",
      org,
    });
  }
  catch (e) {
    Logger.error(`Error Uploading 501c3 for org ${orgID}: ${e && e.message ? e.message : e}`);
    if (e && e.stack) {
      Logger.error(e.stack);
    }
    return res
      .status(400)
      .send({ code: "ORG501C3002", message: 'Error Uploading 501c3' });
  }
}

export const get501c3Doc = async (req, res) => {
  const { id } = req.params;
  Logger.info(`getting 501c3 ${id}`);

  try {

    let docOrg501c3 = await Organization501c3.findOne({ _id: id });

    if (!docOrg501c3) {
      Logger.error(`501c3 for ${id} is not found`);
      return res
        .status(400)
        .send({ code: "ORG501C3002", message: 'Error Retrieving 501c3' });
    }

    const { fileName } = docOrg501c3;

    const command = new GetObjectCommand({
      Bucket: Config.bucket,
      Key: fileName,
      ResponseContentDisposition: 'inline',
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return res.status(200).json({
      message: "Yay",
      url,
    });
  }
  catch (e) {
    Logger.error(`Error Retrieving 501c3 ${id}`);
    return res
      .status(400)
      .send({ code: "ORG501C3003", message: 'Error Retrieving 501c3' });
  }
}

// Stream the file through the backend with correct headers so the browser displays it inline
export const view501c3Doc = async (req, res) => {
  const { id } = req.params;
  Logger.info(`viewing 501c3 ${id}`);

  try {
    const docOrg501c3 = await Organization501c3.findOne({ _id: id });

    if (!docOrg501c3) {
      Logger.error(`501c3 for ${id} is not found`);
      return res.status(404).send({ code: "ORG501C3002", message: 'Document not found' });
    }

    const { fileName } = docOrg501c3;

    // Determine content type from file extension
    let contentType = 'application/pdf';
    if (fileName) {
      const ext = fileName.split('.').pop().toLowerCase();
      if (ext === 'doc') { contentType = 'application/msword'; }
      else if (ext === 'docx') { contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'; }
    }

    const command = new GetObjectCommand({
      Bucket: Config.bucket,
      Key: fileName,
    });

    const { Body: s3Stream } = await s3.send(command);

    // Set headers so the browser opens inline instead of downloading
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline');

    // Stream the S3 object directly to the response
    s3Stream.on('error', (err) => {
      Logger.error(`Error streaming 501c3 ${id}: ${err.message}`);
      if (!res.headersSent) {
        res.status(500).send({ code: "ORG501C3003", message: 'Error streaming document' });
      }
    });

    s3Stream.pipe(res);
  }
  catch (e) {
    Logger.error(`Error viewing 501c3 ${id}: ${e.message}`);
    return res.status(400).send({ code: "ORG501C3003", message: 'Error Retrieving 501c3' });
  }
}

export const delete501c3Doc = async (req, res) => {
  console.log("deleting 501c3 for org", req.params);
  const { id } = req.params;
  try {
    //find the 501c3
    const org501c3Doc = await Organization501c3.findOne({
      _id: id,
    })

    if (!Organization501c3) {
      Logger.error(`Error Deleting 501c3 ${id}`);
      return res
        .status(400)
        .send({ code: "ORG501C3004", message: 'Error Deleting 501c3' });
    }

    console.log("501c3:", org501c3Doc);

    const { fileName, organization } = org501c3Doc;

    console.log("fileName:", fileName);

    await deletes3(fileName);

    console.log("deleting from the mongodb");

    await Organization501c3.delete({ _id: id });

    await Organization.updateOne({ _id: organization }, { doc501c3: null })

    return res.status(200).json({
      message: "501c3 Deleted",
    })
  }
  catch (e) {
    Logger.error(`Error Deleting 501c3 ${id}`);
    return res
      .status(400)
      .send({ code: "ORG501C3004", message: 'Error Deleting 501c3' });
  }
}


async function deletes3(fileName) {
  const command = new DeleteObjectCommand({
    Bucket: Config.bucket,
    Key: fileName,
  });

  try {
    await s3.send(command);
  } catch (err) {
    Logger.error(`Error deleting s3 object ${fileName}: ${err && err.message ? err.message : err}`);
    throw err;
  }
}

async function uploads3(req, orgId) {
  const fileName = req.files.doc501c3.name;

  // Determine content type from file extension
  let contentType = 'application/pdf';
  const ext = fileName.split('.').pop().toLowerCase();
  if (ext === 'doc') { contentType = 'application/msword'; }
  else if (ext === 'docx') { contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'; }

  // Namespace the key by environment. Fall back to nodeEnv (never the string
  // "undefined") when APP_ENV is not configured in the runtime environment.
  const envPrefix = Config.appEnv || Config.nodeEnv || '';
  if (!Config.appEnv) {
    Logger.warn('APP_ENV not set; falling back to NODE_ENV for the S3 key prefix.');
  }
  const key = `${envPrefix}${orgId}/${generateUUID()}_${fileName}`;

  const upload = new Upload({
    client: s3,
    params: {
      Bucket: Config.bucket,
      Key: key,
      Body: req.files.doc501c3.data,
      ContentType: contentType,
    },
  });

  const result = await upload.done();
  Logger.info(`File ${fileName} uploaded successfully to ${result.Location}`);

  return {
    files: {
      Location: result.Location,
      Key: result.Key || key,
    },
  };
}
