// backend/controllers/analyticsController.js
import { supabase } from '../../db/index.js';

/**
 * Helper: parse range query → number of days
 */
const getDaysFromRange = (range = '30d') => {
  if (range === '7d') return 7;
  if (range === '90d') return 90;
  if (range === '180d') return 180;
  if (range === '365d') return 365;
  return 30; // default
};

/**
 * Helper: build a continuous date array (YYYY-MM-DD)
 */
const buildDateArray = (days) => {
  const dates = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
};

/**
 * Helper: group rows by created_at::date
 */
const groupByDate = (rows, dateField = 'created_at') => {
  const map = {};
  (rows || []).forEach((row) => {
    if (!row[dateField]) return;
    const day = new Date(row[dateField]).toISOString().slice(0, 10);
    map[day] = (map[day] || 0) + 1;
  });
  return map;
};

// ============================================
// Admin dashboard stats
// ============================================

export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    // Quick stats - just counts
    const [
      { count: totalUsers },
      { count: newUsersToday },
      { count: totalItems },
      { count: activeItems },
      { count: pendingItems },
      { count: totalApplications },
      { count: pendingApps },
      { count: totalWinners },
      { count: winnersThisWeek },
      { count: viewsToday },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', today),
      supabase.from('items').select('*', { count: 'exact', head: true }),
      supabase.from('items').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('items').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('applications').select('*', { count: 'exact', head: true }),
      supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('winners').select('*', { count: 'exact', head: true }),
      supabase.from('winners').select('*', { count: 'exact', head: true }).gte('created_at', weekStart.toISOString()),
      supabase.from('item_views').select('*', { count: 'exact', head: true }).gte('viewed_at', today),
    ]);

    // Recent 5 items
    const { data: recentItems } = await supabase
      .from('items')
      .select('id, title, category, status, images, applications_count, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    // Recent 5 users
    const { data: recentUsers } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, created_at, role')
      .order('created_at', { ascending: false })
      .limit(5);

    // Recent 5 applications
    const { data: recentApplications } = await supabase
      .from('applications')
      .select('id, status, created_at, applicant_id, item_id')
      .order('created_at', { ascending: false })
      .limit(5);

    // Get applicant/item names for recent apps
    const applicantIds = [...new Set((recentApplications || []).map(a => a.applicant_id))];
    const itemIds = [...new Set((recentApplications || []).map(a => a.item_id))];
    
    const [{ data: applicants }, { data: items }] = await Promise.all([
      applicantIds.length ? supabase.from('profiles').select('id, full_name, avatar_url').in('id', applicantIds) : { data: [] },
      itemIds.length ? supabase.from('items').select('id, title').in('id', itemIds) : { data: [] },
    ]);

    const applicantMap = Object.fromEntries((applicants || []).map(a => [a.id, a]));
    const itemMap = Object.fromEntries((items || []).map(i => [i.id, i]));

    const appsWithDetails = (recentApplications || []).map(app => ({
      ...app,
      applicant: applicantMap[app.applicant_id] || { full_name: 'Anonymous' },
      item: itemMap[app.item_id] || { title: 'Unknown' },
    }));

    res.json({
      success: true,
      data: {
        users: { total: totalUsers || 0, newToday: newUsersToday || 0 },
        items: { total: totalItems || 0, active: activeItems || 0, pending: pendingItems || 0 },
        applications: { total: totalApplications || 0, pending: pendingApps || 0 },
        winners: { total: totalWinners || 0, thisWeek: winnersThisWeek || 0 },
        viewsToday: viewsToday || 0,
        recentItems: recentItems || [],
        recentUsers: recentUsers || [],
        recentApplications: appsWithDetails,
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to load dashboard' });
  }
};




// ============================================
// OVERVIEW + TIMESERIES (main endpoint)
// ============================================
/**
 * GET /api/admin/analytics/overview?range=30d
 * Returns snapshot KPIs + timeseries for charts
 */
// backend/controllers/analyticsController.js

export const getAnalyticsOverview = async (req, res) => {
  try {
    const range = req.query.range || '30d';
    const days = getDaysFromRange(range);
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const fromISO = fromDate.toISOString();

    // ============================================
    // SNAPSHOT COUNTS – ALL TIME (no date filter)
    // ============================================
    const [
      { count: totalUsers },
      { count: newUsersToday },
      { count: totalItems },
      { count: activeItems },
      { count: pendingItems },
      { count: completedItems },
      { count: cancelledItems },
      { count: flaggedItems },
      { count: featuredItems },
      { count: totalApplications },
      { count: pendingApps },
      { count: acceptedApps },
      { count: rejectedApps },
      { count: cancelledApps },
      { count: totalWinners },
      { count: winnersThisWeek },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      supabase.from('items').select('*', { count: 'exact', head: true }),
      supabase.from('items').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('items').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('items').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('items').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
      supabase.from('items').select('*', { count: 'exact', head: true }).eq('is_flagged', true),      // ← new
      supabase.from('items').select('*', { count: 'exact', head: true }).eq('is_featured', true),     // ← new
      supabase.from('applications').select('*', { count: 'exact', head: true }),
      supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'accepted'),
      supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
      supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
      supabase.from('winners').select('*', { count: 'exact', head: true }),
      supabase
        .from('winners')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    // Views – all‑time unique views from items.views_count
    const { data: itemsWithViews } = await supabase.from('items').select('views_count');
    const uniqueViews = (itemsWithViews || []).reduce((sum, i) => sum + (i.views_count || 0), 0);

    // Total view events (all time)
    const { count: totalViewEvents } = await supabase
      .from('item_views')
      .select('*', { count: 'exact', head: true });

    // Views today
    const { count: viewsToday } = await supabase
      .from('item_views')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

    // Categories – all time
    const { data: categoryRows } = await supabase.from('items').select('category');
    const categoryMap = {};
    (categoryRows || []).forEach((row) => {
      const cat = row.category || 'Other';
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });
    const categories = Object.entries(categoryMap)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // ============================================
    // TIMESERIES – still based on the selected range
    // ============================================
    const [
      { data: usersRaw },
      { data: itemsRaw },
      { data: appsRaw },
      { data: viewsRaw },
      { data: completedRaw },
    ] = await Promise.all([
      supabase.from('profiles').select('created_at').gte('created_at', fromISO),
      supabase.from('items').select('created_at').gte('created_at', fromISO),
      supabase.from('applications').select('created_at').gte('created_at', fromISO),
      supabase.from('item_views').select('created_at').gte('created_at', fromISO),
      supabase
        .from('items')
        .select('completed_at')
        .not('completed_at', 'is', null)
        .gte('completed_at', fromISO),
    ]);

    const usersByDay = groupByDate(usersRaw);
    const itemsByDay = groupByDate(itemsRaw);
    const appsByDay = groupByDate(appsRaw);
    const viewsByDay = groupByDate(viewsRaw);
    const completedByDay = groupByDate(completedRaw, 'completed_at');

    const dates = buildDateArray(days);
    const timeseries = dates.map((date) => ({
      date,
      users: usersByDay[date] || 0,
      items: itemsByDay[date] || 0,
      applications: appsByDay[date] || 0,
      views: viewsByDay[date] || 0,
      completed: completedByDay[date] || 0,
    }));

    // ============================================
    // RESPONSE
    // ============================================
    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers || 0,
          newToday: newUsersToday || 0,
        },
        items: {
          total: totalItems || 0,
          active: activeItems || 0,
          pending: pendingItems || 0,
          completed: completedItems || 0,
          cancelled: cancelledItems || 0,
          flagged: flaggedItems || 0,     // ← new
          featured: featuredItems || 0,   // ← new
        },
        applications: {
          total: totalApplications || 0,
          pending: pendingApps || 0,
          accepted: acceptedApps || 0,
          rejected: rejectedApps || 0,
          cancelled: cancelledApps || 0,
        },
        winners: {
          total: totalWinners || 0,
          thisWeek: winnersThisWeek || 0,
        },
        views: {
          unique: uniqueViews || 0,
          total: totalViewEvents || 0,
          today: viewsToday || 0,
        },
        categories,
        timeseries,
      },
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load analytics overview',
    });
  }
};




