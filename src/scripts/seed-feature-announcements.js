/**
 * Insert the scheduled home-page notices if they are not already stored.
 *
 *   node --env-file=.env.development src/scripts/seed-feature-announcements.js
 */

import mongoose from 'mongoose';
import Config from '../config/config.js';
import FeatureAnnouncement from '../models/feature-announcement.js';
import { endOfEasternDay, startOfEasternDay } from '../utils/eastern-day.js';

const NOTICES = [
  {
    key: 'grant-email-notices-2027',
    title: 'Email notices start this year',
    body: 'Organizations will receive an email when the grant portal opens, and a reminder if they have a draft or submitted proposal this year. You can change those email notices on your user settings page.',
    linkLabel: 'Open notification settings',
    link: '/pages/profile',
    queryParams: { tab: 'settings', panel: 'notifications' },
    startsOn: startOfEasternDay('2027-01-01'),
    endsOn: endOfEasternDay('2027-02-14'),
  },
];

const uri = Config.databaseURI;
if (!uri) {
  console.error('DATABASE_URI is not set.');
  process.exit(1);
}

await mongoose.connect(uri);
try {
  for (const notice of NOTICES) {
    const existing = await FeatureAnnouncement.findOne({ key: notice.key }).select('_id').lean();
    if (existing) {
      console.log(`kept ${notice.key}`);
      continue;
    }
    await FeatureAnnouncement.create(notice);
    console.log(`created ${notice.key}`);
  }
} finally {
  await mongoose.disconnect();
}
