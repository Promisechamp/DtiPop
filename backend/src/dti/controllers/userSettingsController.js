import { supabase } from '../../db/index.js';


// Valid setting keys and their expected types (for validation)
const VALID_SETTINGS = {
  theme: { type: 'string', default: 'default' },
  email_notifications: { type: 'boolean', default: true },
  in_app_notifications: { type: 'boolean', default: true },
  language: { type: 'string', default: 'en' },
		show_dev_tools: { type: 'boolean', default: false },
  // add more as needed
};

// ──────────────────────────────────────────────
// HELPERS (exported for possible reuse)
// ──────────────────────────────────────────────

/**
 * Validate that a setting key is allowed and the value has the correct type.
 */
export const validateSetting = (key, value) => {
  if (!VALID_SETTINGS[key]) {
    throw new Error(`Invalid setting key: ${key}`);
  }
  const expectedType = VALID_SETTINGS[key].type;
  if (typeof value !== expectedType) {
    throw new Error(`Setting "${key}" must be of type ${expectedType}`);
  }
  return true;
};

/**
 * Get all settings for a user as a plain object.
 */
export const getUserSettings = async (userId) => {
  const { data, error } = await supabase
    .from('user_settings')
    .select('key, value')
    .eq('user_id', userId);

  if (error) {
    console.error('Supabase error fetching settings:', error);
    throw new Error('Failed to fetch settings');
  }

  // Convert array of { key, value } to an object
  const settings = {};
  data.forEach((row) => {
    settings[row.key] = row.value;
  });

  // Fill in defaults for missing keys
  Object.keys(VALID_SETTINGS).forEach((key) => {
    if (!(key in settings)) {
      settings[key] = VALID_SETTINGS[key].default;
    }
  });

  return settings;
};

/**
 * Upsert a single setting for a user.
 */
export const upsertSetting = async (userId, key, value) => {
  // Validate before upsert
  validateSetting(key, value);

  // Check if setting already exists
  const { data: existing, error: findError } = await supabase
    .from('user_settings')
    .select('id')
    .eq('user_id', userId)
    .eq('key', key)
    .maybeSingle();

  if (findError && findError.code !== 'PGRST116') {
    // PGRST116 means no rows returned – it's fine
    console.error('Error checking existing setting:', findError);
    throw new Error('Failed to check existing setting');
  }

  if (existing) {
    // Update
    const { error: updateError } = await supabase
      .from('user_settings')
      .update({ value, updated_at: new Date().toISOString() })
      .eq('id', existing.id);

    if (updateError) {
      console.error('Supabase update error:', updateError);
      throw new Error('Failed to update setting');
    }
  } else {
    // Insert
    const { error: insertError } = await supabase
      .from('user_settings')
      .insert({ user_id: userId, key, value });

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      throw new Error('Failed to insert setting');
    }
  }
};

// ──────────────────────────────────────────────
// CONTROLLER METHODS (named exports)
// ──────────────────────────────────────────────

/**
 * GET /users/settings
 * Fetch all settings for the authenticated user.
 */
export const getSettings = async (req, res) => {
  try {
    const userId = req.user.id; // Assumes auth middleware populates req.user

    const settings = await getUserSettings(userId);

    return res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('Error in getSettings:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * PUT /users/settings
 * Update one or more settings for the authenticated user.
 * Body: { settings: { key1: value1, key2: value2, ... } }
 */
export const updateSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: "settings" object is required',
      });
    }

    // Validate all keys first before writing anything
    const entries = Object.entries(settings);
    for (const [key, value] of entries) {
      try {
        validateSetting(key, value);
      } catch (err) {
        return res.status(400).json({
          success: false,
          error: err.message,
        });
      }
    }

    // Upsert each setting
    for (const [key, value] of entries) {
      await upsertSetting(userId, key, value);
    }

    // Return the updated settings
    const updatedSettings = await getUserSettings(userId);

    return res.status(200).json({
      success: true,
      settings: updatedSettings,
    });
  } catch (error) {
    console.error('Error in updateSettings:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * GET /users/settings/:key
 * Fetch a single setting by key.
 */
export const getSetting = async (req, res) => {
  try {
    const userId = req.user.id;
    const { key } = req.params;

    if (!VALID_SETTINGS[key]) {
      return res.status(400).json({
        success: false,
        error: `Invalid setting key: ${key}`,
      });
    }

    const { data, error } = await supabase
      .from('user_settings')
      .select('value')
      .eq('user_id', userId)
      .eq('key', key)
      .maybeSingle();

    if (error) {
      console.error('Supabase error fetching setting:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch setting',
      });
    }

    // Return the value, or default if not found
    const value = data?.value ?? VALID_SETTINGS[key].default;

    return res.status(200).json({
      success: true,
      key,
      value,
    });
  } catch (error) {
    console.error('Error in getSetting:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

/**
 * DELETE /users/settings/:key
 * Delete (reset) a single setting (removes the row, uses default).
 */
export const deleteSetting = async (req, res) => {
  try {
    const userId = req.user.id;
    const { key } = req.params;

    if (!VALID_SETTINGS[key]) {
      return res.status(400).json({
        success: false,
        error: `Invalid setting key: ${key}`,
      });
    }

    const { error } = await supabase
      .from('user_settings')
      .delete()
      .eq('user_id', userId)
      .eq('key', key);

    if (error) {
      console.error('Supabase delete error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete setting',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Setting "${key}" reset to default`,
    });
  } catch (error) {
    console.error('Error in deleteSetting:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};


export default {
  validateSetting,
  getUserSettings,
  upsertSetting,
  getSettings,
  updateSettings,
  getSetting,
  deleteSetting,
};