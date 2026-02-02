"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Loader2, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email) {
            setError('Please enter your email address');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Failed to send reset email');
                return;
            }

            setSuccess(true);
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

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
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                                <CheckCircle className="w-8 h-8 text-green-500" />
                            </div>
                            <h2 className="text-xl font-semibold text-white mb-2">Check Your Email</h2>
                            <p className="text-gray-400 text-sm mb-6">
                                We've sent a password reset link to <span className="text-white">{email}</span>
                            </p>
                            <Link
                                href="/auth/login"
                                className="inline-flex items-center text-primary hover:text-primary-hover transition-colors text-sm"
                            >
                                <ArrowLeft className="w-4 h-4 mr-1" />
                                Back to Login
                            </Link>
                        </div>
                    ) : (
                        /* Form State */
                        <>
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-light text-white mb-2">
                                    Forgot Password?
                                </h2>
                                <p className="text-gray-500 text-sm">
                                    Enter your email and we'll send you a reset link
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Error Message */}
                                {error && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                        <p className="text-red-400 text-sm text-center">{error}</p>
                                    </div>
                                )}

                                {/* Email Input */}
                                <div>
                                    <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="you@example.com"
                                            className="w-full bg-[#0A0A0A] border-b-2 border-[#2A2A2A] text-white py-3 pl-10 focus:outline-none focus:border-primary transition-colors"
                                        />
                                        <Mail className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
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
                                            Sending...
                                        </>
                                    ) : (
                                        'Send Reset Link'
                                    )}
                                </button>
                            </form>

                            {/* Back to Login */}
                            <div className="mt-6 text-center">
                                <Link
                                    href="/auth/login"
                                    className="inline-flex items-center text-gray-400 hover:text-white transition-colors text-sm"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-1" />
                                    Back to Login
                                </Link>
                            </div>
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
        </div>
    );
}
