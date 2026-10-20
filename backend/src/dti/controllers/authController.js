import crypto from 'crypto';
import { supabase, supabaseAdmin } from '../../db/index.js';
import { sendVerificationEmail } from '../../utils/email.js';

// ============================================
// HELPER FUNCTIONS
// ============================================

const getErrorMessage = (error, fallback = 'An unexpected error occurred. Please try again.') => {
  if (!error) return fallback;

  const message = String(error.message || '').trim();

  return message || fallback;
};

const normalizeEmail = (email) => {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
};

const isMissingRecord = (error) => {
  return error?.code === 'PGRST116';
};

const isDuplicateEmailError = (error) => {
  const message = String(error?.message || '').toLowerCase();

  return (
    message.includes('user already registered') ||
    message.includes('already been registered') ||
    message.includes('email address is already registered') ||
    message.includes('duplicate key value') ||
    error?.code === '23505'
  );
};

/**
 * Ensure a profile exists for an authenticated user.
 */
async function ensureProfileExists(
  userId,
  email,
  fullName,
  avatarUrl = null,
  emailVerified = false
) {
  const { data: existingProfile, error: lookupError } =
    await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

  if (lookupError) {
    console.error('Profile lookup failed:', lookupError);
    throw new Error(
      `Unable to check your profile: ${getErrorMessage(lookupError)}`
    );
  }

  if (existingProfile) {
    return true;
  }

  const { error: createError } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: userId,
      full_name: fullName || email?.split('@')[0] || 'User',
      email,
      avatar_url: avatarUrl,
      email_verified: emailVerified,
      role: 'user',
      is_admin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  if (createError) {
    console.error('Profile creation failed:', createError);

    // Another process may have created the profile concurrently.
    if (createError.code === '23505') {
      const { data: profileAfterConflict, error: retryError } =
        await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle();

      if (!retryError && profileAfterConflict) {
        return true;
      }
    }

    throw new Error(
      `Unable to create your profile: ${getErrorMessage(createError)}`
    );
  }

  return true;
}

/**
 * Return a useful authentication error without hiding
 * the actual Supabase authentication message.
 */
function getLoginErrorMessage(error) {
  const message = String(error?.message || '').trim();
  const normalized = message.toLowerCase();

  if (
    normalized.includes('invalid login credentials') ||
    normalized.includes('invalid email or password')
  ) {
    return 'Incorrect email or password. Please check your details and try again.';
  }

  if (normalized.includes('email not confirmed')) {
    return 'Your email address has not been verified. Please check your inbox for the verification link.';
  }

  if (
    normalized.includes('too many requests') ||
    normalized.includes('rate limit')
  ) {
    return 'Too many login attempts. Please wait a moment before trying again.';
  }

  if (normalized.includes('user not found')) {
    return 'No account was found with these login details.';
  }

  if (normalized.includes('network') || normalized.includes('fetch failed')) {
    return 'Unable to connect to the authentication service. Check your internet connection and try again.';
  }

  return message || 'Login failed. Please try again.';
}

// ============================================
// REGISTER
// ============================================

