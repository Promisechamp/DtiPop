import { supabase } from '../../db/index.js';
import { createNotification } from './notificationController.js';

// ============================================================
// HELPERS
// ============================================================

const getUserId = (req) => req.user?.id || null;

const parsePositiveInt = (value, fallback = null) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return parsed;
};

const parseNonNegativeNumber = (value, fallback = null) => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
};

// ============================================================
// HOUSEHOLD MEMBERSHIP
// ============================================================

const verifyHouseholdMembership = async (userId, householdId) => {
  if (!householdId) {
    return {
      valid: true,
      role: null,
    };
  }

  const { data, error } = await supabase
    .from('pop_household_members')
    .select('id, role, status')
    .eq('household_id', householdId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    console.error('verifyHouseholdMembership:', error);

    return {
      valid: false,
      error: 'Unable to verify household membership.',
    };
  }

  if (!data) {
    return {
      valid: false,
      error: 'User is not a member of this household.',
    };
  }

  return {
    valid: true,
    role: data.role,
  };
};

const canManageAsset = (userId, assetOwnerId, householdRole) => {
  if (userId === assetOwnerId) {
    return true;
  }

  return ['owner', 'admin'].includes(householdRole);
};

// ============================================================
// GET ASSET + ACCESS
// ============================================================

const getAssetAccess = async (assetId, userId) => {
  const { data: asset, error } = await supabase
    .from('pop_assets')
    .select(`
      id,
      name,
      asset_type,
      location,
      condition,
      status,
      household_id,
      user_id,
      purchase_id
    `)
    .eq('id', assetId)
    .maybeSingle();

  if (error) {
    console.error('getAssetAccess:', error);

    return {
      valid: false,
      error: 'Unable to load asset.',
    };
  }

  if (!asset) {
    return {
      valid: false,
      error: 'Asset not found.',
    };
  }

  const membership = await verifyHouseholdMembership(
    userId,
    asset.household_id
  );

  if (!membership.valid) {
    return {
      valid: false,
      error: membership.error,
    };
  }

  return {
    valid: true,
    asset,
    role: membership.role,
    canManage: canManageAsset(
      userId,
      asset.user_id,
      membership.role
    ),
  };
};

// ============================================================
// GET SHARING RECORD
// ============================================================

const getSharingRecord = async (assetId) => {
  const { data, error } = await supabase
    .from('pop_asset_sharing')
    .select('*')
    .eq('asset_id', assetId)
    .maybeSingle();

  if (error) {
    console.error('getSharingRecord:', error);

    return {
      error,
      data: null,
    };
  }

  return {
    error: null,
    data: data || null,
  };
};

// ============================================================
// UPSERT SHARING
// ============================================================

