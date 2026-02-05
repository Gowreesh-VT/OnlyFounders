const http = require('http');
const https = require('https');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';

async function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const lib = urlObj.protocol === 'https:' ? https : http;
        
        const req = lib.request(url, {
            method: options.method || 'GET',
            headers: options.headers || {},
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                const cookies = res.headers['set-cookie'] || [];
                resolve({ 
                    status: res.statusCode, 
                    data: data ? JSON.parse(data) : null,
                    cookies 
                });
            });
        });
        
        req.on('error', reject);
        
        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

async function main() {
    console.log('🔐 Logging in as super admin...');
    
    // Login to get session cookie
    const loginRes = await makeRequest(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: 'admin@onlyfounders.com',
            password: 'Admin@123'
        })
    });
    
    if (loginRes.status !== 200) {
        console.error('❌ Login failed:', loginRes.data);
        process.exit(1);
    }
    
    console.log('✅ Login successful!');
    
    // Extract session cookie
    const sessionCookie = loginRes.cookies.find(c => c.startsWith('auth_session='));
    if (!sessionCookie) {
        console.error('❌ No session cookie received');
        process.exit(1);
    }
    
    const cookieValue = sessionCookie.split(';')[0];
    console.log('🍪 Got session cookie');
    
    // Read participants data
    const participantsData = JSON.parse(fs.readFileSync('./sample_participants.json', 'utf8'));
    console.log(`\n📦 Importing ${participantsData.participants.length} participant(s)...`);
    console.log('📧 Emails will be sent: ', participantsData.sendEmails ? 'Yes' : 'No');
    
    // Make bulk import request
    const importRes = await makeRequest(`${BASE_URL}/api/admin/bulk-import`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieValue
        },
        body: JSON.stringify(participantsData)
    });
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Bulk Import Results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (importRes.status === 200 || importRes.status === 201) {
        const { success, errors, summary } = importRes.data;
        
        if (success && success.length > 0) {
            console.log(`\n✅ Successfully imported ${success.length} participant(s):`);
            success.forEach(p => {
                console.log(`   📧 ${p.email}`);
                console.log(`      Name: ${p.fullName}`);
                console.log(`      Entity ID: ${p.entityId}`);
                console.log(`      Password: ${p.password}`);
                console.log(`      Team: ${p.teamName}`);
                console.log(`      College: ${p.collegeName}`);
                console.log('');
            });
        }
        
        if (errors && errors.length > 0) {
            console.log(`\n❌ Errors (${errors.length}):`);
            errors.forEach(e => {
                console.log(`   ${e.email}: ${e.error}`);
            });
        }
        
        if (summary) {
            console.log('\n📈 Summary:');
            console.log(`   Total processed: ${summary.total}`);
            console.log(`   Successful: ${summary.success}`);
            console.log(`   Failed: ${summary.errors}`);
        }
    } else {
        console.error('❌ Import failed:', importRes.data);
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
