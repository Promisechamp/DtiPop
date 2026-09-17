import crypto from 'crypto';
import { supabase, supabaseAdmin } from '../../db/index.js';
import { sendVerificationEmail } from '../../utils/email.js';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Ensure profile exists for a user
 */
async function ensureProfileExists(userId, email, fullName, avatarUrl = null, email_verified = false) {
  console.log('🔍 Checking profile for user:', userId);
  
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (existingProfile) {
    console.log('✅ Profile already exists for:', userId);
    return true;
  }

  console.log('📝 Creating profile for user:', userId);
  
  const { error: createError } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: userId,
      full_name: fullName || email?.split('@')[0] || 'User',
      email: email,
      avatar_url: avatarUrl || null,
      email_verified: email_verified, // ✅ Fixed: Added colon
      role: 'user',
      is_admin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  if (createError) {
    console.error('❌ Profile creation error:', createError);
    return false;
  }

  console.log('✅ Profile created for:', userId);
  return true;
}

// ============================================
// REGISTER
// ============================================



export const register = async (req, res) => {
  try {
    const {
      email,
      password,
      fullName,
      full_name,
      location,
      phone,
      agree_to_terms,
    } = req.body;

    // Handle both fullName and full_name
    const name = fullName || full_name;

    console.log('📝 Registration attempt:', {
      email,
      name,
      location,
      phone,
      agree_to_terms,
    });

    // ============================================
    // VALIDATION
    // ============================================

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and full name are required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters',
      });
    }

    // Normalize location for JSONB
    // The database now stores all location information
    // inside profiles.location as JSONB.
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
      .eq('email', email)
      .maybeSingle();

    if (checkError) {
      console.error(
        '❌ Error checking existing profile:',
        checkError
      );
    }

    if (existingProfile) {
      return res.status(400).json({
        success: false,
        error:
          'This email is already registered. Please login instead.',
      });
    }

    // ============================================
    // STEP 1: CREATE USER IN SUPABASE AUTH
    // ============================================

    // The database trigger should automatically create
    // the corresponding profile.
    //
    // Location is included in user_metadata so the
    // trigger can store it in profiles.location.
    console.log('🔄 Creating auth user...');

    const { data: authData, error: authError } =
      await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            location: profileLocation,
          },
          emailRedirectTo: `${
            process.env.FRONTEND_URL ||
            'http://localhost:5173'
          }/verify-email`,
        },
      });

    if (authError) {
      console.error('❌ Auth error:', authError);

      if (
        authError.message
          ?.toLowerCase()
          .includes('user already registered')
      ) {
        return res.status(400).json({
          success: false,
          error:
            'This email is already registered. Please login instead.',
        });
      }

      return res.status(400).json({
        success: false,
        error:
          authError.message ||
          'Failed to create user',
      });
    }

    if (!authData.user) {
      console.error('❌ No user returned from auth');

      return res.status(400).json({
        success: false,
        error: 'Failed to create user',
      });
    }

    console.log(
      '✅ Auth user created for:',
      authData.user.id
    );

    // ============================================
    // STEP 2: WAIT FOR PROFILE TRIGGER
    // ============================================

    console.log(
      '⏳ Waiting for trigger to create profile...'
    );

    await new Promise((resolve) =>
      setTimeout(resolve, 1000)
    );

    // ============================================
    // STEP 3: FETCH PROFILE CREATED BY TRIGGER
    // ============================================

    console.log(
      '🔄 Fetching profile for user:',
      authData.user.id
    );

    let {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) {
      console.error(
        '⚠️ Profile fetch error:',
        profileError
      );

      // ============================================
      // FALLBACK: CREATE PROFILE MANUALLY
      // ============================================

      if (profileError.code === 'PGRST116') {
        console.log(
          '📝 Profile not found, creating manually...'
        );

        const {
          data: createdProfile,
          error: createError,
        } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: authData.user.id,
            full_name: name,
            email: email,
            avatar_url:
              authData.user.user_metadata
                ?.avatar_url ||
              null,
            location: profileLocation,
            phone: phone || null,
            email_verified: false,
            role: 'user',
            is_admin: false,
            agree_to_terms:
              agree_to_terms ?? false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select('*')
          .single();

        if (createError) {
          console.error(
            '❌ Manual profile creation error:',
            createError
          );

          // Don't delete the Auth user.
          // They can try logging in again.
          return res.status(500).json({
            success: false,
            error:
              'Account created but profile setup failed. Please try logging in.',
          });
        }

        profile = createdProfile;

        console.log(
          '✅ Manual profile created for:',
          authData.user.id
        );
      } else {
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch profile',
        });
      }
    }

    // ============================================
    // STEP 4: ENSURE PROFILE LOCATION / PHONE
    // ============================================

    // Normally the trigger should already have created
    // the profile with location from user_metadata.
    //
    // This small update also ensures registration data
    // is retained if the trigger created the profile
    // without those optional fields.

    if (profile) {
      const profileUpdates = {};

      // Only update location if the registration supplied
      // an actual location and the profile does not already
      // contain one.
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
        profileUpdates.agree_to_terms =
          agree_to_terms;
      }

      if (Object.keys(profileUpdates).length > 0) {
        profileUpdates.updated_at =
          new Date().toISOString();

        const {
          data: updatedProfile,
          error: updateError,
        } = await supabaseAdmin
          .from('profiles')
          .update(profileUpdates)
          .eq('id', authData.user.id)
          .select('*')
          .single();

        if (updateError) {
          console.error(
            '⚠️ Profile update after registration failed:',
            updateError
          );
        } else {
          profile = updatedProfile;
        }
      }
    }

    console.log(
      '✅ Profile found for:',
      authData.user.id
    );

    // ============================================
    // STEP 5: GENERATE VERIFICATION TOKEN
    // ============================================

    console.log(
      '🔄 Creating verification token...'
    );

    const token = crypto
      .randomBytes(32)
      .toString('hex');

    const expiresAt = new Date();

    expiresAt.setHours(
      expiresAt.getHours() + 24
    );

    const { error: tokenError } =
      await supabaseAdmin
        .from('verification_tokens')
        .insert({
          user_id: authData.user.id,
          email: email,
          token: token,
          expires_at: expiresAt.toISOString(),
          used: false,
        });

    if (tokenError) {
      console.error(
        '⚠️ Token creation error (non-fatal):',
        tokenError
      );
    }

    // ============================================
    // STEP 6: SEND VERIFICATION EMAIL
    // ============================================

    console.log(
      '🔄 Sending verification email...'
    );

    let emailSent = false;

    try {
      await sendVerificationEmail(
        email,
        name,
        token
      );

      emailSent = true;

      console.log(
        '✅ Verification email sent to:',
        email
      );
    } catch (emailError) {
      console.error(
        '⚠️ Email sending error (non-fatal):',
        emailError.message
      );
    }

    // ============================================
    // STEP 7: GET FRESH PROFILE DATA
    // ============================================

    const {
      data: finalProfile,
      error: finalProfileError,
    } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (finalProfileError) {
      console.error(
        '⚠️ Final profile fetch error:',
        finalProfileError
      );
    }

    console.log(
      '✅ Registration complete for:',
      email
    );

    // ============================================
    // STEP 8: RETURN SUCCESS
    // ============================================

    return res.status(201).json({
      success: true,

      message: emailSent
        ? 'Registration successful! Please check your email to verify your account.'
        : 'Registration successful! We could not send a verification email. You can resend it from your dashboard.',

      user: {
        id: authData.user.id,
        email: authData.user.email,
        full_name: name,
        ...(finalProfile || profile || {}),
      },

      session: null,

      requiresEmailVerification: true,

      emailSent,
    });
  } catch (error) {
    console.error(
      '❌ Registration error:',
      error
    );

    return res.status(500).json({
      success: false,
      error:
        error.message ||
        'Registration failed. Please try again.',
    });
  }
};




