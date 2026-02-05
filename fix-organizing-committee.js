const mongoose = require('mongoose');

// Load env manually since dotenv may not be installed
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');
for (const line of envLines) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1]] = match[2];
  }
}

const MONGODB_URI = process.env.MONGODB_URI;

// User Schema
const userSchema = new mongoose.Schema({
  email: String,
  role: String
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function fixRoles() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Delete the organizing committee users so they can be re-imported
  const emails = [
    'superadmin@onlyfounders.com',
    'admin.mit@onlyfounders.com',
    'admin.nit@onlyfounders.com',
    'admin.rvce@onlyfounders.com',
    'gate.volunteer1@onlyfounders.com',
    'gate.volunteer2@onlyfounders.com',
    'coordinator@onlyfounders.com'
  ];

  for (const email of emails) {
    const result = await User.deleteOne({ email: email.toLowerCase() });
    console.log(`Deleted ${email}: ${result.deletedCount > 0 ? 'SUCCESS' : 'NOT FOUND'}`);
  }

  await mongoose.disconnect();
  console.log('\nDone! Now re-import using the bulk import API.');
}

fixRoles().catch(console.error);
