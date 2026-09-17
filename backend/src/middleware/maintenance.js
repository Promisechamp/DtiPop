// src/middleware/maintenance.js
import { supabase } from '../db/index.js';

/**
 * Middleware to check if maintenance mode is enabled
 * Allows admin users to bypass maintenance
 */
export const checkMaintenance = async (req, res, next) => {
  try {
    // Check if maintenance mode is enabled
    const { data, error } = await supabase
      .from('system_settings')
      .select('maintenance_mode, maintenance_message')
      .single();

    if (error) {
      console.error('Error checking maintenance status:', error);
      return next();
    }

    // If maintenance is not enabled, continue
    if (!data?.maintenance_mode) {
      return next();
    }

    // Check if user is admin (they can bypass)
    const userId = req.user?.id;
    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_admin')
        .eq('id', userId)
        .single();

      const isAdmin = profile?.is_admin || 
                      profile?.role === 'admin' || 
                      profile?.role === 'super_admin';

      if (isAdmin) {
        return next();
      }
    }

    // Return maintenance response
    return res.status(503).json({
      success: false,
      error: 'Service Unavailable',
      maintenance_mode: true,
      message: data.maintenance_message || 'We are currently undergoing maintenance. Please check back later.',
      estimated_time: 'We\'ll be back online shortly'
    });

  } catch (error) {
    console.error('Maintenance check error:', error);
    next();
  }
};

/**
 * Check maintenance from frontend
 */
export const checkMaintenanceFrontend = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('maintenance_mode, maintenance_message')
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to check maintenance status'
      });
    }

    res.json({
      success: true,
      maintenance_mode: data?.maintenance_mode || false,
      maintenance_message: data?.maintenance_message || 'We are currently undergoing maintenance. Please check back later.'
    });

  } catch (error) {
    console.error('Check maintenance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check maintenance status'
    });
  }
};