// ============================================
// FUNNEL ANALYTICS
// ============================================
/**
 * GET /api/admin/analytics/funnel?range=30d
 * View → Apply → Accept → Complete conversion funnel
 */

export const getFunnelAnalytics = async (req, res) => {
  try {
    const range = req.query.range || '30d';
    const days = getDaysFromRange(range);
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const fromISO = fromDate.toISOString();

    // Get counts for each funnel stage
    const [
      { count: totalItems },
      { count: itemsWithViews },
      { count: itemsWithApplications },
      { count: totalApplications },
      { count: acceptedApplications },
      { count: completedItems },
    ] = await Promise.all([
      // Stage 1: Total items listed
      supabase.from('items').select('*', { count: 'exact', head: true }).gte('created_at', fromISO),
      
      // Stage 2: Items that got views
      supabase.from('items').select('*', { count: 'exact', head: true }).gte('created_at', fromISO).gt('views_count', 0),
      
      // Stage 3: Items that received applications
      supabase.from('items').select('*', { count: 'exact', head: true }).gte('created_at', fromISO).gt('applications_count', 0),
      
      // Stage 4: Total applications submitted
      supabase.from('applications').select('*', { count: 'exact', head: true }).gte('created_at', fromISO),
      
      // Stage 5: Accepted applications
      supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'accepted').gte('created_at', fromISO),
      
      // Stage 6: Completed (given away)
      supabase.from('items').select('*', { count: 'exact', head: true }).eq('status', 'completed').gte('created_at', fromISO),
    ]);

    // Calculate conversion rates
    const viewRate = totalItems > 0 ? ((itemsWithViews / totalItems) * 100).toFixed(1) : 0;
    const applicationRate = itemsWithViews > 0 ? ((itemsWithApplications / itemsWithViews) * 100).toFixed(1) : 0;
    const acceptanceRate = totalApplications > 0 ? ((acceptedApplications / totalApplications) * 100).toFixed(1) : 0;
    const completionRate = acceptedApplications > 0 ? ((completedItems / acceptedApplications) * 100).toFixed(1) : 0;

    // Timeseries data for funnel
    const dates = buildDateArray(days);
    const [
      { data: itemsByDayRaw },
      { data: viewsByDayRaw },
      { data: appsByDayRaw },
      { data: acceptedByDayRaw },
      { data: completedByDayRaw },
    ] = await Promise.all([
      supabase.from('items').select('created_at').gte('created_at', fromISO),
      supabase.from('item_views').select('created_at').gte('created_at', fromISO),
      supabase.from('applications').select('created_at').gte('created_at', fromISO),
      supabase.from('applications').select('created_at').eq('status', 'accepted').gte('created_at', fromISO),
      supabase.from('items').select('completed_at').not('completed_at', 'is', null).gte('completed_at', fromISO),
    ]);

    const itemsByDay = groupByDate(itemsByDayRaw);
    const viewsByDay = groupByDate(viewsByDayRaw);
    const appsByDay = groupByDate(appsByDayRaw);
    const acceptedByDay = groupByDate(acceptedByDayRaw);
    const completedByDay = groupByDate(completedByDayRaw, 'completed_at');

    const timeseries = dates.map((date) => ({
      date,
      items: itemsByDay[date] || 0,
      viewed: viewsByDay[date] || 0,
      applied: appsByDay[date] || 0,
      accepted: acceptedByDay[date] || 0,
      completed: completedByDay[date] || 0,
    }));

    res.json({
      success: true,
      data: {
        stages: {
          listed: totalItems || 0,
          viewed: itemsWithViews || 0,
          applied: itemsWithApplications || 0,
          accepted: acceptedApplications || 0,
          completed: completedItems || 0,
        },
        conversionRates: {
          viewRate: parseFloat(viewRate),
          applicationRate: parseFloat(applicationRate),
          acceptanceRate: parseFloat(acceptanceRate),
          completionRate: parseFloat(completionRate),
        },
        timeseries,
      },
    });
  } catch (error) {
    console.error('Funnel analytics error:', error);
    res.status(500).json({ success: false, error: 'Failed to load funnel analytics' });
  }
};

