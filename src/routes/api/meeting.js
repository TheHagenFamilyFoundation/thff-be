import { Router } from "express";

import * as MeetingController from '../../controllers/admin/meetings.js';
import {
  validateCreateMeeting,
  validateUpdateMeeting,
  validateUpdateAllocations
} from '../../validators/meetings.js';

const router = new Router();

router.get('/', MeetingController.getMeetings);
router.get('/:id', MeetingController.getMeeting);
router.get('/:id/summary', MeetingController.getMeetingSummary);
router.post('/', validateCreateMeeting, MeetingController.createMeeting);
router.put('/:id', validateUpdateMeeting, MeetingController.updateMeeting);
router.put('/:id/allocations', validateUpdateAllocations, MeetingController.updateAllocations);
router.put('/:id/complete', MeetingController.completeMeeting);
router.put('/:id/reopen', MeetingController.reopenMeeting);
router.put('/:id/archive', MeetingController.archiveMeeting);
router.delete('/:id/allocation/:allocationId', MeetingController.removeAllocation);

export default router;
