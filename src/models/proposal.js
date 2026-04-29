import mongoose from 'mongoose';
const { Schema } = mongoose;

const proposalSchema = Schema({
  organization: {
    type: Schema.Types.ObjectId,
    ref: 'Organization'
  },
  proposalID: {
    type: String,
    unique: true
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
  archived: {
    type: Boolean,
    default: false,
  },
  /**
   * `draft` / `ready_to_submit` = composer (hidden from director lists until submitted).
   * `ready_to_submit` = all required fields filled; user must still click submit.
   */
  status: {
    type: String,
    enum: ['draft', 'ready_to_submit', 'submitted'],
    default: 'submitted',
  },
  /** User who created the row (for draft reminder emails). */
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  /** When the 24h “still a draft” reminder was sent (only for status `draft`). */
  draftReminderSentAt: {
    type: Date,
  },
}, {
  timestamps: true
});

/** Speeds director org list year filter: distinct(organization) with createdAt range. */
proposalSchema.index({ createdAt: 1, organization: 1 });
/** Look up in-progress drafts per organization. */
proposalSchema.index({ organization: 1, status: 1 });

const Proposal = mongoose.model('Proposal', proposalSchema);
export default Proposal;
