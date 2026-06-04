/**
 * Run grant-cycle reminder tasks (draft 24h; May 1 soft-deadline emails to orgs with proposals in the active year).
 *
 *   node --env-file=.env.development src/scripts/run-grant-cycle-emails.js
 *
 * Disabled by default. Set GRANT_CYCLE_EMAILS_ENABLED=true when ready to schedule
 * daily in production (e.g. cron 12:05 UTC) via `npm run grant-cycle-emails`.
 */

import mongoose from 'mongoose';
import Config from '../config/config.js';
import { runAllGrantCycleEmailTasks } from '../jobs/grant-cycle-emails.js';

const uri = Config.databaseURI;
if (!uri) {
  console.error('DATABASE_URI is not set.');
  process.exit(1);
}

await mongoose.connect(uri);
try {
  const summary = await runAllGrantCycleEmailTasks();
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await mongoose.disconnect();
}
