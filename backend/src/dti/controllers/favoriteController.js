// controllers/favoriteController.js

import { supabase } from '../../db/index.js';

/* ============================================================
   HELPERS
============================================================ */

const parsePositiveInt = (value, fallback, max = Number.MAX_SAFE_INTEGER) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, max);
};

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 50;

/* ============================================================
   GET FAVORITES
   GET /api/favorites
============================================================ */

export const getFavorites = async (req, res) => {
  try {
    const userId = req.user.id;

    const limit = parsePositiveInt(req.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
    const offset = parsePositiveInt(req.query.offset, 0);

    console.log('📋 Getting favorites for user:', userId);

    /*
     * NOTE on FK hints:
     *
     * We use the column-based hint `!donor_id` here — the SAME form
     * used by itemsController (`donor:profiles!donor_id(...)`).
     *
     * The previous `!items_donor_id_fkey` form depended on the
     * Postgres constraint's auto-generated name, which can differ
     * across environments (Dashboard vs SQL migration) and silently
     * 400s the entire query when it doesn't match.
     */
    const { data, error, count } = await supabase
      .from('favorites')
      .select(
        `
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
          donor:profiles!donor_id(
            id,
            full_name,
            avatar_url,
            location,
            rating
          )
        )
      `,
        { count: 'exact' }
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('❌ Error fetching favorites:', error);
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    const rows = data || [];

    /*
     * Detect favorites that point at missing/unreadable items.
     *
     * This happens when an item is hard-deleted (admin
     * ?hard_delete=true) or when RLS on `items` hides the row
     * from this user. PostgREST returns `item: null` for those
     * rows rather than erroring — the favorite survives but the
     * payload is gone.
     */
    const orphaned = rows.filter((fav) => !fav.item);

    if (orphaned.length > 0) {
      console.warn(
        `⚠️ ${orphaned.length} favorite(s) point at missing/unreadable items:`,
        orphaned.map((f) => f.item_id)
      );
    }

    /*
     * Drop orphans so the frontend never has to render an empty
     * card. If you'd rather keep them visible with a "no longer
     * available" badge, don't filter — just fall back to empty
     * strings for the missing fields, and let the UI decide.
     */
    const favorites = rows
      .filter((fav) => fav.item)
      .map((fav) => ({
        id: fav.id,
        item_id: fav.item_id,
        user_id: fav.user_id,
        created_at: fav.created_at,

        /* Flattened item fields */
        title: fav.item.title || '',
        description: fav.item.description || '',
        category: fav.item.category || '',
        condition: fav.item.condition || '',
        status: fav.item.status || '',
        images: fav.item.images || [],
        donor_pays_shipping: fav.item.donor_pays_shipping || false,
        shipping_regions: fav.item.shipping_regions || null,

        /* Location comes from the donor profile, not items */
        location: fav.item.donor?.location || '',

        views_count: fav.item.views_count || 0,
        applications_count: fav.item.applications_count || 0,
        item_created_at: fav.item.created_at || null,

        /* Nested donor snapshot */
        donor: fav.item.donor
          ? {
              id: fav.item.donor.id,
              full_name: fav.item.donor.full_name,
              avatar_url: fav.item.donor.avatar_url,
              location: fav.item.donor.location,
              rating: fav.item.donor.rating,
            }
          : null,
      }));

    console.log(
      `✅ Found ${favorites.length} favorites (${
        orphaned.length
      } orphaned)`
    );

    return res.json({
      success: true,
      favorites,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('❌ Get favorites error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch favorites',
    });
  }
};

/* ============================================================
   ADD FAVORITE
   POST /api/favorites
============================================================ */

export const addFavorite = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.body;

    console.log('⭐ Adding favorite - User:', userId, 'Item:', itemId);

    if (!itemId) {
      return res.status(400).json({
        success: false,
        error: 'Item ID is required',
      });
    }

    /* --- 1. Verify the item exists and is readable --- */
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('id, title, donor_id, images, status')
      .eq('id', itemId)
      .maybeSingle();

    if (itemError) {
      console.error('❌ Item lookup error:', itemError);
      return res.status(400).json({
        success: false,
        error: itemError.message,
      });
    }

    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found',
      });
    }

    /*
     * Don't allow favoriting items the user can't act on anyway.
     * Adjust the statuses allowed here to match your product
     * intent. Currently: only active items can be saved.
     */
    if (item.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'This item is no longer available',
      });
    }

    /* --- 2. Prevent favoriting own items --- */
    if (item.donor_id === userId) {
      return res.status(400).json({
        success: false,
        error: 'You cannot favorite your own item',
      });
    }

    /* --- 3. Duplicate check (pre-empts unique constraint error) --- */
    const { data: existing, error: existingError } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('item_id', itemId)
      .maybeSingle();

    if (existingError) {
      console.error('❌ Existing favorite check error:', existingError);
      return res.status(400).json({
        success: false,
        error: existingError.message,
      });
    }

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Item is already in your favorites',
      });
    }

    /* --- 4. Insert --- */
    const { data: favorite, error: insertError } = await supabase
      .from('favorites')
      .insert({
        user_id: userId,
        item_id: itemId,
        created_at: new Date().toISOString(),
      })
      .select(
        `
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
      `
      )
      .single();

    if (insertError) {
      console.error('❌ Insert error:', insertError);

      /* Unique-violation race: another request beat us to it. */
      if (insertError.code === '23505') {
        return res.status(400).json({
          success: false,
          error: 'Item already in favorites',
        });
      }

      return res.status(400).json({
        success: false,
        error: insertError.message,
      });
    }

    console.log('✅ Favorite added:', favorite?.id);

    return res.status(201).json({
      success: true,
      message: 'Item added to favorites',
      favorite: {
        id: favorite?.id,
        item_id: favorite?.item_id,
        user_id: favorite?.user_id,
        created_at: favorite?.created_at,
        title: favorite?.item?.title || '',
        images: favorite?.item?.images || [],
      },
    });
  } catch (error) {
    console.error('❌ Add favorite error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to add favorite',
    });
  }
};