export const register = async (req, res) => {
  try {
    const {
      email: rawEmail,
      password,
      fullName,
      full_name,
      location,
      phone,
      agree_to_terms,
    } = req.body || {};

    const email = normalizeEmail(rawEmail);
    const name =
      typeof fullName === 'string'
        ? fullName.trim()
        : typeof full_name === 'string'
          ? full_name.trim()
          : '';

    // ============================================
    // VALIDATION
    // ============================================

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and full name are required.',
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address.',
      });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.',
      });
    }

    if (name.length > 150) {
      return res.status(400).json({
        success: false,
        error: 'Full name must not exceed 150 characters.',
      });
    }

    if (
      agree_to_terms !== undefined &&
      typeof agree_to_terms !== 'boolean'
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid terms acceptance value.',
      });
    }

    if (agree_to_terms === false) {
      return res.status(400).json({
        success: false,
        error: 'You must agree to the terms before registering.',
      });
    }

    const profileLocation =
      location &&
      typeof location === 'object' &&
      !Array.isArray(location)
        ? location
        : {};

    // ============================================
    // CHECK EXISTING PROFILE
    // ============================================

    const {
      data: existingProfile,
      error: checkError,
    } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .ilike('email', email)
      .maybeSingle();

    if (checkError) {
      console.error('Existing profile lookup failed:', checkError);

      return res.status(500).json({
        success: false,
        error: `Unable to check whether this email is registered: ${getErrorMessage(checkError)}`,
      });
    }

    if (existingProfile) {
      return res.status(409).json({
        success: false,
        error: 'This email is already registered. Please log in instead.',
        code: 'EMAIL_ALREADY_REGISTERED',
      });
    }

    // ============================================
    // CREATE AUTH USER
    // ============================================

    const frontendUrl =
      process.env.FRONTEND_URL || 'http://localhost:5173';

    const { data: authData, error: authError } =
      await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            location: profileLocation,
          },
          emailRedirectTo: `${frontendUrl}/verify-email`,
        },
      });

    if (authError) {
      console.error('Registration authentication error:', authError);

      if (isDuplicateEmailError(authError)) {
        return res.status(409).json({
          success: false,
          error: 'This email is already registered. Please log in instead.',
          code: 'EMAIL_ALREADY_REGISTERED',
        });
      }

      return res.status(400).json({
        success: false,
        error: getErrorMessage(
          authError,
          'Unable to create your account. Please try again.'
        ),
      });
    }

    if (!authData?.user) {
      return res.status(500).json({
        success: false,
        error: 'The authentication service did not return a user. Please try again.',
      });
    }

    const userId = authData.user.id;

    // Supabase may return an existing user without an error
    // when email confirmations are enabled.
    if (
      !authData.session &&
      authData.user.identities?.length === 0
    ) {
      return res.status(409).json({
        success: false,
        error: 'This email may already be registered. Please log in or use another email address.',
        code: 'EMAIL_ALREADY_REGISTERED',
      });
    }

    // ============================================
    // FETCH PROFILE CREATED BY DATABASE TRIGGER
    // ============================================

    let profile = null;
    let profileError = null;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const result = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      profile = result.data;
      profileError = result.error;

      if (profile || profileError) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (profileError) {
      console.error('Profile fetch failed:', profileError);

      return res.status(500).json({
        success: false,
        error: `Your authentication account was created, but your profile could not be loaded: ${getErrorMessage(profileError)}`,
        accountCreated: true,
      });
    }

    // ============================================
    // CREATE PROFILE IF THE DATABASE TRIGGER DID NOT
    // ============================================

    if (!profile) {
      const { data: createdProfile, error: createError } =
        await supabaseAdmin
          .from('profiles')
          .insert({
            id: userId,
            full_name: name,
            email,
            avatar_url:
              authData.user.user_metadata?.avatar_url || null,
            location: profileLocation,
            phone: phone || null,
            email_verified: false,
            role: 'user',
            is_admin: false,
            agree_to_terms: agree_to_terms ?? false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select('*')
          .single();

      if (createError) {
        console.error('Manual profile creation failed:', createError);

        // Handle the possibility that the trigger created the
        // profile between the previous lookup and this insert.
        if (createError.code === '23505') {
          const { data: concurrentProfile, error: retryError } =
            await supabaseAdmin
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .maybeSingle();

          if (retryError) {
            console.error('Profile retry failed:', retryError);
          } else if (concurrentProfile) {
            profile = concurrentProfile;
          }
        }

        if (!profile) {
          return res.status(500).json({
            success: false,
            error: `Your authentication account was created, but profile creation failed: ${getErrorMessage(createError)}`,
            accountCreated: true,
          });
        }
      } else {
        profile = createdProfile;
      }
    }

    // ============================================
    // UPDATE OPTIONAL PROFILE FIELDS
    // ============================================

    const profileUpdates = {};

    const existingLocation =
      profile.location &&
      typeof profile.location === 'object' &&
      !Array.isArray(profile.location)
        ? profile.location
        : {};

    if (
      Object.keys(profileLocation).length > 0 &&
      Object.keys(existingLocation).length === 0
    ) {
      profileUpdates.location = profileLocation;
    }

    if (phone && !profile.phone) {
      profileUpdates.phone = phone;
    }

    if (
      agree_to_terms !== undefined &&
      profile.agree_to_terms !== agree_to_terms
    ) {
      profileUpdates.agree_to_terms = agree_to_terms;
    }

    if (!profile.full_name && name) {
      profileUpdates.full_name = name;
    }

    if (!profile.email && email) {
      profileUpdates.email = email;
    }

    if (Object.keys(profileUpdates).length > 0) {
      profileUpdates.updated_at = new Date().toISOString();

      const { data: updatedProfile, error: updateError } =
        await supabaseAdmin
          .from('profiles')
          .update(profileUpdates)
          .eq('id', userId)
          .select('*')
          .single();

      if (updateError) {
        console.error('Profile update after registration failed:', updateError);

        return res.status(500).json({
          success: false,
          error: `Your account was created, but your profile could not be fully updated: ${getErrorMessage(updateError)}`,
          accountCreated: true,
        });
      }

      profile = updatedProfile;
    }

    // ============================================
    // GENERATE VERIFICATION TOKEN
    // ============================================

    const token = crypto.randomBytes(32).toString('hex');

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { error: tokenError } = await supabaseAdmin
      .from('verification_tokens')
      .insert({
        user_id: userId,
        email,
        token,
        expires_at: expiresAt.toISOString(),
        used: false,
      });

    if (tokenError) {
      console.error('Verification token creation failed:', tokenError);

      return res.status(500).json({
        success: false,
        error: `Your account was created, but the verification token could not be saved: ${getErrorMessage(tokenError)}`,
        accountCreated: true,
      });
    }

    // ============================================
    // SEND VERIFICATION EMAIL
    // ============================================

    let emailSent = false;
    let emailErrorMessage = null;

    try {
      await sendVerificationEmail(email, name, token);
      emailSent = true;
    } catch (emailError) {
      console.error('Verification email sending failed:', emailError);

      emailErrorMessage = getErrorMessage(
        emailError,
        'The email service returned an unknown error.'
      );
    }

    // ============================================
    // FETCH FINAL PROFILE
    // ============================================

    const {
      data: finalProfile,
      error: finalProfileError,
    } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (finalProfileError) {
      console.error('Final profile fetch failed:', finalProfileError);
    }

    // ============================================
    // RETURN SUCCESS
    // ============================================

    return res.status(201).json({
      success: true,
      message: emailSent
        ? 'Registration successful! Please check your email to verify your account.'
        : 'Your account was created, but the verification email could not be sent.',
      ...(emailErrorMessage ? { emailError: emailErrorMessage } : {}),
      user: {
        id: authData.user.id,
        email: authData.user.email,
        full_name: name,
        ...(finalProfile || profile || {}),
      },
      session: authData.session
        ? {
            access_token: authData.session.access_token,
            refresh_token: authData.session.refresh_token,
            expires_at: authData.session.expires_at,
          }
        : null,
      requiresEmailVerification: true,
      emailSent,
    });
  } catch (error) {
    console.error('Registration failed:', error);

    return res.status(500).json({
      success: false,
      error: getErrorMessage(error, 'Registration failed. Please try again.'),
    });
  }
};

