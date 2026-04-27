/**
 * Explains / fixes mismatch between organization.users[].user and real User docs.
 *
 * Typical case: org.users holds dead ObjectIds while User.find({ organizations: orgId })
 * has the real accounts (e.g. accepted invites created different _ids than legacy slots).
 *
 * Usage:
 *   node --env-file=.env.development src/scripts/reconcile-org-memberships.js <orgMongoId>
 *   node --env-file=.env.development src/scripts/reconcile-org-memberships.js <orgMongoId> --apply
 *
 * Without --apply: prints plan only. With --apply: rewrites org.users to the union described below.
 */

import mongoose from 'mongoose';
import Config from '../config/config.js';
import { Organization, User } from '../models/index.js';
import { resolveMembershipUserObjectId } from '../utils/organization-membership.js';
import { ensureMembershipsBackfilledForOrganization } from '../utils/organization-membership-store.js';

const uri = Config.databaseURI;
if (!uri) {
  console.error('DATABASE_URI missing (use --env-file=...)');
  process.exit(1);
}

const orgIdArg = process.argv[2];
const apply = process.argv.includes('--apply');

if (!orgIdArg || orgIdArg.startsWith('-')) {
  console.error(
    'Usage: node ... reconcile-org-memberships.js <organizationMongoId> [--apply]',
  );
  process.exit(1);
}

await mongoose.connect(uri);

const org = await Organization.findById(orgIdArg);
if (!org) {
  console.error('Organization not found:', orgIdArg);
  await mongoose.disconnect();
  process.exit(1);
}

const linkedUsers = await User.find({ organizations: org._id })
  .select('_id email createdAt')
  .lean();

/** @type {Map<string, { user: mongoose.Types.ObjectId, joinedAt: Date }>} */
const byUserId = new Map();

for (const m of org.users || []) {
  const oid = resolveMembershipUserObjectId(m.user);
  if (!oid) {
    continue;
  }
  const exists = await User.exists({ _id: oid });
  if (!exists) {
    console.log('DROP dangling ref (no User doc):', oid.toString());
    continue;
  }
  const key = oid.toString();
  const joinedAt =
    m.joinedAt instanceof Date ? m.joinedAt : m.joinedAt ? new Date(m.joinedAt) : new Date();
  byUserId.set(key, { user: oid, joinedAt });
}

for (const u of linkedUsers) {
  const key = String(u._id);
  if (byUserId.has(key)) {
    continue;
  }
  const joinedAt = u.createdAt instanceof Date ? u.createdAt : new Date();
  console.log('ADD from user.organizations (missing on org):', key, u.email);
  byUserId.set(key, { user: u._id, joinedAt });
}

const nextUsers = [...byUserId.values()];

console.log('\n--- Summary ---');
console.log('Current org.users length:', (org.users || []).length);
console.log('Linked users (organizations includes org):', linkedUsers.length);
console.log('After reconcile length:', nextUsers.length);
console.log(
  'Next member user ids:',
  nextUsers.map((x) => String(x.user)),
);

if (apply) {
  org.users = nextUsers;
  await org.save();
  await ensureMembershipsBackfilledForOrganization(orgIdArg);
  console.log('\nApplied: organization.users updated; organizationmemberships synced.');
} else {
  console.log('\nDry run only. Pass --apply to write.');
}

await mongoose.disconnect();
