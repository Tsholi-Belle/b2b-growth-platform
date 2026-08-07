const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const authMiddleware = require('../middleware/authMiddleware');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const plans = {
    free: { name: 'Free', price_usd: 0, features: ['1 Proposal/mo'], stripe_price_id: process.env.STRIPE_PRICE_FREE },
    starter: { name: 'Starter', price_usd: 49, features: ['10 Proposals/mo', 'Basic AWS Pricing'], stripe_price_id: process.env.STRIPE_PRICE_STARTER },
    professional: { name: 'Professional', price_usd: 149, features: ['Unlimited Proposals', 'All Cloud Connectors', 'SAM.gov API'], stripe_price_id: process.env.STRIPE_PRICE_PROFESSIONAL },
    enterprise: { name: 'Enterprise', price_usd: 499, features: ['Custom Integrations', 'Dedicated Support', 'White-labeling'], stripe_price_id: process.env.STRIPE_PRICE_ENTERPRISE }
};

/**
 * GET /api/billing/plans
 * Public endpoint to list available plans
 */
router.get('/plans', (req, res) => {
    res.json(plans);
});

/**
 * POST /api/billing/checkout
 * Create Stripe Checkout Session
 */
router.post('/checkout', authMiddleware, async (req, res) => {
    try {
        const { plan } = req.body;
        const orgId = req.user.org_id;
        
        if (!plans[plan] || plan === 'free') {
            return res.status(400).json({ error: 'Invalid plan selected' });
        }

        // Get org to check for existing customer ID
        const { data: org } = await supabase.from('organisations').select('stripe_customer_id').eq('id', orgId).single();
        
        let customerId = org?.stripe_customer_id;

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: req.user.email,
                metadata: { orgId: orgId }
            });
            customerId = customer.id;
            
            // Save customer ID
            await supabase.from('organisations').update({ stripe_customer_id: customerId }).eq('id', orgId);
        }

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [
                { price: plans[plan].stripe_price_id, quantity: 1 }
            ],
            mode: 'subscription',
            success_url: `${process.env.FRONTEND_URL}/billing?success=true`,
            cancel_url: `${process.env.FRONTEND_URL}/billing?canceled=true`,
            metadata: { orgId, plan }
        });

        res.json({ checkoutUrl: session.url });
    } catch (error) {
        console.error('Checkout error:', error);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

/**
 * POST /api/billing/portal
 * Create Stripe Customer Portal session
 */
router.post('/portal', authMiddleware, async (req, res) => {
    try {
        const orgId = req.user.org_id;
        const { data: org } = await supabase.from('organisations').select('stripe_customer_id').eq('id', orgId).single();

        if (!org || !org.stripe_customer_id) {
            return res.status(400).json({ error: 'No active billing found for this organisation' });
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: org.stripe_customer_id,
            return_url: `${process.env.FRONTEND_URL}/billing`,
        });

        res.json({ portalUrl: session.url });
    } catch (error) {
        console.error('Portal error:', error);
        res.status(500).json({ error: 'Failed to create billing portal session' });
    }
});

/**
 * GET /api/billing/status
 * Get current subscription status
 */
router.get('/status', authMiddleware, async (req, res) => {
    try {
        const { data: org, error } = await supabase
            .from('organisations')
            .select('plan, subscription_status, trial_ends_at')
            .eq('id', req.user.org_id)
            .single();

        if (error) throw error;
        res.json(org);
    } catch (error) {
        console.error('Billing status error:', error);
        res.status(500).json({ error: 'Failed to fetch billing status' });
    }
});

/**
 * POST /api/billing/webhook
 * Stripe Webhook Handler. Note: Must be placed *before* global body parsers in server.js, 
 * or handled carefully with raw body here.
 */
// The route logic handles raw body which server.js sets up via express.raw
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Webhook signature verification failed.', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                const customerId = subscription.customer;
                const status = subscription.status;
                const priceId = subscription.items.data[0].price.id;
                
                // Map priceId back to plan name
                let planName = 'free';
                for (const [key, val] of Object.entries(plans)) {
                    if (val.stripe_price_id === priceId) {
                        planName = key;
                        break;
                    }
                }

                await supabase
                    .from('organisations')
                    .update({
                        subscription_status: status,
                        plan: planName,
                        stripe_subscription_id: subscription.id
                    })
                    .eq('stripe_customer_id', customerId);
                break;
            }
            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                const customerId = subscription.customer;
                
                await supabase
                    .from('organisations')
                    .update({
                        subscription_status: 'canceled',
                        plan: 'free'
                    })
                    .eq('stripe_customer_id', customerId);
                break;
            }
            case 'invoice.payment_succeeded':
            case 'invoice.payment_failed':
                // Handle payment failures/success notifications if needed
                break;
            default:
                console.log(`Unhandled event type ${event.type}`);
        }
        res.json({received: true});
    } catch (error) {
        console.error('Webhook handler error:', error);
        res.status(500).send('Webhook handler failed');
    }
});

module.exports = router;
