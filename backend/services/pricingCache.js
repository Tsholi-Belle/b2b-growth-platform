const { createClient } = require('@supabase/supabase-js');

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * Get a specific cached price
 */
async function getCachedPricing(provider, serviceType, region) {
    if (!supabase) return null;
    try {
        let query = supabase
            .from('pricing_cache')
            .select('*')
            .eq('provider', provider)
            .eq('region', region);

        if (serviceType) {
             query = query.ilike('service_type', `%${serviceType}%`);
        }

        const { data, error } = await query.order('fetched_at', { ascending: false }).limit(1).single();
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    } catch (error) {
        console.error('Error in getCachedPricing:', error);
        return null;
    }
}

/**
 * Bulk upsert pricing records
 */
async function upsertPricing(records) {
    if (!supabase) return false;
    try {
        const { error } = await supabase
            .from('pricing_cache')
            .insert(records.map(r => ({
                provider: r.provider,
                service_type: r.service_type,
                price_usd: r.price_usd,
                region: r.region,
                unit: r.unit,
                fetched_at: new Date()
            })));

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error in upsertPricing:', error);
        return false;
    }
}

/**
 * Check how old the cache is for a provider
 */
async function getCacheAge(provider) {
    if (!supabase) return 9999;
    try {
        const { data, error } = await supabase
            .from('pricing_cache')
            .select('fetched_at')
            .eq('provider', provider)
            .order('fetched_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !data) return 9999;

        const ageMs = new Date() - new Date(data.fetched_at);
        return ageMs / (1000 * 60 * 60);
    } catch (error) {
        return 9999;
    }
}

/**
 * Check if cache is stale
 */
async function isCacheStale(provider, maxAgeHours = 24) {
    const age = await getCacheAge(provider);
    return age > maxAgeHours;
}

module.exports = {
    getCachedPricing,
    upsertPricing,
    getCacheAge,
    isCacheStale
};
