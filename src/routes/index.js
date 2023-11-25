import HealthController from '../controllers/health.js'

export default (app) => {
  app.get('/health', HealthController.health);
}
