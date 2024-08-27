import type { Session, SupabaseClient, User } from '@supabase/supabase-js'
import type { Database } from '$lib/database'

declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      supabase: SupabaseClient<Database>
      supabaseAdmin: SupabaseClient<Database>
      getSession: () => Promise<{ session: Session | null; user: User | null }>
      session: Session | null
      user: User | null
    }
    interface PageData {
      session: Session | null
    }
    // interface PageState {}
    // interface Platform {}
  }
}

export { }
