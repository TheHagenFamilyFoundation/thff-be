/**
 * Seed submitted proposals for testing meeting setup (search, sort, pagination, add/remove).
 *
 * Usage:
 *   node --env-file=.env.development src/scripts/seed-meeting-test-proposals.js --year=2025 --count=40
 *   node --env-file=.env.development src/scripts/seed-meeting-test-proposals.js --year=2025 --count=40 --create-orgs=8
 *   node --env-file=.env.development src/scripts/seed-meeting-test-proposals.js --year=2025 --count=20 --meeting-id=<mongoId>
 *
 * Options:
 *   --year=N          Submission year (createdAt spread across this calendar year). Default: current year.
 *   --count=N         Number of proposals to create. Default: 40.
 *   --create-orgs=N   If fewer than N organizations exist, create test orgs (no users attached).
 *   --meeting-id=ID   After seeding, sync eligible proposals onto this meeting (president flow).
 *   --dry-run         Print plan only; no writes.
 */

import mongoose from 'mongoose';
import Config from '../config/config.js';
import { Organization, OrganizationInfo, Proposal, Meeting } from '../models/index.js';
import { generateCode } from '../utils/util.js';
import { COMPOSER_PROPOSAL_STATUSES } from '../utils/proposal-composer-status.js';

const uri = Config.databaseURI;
if (!uri) {
  console.error('DATABASE_URI missing (use --env-file=...)');
  process.exit(1);
}

function parseArg(name, fallback = null) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  if (hit) return hit.slice(prefix.length);
  if (process.argv.includes(`--${name}`) && fallback === true) return true;
  return fallback;
}

const year = Number(parseArg('year', new Date().getFullYear()));
const count = Math.max(1, Number(parseArg('count', 40)) || 40);
const minOrgs = Math.max(1, Number(parseArg('create-orgs', 0)) || 0);
const meetingId = parseArg('meeting-id', null);
const dryRun = process.argv.includes('--dry-run');

if (!Number.isFinite(year) || year < 2000 || year > 2100) {
  console.error('Invalid --year');
  process.exit(1);
}

const TEST_ORG_PREFIX = 'Meeting Test Org';

async function uniqueProposalId() {
  for (let attempt = 0; attempt < 20; attempt++) {
    const id = generateCode();
    const exists = await Proposal.exists({ proposalID: id });
    if (!exists) return id;
  }
  throw new Error('Could not generate unique proposalID');
}

async function ensureOrganizations(createOrgs) {
  let orgs = await Organization.find().select('_id name organizationID proposals').limit(200).lean();

  if (!createOrgs && orgs.length === 0) {
    throw new Error(
      'No organizations in the database. Create some in the app or pass --create-orgs=N',
    );
  }

  if (!createOrgs || orgs.length >= createOrgs) {
    return orgs;
  }

  const need = createOrgs - orgs.length;
  console.log(`Creating ${need} test organization(s)…`);

  for (let i = 0; i < need; i++) {
    const suffix = `${Date.now()}-${i}`;
    const legalName = `${TEST_ORG_PREFIX} ${suffix}`;
    const organizationID = generateCode();
    const organizationInfoID = generateCode();

    if (dryRun) {
      console.log(`  [dry-run] would create org "${legalName}"`);
      continue;
    }

    const createdOrg = await Organization.create({
      name: legalName,
      organizationID,
      description: 'Auto-created for meeting stepper testing',
      users: [],
      proposals: [],
    });

    const info = await OrganizationInfo.create({
      organizationInfoID,
      legalName,
      yearFounded: 2010,
      currentOperatingBudget: 250000,
      director: 'Test Director',
      phone: '555-0100',
      contactPerson: 'Test Contact',
      contactPersonTitle: 'Director',
      contactPersonPhoneNumber: '555-0101',
      email: `meeting-test-${suffix}@example.com`,
      address: '123 Test St',
      city: 'Testville',
      state: 'MI',
      zip: '48000',
      organization: createdOrg._id,
    });

    createdOrg.info = info._id;
    await createdOrg.save();
    orgs.push(createdOrg.toObject());
  }

  return orgs;
}

