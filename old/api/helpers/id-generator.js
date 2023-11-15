const possible =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

module.exports = {
  friendlyName: "Id generator",

  description: "",

  inputs: {},

  exits: {
    success: {
      description: "All done.",
    },
  },

  fn: async function () {
    // create fpID
    let text = "";
    for (let i = 0; i < 5; i += 1) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return text;
  },
};
