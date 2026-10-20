// backend/src/shared/controllers/settingsController.js

import { supabaseAdmin } from '../../db/index.js';

/* ============================================================================
   SETTINGS REGISTRIES

   Each scope has ONE database row containing a JSONB object.

   User row:
     scope = 'user'
     user_id = authenticated user's profile ID
     key = 'preferences'

   System row:
     scope = 'system'
     user_id = NULL
     key = 'system'
============================================================================ */

export const DEFAULT_USER_SETTINGS = Object.freeze({
  theme: 'default',
  email_notifications: true,
  in_app_notifications: true,
  language: 'en',
});

export const DEFAULT_SYSTEM_SETTINGS = Object.freeze({
  maintenance_mode: false,
  maintenance_message:
    'We are currently undergoing maintenance. Please check back later.',
  show_dev_tools: false,
});

const USER_SETTING_RULES = Object.freeze({
  theme: {
    type: 'string',
  //  allowedValues: ['default', 'light', 'dark', 'red'],
  },
  email_notifications: {
    type: 'boolean',
  },
  in_app_notifications: {
    type: 'boolean',
  },
  language: {
    type: 'string',
    allowedValues: ['en'],
  },
});

const SYSTEM_SETTING_RULES = Object.freeze({
  maintenance_mode: {
    type: 'boolean',
  },
  maintenance_message: {
    type: 'string',
    maxLength: 1000,
  },
  show_dev_tools: {
    type: 'boolean',
  },
});

export const SCOPE_USER = 'user';
export const SCOPE_SYSTEM = 'system';

export const VALID_SCOPES = Object.freeze([
  SCOPE_USER,
  SCOPE_SYSTEM,
]);

const SETTING_KEYS = Object.freeze({
  [SCOPE_USER]: 'preferences',
  [SCOPE_SYSTEM]: 'system',
});

/* ============================================================================
   VALIDATION HELPERS
============================================================================ */

