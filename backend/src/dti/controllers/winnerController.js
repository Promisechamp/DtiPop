import { supabase } from '../../db/index.js';

/**
 * Get all winners
 */
export const getWinners = async (req, res) => {
  try {
    const { 
      limit = 20,
      offset = 0,
      week,
      month,
      year
    } = req.query;

    let query = supabase
      .from('winners')
      .select(`
        *,
        item:items(
          id,
          title,
          description,
          category,
          images,
          donor:profiles!donor_id(
            id,
            full_name,
            avatar_url,
            location
          )
        ),
        winner:profiles!winner_id(
          id,
          full_name,
          avatar_url,
          location,
          bio,
          rating,
          items_given,
          items_received
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Filter by week
    if (week) {
      const weekDate = new Date(week);
      const startOfWeek = new Date(weekDate);
      startOfWeek.setDate(weekDate.getDate() - weekDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      query = query
        .gte('week_start', startOfWeek.toISOString().split('T')[0])
        .lte('week_end', endOfWeek.toISOString().split('T')[0]);
    }

    // Filter by month
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      
      query = query
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
    }

    // Paginate
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      winners: data,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('Get winners error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch winners'
    });
  }
};

/**
 * Get winner of the week
 */
export const getWinnerOfTheWeek = async (req, res) => {
  try {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const { data, error } = await supabase
      .from('winners')
      .select(`
        id,
        item_id,
        winner_id,
        week_start,
        week_end,
        story,
        impact,
        highlights,
        created_at,
        item:items(
          id,
          title,
          description,
          category,
          images,
          donor:profiles!donor_id(
            id,
            full_name,
            avatar_url,
            location
          )
        ),
        winner:profiles!winner_id(
          id,
          full_name,
          avatar_url,
          location
        )
      `)
      .gte('week_start', startOfWeek.toISOString().split('T')[0])
      .lte('week_end', endOfWeek.toISOString().split('T')[0])
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    if (!data || data.length === 0) {
      return res.json({
        success: true,
        winner: null,
        message: 'No winner announced for this week yet'
      });
    }

    res.json({
      success: true,
      winner: data[0]
    });

  } catch (error) {
    console.error('Get winner of the week error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch winner of the week'
    });
  }
};



/**
 * Public: Get winners within a date range
 * GET /winners/date-range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
export const getWinnersByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'startDate and endDate are required' });
    }

    const { data, error } = await supabase
      .from('winners')
      .select(`
        id,
        item_id,
        winner_id,
        week_start,
        week_end,
        story,
        impact,
        highlights,
        created_at,
        item:items(
          id,
          title,
          description,
          category,
          images,
          donor:profiles!donor_id(
            id,
            full_name,
            avatar_url,
            location
          )
        ),
        winner:profiles!winner_id(
          id,
          full_name,
          avatar_url,
          location
        )
      `)
      .gte('created_at', new Date(startDate).toISOString())
      .lte('created_at', new Date(endDate + 'T23:59:59').toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, winners: data || [] });
  } catch (error) {
    console.error('Get winners by date range error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch winners' });
  }
};


/**
 * Get winners by user (items won)
 */
export const getWinnersByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('winners')
      .select(`
        *,
        item:items(
          id,
          title,
          description,
          category,
          images,
          donor:profiles!donor_id(
            id,
            full_name,
            avatar_url,
            location
          )
        )
      `)
      .eq('winner_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      winners: data
    });

  } catch (error) {
    console.error('Get user winners error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user winners'
    });
  }
};




/**
 * Get all "you won" notices the current user still needs to see —
 * either never dismissed, or snoozed and the snooze period has expired.
 */
export const getMyPendingWinnerNotices = async (req, res) => {
    
  try {
    const userId = req.user.id;
    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
      .from('winners')
      .select(`
        id,
        item_id,
        winner_id,
        created_at,
        notice_status,
        snoozed_until,
        item:items(
          id, 
          title, 
          images, 
          status, 
          donor_id,
          donor:profiles!donor_id(
            id, 
            full_name, 
            avatar_url
          )
        )
      `)
      .eq('winner_id', userId)
      .or(`notice_status.eq.pending,and(notice_status.eq.snoozed,snoozed_until.lt.${nowIso})`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }

    console.log('📊 Pending winner notices:', data);
    res.json({ success: true, notices: data || [] });
  } catch (error) {
    console.error('❌ Get pending winner notices error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notices' });
  }
};



/**
 * Update a winner notice's status — dismiss permanently, or snooze
 * for 24 hours ("I'll come back to this").
 */
export const updateWinnerNotice = async (req, res) => {
  try {
    const { winnerId } = req.params;
    const { action } = req.body; // 'dismiss' | 'snooze'
    const userId = req.user.id;

    if (!['dismiss', 'snooze'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Invalid action' });
    }

    const { data: winner, error: findError } = await supabase
      .from('winners')
      .select('winner_id')
      .eq('id', winnerId)
      .single();

    if (findError) {
      return res.status(404).json({ success: false, error: 'Winner record not found' });
    }

    if (winner.winner_id !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const updates = action === 'dismiss'
      ? { notice_status: 'dismissed', snoozed_until: null }
      : { notice_status: 'snoozed', snoozed_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() };

    const { error } = await supabase
      .from('winners')
      .update(updates)
      .eq('id', winnerId);

    if (error) throw error;

    res.json({ success: true, message: 'Notice updated' });
  } catch (error) {
    console.error('Update winner notice error:', error);
    res.status(500).json({ success: false, error: 'Failed to update notice' });
  }
};









// ============================================
// ADMIN WINNER MANAGEMENT FUNCTIONS
// ============================================

/**
 * Admin: Get all winners with filters and pagination
 */
export const adminGetAllWinners = async (req, res) => {
  try {
    const { 
      limit = 20, 
      offset = 0, 
      search,
      item_id,
      winner_id,
      date_from,
      date_to,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    let query = supabase
      .from('winners')
      .select(`
        *,
        item:items(
          id,
          title,
          description,
          category,
          condition,
          images,
          donor:profiles!donor_id(
            id,
            full_name,
            email,
            avatar_url
          )
        ),
        winner:profiles!winner_id(
          id,
          full_name,
          email,
          avatar_url,
          location
        )
      `, { count: 'exact' });

    // Apply search filter
    if (search) {
      query = query.or(
        `item.title.ilike.%${search}%,winner.full_name.ilike.%${search}%,winner.email.ilike.%${search}%`
      );
    }

    // Apply item filter
    if (item_id) {
      query = query.eq('item_id', item_id);
    }

    // Apply winner filter
    if (winner_id) {
      query = query.eq('winner_id', winner_id);
    }

    // Apply date range filter
    if (date_from) {
      query = query.gte('created_at', new Date(date_from).toISOString());
    }
    if (date_to) {
      query = query.lte('created_at', new Date(date_to).toISOString());
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const from = parseInt(offset);
    const to = parseInt(offset) + parseInt(limit) - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      winners: data,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('Admin get all winners error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch winners'
    });
  }
};

/**
 * Admin: Create winner manually
 */
export const adminCreateWinner = async (req, res) => {
  try {
    const { item_id, winner_id, week_start, week_end, story } = req.body;

    if (!item_id || !winner_id) {
      return res.status(400).json({
        success: false,
        error: 'Item ID and Winner ID are required'
      });
    }

    // Check if item exists
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('id, status')
      .eq('id', item_id)
      .single();

    if (itemError) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    // Check if winner exists
    const { data: winner, error: winnerError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', winner_id)
      .single();

    if (winnerError) {
      return res.status(404).json({
        success: false,
        error: 'Winner user not found'
      });
    }

    // Check if item already has a winner
    const { data: existing, error: existingError } = await supabase
      .from('winners')
      .select('id')
      .eq('item_id', item_id)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'This item already has a winner'
      });
    }

    // Create winner
    const { data, error } = await supabase
      .from('winners')
      .insert({
        item_id,
        winner_id,
        week_start: week_start || new Date(),
        week_end: week_end || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        story: story || null,
        created_at: new Date().toISOString()
      })
      .select(`
        *,
        item:items(
          id,
          title
        ),
        winner:profiles!winner_id(
          id,
          full_name,
          email
        )
      `)
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    // Update item status
    await supabase
      .from('items')
      .update({
        status: 'pending',
        winner_id: winner_id,
        winner_announced_at: new Date().toISOString()
      })
      .eq('id', item_id);

    // Update user's items_received count
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('items_received')
      .eq('id', winner_id)
      .single();

    if (currentProfile) {
      await supabase
        .from('profiles')
        .update({ 
          items_received: (currentProfile.items_received || 0) + 1 
        })
        .eq('id', winner_id);
    }

    res.status(201).json({
      success: true,
      message: 'Winner created successfully',
      winner: data
    });

  } catch (error) {
    console.error('Admin create winner error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create winner'
    });
  }
};

/**
 * Admin: Update winner
 */
export const adminUpdateWinner = async (req, res) => {
  try {
    const { winnerId } = req.params;
    const { week_start, week_end, story } = req.body;

    // Check if winner exists
    const { data: existing, error: checkError } = await supabase
      .from('winners')
      .select('id')
      .eq('id', winnerId)
      .single();

    if (checkError) {
      return res.status(404).json({
        success: false,
        error: 'Winner record not found'
      });
    }

    // Build update object
    const updates = {};
    if (week_start) updates.week_start = new Date(week_start).toISOString();
    if (week_end) updates.week_end = new Date(week_end).toISOString();
    if (story !== undefined) updates.story = story;
    

    const { data, error } = await supabase
      .from('winners')
      .update(updates)
      .eq('id', winnerId)
      .select(`
        *,
        item:items(
          id,
          title
        ),
        winner:profiles!winner_id(
          id,
          full_name,
          email
        )
      `)
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Winner updated successfully',
      winner: data
    });

  } catch (error) {
    console.error('Admin update winner error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update winner'
    });
  }
};

/**
 * Admin: Delete winner
 */
export const adminDeleteWinner = async (req, res) => {
  try {
    const { winnerId } = req.params;
    const { restore_item = false } = req.query;

    // Check if winner exists
    const { data: existing, error: checkError } = await supabase
      .from('winners')
      .select('id, item_id')
      .eq('id', winnerId)
      .single();

    if (checkError) {
      return res.status(404).json({
        success: false,
        error: 'Winner record not found'
      });
    }

    // Delete winner
    const { error } = await supabase
      .from('winners')
      .delete()
      .eq('id', winnerId);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    // Optionally restore item status
    if (restore_item === 'true') {
      await supabase
        .from('items')
        .update({
          status: 'active',
          winner_id: null,
          winner_announced_at: null
        })
        .eq('id', existing.item_id);
    }

    res.json({
      success: true,
      message: 'Winner deleted successfully'
    });

  } catch (error) {
    console.error('Admin delete winner error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete winner'
    });
  }
};