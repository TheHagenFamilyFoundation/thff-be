import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJsonPath = path.join(__dirname, '../../package.json');
const appConfig = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const Config = {
  nodeEnv: (process.env.NODE_ENV || 'development'),
  appEnv: process.env.APP_ENV,
  appName: appConfig.name,
  appPort: (process.env.APP_PORT || 1337),
  appURL: process.env.APP_URL || 'http://localhost:1337',
  appVersion: appConfig.version,
  // appSecretKey: process.env.SECRET_KEY,

  feURL: process.env.FE_URL || 'http://localhost:4200',

  //mongodb
  databaseURI: process.env.DATABASE_URI,

  //AWS
  accessKey: process.env.AWS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION,
  bucket: process.env.AWS_S3_BUCKET_NAME,
  s3Path: process.env.AWS_S3_PATH,

  //Mailgun
  mailgunDomain: process.env.MAILGUN_DOMAIN,
  mailgunKey: process.env.MAILGUN_KEY,
  interalEmailAddress: process.env.INTERNAL_EMAIL_ADDRESS

}

export default Config;
