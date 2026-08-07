const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Creates a user profile in the public.users table
 */
async function createUserProfile(supabaseUserId, email, orgId, role = 'viewer', fullName = null) {
    const { data, error } = await supabase
        .from('users')
        .insert({
            id: supabaseUserId,
            email: email,
            org_id: orgId,
            role: role,
            full_name: fullName
        })
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

/**
 * Gets a user and their organisation details
 */
async function getUserBySupabaseId(supabaseUserId) {
    const { data, error } = await supabase
        .from('users')
        .select(`
            *,
            organisations (
                name,
                plan,
                subscription_status
            )
        `)
        .eq('id', supabaseUserId)
        .single();
    
    if (error) throw error;
    return data;
}

/**
 * Updates a user's preferred currency
 */
async function updateUserCurrency(userId, currency) {
    const { data, error } = await supabase
        .from('users')
        .update({ preferred_currency: currency.toUpperCase() })
        .eq('id', userId)
        .select()
        .single();
    
    if (error) throw error;
    return data;
}

/**
 * Permanently deletes a user account (Auth + Public Table)
 */
async function deleteUserAccount(userId) {
    // 1. Delete from public schema (cascades to proposals, cloud_profiles, etc. based on schema setup)
    const { error: dbError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);
    
    if (dbError) throw dbError;

    // 2. Delete from Supabase Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    
    if (authError) throw authError;

    return true;
}

/**
 * Gets all members of an organisation
 */
async function getOrgMembers(orgId) {
    const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, role, created_at, preferred_currency')
        .eq('org_id', orgId)
        .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data;
}

module.exports = {
    createUserProfile,
    getUserBySupabaseId,
    updateUserCurrency,
    deleteUserAccount,
    getOrgMembers
};
