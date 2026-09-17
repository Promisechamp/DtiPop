import { supabase } from '../db/index.js';

/**
 * Check if user email is verified
 */
export const requireEmailVerified = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    // Check if user is verified
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('email_verified')
      .eq('id', req.user.id)
      .single();

    if (error) {
      console.error('Profile check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify user email status'
      });
    }

    if (!profile?.email_verified) {
      return res.status(403).json({
        success: false,
        error: 'Please verify your email before performing this action',
        requiresVerification: true
      });
    }

    next();
  } catch (error) {
    console.error('Verification middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify user email status'
    });
  }
};