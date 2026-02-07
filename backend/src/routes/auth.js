const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const { masterPool, createTenantDatabase } = require('../config/tenantDb');

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Find user by email (username) - without is_active filter
    const result = await masterPool.query(
      'SELECT * FROM user_master WHERE email = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    const user = result.rows[0];

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Your account is not active yet. Please contact the admin.'
      });
    }

    // In a real application, create a JWT token here
    const token = `token_${user.id}_${Date.now()}`;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.name,
        email: user.email,
        name: user.name,
        business_name: user.business_name,
        address: user.address,
        city: user.city,
        phone: user.phone,
        gstin: user.gstin,
        db_config: user.db_config
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { name, business_name, password, address, city, phone, email, gstin, db_config } = req.body;

    // Validation
    if (!name || !business_name || !password || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name, business name, email, and password are required'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if user already exists
    const existingUser = await masterPool.query(
      'SELECT * FROM user_master WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create tenant database
    console.log(`[Auth] Creating database for business: ${business_name}`);
    let dbName, dbConfig;
    
    try {
      const result = await createTenantDatabase(business_name);
      dbName = result.dbName;
      dbConfig = result.dbConfig;
      console.log(`[Auth] Database created successfully: ${dbName}`);
    } catch (dbError) {
      console.error('[Auth] Failed to create tenant database:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create user database. Please try again or contact support.',
        error: dbError.message
      });
    }

    // Insert new user with db_config
    const result = await masterPool.query(
      `INSERT INTO user_master 
        (name, business_name, password, address, city, phone, email, gstin, db_config, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING id, name, business_name, email, address, city, phone, gstin, is_active, created_at`,
      [name, business_name, hashedPassword, address, city, phone, email, gstin, JSON.stringify(dbConfig), false]
    );

    const newUser = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'User registered successfully and database created.',
      user: {
        id: newUser.id,
        name: newUser.name,
        business_name: newUser.business_name,
        email: newUser.email,
        address: newUser.address,
        city: newUser.city,
        phone: newUser.phone,
        gstin: newUser.gstin,
        is_active: newUser.is_active,
        created_at: newUser.created_at,
        database: dbName
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// GST Verification endpoint
router.post('/verify-gst', async (req, res) => {
  try {
    const { gstin } = req.body;

    // Validation
    if (!gstin) {
      return res.status(400).json({
        success: false,
        message: 'GSTIN is required'
      });
    }

    // GST format validation
    // Format: 2 digits (state code) + 10 characters (PAN) + 1 character (entity number) + 1 character (Z) + 1 check digit
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    
    if (!gstRegex.test(gstin)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid GSTIN format. Expected format: 22AAAAA0000A1Z5'
      });
    }

    // Extract state code and validate
    const stateCode = gstin.substring(0, 2);
    const validStateCodes = [
      '01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
      '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
      '21', '22', '23', '24', '25', '26', '27', '28', '29', '30',
      '31', '32', '33', '34', '35', '36', '37', '38'
    ];

    if (!validStateCodes.includes(stateCode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid state code in GSTIN'
      });
    }

    // Extract PAN from GSTIN (positions 2-11)
    const panNumber = gstin.substring(2, 12);

    // Check if GSTIN already exists for another user
    const existingGst = await masterPool.query(
      'SELECT id, name, email FROM user_master WHERE gstin = $1',
      [gstin]
    );

    if (existingGst.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This GSTIN is already registered',
        existingUser: {
          name: existingGst.rows[0].name,
          email: existingGst.rows[0].email
        }
      });
    }

    // State code mapping
    const stateNames = {
      '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
      '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
      '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
      '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
      '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram',
      '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam',
      '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha',
      '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
      '25': 'Daman and Diu', '26': 'Dadra and Nagar Haveli', '27': 'Maharashtra',
      '28': 'Andhra Pradesh', '29': 'Karnataka', '30': 'Goa',
      '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu',
      '34': 'Puducherry', '35': 'Andaman and Nicobar Islands', '36': 'Telangana',
      '37': 'Andhra Pradesh', '38': 'Ladakh'
    };

    // In production, you would call the actual GST API here
    // For now, we return a successful validation with extracted information
    res.status(200).json({
      success: true,
      message: 'GSTIN format is valid',
      gstDetails: {
        gstin: gstin,
        stateCode: stateCode,
        stateName: stateNames[stateCode] || 'Unknown',
        panNumber: panNumber,
        verified: true
      }
    });

  } catch (error) {
    console.error('GST verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during GST verification'
    });
  }
});

// Get current user profile (refresh user data)
router.get('/profile', async (req, res) => {
  try {
    // In a real app, you would validate the token and get user ID from it
    // For now, we'll use a simple token format: token_userId_timestamp
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const tokenParts = token.split('_');
    if (tokenParts.length < 2) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format'
      });
    }

    const userId = tokenParts[1];

    // Get user details
    const result = await masterPool.query(
      'SELECT id, name, business_name, email, address, city, phone, gstin, is_active, db_config FROM user_master WHERE id = $1 AND is_active = true',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    const user = result.rows[0];

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        username: user.name,
        email: user.email,
        name: user.name,
        business_name: user.business_name,
        address: user.address,
        city: user.city,
        phone: user.phone,
        gstin: user.gstin,
        db_config: user.db_config
      }
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile'
    });
  }
});

// Update user profile endpoint
router.put('/update-profile', async (req, res) => {
  try {
    const { name, business_name, phone, address, city, gstin } = req.body;
    
    // Get user ID from token
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const tokenParts = token.split('_');
    if (tokenParts.length < 2) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format'
      });
    }

    const userId = tokenParts[1];

    // Validation
    if (!name || !business_name) {
      return res.status(400).json({
        success: false,
        message: 'Name and business name are required'
      });
    }

    // Phone validation if provided
    if (phone && !/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Phone must be 10 digits'
      });
    }

    // GSTIN validation if provided
    if (gstin) {
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRegex.test(gstin)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid GSTIN format'
        });
      }

      // Check if GSTIN already exists for another user
      const existingGst = await masterPool.query(
        'SELECT id FROM user_master WHERE gstin = $1 AND id != $2',
        [gstin, userId]
      );

      if (existingGst.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'This GSTIN is already registered with another account'
        });
      }
    }

    // Update user profile
    const result = await masterPool.query(
      `UPDATE user_master 
       SET name = $1, business_name = $2, phone = $3, address = $4, city = $5, gstin = $6
       WHERE id = $7 AND is_active = true
       RETURNING id, name, business_name, email, address, city, phone, gstin, db_config`,
      [name, business_name, phone, address, city, gstin, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    const updatedUser = result.rows[0];

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.name,
        email: updatedUser.email,
        name: updatedUser.name,
        business_name: updatedUser.business_name,
        address: updatedUser.address,
        city: updatedUser.city,
        phone: updatedUser.phone,
        gstin: updatedUser.gstin,
        db_config: updatedUser.db_config
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating profile'
    });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logout successful'
  });
});

module.exports = router;
