import crypto from 'crypto';
import Config from '../../config/config.js';
import Logger from '../../utils/logger.js';
import { JobLock } from '../../models/index.js';
import { runAllGrantCycleEmailTasks } from '../../jobs/grant-cycle-emails.js';

const LOCK_KEY = 'grant-cycle-emails';
const LOCK_MS = 30 * 60 * 1000;

function authorized(req) {
  const expected = String(Config.grantCycleJobSecret || '');
  const provided = String(req.get('x-grant-cycle-secret') || '');
  if (!expected || !provided) {
    return false;
  }
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

async function acquireLock() {
  const now = new Date();
  const lockedUntil = new Date(Date.now() + LOCK_MS);
  try {
    await JobLock.create({ key: LOCK_KEY, lockedUntil });
    return true;
  } catch (err) {
    if (err?.code !== 11000) {
      throw err;
    }
  }
  const updated = await JobLock.findOneAndUpdate(
    { key: LOCK_KEY, lockedUntil: { $lte: now } },
    { $set: { lockedUntil } },
    { new: true },
  );
  return !!updated;
}

async function releaseLock() {
  await JobLock.updateOne({ key: LOCK_KEY }, { $set: { lockedUntil: new Date() } });
}

/** EventBridge calls this once each morning. Sending stays off until the env flag is on. */
export const runGrantCycleEmails = async (req, res) => {
  if (!authorized(req)) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  try {
    const acquired = await acquireLock();
    if (!acquired) {
      return res.status(202).json({ started: false, reason: 'already_running' });
    }
  } catch (err) {
    Logger.error(`grant-cycle lock failed: ${err.message}`);
    return res.status(500).json({ message: 'Could not start the email job' });
  }

  res.status(202).json({ started: true });
  try {
    const summary = await runAllGrantCycleEmailTasks();
    Logger.info(`grant-cycle emails finished: ${JSON.stringify(summary)}`);
  } catch (err) {
    Logger.error(`grant-cycle emails failed: ${err.message}`);
  } finally {
    try {
      await releaseLock();
    } catch (err) {
      Logger.error(`grant-cycle lock release failed: ${err.message}`);
    }
  }
};
