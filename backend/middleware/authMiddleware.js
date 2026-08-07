const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Middleware to authenticate requests using Supabase JWT.
 * Verifies the token and attaches user information to req.user.
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token structure using JWT_SECRET if using custom JWT, 
    // or rely on Supabase getUser if token is from Supabase Auth.
    // Assuming Supabase auth token here:
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Fetch user details from custom users table
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, email, role, org_id, preferred_currency')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return res.status(403).json({ error: 'User profile not found or access denied' });
    }

    req.user = {
      id: userProfile.id,
      email: userProfile.email,
      role: userProfile.role,
      org_id: userProfile.org_id,
      preferred_currency: userProfile.preferred_currency,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

module.exports = authMiddleware;
