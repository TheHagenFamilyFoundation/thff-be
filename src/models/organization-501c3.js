import mongoose from 'mongoose';
const { Schema } = mongoose;

const organization501c3Schema = Schema({
  fileName: {
    type: String,
  },
  url: {
    type: String,
  },
  organization: {
    type: Schema.Types.ObjectId,
    ref: 'Organization'
  },
  status: {
    type: Number,
    default: 1

    //multiple values
    //1-created
    //2-accepted
    //3-needs changes //needs work

  }
}, {
  timestamps: true
});

const Organization501c3 = mongoose.model('Organization501c3', organization501c3Schema);
export default Organization501c3;
