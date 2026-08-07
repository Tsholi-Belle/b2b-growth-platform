const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const { getCachedPricing, isCacheStale } = require('../services/pricingCache');
const { fetchAndCachePricing } = require('../services/pricingFetcher');

/**
 * GET /api/cloud-pricing/compare
 * Compares cloud pricing across providers.
 */
router.get('/compare', async (req, res) => {
  try {
    const { provider, service, region, usage_amount, usage_unit } = req.query;

    if (!provider || !service || !region) {
      return res.status(400).json({ error: 'Missing required parameters: provider, service, region' });
    }

    // Try to get from cache first
    let cachedPrice = await getCachedPricing(provider, service, region);

    // If cache is stale or missing, try to fetch live (or trigger async fetch and use old cache)
    if (!cachedPrice || await isCacheStale(provider)) {
       // Fire and forget background update if we have a stale cache, else await it
       if (cachedPrice) {
           fetchAndCachePricing().catch(console.error);
       } else {
           await fetchAndCachePricing();
           cachedPrice = await getCachedPricing(provider, service, region);
       }
    }

    if (!cachedPrice) {
        return res.status(404).json({ error: 'Pricing data not found for specified parameters' });
    }

    const priceUsd = parseFloat(cachedPrice.price_usd);
    const amount = parseFloat(usage_amount) || 1;
    const totalCost = priceUsd * amount;

    res.json({
        provider: cachedPrice.provider,
        service: cachedPrice.service_type,
        region: cachedPrice.region,
        unit: cachedPrice.unit,
        unit_price_usd: priceUsd,
        estimated_total_usd: totalCost,
        fetched_at: cachedPrice.fetched_at,
        is_cached: true
    });

  } catch (error) {
    console.error('Error in /compare:', error);
    res.status(500).json({ error: 'Failed to fetch pricing data' });
  }
});

/**
 * GET /api/cloud-pricing/cached
 * Returns raw cached pricing data.
 */
router.get('/cached', async (req, res) => {
  try {
    const { provider, service, region } = req.query;
    const cachedPrice = await getCachedPricing(provider, service, region);
    
    if (!cachedPrice) {
        return res.status(404).json({ error: 'Cached pricing not found' });
    }
    
    res.json(cachedPrice);
  } catch (error) {
    console.error('Error fetching cached pricing:', error);
    res.status(500).json({ error: 'Failed to fetch cached pricing data' });
  }
});

/**
 * GET /api/cloud-pricing/providers
 * Returns supported providers and status.
 */
router.get('/providers', (req, res) => {
  res.json({
    providers: [
      { id: 'aws', name: 'Amazon Web Services', status: 'operational' },
      { id: 'gcp', name: 'Google Cloud Platform', status: 'operational' },
      { id: 'azure', name: 'Microsoft Azure', status: 'operational' }
    ]
  });
});

module.exports = router;
