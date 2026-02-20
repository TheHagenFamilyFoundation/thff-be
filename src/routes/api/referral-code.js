import { Router } from "express";
import * as ReferralCodeController from '../../controllers/referral/referral-codes.js';

const router = new Router();

router.post('/', ReferralCodeController.createReferralCode);
router.get('/', ReferralCodeController.getMyReferralCodes);
router.get('/my-sponsor', ReferralCodeController.getMySponsor);
router.put('/my-sponsor', ReferralCodeController.setMyReferralCode);
router.put('/:id/toggle', ReferralCodeController.deactivateReferralCode);
router.get('/validate/:code', ReferralCodeController.validateReferralCode);

export default router;
