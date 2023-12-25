import HealthController from '../controllers/health.js'
import AuthRouter from './auth.js'
import UserRouter from './user.js'

export default (app) => {
  //health
  app.get('/health', HealthController.health);
  app.post('/ping', HealthController.ping);

  //auth
  app.use('/auth', AuthRouter);

  //user
  app.use('/user', UserRouter);
}
