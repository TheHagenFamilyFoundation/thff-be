import { validationResult } from "express-validator";
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
      fileName: fileUploaded.files.key,
      organization: organizationID
    };

    //create the 501c3 object
    let newOrg501c3 = await Organization501c3.create(body);
    console.log('newOrg501c3', newOrg501c3); //debug

    org.doc501c3 = newOrg501c3._id;
    org.save();

    return res.status(200).json({
      message: "Uploading the 501c3",
      org,
    });
  }
  catch (e) {
    Logger.error(`Error Uploading 501c3 for org ${orgID}`);
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
    console.log('docOrg501c3', docOrg501c3);
    const { fileName } = docOrg501c3;

    console.log("fileName:", fileName);

    const params = {
      Bucket: Config.bucket,
      Key: fileName,
      Expires: 3600,
    };

    console.log(s3.getSignedUrl("getObject", params));

    const url = s3.getSignedUrl("getObject", params);

    console.log("url", url);

    // redirect
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


function deletes3(fileName) {
  return new Promise((resolve, reject) => {
    const params = {
      Bucket: Config.bucket,
      Key: fileName,
    };

    //delete the s3 object
    s3.deleteObject(params, (err2) => {
      if (err2) {
        this.logger.error(err2, err2.stack);
        // return res.status(500);
        reject();
      }
    });

    resolve();
  });
}

function uploads3(req, orgId) {
  return new Promise((resolve, reject) => {

    console.log('req.files', req.files);

    const fileName = req.files.doc501c3.name;
    console.log('fileName', fileName);

    console.log('s3', s3);

    // Set the parameters for the file you want to upload
    const params = {
      Bucket: Config.bucket,
      Key: `${orgId}/${generateUUID()}_${fileName}`,
      Body: req.files.doc501c3.data
    };

    // Upload the file to S3
    s3.upload(params, (err, filesUploaded) => {

      console.log("after upload");
      console.log("after upload- err ", err);
      console.log("after upload", filesUploaded);

      if (err) {
        console.log('Error uploading file:', err);
        return reject();
      } else {

        Logger.info(`File ${fileName} uploaded successfully`);
        console.log('File uploaded successfully. File location:', filesUploaded.Location);
        return resolve({
          files: filesUploaded
        });
      }
    });
  });
}
