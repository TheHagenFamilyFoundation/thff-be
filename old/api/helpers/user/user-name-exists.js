module.exports = {


  friendlyName: 'User name exists',


  description: '',


  inputs: {
    username: {
      type: 'string',
      example: 'Ami',
      description: 'The name of the person to greet.',
      required: true,
    },
  },

  exits: {

    success: {
      outputFriendlyName: 'userFound',
    },

  },

  async fn(inputs, exits) {
    const query = {
      username: inputs.username.toLowerCase(),
    };

    const docs = await User.find(query);

    let userFound = false;

    if (docs.length > 0) {
      userFound = true;
    } else {
      userFound = false;
    }

    sails.log('userFound', userFound);

    // All done.
    return exits.success(userFound);
  },

};
