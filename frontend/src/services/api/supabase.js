import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase configuration. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  }
);

/*
|--------------------------------------------------------------------------
| Supabase Authentication Listener
|--------------------------------------------------------------------------
|
| Responsibilities:
| - Synchronize access and refresh tokens with the API client.
| - Keep Supabase session persistence enabled.
| - Avoid overwriting the application's cached user profile with the raw
|   Supabase authentication user.
| - Clear authentication-related cache when the user signs out.
|
| AuthContext remains responsible for caching the complete user profile,
| including role and is_admin.
|
*/

supabase.auth.onAuthStateChange((event, session) => {
  try {
    if (
      (event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED") &&
      session
    ) {
      localStorage.setItem(
        "token",
        session.access_token
      );

      if (session.refresh_token) {
        localStorage.setItem(
          "refresh_token",
          session.refresh_token
        );
      }
    }

    if (event === "SIGNED_OUT") {
      localStorage.removeItem("token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
    }
  } catch (error) {
    console.error(
      "[SUPABASE AUTH] Failed to synchronize authentication storage:",
      error
    );
  }
});