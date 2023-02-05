/**
 * OrganizationsController
 *
 * @description :: Server-side logic for managing organizations
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

const AWS = require('aws-sdk');
const OrganizationInfoController = require('./OrganizationInfoController');

AWS.config.update({
  accessKeyId: sails.config.custom.s3_key,
  secretAccessKey: sails.config.custom.s3_secret,
  region: 'us-east-1',
});

const s3 = new AWS.S3();

module.exports = {

  async create(req, res) {
    sails.log('organization create');

    sails.log('req.body', req.body);

    const query = {
      legalName: req.body.orgInfo.legalName,
    };

    sails.log.info('query - ', query);

    //check for duplicate organization
    //compare legalnames 

    let orgInfoCheck = await OrganizationInfo.find(query);
    sails.log.debug('orgInfoCheck', orgInfoCheck);

    if (orgInfoCheck.length > 0) {
      sails.log.error('duplicate organization');
      res.status(400).send({ code: 'ORG001', message: 'Duplicate Organization' });
    } else {

      let text = '';
      const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

      for (let i = 0; i < 5; i += 1) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
      }

      const organizationID = text;
      // add organizationID to org object

      let newOrg = {
        description: req.body.description,
        name: req.body.orgInfo.legalName,
        organizationID: organizationID
      }

      //create organization obj
      let createdOrg = await Organization.create(newOrg)
      sails.log.debug('createdOrg', createdOrg)

      const userID = req.body.userId;

      let addedToCollection = await Organization.addToCollection(createdOrg.id, 'users').members(userID);
      sails.log.debug('addedToCollection', addedToCollection)

      //create organizationInfo object now

      let newOrgInfo = req.body.orgInfo;

      //create orgInfoID

      //reset text for the ID
      text = '';
      for (var i = 0; i < 5; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
      }

      var organizationInfoID = text;
      //add organizationInfoID to orgInfo object

      newOrgInfo.organizationInfoID = organizationInfoID;
      //validate the orgInfo
      let validatedOrgInfo = await OrganizationInfoController.validOrgInfo(newOrgInfo)
      sails.log.debug('validatedOrgInfo', validatedOrgInfo);
      newOrgInfo.validOrgInfo = validatedOrgInfo;
      newOrgInfo.organization = newOrg.id;

      let createdOrgInfo = await OrganizationInfo.create(newOrgInfo);

      sails.log.debug('createdOrgInfo', createdOrgInfo);

      return res.status(200).json({
        message: 'Org Created', org: createdOrg
      });
    }
  },
  addUser(req, res) {
    sails.log('addUser', req.body);

    const orgID = req.body.org.id;
    const { users } = req.body;

    users.forEach((element) => {
      sails.log('element', element);
      const userID = element.id;

      Organization.addToCollection(orgID, 'users').members(userID).then(() => {

      });
    });

    return res.json({ status: true, result: users });
  },
  upload501c3(req, res) {
    sails.log('uploading to s3');

    req.file('avatar').upload({
      adapter: require('skipper-s3'),
      key: sails.config.custom.s3_key,
      secret: sails.config.custom.s3_secret,
      bucket: sails.config.custom.s3_bucket_name,
    }, (err, filesUploaded) => {
      sails.log('after upload');
      sails.log('after upload- err ', err);
      sails.log('after upload', filesUploaded);
      sails.log('after upload', filesUploaded[0]);

      const path = `${sails.config.s3_path}/${filesUploaded[0].fd}`;

      filesUploaded[0].extra = {
        Location: path,
      };

      sails.log('after filesUploaded', filesUploaded);
      if (err) return res.serverError(err);
      return res.status(200).send({
        files: filesUploaded,
        textParams: req.allParams(),
      });
    });
  },
  get501c3(req, res) {
    sails.log('getting 501c3 for org', req.params);

    // TODO cleanup
    sails.log('key:', sails.config.custom.s3_key);
    sails.log('secret:', sails.config.custom.s3_secret);

    Organization.findOne({
      organizationID: req.params.orgID,
    }).exec((err, orgFound) => {
      sails.log('org:', orgFound);

      const orgID = orgFound.id;

      sails.log('orgID', orgID);

      Org501c3.find({
        organization: orgID,
      }).exec((err, org501c3Found) => {
        sails.log('501c3:', org501c3Found);

        const { fileName } = org501c3Found[0];

        sails.log('fileName:', fileName);

        const params = {
          Bucket: sails.config.custom.s3_bucket_name,
          Key: fileName,
          Expires: 3600,
        };

        sails.log(s3.getSignedUrl('getObject', params));

        const url = s3.getSignedUrl('getObject', params);

        sails.log('url', url);

        // redirect
        return res.status(200).json({
          message: 'Yay',
          url,
        });
      });
    });
  },
  // passing in the orgID
  // delete the 501c3 from the mongodb
  // also delete the file from s3
  delete501c3(req, res) {
    sails.log('deleting 501c3 for org', req.params);

    Organization.findOne({
      organizationID: req.params.orgID,
    }).exec((err, orgFound) => {
      sails.log('org:', orgFound);

      const orgID = orgFound.id;

      sails.log('orgID', orgID);

      Org501c3.findOne({
        organization: orgID,
      }).exec((err, org501c3Found) => {
        sails.log('501c3:', org501c3Found);

        const { fileName } = org501c3Found;

        sails.log('fileName:', fileName);


        // //first delete the s3
        // sails.log('deleting the 501c3 from s3')

        const params = {
          Bucket: sails.config.custom.s3_bucket_name,
          Key: fileName,
        };

        s3.deleteObject(params, (err2) => {
          if (err2) {
            this.logger.error(err2, err2.stack);
            return res.status(500);
          }


          // then delete from the mongodb

          sails.log('deleting from the mongodb');

          // await Org501c3.destroy({ organization: orgID })

          // return res.status(200).json({
          //     message: '501c3 Deleted'
          // })

          Org501c3.destroy({
            organization: orgID,
          }).exec((err3) => {
            sails.log('501c3 deleted');

            if (err3) {
              sails.log.error('error deleting 501c3');
              return res.status(400).send(err3);
            }

            return res.status(200).json({
              message: '501c3 Deleted',
            });
          });
        });
      });
    });
  }// end of Delete501c3
  ,

};
