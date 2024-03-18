import mongoose from 'mongoose';
const { Schema } = mongoose;

const fullProposalItemSchema = Schema({

  fullProposalItemID: {
    type: String
  },
  categoryDescription: {
    type: String
  },
  amountRequestedTHFF: {
    type: String
  },
  amountRequested: {
    type: String
  },
  amountPending: {
    type: String
  },
  total: {
    type: String
  },
  fullProposal: {
    type: Schema.Types.ObjectId,
    ref: 'FullProposal'
  },

}, {
  timestamps: true
});

const FullProposalItem = mongoose.model('FullProposalItem', fullProposalItemSchema);
export default FullProposalItem;
