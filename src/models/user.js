import mongoose from 'mongoose';
const { Schema } = mongoose;

const userSchema = Schema({
  email: {
    type: String,
    required: 'true',
    unique: true, // Yes unique one
  },
  confirmed: {
    type: Boolean,
    default: true,
  },
  confirmCode: {
    type: String,
    select: false,
  },
  firstName: {
    type: String,
  },
  lastName: {
    type: String,
  },
  organizations: [{
    type: Schema.Types.ObjectId,
    ref: 'Organization'
  }],
  resetCode: {
    type: String,
    select: false,
  },
  resetPassword: {
    type: Boolean,
  },
  resetTime: {
    type: Date,
  },
  encryptedPassword: {
    type: String,
    select: false,
  },
  accessLevel: {
    type: Number,
    default: 1,
    // 1-user
    // 2-director
    // 3-president
    // 4-admin(Logan)
  },
  referralCode: {
    type: String,
  },
}, {
  timestamps: true,
  toJSON: {
    transform(_doc, ret) {
      delete ret.encryptedPassword;
      delete ret.confirmCode;
      delete ret.resetCode;
      return ret;
    },
  },
}
);

const User = mongoose.model('User', userSchema);
export default User;
