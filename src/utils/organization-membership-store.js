import mongoose from 'mongoose';
import OrganizationMembership from '../models/organization-membership.js';
import { Organization, User } from '../models/index.js';
import {
  resolveMembershipUserObjectId,
  formatOrganizationUsersForApi,
  recoverOrgUsersFromRawMemberships,
  mergeUserProfilesOntoOrgUsersPayload,
  reconcileOrganizationPayloadUsersWithLinkedProfiles,
} from './organization-membership.js';

/**
 * Idempotent: union of valid embedded `organization.users` refs and `User.organizations`
 * containing this org → upserted into OrganizationMembership.
 * @param {string|import('mongoose').Types.ObjectId} organizationId
 */
export async function ensureMembershipsBackfilledForOrganization(organizationId) {
  const orgId = new mongoose.Types.ObjectId(String(organizationId));
  const org = await Organization.findById(orgId).select('users').lean();

  /** @type {Map<string, Date>} */
  const joinedByUser = new Map();

  const embedIds = [];
  for (const m of org?.users || []) {
    const uid = resolveMembershipUserObjectId(m?.user);
    if (!uid) {
      continue;
    }
    embedIds.push(uid);
  }
  const embedValid = embedIds.length
    ? await User.find({ _id: { $in: embedIds } }).select('_id').lean()
    : [];
  const embedValidSet = new Set(embedValid.map((u) => String(u._id)));
  for (const m of org?.users || []) {
    const uid = resolveMembershipUserObjectId(m?.user);
    if (!uid || !embedValidSet.has(String(uid))) {
      continue;
    }
    const key = String(uid);
    const jt = m.joinedAt ? new Date(m.joinedAt) : new Date();
    if (!joinedByUser.has(key) || jt < joinedByUser.get(key)) {
      joinedByUser.set(key, jt);
    }
  }

  const linked = await User.find({ organizations: orgId }).select('_id createdAt').lean();
  for (const u of linked) {
    const key = String(u._id);
    const fromUser = u.createdAt ? new Date(u.createdAt) : new Date();
    if (!joinedByUser.has(key) || fromUser < joinedByUser.get(key)) {
      joinedByUser.set(key, fromUser);
    }
  }

  for (const [uidStr, joinedAt] of joinedByUser) {
    const userOid = new mongoose.Types.ObjectId(uidStr);
    await OrganizationMembership.updateOne(
      { organization: orgId, user: userOid },
      { $setOnInsert: { organization: orgId, user: userOid, joinedAt } },
      { upsert: true },
    );
  }
}

/**
 * @param {string|import('mongoose').Types.ObjectId} organizationId
 * @param {string|import('mongoose').Types.ObjectId} userId
 * @param {Date} [joinedAt]
 */
export async function addMemberToOrganization(organizationId, userId, joinedAt = new Date()) {
  const orgOid = new mongoose.Types.ObjectId(String(organizationId));
  const userOid = new mongoose.Types.ObjectId(String(userId));
  const at = joinedAt instanceof Date ? joinedAt : new Date(joinedAt);

  await OrganizationMembership.updateOne(
    { organization: orgOid, user: userOid },
    { $setOnInsert: { organization: orgOid, user: userOid, joinedAt: at } },
    { upsert: true },
  );

  await User.updateOne({ _id: userOid }, { $addToSet: { organizations: orgOid } });

  const alreadyInEmbed = await Organization.exists({
    _id: orgOid,
    users: { $elemMatch: { user: userOid } },
  });
  if (!alreadyInEmbed) {
    await Organization.updateOne(
      { _id: orgOid },
      { $push: { users: { user: userOid, joinedAt: at } } },
    );
  }
}

/**
 * @param {string|import('mongoose').Types.ObjectId} organizationId
 * @param {string|import('mongoose').Types.ObjectId} userId
 */