// ============================================
// LOGIN
// ============================================

export const login = async (req, res) => {
  try {
    const { email: rawEmail, password } = req.body || {};
    const email = normalizeEmail(rawEmail);

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.',
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address.',
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Login authentication failed:', {
        message: error.message,
        code: error.code,
        status: error.status,
      });

      // Check whether the account belongs to a social provider.
      // Only offer Google sign-in when there is evidence that
      // the account exists and Google authentication is applicable.
      const { data: profile, error: profileError } =
        await supabaseAdmin
          .from('profiles')
          .select('id, email')
          .ilike('email', email)
          .maybeSingle();

      if (profileError) {
        console.error('Profile lookup during login failed:', profileError);
      }

      if (profile && error.code === 'invalid_credentials') {
        const { data: authUserData, error: authUserError } =
          await supabaseAdmin.auth.admin.getUserById(profile.id);

        if (authUserError) {
          console.error('Auth user lookup failed:', authUserError);
        }

        const identities = authUserData?.user?.identities || [];
        const hasPasswordIdentity = identities.some(
          (identity) => identity.provider === 'email'
        );
        const hasGoogleIdentity = identities.some(
          (identity) => identity.provider === 'google'
        );

        if (hasGoogleIdentity && !hasPasswordIdentity) {
          return res.status(401).json({
            success: false,
            error: 'This account uses Google sign-in. Please continue with Google.',
            code: 'GOOGLE_SIGN_IN_REQUIRED',
            useGoogle: true,
          });
        }
      }

      return res.status(401).json({
        success: false,
        error: getLoginErrorMessage(error),
        code: error.code || 'LOGIN_FAILED',
      });
    }

    if (!data?.user || !data?.session) {
      return res.status(401).json({
        success: false,
        error: 'Authentication did not return a valid session. Please try again.',
      });
    }

    // ============================================
    // ENSURE PROFILE EXISTS
    // ============================================

    try {
      await ensureProfileExists(
        data.user.id,
        data.user.email,
        data.user.user_metadata?.full_name ||
          data.user.email?.split('@')[0] ||
          'User',
        data.user.user_metadata?.avatar_url || null,
        Boolean(data.user.email_confirmed_at)
      );
    } catch (profileError) {
      console.error('Login profile setup failed:', profileError);

      return res.status(500).json({
        success: false,
        error: getErrorMessage(
          profileError,
          'Your credentials were accepted, but your profile could not be loaded.'
        ),
        authenticated: true,
      });
    }

    // ============================================
    // UPDATE PROFILE TIMESTAMP
    // ============================================

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.user.id);

    if (updateError) {
      console.error('Login profile timestamp update failed:', updateError);
    }

    // ============================================
    // FETCH PROFILE
    // ============================================

    const { data: userProfile, error: userProfileError } =
      await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

    if (userProfileError) {
      console.error('Login profile fetch failed:', userProfileError);

      return res.status(500).json({
        success: false,
        error: `Login succeeded, but your profile could not be loaded: ${getErrorMessage(userProfileError)}`,
        authenticated: true,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful!',
      user: {
        id: data.user.id,
        email: data.user.email,
        ...userProfile,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
    });
  } catch (error) {
    console.error('Login request failed:', error);

    return res.status(500).json({
      success: false,
      error: getErrorMessage(error, 'Login failed. Please try again.'),
    });
  }
};

