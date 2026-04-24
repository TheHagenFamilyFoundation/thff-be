import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Canonical org ↔ user membership (replaces relying on embedded organization.users
 * and user.organizations staying in sync).
 */
const organizationMembershipSchema = new Schema(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

organizationMembershipSchema.index({ organization: 1, user: 1 }, { unique: true });

const OrganizationMembership = mongoose.model(
  'OrganizationMembership',
  organizationMembershipSchema,
);

export default OrganizationMembership;
