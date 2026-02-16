import mongoose from 'mongoose';
const { Schema } = mongoose;

const referralCodeSchema = Schema({
  code: {
    type: String,
    unique: true,
    required: true,
  },
  director: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  label: {
    type: String,
  },
  active: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true
});

const ReferralCode = mongoose.model('ReferralCode', referralCodeSchema);
export default ReferralCode;