// ============================================
// LOGIN
// ============================================

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (profile) {
        return res.status(401).json({
          success: false,
          error: 'This email is registered with Google. Please sign in with Google.',
          useGoogle: true
        });
      }
      return res.status(401).json({
        success: false,
        error: error.message || 'Invalid email or password'
      });
    }

    if (!data.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed'
      });
    }

    console.log('✅ Login successful for:', data.user.email);

    // Ensure profile exists
    await ensureProfileExists(
      data.user.id,
      data.user.email,
      data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User',
      data.user.user_metadata?.avatar_url || null,
      false
    );

    // Update last login
    await supabase
      .from('profiles')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', data.user.id);

    // Get fresh profile data
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    res.json({
      success: true,
      message: 'Login successful!',
      user: {
        id: data.user.id,
        email: data.user.email,
        ...userProfile
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed. Please try again.'
    });
  }
};

// ============================================
// GOOGLE SIGN-IN
// ============================================

export const googleSignIn = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Google token is required'
      });
    }

    console.log('🔄 Google Sign-In...');

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      idToken: token,
    });

    if (error) {
      console.error('❌ Google auth error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Google authentication failed'
      });
    }

    if (!data.user) {
      console.error('❌ No user from Supabase');
      return res.status(400).json({
        success: false,
        error: 'Failed to authenticate with Google'
      });
    }

    console.log('✅ Google auth successful for:', data.user.email);
    console.log('📦 User ID:', data.user.id);

    // Check if profile exists
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Error checking profile:', checkError);
    }

    // Create profile if it doesn't exist
    if (!existingProfile) {
      console.log('📝 Creating profile for:', data.user.id);
      
      const userEmail = data.user.email;
      const userFullName = data.user.user_metadata?.full_name || 
                           data.user.user_metadata?.name || 
                           data.user.email?.split('@')[0] || 
                           'User';
      const userAvatar = data.user.user_metadata?.avatar_url || 
                         data.user.user_metadata?.picture || 
                         null;

      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: data.user.id,
          full_name: userFullName,
          email: userEmail,
          avatar_url: userAvatar,
          email_verified: true, // ✅ Fixed: Added colon
          role: 'user',
          is_admin: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Profile creation error:', createError);
        try {
          await supabaseAdmin.auth.admin.deleteUser(data.user.id);
          console.log('🗑️ Auth user deleted due to profile failure');
        } catch (deleteError) {
          console.error('❌ Failed to delete auth user:', deleteError);
        }
        return res.status(500).json({
          success: false,
          error: 'Failed to create user profile. Please try again.'
        });
      }

      console.log('✅ Profile created for:', data.user.id);
      
      return res.json({
        success: true,
        message: 'Google login successful!',
        user: {
          id: data.user.id,
          email: data.user.email,
          ...newProfile
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at
        },
        isNewUser: true
      });
    }

    // Update existing profile if needed (e.g., avatar URL changed)
    const updates = {};
    if (data.user.user_metadata?.avatar_url && !existingProfile.avatar_url) {
      updates.avatar_url = data.user.user_metadata.avatar_url;
    }
    if (data.user.user_metadata?.full_name && !existingProfile.full_name) {
      updates.full_name = data.user.user_metadata.full_name;
    }
    updates.updated_at = new Date().toISOString();

    if (Object.keys(updates).length > 0) {
      await supabase
        .from('profiles')
        .update(updates)
        .eq('id', data.user.id);
    }

    console.log('✅ Profile already exists for:', data.user.id);
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.error('⚠️ Profile fetch error:', profileError);
    }

    res.json({
      success: true,
      message: 'Google login successful!',
      user: {
        id: data.user.id,
        email: data.user.email,
        ...profile
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at
      },
      isNewUser: false
    });

  } catch (error) {
    console.error('❌ Google sign-in error:', error);
    res.status(500).json({
      success: false,
      error: 'Google login failed. Please try again.'
    });
  }
};

