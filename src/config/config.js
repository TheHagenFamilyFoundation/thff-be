import appConfig from '../../package.json' assert { type: 'json' }

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
  s3Path: process.env.AWS_S3_PATH
}

export default Config;
