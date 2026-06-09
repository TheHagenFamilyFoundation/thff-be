import { Router } from 'express';

import * as ReferralCodeController from '../../controllers/referral/referral-codes.js';

const router = new Router();

// Public GET — used by sign-in / sign-up before authentication
router.get('/validate/:code', ReferralCodeController.validateReferralCode);

export default router;
