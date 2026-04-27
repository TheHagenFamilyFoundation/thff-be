import mongoose from 'mongoose';
import { User } from '../models/index.js';
import Logger from './logger.js';

/**
 * Helpers for organization.users: supports legacy [ObjectId] and
 * [{ user: ObjectId, joinedAt: Date }].
 */

/**
 * Normalize `membership.user` (ObjectId, 24-char hex string, or populated user shape)
 * to a BSON ObjectId for queries against the `users` collection. Returns null if unusable.
 * Populate + `User.find` both match on `_id`; this keeps lookups consistent.
 * @param {unknown} ref
 * @returns {import('mongoose').Types.ObjectId|null}
 */
export function resolveMembershipUserObjectId(ref) {
  if (ref == null || ref === '') {
    return null;
  }
  if (ref instanceof mongoose.Types.ObjectId) {
    return ref;
  }
  if (typeof ref === 'object' && ref !== null) {
    const nested = /** @type {{ _id?: unknown }} */ (ref)._id;
    if (nested != null && nested !== ref) {
      return resolveMembershipUserObjectId(nested);
    }
  }
  const s = typeof ref === 'string' ? ref.trim() : String(ref).trim();
  if (!/^[a-f0-9]{24}$/i.test(s)) {
    return null;
  }
  try {
    return new mongoose.Types.ObjectId(s);
  } catch {
    return null;
  }
}

/**
 * Opt-in diagnostics for GET organization member resolution.
 * Set `DEBUG_ORG_USERS=1` in the environment, fetch one org, then read server logs.
 *
 * Interpreting output:
 * - `existsInUserCollection: false` — stored ref has no `users` row (deleted / bad id). Populate is correct to return null.
 * - `existsInUserCollection: true` but `afterPopulateUserIsNull: true` — rare; indicates populate or ref mismatch worth investigating.
 * - `storedUserId: null` — membership subdoc has no `user` field in MongoDB.
 *
 * @param {string|import('mongoose').Types.ObjectId} organizationId
 * @param {unknown[]|undefined} rawRows — lean `org.users` from DB (before populate)
 * @param {import('mongoose').Document|undefined} orgAfterHydrate — document after populate + hydrate
 * @param {Record<string, unknown>|undefined} finalPayload — API body after format + recover + merge
 */
export async function logOrganizationUserFetchDiagnostics(
  organizationId,
  rawRows,
  orgAfterHydrate,
  finalPayload,
) {
  if (process.env.DEBUG_ORG_USERS !== '1') {
    return;
  }
  const memberships = orgAfterHydrate?.users;
  const raw = Array.isArray(rawRows) ? rawRows : [];
  const out = Array.isArray(finalPayload?.users) ? finalPayload.users : [];
  const mem = Array.isArray(memberships) ? memberships : [];

  const rawIds = [];
  for (const r of raw) {
    if (r && typeof r === 'object' && r.user != null) {
      const oid = resolveMembershipUserObjectId(r.user);
      if (oid) {
        rawIds.push(oid);
      }
    }
  }
  const existingUsers = rawIds.length
    ? await User.find({ _id: { $in: rawIds } }).select('_id email').lean()
    : [];
  const existingSet = new Set(existingUsers.map((u) => String(u._id)));

  const len = Math.max(mem.length, raw.length, out.length);
  const perIndex = [];
  for (let i = 0; i < len; i++) {
    const m = mem[i];
    const r = raw[i];
    const o = out[i];
    const rawId = r?.user != null ? String(r.user) : null;
    perIndex.push({
      index: i,
      storedUserId: rawId,
      existsInUserCollection: rawId ? existingSet.has(rawId) : false,
      afterPopulateUserIsNull: m == null || m?.user == null,
      afterPopulateEmail: m?.user?.email ?? null,
      responseEmail: o?.email ?? null,
      responseMissingAccountUserId: o?.missingAccountUserId ?? null,
    });
  }

  const storedIds = perIndex.map((p) => p.storedUserId).filter(Boolean);
  const missingInDb = [...new Set(storedIds)].filter((id) => !existingSet.has(id));

  Logger.info('[DEBUG_ORG_USERS] organization member pipeline', {
    organizationId: String(organizationId),
    counts: {
      membershipSubdocs: mem.length,
      rawLeanRows: raw.length,
      responseUserRows: out.length,
      storedRefsWithUserField: storedIds.length,
      userDocumentsFoundForRefs: existingUsers.length,
    },
    storedUserIdsWithNoUserDocument: missingInDb,
    perIndex,
  });
}

