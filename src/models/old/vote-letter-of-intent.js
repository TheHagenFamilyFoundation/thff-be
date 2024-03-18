import mongoose from 'mongoose';
const { Schema } = mongoose;

const voteLetterOfIntentSchema = Schema({

  letterOfIntent: {
    type: Schema.Types.ObjectId,
    ref: 'LetterOfIntent'
  },
  userID: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  voteType: {
    type: String

    //possible values
    //President
    //Director

  },
  vote: {
    type: Number,
    default: 1

    //president
    //possible values
    //1-yes
    //2-no

    //director
    //-1 - no vote
    //0-no
    //1-maybe
    //2-yes

  }

}, {
  timestamps: true
});

const VoteLetterOfIntent = mongoose.model('VoteLetterOfIntent', voteLetterOfIntentSchema);
export default VoteLetterOfIntent;
