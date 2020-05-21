module.exports = {


  friendlyName: 'User email exists',


  description: '',


  inputs: {
    email: {
      type: 'string',
      example: 'user@gmail.com',
      description: 'The email of the person to greet.',
      required: true,
    },
  },

  exits: {

    success: {
      outputFriendlyName: 'emailFound',
    },

  },


  async fn(inputs, exits) {
    sails.log('checking if email exits', inputs);

    sails.log.verbose('inputs', inputs.email);
    const query = {
      email: inputs.email.toLowerCase(),
    };

    const docs = await User.find(query);

    let emailFound = false;

    if (docs.length > 0) {
      emailFound = true;
    } else {
      emailFound = false;
    }

    sails.log('emailFound', emailFound);

    // All done.
    return exits.success(emailFound);
  },


};
