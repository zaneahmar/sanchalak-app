const { masterPool } = require('./tenantDb');

// Export masterPool for backward compatibility and user_master table access
module.exports = masterPool;
