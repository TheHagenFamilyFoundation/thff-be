import mongoose from 'mongoose';
const { Schema } = mongoose;

/** Short lock so a retried schedule does not start a second email run. */
const jobLockSchema = new Schema({
  key: {
    type: String,
    required: true,
    unique: true,
  },
  lockedUntil: {
    type: Date,
    required: true,
  },
}, {
  timestamps: true,
});

const JobLock = mongoose.model('JobLock', jobLockSchema);
export default JobLock;
