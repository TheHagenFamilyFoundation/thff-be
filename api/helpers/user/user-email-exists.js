module.exports = {


  friendlyName: 'User email exists',


  description: '',


  inputs: {
    email: {
      type: 'string',
      example: 'user@gmail.com',
      description: 'The email of the person to greet.',
      required: true
    }
  },

  exits: {

    success: {
      outputFriendlyName: 'emailFound',
    },

  },


  fn: async function (inputs, exits) {

    sails.log('inputs', inputs)

    var docs = await User.find({ email: inputs.email })

    var emailFound = false;

    if (docs.length > 0) {
      emailFound = true;
    }
    else {
      emailFound = false;
    }

    sails.log('emailFound', emailFound)

    // All done.
    return exits.success(emailFound);

  }


};

