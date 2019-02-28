module.exports = {


  friendlyName: 'User name exists',


  description: '',


  inputs: {
    username: {
      type: 'string',
      example: 'Ami',
      description: 'The name of the person to greet.',
      required: true
    }
  },

  exits: {

    success: {
      outputFriendlyName: 'userFound',
    },

  },

  fn: async function (inputs, exits) {

    var docs = await User.find({ username: inputs.username })

    var userFound = false;

    if (docs.length > 0) {
      userFound = true;
    }
    else {
      userFound = false;
    }

    sails.log('userFound', userFound)

    // All done.
    return exits.success(userFound);

  }

};