// ============================================
// ITEM PERFORMANCE
// ============================================

export const getItemPerformance = async (req, res) => {
  try {
    const range = req.query.range || '30d';
    const days = getDaysFromRange(range);
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const fromISO = fromDate.toISOString();

    // Top items by views
    const { data: topByViews } = await supabase
      .from('items')
      .select(`
        id,
        title,
        category,
        views_count,
        applications_count,
        status,
        donor:profiles!items_donor_id_fkey(
          id,
          full_name,
          avatar_url,
          location,
          rating
        ),
        created_at
      `)
      .gte('created_at', fromISO)
      .order('views_count', { ascending: false })
      .limit(10);

    // Top items by applications
    const { data: topByApplications } = await supabase
      .from('items')
      .select(`
        id,
        title,
        category,
        views_count,
        applications_count,
        status,
        donor:profiles!items_donor_id_fkey(
          id,
          full_name,
          avatar_url,
          location,
          rating
        ),
        created_at
      `)
      .gte('created_at', fromISO)
      .order('applications_count', { ascending: false })
      .limit(10);

    // Items with zero applications (still active)
    const { data: zeroApplicationItems } = await supabase
      .from('items')
      .select(`
        id,
        title,
        category,
        views_count,
        status,
        donor:profiles!items_donor_id_fkey(
          id,
          full_name,
          avatar_url,
          location,
          rating
        ),
        created_at
      `)
      .eq('applications_count', 0)
      .eq('status', 'active')
      .gte('created_at', fromISO)
      .order('created_at', { ascending: false })
      .limit(10);

    // Items stuck in pending status
    const { data: stuckItems } = await supabase
      .from('items')
      .select(`
        id,
        title,
        category,
        applications_count,
        created_at,
        donor:profiles!items_donor_id_fkey(
          id,
          full_name,
          avatar_url,
          location,
          rating
        )
      `)
      .eq('status', 'pending')
      .gte('created_at', fromISO)
      .order('created_at', { ascending: true })
      .limit(10);

    // Category performance
    const { data: categoryData } = await supabase
      .from('items')
      .select('category, views_count, applications_count, status')
      .gte('created_at', fromISO);

    const categoryPerformance = {};
    (categoryData || []).forEach((item) => {
      const cat = item.category || 'Other';
      if (!categoryPerformance[cat]) {
        categoryPerformance[cat] = {
          category: cat,
          total: 0,
          active: 0,
          completed: 0,
          totalViews: 0,
          totalApplications: 0,
        };
      }
      categoryPerformance[cat].total++;
      if (item.status === 'active') categoryPerformance[cat].active++;
      if (item.status === 'completed') categoryPerformance[cat].completed++;
      categoryPerformance[cat].totalViews += item.views_count || 0;
      categoryPerformance[cat].totalApplications += item.applications_count || 0;
    });

    const categories = Object.values(categoryPerformance)
      .sort((a, b) => b.total - a.total);

    res.json({
      success: true,
      data: {
        topByViews: topByViews || [],
        topByApplications: topByApplications || [],
        zeroApplicationItems: zeroApplicationItems || [],
        stuckItems: stuckItems || [],
        categories,
      },
    });
  } catch (error) {
    console.error('Item performance error:', error);
    res.status(500).json({ success: false, error: 'Failed to load item performance' });
  }
};




