import mongoose from 'mongoose';
const { Schema } = mongoose;

const proposalSchema = Schema({
  organization: {
    type: Schema.Types.ObjectId,
    ref: 'Organization'
  },
  proposalID: {
    type: String,
  },
  //   Project Title
  projectTitle: {
    type: String,
  },
  // Purpose
  purpose: {
    //2000 characters maximum
    type: String,
  },
  // Goals
  goals: {
    type: String,
  },
  // Project Narrative - Describe, in detail, the project with emphasis on the following: (1) description of any partners in the project; (2) key staff; (3) involvement of constituents; (4) strategy for long term funding; and (5) plans for evaluation and dissemination.
  narrative: {
    type: String,
    //4000 characters, a big piece
  },
  // Timetable
  timeTable: {
    type: String,
  },
  // Amount Requested
  amountRequested: {
    type: Number,
  },
  // Total Project Cost
  totalProjectCost: {
    type: Number,
  },
  itemizedBudget: {
    type: String,
  },
  votes: [{
    type: Schema.Types.ObjectId,
    ref: 'Vote'
  }],
  score: {
    type: 'number',
    default: 0,
  },
  sponsor: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
}, {
  timestamps: true
});

const Proposal = mongoose.model('Proposal', proposalSchema);
export default Proposal;
