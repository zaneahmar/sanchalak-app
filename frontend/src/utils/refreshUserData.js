// Utility script to refresh user data in localStorage
// Run this in browser console if you need to update user data without logging out

async function refreshUserData() {
  try {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      console.error('No auth token found. Please login first.');
      return;
    }

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    console.log('Current user data:', currentUser);

    // For now, since we don't have a refresh endpoint, suggest logout/login
    console.log('\n⚠️ To get updated user data with business_name:');
    console.log('1. Logout from the application');
    console.log('2. Login again');
    console.log('3. Your localStorage will be updated with the latest user data including business_name');
    
    console.log('\n💡 Alternative: Update localStorage manually by running:');
    console.log(`localStorage.setItem('user', JSON.stringify({
      ...${JSON.stringify(currentUser, null, 2)},
      business_name: 'Your Business Name Here'
    }))`);

  } catch (error) {
    console.error('Error:', error);
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { refreshUserData };
}
