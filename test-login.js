const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function testLogin() {
    await mongoose.connect('mongodb+srv://gowreesh:qavbak-3geshu-vadVit@onlyfounders.newnnkk.mongodb.net/onlyfounders?appName=OnlyFounders&retryWrites=true&w=majority');
    
    const userSchema = new mongoose.Schema({
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true },
        fullName: { type: String, required: true, trim: true },
        role: { type: String },
        loginCount: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true }
    }, { timestamps: true });
    
    const User = mongoose.models.User || mongoose.model('User', userSchema);
    
    const email = 'admin@onlyfounders.com';
    console.log('Searching for:', email.toLowerCase());
    
    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
    console.log('Found user:', user ? 'Yes' : 'No');
    
    if (user) {
        console.log('User email:', user.email);
        console.log('User role:', user.role);
        console.log('User isActive:', user.isActive);
        
        const isValid = await bcrypt.compare('Admin@123', user.password);
        console.log('Password matches:', isValid);
    }
    
    await mongoose.disconnect();
    process.exit(0);
}
testLogin().catch(console.error);
