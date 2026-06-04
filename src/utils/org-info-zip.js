/**
 * Normalize organization-info `zip` for writes.
 * Legacy clients and Mongo may still send/store numbers; we persist strings.
 *
 * @param {unknown} zip
 * @returns {string|null|undefined}
 */
export function coerceOrgInfoZipForStorage(zip) {
  if (zip === null || zip === undefined) {
    return zip;
  }
  return String(zip).trim();
}
