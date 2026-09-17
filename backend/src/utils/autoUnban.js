// backend/utils/autoUnban.js

import { supabase } from '../db/index.js';

/**
 * Auto-unban users whose ban has expired
 * This should be called by a cron job or scheduled task
 */
export const autoUnbanUsers = async () => {
  try {
    const now = new Date().toISOString();
    
    console.log(`🔄 Running auto-unban check at ${now}`);
    
    // Find users whose ban has expired
    const { data: expiredBans, error: findError } = await supabase
      .from('profiles')
      .select('id, full_name, ban_count, ban_history, banned_until')
      .eq('ban_status', 'banned')
      .not('banned_until', 'is', null)
      .lte('banned_until', now);

    if (findError) {
      console.error('Error finding expired bans:', findError);
      return { success: false, error: findError.message };
    }

    if (!expiredBans || expiredBans.length === 0) {
      console.log('✅ No expired bans found');
      return { success: true, message: 'No expired bans found' };
    }

    console.log(`📊 Found ${expiredBans.length} expired bans to process`);

    // Process each expired ban
    const results = [];
    for (const user of expiredBans) {
      try {
        // Update the ban history to mark as expired
        const updatedHistory = (user.ban_history || []).map(record => {
          if (record.status === 'active' && record.ban_number === user.ban_count) {
            return {
              ...record,
              status: 'expired',
              expired_at: now,
              expired_reason: 'Auto-unban due to expiration'
            };
          }
          return record;
        });

        // Unban the user
        const { data, error } = await supabase
          .from('profiles')
          .update({
            ban_status: 'active',
            ban_reason: null,
            banned_at: null,
            banned_by: null,
            banned_by_name: null,
            ban_duration: null,
            banned_until: null,
            ban_history: updatedHistory,
            updated_at: now
          })
          .eq('id', user.id)
          .select()
          .single();

        if (error) {
          console.error(`Error unbanning user ${user.id}:`, error);
          results.push({ userId: user.id, success: false, error: error.message });
        } else {
          console.log(`✅ Auto-unbanned user: ${user.full_name} (${user.id})`);
          results.push({ userId: user.id, success: true, user: data });
        }
      } catch (error) {
        console.error(`Error processing user ${user.id}:`, error);
        results.push({ userId: user.id, success: false, error: error.message });
      }
    }

    return {
      success: true,
      processed: results.length,
      results: results
    };

  } catch (error) {
    console.error('Auto-unban error:', error);
    return { success: false, error: error.message };
  }
};