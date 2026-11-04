import { Router } from 'express';
import {
  createFeatureAnnouncement,
  updateFeatureAnnouncement,
  deleteFeatureAnnouncement,
  manageSiteNotices,
  countNoticeRecipients,
  searchNoticeRecipients,
  sendSiteNotice,
  getGrantCycleNoticeSchedule,
  updateGrantCycleNoticeSchedule,
} from '../../controllers/feature-announcements.js';

const router = new Router();

router.get('/manage', manageSiteNotices);
router.get('/recipient-count', countNoticeRecipients);
router.get('/recipients', searchNoticeRecipients);
router.get('/schedule', getGrantCycleNoticeSchedule);
router.put('/schedule', updateGrantCycleNoticeSchedule);
router.post('/send', sendSiteNotice);
router.post('/', createFeatureAnnouncement);
router.put('/:id', updateFeatureAnnouncement);
router.delete('/:id', deleteFeatureAnnouncement);

export default router;
