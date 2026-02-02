"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';

export default function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phoneNumber: '',
        password: '',
        confirmPassword: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        setError('');

        if (!formData.fullName || !formData.email || !formData.password) {
            setError('Please fill in all required fields');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    fullName: formData.fullName,
                    phoneNumber: formData.phoneNumber || null,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Registration failed');
                return;
            }

            router.push('/dashboard');
        } catch (err) {
            setError('An error occurred. Please try again.');
            console.error('Register error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-10">
                <div className="absolute top-20 left-20 w-96 h-96 bg-[#FFD700] rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#FFD700] rounded-full blur-3xl"></div>
            </div>

            {/* Main Card */}
            <div className="relative z-10 w-full max-w-md">
                <div className="bg-[#121212] border border-[#FFD700] p-8">
                    {/* Logo/Header */}
                    <div className="text-center mb-8">
                        <h1 className="font-display text-4xl text-[#FFD700] mb-2">OnlyFounders</h1>
                        <p className="text-[#A1A1AA] text-xs tracking-[0.2em] uppercase">
                            Investment Event Registration
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-[#DC2626]/10 border border-[#DC2626] text-[#DC2626] text-sm">
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <div className="space-y-6">
                        {/* Full Name */}
                        <div>
                            <label className="block text-[#A1A1AA] text-xs tracking-[0.1em] uppercase mb-2">
                                Full Name *
                            </label>
                            <input
                                type="text"
                                value={formData.fullName}
                                onChange={(e) => handleChange('fullName', e.target.value)}
                                className="w-full bg-[#1A1A1A] border border-[#262626] text-white p-3 focus:outline-none focus:border-[#FFD700] transition-colors"
                                placeholder="Enter your full name"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-[#A1A1AA] text-xs tracking-[0.1em] uppercase mb-2">
                                Email Address *
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleChange('email', e.target.value)}
                                className="w-full bg-[#1A1A1A] border border-[#262626] text-white p-3 focus:outline-none focus:border-[#FFD700] transition-colors"
                                placeholder="your.email@example.com"
                            />
                        </div>

                        {/* Phone Number */}
                        <div>
                            <label className="block text-[#A1A1AA] text-xs tracking-[0.1em] uppercase mb-2">
                                Phone Number (Optional)
                            </label>
                            <input
                                type="tel"
                                value={formData.phoneNumber}
                                onChange={(e) => handleChange('phoneNumber', e.target.value)}
                                className="w-full bg-[#1A1A1A] border border-[#262626] text-white p-3 focus:outline-none focus:border-[#FFD700] transition-colors"
                                placeholder="+91 XXXXX XXXXX"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-[#A1A1AA] text-xs tracking-[0.1em] uppercase mb-2">
                                Password *
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={(e) => handleChange('password', e.target.value)}
                                    className="w-full bg-[#1A1A1A] border border-[#262626] text-white p-3 pr-12 focus:outline-none focus:border-[#FFD700] transition-colors"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#FFD700]"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-[#A1A1AA] text-xs tracking-[0.1em] uppercase mb-2">
                                Confirm Password *
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={formData.confirmPassword}
                                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                                    className="w-full bg-[#1A1A1A] border border-[#262626] text-white p-3 pr-12 focus:outline-none focus:border-[#FFD700] transition-colors"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#FFD700]"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className="w-full bg-[#FFD700] hover:bg-[#B8960A] text-[#050505] font-bold py-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-[0.1em] text-sm"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Register
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>

                        {/* Footer Links */}
                        <div className="text-center pt-4 border-t border-[#262626]">
                            <p className="text-[#A1A1AA] text-sm">
                                Already have an account?{' '}
                                <Link href="/auth/login" className="text-[#FFD700] hover:text-[#B8960A] transition-colors">
                                    Sign In
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Copyright */}
                <p className="text-center text-[#A1A1AA] text-xs mt-6 tracking-[0.1em]">
                    © 2026 ONLYFOUNDERS - THE EXCLUSIVE NETWORK
                </p>
            </div>
        </div>
    );
}
