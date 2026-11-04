import mongoose from 'mongoose';
const { Schema } = mongoose;

const featureAnnouncementSchema = new Schema({
  /** Stable id so the seed can be run again without creating a second row. */
  key: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    required: true,
  },
  linkLabel: {
    type: String,
  },
  link: {
    type: String,
  },
  queryParams: {
    type: Schema.Types.Mixed,
  },
  /** Inclusive start, stored as the beginning of that Eastern day. */
  startsOn: {
    type: Date,
    required: true,
  },
  /** Inclusive end, stored as the end of that Eastern day. */
  endsOn: {
    type: Date,
    required: true,
  },
  /**
   * Users who should see this in the bell.
   * Empty means every signed-in user, which is how older notices were sent.
   */
  recipients: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
}, {
  timestamps: true,
});

const FeatureAnnouncement = mongoose.model('FeatureAnnouncement', featureAnnouncementSchema);
export default FeatureAnnouncement;
