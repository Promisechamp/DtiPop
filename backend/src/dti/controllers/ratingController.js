// backend/controllers/ratingController.js

import { supabase } from '../../db/index.js';

// ============================================================
// RATING SELECT
// ============================================================

const RATING_SELECT = `
  *,
  rater:profiles!rater_id(
    id,
    full_name,
    avatar_url,
    location,
    country,
    rating,
    items_given,
    items_received,
    email_verified,
    created_at
  ),
  rated_user:profiles!rated_user_id(
    id,
    full_name,
    avatar_url,
    location,
    country,
    rating,
    items_given,
    items_received,
    email_verified,
    created_at
  ),
  item:items!item_id(
    id,
    title,
    images,
    donor_id,
    winner_id,
    status,
    completed_at
  ),
  application:applications!application_id(
    id,
    applicant_id,
    item_id,
    status,
    created_at,
    updated_at
  )
`;

// ============================================================
// HELPERS
// ============================================================

const now = () => new Date().toISOString();

const isValidRating = (value) => {
  const numeric = Number(value);

  return (
    Number.isInteger(numeric) &&
    numeric >= 1 &&
    numeric <= 5
  );
};

const cleanReview = (value) => {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();

  return trimmed || null;
};

const getCompletedApplication = async (applicationId) => {
  const { data, error } = await supabase
    .from('applications')
    .select(`
      id,
      item_id,
      applicant_id,
      status,
      item:items!inner(
        id,
        donor_id,
        winner_id,
        title,
        images,
        status,
        completed_at,
        donor_confirmed_at,
        winner_confirmed_at
      )
    `)
    .eq('id', applicationId)
    .single();

  if (error || !data) {
    return {
      application: null,
      error: error || new Error('Application not found')
    };
  }

  return {
    application: data,
    error: null
  };
};

const validateCompletedTransaction = (application) => {
  if (!application) {
    return {
      valid: false,
      status: 404,
      error: 'Application not found'
    };
  }

  if (application.status !== 'accepted') {
    return {
      valid: false,
      status: 400,
      error: 'Only the accepted application can be rated'
    };
  }

  if (
    !application.item ||
    application.item.status !== 'completed' ||
    !application.item.completed_at
  ) {
    return {
      valid: false,
      status: 400,
      error: 'This transaction has not been completed yet'
    };
  }

  return {
    valid: true
  };
};

// ============================================================
// ENSURE PENDING RATING
// ============================================================

const ensurePendingRating = async ({
  application,
  raterId,
  ratedUserId
}) => {
  if (!raterId || !ratedUserId || raterId === ratedUserId) {
    return null;
  }

  const { data: existing, error: existingError } = await supabase
    .from('ratings')
    .select('id, status')
    .eq('application_id', application.id)
    .eq('rater_id', raterId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return existing;
  }

  const { data: created, error: createError } = await supabase
    .from('ratings')
    .insert({
      application_id: application.id,
      item_id: application.item_id,
      rater_id: raterId,
      rated_user_id: ratedUserId,

      // The user has not submitted anything yet.
      rating: null,
      review: null,

      status: 'pending',

      created_at: now(),
      updated_at: now()
    })
    .select('id, status')
    .single();

  if (createError) {
    // Another request may have created it simultaneously.
    if (createError.code === '23505') {
      const { data: raceWinner } = await supabase
        .from('ratings')
        .select('id, status')
        .eq('application_id', application.id)
        .eq('rater_id', raterId)
        .maybeSingle();

      return raceWinner || null;
    }

    throw createError;
  }

  return created;
};

// ============================================================
// GET PENDING RATINGS
// ============================================================

