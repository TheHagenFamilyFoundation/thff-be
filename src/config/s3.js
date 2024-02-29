import AWS from "aws-sdk";
import Config from './config.js';

console.log('setting AWS')
console.log('Config.accessKey', Config.accessKey)
console.log('Config.secretAccessKey', Config.secretAccessKey)
console.log('Config.region', Config.region)

AWS.config.update({
  accessKeyId: Config.accessKey,
  secretAccessKey: Config.secretAccessKey,
  region: Config.region
});

const s3 = new AWS.S3();

export default s3;