const isPlainObject = (value) => {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  if (Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
};

const getRules = (scope) => {
  if (scope === SCOPE_USER) {
    return USER_SETTING_RULES;
  }

  if (scope === SCOPE_SYSTEM) {
    return SYSTEM_SETTING_RULES;
  }

  throw new Error(`Invalid settings scope: ${scope}`);
};

const getDefaults = (scope) => {
  if (scope === SCOPE_USER) {
    return DEFAULT_USER_SETTINGS;
  }

  if (scope === SCOPE_SYSTEM) {
    return DEFAULT_SYSTEM_SETTINGS;
  }

  throw new Error(`Invalid settings scope: ${scope}`);
};

export const validateSetting = (key, value, scope = SCOPE_USER) => {
  const rules = getRules(scope);
  const rule = rules[key];

  if (!rule) {
    throw new Error(
      `Invalid setting key for scope "${scope}": ${key}`
    );
  }

  if (value === null || typeof value !== rule.type) {
    throw new Error(
      `Setting "${key}" must be of type ${rule.type}`
    );
  }

  if (
    rule.allowedValues &&
    !rule.allowedValues.includes(value)
  ) {
    throw new Error(
      `Invalid value for setting "${key}". Allowed values: ${rule.allowedValues.join(', ')}`
    );
  }

  if (
    rule.maxLength !== undefined &&
    typeof value === 'string' &&
    value.length > rule.maxLength
  ) {
    throw new Error(
      `Setting "${key}" must not exceed ${rule.maxLength} characters`
    );
  }

  return true;
};

const validateSettingsPatch = (settings, scope) => {
  if (!isPlainObject(settings)) {
    throw new Error('Settings must be a valid JSON object');
  }

  const entries = Object.entries(settings);

  if (entries.length === 0) {
    throw new Error('No settings provided');
  }

  for (const [key, value] of entries) {
    validateSetting(key, value, scope);
  }

  return settings;
};

/* ============================================================================
   DATABASE HELPERS
============================================================================ */

/**
 * Read a single settings object.
 *
 * Missing rows are normal: the defaults are returned by the public
 * functions below.
 */
const readSettingsObject = async (scope, userId = null) => {
  if (!VALID_SCOPES.includes(scope)) {
    throw new Error(`Invalid settings scope: ${scope}`);
  }

  let query = supabaseAdmin
    .from('settings')
    .select('value')
    .eq('scope', scope)
    .eq('key', SETTING_KEYS[scope]);

  if (scope === SCOPE_USER) {
    if (!userId) {
      throw new Error('user_id is required for user settings');
    }

    query = query.eq('user_id', userId);
  } else {
    query = query.is('user_id', null);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error(
      `[SETTINGS] Failed to read ${scope} settings:`,
      error
    );

    throw new Error(`Failed to fetch ${scope} settings`);
  }

  if (!data) {
    return {};
  }

  if (!isPlainObject(data.value)) {
    console.error(
      `[SETTINGS] Invalid JSONB settings object for scope "${scope}"`
    );

    throw new Error('Stored settings have an invalid format');
  }

  return data.value;
};

/**
 * Merge stored settings with defaults.
 *
 * Null values are not accepted by the update API, so stored settings
 * cannot override a default with null.
 */
const resolveSettings = (scope, storedSettings) => ({
  ...getDefaults(scope),
  ...storedSettings,
});

/**
 * Atomically merge a JSONB patch using the PostgreSQL RPC function.
 */
const mergeSettingsPatch = async ({
  scope,
  userId = null,
  patch,
  updatedBy = null,
}) => {
  if (!VALID_SCOPES.includes(scope)) {
    throw new Error(`Invalid settings scope: ${scope}`);
  }

  validateSettingsPatch(patch, scope);

  if (scope === SCOPE_USER && !userId) {
    throw new Error('user_id is required for user settings');
  }

  if (scope === SCOPE_SYSTEM && userId !== null) {
    throw new Error('user_id must be null for system settings');
  }

  const { data, error } = await supabaseAdmin.rpc(
    'upsert_settings_patch',
    {
      p_scope: scope,
      p_user_id: userId,
      p_patch: patch,
      p_updated_by: updatedBy,
    }
  );

  if (error) {
    console.error(
      `[SETTINGS] Failed to update ${scope} settings:`,
      error
    );

    throw new Error(`Failed to update ${scope} settings`);
  }

  return data;
};

/* ============================================================================
   PUBLIC SETTINGS HELPERS
============================================================================ */

export const getUserSettings = async (userId) => {
  const stored = await readSettingsObject(SCOPE_USER, userId);

  return resolveSettings(SCOPE_USER, stored);
};

export const getSystemSettings = async () => {
  const stored = await readSettingsObject(SCOPE_SYSTEM);

  return resolveSettings(SCOPE_SYSTEM, stored);
};

export const upsertUserSetting = async (
  userId,
  key,
  value,
  updatedBy = userId
) => {
  const patch = { [key]: value };

  await mergeSettingsPatch({
    scope: SCOPE_USER,
    userId,
    patch,
    updatedBy,
  });

  return getUserSettings(userId);
};

export const upsertSystemSetting = async (
  key,
  value,
  updatedBy = null
) => {
  const patch = { [key]: value };

  await mergeSettingsPatch({
    scope: SCOPE_SYSTEM,
    patch,
    updatedBy,
  });

  return getSystemSettings();
};

/* ============================================================================
   USER ENDPOINTS
============================================================================ */

/**
 * GET /settings
 *
 * Returns all effective settings for the authenticated user.
 */
export const getSettings = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const settings = await getUserSettings(req.user.id);

    return res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('[SETTINGS] getSettings:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * PATCH /settings
 *
 * Expected request:
 * {
 *   "settings": {
 *     "theme": "red",
 *     "email_notifications": false
 *   }
 * }
 *
 * Only supplied properties are changed.
 */
export const updateSettings = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const { settings } = req.body || {};

    let patch;

    try {
      patch = validateSettingsPatch(settings, SCOPE_USER);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    await mergeSettingsPatch({
      scope: SCOPE_USER,
      userId,
      patch,
      updatedBy: userId,
    });

    const updatedSettings = await getUserSettings(userId);

    return res.status(200).json({
      success: true,
      settings: updatedSettings,
    });
  } catch (error) {
    console.error('[SETTINGS] updateSettings:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * GET /settings/:key
 *
 * Returns one individual user preference.
 */
export const getSetting = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { key } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!Object.hasOwn(USER_SETTING_RULES, key)) {
      return res.status(400).json({
        success: false,
        error: `Invalid setting key: ${key}`,
      });
    }

    const settings = await getUserSettings(userId);

    return res.status(200).json({
      success: true,
      key,
      value: settings[key],
    });
  } catch (error) {
    console.error('[SETTINGS] getSetting:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * DELETE /settings/:key
 *
 * Reset a preference to its default.
 *
 * The default is represented by removing the property from the JSONB
 * object, not by deleting the entire user's settings row.
 */
export const deleteSetting = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { key } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!Object.hasOwn(USER_SETTING_RULES, key)) {
      return res.status(400).json({
        success: false,
        error: `Invalid setting key: ${key}`,
      });
    }

    const { error } = await supabaseAdmin.rpc(
      'reset_user_setting',
      {
        p_user_id: userId,
        p_key: key,
        p_updated_by: userId,
      }
    );

    if (error) {
      console.error('[SETTINGS] deleteSetting:', error);

      return res.status(500).json({
        success: false,
        error: 'Failed to reset setting',
      });
    }

    const settings = await getUserSettings(userId);

    return res.status(200).json({
      success: true,
      message: `Setting "${key}" reset to default`,
      settings,
    });
  } catch (error) {
    console.error('[SETTINGS] deleteSetting:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to reset setting',
    });
  }
};