export const getPendingRatings = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: applications, error: applicationsError } =
      await supabase
        .from('applications')
        .select(`
          id,
          item_id,
          applicant_id,
          status,
          item:items!inner(
            id,
            title,
            images,
            donor_id,
            winner_id,
            status,
            completed_at
          )
        `)
        .eq('status', 'accepted')
        .eq('item.status', 'completed');

    if (applicationsError) {
      console.error(
        'Get completed applications error:',
        applicationsError
      );

      return res.status(400).json({
        success: false,
        error: applicationsError.message
      });
    }

    const completedApplications = (applications || []).filter(
      (application) => {
        const item = application.item;

        if (!item || !item.completed_at) {
          return false;
        }

        const isDonor = item.donor_id === userId;
        const isWinner = item.winner_id === userId;

        return isDonor || isWinner;
      }
    );

    for (const application of completedApplications) {
      const item = application.item;

      const donorId = item.donor_id;
      const winnerId = item.winner_id;

      // Donor rates winner.
      if (donorId === userId && winnerId) {
        await ensurePendingRating({
          application,
          raterId: donorId,
          ratedUserId: winnerId
        });
      }

      // Winner rates donor.
      if (winnerId === userId && donorId) {
        await ensurePendingRating({
          application,
          raterId: winnerId,
          ratedUserId: donorId
        });
      }
    }

    const { data: pending, error: pendingError } = await supabase
      .from('ratings')
      .select(RATING_SELECT)
      .eq('rater_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (pendingError) {
      console.error(
        'Get pending ratings error:',
        pendingError
      );

      return res.status(400).json({
        success: false,
        error: pendingError.message
      });
    }

    // Use the correct column name: reminder_at (not remind_until)
    const currentTime = new Date();

    const visiblePending = (pending || []).filter((rating) => {
      if (!rating.reminder_at) {
        return true;
      }

      return new Date(rating.reminder_at) <= currentTime;
    });

    return res.json({
      success: true,
      pending: visiblePending,
      count: visiblePending.length
    });

  } catch (error) {
    console.error(
      'Get pending ratings controller error:',
      error
    );

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch pending ratings'
    });
  }
};

// ============================================================
// CREATE RATING
// ============================================================

export const createRating = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      application_id,
      rating,
      review
    } = req.body;

    if (!application_id) {
      return res.status(400).json({
        success: false,
        error: 'Application ID is required'
      });
    }

    if (!isValidRating(rating)) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be an integer between 1 and 5'
      });
    }

    const {
      application,
      error: applicationError
    } = await getCompletedApplication(application_id);

    if (applicationError || !application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    const validation = validateCompletedTransaction(application);

    if (!validation.valid) {
      return res.status(validation.status).json({
        success: false,
        error: validation.error
      });
    }

    const donorId = application.item.donor_id;
    const winnerId =
      application.item.winner_id ||
      application.applicant_id;

    const isDonor = userId === donorId;
    const isWinner = userId === winnerId;

    if (!isDonor && !isWinner) {
      return res.status(403).json({
        success: false,
        error: 'You are not a participant in this transaction'
      });
    }

    const ratedUserId = isDonor
      ? winnerId
      : donorId;

    if (!ratedUserId || ratedUserId === userId) {
      return res.status(400).json({
        success: false,
        error: 'The other participant could not be determined'
      });
    }

    const { data: existing, error: existingError } =
      await supabase
        .from('ratings')
        .select('*')
        .eq('application_id', application_id)
        .eq('rater_id', userId)
        .maybeSingle();

    if (existingError) {
      console.error(
        'Existing rating check error:',
        existingError
      );

      return res.status(500).json({
        success: false,
        error: 'Failed to check existing rating'
      });
    }

    if (existing && existing.status !== 'pending') {
      return res.status(409).json({
        success: false,
        error: 'You have already rated this transaction',
        rating: existing
      });
    }

    if (existing) {
      const { data: updatedRating, error: updateError } =
        await supabase
          .from('ratings')
          .update({
            rating: Number(rating),
            review: cleanReview(review),
            status: 'published',
            updated_at: now(),
            reminder_at: null                // ✅ corrected column name
          })
          .eq('id', existing.id)
          .eq('rater_id', userId)
          .select(RATING_SELECT)
          .single();

      if (updateError) {
        console.error(
          'Complete pending rating error:',
          updateError
        );

        return res.status(400).json({
          success: false,
          error: updateError.message
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Rating submitted successfully',
        rating: updatedRating
      });
    }

    const { data: createdRating, error: createError } =
      await supabase
        .from('ratings')
        .insert({
          application_id,
          item_id: application.item_id,
          rater_id: userId,
          rated_user_id: ratedUserId,
          rating: Number(rating),
          review: cleanReview(review),
          status: 'published',
          created_at: now(),
          updated_at: now()
        })
        .select(RATING_SELECT)
        .single();

    if (createError) {
      console.error(
        'Create rating error:',
        createError
      );

      if (createError.code === '23505') {
        return res.status(409).json({
          success: false,
          error: 'You have already rated this transaction'
        });
      }

      return res.status(400).json({
        success: false,
        error: createError.message
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Rating submitted successfully',
      rating: createdRating
    });

  } catch (error) {
    console.error(
      'Create rating controller error:',
      error
    );

    return res.status(500).json({
      success: false,
      error: 'Failed to create rating'
    });
  }
};

// ============================================================
// GET RATINGS FOR CURRENT USER / USER
// ============================================================

export const getUserRatings = async (req, res) => {
  try {
    const requestedUserId = req.params.userId;
    const authenticatedUserId = req.user.id;

    const role = String(req.query.role || 'rated')
      .toLowerCase();

    if (!requestedUserId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    if (requestedUserId !== authenticatedUserId) {
      return res.status(403).json({
        success: false,
        error: 'You can only access your own rating history'
      });
    }

    let query = supabase
      .from('ratings')
      .select(RATING_SELECT)
      .neq('status', 'removed');

    if (
      role === 'rater' ||
      role === 'given'
    ) {
      query = query.eq('rater_id', requestedUserId);
    } else if (
      role === 'rated' ||
      role === 'received'
    ) {
      query = query.eq(
        'rated_user_id',
        requestedUserId
      );
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Use rater, rated, given, or received'
      });
    }

    const {
      data,
      error
    } = await query.order('created_at', {
      ascending: false
    });

    if (error) {
      console.error(
        'Get user ratings error:',
        error
      );

      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    const ratings = data || [];

    const publishedRatings = ratings.filter(
      (item) => item.status === 'published'
    );

    const total = publishedRatings.length;

    const average =
      total > 0
        ? Number(
            (
              publishedRatings.reduce(
                (sum, item) =>
                  sum + Number(item.rating || 0),
                0
              ) / total
            ).toFixed(2)
          )
        : 0;

    const distribution = {
      1: publishedRatings.filter(
        (r) => Number(r.rating) === 1
      ).length,
      2: publishedRatings.filter(
        (r) => Number(r.rating) === 2
      ).length,
      3: publishedRatings.filter(
        (r) => Number(r.rating) === 3
      ).length,
      4: publishedRatings.filter(
        (r) => Number(r.rating) === 4
      ).length,
      5: publishedRatings.filter(
        (r) => Number(r.rating) === 5
      ).length
    };

    return res.json({
      success: true,
      ratings,
      summary: {
        total,
        average,
        distribution
      }
    });

  } catch (error) {
    console.error(
      'Get user ratings controller error:',
      error
    );

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user ratings'
    });
  }
};

