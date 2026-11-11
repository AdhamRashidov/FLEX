import { Router } from 'express';
import { ImportController } from './import.controller.js';
import {
  requireAuth,
  requireRole,
  resolveTenant,
} from '../../common/middlewares/index.js';
import { UserRole } from '@flex/shared';

const router = Router();
const controller = new ImportController();

router.use(
  requireAuth,
  resolveTenant,
  requireRole(UserRole.OWNER, UserRole.MANAGER)
);

// Excel / CSV import
router.post('/excel', controller.importExcel);

// Telegram post AI parser
router.post('/telegram/parse', controller.parseTelegramPost);

// Import amallari tarixi
router.get('/jobs', controller.getJobs);
router.get('/jobs/:id', controller.getJobById);

export { router as importRoutes };
