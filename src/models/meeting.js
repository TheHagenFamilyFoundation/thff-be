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
  archived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const Meeting = mongoose.model('Meeting', meetingSchema);
export default Meeting;
