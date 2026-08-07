const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const APP_ID = process.env.OPEN_EXCHANGE_RATES_APP_ID;
const REQUIRED_CURRENCIES = ['USD', 'EUR', 'GBP', 'ZAR', 'AUD', 'CAD', 'INR', 'NGN', 'KES', 'JPY', 'CHF', 'BRL'];

/**
 * GET /api/exchange-rates
 * Returns cached exchange rates or fetches new ones if stale (> 1hr)
 */
router.get('/', async (req, res) => {
    try {
        // Check DB for recent rates
        const { data: cachedRates, error: cacheError } = await supabase
            .from('exchange_rates')
            .select('*')
            .eq('base_currency', 'USD')
            .order('fetched_at', { ascending: false })
            .limit(1)
            .single();

        let useCache = false;
        
        if (cachedRates) {
            const ageHours = (new Date() - new Date(cachedRates.fetched_at)) / (1000 * 60 * 60);
            if (ageHours < 1) {
                useCache = true;
            }
        }

        if (useCache) {
            return res.json({
                base: cachedRates.base_currency,
                rates: cachedRates.rates,
                fetched_at: cachedRates.fetched_at
            });
        }

        // Fetch from Open Exchange Rates
        if (!APP_ID) {
            // Fallback to cache if no API key, even if stale
            if (cachedRates) {
                 return res.json({
                    base: cachedRates.base_currency,
                    rates: cachedRates.rates,
                    fetched_at: cachedRates.fetched_at,
                    warning: 'Stale data. API key missing.'
                });
            }
            return res.status(500).json({ error: 'Exchange rates API key not configured' });
        }

        const url = `https://openexchangerates.org/api/latest.json?app_id=${APP_ID}&base=USD`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`OpenExchangeRates API error: ${response.status}`);
        }

        const data = await response.json();
        
        // Filter out currencies we don't care about to save DB space
        const filteredRates = {};
        for (const currency of REQUIRED_CURRENCIES) {
            if (data.rates[currency]) {
                filteredRates[currency] = data.rates[currency];
            }
        }

        // Store in DB
        await supabase.from('exchange_rates').insert({
            base_currency: 'USD',
            rates: filteredRates,
            fetched_at: new Date()
        });

        res.json({
            base: 'USD',
            rates: filteredRates,
            fetched_at: new Date()
        });

    } catch (error) {
        console.error('Error fetching exchange rates:', error);
        res.status(500).json({ error: 'Failed to fetch exchange rates' });
    }
});

module.exports = router;
