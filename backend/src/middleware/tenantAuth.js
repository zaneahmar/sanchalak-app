const jwt = require('jsonwebtoken');
const { masterPool, getTenantPool } = require('../config/tenantDb');

// Load environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

/**
 * Middleware to authenticate user using JWT and attach tenant database connection
 */
async function tenantAuth(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided'
      });
    }

    // Extract token from "Bearer <token>"
    const token = authHeader.replace('Bearer ', '');

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      // Check if token is expired
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Your Session is Expired Kindly Re-Login',
          code: 'TOKEN_EXPIRED'
        });
      }
      // For other JWT errors (invalid signature, malformed, etc.)
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    const userId = decoded.userId;

    // Get user from master database
    const result = await masterPool.query(
      'SELECT id, name, business_name, email, db_config, is_active FROM user_master WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'User account is not active'
      });
    }

    if (!user.db_config) {
      return res.status(500).json({
        success: false,
        message: 'User database configuration not found'
      });
    }

    // Get tenant database pool
    const dbConfig = typeof user.db_config === 'string' 
      ? JSON.parse(user.db_config) 
      : user.db_config;
    
    const tenantPool = getTenantPool(dbConfig);

    // Attach user info and tenant pool to request
    req.user = {
      id: user.id,
      name: user.name,
      business_name: user.business_name,
      email: user.email
    };
    req.tenantDb = tenantPool;

    next();
  } catch (error) {
    console.error('Tenant auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
}

module.exports = tenantAuth;
