import mongoose from 'mongoose';
const { Schema } = mongoose;

const inviteSchema = Schema({
  email: {
    type: String,
    required: true,
  },
  organization: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
  },
  invitedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'cancelled'],
    default: 'pending',
  },
}, {
  timestamps: true
});

// Compound index: one pending invite per email per org
inviteSchema.index({ email: 1, organization: 1, status: 1 });

const Invite = mongoose.model('Invite', inviteSchema);
export default Invite;
