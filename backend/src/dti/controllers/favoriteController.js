// controllers/favoriteController.js
import { supabase } from '../../db/index.js';

/**
 * Get all favorites for current user
 * GET /api/favorites
 */
export const getFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    console.log('📋 Getting favorites for user:', userId);

    const { data, error, count } = await supabase
      .from('favorites')
      .select(`
        id,
        item_id,
        user_id,
        created_at,
        item:items(
          id,
          title,
          description,
          category,
          condition,
          status,
          images,
          donor_pays_shipping,
          shipping_regions,
          created_at,
          views_count,
          applications_count,
          donor:profiles!items_donor_id_fkey(
            id,
            full_name,
            avatar_url,
            location,
            rating
          )
        )
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('❌ Error fetching favorites:', error);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    // Transform data to flatten item details
    const favorites = (data || []).map(fav => ({
      id: fav.id,
      item_id: fav.item_id,
      user_id: fav.user_id,
      created_at: fav.created_at,
      // Flatten item details
      title: fav.item?.title || '',
      description: fav.item?.description || '',
      category: fav.item?.category || '',
      condition: fav.item?.condition || '',
      status: fav.item?.status || '',
      images: fav.item?.images || [],
      donor_pays_shipping: fav.item?.donor_pays_shipping || false,
      shipping_regions: fav.item?.shipping_regions || null,
      // Get location from donor profile instead of items table
      location: fav.item?.donor?.location || '',
      views_count: fav.item?.views_count || 0,
      applications_count: fav.item?.applications_count || 0,
      item_created_at: fav.item?.created_at || null,
      donor: fav.item?.donor ? {
        id: fav.item.donor.id,
        full_name: fav.item.donor.full_name,
        avatar_url: fav.item.donor.avatar_url,
        location: fav.item.donor.location,
        rating: fav.item.donor.rating
      } : null
    }));

    console.log(`✅ Found ${favorites.length} favorites`);

    res.json({
      success: true,
      favorites,
      count: favorites.length,
      total: count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('❌ Get favorites error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch favorites'
    });
  }
};

/**
 * Add item to favorites
 * POST /api/favorites
 */
export const addFavorite = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.body;

    console.log('⭐ Adding favorite - User:', userId, 'Item:', itemId);

    if (!itemId) {
      return res.status(400).json({
        success: false,
        error: 'Item ID is required'
      });
    }

    // Check if item exists
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('id, title, donor_id, images')
      .eq('id', itemId)
      .single();

    if (itemError || !item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    // Prevent users from favoriting their own items
    if (item.donor_id === userId) {
      return res.status(400).json({
        success: false,
        error: 'You cannot favorite your own item'
      });
    }

    // Check if already favorited
    const { data: existing } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('item_id', itemId)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Item is already in your favorites'
      });
    }

    // Add to favorites
    const { data: favorite, error: insertError } = await supabase
      .from('favorites')
      .insert({
        user_id: userId,
        item_id: itemId,
        created_at: new Date().toISOString()
      })
      .select(`
        id,
        item_id,
        user_id,
        created_at,
        item:items(
          id,
          title,
          images,
          category
        )
      `)
      .single();

    if (insertError) {
      console.error('❌ Insert error:', insertError);
      
      if (insertError.code === '23505') {
        return res.status(400).json({
          success: false,
          error: 'Item already in favorites'
        });
      }

      return res.status(400).json({
        success: false,
        error: insertError.message
      });
    }

    console.log('✅ Favorite added:', favorite?.id);

    res.status(201).json({
      success: true,
      message: 'Item added to favorites',
      favorite: {
        id: favorite?.id,
        item_id: favorite?.item_id,
        user_id: favorite?.user_id,
        created_at: favorite?.created_at,
        title: favorite?.item?.title || '',
        images: favorite?.item?.images || []
      }
    });

  } catch (error) {
    console.error('❌ Add favorite error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add favorite'
    });
  }
};

/**
 * Remove item from favorites
 * DELETE /api/favorites/:itemId
 */
export const removeFavorite = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    console.log('🗑️ Removing favorite - User:', userId, 'Item:', itemId);

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('item_id', itemId);

    if (error) {
      console.error('❌ Delete error:', error);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    console.log('✅ Favorite removed');

    res.json({
      success: true,
      message: 'Item removed from favorites'
    });

  } catch (error) {
    console.error('❌ Remove favorite error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove favorite'
    });
  }
};

/**
 * Check if item is favorited
 * GET /api/favorites/check/:itemId
 */
export const checkFavorite = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('item_id', itemId)
      .maybeSingle();

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      isFavorited: !!data,
      favoriteId: data?.id || null
    });

  } catch (error) {
    console.error('❌ Check favorite error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check favorite status'
    });
  }
};

/**
 * Get favorite count
 * GET /api/favorites/count
 */
export const getFavoriteCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const { count, error } = await supabase
      .from('favorites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      count: count || 0
    });

  } catch (error) {
    console.error('❌ Get count error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get count'
    });
  }
};

/**
 * Clear all favorites
 * DELETE /api/favorites
 */
export const clearAllFavorites = async (req, res) => {
  try {
    const userId = req.user.id;

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'All favorites cleared'
    });

  } catch (error) {
    console.error('❌ Clear all error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear favorites'
    });
  }
};

/**
 * Check bulk favorites
 * POST /api/favorites/check-bulk
 */
export const checkBulkFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemIds } = req.body;

    if (!itemIds?.length) {
      return res.status(400).json({
        success: false,
        error: 'Item IDs required'
      });
    }

    const { data, error } = await supabase
      .from('favorites')
      .select('item_id')
      .eq('user_id', userId)
      .in('item_id', itemIds);

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    const favoritedMap = {};
    (data || []).forEach(fav => {
      favoritedMap[fav.item_id] = true;
    });

    res.json({
      success: true,
      favorites: favoritedMap
    });

  } catch (error) {
    console.error('❌ Check bulk error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check bulk favorites'
    });
  }
};