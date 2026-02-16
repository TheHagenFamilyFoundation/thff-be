import { Router } from "express";
import * as SettingsController from '../../controllers/settings/settings.js';

const router = new Router();

router.get('/', SettingsController.getSettings);
router.put('/', SettingsController.saveSettings);

export default router;
