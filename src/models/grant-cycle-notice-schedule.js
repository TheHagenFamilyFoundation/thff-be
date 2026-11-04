import mongoose from 'mongoose';
const { Schema } = mongoose;

/** Per-year overrides for when the automatic grant-cycle emails send. */
const grantCycleNoticeScheduleSchema = new Schema({
  year: {
    type: Number,
    required: true,
    unique: true,
  },
  portalOpenOn: {
    type: Date,
  },
  twoWeeksOn: {
    type: Date,
  },
  weekOfOn: {
    type: Date,
  },
}, {
  timestamps: true,
});

const GrantCycleNoticeSchedule = mongoose.model('GrantCycleNoticeSchedule', grantCycleNoticeScheduleSchema);
export default GrantCycleNoticeSchedule;
