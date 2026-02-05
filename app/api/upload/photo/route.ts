import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb/connection';
import { User } from '@/lib/mongodb/models';
import { getSession } from '@/lib/mongodb/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// Allowed MIME types for photos
const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif'
];

// File magic bytes for validation
const FILE_SIGNATURES: Record<string, number[][]> = {
    'image/jpeg': [[0xFF, 0xD8, 0xFF]],
    'image/jpg': [[0xFF, 0xD8, 0xFF]],
    'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
    'image/webp': [[0x52, 0x49, 0x46, 0x46]],
    'image/gif': [[0x47, 0x49, 0x46, 0x38]]
};

// Maximum file size: 1.2MB
const MAX_FILE_SIZE = 1.2 * 1024 * 1024;

function validateFileMagicBytes(buffer: ArrayBuffer, mimeType: string): boolean {
    const uint8Array = new Uint8Array(buffer);
    const signatures = FILE_SIGNATURES[mimeType];
    
    if (!signatures) return false;
    
    return signatures.some(signature => 
        signature.every((byte, index) => uint8Array[index] === byte)
    );
}

function sanitizeFilename(filename: string): string {
    return filename
        .replace(/[\/\\:*?"<>|]/g, '')
        .replace(/\.\./g, '')
        .trim();
}

export async function POST(request: NextRequest) {
    try {
        await connectDB();
        
        // Verify user is authenticated
        const session = await getSession();
        if (!session) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        // Parse multipart form data
        const formData = await request.formData();
        const file = (formData.get('photo') || formData.get('file')) as File | null;
        
        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: 'File size exceeds maximum limit of 1.2MB' },
                { status: 400 }
            );
        }

        // Validate MIME type
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: 'Invalid file type. Allowed types: JPEG, PNG, WebP, GIF' },
                { status: 400 }
            );
        }

        // Validate file magic bytes
        const fileBuffer = await file.arrayBuffer();
        if (!validateFileMagicBytes(fileBuffer, file.type)) {
            return NextResponse.json(
                { error: 'File content does not match declared type' },
                { status: 400 }
            );
        }

        // Generate safe filename
        const sanitizedName = sanitizeFilename(file.name);
        const fileExtension = sanitizedName.split('.').pop()?.toLowerCase() || 'jpg';
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
        
        if (!allowedExtensions.includes(fileExtension)) {
            return NextResponse.json(
                { error: 'Invalid file extension' },
                { status: 400 }
            );
        }

        // Create unique filename
        const uniqueId = crypto.randomBytes(8).toString('hex');
        const fileName = `${session.userId}_${uniqueId}.${fileExtension}`;
        
        // Save to public/uploads directory
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'photos');
        await mkdir(uploadsDir, { recursive: true });
        
        const filePath = path.join(uploadsDir, fileName);
        await writeFile(filePath, Buffer.from(fileBuffer));
        
        // Generate public URL
        const photoUrl = `/uploads/photos/${fileName}`;

        // Update user profile
        await User.findByIdAndUpdate(session.userId, {
            photoUrl,
            photoUploadedAt: new Date()
        });

        return NextResponse.json({
            success: true,
            photoUrl
        });

    } catch (error: any) {
        console.error('Photo upload error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