// ============================================
// GOOGLE OAUTH URL
// ============================================

export const getGoogleAuthUrl = async (req, res) => {
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectTo = `${frontendUrl}/auth/callback`;
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });

    if (error) {
      console.error('❌ Google OAuth URL error:', error);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    console.log('✅ Google OAuth URL generated');
    
    res.json({
      success: true,
      url: data.url
    });

  } catch (error) {
    console.error('❌ Get Google auth URL error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Google auth URL'
    });
  }
};

// ============================================
// GOOGLE OAUTH CALLBACK
// ============================================

export const googleAuthCallback = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?error=no_code`);
    }

    console.log('🔄 Google callback...');

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('❌ Exchange code error:', error);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?error=${encodeURIComponent(error.message)}`);
    }

    if (!data.user) {
      console.error('❌ No user from exchange');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?error=no_user`);
    }

    console.log('✅ Google auth successful for:', data.user.email);

    // Check if profile exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', data.user.id)
      .maybeSingle();

    // Create profile if it doesn't exist (fallback)
    if (!existingProfile) {
      console.log('📝 Creating profile for:', data.user.id);
      
      const userEmail = data.user.email;
      const userFullName = data.user.user_metadata?.full_name || 
                           data.user.user_metadata?.name || 
                           data.user.email?.split('@')[0] || 
                           'User';
      const userAvatar = data.user.user_metadata?.avatar_url || 
                         data.user.user_metadata?.picture || 
                         null;

      const { error: createError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: data.user.id,
          full_name: userFullName,
          email: userEmail,
          avatar_url: userAvatar,
          email_verified: true, // ✅ Fixed: Added colon
          role: 'user',
          is_admin: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (createError) {
        console.error('❌ Profile creation error:', createError);
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?error=${encodeURIComponent('Failed to create profile')}`);
      }
      
      console.log('✅ Profile created for:', data.user.id);
    }

    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?access_token=${data.session.access_token}&refresh_token=${data.session.refresh_token}`;
    res.redirect(redirectUrl);

  } catch (error) {
    console.error('❌ Google callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback?error=${encodeURIComponent(error.message)}`);
  }
};