// ============================================
// GOOGLE SIGN-IN
// ============================================

export const googleSignIn = async (req, res) => {
  try {
    const { token } = req.body || {};

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Google token is required.',
      });
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token,
    });

    if (error) {
      console.error('Google authentication failed:', error);

      return res.status(401).json({
        success: false,
        error: getErrorMessage(error, 'Google authentication failed.'),
        code: error.code || 'GOOGLE_AUTH_FAILED',
      });
    }

    if (!data?.user || !data?.session) {
      return res.status(401).json({
        success: false,
        error: 'Google authentication did not return a valid session.',
      });
    }

    const user = data.user;

    const { data: existingProfile, error: checkError } =
      await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

    if (checkError) {
      console.error('Google profile lookup failed:', checkError);

      return res.status(500).json({
        success: false,
        error: `Google authentication succeeded, but your profile could not be checked: ${getErrorMessage(checkError)}`,
        authenticated: true,
      });
    }

    let profile = existingProfile;
    let isNewUser = false;

    if (!profile) {
      const userFullName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'User';

      const userAvatar =
        user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        null;

      const { data: newProfile, error: createError } =
        await supabaseAdmin
          .from('profiles')
          .insert({
            id: user.id,
            full_name: userFullName,
            email: user.email,
            avatar_url: userAvatar,
            email_verified: true,
            role: 'user',
            is_admin: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select('*')
          .single();

      if (createError) {
        console.error('Google profile creation failed:', createError);

        if (createError.code === '23505') {
          const { data: concurrentProfile, error: retryError } =
            await supabaseAdmin
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .maybeSingle();

          if (!retryError && concurrentProfile) {
            profile = concurrentProfile;
          } else {
            return res.status(500).json({
              success: false,
              error: `Your Google account was authenticated, but profile creation failed: ${getErrorMessage(createError)}`,
              authenticated: true,
            });
          }
        } else {
          return res.status(500).json({
            success: false,
            error: `Your Google account was authenticated, but profile creation failed: ${getErrorMessage(createError)}`,
            authenticated: true,
          });
        }
      } else {
        profile = newProfile;
        isNewUser = true;
      }
    }

    // Update profile details when Google provides new information.
    const updates = {};

    if (user.user_metadata?.avatar_url && !profile.avatar_url) {
      updates.avatar_url = user.user_metadata.avatar_url;
    }

    if (
      (user.user_metadata?.full_name || user.user_metadata?.name) &&
      !profile.full_name
    ) {
      updates.full_name =
        user.user_metadata.full_name || user.user_metadata.name;
    }

    if (user.email && !profile.email) {
      updates.email = user.email;
    }

    if (!profile.email_verified) {
      updates.email_verified = true;
    }

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();

      const { data: updatedProfile, error: updateError } =
        await supabaseAdmin
          .from('profiles')
          .update(updates)
          .eq('id', user.id)
          .select('*')
          .single();

      if (updateError) {
        console.error('Google profile update failed:', updateError);

        return res.status(500).json({
          success: false,
          error: `Google authentication succeeded, but your profile could not be updated: ${getErrorMessage(updateError)}`,
          authenticated: true,
        });
      }

      profile = updatedProfile;
    }

    return res.status(200).json({
      success: true,
      message: 'Google login successful!',
      user: {
        id: user.id,
        email: user.email,
        ...profile,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
      },
      isNewUser,
    });
  } catch (error) {
    console.error('Google sign-in failed:', error);

    return res.status(500).json({
      success: false,
      error: getErrorMessage(error, 'Google login failed. Please try again.'),
    });
  }
};

