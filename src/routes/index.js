import fileUpload from 'express-fileupload';

import HealthRouter from './health.js'
import ApiRouter from './api.js'

import SubmissionYearRouter from './submission-year.js'

export default (app) => {

  app.use(fileUpload())

    .use(HealthRouter)
    .use(ApiRouter)

  //submission years
  app.use('/submission-year', SubmissionYearRouter);

}
