import nodemailer from 'nodemailer';

// Create reusable SMTP transporter
export const createEmailTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST!,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
            user: process.env.SMTP_USER!,
            pass: process.env.SMTP_PASSWORD!,
        },
    });
};

// Send login credentials email
export async function sendLoginCredentials(
    to: string,
    fullName: string,
    email: string,
    password: string,
    entityId?: string
) {
    const transporter = createEmailTransporter();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: 'Inter', Arial, sans-serif;
            background-color: #050505;
            color: #FFFFFF;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 40px auto;
            background: #121212;
            border: 1px solid #FFD700;
            padding: 40px;
        }
        .header {
            font-family: 'Playfair Display', serif;
            font-size: 32px;
            color: #FFD700;
            margin-bottom: 20px;
            text-align: center;
        }
        .subtitle {
            font-size: 16px;
            color: #A1A1AA;
            text-align: center;
            margin-bottom: 40px;
        }
        .credentials-box {
            background: #1A1A1A;
            border: 1px solid #FFD700;
            padding: 30px;
            margin: 30px 0;
        }
        .credential-row {
            margin: 15px 0;
        }
        .credential-label {
            color: #A1A1AA;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 5px;
        }
        .credential-value {
            color: #FFD700;
            font-size: 18px;
            font-family: 'JetBrains Mono', monospace;
            font-weight: bold;
        }
        .button {
            display: inline-block;
            background: #FFD700;
            color: #050505;
            padding: 15px 40px;
            text-decoration: none;
            font-weight: bold;
            margin: 20px 0;
            text-align: center;
        }
        .warning {
            background: #2A1A0A;
            border-left: 3px solid #FFD700;
            padding: 15px;
            margin: 20px 0;
            color: #FFD700;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #262626;
            color: #A1A1AA;
            font-size: 12px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header"></div>
        <div class="subtitle">Investment Simulation Event</div>
        
        <p>Dear ${fullName},</p>
        
        <p>Welcome to the OnlyFounders Investment Simulation! Your account has been created.</p>
        
        <div class="credentials-box">
            <div class="credential-row">
                <div class="credential-label">Login Email</div>
                <div class="credential-value">${email}</div>
            </div>
            <div class="credential-row">
                <div class="credential-label">Temporary Password</div>
                <div class="credential-value">${password}</div>
            </div>
            ${entityId ? `
            <div class="credential-row">
                <div class="credential-label">Entity ID</div>
                <div class="credential-value">${entityId}</div>
            </div>
            ` : ''}
        </div>
        
        <center>
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/login" class="button">
                LOGIN NOW
            </a>
        </center>
        
        <div class="warning">
            <strong>⚠️ Security Notice:</strong><br>
            Please change your password after first login. Keep your credentials secure and do not share them with anyone.
        </div>
        
        <h3 style="color: #FFD700;">Event Details:</h3>
        <ul style="color: #A1A1AA;">
            <li>You will receive ₹10,00,000 virtual capital</li>
            <li>Invest in other teams based on their pitch presentations</li>
            <li>Top team per cluster qualifies for the finals</li>
        </ul>
        
        <p>Download your E-ID after logging in for entry validation at the venue.</p>
        
        <div class="footer">
            © 2026 OnlyFounders - The Exclusive Network<br>
            This is an automated email. Please do not reply.
        </div>
    </div>
</body>
</html>
    `.trim();

    const mailOptions = {
        from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
        to,
        subject: 'OnlyFounders Event - Your Login Credentials',
        html: htmlContent,
        text: `
Dear ${fullName},

Welcome to OnlyFounders Investment Simulation Event!

Your Login Credentials:
-----------------------
Email: ${email}
Password: ${password}
${entityId ? `Entity ID: ${entityId}` : ''}

Login here: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/login

Please change your password after first login.

© 2026 OnlyFounders
        `.trim(),
    };

    return await transporter.sendMail(mailOptions);
}

// Send bulk credentials (for CSV upload)
export async function sendBulkCredentials(
    recipients: Array<{
        email: string;
        fullName: string;
        password: string;
        entityId?: string;
    }>
) {
    const results = {
        success: [] as string[],
        failed: [] as { email: string; error: string }[],
    };

    for (const recipient of recipients) {
        try {
            await sendLoginCredentials(
                recipient.email,
                recipient.fullName,
                recipient.email,
                recipient.password,
                recipient.entityId
            );
            results.success.push(recipient.email);
            // Rate limit to avoid SMTP throttling
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error: any) {
            results.failed.push({
                email: recipient.email,
                error: error.message,
            });
        }
    }

    return results;
}

// Generate secure random password
export function generateSecurePassword(length: number = 12): string {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghjkmnpqrstuvwxyz';
    const numbers = '23456789';
    const symbols = '@#$%&*';
    
    const allChars = uppercase + lowercase + numbers + symbols;
    
    let password = '';
    // Ensure at least one of each type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill the rest
    for (let i = password.length; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
}