// ============================================
// GOOGLE OAUTH URL
// ============================================

export const getGoogleAuthUrl = async (req, res) => {
  try {
    const frontendUrl =
      process.env.FRONTEND_URL || 'http://localhost:5173';

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${frontendUrl}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('Google OAuth URL generation failed:', error);

      return res.status(400).json({
        success: false,
        error: getErrorMessage(error, 'Unable to start Google sign-in.'),
      });
    }

    if (!data?.url) {
      return res.status(500).json({
        success: false,
        error: 'Google sign-in URL was not returned by the authentication service.',
      });
    }

    return res.json({
      success: true,
      url: data.url,
    });
  } catch (error) {
    console.error('Google OAuth URL request failed:', error);

    return res.status(500).json({
      success: false,
      error: getErrorMessage(error, 'Failed to get Google authentication URL.'),
    });
  }
};

// ============================================
// GOOGLE OAUTH CALLBACK
// ============================================

export const googleAuthCallback = async (req, res) => {
  const frontendUrl =
    process.env.FRONTEND_URL || 'http://localhost:5173';

  const callbackUrl = `${frontendUrl}/auth/callback`;

  try {
    const { code } = req.query || {};

    if (!code) {
      return res.redirect(
        `${callbackUrl}?error=${encodeURIComponent('Google did not return an authorization code. Please try again.')}`
      );
    }

    const { data, error } =
      await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Google OAuth code exchange failed:', error);

      return res.redirect(
        `${callbackUrl}?error=${encodeURIComponent(getErrorMessage(error, 'Google sign-in failed.'))}`
      );
    }

    if (!data?.user || !data?.session) {
      return res.redirect(
        `${callbackUrl}?error=${encodeURIComponent('Google sign-in did not return a valid session.')}`
      );
    }

    const user = data.user;

    const { data: existingProfile, error: lookupError } =
      await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

    if (lookupError) {
      console.error('Google callback profile lookup failed:', lookupError);

      return res.redirect(
        `${callbackUrl}?error=${encodeURIComponent(`Unable to check your profile: ${getErrorMessage(lookupError)}`)}`
      );
    }

    if (!existingProfile) {
      const userFullName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'User';

      const userAvatar =
        user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        null;

      const { error: createError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: user.id,
          full_name: userFullName,
          email: user.email,
          avatar_url: userAvatar,
          email_verified: true,
          role: 'user',
          is_admin: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (createError && createError.code !== '23505') {
        console.error('Google callback profile creation failed:', createError);

        return res.redirect(
          `${callbackUrl}?error=${encodeURIComponent(`Google sign-in succeeded, but profile creation failed: ${getErrorMessage(createError)}`)}`
        );
      }

      if (createError?.code === '23505') {
        const { data: concurrentProfile, error: retryError } =
          await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .maybeSingle();

        if (retryError || !concurrentProfile) {
          console.error('Google callback profile retry failed:', retryError);

          return res.redirect(
            `${callbackUrl}?error=${encodeURIComponent('Google sign-in succeeded, but your profile could not be created or loaded.')}`
          );
        }
      }
    }

    const redirectUrl = new URL(callbackUrl);

    redirectUrl.searchParams.set(
      'access_token',
      data.session.access_token
    );

    redirectUrl.searchParams.set(
      'refresh_token',
      data.session.refresh_token
    );

    return res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('Google OAuth callback failed:', error);

    return res.redirect(
      `${callbackUrl}?error=${encodeURIComponent(getErrorMessage(error, 'Google sign-in failed. Please try again.'))}`
    );
  }
};

