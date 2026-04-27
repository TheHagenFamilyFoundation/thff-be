/**
 * Lists each organization.users[].user ref and whether a User document exists.
 *
 * From repo root (thff-be), with DATABASE_URI set:
 *
 *   node --env-file=.env.development src/scripts/audit-org-members.js 65dff064c8b67ab4a79fe350
 *
 * If "NO DOCUMENT" appears, that ObjectId is not in the `users` collection for this DB
 * (deleted user, wrong DB, or bad ref) — not an application join bug.
 */

import mongoose from 'mongoose';
import Config from '../config/config.js';
import { resolveMembershipUserObjectId } from '../utils/organization-membership.js';
import { Organization, User } from '../models/index.js';

const uri = Config.databaseURI;
if (!uri) {
  console.error(
    'DATABASE_URI is not set. Example:\n' +
      '  node --env-file=.env.development src/scripts/audit-org-members.js <organizationId>',
  );
  process.exit(1);
}

const orgId = process.argv[2];
if (!orgId) {
  console.error('Usage: node --env-file=... src/scripts/audit-org-members.js <organizationId>');
  process.exit(1);
}

await mongoose.connect(uri);

const lean = await Organization.findById(orgId).select('name users createdAt').lean();
if (!lean) {
  console.error('Organization not found:', orgId);
  await mongoose.disconnect();
  process.exit(1);
}

const rows = Array.isArray(lean.users) ? lean.users : [];
const oids = [];
for (const r of rows) {
  const oid = resolveMembershipUserObjectId(r?.user);
  if (oid) {
    oids.push(oid);
  }
}

const found =
  oids.length > 0
    ? await User.find({ _id: { $in: oids } })
        .select('_id email firstName lastName')
        .lean()
    : [];
const byId = new Map(found.map((u) => [String(u._id), u]));

console.log('Organization:', lean.name);
console.log('_id:', String(lean._id));
console.log('createdAt:', lean.createdAt);
console.log('membership rows:', rows.length);
console.log('');

for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  const oid = resolveMembershipUserObjectId(r?.user);
  const idStr = oid ? oid.toString() : null;
  const u = idStr ? byId.get(idStr) : null;
  console.log(`--- member index ${i} ---`);
  console.log('  membership subdoc _id:', r?._id != null ? String(r._id) : '(none)');
  console.log('  stored user ref (normalized):', idStr ?? '(missing or invalid)');
  console.log('  joinedAt:', r?.joinedAt ?? '(none)');
  console.log(
    '  User collection:',
    u ? `${u.email} | ${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() : 'NO DOCUMENT',
  );
}

console.log('');
console.log('Summary:');
console.log('  refs that normalize to ObjectId:', oids.length);
console.log('  User docs found for those ids:', found.length);
if (oids.length !== found.length) {
  const foundSet = new Set(found.map((u) => String(u._id)));
  const missing = [...new Set(oids.map((o) => o.toString()))].filter((s) => !foundSet.has(s));
  console.log('  ids with no User row:', missing);
}

await mongoose.disconnect();