// ============================================================
// GET ALL RATINGS INVOLVING CURRENT USER
// ============================================================

export const getRatings = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      status,
      limit = 50,
      offset = 0
    } = req.query;

    const safeLimit = Math.min(
      Math.max(Number(limit) || 50, 1),
      100
    );

    const safeOffset = Math.max(
      Number(offset) || 0,
      0
    );

    let query = supabase
      .from('ratings')
      .select(RATING_SELECT, {
        count: 'exact'
      })
      .or(
        `rater_id.eq.${userId},rated_user_id.eq.${userId}`
      );

    if (status) {
      query = query.eq('status', status);
    }

    const {
      data,
      error,
      count
    } = await query
      .order('created_at', {
        ascending: false
      })
      .range(
        safeOffset,
        safeOffset + safeLimit - 1
      );

    if (error) {
      console.error(
        'Get ratings error:',
        error
      );

      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    return res.json({
      success: true,
      ratings: data || [],
      total: count || 0,
      limit: safeLimit,
      offset: safeOffset
    });

  } catch (error) {
    console.error(
      'Get ratings controller error:',
      error
    );

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch ratings'
    });
  }
};

// ============================================================
// GET RATING BY APPLICATION
// ============================================================

export const getRatingByApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const userId = req.user.id;

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        error: 'Application ID is required'
      });
    }

    const {
      application,
      error: applicationError
    } = await getCompletedApplication(applicationId);

    if (applicationError || !application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    const donorId = application.item.donor_id;
    const winnerId =
      application.item.winner_id ||
      application.applicant_id;

    if (
      userId !== donorId &&
      userId !== winnerId
    ) {
      return res.status(403).json({
        success: false,
        error: 'You are not a participant in this transaction'
      });
    }

    const {
      data: ratings,
      error
    } = await supabase
      .from('ratings')
      .select(RATING_SELECT)
      .eq('application_id', applicationId)
      .neq('status', 'removed')
      .order('created_at', {
        ascending: true
      });

    if (error) {
      console.error(
        'Get application ratings error:',
        error
      );

      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    const list = ratings || [];

    const donorRating =
      list.find(
        (item) => item.rater_id === donorId
      ) || null;

    const winnerRating =
      list.find(
        (item) => item.rater_id === winnerId
      ) || null;

    return res.json({
      success: true,

      application: {
        id: application.id,
        item_id: application.item_id,
        status: application.status,
        item_status: application.item.status,
        completed_at: application.item.completed_at
      },

      ratings: list,

      donor_rating: donorRating,
      winner_rating: winnerRating,

      current_user_rating:
        list.find(
          (item) => item.rater_id === userId
        ) || null,

      current_user_can_rate:
        !list.some(
          (item) =>
            item.rater_id === userId &&
            item.status === 'published'
        )
    });

  } catch (error) {
    console.error(
      'Get application rating controller error:',
      error
    );

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch application ratings'
    });
  }
};

