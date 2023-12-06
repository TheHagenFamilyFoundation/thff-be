import mongoose from 'mongoose';
const { Schema } = mongoose;

const organizationSchema = Schema({
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
    ref: 'LetterOfIntent'
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

}, {
  timestamps: true
});

const Organization = mongoose.model('Organization', organizationSchema);
export default Organization;
