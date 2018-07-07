/**
 * OrganizationsController
 *
 * @description :: Server-side logic for managing organizations
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var AWS = require('aws-sdk');

AWS.config.update({
    accessKeyId: sails.config.custom.s3_key,
    secretAccessKey: sails.config.custom.s3_secret,
    region: "us-east-1"
})


var s3 = new AWS.S3();

module.exports = {

    create: function (req, res, next) {

        sails.log("organization create");

        sails.log('req.body', req.body)

        var org = req.body;

        let userID = org.userid;

        //create orgID
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (var i = 0; i < 5; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }

        var organizationID = text;
        //add organizationID to org object

        org.organizationID = organizationID;

        Organization.create(org)
            .then(function (newOrg, err) {

                if (err) {
                    return res.status(err.status).json({ err: err });
                }

                sails.log(newOrg)

                //add the user who created the org into the users list
                Organization.addToCollection(newOrg.id, 'users').members(userID).then(function () {

                    sails.log(newOrg)

                    return res.json({ 'status': true, 'result': newOrg });
                })

            })

    },
    addUser: function (req, res, next) {

        sails.log('addUser', req.body);

        let orgID = req.body.org.id;
        let users = req.body.users;

        users.forEach(element => {

            sails.log('element', element)
            let userID = element.id;

            Organization.addToCollection(orgID, 'users').members(userID).then(function () {

            })

        });

        return res.json({ 'status': true, 'result': users });

    },
    upload501c3: function (req, res) {

        sails.log('uploading to s3')

        req.file('avatar').upload({
            adapter: require('skipper-s3'),
            key: sails.config.custom.s3_key,
            secret: sails.config.custom.s3_secret,
            bucket: sails.config.custom.s3_bucket_name
        }, function (err, filesUploaded) {

            if (err) return res.serverError(err);
            return res.ok({
                files: filesUploaded,
                textParams: req.allParams()
            });
        });
    },
    get501c3: function (req, res) {

        sails.log('getting 501c3 for org', req.params)

        sails.log('key:', sails.config.custom.s3_key, );
        sails.log('secret:', sails.config.custom.s3_secret)

        Organization.find({
            organizationID: req.params.orgID
        }).exec(function (err, orgFound) {

            sails.log('org:', orgFound)

            let orgID = orgFound.id;

            Org501c3.find({
                organization: orgID
            }).exec(function (err, org501c3Found) {

                sails.log('501c3:', org501c3Found)

                let fileName = org501c3Found[0].fileName;

                sails.log('fileName:', fileName)

                var params = {
                    Bucket: sails.config.custom.s3_bucket_name,
                    Key: fileName,
                    Expires: 3600
                };

                sails.log(s3.getSignedUrl('getObject', params));

                // return res.status(200).json({
                //     message: 'Yay'
                // })

                let url = s3.getSignedUrl('getObject', params)

                sails.log('url', url)

                return res.redirect(url);

            })

        })


    },

}

