import express from 'express';

import {
getSettings,
updateSettings,
getSetting,
deleteSetting,
getMaintenanceStatus,
toggleMaintenance,
updateSystemSettings,
getSystemHealth,
} from '../controllers/settingsController.js';

import { authenticate } from '../../middleware/auth.js';
import { isAdmin } from '../../middleware/admin.js';

export const userSettingsRouter = express.Router();
export const adminSettingsRouter = express.Router();

/*
|--------------------------------------------------------------------------

User Settings Routes
All routes require authentication.
Users can only access or modify their own settings.
*/

// Apply authentication to every user settings endpoint.
userSettingsRouter.use(authenticate);

// GET    /settings       - Get the authenticated user's settings
// PUT    /settings       - Update the authenticated user's settings
// GET    /settings/:key  - Get one of the user's settings
// DELETE /settings/:key  - Reset one of the user's settings to its default

userSettingsRouter.get('/', getSettings);
userSettingsRouter.put('/', updateSettings);
userSettingsRouter.get('/:key', getSetting);
userSettingsRouter.delete('/:key', deleteSetting);

/*
|--------------------------------------------------------------------------

System Settings / Admin Routes
Maintenance status is publicly readable.
All other routes require authentication and admin authorization.
*/

// Public endpoint: retrieve maintenance status.
adminSettingsRouter.get('/maintenance/status', getMaintenanceStatus);

// Protect all remaining admin settings endpoints.
adminSettingsRouter.use(authenticate, isAdmin);

// POST /admin/settings/maintenance/toggle
adminSettingsRouter.post('/maintenance/toggle', toggleMaintenance);

// PUT /admin/settings/settings
adminSettingsRouter.put('/settings', updateSystemSettings);

// GET /admin/settings/health
adminSettingsRouter.get('/health', getSystemHealth);