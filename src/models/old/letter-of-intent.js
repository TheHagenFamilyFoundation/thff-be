import mongoose from 'mongoose';
const { Schema } = mongoose;

const letterOfIntentSchema = Schema({
  name: {
    type: String,
    // required: 'true',
    unique: true, // Yes unique one
  },
  description: {
    type: String,
  },
  letterOfIntentID: {
    type: String,
  },
  organization: {
    type: Schema.Types.ObjectId,
    ref: 'Organization'
  },
  userID: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  submitted: {
    type: Boolean,
    default: false,
  },
  submittedOn: {
    type: Date,
  },
  info: {
    type: Schema.Types.ObjectId,
    ref: 'LetterOfIntentInfo'
  },
  status: {
    type: Number,
    default: 1,

    // values:
    // 1-created
    // 2-submitted
    // 3-under review //where people are looking at it
    // 4-reviewed //done reviewing - we'll release the full proposal
    // 5-not selected //not for second round <-- everything that didn't make it to full proposal
    // 6-need some indicator for second round - show the full proposal link

  },
  votes: [{
    type: Schema.Types.ObjectId,
    ref: 'VoteLetterOfIntent'
  }],
  openFp: {
    type: Boolean,
    default: false,

    // set to true for full proposal
    // set status to 6 - 2 routes

  },
  submissionYear: {
    type: Schema.Types.ObjectId,
    ref: 'SubmissionYear'
  },


}, {
  timestamps: true
});

const LetterOfIntent = mongoose.model('LetterOfIntent', letterOfIntentSchema);
export default LetterOfIntent;