// ============================================
// EMAIL VERIFICATION
// ============================================

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Verification token is required'
      });
    }

    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('verification_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification token'
      });
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      await supabaseAdmin
        .from('verification_tokens')
        .delete()
        .eq('id', tokenData.id);

      return res.status(400).json({
        success: false,
        error: 'Verification token has expired. Please request a new one.',
        expired: true
      });
    }

    if (tokenData.used) {
      return res.status(400).json({
        success: false,
        error: 'This verification link has already been used.'
      });
    }

    // Mark token as used
    await supabaseAdmin
      .from('verification_tokens')
      .update({ used: true })
      .eq('id', tokenData.id);

    // Update profile email_verified to true
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        email_verified: true, // ✅ Fixed: Added colon
        updated_at: new Date().toISOString()
      })
      .eq('id', tokenData.user_id)
      .select()
      .single();

    if (profileError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to verify email. Please try again.'
      });
    }

    res.json({
      success: true,
      message: 'Email verified successfully! 🎉',
      user: profile
    });

  } catch (error) {
    console.error('❌ Email verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify email. Please try again.'
    });
  }
};

// ============================================
// RESEND VERIFICATION
// ============================================

export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email_verified')
      .eq('email', email)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (profile.email_verified) {
      return res.status(400).json({
        success: false,
        error: 'This email is already verified. Please login.'
      });
    }

    // Delete old tokens
    await supabaseAdmin
      .from('verification_tokens')
      .delete()
      .eq('user_id', profile.id)
      .eq('used', false);

    // Create new token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await supabaseAdmin
      .from('verification_tokens')
      .insert({
        user_id: profile.id,
        email: email,
        token: token,
        expires_at: expiresAt.toISOString(),
        used: false,
      });

    // Send email
    let emailSent = false;
    try {
      await sendVerificationEmail(email, profile.full_name, token);
      emailSent = true;
    } catch (emailError) {
      console.error('❌ Email sending error:', emailError.message);
    }

    res.json({
      success: true,
      message: emailSent 
        ? 'Verification email resent! Please check your inbox.'
        : 'Failed to send email. Please try again later.',
      emailSent: emailSent
    });

  } catch (error) {
    console.error('❌ Resend verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend verification email'
    });
  }
};

