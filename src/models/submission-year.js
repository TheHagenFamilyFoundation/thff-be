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
  /** When this year was first turned on. Portal-open mail goes out a week later. */
  openedAt: {
    type: Date,
  },
  /** Idempotency: bulk “2 weeks before May 1” reminder. */
  grantCycleEmailTwoWeeksBeforeSoftDeadlineSentAt: {
    type: Date,
  },
  /** Retired. Earlier builds sent a 3-day reminder; week-of mail uses the field below. */
  grantCycleEmailThreeDaysBeforeSoftDeadlineSentAt: {
    type: Date,
  },
  /** Idempotency: bulk “one week before May 1” reminder. */
  grantCycleEmailOneWeekBeforeSoftDeadlineSentAt: {
    type: Date,
  },
  /** Idempotency: “portal is open” mail, sent a week after openedAt. */
  grantCycleEmailPortalOpenSentAt: {
    type: Date,
  },
}, {
  timestamps: true
});

const SubmissionYear = mongoose.model('SubmissionYear', submissionYearSchema);
export default SubmissionYear;
