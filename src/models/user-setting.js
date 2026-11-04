import mongoose from 'mongoose';
const { Schema } = mongoose;

const userSettingSchema = Schema({
  scheme: {
    type: String,
    default: "light",
  },
  tablePageSize: {
    type: Number,
    default: 10,
  },
  /** May 1 soft-deadline reminders (two weeks before, and the week before). Default on. */
  emailGrantDeadlineReminders: {
    type: Boolean,
    default: true,
  },
  /** Notice that the grant portal is open, sent a week after it opens. Default on. */
  emailPortalOpenNotices: {
    type: Boolean,
    default: true,
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
