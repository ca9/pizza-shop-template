import type {SupabaseClient} from "@supabase/supabase-js";
import type {Database} from "$lib/database";

export async function getUserIdByEmail(
    client: SupabaseClient<Database>,
    email: string
) {
    const { data: user, error } = await client
        .from('auth.users')
        .select('id')
        .eq('email', email)
        .single();

    if (error) {
        throw new Error(`Failed to find user: ${error.message}`);
    }

    return user.id;
}
