const mongoose = require('mongoose');
const { Schema } = mongoose;

const organizationSchema = mongoose.Schema({

  name: {
    type: String,
    unique: true,
    required: 'true',
  },
  director: {
    type: String,
  },
  description: {
    type: String,
  },
  users: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  lois: [{
    type: Schema.Types.ObjectId,
    ref: 'Loi'
  }],
  organizationID: {
    type: String,
  },
  info: {
    type: Schema.Types.ObjectId,
    ref: 'OrganizationInfo'
  },
  doc501c3: { //TODO: rename
    type: Schema.Types.ObjectId,
    ref: "Org501c3",
  },
  proposals: [{
    type: Schema.Types.ObjectId,
    ref: "Proposal",
  }],
});

var Organization = mongoose.model('Organization', organizationSchema);
export default Organization;