/* ============================================================
   REMOVE FAVORITE
   DELETE /api/favorites/:itemId
============================================================ */

export const removeFavorite = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    console.log('🗑️ Removing favorite - User:', userId, 'Item:', itemId);

    if (!itemId) {
      return res.status(400).json({
        success: false,
        error: 'Item ID is required',
      });
    }

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('item_id', itemId);

    if (error) {
      console.error('❌ Delete error:', error);
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    console.log('✅ Favorite removed');

    return res.json({
      success: true,
      message: 'Item removed from favorites',
    });
  } catch (error) {
    console.error('❌ Remove favorite error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to remove favorite',
    });
  }
};

/* ============================================================
   CHECK FAVORITE
   GET /api/favorites/check/:itemId
============================================================ */

export const checkFavorite = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    if (!itemId) {
      return res.status(400).json({
        success: false,
        error: 'Item ID is required',
      });
    }

    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('item_id', itemId)
      .maybeSingle();

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    return res.json({
      success: true,
      isFavorited: Boolean(data),
      favoriteId: data?.id || null,
    });
  } catch (error) {
    console.error('❌ Check favorite error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to check favorite status',
    });
  }
};

/* ============================================================
   GET FAVORITE COUNT
   GET /api/favorites/count
============================================================ */

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
        error: error.message,
      });
    }

    return res.json({
      success: true,
      count: count || 0,
    });
  } catch (error) {
    console.error('❌ Get count error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to get count',
    });
  }
};

/* ============================================================
   CLEAR ALL FAVORITES
   DELETE /api/favorites
============================================================ */

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
        error: error.message,
      });
    }

    return res.json({
      success: true,
      message: 'All favorites cleared',
    });
  } catch (error) {
    console.error('❌ Clear all error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to clear favorites',
    });
  }
};

/* ============================================================
   CHECK BULK FAVORITES
   POST /api/favorites/check-bulk
============================================================ */

export const checkBulkFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemIds } = req.body;

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Item IDs required',
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
        error: error.message,
      });
    }

    const favoritedMap = {};
    (data || []).forEach((fav) => {
      favoritedMap[fav.item_id] = true;
    });

    return res.json({
      success: true,
      favorites: favoritedMap,
    });
  } catch (error) {
    console.error('❌ Check bulk error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to check bulk favorites',
    });
  }
};