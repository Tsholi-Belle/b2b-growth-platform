const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { createClient } = require('@supabase/supabase-js');

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

router.use(authMiddleware);

/**
 * POST /api/connectors/aws/connect
 * Connect an AWS account
 */
router.post('/aws/connect', async (req, res) => {
  try {
    const { account_id, role_arn, region } = req.body;
    const orgId = req.user.org_id;
    const userId = req.user.id;

    if (!account_id || !role_arn || !region) {
        return res.status(400).json({ error: 'account_id, role_arn, and region are required' });
    }

    // In a real app, you would securely store the ARN and maybe test STS assumeRole here.
    // For now, we store a reference in DB.
    const { data, error } = await supabase
      .from('cloud_profiles')
      .upsert({
        user_id: userId,
        org_id: orgId,
        provider: 'aws',
        connection_type: 'iam_role',
        credentials_ref: role_arn,
        region: region,
        last_synced_at: new Date()
      }, { onConflict: 'org_id,provider' })
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'AWS account connected successfully', profile: data });
  } catch (error) {
    console.error('AWS connect error:', error);
    res.status(500).json({ error: 'Failed to connect AWS account' });
  }
});

/**
 * POST /api/connectors/gcp/connect
 * Connect a GCP project
 */
router.post('/gcp/connect', async (req, res) => {
  try {
    const { service_account_email, project_id } = req.body;
    const orgId = req.user.org_id;
    const userId = req.user.id;

    if (!service_account_email || !project_id) {
        return res.status(400).json({ error: 'service_account_email and project_id are required' });
    }

    const { data, error } = await supabase
      .from('cloud_profiles')
      .upsert({
        user_id: userId,
        org_id: orgId,
        provider: 'gcp',
        connection_type: 'api_key', // Or oauth/service_account
        credentials_ref: service_account_email,
        region: 'global',
        last_synced_at: new Date()
      }, { onConflict: 'org_id,provider' })
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'GCP account connected successfully', profile: data });
  } catch (error) {
    console.error('GCP connect error:', error);
    res.status(500).json({ error: 'Failed to connect GCP account' });
  }
});

/**
 * GET /api/connectors/aws/spend
 * Get AWS spend data (Simulated Cost Explorer API response)
 */
router.get('/aws/spend', async (req, res) => {
  try {
    // In production, use AWS SDK CostExplorer client here
    // const ce = new AWS.CostExplorer({region: 'us-east-1'});
    // ... ce.getCostAndUsage(...)
    
    // Simulated data
    res.json({
        total_spend_usd: 1450.25,
        period: { start: '2023-10-01', end: '2023-10-31' },
        services: [
            { name: 'AmazonEC2', amount: 800.00 },
            { name: 'AmazonRDS', amount: 450.25 },
            { name: 'AmazonS3', amount: 200.00 }
        ]
    });
  } catch (error) {
    console.error('AWS spend error:', error);
    res.status(500).json({ error: 'Failed to fetch AWS spend' });
  }
});

/**
 * GET /api/connectors/gcp/spend
 * Get GCP spend data (Simulated Billing API response)
 */
router.get('/gcp/spend', async (req, res) => {
  try {
    // Simulated data
    res.json({
        total_spend_usd: 980.50,
        period: { start: '2023-10-01', end: '2023-10-31' },
        services: [
            { name: 'Compute Engine', amount: 600.00 },
            { name: 'Cloud SQL', amount: 300.50 },
            { name: 'Cloud Storage', amount: 80.00 }
        ]
    });
  } catch (error) {
    console.error('GCP spend error:', error);
    res.status(500).json({ error: 'Failed to fetch GCP spend' });
  }
});

/**
 * GET /api/connectors/status
 * Get status of all connected providers
 */
router.get('/status', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cloud_profiles')
      .select('id, provider, connection_type, region, last_synced_at')
      .eq('org_id', req.user.org_id);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Status fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch connector status' });
  }
});

/**
 * DELETE /api/connectors/:provider
 * Disconnect a provider
 */
router.delete('/:provider', async (req, res) => {
    try {
        const { provider } = req.params;
        const { error } = await supabase
          .from('cloud_profiles')
          .delete()
          .eq('org_id', req.user.org_id)
          .eq('provider', provider);
    
        if (error) throw error;
        res.json({ message: `Successfully disconnected ${provider}` });
    } catch (error) {
        console.error('Disconnect error:', error);
        res.status(500).json({ error: 'Failed to disconnect provider' });
    }
});

module.exports = router;
