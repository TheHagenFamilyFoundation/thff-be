import mongoose from 'mongoose';
const { Schema } = mongoose;

const submissionYearSchema = Schema({
  subID: {
    type: String
  },
  year: {
    type: Number
  },
  active: {
    type: Boolean,
    default: true
  },
  /** Idempotency: bulk “2 weeks before May 1” reminder to orgs with proposals in this year. */
  grantCycleEmailTwoWeeksBeforeSoftDeadlineSentAt: {
    type: Date,
  },
  /** Idempotency: bulk “3 days before May 1 soft deadline” reminder for orgs with open work. */
  grantCycleEmailThreeDaysBeforeSoftDeadlineSentAt: {
    type: Date,
  },
}, {
  timestamps: true
});

const SubmissionYear = mongoose.model('SubmissionYear', submissionYearSchema);
export default SubmissionYear;