/**
 * Populate sometimes leaves `user` as an unexpanded ObjectId, or a doc without
 * email in edge cases. Load User by id so API clients always get email/name when the user exists.
 * @param {import('mongoose').Document} organization
 */
export async function hydrateOrganizationMembershipUsers(organization) {
  if (!organization?.users?.length) {
    return;
  }
  for (let i = 0; i < organization.users.length; i++) {
    const membership = organization.users[i];
    const raw = membership.user;
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
        if (typeof membership.set === 'function') {
          membership.set('user', full);
        } else {
          membership.user = full;
        }
      }
    } catch {
      /* leave ref as-is */
    }
  }
}

/**
 * @param {unknown} entry
 * @returns {string|null}
 */
export function membershipUserId(entry) {
  if (entry == null) {
    return null;
  }
  if (typeof entry === 'object' && entry.user != null) {
    const oid = resolveMembershipUserObjectId(entry.user);
    return oid != null ? oid.toString() : null;
  }
  const oid = resolveMembershipUserObjectId(entry);
  return oid != null ? oid.toString() : null;
}

/**
 * @param {unknown[]} orgUsers
 * @param {import('mongoose').Types.ObjectId|string} userId
 */
export function organizationHasUser(orgUsers, userId) {
  const s = userId.toString();
  return (orgUsers || []).some((u) => membershipUserId(u) === s);
}

/**
 * Migrates legacy org.users: [ObjectId, ...] to [{ user, joinedAt }, ...].
 * @param {import('mongoose').Document} organization
 * @returns {Promise<boolean>} true if migration ran
 */
export async function migrateOrganizationUsersToMemberships(organization) {
  if (!organization?.users?.length) {
    return false;
  }
  const first = organization.users[0];
  if (first && typeof first === 'object' && first.user != null) {
    return false;
  }
  const fallbackDate = organization.createdAt || new Date();
  organization.users = organization.users.map((entry) => ({
    user: entry.user ?? entry._id ?? entry,
    joinedAt: fallbackDate,
  }));
  await organization.save();
  return true;
}

/**
 * Flatten populated memberships to user objects with joinedOrganizationAt for API clients.
 * @param {import('mongoose').Document|object} orgDoc
 */
export function formatOrganizationUsersForApi(orgDoc) {
  const o =
    orgDoc && typeof orgDoc.toObject === 'function'
      ? orgDoc.toObject({ virtuals: true })
      : { ...orgDoc };
  if (!Array.isArray(o.users) || o.users.length === 0) {
    return o;
  }
  // Flatten each membership independently. Old code gated on `first.user` and
  // skipped the entire array — clients then saw `{ user, joinedAt }` rows with no email.
  o.users = o.users.map((m) => {
    if (m == null || typeof m !== 'object') {
      return m;
    }

    const isMembershipDoc =
      Object.prototype.hasOwnProperty.call(m, 'joinedAt') &&
      Object.prototype.hasOwnProperty.call(m, 'user');

    if (!isMembershipDoc) {
      return m;
    }

    // Populate may set `user` to null when the User doc is missing — do not emit
    // `_id: null` (breaks clients). Raw ids are recovered via recoverOrgUsersFromRawMemberships.
    if (m.user == null) {
      return {
        email: null,
        firstName: '',
        lastName: '',
        joinedOrganizationAt: m.joinedAt,
      };
    }

    const u = m.user;
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
      joinedOrganizationAt: m.joinedAt,
    };
  });
  return o;
}

/**
 * When Mongoose populate nulls missing users, `toObject()` loses the ref id. Use a lean
 * `users` snapshot (same array order, taken before populate) to re-resolve User docs.
 * @param {Record<string, unknown>} payload — output of formatOrganizationUsersForApi
 * @param {unknown[]|undefined} rawUsersRows — `org.users` from `.select('users').lean()` before populate
 */
