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
  },
  resetPassword: {
    type: Boolean,
  },
  resetTime: {
    type: Date,
  },
  encryptedPassword: {
    type: String,
  },
  accessLevel: {
    type: Number,
    default: 1,
    // 1-user
    // 2-director
    // 3-president
    // 4-admin(Logan)
  }
}, {
  timestamps: true
}
);

const User = mongoose.model('User', userSchema);
export default User;
