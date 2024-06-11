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
  lois: [{
    type: Schema.Types.ObjectId,
    ref: 'LetterOfIntent'
  }],
  proposals: [{
    type: Schema.Types.ObjectId,
    ref: 'Proposal'
  }]
}, {
  timestamps: true
});

const SubmissionYear = mongoose.model('SubmissionYear', submissionYearSchema);
export default SubmissionYear;
