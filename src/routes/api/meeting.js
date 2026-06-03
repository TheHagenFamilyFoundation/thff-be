import { Router } from "express";

import * as MeetingController from '../../controllers/admin/meetings.js';
import * as OutboundEmailController from '../../controllers/email/outbound-emails.js';
import {
  validateCreateMeeting,
  validateUpdateMeeting,
  validateUpdateAllocations
} from '../../validators/meetings.js';

const router = new Router();

router.get('/', MeetingController.getMeetings);
router.get('/:id', MeetingController.getMeeting);
router.get('/:id/summary', MeetingController.getMeetingSummary);
router.get('/:id/funded-contacts', MeetingController.getFundedContacts);
router.get('/:id/grant-email-proposals', OutboundEmailController.listGrantEmailProposals);
router.get('/:id/preview-grant-emails', OutboundEmailController.previewGrantMeetingNotifications);
router.post('/:id/grant-notification/preview-render', OutboundEmailController.renderGrantNotificationPreview);
router.get('/:id/outbound-emails/:emailId', OutboundEmailController.getMeetingGrantOutboundEmailById);
router.get('/:id/outbound-emails', OutboundEmailController.listMeetingOutboundEmails);
router.post('/:id/send-grant-notifications', OutboundEmailController.sendGrantMeetingNotifications);
router.post('/:id/sync-eligible-proposals', MeetingController.syncEligibleProposalsToMeeting);
router.post('/', validateCreateMeeting, MeetingController.createMeeting);
router.put('/:id', validateUpdateMeeting, MeetingController.updateMeeting);
router.put('/:id/allocations', validateUpdateAllocations, MeetingController.updateAllocations);
router.put('/:id/complete', MeetingController.completeMeeting);
router.put('/:id/archive', MeetingController.archiveMeeting);
router.delete('/:id/allocation/:allocationId', MeetingController.removeAllocation);
router.put('/:id/allocation/:allocationId/active', MeetingController.setAllocationActive);

export default router;
