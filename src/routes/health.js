import { Router } from "express";

import Logger from "../utils/logger.js";

import HealthController from '../controllers/health.js'

const router = new Router();

router.get('/', (req, res) => {
  Logger.verbose('Base Route');
  return res.send('THFF Backend')
})
  //health and status
  .get('/health', HealthController.health)
  .get('/status', HealthController.status);

export default router;
