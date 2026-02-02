"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, Loader2, CheckCircle, Lock } from 'lucide-react';

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        // We don't need to handle the code manually anymore because the
        // /api/auth/callback route handles the exchange and sets the session cookie.
        // We just need to wait for the user to be verified.
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);
        const supabase = createClient();

        try {
            // Update the user's password (requires active session from callback)
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) {
                throw updateError;
            }

            setSuccess(true);

            // Redirect after a delay
            setTimeout(() => {
                router.push('/auth/login');
            }, 3000);

        } catch (err: any) {
            console.error('Reset password error:', err);
            setError(err.message || 'Failed to update password. Please try sending the reset link again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md relative z-20">
            {/* Card */}
            <div className="glass-panel rounded-sm border border-[#2A2A2A] p-8 shadow-2xl">
                {/* Gold accent line */}
                <div className="h-[2px] bg-primary mb-8 -mt-8 -mx-8" />

                {/* Logo */}
                <div className="text-center mb-8">
                    <img src="/only-founders-logo.png" alt="OnlyFounders Logo" className="mx-auto h-20 w-auto" />
                </div>

                {success ? (
                    /* Success State */
                    <div className="text-center animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                            <CheckCircle className="w-8 h-8 text-green-500" />
                        </div>
                        <h2 className="text-xl font-semibold text-white mb-2">Password Reset!</h2>
                        <p className="text-gray-400 text-sm mb-6">
                            Your password has been successfully updated. Redirecting to login...
                        </p>
                        <Link
                            href="/auth/login"
                            className="inline-block px-6 py-2 bg-primary text-black font-semibold rounded hover:bg-primary-hover transition-colors text-sm"
                        >
                            Go to Login Now
                        </Link>
                    </div>
                ) : (
                    /* Form State */
                    <>
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-light text-white mb-2">
                                Set New Password
                            </h2>
                            <p className="text-gray-500 text-sm">
                                Choose a secure password for your account
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Error Message */}
                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                    <p className="text-red-400 text-sm text-center">{error}</p>
                                </div>
                            )}

                            {/* Password Input */}
                            <div>
                                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2">
                                    New Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Min. 6 characters"
                                        className="w-full bg-[#0A0A0A] border-b-2 border-[#2A2A2A] text-white py-3 pl-0 pr-10 focus:outline-none focus:border-primary transition-colors"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password Input */}
                            <div>
                                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Repeat password"
                                        className="w-full bg-[#0A0A0A] border-b-2 border-[#2A2A2A] text-white py-3 pl-0 pr-10 focus:outline-none focus:border-primary transition-colors"
                                    />
                                    <Lock className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-primary hover:bg-primary-hover text-black font-semibold py-4 transition-all duration-300 shadow-[0_0_20px_rgba(255,215,0,0.15)] hover:shadow-[0_0_30px_rgba(255,215,0,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    'Reset Password'
                                )}
                            </button>
                        </form>
                    </>
                )}
            </div>

            {/* Footer */}
            <div className="mt-6 text-center">
                <p className="text-[10px] text-gray-600 tracking-widest">
                    © 2026 ONLYFOUNDERS
                </p>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div
                    className="absolute top-0 right-0 w-full h-2/3 bg-cover bg-center opacity-10 mix-blend-color-dodge"
                    style={{ backgroundImage: "url('https://images.unsplash.com/photo-1516912481808-3406841bd33c?q=80&w=2444&auto=format&fit=crop')" }}
                />
                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A] to-transparent z-10" />
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#0A0A0A]/80 via-transparent to-[#0A0A0A] z-10" />
                <div className="absolute top-1/4 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
            </div>

            <Suspense fallback={
                <div className="flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            }>
                <ResetPasswordForm />
            </Suspense>
        </div>
    );
}
