import { Router } from "express";

import PingController from '../../controllers/ping.js'

const router = new Router();

router.post('/ping', PingController.ping)

export default router;
