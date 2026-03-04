
const bcrypt = require('bcryptjs');

(async () => {
  const password = 'admin123';
  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(password, salt);
  console.log('✅ New hashed password:', hashed);
})();