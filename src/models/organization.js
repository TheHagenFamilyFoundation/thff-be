import mongoose from 'mongoose';
const { Schema } = mongoose;

const organizationUserMembershipSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

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
  users: [organizationUserMembershipSchema],
  lois: [{
    type: Schema.Types.ObjectId,
    ref: 'LetterOfIntent'
  }],
  organizationID: {
    type: String,
    unique: true,
  },
  info: {
    type: Schema.Types.ObjectId,
    ref: 'OrganizationInfo'
  },
  doc501c3: { //TODO: rename
    type: Schema.Types.ObjectId,
    ref: "Organization501c3",
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
