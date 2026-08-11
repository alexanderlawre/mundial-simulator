import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from './supabaseClient'
import { saveProfile, clearProfile } from './storage'

// Thin wrapper around Supabase Auth's session state, exposed via context so
// any component can read the current user or trigger auth actions without
// prop-drilling. Mirrors this codebase's other context (LanguageProvider in
// i18n.jsx): a Provider wrapping <App/> in main.jsx, plus a `useAuth()` hook.
//
// `loading` covers the brief window on first load while we ask Supabase
// whether a session already exists (from a previously-stored refresh token)
// -- callers (RequireAuth, RootRoute) wait for this before deciding whether
// to redirect, so a logged-in user never gets bounced to /login on refresh
// just because the check hasn't resolved yet.
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const syncedUserId = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // Mirror the Supabase `profiles` row into localStorage as `saveProfile()`
  // whenever the logged-in user changes, so existing profile-reading
  // components (Dashboard's welcome header/flag, etc.) keep working
  // unchanged -- they still just call the pre-existing `getProfile()`.
  // Cleared on sign-out. Guarded by a ref so it only re-fetches when the
  // user id actually changes, not on every token refresh.
  useEffect(() => {
    const userId = session?.user?.id || null
    if (userId === syncedUserId.current) return
    syncedUserId.current = userId
    if (!userId) {
      clearProfile()
      return
    }
    supabase
      .from('profiles')
      .select('name, favorite_team, avatar_url')
      .eq('id', userId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) return
        saveProfile({ name: data.name, email: session.user.email, supportedCountry: data.favorite_team, avatarUrl: data.avatar_url || null })
      })
  }, [session])

  const value = {
    user: session?.user || null,
    session,
    loading,
    async signUp({ email, password, name, favoriteTeam }) {
      return supabase.auth.signUp({
        email,
        password,
        options: { data: { name, favorite_team: favoriteTeam } },
      })
    },
    async signIn({ email, password }) {
      return supabase.auth.signInWithPassword({ email, password })
    },
    async signOut() {
      return supabase.auth.signOut()
    },
    async sendPasswordReset(email) {
      return supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
    },
    async updatePassword(password) {
      return supabase.auth.updateUser({ password })
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
