/**
 * Audit OrganizationInfo.zip in MongoDB (raw BSON, no Mongoose casting).
 *
 * Flags:
 * - zip stored as number (legacy) — OK for casting to string, but may have lost leading zeros
 * - numeric zip 0 < zip < 10000 — often a 0-prefix ZIP stored wrong (e.g. 02139 → 2139)
 * - string zip that is not a valid US 5 or ZIP+4 pattern
 *
 * Usage:
 *   node --env-file=.env.development src/scripts/audit-org-info-zips.js
 *   DATABASE_URI='mongodb://...' node src/scripts/audit-org-info-zips.js
 */

import mongoose from 'mongoose';
import Config from '../config/config.js';
import OrganizationInfo from '../models/organization-info.js';

const US_ZIP = /^\d{5}(-\d{4})?$/;

const uri = Config.databaseURI;
if (!uri) {
  console.error('DATABASE_URI missing. Example:');
  console.error("  node --env-file=.env.development src/scripts/audit-org-info-zips.js");
  process.exit(1);
}

await mongoose.connect(uri);
const col = mongoose.connection.collection(OrganizationInfo.collection.collectionName);

const numericTypes = ['int', 'long', 'double', 'decimal'];
const typeOfZip = await col
  .aggregate([
    { $match: { zip: { $exists: true, $ne: null } } },
    {
      $group: {
        _id: { $type: '$zip' },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ])
  .toArray();

console.log('\n=== organizationinfos.zip by BSON type ===');
for (const row of typeOfZip) {
  console.log(`  ${row._id}: ${row.count}`);
}

const asNumber = await col
  .find({
    zip: { $exists: true, $ne: null },
    $expr: { $in: [{ $type: '$zip' }, numericTypes] },
  })
  .project({ organizationInfoID: 1, legalName: 1, zip: 1, state: 1, city: 1 })
  .limit(500)
  .toArray();

console.log(`\n=== Documents with zip stored as number (legacy): ${asNumber.length} shown (max 500) ===`);
for (const d of asNumber) {
  const z = d.zip;
  const suspicious = typeof z === 'number' && z > 0 && z < 10000;
  console.log(
    `  ${suspicious ? '⚠ ' : '  '}zip=${JSON.stringify(z)}  legalName=${d.legalName || ''}  id=${d.organizationInfoID || d._id}  ${d.city || ''}, ${d.state || ''}`,
  );
}

const suspiciousNum = await col.countDocuments({
  zip: { $exists: true, $ne: null },
  $expr: {
    $and: [
      { $in: [{ $type: '$zip' }, numericTypes] },
      { $gt: ['$zip', 0] },
      { $lt: ['$zip', 10000] },
    ],
  },
});

const totalNumericZip = await col.countDocuments({
  zip: { $exists: true, $ne: null },
  $expr: { $in: [{ $type: '$zip' }, numericTypes] },
});

console.log('\n=== Summary (numeric zip fields) ===');
console.log(`  Total org infos with numeric zip (BSON): ${totalNumericZip}`);
console.log(`  Numeric zip 0 < zip < 10000 (possible lost leading "0"): ${suspiciousNum}`);

const stringBad = await col
  .find({
    zip: { $exists: true, $ne: null, $type: 'string' },
    $expr: {
      $and: [
        { $gt: [{ $strLenCP: { $toString: '$zip' } }, 0] },
        { $not: { $regexMatch: { input: '$zip', regex: US_ZIP } } },
      ],
    },
  })
  .project({ organizationInfoID: 1, legalName: 1, zip: 1 })
  .limit(100)
  .toArray();

console.log(`\n=== String zip not matching ##### or #####-#### (max 100) ===`);
console.log(`  count (capped list): ${stringBad.length}`);
for (const d of stringBad) {
  console.log(`  zip=${JSON.stringify(d.zip)}  legalName=${d.legalName || ''}  id=${d.organizationInfoID || d._id}`);
}

await mongoose.disconnect();
console.log('\nDone.\n');