// ============================================================
// GET RATING BY ID
// ============================================================

export const getRatingById = async (req, res) => {
  try {
    const {
      id,
      ratingId
    } = req.params;

    const requestedId = id || ratingId;
    const userId = req.user.id;

    if (!requestedId) {
      return res.status(400).json({
        success: false,
        error: 'Rating ID is required'
      });
    }

    const {
      data: rating,
      error
    } = await supabase
      .from('ratings')
      .select(RATING_SELECT)
      .eq('id', requestedId)
      .single();

    if (error || !rating) {
      return res.status(404).json({
        success: false,
        error: 'Rating not found'
      });
    }

    if (
      rating.status === 'removed'
    ) {
      return res.status(404).json({
        success: false,
        error: 'Rating not found'
      });
    }

    const canView =
      rating.rater_id === userId ||
      rating.rated_user_id === userId;

    if (!canView) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to view this rating'
      });
    }

    return res.json({
      success: true,
      rating
    });

  } catch (error) {
    console.error(
      'Get rating by ID error:',
      error
    );

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch rating'
    });
  }
};

// ============================================================
// UPDATE / SUBMIT RATING
// ============================================================

export const updateRating = async (req, res) => {
  try {
    const {
      id,
      ratingId
    } = req.params;

    const requestedId = id || ratingId;
    const userId = req.user.id;

    const {
      rating,
      review,
      review_text
    } = req.body;

    if (!requestedId) {
      return res.status(400).json({
        success: false,
        error: 'Rating ID is required'
      });
    }

    if (!isValidRating(rating)) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be an integer between 1 and 5'
      });
    }

    const finalReview =
      cleanReview(review ?? review_text);

    if (
      finalReview &&
      finalReview.length > 5000
    ) {
      return res.status(400).json({
        success: false,
        error: 'Review cannot exceed 5000 characters'
      });
    }

    const {
      data: existing,
      error: existingError
    } = await supabase
      .from('ratings')
      .select(`
        id,
        application_id,
        item_id,
        rater_id,
        rated_user_id,
        rating,
        review,
        status,
        application:applications!application_id(
          id,
          applicant_id,
          item_id,
          status,
          item:items!inner(
            id,
            donor_id,
            winner_id,
            status,
            completed_at
          )
        )
      `)
      .eq('id', requestedId)
      .single();

    if (existingError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Rating not found'
      });
    }

    if (existing.rater_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You can only submit or edit your own rating'
      });
    }

    if (existing.status === 'removed') {
      return res.status(400).json({
        success: false,
        error: 'This rating has been removed'
      });
    }

    const application = existing.application;

    const validation =
      validateCompletedTransaction(application);

    if (!validation.valid) {
      return res.status(validation.status).json({
        success: false,
        error: validation.error
      });
    }

    const donorId =
      application.item.donor_id;

    const winnerId =
      application.item.winner_id ||
      application.applicant_id;

    const expectedRatedUserId =
      userId === donorId
        ? winnerId
        : userId === winnerId
          ? donorId
          : null;

    if (
      !expectedRatedUserId ||
      existing.rated_user_id !== expectedRatedUserId
    ) {
      return res.status(403).json({
        success: false,
        error: 'Invalid rating participant'
      });
    }

    const {
      data: updatedRating,
      error: updateError
    } = await supabase
      .from('ratings')
      .update({
        rating: Number(rating),
        review: finalReview,
        status: 'published',
        updated_at: now(),
        reminder_at: null               // ✅ corrected column name
      })
      .eq('id', requestedId)
      .eq('rater_id', userId)
      .select(RATING_SELECT)
      .single();

    if (updateError) {
      console.error(
        'Update rating error:',
        updateError
      );

      return res.status(400).json({
        success: false,
        error: updateError.message
      });
    }

    return res.json({
      success: true,
      message:
        existing.status === 'pending'
          ? 'Rating submitted successfully'
          : 'Rating updated successfully',
      rating: updatedRating
    });

  } catch (error) {
    console.error(
      'Update rating controller error:',
      error
    );

    return res.status(500).json({
      success: false,
      error: 'Failed to update rating'
    });
  }
};

