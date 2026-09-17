// backend/middleware/admin.js
import { supabase } from '../db/index.js';

/**
 * Check if user is admin
 */
export const isAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    // Get user profile with role
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role, is_admin')
      .eq('id', req.user.id)
      .single();

    if (error || !profile) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!profile.is_admin && profile.role !== 'admin' && profile.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin privileges required.'
      });
    }

    // Attach admin info to request
    req.user.role = profile.role;
    req.user.isAdmin = profile.is_admin;
    
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify admin privileges'
    });
  }
};

/**
 * Check if user is super admin
 */
export const isSuperAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (error || !profile || profile.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Super admin privileges required.'
      });
    }

    next();
  } catch (error) {
    console.error('Super admin check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify super admin privileges'
    });
  }
};