// ============================================
// CHECK USER EXISTS
// ============================================

export const checkUserExists = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, email_verified, full_name')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to check user existence'
      });
    }

    res.json({
      success: true,
      exists: !!profile,
      user: profile ? {
        email: profile.email,
        email_verified: profile.email_verified,
        full_name: profile.full_name
      } : null
    });

  } catch (error) {
    console.error('Check user exists error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check user existence'
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
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.json({
      success: true,
      message: 'Logout successful!'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed. Please try again.'
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
        error: 'Not authenticated'
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Profile fetch error:', profileError);
    }

    res.json({
      success: true,
      user: {
        ...req.user,
        ...profile
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user'
    });
  }
};

// ============================================
// CHECK EMAIL CONFIRMATION
// ============================================

export const checkEmailConfirmation = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('email_verified')
      .eq('email', email)
      .single();

    if (error) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      email_verified: profile?.email_verified || false,
      email: email
    });

  } catch (error) {
    console.error('Check confirmation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check email status'
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

    // Get profile data with counts
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select(`
        *,
        items_given_count:items(count),
        items_received_count:items?winner_id(count),
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
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
      return res.status(400).json({
        success: false,
        error: profileError.message
      });
    }

    // If no profile exists, create one
    if (!profileData) {
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from('profiles')
        .insert([
          {
            id: userId,
            user_id: userId
          }
        ])
        .select(`
          *,
          users:user_id(
            id,
            email,
            phone,
            created_at,
            updated_at,
            last_sign_in_at,
            email_confirmed_at
          )
        `)
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
        return res.status(500).json({
          success: false,
          error: 'Failed to create user profile'
        });
      }

      // Merge profile and user data
      const mergedData = {
        ...newProfile,
        user: newProfile.users
      };
      delete mergedData.users;

      // Don't return sensitive info if not the owner
      if (currentUserId !== userId) {
        delete mergedData.user?.email;
        delete mergedData.user?.phone;
        delete mergedData.phone;
        delete mergedData.email;
      }

      return res.json({
        success: true,
        profile: mergedData
      });
    }

    // Get user data separately
    const { data: userData, error: userError } = await supabase.auth.admin
      .getUserById(userId);

    if (userError) {
      console.error('Error fetching user:', userError);
      // Still return profile without user data
      const result = {
        ...profileData,
        user: null
      };

      if (currentUserId !== userId) {
        delete result.phone;
        delete result.email;
      }

      return res.json({
        success: true,
        profile: result
      });
    }

    // Merge profile and user data
    const result = {
      ...profileData,
      user: {
        id: userData.user.id,
        email: userData.user.email,
        phone: userData.user.phone,
        created_at: userData.user.created_at,
        updated_at: userData.user.updated_at,
        last_sign_in_at: userData.user.last_sign_in_at,
        email_confirmed_at: userData.user.email_confirmed_at
      }
    };

    // Don't return sensitive info if not the owner
    if (currentUserId !== userId) {
      delete result.user?.email;
      delete result.user?.phone;
      delete result.phone;
      delete result.email;
    }

    res.json({
      success: true,
      profile: result
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
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