// ============================================================
// DELETE RATING
// ============================================================

export const deleteRating = async (req, res) => {
  try {
    const {
      id,
      ratingId
    } = req.params;

    const requestedId = id || ratingId;
    const userId = req.user.id;

    const {
      data: existing,
      error: existingError
    } = await supabase
      .from('ratings')
      .select(
        'id, rater_id, status'
      )
      .eq('id', requestedId)
      .single();

    if (existingError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Rating not found'
      });
    }

    if (existing.rater_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own rating'
      });
    }

    const {
      data: deletedRating,
      error
    } = await supabase
      .from('ratings')
      .update({
        status: 'removed',
        updated_at: now()
      })
      .eq('id', requestedId)
      .eq('rater_id', userId)
      .select(RATING_SELECT)
      .single();

    if (error) {
      console.error(
        'Delete rating error:',
        error
      );

      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    return res.json({
      success: true,
      message: 'Rating removed successfully',
      rating: deletedRating
    });

  } catch (error) {
    console.error(
      'Delete rating controller error:',
      error
    );

    return res.status(500).json({
      success: false,
      error: 'Failed to delete rating'
    });
  }
};

// ============================================================
// REMIND LATER
// ============================================================

export const remindLater = async (req, res) => {
  try {
    const {
      id,
      ratingId
    } = req.params;

    const requestedId = id || ratingId;
    const userId = req.user.id;

    const days = Math.min(
      Math.max(
        Number(req.body?.days) || 1,
        1
      ),
      30
    );

    const {
      data: existing,
      error: existingError
    } = await supabase
      .from('ratings')
      .select(`
        id,
        rater_id,
        status,
        application_id
      `)
      .eq('id', requestedId)
      .single();

    if (existingError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Rating not found'
      });
    }

    if (existing.rater_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You can only postpone your own rating'
      });
    }

    if (existing.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Only pending ratings can be postponed'
      });
    }

    const remindDate =
      new Date(
        Date.now() +
        days * 24 * 60 * 60 * 1000
      ).toISOString();

    const {
      data: updatedRating,
      error
    } = await supabase
      .from('ratings')
      .update({
        reminder_at: remindDate,      // ✅ corrected column name
        updated_at: now()
      })
      .eq('id', requestedId)
      .eq('rater_id', userId)
      .select(RATING_SELECT)
      .single();

    if (error) {
      console.error(
        'Remind later error:',
        error
      );

      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    return res.json({
      success: true,
      message: `We'll remind you in ${days} day${days === 1 ? '' : 's'}.`,
      rating: updatedRating
    });

  } catch (error) {
    console.error(
      'Remind later controller error:',
      error
    );

    return res.status(500).json({
      success: false,
      error: 'Failed to postpone rating'
    });
  }
};

// ============================================================
// REPLY TO RATING
// ============================================================

export const replyToRating = async (req, res) => {
  try {
    const {
      id,
      ratingId
    } = req.params;

    const requestedId = id || ratingId;
    const userId = req.user.id;

    const {
      reply_text
    } = req.body;

    const reply = cleanReview(reply_text);

    if (!reply) {
      return res.status(400).json({
        success: false,
        error: 'Reply text is required'
      });
    }

    if (reply.length > 2000) {
      return res.status(400).json({
        success: false,
        error: 'Reply cannot exceed 2000 characters'
      });
    }

    const {
      data: existing,
      error: existingError
    } = await supabase
      .from('ratings')
      .select(`
        id,
        rated_user_id,
        status,
        reply_text
      `)
      .eq('id', requestedId)
      .single();

    if (existingError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Rating not found'
      });
    }

    if (existing.status !== 'published') {
      return res.status(400).json({
        success: false,
        error: 'Only published ratings can receive replies'
      });
    }

    if (existing.rated_user_id !== userId) {
      return res.status(403).json({
        success: false,
        error:
          'Only the person who received this rating can reply'
      });
    }

    const timestamp = now();

    const updateData = {
      reply_text: reply,
      reply_updated_at: timestamp,
      updated_at: timestamp
    };

    if (!existing.reply_text) {
      updateData.reply_created_at = timestamp;
    }

    const {
      data: updatedRating,
      error: updateError
    } = await supabase
      .from('ratings')
      .update(updateData)
      .eq('id', requestedId)
      .eq('rated_user_id', userId)
      .select(RATING_SELECT)
      .single();

    if (updateError) {
      console.error(
        'Reply to rating error:',
        updateError
      );

      return res.status(400).json({
        success: false,
        error: updateError.message
      });
    }

    return res.json({
      success: true,
      message: existing.reply_text
        ? 'Reply updated successfully'
        : 'Reply added successfully',
      rating: updatedRating
    });

  } catch (error) {
    console.error(
      'Reply to rating controller error:',
      error
    );

    return res.status(500).json({
      success: false,
      error: 'Failed to reply to rating'
    });
  }
};

