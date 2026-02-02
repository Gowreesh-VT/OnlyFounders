import { createAnonClient, createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

function generateMemberId(collegeName: string): string {
    const collegeCode = collegeName
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 4);
    const year = new Date().getFullYear().toString().slice(-2);
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `OF-${collegeCode}-${year}-${randomNum}`;
}

export async function POST(request: NextRequest) {
    try {
        const { email, password, fullName, collegeId, phoneNumber } = await request.json();

        if (!email || !password || !fullName || !collegeId || !phoneNumber) {
            return NextResponse.json(
                { error: 'All fields are required' },
                { status: 400 }
            );
        }

        const supabase = await createAnonClient();
        const supabaseAdmin = createAdminClient();

        // Get college name for member ID
        const { data: college } = await supabaseAdmin
            .from('colleges')
            .select('name')
            .eq('id', collegeId)
            .single();

        if (!college) {
            return NextResponse.json(
                { error: 'College not found' },
                { status: 400 }
            );
        }

        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        });

        if (authError) {
            return NextResponse.json(
                { error: authError.message },
                { status: 400 }
            );
        }

        if (!authData.user) {
            return NextResponse.json(
                { error: 'Failed to create user' },
                { status: 500 }
            );
        }

        const memberId = generateMemberId(college.name);

        // Create profile using service role (bypasses RLS)
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: authData.user.id,
                email,
                full_name: fullName,
                college_id: collegeId,
                member_id: memberId,
                role: 'student',
                phone_number: phoneNumber,
            })
            .select(`
        *,
        college:colleges(*)
      `)
            .single();

        if (profileError) {
            console.error('Profile creation error:', profileError);
            return NextResponse.json(
                { error: 'Failed to create profile' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            user: {
                id: authData.user.id,
                email: authData.user.email,
                profile,
                team: null,
            },
            session: authData.session,
        });
    } catch (error) {
        console.error('Register error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
