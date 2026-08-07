/**
 * Middleware factory for Role-Based Access Control (RBAC).
 * Checks if the authenticated user has one of the required roles.
 * Must be used after authMiddleware.
 * 
 * @param {...string} roles - Allowed roles (e.g., 'owner', 'admin', 'analyst', 'viewer')
 * @returns {Function} Express middleware function
 */
const requireRole = (...roles) => {
    return (req, res, next) => {
      if (!req.user || !req.user.role) {
        return res.status(401).json({ error: 'User not authenticated or role missing' });
      }
  
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ 
          error: `Access denied. Requires one of the following roles: ${roles.join(', ')}. Your role is: ${req.user.role}` 
        });
      }
  
      next();
    };
  };
  
  module.exports = { requireRole };
  
