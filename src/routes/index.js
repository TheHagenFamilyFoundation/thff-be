import fileUpload from 'express-fileupload';
import path from 'path';
import os from 'os';

import HealthRouter from './health.js'
import ApiRouter from './api.js'

export default (app) => {

  app.use(fileUpload({
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    abortOnLimit: true,
    useTempFiles: true,
    tempFileDir: path.join(os.tmpdir(), 'thff-uploads'),
  }))

    .use(HealthRouter)
    .use(ApiRouter)

}