// ============================================
// USER INSIGHTS
// ============================================

// backend/controllers/analyticsController.js

export const getUserInsights = async (req, res) => {
  try {
    const range = req.query.range || '30d';
    const days = getDaysFromRange(range);
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const fromISO = fromDate.toISOString();

    // ============================================
    // Top Donors - Get profiles with actual item counts
    // ============================================
    // First get all items grouped by donor
    const { data: donorItems } = await supabase
      .from('items')
      .select('donor_id')
      .gte('created_at', fromISO);

    // Count items per donor
    const donorCountMap = {};
    (donorItems || []).forEach(item => {
      donorCountMap[item.donor_id] = (donorCountMap[item.donor_id] || 0) + 1;
    });

    // Get top donor IDs sorted by count
    const topDonorIds = Object.entries(donorCountMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id);

    // Fetch profiles for top donors
    let topDonors = [];
    if (topDonorIds.length > 0) {
      const { data: donorProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, location, rating')
        .in('id', topDonorIds);

      topDonors = (donorProfiles || []).map(profile => ({
        ...profile,
        items_given_count: donorCountMap[profile.id] || 0,
      })).sort((a, b) => b.items_given_count - a.items_given_count);
    }

    // ============================================
    // Top Applicants - Get profiles with application counts & status breakdown
    // ============================================
    const { data: allApplications } = await supabase
      .from('applications')
      .select('applicant_id, status')
      .gte('created_at', fromISO);

    // Count applications per user with status breakdown
    const applicantMap = {};
    (allApplications || []).forEach(app => {
      if (!applicantMap[app.applicant_id]) {
        applicantMap[app.applicant_id] = { total: 0, accepted: 0, rejected: 0 };
      }
      applicantMap[app.applicant_id].total++;
      if (app.status === 'accepted') applicantMap[app.applicant_id].accepted++;
      if (app.status === 'rejected') applicantMap[app.applicant_id].rejected++;
    });

    // Get top applicant IDs
    const topApplicantIds = Object.entries(applicantMap)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10)
      .map(([id]) => id);

    // Fetch profiles
    let topApplicants = [];
    if (topApplicantIds.length > 0) {
      const { data: applicantProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, location')
        .in('id', topApplicantIds);

      topApplicants = (applicantProfiles || []).map(profile => ({
        ...profile,
        total_applications: applicantMap[profile.id]?.total || 0,
        accepted_count: applicantMap[profile.id]?.accepted || 0,
        rejected_count: applicantMap[profile.id]?.rejected || 0,
      })).sort((a, b) => b.total_applications - a.total_applications);
    }

    // ============================================
    // Repeat Winners - Users who won multiple items
    // ============================================
    const { data: winnerData } = await supabase
      .from('winners')
      .select('winner_id');

    // Count wins per user
    const winnerCountMap = {};
    (winnerData || []).forEach(win => {
      winnerCountMap[win.winner_id] = (winnerCountMap[win.winner_id] || 0) + 1;
    });

    // Filter users with more than 1 win
    const repeatWinnerIds = Object.entries(winnerCountMap)
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id);

    // Fetch profiles
    let repeatWinners = [];
    if (repeatWinnerIds.length > 0) {
      const { data: winnerProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, location')
        .in('id', repeatWinnerIds);

      repeatWinners = (winnerProfiles || []).map(profile => ({
        ...profile,
        wins_count: winnerCountMap[profile.id] || 0,
      })).sort((a, b) => b.wins_count - a.wins_count);
    }

    // ============================================
    // New users over time
    // ============================================
    const { data: newUsers } = await supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', fromISO)
      .order('created_at', { ascending: true });

    const usersByDay = groupByDate(newUsers);
    const dates = buildDateArray(days);
    const userGrowth = dates.map((date) => ({
      date,
      newUsers: usersByDay[date] || 0,
    }));

    // ============================================
    // Summary counts
    // ============================================
    const [
      { count: totalUsers },
      { count: bannedUsers },
      { count: verifiedUsers },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('ban_status', 'banned'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('email_verified', true),
    ]);

    res.json({
      success: true,
      data: {
        topDonors,
        topApplicants,
        repeatWinners,
        userGrowth,
        summary: {
          totalUsers: totalUsers || 0,
          activeDonors: Object.keys(donorCountMap).length,
          activeApplicants: Object.keys(applicantMap).length,
          bannedUsers: bannedUsers || 0,
          verifiedUsers: verifiedUsers || 0,
        },
      },
    });
  } catch (error) {
    console.error('User insights error:', error);
    res.status(500).json({ success: false, error: 'Failed to load user insights' });
  }
};




// ============================================
// FULFILMENT ANALYTICS
// ============================================
/**
 * GET /api/admin/analytics/fulfilment?range=30d
 * Time to complete, stuck items, success rates
 */
export const getFulfilmentAnalytics = async (req, res) => {
  try {
    const range = req.query.range || '30d';
    const days = getDaysFromRange(range);
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const fromISO = fromDate.toISOString();

    // Completed items with their applications
    const { data: completedItems } = await supabase
      .from('items')
      .select(`
        id,
        title,
        created_at,
        completed_at,
        applications:applications(
          id,
          created_at,
          status
        )
      `)
      .eq('status', 'completed')
      .gte('completed_at', fromISO)
      .order('completed_at', { ascending: false });

    // Calculate average time to complete
    let totalCompletionTime = 0;
    let completionCount = 0;
    const completionTimes = [];

    (completedItems || []).forEach((item) => {
      if (item.created_at && item.completed_at) {
        const created = new Date(item.created_at);
        const completed = new Date(item.completed_at);
        const daysToComplete = Math.round((completed - created) / (1000 * 60 * 60 * 24));
        totalCompletionTime += daysToComplete;
        completionCount++;
        completionTimes.push({
          itemId: item.id,
          title: item.title,
          daysToComplete,
          applicationsCount: (item.applications || []).length,
        });
      }
    });

    const avgCompletionDays = completionCount > 0 
      ? Math.round(totalCompletionTime / completionCount) 
      : 0;

    // Items stuck (pending for too long - more than 14 days)
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: stuckItems } = await supabase
      .from('items')
      .select(`
        id,
        title,
        category,
        applications_count,
        created_at,
        donor:profiles!items_donor_id_fkey(full_name)
      `)
      .eq('status', 'pending')
      .lte('created_at', twoWeeksAgo)
      .order('created_at', { ascending: true })
      .limit(10);

    // Success rate by category
    const { data: categoryStats } = await supabase
      .from('items')
      .select('category, status')
      .gte('created_at', fromISO);

    const categoryMap = {};
    (categoryStats || []).forEach((item) => {
      const cat = item.category || 'Other';
      if (!categoryMap[cat]) {
        categoryMap[cat] = { total: 0, completed: 0 };
      }
      categoryMap[cat].total++;
      if (item.status === 'completed') categoryMap[cat].completed++;
    });

    const categorySuccessRates = Object.entries(categoryMap).map(([category, stats]) => ({
      category,
      total: stats.total,
      completed: stats.completed,
      successRate: stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : 0,
    }));

    // Monthly completion trends
    const dates = buildDateArray(days);
    const { data: completionsByDay } = await supabase
      .from('items')
      .select('completed_at')
      .eq('status', 'completed')
      .gte('completed_at', fromISO);

    const completedByDay = groupByDate(completionsByDay, 'completed_at');
    const completionTrends = dates.map((date) => ({
      date,
      completed: completedByDay[date] || 0,
    }));

    res.json({
      success: true,
      data: {
        avgCompletionDays,
        completionTimes: completionTimes.slice(0, 20), // Latest 20 completions
        stuckItems: stuckItems || [],
        categorySuccessRates,
        completionTrends,
        summary: {
          totalCompleted: completionCount,
          avgDaysToComplete: avgCompletionDays,
          stuckPendingItems: (stuckItems || []).length,
        },
      },
    });
  } catch (error) {
    console.error('Fulfilment analytics error:', error);
    res.status(500).json({ success: false, error: 'Failed to load fulfilment analytics' });
  }
};

export default {
  getDashboardStats,
  getAnalyticsOverview,
  getFunnelAnalytics,
  getItemPerformance,
  getUserInsights,
  getFulfilmentAnalytics,
};