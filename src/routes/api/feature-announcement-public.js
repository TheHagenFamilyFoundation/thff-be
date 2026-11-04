import { Router } from 'express';
import { listFeatureAnnouncements } from '../../controllers/feature-announcements.js';

const router = new Router();

router.get('/', listFeatureAnnouncements);

export default router;