// ============================================
// EMAIL VERIFICATION
// ============================================

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query || {};

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Verification token is required.',
      });
    }

    const {
      data: tokenData,
      error: tokenError,
    } = await supabaseAdmin
      .from('verification_tokens')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (tokenError) {
      console.error('Verification token lookup failed:', tokenError);

      return res.status(500).json({
        success: false,
        error: `Unable to check the verification token: ${getErrorMessage(tokenError)}`,
      });
    }

    if (!tokenData) {
      return res.status(400).json({
        success: false,
        error: 'This verification link is invalid or no longer exists.',
      });
    }

    if (tokenData.used) {
      return res.status(400).json({
        success: false,
        error: 'This verification link has already been used.',
      });
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      const { error: deleteError } = await supabaseAdmin
        .from('verification_tokens')
        .delete()
        .eq('id', tokenData.id);

      if (deleteError) {
        console.error('Expired token cleanup failed:', deleteError);
      }

      return res.status(400).json({
        success: false,
        error: 'This verification link has expired. Please request a new one.',
        expired: true,
      });
    }

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from('profiles')
        .update({
          email_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tokenData.user_id)
        .select('*')
        .single();

    if (profileError) {
      console.error('Email verification profile update failed:', profileError);

      return res.status(500).json({
        success: false,
        error: `The verification link was accepted, but your profile could not be updated: ${getErrorMessage(profileError)}`,
      });
    }

    const { error: markUsedError } = await supabaseAdmin
      .from('verification_tokens')
      .update({ used: true })
      .eq('id', tokenData.id);

    if (markUsedError) {
      console.error('Verification token update failed:', markUsedError);

      return res.status(500).json({
        success: false,
        error: `Your email was verified, but the verification token could not be updated: ${getErrorMessage(markUsedError)}`,
        verified: true,
      });
    }

    return res.json({
      success: true,
      message: 'Email verified successfully!',
      user: profile,
    });
  } catch (error) {
    console.error('Email verification failed:', error);

    return res.status(500).json({
      success: false,
      error: getErrorMessage(error, 'Failed to verify email. Please try again.'),
    });
  }
};

// ============================================
// RESEND VERIFICATION
// ============================================

export const resendVerification = async (req, res) => {
  try {
    const { email: rawEmail } = req.body || {};
    const email = normalizeEmail(rawEmail);

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required.',
      });
    }

    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email_verified')
      .ilike('email', email)
      .maybeSingle();

    if (profileError) {
      console.error('Resend verification profile lookup failed:', profileError);

      return res.status(500).json({
        success: false,
        error: `Unable to find your account: ${getErrorMessage(profileError)}`,
      });
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'No account was found with this email address.',
      });
    }

    if (profile.email_verified) {
      return res.status(400).json({
        success: false,
        error: 'This email is already verified. Please log in.',
      });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('verification_tokens')
      .delete()
      .eq('user_id', profile.id)
      .eq('used', false);

    if (deleteError) {
      console.error('Old verification token deletion failed:', deleteError);

      return res.status(500).json({
        success: false,
        error: `Unable to replace the previous verification token: ${getErrorMessage(deleteError)}`,
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();

    expiresAt.setHours(expiresAt.getHours() + 24);

    const { error: tokenError } = await supabaseAdmin
      .from('verification_tokens')
      .insert({
        user_id: profile.id,
        email,
        token,
        expires_at: expiresAt.toISOString(),
        used: false,
      });

    if (tokenError) {
      console.error('New verification token creation failed:', tokenError);

      return res.status(500).json({
        success: false,
        error: `Unable to create a new verification token: ${getErrorMessage(tokenError)}`,
      });
    }

    try {
      await sendVerificationEmail(
        email,
        profile.full_name || email.split('@')[0],
        token
      );

      return res.json({
        success: true,
        message: 'Verification email sent. Please check your inbox.',
        emailSent: true,
      });
    } catch (emailError) {
      console.error('Resend verification email failed:', emailError);

      return res.status(502).json({
        success: false,
        error: `Your verification token was created, but the email could not be sent: ${getErrorMessage(emailError)}`,
        emailSent: false,
      });
    }
  } catch (error) {
    console.error('Resend verification request failed:', error);

    return res.status(500).json({
      success: false,
      error: getErrorMessage(error, 'Failed to resend verification email.'),
    });
  }
};

// ============================================
// CHECK USER EXISTS
// ============================================

export const checkUserExists = async (req, res) => {
  try {
    const email = normalizeEmail(req.query?.email);

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required.',
      });
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, email_verified, full_name')
      .ilike('email', email)
      .maybeSingle();

    if (error) {
      console.error('Check user existence failed:', error);

      return res.status(500).json({
        success: false,
        error: getErrorMessage(error, 'Unable to check user existence.'),
      });
    }

    return res.json({
      success: true,
      exists: Boolean(profile),
      user: profile
        ? {
            email: profile.email,
            email_verified: profile.email_verified,
            full_name: profile.full_name,
          }
        : null,
    });
  } catch (error) {
    console.error('Check user existence request failed:', error);

    return res.status(500).json({
      success: false,
      error: getErrorMessage(error, 'Unable to check user existence.'),
    });
  }
};

