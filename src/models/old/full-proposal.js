import mongoose from 'mongoose';
const { Schema } = mongoose;

const fullProposalSchema = Schema({
  organization: {
    type: Schema.Types.ObjectId,
    ref: 'Organization'
  },
  letterOfIntent: {
    type: Schema.Types.ObjectId,
    ref: 'LetterOfIntent'
  },
  fullProposalID: {
    type: String,
    unique: true,
  },
  executiveSummary: {
    type: String,
  },
  targetPopulation: {
    type: String,
  },
  goals: {
    type: String,
  },
  activity: {
    type: Number,
    defaultsTo: 1,
    // values
    // 1-new
    // 2-ongoing
  },
  timeTable: {
    type: String,
  },
  partners: {
    type: String,
  },
  differ: {
    // differs from other projects in organization and outside
    type: String,
  },
  involve: {
    type: String,
  },
  staff: {
    type: String,
  },
  strategy: {
    type: String,
  },
  evaluation: {
    type: String,
  },
  dissemination: {
    type: String,
  },
  active: {
    type: String,
  },
  priority: {
    type: String,
  },
  history: {
    type: String,
  },
  website: {
    type: String,
  },
  submitted: {
    type: Boolean,
    defaultsTo: false,
  },
  submittedOn: {
    type: Date,
  },
  status: {
    type: Number,
    defaultsTo: 1,

    // values:
    // 1-created
    // 2- submitted
    // 3-under review //where people are looking at it
    // 4-reviewed //done reviewing - we'll release the full proposal
    // 5-declined //not for second round
    // 6-need some indicator for second round - show the full proposal link

  },
  fullProposalItems: [{
    type: Schema.Types.ObjectId,
    ref: "FullProposalItem",
  }],
}, {
  timestamps: true
});

const FullProposal = mongoose.model('FullProposal', fullProposalSchema);
export default FullProposal;
