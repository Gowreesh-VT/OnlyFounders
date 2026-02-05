const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function createSuperAdmin() {
    try {
        await mongoose.connect('mongodb+srv://gowreesh:qavbak-3geshu-vadVit@onlyfounders.newnnkk.mongodb.net/onlyfounders?appName=OnlyFounders&retryWrites=true&w=majority');
        
        const userSchema = new mongoose.Schema({
            email: String,
            password: String,
            fullName: String,
            role: String,
            loginCount: { type: Number, default: 0 },
            isActive: { type: Boolean, default: true }
        }, { timestamps: true });
        
        const User = mongoose.models.User || mongoose.model('User', userSchema);
        
        const hashedPassword = await bcrypt.hash('Admin@123', 12);
        
        await User.findOneAndUpdate(
            { email: 'admin@onlyfounders.com' },
            {
                email: 'admin@onlyfounders.com',
                password: hashedPassword,
                fullName: 'Super Admin',
                role: 'super_admin',
                isActive: true,
                loginCount: 0
            },
            { upsert: true, new: true }
        );
        
        console.log('\n✅ Super Admin created successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📧 Email: admin@onlyfounders.com');
        console.log('🔑 Password: Admin@123');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

createSuperAdmin();
