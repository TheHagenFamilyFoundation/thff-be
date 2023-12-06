import HealthController from '../controllers/health.js'
import AuthRouter from './auth.js'

export default (app) => {
  //health
  app.get('/health', HealthController.health);

  //auth
  app.use('/auth', AuthRouter);
}
