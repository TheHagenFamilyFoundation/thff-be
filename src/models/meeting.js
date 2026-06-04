import mongoose from 'mongoose';
const { Schema } = mongoose;

const allocationSchema = Schema({
  proposal: {
    type: Schema.Types.ObjectId,
    ref: 'Proposal'
  },
  organization: {
    type: Schema.Types.ObjectId,
    ref: 'Organization'
  },
  amountRequested: {
    type: Number,
    default: 0
  },
  amountGranted: {
    type: Number,
    default: 0
  },
  /** When false, proposal stays on the meeting but is set aside (not in the active deliberation list). */
  activeInMeeting: {
    type: Boolean,
    default: true
  }
}, { _id: true });

const meetingSchema = Schema({
  meetingID: {
    type: String
  },
  submissionYear: {
    type: Schema.Types.ObjectId,
    ref: 'SubmissionYear'
  },
  year: {
    type: Number
  },
  totalBudget: {
    type: Number,
    default: 0
  },
  originalBudget: {
    type: Number,
    default: 0
  },
  totalAllocated: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['setup', 'in_progress', 'completed'],
    default: 'setup'
  },
  allocations: [allocationSchema],
  startedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  completedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  completedAt: {
    type: Date
  },
  notes: {
    type: String
  },
  /** Audit log: budget changes, grant edits, set aside / restore. */
  events: [{
    type: {
      type: String,
      enum: ['budget_changed', 'grant_changed', 'set_aside', 'restored'],
      required: true,
    },
    at: {
      type: Date,
      default: Date.now,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    allocation: {
      type: Schema.Types.ObjectId,
    },
    proposalTitle: String,
    organizationName: String,
    fromBudget: Number,
    toBudget: Number,
    fromAmount: Number,
    toAmount: Number,
  }],
  archived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const Meeting = mongoose.model('Meeting', meetingSchema);
export default Meeting;
