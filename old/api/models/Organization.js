/**
 * Organizations.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {
  schema: true,

  attributes: {
    name: {
      type: "string",
      unique: true
      // required: 'true',
    },
    director: {
      type: "string",
      // required: 'true'
    },
    description: {
      type: "string",
    },
    users: {
      collection: "user",
      via: "organizations",
    },
    lois: {
      collection: "loi",
      via: "organization",
    },
    organizationID: {
      type: "string",
    },
    info: {
      collection: "organizationInfo",
      via: "organization",
    },
    doc501c3: {
      collection: "org501c3",
      via: "organization",
    },
    proposals: {
      collection: "proposal",
      via: "organization",
    },
  },
};
