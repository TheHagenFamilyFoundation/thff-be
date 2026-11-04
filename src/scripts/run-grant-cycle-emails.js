/**
 * Run grant-cycle reminder tasks.
 *
 *   node --env-file=.env.development src/scripts/run-grant-cycle-emails.js
 *   node --env-file=.env.development src/scripts/run-grant-cycle-emails.js --dry-run --force=all
 *   node --env-file=.env.development src/scripts/run-grant-cycle-emails.js --trial-to=you@example.com --force=portal-open,two-weeks,week-of
 *
 * Live sends stay off until GRANT_CYCLE_EMAILS_ENABLED=true.
 * --dry-run counts recipients and does not send or write.
 * --trial-to sends one copy of each selected template to that address only.
 * --force skips the calendar window. It requires --dry-run or --trial-to.
 *
 * Force keys: draft-24h, two-weeks, week-of, portal-open, all
 */

import mongoose from 'mongoose';
import Config from '../config/config.js';
import { runAllGrantCycleEmailTasks } from '../jobs/grant-cycle-emails.js';

const FORCE_KEYS = new Set(['draft-24h', 'two-weeks', 'week-of', 'portal-open', 'all']);

function parseArgs(argv) {
  const options = {
    dryRun: false,
    trialTo: '',
    force: new Set(),
  };
  for (const arg of argv) {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--trial-to=')) {
      options.trialTo = arg.slice('--trial-to='.length).trim();
    } else if (arg.startsWith('--force=')) {
      for (const part of arg.slice('--force='.length).split(',')) {
        const key = part.trim();
        if (!key) {
          continue;
        }
        if (!FORCE_KEYS.has(key)) {
          console.error(`Unknown --force key "${key}". Use ${[...FORCE_KEYS].join(', ')}.`);
          process.exit(1);
        }
        options.force.add(key);
      }
    } else {
      console.error(`Unknown argument "${arg}".`);
      process.exit(1);
    }
  }
  return options;
}

const options = parseArgs(process.argv.slice(2));
if (options.force.size > 0 && !options.dryRun && !options.trialTo) {
  console.error('--force only runs with --dry-run or --trial-to, so a trial cannot mail the full list.');
  process.exit(1);
}
if (options.dryRun && options.trialTo) {
  console.error('Use either --dry-run or --trial-to, not both.');
  process.exit(1);
}

const uri = Config.databaseURI;
if (!uri) {
  console.error('DATABASE_URI is not set.');
  process.exit(1);
}

await mongoose.connect(uri);
try {
  const summary = await runAllGrantCycleEmailTasks({
    dryRun: options.dryRun,
    trialTo: options.trialTo || null,
    force: options.force,
  });
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await mongoose.disconnect();
}
