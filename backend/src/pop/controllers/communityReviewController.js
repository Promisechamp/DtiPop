import { supabase } from '../../db/index.js';
import {
  updateReputation,
} from './reputationController.js';

// ============================================================
// HELPERS
// ============================================================

const getUserId = (req) =>
  req.user?.id || null;


// ============================================================
// SUBMIT COMMUNITY REVIEW
//
// pop_community_reviews is the ONLY review table.
//
// Reviews:
// - update rating
// - do NOT create reliability events
// - do NOT increment borrow counts
// - do NOT increment service counts
// ============================================================

export const submitCommunityReview = async (
  req,
  res
) => {
  try {
    const reviewerId =
      getUserId(req);

    if (!reviewerId) {
      return res.status(401).json({
        success: false,
        message:
          'Authentication required.',
      });
    }

    // --------------------------------------------------------
    // BORROW REQUEST ID
    //
    // Prefer route param.
    // --------------------------------------------------------

    const borrowRequestId =
      req.params.borrowRequestId ||
      req.body.borrowRequestId;

    const {
      reviewedUserId,
      reviewType,
      rating,
      reviewText,
    } = req.body;

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (!borrowRequestId) {
      return res.status(400).json({
        success: false,
        message:
          'Borrow request ID is required.',
      });
    }

    if (!reviewedUserId) {
      return res.status(400).json({
        success: false,
        message:
          'Reviewed user ID is required.',
      });
    }

    if (
      !['lender', 'borrower']
        .includes(reviewType)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Review type must be either lender or borrower.',
      });
    }

    if (
      reviewerId === reviewedUserId
    ) {
      return res.status(400).json({
        success: false,
        message:
          'You cannot review yourself.',
      });
    }

    const numericRating =
      rating === null ||
      rating === undefined ||
      rating === ''
        ? null
        : Number(rating);

    if (
      numericRating !== null &&
      (
        !Number.isFinite(
          numericRating
        ) ||
        numericRating < 0 ||
        numericRating > 5
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Rating must be between 0 and 5.',
      });
    }

    // --------------------------------------------------------
    // VERIFY BORROW REQUEST
    // --------------------------------------------------------

    const {
      data: borrowRequest,
      error: borrowError,
    } = await supabase
      .from('pop_borrow_requests')
      .select(`
        id,
        requester_id,
        owner_id,
        status,
        review_eligible_at
      `)
      .eq('id', borrowRequestId)
      .maybeSingle();

    if (borrowError) {
      throw borrowError;
    }

    if (!borrowRequest) {
      return res.status(404).json({
        success: false,
        message:
          'Borrow request not found.',
      });
    }

    // --------------------------------------------------------
    // VERIFY PARTICIPATION
    // --------------------------------------------------------

    const isRequester =
      borrowRequest.requester_id ===
      reviewerId;

    const isOwner =
      borrowRequest.owner_id ===
      reviewerId;

    if (!isRequester && !isOwner) {
      return res.status(403).json({
        success: false,
        message:
          'You are not a participant in this borrow.',
      });
    }

    // --------------------------------------------------------
    // VERIFY REVIEW TARGET
    // --------------------------------------------------------

    const expectedReviewedUserId =
      isRequester
        ? borrowRequest.owner_id
        : borrowRequest.requester_id;

    if (
      reviewedUserId !==
      expectedReviewedUserId
    ) {
      return res.status(403).json({
        success: false,
        message:
          'You can only review the other participant.',
      });
    }

    // --------------------------------------------------------
    // VERIFY REVIEW TYPE
    // --------------------------------------------------------

    const expectedReviewType =
      isRequester
        ? 'lender'
        : 'borrower';

    if (
      reviewType !==
      expectedReviewType
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Review type must be "${expectedReviewType}" for this participant.`,
      });
    }

    // --------------------------------------------------------
    // REVIEW ELIGIBILITY
    // --------------------------------------------------------

    const eligibleStatuses = [
      'returned',
      'completed',
    ];

    if (
      !eligibleStatuses.includes(
        borrowRequest.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'This borrow is not yet eligible for a community review.',
      });
    }

    if (
      borrowRequest.review_eligible_at &&
      new Date(
        borrowRequest.review_eligible_at
      ) > new Date()
    ) {
      return res.status(400).json({
        success: false,
        message:
          'This borrow is not yet eligible for review.',
      });
    }

    // --------------------------------------------------------
    // CHECK EXISTING REVIEW
    // --------------------------------------------------------

    const {
      data: existingReview,
      error: existingError,
    } = await supabase
      .from('pop_community_reviews')
      .select('id')
      .eq(
        'borrow_request_id',
        borrowRequestId
      )
      .eq(
        'reviewer_id',
        reviewerId
      )
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existingReview) {
      return res.status(409).json({
        success: false,
        message:
          'You have already submitted a review for this borrow.',
      });
    }

    // --------------------------------------------------------
    // INSERT REVIEW
    // --------------------------------------------------------

    const {
      data: review,
      error: reviewError,
    } = await supabase
      .from('pop_community_reviews')
      .insert({
        borrow_request_id:
          borrowRequestId,
        reviewer_id: reviewerId,
        reviewed_user_id:
          reviewedUserId,
        review_type: reviewType,
        rating: numericRating,
        review_text:
          typeof reviewText ===
          'string'
            ? reviewText.trim() || null
            : null,
      })
      .select(`
        *,
        reviewer:reviewer_id (
          id,
          full_name,
          avatar_url,
          business_name
        ),
        reviewed_user:reviewed_user_id (
          id,
          full_name,
          avatar_url,
          business_name
        )
      `)
      .single();

    if (reviewError) {
      if (
        reviewError.code ===
        '23505'
      ) {
        return res.status(409).json({
          success: false,
          message:
            'You have already submitted a review for this borrow.',
        });
      }

      throw reviewError;
    }

    // --------------------------------------------------------
    // RECALCULATE RATING
    //
    // ONLY community reviews contribute to rating.
    // --------------------------------------------------------

    const {
      data: ratings,
      error: ratingsError,
    } = await supabase
      .from('pop_community_reviews')
      .select('rating')
      .eq(
        'reviewed_user_id',
        reviewedUserId
      )
      .not(
        'rating',
        'is',
        null
      );

    if (ratingsError) {
      throw ratingsError;
    }

    const ratingValues =
      (ratings || [])
        .map((row) =>
          Number(row.rating)
        )
        .filter((value) =>
          Number.isFinite(value)
        );

    const averageRating =
      ratingValues.length
        ? ratingValues.reduce(
            (sum, value) =>
              sum + value,
            0
          ) /
          ratingValues.length
        : 0;

    const roundedRating =
      Math.round(
        averageRating * 100
      ) / 100;

    // --------------------------------------------------------
    // UPDATE ONLY RATING
    //
    // updateReputation recalculates trust_score,
    // but calculateTrustScore does not use rating.
    // --------------------------------------------------------

    await updateReputation(
      reviewedUserId,
      {
        rating:
          roundedRating,
      }
    );

    // --------------------------------------------------------
    // MARK THAT A REVIEW HAS BEEN SUBMITTED
    //
    // This is metadata only.
    // It is NOT a reliability event.
    // --------------------------------------------------------

    const {
      error: requestUpdateError,
    } = await supabase
      .from('pop_borrow_requests')
      .update({
        review_submitted_at:
          new Date().toISOString(),
      })
      .eq(
        'id',
        borrowRequestId
      );

    if (requestUpdateError) {
      console.warn(
        'Review saved but review_submitted_at could not be updated:',
        requestUpdateError.message
      );
    }

    return res.status(201).json({
      success: true,
      message:
        'Community review submitted successfully.',
      data: review,
      reputation: {
        rating:
          roundedRating,
      },
    });

  } catch (error) {
    console.error(
      'submitCommunityReview:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to submit community review.',
      error:
        process.env.NODE_ENV ===
        'development'
          ? error.message
          : undefined,
    });
  }
};


// ============================================================
// GET USER COMMUNITY REVIEWS
//
// Paginated.
// ============================================================

export const getUserCommunityReviews = async (
  req,
  res
) => {
  try {
    const userId =
      getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          'Authentication required.',
      });
    }

    const targetUserId =
      req.params.userId;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message:
          'User ID is required.',
      });
    }

    const page = Math.max(
      1,
      Number(req.query.page) || 1
    );

    const limit = Math.min(
      50,
      Math.max(
        1,
        Number(req.query.limit) || 20
      )
    );

    const offset =
      (page - 1) * limit;

    const {
      data,
      error,
      count,
    } = await supabase
      .from('pop_community_reviews')
      .select(`
        id,
        borrow_request_id,
        reviewer_id,
        reviewed_user_id,
        review_type,
        rating,
        review_text,
        created_at,
        updated_at,
        reviewer:reviewer_id (
          id,
          full_name,
          avatar_url,
          business_name
        )
      `, {
        count: 'exact',
      })
      .eq(
        'reviewed_user_id',
        targetUserId
      )
      .order(
        'created_at',
        {
          ascending: false,
        }
      )
      .range(
        offset,
        offset + limit - 1
      );

    if (error) {
      throw error;
    }

    const reviews =
      data || [];

    const ratings =
      reviews
        .map((review) =>
          Number(review.rating)
        )
        .filter((rating) =>
          Number.isFinite(rating)
        );

    // NOTE:
    // This summary is for the returned page.
    // For a global average, reputation.rating is the source
    // of truth.
    const pageAverage =
      ratings.length
        ? ratings.reduce(
            (sum, value) =>
              sum + value,
            0
          ) /
          ratings.length
        : 0;

    return res.json({
      success: true,
      data: reviews,
      summary: {
        total: count || 0,
        rated: ratings.length,
        average_rating:
          Math.round(
            pageAverage * 100
          ) / 100,
      },
      pagination: {
        page,
        limit,
        total:
          count || 0,
        totalPages:
          Math.ceil(
            (count || 0) /
              limit
          ),
      },
    });

  } catch (error) {
    console.error(
      'getUserCommunityReviews:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to fetch community reviews.',
      error:
        process.env.NODE_ENV ===
        'development'
          ? error.message
          : undefined,
    });
  }
};


// ============================================================
// GET MY REVIEWS
//
// Reviews submitted BY the authenticated user.
// ============================================================

export const getMyCommunityReviews = async (
  req,
  res
) => {
  try {
    const userId =
      getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          'Authentication required.',
      });
    }

    const page = Math.max(
      1,
      Number(req.query.page) || 1
    );

    const limit = Math.min(
      50,
      Math.max(
        1,
        Number(req.query.limit) || 20
      )
    );

    const offset =
      (page - 1) * limit;

    const {
      data,
      error,
      count,
    } = await supabase
      .from('pop_community_reviews')
      .select(`
        id,
        borrow_request_id,
        reviewer_id,
        reviewed_user_id,
        review_type,
        rating,
        review_text,
        created_at,
        updated_at,
        reviewed_user:reviewed_user_id (
          id,
          full_name,
          avatar_url,
          business_name
        )
      `, {
        count: 'exact',
      })
      .eq(
        'reviewer_id',
        userId
      )
      .order(
        'created_at',
        {
          ascending: false,
        }
      )
      .range(
        offset,
        offset + limit - 1
      );

    if (error) {
      throw error;
    }

    return res.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total:
          count || 0,
        totalPages:
          Math.ceil(
            (count || 0) /
              limit
          ),
      },
    });

  } catch (error) {
    console.error(
      'getMyCommunityReviews:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to fetch your community reviews.',
      error:
        process.env.NODE_ENV ===
        'development'
          ? error.message
          : undefined,
    });
  }
};