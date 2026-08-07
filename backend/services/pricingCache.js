const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get a specific cached price
 * @param {string} provider 'aws', 'gcp', 'azure'
 * @param {string} serviceType eg 'Compute' or specific instance ID
 * @param {string} region eg 'us-east-1'
 */
async function getCachedPricing(provider, serviceType, region) {
    try {
        let query = supabase
            .from('pricing_cache')
            .select('*')
            .eq('provider', provider)
            .eq('region', region);

        // Allow partial match on service type for simpler queries
        if (serviceType) {
             query = query.ilike('service_type', `%${serviceType}%`);
        }

        const { data, error } = await query.order('fetched_at', { ascending: false }).limit(1).single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is no rows returned
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Error in getCachedPricing:', error);
        return null;
    }
}

/**
 * Bulk upsert pricing records
 * @param {Array} records 
 */
async function upsertPricing(records) {
    try {
        // Delete old records for these providers/regions to keep table clean,
        // or just insert new ones and let them be sorted by fetched_at. 
        // We'll insert with current timestamp.
        
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
 * @param {string} provider 
 * @returns {number} Age in hours, or 9999 if no cache
 */
async function getCacheAge(provider) {
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
 * @param {string} provider 
 * @param {number} maxAgeHours 
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
