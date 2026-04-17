import AWS from 'aws-sdk';

import Config from './config.js';

/** Mitigate GHSA-j965-2qgj-vjmq: reject unexpected region strings before SDK use. */
function assertSafeAwsRegion(region) {
  const r = String(region || '').trim();
  if (!/^[a-z]{2}-[a-z0-9-]+-\d{1}$/.test(r)) {
    throw new Error('Invalid AWS region configuration');
  }
  return r;
}

const safeRegion = assertSafeAwsRegion(Config.region);

AWS.config.update({
  accessKeyId: Config.accessKey,
  secretAccessKey: Config.secretAccessKey,
  region: safeRegion,
});

const s3 = new AWS.S3();

export default s3;
