import mongoose from 'mongoose';
const { Schema } = mongoose;

const outboundEmailSchema = Schema({
  type: {
    type: String,
    enum: ['solicitation', 'grant_notification'],
    required: true,
  },
  to: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  sentBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  referralCode: {
    type: Schema.Types.ObjectId,
    ref: 'ReferralCode',
  },
  meeting: {
    type: Schema.Types.ObjectId,
    ref: 'Meeting',
  },
  organization: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
  },
  organizationName: {
    type: String,
  },
  recipientName: {
    type: String,
  },
  /** Plain-text main body used to build solicitation (for resend / audit). */
  solicitationMessagePlain: {
    type: String,
    maxlength: 50000,
  },
  amountGranted: {
    type: Number,
  },
  proposalTitle: {
    type: String,
  },
  proposal: {
    type: Schema.Types.ObjectId,
    ref: 'Proposal',
  },
  allocation: {
    type: Schema.Types.ObjectId,
  },
  /** Full rendered HTML as sent (for preview in app) */
  htmlBody: {
    type: String,
  },
  mailgunMessageId: {
    type: String,
  },
  resendOf: {
    type: Schema.Types.ObjectId,
    ref: 'OutboundEmail',
  },
}, {
  timestamps: true,
});

outboundEmailSchema.index({ sentBy: 1, createdAt: -1 });
outboundEmailSchema.index({ meeting: 1, type: 1, createdAt: -1 });
outboundEmailSchema.index({ meeting: 1, type: 1, proposal: 1, createdAt: -1 });
outboundEmailSchema.index({ meeting: 1, type: 1, allocation: 1, createdAt: -1 });
outboundEmailSchema.index({ referralCode: 1, createdAt: -1 });

const OutboundEmail = mongoose.model('OutboundEmail', outboundEmailSchema);
export default OutboundEmail;
