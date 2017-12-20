/**
 * GrantController
 *
 * @description :: Server-side logic for managing grants
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {
	getGrants: function(req,res){
        sails.log("getGrants");


        res.send(200);
    }
};

