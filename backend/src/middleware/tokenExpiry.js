const jwt = require('jsonwebtoken');

// Load environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

/**
 * Middleware to check if JWT token is expired
 * Extracts and validates the token, returns appropriate error if expired
 */
function tokenExpiry(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided',
        code: 'NO_TOKEN'
      });
    }

    // Extract token from "Bearer <token>"
    const token = authHeader.replace('Bearer ', '');

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      console.log('Token is valid. Decoded data:', decoded);
      // Attach decoded token info to request for use in subsequent middleware/routes
      req.tokenData = decoded;
      next();
    } catch (err) {
      // Check if token is expired
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Your session has expired. Please log in again.',
          code: 'TOKEN_EXPIRED',
          expiryDate: err.expiredAt
        });
      }
      
      // For other JWT errors (invalid signature, malformed, etc.)
      if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Token verification failed',
        code: 'TOKEN_VERIFICATION_FAILED'
      });
    }
  } catch (error) {
    console.error('Token expiry check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying token',
      code: 'VERIFICATION_ERROR'
    });
  }
}

module.exports = tokenExpiry;
