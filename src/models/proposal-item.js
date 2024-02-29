import mongoose from 'mongoose';
const { Schema } = mongoose;

const proposalItemSchema = Schema({
  pItemID: {
    type: String,
    unique: true
  },
  categoryDescription: {
    type: String,
  },
  amountRequestedTHFF: {
    type: Number,
  },
  amountRequested: {
    type: Number,
  },
  amountPending: {
    type: Number,
  },
  total: {
    type: Number,
  },
  prop: {
    type: Schema.Types.ObjectId,
    ref: "Proposal",
  },
}, {
  timestamps: true
});

const ProposalItem = mongoose.model('ProposalItem', proposalItemSchema);
export default ProposalItem;
