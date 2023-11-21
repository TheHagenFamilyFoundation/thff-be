import appConfig from '../../package.json' assert { type: 'json' }

const Config = {
  nodeEnv: (process.env.NODE_ENV || 'development'),
  appEnv: process.env.APP_ENV,
  appName: appConfig.name,
  appPort: (process.env.APP_PORT || 1337),
  appURL: process.env.APP_URL || 'http://localhost:1337',
  appVersion: appConfig.version,
  appSecretKey: process.env.SECRET_KEY,

  //mongodb
  databaseURI: process.env.DATABASE_URI,

  //AWS
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
  region: process.env.REGION,
  endpoint: process.env.ENDPOINT,
}

export default Config;
