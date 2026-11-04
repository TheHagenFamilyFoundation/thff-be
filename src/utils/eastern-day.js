const EASTERN_TIME_ZONE = 'America/New_York';

/** Milliseconds to add to a UTC instant to get the Eastern wall clock. */
function easternOffsetMs(instant) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: EASTERN_TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const value = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      value[part.type] = part.value;
    }
  }
  const wallAsUtc = Date.UTC(
    Number(value.year),
    Number(value.month) - 1,
    Number(value.day),
    Number(value.hour) % 24,
    Number(value.minute),
    Number(value.second),
  );
  const instantSeconds = Date.UTC(
    instant.getUTCFullYear(),
    instant.getUTCMonth(),
    instant.getUTCDate(),
    instant.getUTCHours(),
    instant.getUTCMinutes(),
    instant.getUTCSeconds(),
  );
  return wallAsUtc - instantSeconds;
}

function parseDay(yyyyMmDd) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(yyyyMmDd || ''));
  if (!match) {
    return null;
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function instantForWallClock(year, month, day, hour, minute, second, ms) {
  const wall = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  let instant = wall - easternOffsetMs(new Date(wall));
  const corrected = wall - easternOffsetMs(new Date(instant));
  if (corrected !== instant) {
    instant = corrected;
  }
  return new Date(instant);
}

/** Start of the calendar day in Eastern time. */
export function startOfEasternDay(yyyyMmDd) {
  const day = parseDay(yyyyMmDd);
  if (!day) {
    return null;
  }
  return instantForWallClock(day.year, day.month, day.day, 0, 0, 0, 0);
}

/** End of the calendar day in Eastern time. */
export function endOfEasternDay(yyyyMmDd) {
  const day = parseDay(yyyyMmDd);
  if (!day) {
    return null;
  }
  return instantForWallClock(day.year, day.month, day.day, 23, 59, 59, 999);
}
