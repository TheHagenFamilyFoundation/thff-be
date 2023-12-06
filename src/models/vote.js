import mongoose from 'mongoose';
const { Schema } = mongoose;

const voteSchema = Schema({
  prop: {
    type: Schema.Types.ObjectId,
    ref: 'Proposal'
  },
  userID: {
    type: String,
  },
  vote: {
    type: Number,
    default: -1

    //director
    //-1 - no vote
    //0-no
    //1-maybe
    //2-yes

  }
}, {
  timestamps: true
});

const Vote = mongoose.model('Vote', voteSchema);
export default Vote;
