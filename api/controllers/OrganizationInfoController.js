/**
 * OrganizationInfoController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {

    create: function (req, res, next) {

        sails.log("organization info create");

        sails.log('req.body', req.body)

        var orgInfo = req.body;

        //create orgInfoID
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (var i = 0; i < 5; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }

        var organizationInfoID = text;
        //add organizationInfoID to orgInfo object

        orgInfo.organizationInfoID = organizationInfoID;

        let validInfo = true;

        //validate the orgInfo

        if (req.body.legalName == '') {
            //bad
            sails.log('bad legalName');

            validInfo = false;
        }

        if (req.body.yearFounded == '') {
            //bad
            sails.log('bad yearFounded');

            validInfo = false;
        }


        if (req.body.currentOperatingBudget == '') {
            //bad
            sails.log('bad currentOperatingBudget');

            validInfo = false;
        }


        if (req.body.director == '') {
            //bad
            sails.log('bad director');

            validInfo = false;
        }


        if (req.body.phoneNumber == 0) {
            //bad
            sails.log('bad phoneNumber');

            validInfo = false;
        }

        if (req.body.contactPerson == '') {
            //bad
            sails.log('bad contactPerson');

            validInfo = false;
        }

        if (req.body.contactPersonTitle == '') {
            //bad
            sails.log('bad contactPersonTitle');

            validInfo = false;
        }

        if (req.body.contactPersonPhoneNumber == 0) {
            //bad
            sails.log('bad contactPersonPhoneNumber');

            validInfo = false;
        }

        if (req.body.email == '') {
            //bad
            sails.log('bad email');

            validInfo = false;
        }

        if (req.body.address == '') {
            //bad
            sails.log('bad address');

            validInfo = false;
        }

        if (req.body.city == '') {
            //bad
            sails.log('bad city');

            validInfo = false;
        }

        if (req.body.state == '') {
            //bad
            sails.log('bad state');

            validInfo = false;
        }

        if (req.body.zip == 0) {
            //bad
            sails.log('bad zip');

            validInfo = false;
        }

        if (validInfo) {

            sails.log('valid Org Info')

            orgInfo.validOrgInfo = true;

        }
        else {

            orgInfo.validOrgInfo = false;

        }

        OrganizationInfo.create(orgInfo).then(function (newOrgInfo, err) {
            sails.log("OrganizationInfo.create")

            if (err) {
                return res.status(err.status).json({ err: err });
            }

            return res.json({ 'status': true, 'result': newOrgInfo });

        })

    },
    validOrgInfo: async function (orgInfo) {
        sails.log.debug('OrganizationInfoController - validOrgInfo', orgInfo);
        //return true if valid
        //return false if not

        //validate the orgInfo

        //start true
        let validInfo = true;

        if (orgInfo.legalName == '') {
            //bad
            sails.log('bad legalName');

            validInfo = false;
        }

        if (orgInfo.yearFounded == '') {
            //bad
            sails.log('bad yearFounded');

            validInfo = false;
        }


        if (orgInfo.currentOperatingBudget == '') {
            //bad
            sails.log('bad currentOperatingBudget');

            validInfo = false;
        }


        if (orgInfo.director == '') {
            //bad
            sails.log('bad director');

            validInfo = false;
        }


        if (orgInfo.phoneNumber == 0) {
            //bad
            sails.log('bad phoneNumber');

            validInfo = false;
        }

        if (orgInfo.contactPerson == '') {
            //bad
            sails.log('bad contactPerson');

            validInfo = false;
        }

        if (orgInfo.contactPersonTitle == '') {
            //bad
            sails.log('bad contactPersonTitle');

            validInfo = false;
        }

        if (orgInfo.contactPersonPhoneNumber == 0) {
            //bad
            sails.log('bad contactPersonPhoneNumber');

            validInfo = false;
        }

        if (orgInfo.email == '') {
            //bad
            sails.log('bad email');

            validInfo = false;
        }

        if (orgInfo.address == '') {
            //bad
            sails.log('bad address');

            validInfo = false;
        }

        if (orgInfo.city == '') {
            //bad
            sails.log('bad city');

            validInfo = false;
        }

        if (orgInfo.state == '') {
            //bad
            sails.log('bad state');

            validInfo = false;
        }

        if (orgInfo.zip == 0) {
            //bad
            sails.log('bad zip');

            validInfo = false;
        }

        return validInfo;
    },
    update: async function (req, res, next) {
        sails.log.debug('updating', req.query);
        sails.log.debug('updated field', req.body) // check for full update now 
        let updatedInfo = await OrganizationInfo.updateOne({ organizationInfoID: req.query.organizationInfoID }, req.body)
        
        sails.log.debug('updatedInfo',updatedInfo);

        //if legal name changed then change the organization object name to legal name
        if(req.body.legalName)
        {
            //update org object
            sails.log.debug('updating org object');
            let orgId = updatedInfo.organization
            let orgToUpdate = await Organization.findOne(orgId)
            sails.log.debug('before - orgToUpdate',orgToUpdate)
            if(orgToUpdate){
                
                let updatedOrg = await Organization.updateOne(orgId,{name: req.body.legalName})
                sails.log.debug('updatedOrg',updatedOrg)
            }
            else {
                sails.log.error('organization not found - detached',orgId)
                //error
                return res.status(500).json({
                    message: 'Org Not Found'
                  });
            }
            sails.log.debug('found org',orgToUpdate)
            // let updatedOrg = await 
        }

        return res.status(200).json({
            message: 'Org Info Updated', info: updatedInfo
          });
    }

};

