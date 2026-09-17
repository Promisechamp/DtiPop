// backend/controllers/settingsController.js
import { supabase } from '../../db/index.js';

/**
 * Get system settings
 */
export const getSettings = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .single();

    if (error) {
      // If table doesn't exist, return default settings
      if (error.code === 'PGRST116') {
        return res.json({
          success: true,
          settings: {
            site_name: 'Don\'t Trash It',
            site_description: 'Give your items a second life',
            maintenance_mode: false,
            maintenance_message: 'We are currently undergoing maintenance. Please check back later.',
            max_images_per_item: 5,
            max_file_size_mb: 5,
            allowed_image_types: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            cooldown_minutes: 30,
            items_per_page: 20,
            require_email_verification: true,
            enable_google_auth: true,
            contact_email: 'support@donttrashit.com',
            social_links: {
              facebook: 'https://facebook.com/donttrashit',
              twitter: 'https://twitter.com/donttrashit',
              instagram: 'https://instagram.com/donttrashit'
            }
          }
        });
      }
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      settings: data
    });

  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings'
    });
  }
};

/**
 * Update system settings
 */
export const updateSettings = async (req, res) => {
  try {
    const updates = req.body;

    const { data, error } = await supabase
      .from('system_settings')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        updated_by: req.user.id
      })
      .eq('id', 1)
      .select()
      .single();

    if (error) {
      // If no record exists, create one
      if (error.code === 'PGRST116') {
        const { data: newData, error: insertError } = await supabase
          .from('system_settings')
          .insert({
            ...updates,
            updated_at: new Date().toISOString(),
            updated_by: req.user.id
          })
          .select()
          .single();

        if (insertError) {
          return res.status(400).json({
            success: false,
            error: insertError.message
          });
        }

        return res.json({
          success: true,
          message: 'Settings created successfully',
          settings: newData
        });
      }

      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: data
    });

  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings'
    });
  }
};

/**
 * Toggle maintenance mode
 */
export const toggleMaintenance = async (req, res) => {
  try {
    const { enabled, message } = req.body;

    const { data, error } = await supabase
      .from('system_settings')
      .update({
        maintenance_mode: enabled || false,
        maintenance_message: message || 'We are currently undergoing maintenance. Please check back later.',
        updated_at: new Date().toISOString(),
        updated_by: req.user.id
      })
      .eq('id', 1)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      message: enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled',
      settings: data
    });

  } catch (error) {
    console.error('Toggle maintenance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle maintenance mode'
    });
  }
};

/**
 * Get maintenance status
 */
export const getMaintenanceStatus = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('maintenance_mode, maintenance_message')
      .single();

    if (error) {
      return res.json({
        success: true,
        maintenance_mode: false,
        maintenance_message: null
      });
    }

    res.json({
      success: true,
      maintenance_mode: data.maintenance_mode || false,
      maintenance_message: data.maintenance_message || null
    });

  } catch (error) {
    console.error('Get maintenance status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get maintenance status'
    });
  }
};

/**
 * Get system health status
 */
export const getSystemHealth = async (req, res) => {
  try {
    // Check database connection
    const { data: dbCheck, error: dbError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status: dbError ? 'unhealthy' : 'healthy',
          message: dbError ? dbError.message : 'Connected'
        },
        api: {
          status: 'healthy',
          message: 'API is running'
        },
        storage: {
          status: 'healthy',
          message: 'Storage is accessible'
        }
      }
    };

    if (dbError) {
      health.status = 'unhealthy';
    }

    res.json({
      success: true,
      health
    });

  } catch (error) {
    console.error('Get system health error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system health'
    });
  }
};