export const MEETING_EVENT_TYPES = {
  BUDGET_CHANGED: 'budget_changed',
  GRANT_CHANGED: 'grant_changed',
  SET_ASIDE: 'set_aside',
  RESTORED: 'restored',
};

/** @param {import('mongoose').Document} meeting */
export function appendMeetingEvent(meeting, partial) {
  if (!Array.isArray(meeting.events)) {
    meeting.events = [];
  }
  meeting.events.push({
    ...partial,
    at: partial.at ?? new Date(),
  });
  meeting.markModified('events');
}

/** Most recent budget before the current total (from audit log). */
export function previousBudgetFromEvents(meeting) {
  const events = (meeting.events || [])
    .filter((e) => e.type === MEETING_EVENT_TYPES.BUDGET_CHANGED)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  if (events.length === 0) {
    return null;
  }
  const last = events[0];
  const current = Number(meeting.totalBudget);
  if (Number.isFinite(last.toBudget) && last.toBudget === current) {
    return last.fromBudget;
  }
  return null;
}

/**
 * @param {import('mongoose').Document} meeting
 * @param {import('mongoose').Types.ObjectId} userId
 * @param {number} fromBudget
 * @param {number} toBudget
 */
export function logBudgetChanged(meeting, userId, fromBudget, toBudget) {
  appendMeetingEvent(meeting, {
    type: MEETING_EVENT_TYPES.BUDGET_CHANGED,
    user: userId,
    fromBudget,
    toBudget,
  });
}

/**
 * @param {import('mongoose').Document} meeting
 * @param {import('mongoose').Types.ObjectId} userId
 * @param {{ allocationId: import('mongoose').Types.ObjectId, proposalTitle?: string, organizationName?: string, fromAmount: number, toAmount: number }} ctx
 */
export function logGrantChanged(meeting, userId, ctx) {
  appendMeetingEvent(meeting, {
    type: MEETING_EVENT_TYPES.GRANT_CHANGED,
    user: userId,
    allocation: ctx.allocationId,
    proposalTitle: ctx.proposalTitle || 'Untitled',
    organizationName: ctx.organizationName || '',
    fromAmount: ctx.fromAmount,
    toAmount: ctx.toAmount,
  });
}

export function logSetAside(meeting, userId, ctx) {
  appendMeetingEvent(meeting, {
    type: MEETING_EVENT_TYPES.SET_ASIDE,
    user: userId,
    allocation: ctx.allocationId,
    proposalTitle: ctx.proposalTitle || 'Untitled',
    organizationName: ctx.organizationName || '',
    fromAmount: ctx.fromAmount,
    toAmount: 0,
  });
}

export function logRestored(meeting, userId, ctx) {
  appendMeetingEvent(meeting, {
    type: MEETING_EVENT_TYPES.RESTORED,
    user: userId,
    allocation: ctx.allocationId,
    proposalTitle: ctx.proposalTitle || 'Untitled',
    organizationName: ctx.organizationName || '',
  });
}