function randomCreatedAtInYear(y) {
  const start = Date.UTC(y, 0, 1);
  const end = Date.UTC(y, 11, 31, 23, 59, 59);
  const t = start + Math.floor(Math.random() * (end - start));
  return new Date(t);
}

async function syncMeeting(meetingId) {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    throw new Error(`Meeting not found: ${meetingId}`);
  }

  const startDate = new Date(`${meeting.year}-01-01T00:00:00.000Z`);
  const endDate = new Date(`${meeting.year}-12-31T23:59:59.999Z`);

  const eligible = await Proposal.find({
    createdAt: { $gte: startDate, $lte: endDate },
    $or: [{ archived: false }, { archived: { $exists: false } }],
    status: { $nin: COMPOSER_PROPOSAL_STATUSES },
  }).select('_id organization amountRequested');

  const existingIds = new Set(
    meeting.allocations.map((a) => (a.proposal && a.proposal.toString()) || '').filter(Boolean),
  );

  let added = 0;
  for (const p of eligible) {
    const pid = p._id.toString();
    if (existingIds.has(pid) || !p.organization) continue;
    meeting.allocations.push({
      proposal: p._id,
      organization: p.organization,
      amountRequested: p.amountRequested || 0,
      amountGranted: 0,
      activeInMeeting: true,
    });
    existingIds.add(pid);
    added++;
  }

  if (added > 0) {
    await meeting.save();
  }
  return { meetingYear: meeting.year, added, total: meeting.allocations.length };
}

await mongoose.connect(uri);

try {
  const orgs = await ensureOrganizations(minOrgs);

  if (!orgs.length) {
    console.error('No organizations available. Create orgs in the app or use --create-orgs=N');
    process.exit(1);
  }

  console.log(`Year: ${year}, proposals to create: ${count}, organizations: ${orgs.length}${dryRun ? ' (dry-run)' : ''}`);

  let created = 0;
  for (let n = 1; n <= count; n++) {
    const org = orgs[(n - 1) % orgs.length];
    const proposalID = dryRun ? `dry${n}` : await uniqueProposalId();
    const amountRequested = 5000 + Math.floor(Math.random() * 495000);
    const doc = {
      proposalID,
      organization: org._id,
      projectTitle: `Meeting test proposal #${n} (${year})`,
      purpose: 'Seeded for meeting stepper QA.',
      goals: 'Exercise pagination, search, sort, add, and remove.',
      narrative: 'Auto-generated test data.',
      timeTable: 'Q1–Q4',
      amountRequested,
      totalProjectCost: amountRequested + 10000,
      itemizedBudget: 'Test line items',
      // score is derived from director votes during the voting phase; leave at default 0.
      status: 'submitted',
      archived: false,
    };

    if (dryRun) {
      console.log(`  [dry-run] ${doc.projectTitle} → org ${org.name}`);
      created++;
      continue;
    }

    const createdAt = randomCreatedAtInYear(year);
    const proposal = await Proposal.create({ ...doc, createdAt, updatedAt: createdAt });
    await Organization.updateOne(
      { _id: org._id },
      { $addToSet: { proposals: proposal._id } },
    );
    created++;
  }

  console.log(`Created ${created} submitted proposal(s) for ${year}.`);

  if (meetingId) {
    if (dryRun) {
      console.log(`[dry-run] would sync meeting ${meetingId}`);
    } else {
      const sync = await syncMeeting(meetingId);
      console.log(
        `Meeting ${meetingId} (year ${sync.meetingYear}): added ${sync.added} allocation(s), ${sync.total} total on meeting.`,
      );
    }
  } else {
    console.log(
      'Tip: open a setup meeting for this year and use “sync eligible proposals”, or re-run with --meeting-id=<id>.',
    );
  }
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