// ============================================================
// UPDATE REPLY
// ============================================================

export const updateReply = async (req, res) => {
  return replyToRating(req, res);
};

// ============================================================
// REMOVE REPLY
// ============================================================

export const removeRatingReply = async (req, res) => {
  try {
    const {
      id,
      ratingId
    } = req.params;

    const requestedId = id || ratingId;
    const userId = req.user.id;

    const {
      data: existing,
      error: existingError
    } = await supabase
      .from('ratings')
      .select(
        'id, rated_user_id, status'
      )
      .eq('id', requestedId)
      .single();

    if (existingError || !existing) {
      return res.status(404).json({
        success: false,
        error: 'Rating not found'
      });
    }

    if (existing.rated_user_id !== userId) {
      return res.status(403).json({
        success: false,
        error:
          'Only the rating recipient can remove the reply'
      });
    }

    const {
      data: updatedRating,
      error
    } = await supabase
      .from('ratings')
      .update({
        reply_text: null,
        reply_updated_at: now(),
        updated_at: now()
      })
      .eq('id', requestedId)
      .eq('rated_user_id', userId)
      .select(RATING_SELECT)
      .single();

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    return res.json({
      success: true,
      message: 'Reply removed successfully',
      rating: updatedRating
    });

  } catch (error) {
    console.error(
      'Remove reply error:',
      error
    );

    return res.status(500).json({
      success: false,
      error: 'Failed to remove reply'
    });
  }
};

// ============================================================
// USER RATING SUMMARY
// ============================================================

export const getUserRatingSummary = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const {
      data,
      error
    } = await supabase
      .from('ratings')
      .select('rating')
      .eq('rated_user_id', userId)
      .eq('status', 'published');

    if (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    const ratings = data || [];

    const total = ratings.length;

    const average =
      total > 0
        ? Number(
            (
              ratings.reduce(
                (sum, row) =>
                  sum + Number(row.rating || 0),
                0
              ) / total
            ).toFixed(2)
          )
        : 0;

    return res.json({
      success: true,
      summary: {
        user_id: userId,
        average,
        total,

        distribution: {
          1: ratings.filter(
            r => Number(r.rating) === 1
          ).length,

          2: ratings.filter(
            r => Number(r.rating) === 2
          ).length,

          3: ratings.filter(
            r => Number(r.rating) === 3
          ).length,

          4: ratings.filter(
            r => Number(r.rating) === 4
          ).length,

          5: ratings.filter(
            r => Number(r.rating) === 5
          ).length
        }
      }
    });

  } catch (error) {
    console.error(
      'Get user rating summary error:',
      error
    );

    return res.status(500).json({
      success: false,
      error: 'Failed to calculate rating summary'
    });
  }
};

// ============================================================
// GET ITEM RATINGS  (NEW)
// ============================================================

export const getItemRatings = async (req, res) => {
  try {
    const { itemId } = req.params;

    if (!itemId) {
      return res.status(400).json({
        success: false,
        error: 'Item ID is required'
      });
    }

    const { data, error } = await supabase
      .from('ratings')
      .select(RATING_SELECT)
      .eq('item_id', itemId)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get item ratings error:', error);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    return res.json({
      success: true,
      ratings: data || []
    });

  } catch (error) {
    console.error('Get item ratings controller error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch item ratings'
    });
  }
};

// ============================================================
// EXPORTS
// ============================================================

export default {
  createRating,
  getPendingRatings,
  getRatingById,
  getRatings,
  getUserRatings,
  getItemRatings,                 // ✅ added
  getRatingByApplication,
  getUserRatingSummary,
  updateRating,
  deleteRating,
  remindLater,
  replyToRating,
  updateReply,
  removeRatingReply
};