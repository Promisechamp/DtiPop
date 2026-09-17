import { supabase } from '../../db/index.js';
import { getWarrantyStatus, getDaysRemaining } from "../../utils/dateHelpers.js";
import { isOverdue } from "../../utils/dateHelpers.js";

// ============================================================
// HELPERS
// ============================================================

const getUserId = (req) => req.user?.id || null;

const verifyHouseholdMembership = async (userId, householdId) => {
  if (!householdId) return { valid: true };
  const { data, error } = await supabase
    .from('pop_household_members')
    .select('id, role')
    .eq('household_id', householdId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();
  if (error || !data) {
    return { valid: false, error: 'User is not a member of this household.' };
  }
  return { valid: true, role: data.role };
};

// ============================================================
// GET DASHBOARD (Enhanced with Phase 1)
// ============================================================

export const getDashboard = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID is required.",
      });
    }

    // ============================================================
    // 1. Get User's Households
    // ============================================================
    const { data: memberHouseholds, error: memberError } = await supabase
      .from('pop_household_members')
      .select(`
        household_id,
        role,
        pop_households:household_id (
          id,
          name,
          household_type,
          owner_id,
          created_at
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active');

    if (memberError) throw memberError;

    const households = memberHouseholds?.map(m => m.pop_households) || [];
    const householdIds = households.map(h => h.id);

    // ============================================================
// 2. Fetch Purchases (from all households + personal)
// ============================================================
let purchaseQuery = supabase
  .from("pop_purchases")
  .select(`
    *,
    pop_households (
      id,
      name
    ),
    pop_assets!pop_assets_purchase_id_fkey (
      id,
      name,
      asset_type
    )
  `)
  .eq("status", "active");

    // Personal purchases + household purchases
    if (householdIds.length > 0) {
      purchaseQuery = purchaseQuery.or(`user_id.eq.${userId},household_id.in.(${householdIds.join(',')})`);
    } else {
      purchaseQuery = purchaseQuery.eq("user_id", userId);
    }

    const { data: purchases, error: purchaseError } = await purchaseQuery;

    if (purchaseError) throw purchaseError;

    // ============================================================
    // 3. Fetch Warranties (from accessible purchases)
    // ============================================================
    const purchaseIds = purchases?.map(p => p.id) || [];
    let warrantyQuery = supabase
      .from("pop_warranties")
      .select("*");

    if (purchaseIds.length > 0) {
      warrantyQuery = warrantyQuery.in("purchase_id", purchaseIds);
    } else {
      warrantyQuery = warrantyQuery.eq("user_id", userId);
    }

    const { data: warranties, error: warrantyError } = await warrantyQuery;
    if (warrantyError) throw warrantyError;

    // ============================================================
    // 4. Fetch Claims
    // ============================================================
    const { data: claims, error: claimError } = await supabase
      .from("pop_claims")
      .select("*")
      .eq("user_id", userId);

    if (claimError) throw claimError;

    // ============================================================
    // 5. Fetch Assets (from all accessible households)
    // ============================================================
    // ============================================================
// 5. Fetch Assets (from all accessible households)
// ============================================================
let assetQuery = supabase
  .from("pop_assets")
  .select(`
    *,
    pop_households (
      id,
      name
    ),
    pop_purchases!pop_assets_purchase_id_fkey (
      id,
      product_name,
      brand,
      model
    )
  `)
  .eq("status", "active");

if (householdIds.length > 0) {
  assetQuery = assetQuery.in("household_id", householdIds);
} else {
  assetQuery = assetQuery.eq("user_id", userId);
}

const { data: assets, error: assetError } = await assetQuery;
if (assetError) throw assetError;

    // ============================================================
    // 6. Fetch Maintenance Records
    // ============================================================
    let maintenanceQuery = supabase
      .from("pop_maintenance")
      .select(`
        *,
        pop_assets (
          id,
          name,
          asset_type
        ),
        pop_households (
          id,
          name
        )
      `);

    if (householdIds.length > 0) {
      maintenanceQuery = maintenanceQuery.in("household_id", householdIds);
    } else {
      maintenanceQuery = maintenanceQuery.eq("user_id", userId);
    }

    const { data: maintenance, error: maintenanceError } = await maintenanceQuery;
    if (maintenanceError) throw maintenanceError;

    // ============================================================
    // 7. Fetch Tasks
    // ============================================================
    let taskQuery = supabase
      .from("pop_tasks")
      .select(`
        *,
        pop_assets (
          id,
          name,
          asset_type
        ),
        pop_households (
          id,
          name
        ),
        creator:profiles!pop_tasks_created_by_fkey (id, full_name, email),
        assignee:profiles!pop_tasks_assigned_to_fkey (id, full_name, email)
      `);

    if (householdIds.length > 0) {
      taskQuery = taskQuery.in("household_id", householdIds);
    } else {
      taskQuery = taskQuery.eq("created_by", userId);
    }

    const { data: tasks, error: taskError } = await taskQuery;
    if (taskError) throw taskError;

    // ============================================================
    // 8. Get POP Purchase IDs donated to DTI
    // ============================================================
    const { data: popTransfers, error: transferError } = await supabase
      .from("pop_purchase_transfers")
      .select("purchase_id, created_at, metadata")
      .eq("from_user_id", userId)
      .eq("transfer_type", "gift_to_donttrashit")
      .eq("status", "completed");

    if (transferError) {
      console.error("Error fetching POP transfers:", transferError);
    }

    const donatedPurchaseIds = popTransfers?.map(t => t.purchase_id) || [];

    // ============================================================
    // 9. Fetch DTI Items donated from POP
    // ============================================================
    let dtiItemList = [];

    if (donatedPurchaseIds.length > 0) {
      const { data: dtiItems, error: dtiError } = await supabase
        .from("items")
        .select(`
          id,
          title,
          images,
          status,
          views_count,
          applications_count,
          created_at,
          updated_at,
          source_purchase_id,
          source_type
        `)
        .eq("donor_id", userId)
        .eq("status", "active")
        .eq("source_type", "pop_purchase")
        .in("source_purchase_id", donatedPurchaseIds)
        .order("created_at", { ascending: false });

      if (dtiError) {
        console.error("Error fetching DTI donations:", dtiError);
      } else {
        dtiItemList = dtiItems || [];
      }
    }

    // ============================================================
    // 10. Fetch Discussion Counts for DTI Items
    // ============================================================
    let discussionCounts = {};

    if (dtiItemList.length > 0) {
      const itemIds = dtiItemList.map(item => item.id);
      
      const { data: discussions, error: discussionError } = await supabase
        .from("item_discussions")
        .select("item_id", { count: "exact" })
        .in("item_id", itemIds)
        .eq("is_deleted", false);

      if (!discussionError && discussions) {
        discussionCounts = discussions.reduce((acc, disc) => {
          acc[disc.item_id] = (acc[disc.item_id] || 0) + 1;
          return acc;
        }, {});
      }
    }

    // ============================================================
    // 11. Enrich DTI Items with Discussion Counts
    // ============================================================
    dtiItemList = dtiItemList.map(item => ({
      ...item,
      discussions_count: discussionCounts[item.id] || 0
    }));

    // ============================================================
    // 12. Build Computed Warranties with status
    // ============================================================
    const purchaseList = purchases || [];
    const warrantyList = warranties || [];

    const computedWarranties = purchaseList
      .filter((p) => p.warranty_end_date)
      .map((purchase) => {
        const warrantyRow = warrantyList.find(
          (w) => w.purchase_id === purchase.id
        );

        const endDate = warrantyRow?.end_date || purchase.warranty_end_date;
        const startDate = warrantyRow?.start_date || purchase.warranty_start_date;

        return {
          id: warrantyRow?.id || null,
          purchase_id: purchase.id,
          duration_months: warrantyRow?.duration_months || purchase.warranty_months,
          start_date: startDate,
          end_date: endDate,
          provider_name: warrantyRow?.provider_name || null,
          status: getWarrantyStatus(endDate),
          days_remaining: getDaysRemaining(endDate),
          purchase: {
            id: purchase.id,
            product_name: purchase.product_name,
            brand: purchase.brand,
            product_image_url: purchase.product_image_url,
            store_name: purchase.store_name,
            currency: purchase.currency,
            price: purchase.price,
            household: purchase.pop_households,
          },
        };
      });

    // ============================================================
    // 13. Compute Maintenance Status
    // ============================================================
    const now = new Date();
    const maintenanceList = maintenance || [];
    const overdueMaintenance = maintenanceList.filter(m => {
      if (m.status !== 'pending') return false;
      if (!m.next_due_at) return false;
      return new Date(m.next_due_at) < now;
    });

    const upcomingMaintenance = maintenanceList.filter(m => {
      if (m.status !== 'pending') return false;
      if (!m.next_due_at) return false;
      const due = new Date(m.next_due_at);
      const daysUntil = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
      return daysUntil <= 14 && daysUntil >= 0;
    });

    // ============================================================
    // 14. Compute Task Status
    // ============================================================
    const taskList = tasks || [];
    const overdueTasks = taskList.filter(t => {
      if (t.status !== 'pending' && t.status !== 'in_progress') return false;
      if (!t.due_date) return false;
      return isOverdue(t.due_date);
    });

    const pendingTasks = taskList.filter(t => 
      t.status === 'pending' || t.status === 'in_progress'
    );

    const completedTasks = taskList.filter(t => 
      t.status === 'completed'
    );

    // ============================================================
    // 15. POP Statistics
    // ============================================================
    const activeWarranties = computedWarranties.filter((w) => w.status === "active");
    const expiringWarranties = computedWarranties.filter((w) => w.status === "expiring");
    const expiredWarranties = computedWarranties.filter((w) => w.status === "expired");

    const totalSpent = purchaseList.reduce((total, p) => total + Number(p.price || 0), 0);

    const openClaims = (claims || []).filter(
      (claim) => !["resolved", "rejected", "closed"].includes(claim.status)
    );

    // ============================================================
    // 16. DTI Donation Statistics
    // ============================================================
    const donatedCount = dtiItemList.length;
    const totalViews = dtiItemList.reduce((sum, item) => sum + (item.views_count || 0), 0);
    const totalApplications = dtiItemList.reduce((sum, item) => sum + (item.applications_count || 0), 0);
    const totalDiscussions = dtiItemList.reduce((sum, item) => sum + (item.discussions_count || 0), 0);

    const itemsWithActivity = dtiItemList.filter(item => 
      (item.views_count || 0) > 0 || 
      (item.applications_count || 0) > 0 || 
      (item.discussions_count || 0) > 0
    );

    const recentActiveItems = dtiItemList
      .filter(item => 
        (item.views_count || 0) > 0 || 
        (item.applications_count || 0) > 0 || 
        (item.discussions_count || 0) > 0
      )
      .slice(0, 3);

    // ============================================================
    // 17. Recent Items
    // ============================================================
    const recentPurchases = [...purchaseList]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    const expiringItems = expiringWarranties
      .sort((a, b) => new Date(a.end_date) - new Date(b.end_date))
      .slice(0, 5);

    const recentClaims = [...(claims || [])]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    // ============================================================
    // 18. Attention Items (for dashboard alerts)
    // ============================================================
    const attentionItems = [];

    // Expiring warranties (within 30 days)
    expiringWarranties.forEach(w => {
      attentionItems.push({
        type: 'warranty_expiring',
        priority: w.days_remaining <= 7 ? 'high' : 'medium',
        title: `Warranty expiring: ${w.purchase.product_name}`,
        description: `Expires in ${w.days_remaining} days`,
        link: `/purchases/${w.purchase_id}`,
        date: w.end_date,
      });
    });

    // Overdue maintenance
    overdueMaintenance.forEach(m => {
      attentionItems.push({
        type: 'maintenance_overdue',
        priority: 'high',
        title: `Maintenance overdue: ${m.title}`,
        description: `Was due on ${new Date(m.next_due_at).toLocaleDateString()}`,
        link: `/maintenance/${m.id}`,
        date: m.next_due_at,
      });
    });

    // Overdue tasks
    overdueTasks.forEach(t => {
      attentionItems.push({
        type: 'task_overdue',
        priority: 'high',
        title: `Task overdue: ${t.title}`,
        description: `Due on ${new Date(t.due_date).toLocaleDateString()}`,
        link: `/tasks/${t.id}`,
        date: t.due_date,
      });
    });

    // Sort attention items by date (soonest first)
    attentionItems.sort((a, b) => new Date(a.date) - new Date(b.date));

    // ============================================================
    // 19. Response
    // ============================================================
    return res.json({
      success: true,
      data: {
        // Household stats
        households: {
          count: households.length,
          list: households,
        },

        // POP Statistics
        statistics: {
          totalPurchases: purchaseList.length,
          totalSpent,
          totalWarranties: computedWarranties.length,
          activeWarranties: activeWarranties.length,
          expiringWarranties: expiringWarranties.length,
          expiredWarranties: expiredWarranties.length,
          totalClaims: (claims || []).length,
          openClaims: openClaims.length,
          totalAssets: assets?.length || 0,
          totalMaintenance: maintenanceList.length,
          overdueMaintenance: overdueMaintenance.length,
          upcomingMaintenance: upcomingMaintenance.length,
          totalTasks: taskList.length,
          pendingTasks: pendingTasks.length,
          overdueTasks: overdueTasks.length,
          completedTasks: completedTasks.length,
        },
        
        // Recent Items
        recentPurchases,
        expiringItems,
        recentClaims,

        // Maintenance & Tasks summaries
        maintenance: {
          overdue: overdueMaintenance.slice(0, 5),
          upcoming: upcomingMaintenance.slice(0, 5),
          total: maintenanceList.length,
        },
        tasks: {
          overdue: overdueTasks.slice(0, 5),
          pending: pendingTasks.slice(0, 5),
          total: taskList.length,
        },
        
        // Attention items (cross-module alerts)
        attention: attentionItems.slice(0, 10),

        // DTI Donations
        dtiDonations: {
          donatedCount,
          totalViews,
          totalApplications,
          totalDiscussions,
          itemsWithActivity: itemsWithActivity.length,
          recentActiveItems,
          items: dtiItemList,
        },
      },
    });
  } catch (error) {
    console.error("PoP Dashboard Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard.",
    });
  }
};

// ============================================================
// GET DTI DONATIONS
// ============================================================

export const getDTIDonations = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID is required.",
      });
    }

    // 1. Get POP purchase IDs donated to DTI
    const { data: popTransfers, error: transferError } = await supabase
      .from("pop_purchase_transfers")
      .select("purchase_id, created_at, metadata")
      .eq("from_user_id", userId)
      .eq("transfer_type", "gift_to_donttrashit")
      .eq("status", "completed");

    if (transferError) {
      console.error("Error fetching POP transfers:", transferError);
    }

    const donatedPurchaseIds = popTransfers?.map(t => t.purchase_id) || [];

    if (donatedPurchaseIds.length === 0) {
      return res.json({
        success: true,
        data: {
          donatedCount: 0,
          totalViews: 0,
          totalApplications: 0,
          totalDiscussions: 0,
          itemsWithActivity: 0,
          recentActiveItems: [],
          items: [],
        },
      });
    }

    // 2. Fetch DTI items from POP purchases
    const { data: dtiItems, error: dtiError } = await supabase
      .from("items")
      .select(`
        id,
        title,
        images,
        status,
        views_count,
        applications_count,
        created_at,
        updated_at,
        source_purchase_id,
        source_type
      `)
      .eq("donor_id", userId)
      .eq("status", "active")
      .eq("source_type", "pop_purchase")
      .in("source_purchase_id", donatedPurchaseIds)
      .order("created_at", { ascending: false });

    if (dtiError) {
      console.error("Error fetching DTI items:", dtiError);
      return res.status(400).json({
        success: false,
        message: "Failed to fetch DTI donations",
      });
    }

    const dtiItemList = dtiItems || [];

    // 3. Fetch discussion counts
    let discussionCounts = {};

    if (dtiItemList.length > 0) {
      const itemIds = dtiItemList.map(item => item.id);
      
      const { data: discussions, error: discussionError } = await supabase
        .from("item_discussions")
        .select("item_id", { count: "exact" })
        .in("item_id", itemIds)
        .eq("is_deleted", false);

      if (!discussionError && discussions) {
        discussionCounts = discussions.reduce((acc, disc) => {
          acc[disc.item_id] = (acc[disc.item_id] || 0) + 1;
          return acc;
        }, {});
      }
    }

    // 4. Enrich items
    const enrichedItems = dtiItemList.map(item => ({
      ...item,
      discussions_count: discussionCounts[item.id] || 0,
    }));

    // 5. Calculate stats
    const donatedCount = enrichedItems.length;
    const totalViews = enrichedItems.reduce((sum, item) => sum + (item.views_count || 0), 0);
    const totalApplications = enrichedItems.reduce((sum, item) => sum + (item.applications_count || 0), 0);
    const totalDiscussions = enrichedItems.reduce((sum, item) => sum + (item.discussions_count || 0), 0);

    const itemsWithActivity = enrichedItems.filter(item => 
      (item.views_count || 0) > 0 || 
      (item.applications_count || 0) > 0 || 
      (item.discussions_count || 0) > 0
    );

    const recentActiveItems = enrichedItems
      .filter(item => 
        (item.views_count || 0) > 0 || 
        (item.applications_count || 0) > 0 || 
        (item.discussions_count || 0) > 0
      )
      .slice(0, 3);

    return res.json({
      success: true,
      data: {
        donatedCount,
        totalViews,
        totalApplications,
        totalDiscussions,
        itemsWithActivity: itemsWithActivity.length,
        recentActiveItems,
        items: enrichedItems,
      },
    });

  } catch (error) {
    console.error("Get DTI donations error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch DTI donation stats",
    });
  }
};

// ============================================================
// GET EXPIRING WARRANTIES (with household context)
// ============================================================

export const getExpiringWarranties = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID is required.",
      });
    }

    const { days = 30 } = req.query;

    // Get accessible households
    const { data: memberHouseholds, error: memberError } = await supabase
      .from('pop_household_members')
      .select('household_id')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (memberError) throw memberError;
    const householdIds = memberHouseholds.map(h => h.household_id);

    // Get purchases from households + personal
    let purchaseQuery = supabase
      .from("pop_purchases")
      .select("*")
      .eq("status", "active")
      .not("warranty_end_date", "is", null);

    if (householdIds.length > 0) {
      purchaseQuery = purchaseQuery.or(`user_id.eq.${userId},household_id.in.(${householdIds.join(',')})`);
    } else {
      purchaseQuery = purchaseQuery.eq("user_id", userId);
    }

    const { data: purchases, error: purchaseError } = await purchaseQuery;
    if (purchaseError) throw purchaseError;

    // Get warranties for these purchases
    const purchaseIds = purchases.map(p => p.id);
    const { data: warranties, error: warrantyError } = await supabase
      .from("pop_warranties")
      .select("*")
      .in("purchase_id", purchaseIds);

    if (warrantyError) throw warrantyError;

    // Compute expiring warranties
    const now = new Date();
    const daysInMs = Number(days) * 24 * 60 * 60 * 1000;
    const cutoff = new Date(now.getTime() + daysInMs);

    const expiring = purchases
      .map(purchase => {
        const warranty = warranties.find(w => w.purchase_id === purchase.id);
        const endDate = warranty?.end_date || purchase.warranty_end_date;
        if (!endDate) return null;
        const end = new Date(endDate);
        if (end <= now || end > cutoff) return null;
        return {
          purchase_id: purchase.id,
          product_name: purchase.product_name,
          brand: purchase.brand,
          end_date: endDate,
          days_remaining: Math.ceil((end - now) / (1000 * 60 * 60 * 24)),
          warranty: warranty,
          household: purchase.household_id,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.days_remaining - b.days_remaining);

    return res.json({
      success: true,
      data: expiring,
    });
  } catch (error) {
    console.error("getExpiringWarranties:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch expiring warranties.",
    });
  }
};

// ============================================================
// GET OVERDUE MAINTENANCE
// ============================================================

export const getOverdueMaintenance = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID is required.",
      });
    }

    // Get accessible households
    const { data: memberHouseholds, error: memberError } = await supabase
      .from('pop_household_members')
      .select('household_id')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (memberError) throw memberError;
    const householdIds = memberHouseholds.map(h => h.household_id);

    let maintenanceQuery = supabase
      .from("pop_maintenance")
      .select(`
        *,
        pop_assets (
          id,
          name,
          asset_type
        ),
        pop_households (
          id,
          name
        )
      `)
      .eq("status", "pending")
      .not("next_due_at", "is", null);

    if (householdIds.length > 0) {
      maintenanceQuery = maintenanceQuery.in("household_id", householdIds);
    } else {
      maintenanceQuery = maintenanceQuery.eq("user_id", userId);
    }

    const { data: maintenance, error: maintenanceError } = await maintenanceQuery;
    if (maintenanceError) throw maintenanceError;

    const now = new Date();
    const overdue = maintenance
      .filter(m => new Date(m.next_due_at) < now)
      .sort((a, b) => new Date(a.next_due_at) - new Date(b.next_due_at));

    return res.json({
      success: true,
      data: overdue,
    });
  } catch (error) {
    console.error("getOverdueMaintenance:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch overdue maintenance.",
    });
  }
};

// ============================================================
// GET OVERDUE TASKS
// ============================================================

export const getOverdueTasks = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User ID is required.",
      });
    }

    // Get accessible households
    const { data: memberHouseholds, error: memberError } = await supabase
      .from('pop_household_members')
      .select('household_id')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (memberError) throw memberError;
    const householdIds = memberHouseholds.map(h => h.household_id);

    let taskQuery = supabase
      .from("pop_tasks")
      .select(`
        *,
        pop_assets (
          id,
          name,
          asset_type
        ),
        pop_households (
          id,
          name
        ),
        creator:profiles!pop_tasks_created_by_fkey (id, full_name, email),
        assignee:profiles!pop_tasks_assigned_to_fkey (id, full_name, email)
      `)
      .in("status", ["pending", "in_progress"])
      .not("due_date", "is", null);

    if (householdIds.length > 0) {
      taskQuery = taskQuery.in("household_id", householdIds);
    } else {
      taskQuery = taskQuery.eq("created_by", userId);
    }

    const { data: tasks, error: taskError } = await taskQuery;
    if (taskError) throw taskError;

    const overdue = tasks
      .filter(t => isOverdue(t.due_date))
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

    return res.json({
      success: true,
      data: overdue,
    });
  } catch (error) {
    console.error("getOverdueTasks:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch overdue tasks.",
    });
  }
};