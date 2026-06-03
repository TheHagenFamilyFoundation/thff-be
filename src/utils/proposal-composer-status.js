/**
 * Composer proposals use status `draft` (incomplete) or `ready_to_submit` (all required fields filled).
 * Final `submitted` is set when the applicant submits for review.
 */

/**
 * Status values that must not appear in director / grant-year proposal lists.
 * New grant meetings also exclude these when building initial allocations (`createMeeting` in meetings.js).
 */
export const COMPOSER_PROPOSAL_STATUSES = ['draft', 'ready_to_submit'];

export function isProposalBodyComplete(p) {
  const strings = ['projectTitle', 'purpose', 'goals', 'narrative', 'timeTable', 'itemizedBudget'];
  for (const k of strings) {
    const v = p[k];
    if (v == null || String(v).trim() === '') {
      return false;
    }
  }
  const ar = p.amountRequested;
  const tc = p.totalProjectCost;
  if (typeof ar !== 'number' || Number.isNaN(ar) || ar < 1) {
    return false;
  }
  if (typeof tc !== 'number' || Number.isNaN(tc) || tc < 1) {
    return false;
  }
  return true;
}

/**
 * For non-submitted proposals, set `draft` vs `ready_to_submit` from field completeness.
 * @param {import('mongoose').Document} doc mongoose Proposal document
 */
export async function syncComposerProposalStatus(doc) {
  if (!doc || doc.status === 'submitted') {
    return doc;
  }
  const plain = doc.toObject ? doc.toObject() : doc;
  doc.status = isProposalBodyComplete(plain) ? 'ready_to_submit' : 'draft';
  await doc.save();
  return doc;
}