/* ============================================================================
   SYSTEM ENDPOINTS
============================================================================ */

/**
 * PATCH /system-settings
 *
 * Expected request:
 * {
 *   "maintenance_mode": true,
 *   "show_dev_tools": false
 * }
 *
 * IMPORTANT:
 * This endpoint must be protected by administrator authorization
 * middleware in your routes.
 */
export const updateSystemSettings = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const patch = req.body || {};

    try {
      validateSettingsPatch(patch, SCOPE_SYSTEM);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    await mergeSettingsPatch({
      scope: SCOPE_SYSTEM,
      patch,
      updatedBy: req.user.id,
    });

    const settings = await getSystemSettings();

    return res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      settings,
    });
  } catch (error) {
    console.error('[SETTINGS] updateSystemSettings:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update settings',
    });
  }
};

/**
 * PATCH /system-settings/maintenance
 *
 * Expected request:
 * {
 *   "enabled": true,
 *   "message": "We will be back shortly."
 * }
 */
export const toggleMaintenance = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const { enabled, message } = req.body || {};

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: '`enabled` must be a boolean',
      });
    }

    const patch = {
      maintenance_mode: enabled,
    };

    if (message !== undefined) {
      if (typeof message !== 'string' || message.length > 1000) {
        return res.status(400).json({
          success: false,
          error: '`message` must be a string of at most 1000 characters',
        });
      }

      if (message.trim()) {
        patch.maintenance_message = message.trim();
      }
    }

    await mergeSettingsPatch({
      scope: SCOPE_SYSTEM,
      patch,
      updatedBy: req.user.id,
    });

    const settings = await getSystemSettings();

    return res.status(200).json({
      success: true,
      message: enabled
        ? 'Maintenance mode enabled'
        : 'Maintenance mode disabled',
      settings,
    });
  } catch (error) {
    console.error('[SETTINGS] toggleMaintenance:', error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to toggle maintenance mode',
    });
  }
};

/**
 * GET /system-settings/maintenance/status
 *
 * Public access is appropriate only if your application intentionally
 * exposes these system flags. Do not expose sensitive configuration.
 */
export const getMaintenanceStatus = async (req, res) => {
  try {
    const settings = await getSystemSettings();

    return res.status(200).json({
      success: true,
      maintenance_mode: settings.maintenance_mode,
      maintenance_message: settings.maintenance_message,
      show_dev_tools: settings.show_dev_tools,
    });
  } catch (error) {
    console.error('[SETTINGS] getMaintenanceStatus:', error);

    return res.status(500).json({
      success: false,
      error: 'Unable to retrieve maintenance status.',
    });
  }
};

/**
 * GET /system-settings/health
 *
 * Checks database connectivity.
 */
export const getSystemHealth = async (req, res) => {
  try {
    const { error: dbError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .limit(1);

    const health = {
      status: dbError ? 'unhealthy' : 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status: dbError ? 'unhealthy' : 'healthy',
          message: dbError ? dbError.message : 'Connected',
        },
        api: {
          status: 'healthy',
          message: 'API is running',
        },
        storage: {
          status: 'healthy',
          message: 'Storage accessibility has not been independently verified',
        },
      },
    };

    return res.status(dbError ? 503 : 200).json({
      success: !dbError,
      health,
    });
  } catch (error) {
    console.error('[SETTINGS] getSystemHealth:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to get system health',
    });
  }
};

export default {
  SCOPE_USER,
  SCOPE_SYSTEM,
  VALID_SCOPES,

  DEFAULT_USER_SETTINGS,
  DEFAULT_SYSTEM_SETTINGS,

  validateSetting,
  getUserSettings,
  upsertUserSetting,

  getSystemSettings,
  upsertSystemSetting,

  getSettings,
  updateSettings,
  getSetting,
  deleteSetting,

  updateSystemSettings,
  toggleMaintenance,
  getMaintenanceStatus,
  getSystemHealth,
};