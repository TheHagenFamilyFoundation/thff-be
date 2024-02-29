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

    }


};

