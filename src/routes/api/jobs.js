import { Router } from 'express';
import { runGrantCycleEmails } from '../../controllers/jobs/grant-cycle-emails.js';

const router = new Router();

router.post('/grant-cycle-emails', runGrantCycleEmails);

export default router;