export const upsertSharing = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const {
      assetId,
      sharingEnabled,
      sharingScope,
      sharingRadius,
      allowBorrowing,
      requiresApproval,
      depositRequired,
      depositAmount,
      maxBorrowDays,
      notes,
    } = req.body;

    if (!assetId) {
      return res.status(400).json({
        success: false,
        message: 'Asset ID is required.',
      });
    }

    const access = await getAssetAccess(assetId, userId);

    if (!access.valid) {
      return res.status(404).json({
        success: false,
        message: access.error,
      });
    }

    if (!access.canManage) {
      return res.status(403).json({
        success: false,
        message:
          'Only the asset owner or a household admin can manage sharing.',
      });
    }

    if (access.asset.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Only active assets can be shared.',
      });
    }

    const validScopes = [
      'household',
      'network',
      'public',
    ];

    const scope = validScopes.includes(sharingScope)
      ? sharingScope
      : 'household';

    const maxDays = parsePositiveInt(
      maxBorrowDays,
      7
    );

    if (maxDays > 365) {
      return res.status(400).json({
        success: false,
        message: 'Maximum borrowing period cannot exceed 365 days.',
      });
    }

    const radius = parseNonNegativeNumber(
      sharingRadius,
      null
    );

    const deposit = parseNonNegativeNumber(
      depositAmount,
      null
    );

    const depositIsRequired = Boolean(
      depositRequired
    );

    if (depositIsRequired && (!deposit || deposit <= 0)) {
      return res.status(400).json({
        success: false,
        message:
          'A valid deposit amount is required when deposit is enabled.',
      });
    }

    const payload = {
      asset_id: assetId,
      household_id: access.asset.household_id,

      sharing_enabled: Boolean(
        sharingEnabled
      ),

      sharing_scope: scope,

      sharing_radius: radius,

      allow_borrowing: Boolean(
        allowBorrowing
      ),

      requires_approval:
        requiresApproval !== false,

      deposit_required:
        depositIsRequired,

      deposit_amount:
        depositIsRequired ? deposit : null,

      max_borrow_days: maxDays,

      notes:
        typeof notes === 'string'
          ? notes.trim() || null
          : null,
    };

    const existing = await getSharingRecord(
      assetId
    );

    if (existing.error) {
      throw existing.error;
    }

    let data;
    let message;

    if (existing.data) {
      const { data: updated, error } =
        await supabase
          .from('pop_asset_sharing')
          .update(payload)
          .eq('id', existing.data.id)
          .select()
          .single();

      if (error) throw error;

      data = updated;
      message = 'Sharing settings updated.';
    } else {
      const { data: created, error } =
        await supabase
          .from('pop_asset_sharing')
          .insert(payload)
          .select()
          .single();

      if (error) throw error;

      data = created;
      message = 'Sharing settings created.';
    }

    try {
      await createNotification(
        userId,
        'sharing_updated',
        'Sharing settings updated',
        `"${access.asset.name}" sharing settings were updated.`
      );
    } catch (notificationError) {
      console.error(
        'Sharing notification failed:',
        notificationError
      );
    }

    return res.status(200).json({
      success: true,
      message,
      data,
    });
  } catch (error) {
    console.error('upsertSharing:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to save sharing settings.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};

// ============================================================
// GET SHARING BY ASSET
// ============================================================

export const getSharingByAssetId = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const { assetId } = req.params;

    if (!assetId) {
      return res.status(400).json({
        success: false,
        message: 'Asset ID is required.',
      });
    }

    const access = await getAssetAccess(
      assetId,
      userId
    );

    if (!access.valid) {
      return res.status(404).json({
        success: false,
        message: access.error,
      });
    }

    /*
     * The asset owner / household admin can view
     * the complete sharing configuration.
     */
    if (!access.canManage) {
      return res.status(403).json({
        success: false,
        message:
          'You do not have permission to view these sharing settings.',
      });
    }

    const sharing = await getSharingRecord(
      assetId
    );

    if (sharing.error) {
      throw sharing.error;
    }

    return res.json({
      success: true,
      data: sharing.data,
      asset: access.asset,
    });
  } catch (error) {
    console.error(
      'getSharingByAssetId:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to fetch sharing settings.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};

// ============================================================
// GET SHARED ASSETS
// ============================================================

export const getSharedAssets = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const {
      householdId,
      allowBorrowing,
      isActive,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    // --------------------------------------------------------
    // HOUSEHOLDS USER BELONGS TO
    // --------------------------------------------------------

    const {
      data: memberships,
      error: membershipError,
    } = await supabase
      .from('pop_household_members')
      .select('household_id, role')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (membershipError) {
      throw membershipError;
    }

    const accessibleHouseholdIds =
      memberships?.map(
        (item) => item.household_id
      ) || [];

    if (householdId) {
      if (
        !accessibleHouseholdIds.includes(
          householdId
        )
      ) {
        return res.status(403).json({
          success: false,
          message:
            'You do not belong to this household.',
        });
      }
    }

    if (accessibleHouseholdIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          page: Number(page) || 1,
          limit: Number(limit) || 20,
          total: 0,
          pages: 0,
        },
      });
    }

    // --------------------------------------------------------
    // QUERY
    // --------------------------------------------------------

    let query = supabase
      .from('pop_asset_sharing')
      .select(
        `
          *,
          pop_assets!inner (
            id,
            name,
            asset_type,
            location,
            condition,
            status,
            household_id,
            user_id,
            purchase_id
          ),
          pop_households (
            id,
            name,
            household_type
          )
        `,
        { count: 'exact' }
      );

    query = query.in(
      'household_id',
      householdId
        ? [householdId]
        : accessibleHouseholdIds
    );

    if (allowBorrowing !== undefined) {
      query = query.eq(
        'allow_borrowing',
        allowBorrowing === 'true'
      );
    }

    if (isActive !== undefined) {
      query = query.eq(
        'sharing_enabled',
        isActive === 'true'
      );
    }

    query = query.eq(
      'pop_assets.status',
      'active'
    );

    if (search?.trim()) {
      const term = search.trim();

      query = query.or(
        `name.ilike.%${term}%,asset_type.ilike.%${term}%`,
        {
          referencedTable:
            'pop_assets',
        }
      );
    }

    // --------------------------------------------------------
    // PAGINATION
    // --------------------------------------------------------

    const pageNumber = Math.max(
      1,
      Number(page) || 1
    );

    const pageSize = Math.min(
      100,
      Math.max(1, Number(limit) || 20)
    );

    const from =
      (pageNumber - 1) * pageSize;

    const to =
      from + pageSize - 1;

    query = query
      .range(from, to)
      .order('created_at', {
        ascending: false,
      });

    const {
      data,
      error,
      count,
    } = await query;

    if (error) throw error;

    // --------------------------------------------------------
    // ENRICH PURCHASE DATA
    // --------------------------------------------------------

    const rows = data || [];

    const purchaseIds = [
      ...new Set(
        rows
          .map(
            (row) =>
              row.pop_assets?.purchase_id
          )
          .filter(Boolean)
      ),
    ];

    let purchaseMap = new Map();

    if (purchaseIds.length) {
      const {
        data: purchases,
        error: purchaseError,
      } = await supabase
        .from('pop_purchases')
        .select(
          'id, product_image_url, brand, model'
        )
        .in('id', purchaseIds);

      if (!purchaseError && purchases) {
        purchaseMap = new Map(
          purchases.map((purchase) => [
            purchase.id,
            purchase,
          ])
        );
      }
    }

    const enriched = rows.map((row) => {
      const asset =
        row.pop_assets || {};

      const purchase =
        purchaseMap.get(
          asset.purchase_id
        ) || null;

      return {
        ...row,

        pop_assets: {
          ...asset,

          product_image_url:
            purchase?.product_image_url ||
            null,
        },

        purchase,
      };
    });

    return res.json({
      success: true,
      data: enriched,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total: count || 0,
        pages: Math.ceil(
          (count || 0) / pageSize
        ),
      },
    });
  } catch (error) {
    console.error(
      'getSharedAssets:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to fetch shared assets.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};

// ============================================================
// UPDATE SHARING
// ============================================================

export const updateSharing = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const { id } = req.params;

    const access = await validateSharingAccess(
      id,
      userId
    );

    if (!access.valid) {
      return res.status(404).json({
        success: false,
        message: access.error,
      });
    }

    if (!access.canManage) {
      return res.status(403).json({
        success: false,
        message:
          'Only the asset owner or a household admin can manage sharing.',
      });
    }

    const {
      sharingEnabled,
      sharingScope,
      sharingRadius,
      allowBorrowing,
      requiresApproval,
      depositRequired,
      depositAmount,
      maxBorrowDays,
      notes,
    } = req.body;

    const update = {};

    if (
      sharingEnabled !== undefined
    ) {
      update.sharing_enabled =
        Boolean(sharingEnabled);
    }

    if (
      sharingScope !== undefined
    ) {
      const validScopes = [
        'household',
        'network',
        'public',
      ];

      if (
        !validScopes.includes(
          sharingScope
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid sharing scope.',
        });
      }

      update.sharing_scope =
        sharingScope;
    }

    if (
      sharingRadius !== undefined
    ) {
      update.sharing_radius =
        parseNonNegativeNumber(
          sharingRadius,
          null
        );
    }

    if (
      allowBorrowing !== undefined
    ) {
      update.allow_borrowing =
        Boolean(allowBorrowing);
    }

    if (
      requiresApproval !== undefined
    ) {
      update.requires_approval =
        Boolean(requiresApproval);
    }

    if (
      depositRequired !== undefined
    ) {
      update.deposit_required =
        Boolean(depositRequired);

      if (!depositRequired) {
        update.deposit_amount =
          null;
      }
    }

    if (
      depositAmount !== undefined
    ) {
      update.deposit_amount =
        parseNonNegativeNumber(
          depositAmount,
          null
        );
    }

    if (
      maxBorrowDays !== undefined
    ) {
      const days =
        parsePositiveInt(
          maxBorrowDays,
          7
        );

      if (days > 365) {
        return res.status(400).json({
          success: false,
          message:
            'Maximum borrowing period cannot exceed 365 days.',
        });
      }

      update.max_borrow_days = days;
    }

    if (notes !== undefined) {
      update.notes =
        typeof notes === 'string'
          ? notes.trim() || null
          : null;
    }

    if (
      Object.keys(update).length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'No changes provided.',
      });
    }

    const { data, error } =
      await supabase
        .from('pop_asset_sharing')
        .update(update)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;

    return res.json({
      success: true,
      message:
        'Sharing settings updated.',
      data,
    });
  } catch (error) {
    console.error(
      'updateSharing:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to update sharing settings.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};

// ============================================================
// TOGGLE SHARING
// ============================================================

export const toggleSharing = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const { id } = req.params;

    const access = await validateSharingAccess(
      id,
      userId
    );

    if (!access.valid) {
      return res.status(404).json({
        success: false,
        message: access.error,
      });
    }

    if (!access.canManage) {
      return res.status(403).json({
        success: false,
        message:
          'Only the asset owner or a household admin can manage sharing.',
      });
    }

    const {
      data: current,
      error: currentError,
    } = await supabase
      .from('pop_asset_sharing')
      .select(
        'id, sharing_enabled, asset_id'
      )
      .eq('id', id)
      .single();

    if (currentError) {
      throw currentError;
    }

    const newStatus =
      !current.sharing_enabled;

    const {
      data,
      error,
    } = await supabase
      .from('pop_asset_sharing')
      .update({
        sharing_enabled:
          newStatus,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    try {
      await createNotification(
        userId,
        'sharing_updated',
        newStatus
          ? 'Sharing enabled'
          : 'Sharing disabled',
        `"${access.asset.name}" is now ${
          newStatus
            ? 'available for sharing'
            : 'private'
        }.`
      );
    } catch (notificationError) {
      console.error(
        'toggleSharing notification:',
        notificationError
      );
    }

    return res.json({
      success: true,
      message: newStatus
        ? 'Sharing enabled.'
        : 'Sharing disabled.',
      data,
    });
  } catch (error) {
    console.error(
      'toggleSharing:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to toggle sharing.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};

// ============================================================
// DELETE SHARING
// ============================================================

export const deleteSharing = async (
  req,
  res
) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const { id } = req.params;

    const access = await validateSharingAccess(
      id,
      userId
    );

    if (!access.valid) {
      return res.status(404).json({
        success: false,
        message: access.error,
      });
    }

    if (!access.canManage) {
      return res.status(403).json({
        success: false,
        message:
          'Only the asset owner or a household admin can remove sharing.',
      });
    }

    const {
      error,
    } = await supabase
      .from('pop_asset_sharing')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return res.json({
      success: true,
      message:
        'Sharing settings removed.',
    });
  } catch (error) {
    console.error(
      'deleteSharing:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to remove sharing settings.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};

// ============================================================
// VALIDATE SHARING ACCESS BY SHARING ID
// ============================================================

const validateSharingAccess = async (
  sharingId,
  userId
) => {
  const {
    data: sharing,
    error: sharingError,
  } = await supabase
    .from('pop_asset_sharing')
    .select(
      'id, asset_id, household_id'
    )
    .eq('id', sharingId)
    .maybeSingle();

  if (sharingError) {
    console.error(
      'validateSharingAccess:',
      sharingError
    );

    return {
      valid: false,
      error:
        'Unable to load sharing record.',
    };
  }

  if (!sharing) {
    return {
      valid: false,
      error:
        'Sharing record not found.',
    };
  }

  const access =
    await getAssetAccess(
      sharing.asset_id,
      userId
    );

  if (!access.valid) {
    return access;
  }

  return {
    valid: true,
    data: sharing,
    asset: access.asset,
    role: access.role,
    canManage: access.canManage,
  };
};

// ============================================================
// FIND AVAILABLE ASSETS
// ============================================================

export const findAvailableAssets = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const {
      search,
      category,
      householdId,
      page = 1,
      limit = 20,
    } = req.query;

    // --------------------------------------------------------
    // USER HOUSEHOLDS
    // --------------------------------------------------------

    const {
      data: memberships,
      error: membershipError,
    } = await supabase
      .from('pop_household_members')
      .select('household_id')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (membershipError) {
      throw membershipError;
    }

    const householdIds =
      memberships?.map(
        (item) => item.household_id
      ) || [];

    // --------------------------------------------------------
    // HOUSEHOLD FILTER
    // --------------------------------------------------------

    if (householdId) {
      if (!householdIds.includes(householdId)) {
        return res.status(403).json({
          success: false,
          message:
            'You do not belong to this household.',
        });
      }
    }

    // --------------------------------------------------------
    // BASE QUERY
    // --------------------------------------------------------

    let query = supabase
      .from('pop_asset_sharing')
      .select(
        `
          *,
          pop_assets!inner (
            id,
            name,
            asset_type,
            condition,
            status,
            household_id,
            user_id,
            purchase_id
          ),
          pop_households (
            id,
            name,
            household_type
          )
        `,
        { count: 'exact' }
      )
      .eq('sharing_enabled', true)
      .eq('allow_borrowing', true)
      .eq('pop_assets.status', 'active')
      .neq('pop_assets.user_id', userId);

    // --------------------------------------------------------
    // VISIBILITY
    //
    // household:
    //   only same household
    //
    // network:
    //   available to network
    //
    // public:
    //   everyone
    // --------------------------------------------------------

    if (householdId) {
      query = query.or(
        [
          `and(household_id.eq.${householdId},sharing_scope.eq.household)`,
          `sharing_scope.eq.network`,
          `sharing_scope.eq.public`,
        ].join(',')
      );
    } else {
      if (householdIds.length > 0) {
        query = query.or(
          [
            `sharing_scope.eq.network`,
            `sharing_scope.eq.public`,
            `and(household_id.in.(${householdIds.join(',')}),sharing_scope.eq.household)`,
          ].join(',')
        );
      } else {
        query = query.in('sharing_scope', [
          'network',
          'public',
        ]);
      }
    }

    // --------------------------------------------------------
    // CATEGORY
    // --------------------------------------------------------

    if (category?.trim()) {
      query = query.eq(
        'pop_assets.asset_type',
        category.trim()
      );
    }

    // --------------------------------------------------------
    // SEARCH
    // --------------------------------------------------------

    if (search?.trim()) {
      const term = search.trim();

      query = query.or(
        `name.ilike.%${term}%,asset_type.ilike.%${term}%`,
        {
          referencedTable: 'pop_assets',
        }
      );
    }

    // --------------------------------------------------------
    // PAGINATION
    // --------------------------------------------------------

    const pageNumber = Math.max(
      1,
      Number(page) || 1
    );

    const pageSize = Math.min(
      100,
      Math.max(1, Number(limit) || 20)
    );

    const from =
      (pageNumber - 1) * pageSize;

    const to =
      from + pageSize - 1;

    query = query
      .range(from, to)
      .order('created_at', {
        ascending: false,
      });

    const {
      data,
      error,
      count,
    } = await query;

    if (error) {
      throw error;
    }

    // --------------------------------------------------------
    // ENRICH PURCHASE + OWNER INFORMATION
    // --------------------------------------------------------

    const rows = data || [];

    const purchaseIds = [
      ...new Set(
        rows
          .map(
            (row) =>
              row.pop_assets?.purchase_id
          )
          .filter(Boolean)
      ),
    ];

    const ownerIds = [
      ...new Set(
        rows
          .map(
            (row) =>
              row.pop_assets?.user_id
          )
          .filter(Boolean)
      ),
    ];

    let purchaseMap = new Map();
    let ownerMap = new Map();

    // --------------------------------------------------------
    // PURCHASE INFORMATION
    // --------------------------------------------------------

    if (purchaseIds.length > 0) {
      const {
        data: purchases,
        error: purchaseError,
      } = await supabase
        .from('pop_purchases')
        .select(`
          id,
          product_image_url,
          brand,
          model
        `)
        .in('id', purchaseIds);

      if (!purchaseError && purchases) {
        purchaseMap = new Map(
          purchases.map(
            (purchase) => [
              purchase.id,
              purchase,
            ]
          )
        );
      }
    }

    // --------------------------------------------------------
    // OWNER INFORMATION
    //
    // Location comes from the OWNER profile,
    // NOT from pop_assets.location.
    // --------------------------------------------------------

    if (ownerIds.length > 0) {
      const {
        data: owners,
        error: ownerError,
      } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          avatar_url,
          business_name,
          address,
          country
        `)
        .in('id', ownerIds);

      if (!ownerError && owners) {
        ownerMap = new Map(
          owners.map(
            (owner) => [
              owner.id,
              owner,
            ]
          )
        );
      }
    }

    // --------------------------------------------------------
    // FINAL RESPONSE
    // --------------------------------------------------------

    const enriched = rows.map((row) => {
      const asset =
        row.pop_assets || {};

      const purchase =
        purchaseMap.get(
          asset.purchase_id
        ) || null;

      const owner =
        ownerMap.get(
          asset.user_id
        ) || null;

      return {
        ...row,

        // ----------------------------------------------
        // ASSET
        // ----------------------------------------------

        pop_assets: {
          ...asset,

          product_image_url:
            purchase?.product_image_url ||
            null,
        },

        // ----------------------------------------------
        // PURCHASE
        // ----------------------------------------------

        purchase,

        // ----------------------------------------------
        // OWNER
        //
        // Address and country belong to the USER,
        // not the asset.
        // ----------------------------------------------

        owner: owner
          ? {
              id: owner.id,
              full_name:
                owner.full_name,
              avatar_url:
                owner.avatar_url,
              business_name:
                owner.business_name,

              address:
                owner.address || null,

              country:
                owner.country || null,
            }
          : null,
      };
    });

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return res.json({
      success: true,
      data: enriched,

      pagination: {
        page: pageNumber,
        limit: pageSize,
        total: count || 0,
        pages: Math.ceil(
          (count || 0) / pageSize
        ),
      },
    });
  } catch (error) {
    console.error(
      'findAvailableAssets:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to find available assets.',

      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};