export async function recoverOrgUsersFromRawMemberships(payload, rawUsersRows) {
  if (!payload || !Array.isArray(payload.users) || !Array.isArray(rawUsersRows)) {
    return;
  }
  const n = Math.min(payload.users.length, rawUsersRows.length);
  const ids = [];
  const indicesByIdStr = new Map();

  for (let i = 0; i < n; i++) {
    const row = payload.users[i];
    const raw = rawUsersRows[i];
    if (!raw || typeof raw !== 'object' || raw.user == null) {
      continue;
    }

    const email = row && typeof row === 'object' ? row.email : null;
    const hasEmail = email != null && String(email).trim() !== '';
    if (hasEmail) {
      continue;
    }

    const oid = resolveMembershipUserObjectId(raw.user);
    if (oid == null) {
      continue;
    }
    const idStr = oid.toString();
    if (!indicesByIdStr.has(idStr)) {
      indicesByIdStr.set(idStr, []);
      ids.push(oid);
    }
    indicesByIdStr.get(idStr).push(i);
  }

  if (!ids.length) {
    return;
  }

  const found = await User.find({ _id: { $in: ids } })
    .select('email firstName lastName')
    .lean();
  const byId = new Map(found.map((u) => [String(u._id), u]));

  for (const [idStr, indices] of indicesByIdStr) {
    const full = byId.get(idStr);
    if (!full) {
      continue;
    }
    for (const i of indices) {
      const raw = rawUsersRows[i];
      payload.users[i] = {
        ...full,
        joinedOrganizationAt:
          raw?.joinedAt ?? payload.users[i]?.joinedOrganizationAt,
      };
    }
  }

  // If there is still no email, surface the stored user id so support can verify
  // `db.users.find({ _id: ObjectId("…") })` — usually the account was deleted.
  for (let i = 0; i < n; i++) {
    const row = payload.users[i];
    const raw = rawUsersRows[i];
    if (!row || typeof row !== 'object' || !raw || typeof raw !== 'object' || raw.user == null) {
      continue;
    }
    const email = row.email;
    const hasEmail = email != null && String(email).trim() !== '';
    if (hasEmail) {
      if ('missingAccountUserId' in row) {
        delete row.missingAccountUserId;
      }
      continue;
    }
    const oid = resolveMembershipUserObjectId(raw.user);
    const ref = raw.user;
    row.missingAccountUserId =
      oid != null
        ? oid.toString()
        : ref && typeof ref === 'object' && typeof ref.toString === 'function'
          ? ref.toString()
          : String(ref);
  }
}

/**
 * After `formatOrganizationUsersForApi`, merge User name/email for any member row
 * that still has no email but has an `_id` (Mongoose subdoc hydration may not survive `toObject()`).
 * @param {Record<string, unknown>} payload
 */
export async function mergeUserProfilesOntoOrgUsersPayload(payload) {
  if (!payload || !Array.isArray(payload.users)) {
    return;
  }
  const ids = [];
  for (const row of payload.users) {
    if (!row || typeof row !== 'object' || row._id == null) {
      continue;
    }
    const email = row.email;
    if (email != null && String(email).trim() !== '') {
      continue;
    }
    const oid = resolveMembershipUserObjectId(row._id);
    if (oid != null) {
      ids.push(oid);
    }
  }
  if (!ids.length) {
    return;
  }
  const found = await User.find({ _id: { $in: ids } })
    .select('email firstName lastName')
    .lean();
  const byId = new Map(found.map((u) => [String(u._id), u]));
  payload.users = payload.users.map((row) => {
    if (!row || typeof row !== 'object' || row._id == null) {
      return row;
    }
    const email = row.email;
    if (email != null && String(email).trim() !== '') {
      return row;
    }
    const u = byId.get(String(row._id));
    if (!u) {
      return row;
    }
    return { ...row, ...u };
  });
}

/**
 * `organization.users` and `user.organizations` can drift (legacy bad refs, partial writes).
 * Drop empty placeholder rows (no resolvable user), then append any User who lists this org
 * on `organizations` but was missing from the flattened `users` list so GET org matches reality.
 *
 * @param {Record<string, unknown>} payload — org JSON after format + recover + merge
 */
export async function reconcileOrganizationPayloadUsersWithLinkedProfiles(payload) {
  if (!payload?._id || !Array.isArray(payload.users)) {
    return;
  }
  const orgId = payload._id;

  payload.users = payload.users.filter((row) => {
    if (!row || typeof row !== 'object') {
      return false;
    }
    const hasId = row._id != null && String(row._id).trim() !== '';
    const hasEmail = row.email != null && String(row.email).trim() !== '';
    const hasName =
      (row.firstName != null && String(row.firstName).trim() !== '') ||
      (row.lastName != null && String(row.lastName).trim() !== '');
    return hasId || hasEmail || hasName;
  });

  const seen = new Set(
    payload.users.map((r) => (r._id != null ? String(r._id) : '')).filter(Boolean),
  );

  const linked = await User.find({ organizations: orgId })
    .select('_id email firstName lastName confirmed createdAt')
    .lean();

  for (const u of linked) {
    const id = String(u._id);
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    payload.users.push({
      ...u,
      joinedOrganizationAt: u.createdAt ?? null,
    });
  }
}
