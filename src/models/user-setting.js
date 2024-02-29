import mongoose from 'mongoose';
const { Schema } = mongoose;

const userSettingSchema = Schema({
  scheme: {
    type: String,
    default: "light",
  },
  userID: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
}, {
  timestamps: true
});

const UserSetting = mongoose.model('UserSetting', userSettingSchema);
export default UserSetting;