export async function removeMemberFromOrganization(organizationId, userId) {
  const orgOid = new mongoose.Types.ObjectId(String(organizationId));
  const userOid = new mongoose.Types.ObjectId(String(userId));

  await OrganizationMembership.deleteOne({ organization: orgOid, user: userOid });
  await User.updateOne({ _id: userOid }, { $pull: { organizations: orgOid } });
  await Organization.updateOne({ _id: orgOid }, { $pull: { users: { user: userOid } } });
}

/**
 * @param {string|import('mongoose').Types.ObjectId} organizationId
 * @param {string|import('mongoose').Types.ObjectId} userId
 */
export async function organizationHasMember(organizationId, userId) {
  const orgOid = new mongoose.Types.ObjectId(String(organizationId));
  const userOid = new mongoose.Types.ObjectId(String(userId));
  return OrganizationMembership.exists({ organization: orgOid, user: userOid });
}

/**
 * Populate gaps on membership docs (same idea as hydrateOrganizationMembershipUsers).
 * @param {import('mongoose').Document[]} memberships
 */
export async function hydrateMembershipDocuments(memberships) {
  if (!Array.isArray(memberships)) {
    return;
  }
  for (const doc of memberships) {
    const raw = doc.user;
    if (raw == null) {
      continue;
    }
    if (typeof raw === 'object' && raw !== null && raw.email) {
      continue;
    }
    const id = resolveMembershipUserObjectId(raw);
    if (id == null) {
      continue;
    }
    try {
      const full = await User.findById(id).select('email firstName lastName').lean();
      if (full) {
        if (typeof doc.set === 'function') {
          doc.set('user', full);
        } else {
          doc.user = full;
        }
      }
    } catch {
      /* leave */
    }
  }
}

/**
 * Flatten membership documents to the same `users[]` shape the API already returns.
 * @param {import('mongoose').Document[]} memberships
 */
export function formatMembershipRowsForApi(memberships) {
  if (!Array.isArray(memberships)) {
    return [];
  }
  return memberships.map((m) => {
    const lean = typeof m.toObject === 'function' ? m.toObject() : m;
    const u = lean.user;
    if (u == null) {
      return {
        email: null,
        firstName: '',
        lastName: '',
        joinedOrganizationAt: lean.joinedAt,
      };
    }
    let userObj;
    if (u && typeof u === 'object' && typeof u.toObject === 'function') {
      userObj = u.toObject();
    } else if (u && typeof u === 'object' && u._id) {
      userObj = { ...u };
    } else {
      userObj = { _id: u };
    }
    return {
      ...userObj,
      joinedOrganizationAt: lean.joinedAt,
    };
  });
}

/**
 * Full org JSON for API responses (single GET + add/remove member payloads).
 * Caller should run `migrateOrganizationUsersToMemberships` on the org doc first when loading legacy embeds.
 *
 * @param {string|import('mongoose').Types.ObjectId} organizationId
 * @returns {Promise<null|{ payload: Record<string, unknown>, rawMembershipRows: unknown[], memberships: unknown[] }>}
 */
export async function loadOrganizationApiPayload(organizationId) {
  await ensureMembershipsBackfilledForOrganization(organizationId);

  const rawMembershipRows = await OrganizationMembership.find({ organization: organizationId })
    .select('user joinedAt')
    .lean();

  const memberships = await OrganizationMembership.find({ organization: organizationId })
    .populate({ path: 'user', model: 'User' })
    .sort({ joinedAt: 1 });

  await hydrateMembershipDocuments(memberships);

  const org = await Organization.findById(organizationId)
    .populate('info')
    .populate({
      path: 'proposals',
      options: { limit: 10 },
    })
    .populate('doc501c3');

  if (!org) {
    return null;
  }

  const payload = formatOrganizationUsersForApi(org);
  payload.users = formatMembershipRowsForApi(memberships);
  await recoverOrgUsersFromRawMemberships(payload, rawMembershipRows);
  await mergeUserProfilesOntoOrgUsersPayload(payload);
  await reconcileOrganizationPayloadUsersWithLinkedProfiles(payload);

  return { payload, rawMembershipRows, memberships };
}
