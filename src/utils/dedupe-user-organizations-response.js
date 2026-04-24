import User from '../models/user.js';

function organizationEntryKey(entry) {
  if (entry == null) {
    return null;
  }
  if (typeof entry === 'object' && entry._id != null) {
    return String(entry._id);
  }
  return String(entry);
}

/**
 * `user.organizations` can hold duplicate ObjectIds; `populate('organizations')` then returns
 * duplicate org documents. Collapse to unique `_id` on the in-memory user document.
 *
 * Optionally persists unique ObjectIds to Mongo when duplicates were removed.
 *
 * @param {import('mongoose').Document|null|undefined} user
 * @param {{ persist?: boolean }} [options]
 */
export async function dedupePopulatedUserOrganizations(user, options = {}) {
  if (!user?.organizations?.length) {
    return;
  }
  const { persist = false } = options;
  const beforeLen = user.organizations.length;
  const seen = new Set();
  const out = [];
  for (const entry of user.organizations) {
    const key = organizationEntryKey(entry);
    if (!key || key === 'undefined') {
      continue;
    }
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(entry);
  }
  user.organizations = out;

  if (persist && out.length < beforeLen) {
    const uniqueIds = out.map((o) => o?._id).filter(Boolean);
    if (uniqueIds.length === out.length) {
      await User.updateOne({ _id: user._id }, { $set: { organizations: uniqueIds } });
    }
  }
}
