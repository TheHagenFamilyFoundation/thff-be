import mongoose from 'mongoose';
const { Schema } = mongoose;

const letterOfIntentInfoSchema = Schema({

  projectTitle: {
    type: String
  },
  purpose: {
    //2000 characters maximum
    type: String
  },
  projectStartDate: {
    type: Date
  },
  projectEndDate: {
    type: Date
  },
  amountRequested: {
    type: String
  },
  totalProjectCost: {
    type: String
  },
  letterOfIntent: {
    type: Schema.Types.ObjectId,
    ref: 'LetterOfIntent'
  },
  validLOIInfo: {
    type: Boolean,
    default: false
  }

}, {
  timestamps: true
});

const LetterOfIntentInfo = mongoose.model('LetterOfIntentInfo', letterOfIntentInfoSchema);
export default LetterOfIntentInfo;
