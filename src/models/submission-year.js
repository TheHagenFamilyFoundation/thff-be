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
  }
}, {
  timestamps: true
});

const SubmissionYear = mongoose.model('SubmissionYear', submissionYearSchema);
export default SubmissionYear;
