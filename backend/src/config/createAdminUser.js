const pool = require('./database');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createAdminUser() {
  console.log('\n=== Create Admin User ===\n');

  try {
    const name = await question('Enter admin name: ');
    const business_name = await question('Enter business name: ');
    const email = await question('Enter admin email: ');
    const password = await question('Enter admin password: ');
    const address = await question('Enter address (optional): ');
    const city = await question('Enter city (optional): ');
    const phone = await question('Enter phone (optional): ');
    const gstin = await question('Enter GSTIN (optional): ');

    // Validation
    if (!name || !business_name || !email || !password) {
      console.error('\n❌ Name, business name, email, and password are required!');
      rl.close();
      process.exit(1);
    }

    if (password.length < 6) {
      console.error('\n❌ Password must be at least 6 characters!');
      rl.close();
      process.exit(1);
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT * FROM user_master WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      console.error('\n❌ User with this email already exists!');
      rl.close();
      process.exit(1);
    }

    // Hash password
    console.log('\n⏳ Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert admin user
    console.log('⏳ Creating admin user...');
    const result = await pool.query(
      `INSERT INTO user_master 
        (name, business_name, password, address, city, phone, email, gstin, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING id, name, business_name, email, is_active, created_at`,
      [name, business_name, hashedPassword, address || null, city || null, phone || null, email, gstin || null, false]
    );

    const newUser = result.rows[0];

    console.log('\n✅ Admin user created successfully!\n');
    console.log('User Details:');
    console.log(`  ID: ${newUser.id}`);
    console.log(`  Name: ${newUser.name}`);
    console.log(`  Business Name: ${newUser.business_name || 'N/A'}`);
    console.log(`  Email: ${newUser.email}`);
    console.log(`  Active: ${newUser.is_active}`);
    console.log(`  Created: ${newUser.created_at}`);
    console.log('\nYou can now login with these credentials!\n');

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error creating admin user:', error.message);
    rl.close();
    process.exit(1);
  }
}

// Run the script
createAdminUser();
