const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2];
}

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI in .env.local');
  process.exit(1);
}

const userSchema = new mongoose.Schema({
  email: String,
  role: String,
  assignedClusterId: mongoose.Schema.Types.ObjectId
}, { collection: 'users' });

const clusterSchema = new mongoose.Schema({
  name: String
}, { collection: 'clusters' });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Cluster = mongoose.models.Cluster || mongoose.model('Cluster', clusterSchema);

async function run() {
  await mongoose.connect(MONGODB_URI);

  const user = await User.findOne({ email: 'admin.mit@onlyfounders.com' });
  if (!user) {
    console.error('MIT admin user not found');
    process.exit(1);
  }

  const cluster = await Cluster.findOne({ name: /alpha/i })
    || await Cluster.findOne({ name: /^cluster\s*a$/i })
    || await Cluster.findOne({ name: /cluster a/i });

  if (!cluster) {
    const all = await Cluster.find({}).select('name');
    console.error('Cluster Alpha not found. Available clusters:', all.map(c => c.name));
    process.exit(1);
  }

  user.assignedClusterId = cluster._id;
  user.role = user.role || 'admin';
  await user.save();

  console.log('Assigned MIT admin to cluster:', cluster.name, cluster._id.toString());

  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
