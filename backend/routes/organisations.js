const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/rbacMiddleware');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Need service role to manage auth/users
);

router.use(authMiddleware);

/**
 * GET /api/org
 * Get current org details
 */
router.get('/', requireRole('owner', 'admin', 'analyst', 'viewer'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('organisations')
      .select('*')
      .eq('id', req.user.org_id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching org:', error);
    res.status(500).json({ error: 'Failed to fetch organisation details' });
  }
});

/**
 * GET /api/org/members
 * List all users in org
 */
router.get('/members', requireRole('owner', 'admin'), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, created_at')
      .eq('org_id', req.user.org_id);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching org members:', error);
    res.status(500).json({ error: 'Failed to fetch organisation members' });
  }
});

/**
 * POST /api/org/invite
 * Send invite email via Supabase Auth
 */
router.post('/invite', requireRole('owner', 'admin'), async (req, res) => {
  try {
    const { email, role } = req.body;
    
    if (!email || !role) {
        return res.status(400).json({ error: 'Email and role are required' });
    }

    // 1. Invite user via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(email);
    
    if (authError) throw authError;

    // 2. Create user record in public.users table linking to this org
    const { data: userData, error: userError } = await supabase
      .from('users')
      .upsert({
          id: authData.user.id,
          email: email,
          org_id: req.user.org_id,
          role: role
      })
      .select();

    if (userError) throw userError;

    res.status(201).json({ message: 'Invitation sent', user: userData });
  } catch (error) {
    console.error('Error inviting member:', error);
    res.status(500).json({ error: 'Failed to invite member' });
  }
});

/**
 * PATCH /api/org/members/:userId/role
 * Change a member's role
 */
router.patch('/members/:userId/role', requireRole('owner'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role) {
        return res.status(400).json({ error: 'Role is required' });
    }

    // Prevent removing own owner status easily
    if (userId === req.user.id && role !== 'owner') {
        return res.status(400).json({ error: 'Cannot downgrade your own role from owner' });
    }

    const { data, error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', userId)
      .eq('org_id', req.user.org_id) // ensure they are in same org
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Failed to update member role' });
  }
});

/**
 * DELETE /api/org/members/:userId
 * Remove a member
 */
router.delete('/members/:userId', requireRole('owner'), async (req, res) => {
    try {
        const { userId } = req.params;
    
        if (userId === req.user.id) {
            return res.status(400).json({ error: 'Cannot remove yourself' });
        }
    
        // Delete from public.users (triggers DB cascade if setup, otherwise just unlinks them)
        const { error: userError } = await supabase
          .from('users')
          .delete()
          .eq('id', userId)
          .eq('org_id', req.user.org_id);
    
        if (userError) throw userError;

        // Optionally delete from auth.users (requires service role)
        await supabase.auth.admin.deleteUser(userId);
    
        res.status(204).send();
    } catch (error) {
        console.error('Error removing member:', error);
        res.status(500).json({ error: 'Failed to remove member' });
    }
});

/**
 * GET /api/org/usage
 * Return usage stats
 */
router.get('/usage', requireRole('owner', 'admin'), async (req, res) => {
    try {
        const { data, error } = await supabase
          .from('usage_events')
          .select('event_type, credits_used')
          .eq('org_id', req.user.org_id);
    
        if (error) throw error;

        // Aggregate stats
        const stats = {
            total_credits: 0,
            proposals_generated: 0,
            optimizer_runs: 0,
            exports: 0
        };

        data.forEach(event => {
            stats.total_credits += parseFloat(event.credits_used || 0);
            if (event.event_type === 'proposal_generated') stats.proposals_generated++;
            if (event.event_type === 'optimizer_run') stats.optimizer_runs++;
            if (event.event_type === 'export') stats.exports++;
        });
    
        res.json(stats);
    } catch (error) {
        console.error('Error fetching usage:', error);
        res.status(500).json({ error: 'Failed to fetch usage stats' });
    }
});

module.exports = router;
