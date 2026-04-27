import { Router } from 'express';
import * as OutboundEmailController from '../../controllers/email/outbound-emails.js';

const router = new Router();

router.get('/solicitations', OutboundEmailController.listMySolicitationEmails);
router.get('/solicitations/:id', OutboundEmailController.getSolicitationEmailById);
router.post('/solicitation/preview', OutboundEmailController.previewSolicitationEmail);
router.post('/solicitation', OutboundEmailController.sendSolicitationEmail);
router.post('/solicitation/:id/resend', OutboundEmailController.resendSolicitationEmail);

export default router;