// ============================================
// LOGOUT
// ============================================

export const logout = async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout failed:', error);

      return res.status(400).json({
        success: false,
        error: getErrorMessage(error, 'Logout failed.'),
      });
    }

    return res.json({
      success: true,
      message: 'Logout successful!',
    });
  } catch (error) {
    console.error('Logout request failed:', error);

    return res.status(500).json({
      success: false,
      error: getErrorMessage(error, 'Logout failed. Please try again.'),
    });
  }
};

// ============================================
// GET CURRENT USER
// ============================================

export const getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'You are not authenticated. Please log in.',
      });
    }

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', req.user.id)
        .maybeSingle();

    if (profileError) {
      console.error('Current user profile lookup failed:', profileError);

      return res.status(500).json({
        success: false,
        error: `Unable to load your profile: ${getErrorMessage(profileError)}`,
      });
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Your account exists, but its profile could not be found.',
      });
    }

    return res.json({
      success: true,
      user: {
        ...req.user,
        ...profile,
      },
    });
  } catch (error) {
    console.error('Get current user failed:', error);

    return res.status(500).json({
      success: false,
      error: getErrorMessage(error, 'Failed to get your account details.'),
    });
  }
};

// ============================================
// CHECK EMAIL CONFIRMATION
// ============================================

export const checkEmailConfirmation = async (req, res) => {
  try {
    const email = normalizeEmail(req.query?.email);

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required.',
      });
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('email_verified')
      .ilike('email', email)
      .maybeSingle();

    if (error) {
      console.error('Check email confirmation failed:', error);

      return res.status(500).json({
        success: false,
        error: getErrorMessage(error, 'Unable to check email verification status.'),
      });
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'No account was found with this email address.',
      });
    }

    return res.json({
      success: true,
      email_verified: Boolean(profile.email_verified),
      email,
    });
  } catch (error) {
    console.error('Check email confirmation request failed:', error);

    return res.status(500).json({
      success: false,
      error: getErrorMessage(error, 'Unable to check email verification status.'),
    });
  }
};

// ============================================
// GET PROFILE
// ============================================

export const getProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required.',
      });
    }

    const { data: profileData, error: profileError } =
      await supabase
        .from('profiles')
        .select(`
          *,
          items_given_count:items(count),
          items_received_count:items!items_winner_id_fkey(count),
          applications_count:applications(count),
          won_items:winners(
            id,
            item:items(
              id,
              title,
              images,
              category,
              description,
              points,
              status,
              created_at
            )
          )
        `)
        .eq('id', userId)
        .maybeSingle();

    if (profileError) {
      console.error('Get profile query failed:', profileError);

      return res.status(400).json({
        success: false,
        error: getErrorMessage(profileError, 'Unable to load this profile.'),
      });
    }

    if (!profileData) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found.',
      });
    }

    const result = { ...profileData };

    // Only expose private contact information to the profile owner.
    if (currentUserId !== userId) {
      delete result.phone;
      delete result.email;
    }

    return res.json({
      success: true,
      profile: result,
    });
  } catch (error) {
    console.error('Get profile request failed:', error);

    return res.status(500).json({
      success: false,
      error: getErrorMessage(error, 'Failed to fetch profile.'),
    });
  }
};

// ============================================
// EXPORT ALL CONTROLLERS
// ============================================

export default {
  register,
  login,
  verifyEmail,
  resendVerification,
  checkUserExists,
  logout,
  getCurrentUser,
  checkEmailConfirmation,
  googleSignIn,
  getGoogleAuthUrl,
  googleAuthCallback,
  getProfile,
};