/**
 * Org501c3Controller
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

module.exports = {

  validate501c3: async function (req, res) {

    sails.log("validate501c3");

    sails.log(req.body)

    let message = req.body.message;
    let doc501c3Id = req.body.id;

    sails.log('valid')

    sails.log('id', doc501c3Id)

    var doc501c3 = await Org501c3.find({ id: doc501c3Id })

    if (doc501c3) {
      sails.log('doc501c3', doc501c3)

      var updatedOrg501c3 = await Org501c3.update({ id: doc501c3Id })
        .set({ status: req.body.message })
        .fetch();

      sails.log(`Updated 501c3 document id: ${updatedOrg501c3[0].id} to status ${updatedOrg501c3[0].status}`)
      sails.log(updatedOrg501c3);

    }
    else {
      //exit
      return res.status(400).json({ message: "501c3 not found" });

    }

    return res.status(200).json({ change: "501c3 Validated", message: message });

  },

  async migrate(req, res) {

    sails.log('migrating organization 501c3s');

    let organization501c3s = await Org501c3.find().populate('organization');
    const length = organization501c3s.length;
    sails.log('length', length);

    const newOrganization501c3s = [];
    organization501c3s.forEach((organization501c3) => {
      console.log('organization501c3', organization501c3)
      if (organization501c3?.organization?.id) {
        const newOrganization501c3 = {
          _id: organization501c3.id,
          createdAt: organization501c3.createdAt,
          updatedAt: organization501c3.updatedAt,
          fileName: organization501c3.fileName,
          url: organization501c3.url,
          status: organization501c3.status,
          organization: organization501c3.organization.id,
        };

        newOrganization501c3s.push(newOrganization501c3);
      }
    });
    const afterLength = newOrganization501c3s.length;
    sails.log('afterLength', afterLength);
    return res.status(200).json(newOrganization501c3s);
  }


};

