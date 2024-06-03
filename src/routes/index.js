import fileUpload from 'express-fileupload';

// import Logger from '../utils/logger.js';

import HealthRouter from './health.js'
import ApiRouter from './api.js'

export default (app) => {

  app.use(fileUpload())

    .use(HealthRouter)
    .use(ApiRouter)

}
