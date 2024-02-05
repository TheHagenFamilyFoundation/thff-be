import fileUpload from 'express-fileupload';

import HealthController from '../controllers/health.js'
import AuthRouter from './auth.js'

import AuthnMiddleware from '../middlewares/authn.js'

import UserRouter from './user.js'

import OrganizationRouter from './organization.js'
import OrganizationInfoRouter from './organization-info.js'
import Organization501c3Router from './organization-501c3.js'

export default (app) => {

  app.use(fileUpload());

  //health
  app.get('/health', HealthController.health);
  app.post('/ping', HealthController.ping);

  //auth
  app.use('/auth', AuthRouter);

  app.use(AuthnMiddleware.authenticateToken);

  //user
  app.use('/user', UserRouter);

  //organization
  app.use('/organization', OrganizationRouter);

  //organization-info
  app.use('/organization-info', OrganizationInfoRouter);

  //organization 501c3
  app.use('/organization-501c3', Organization501c3Router);
}
