import { S3Client } from '@aws-sdk/client-s3';

import Config from './config.js';
import Logger from '../utils/logger.js';

/** Mitigate GHSA-j965-2qgj-vjmq: reject unexpected region strings before SDK use. */
function assertSafeAwsRegion(region) {
  const r = String(region || '').trim();
  if (!/^[a-z]{2}-[a-z0-9-]+-\d{1}$/.test(r)) {
    throw new Error('Invalid AWS region configuration');
  }
  return r;
}

const safeRegion = assertSafeAwsRegion(Config.region);

// Only set static credentials when both are present. Omitting them lets the SDK
// fall back to the default provider chain (env vars / EC2 instance role), which
// is how deployed environments (e.g. Elastic Beanstalk) are expected to auth.
const clientConfig = { region: safeRegion };
if (Config.accessKey && Config.secretAccessKey) {
  clientConfig.credentials = {
    accessKeyId: Config.accessKey,
    secretAccessKey: Config.secretAccessKey,
  };
} else {
  Logger.warn('AWS static credentials not set; relying on default provider chain (instance role / env).');
}

const s3 = new S3Client(clientConfig);

export default s3;
