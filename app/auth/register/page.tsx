"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ChevronDown, ArrowRight, Loader2 } from 'lucide-react';
import type { College } from '@/lib/types/database';

export default function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phoneNumber: '',
        password: '',
        confirmPassword: '',
        collegeId: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showInstitutions, setShowInstitutions] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [colleges, setColleges] = useState<College[]>([]);

    useEffect(() => {
        async function fetchColleges() {
            try {
                const response = await fetch('/api/colleges');
                const data = await response.json();
                if (data.colleges) {
                    setColleges(data.colleges);
                }
            } catch (err) {
                console.error('Failed to fetch colleges:', err);
            }
        }
        fetchColleges();
    }, []);

    const handleChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        setError('');

        if (!formData.fullName || !formData.email || !formData.phoneNumber || !formData.password || !formData.collegeId) {
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
                    collegeId: formData.collegeId,
                    phoneNumber: formData.phoneNumber,
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

    const selectedCollege = colleges.find(c => c.id === formData.collegeId);

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
                <div className="absolute top-1/4 right-0 w-64 h-64 bg-red-900/20 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md relative z-20">
                {/* Register Card */}
                <div className="glass-panel rounded-sm border border-[#2A2A2A] p-8 shadow-2xl">
                    {/* Gold accent line */}
                    <div className="h-[2px] bg-primary mb-8 -mt-8 -mx-8" />

                    {/* Logo */}
                    <div className="text-center mb-8">
                        <img src="/only-founders-logo.png" alt="OnlyFounders Logo" className="mx-auto h-20 w-auto" />
                    </div>

                    {/* Title */}
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-light text-white mb-2">
                            Create Account
                        </h2>
                        <p className="text-gray-500 text-xs tracking-widest uppercase">
                            Join The Exclusive Network
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <div className="space-y-5">
                        {/* Full Name Input */}
                        <div>
                            <input
                                type="text"
                                placeholder="FULL NAME"
                                value={formData.fullName}
                                onChange={(e) => handleChange('fullName', e.target.value)}
                                className="w-full bg-transparent border-b border-gray-700 text-white placeholder-gray-600 py-3 px-0 focus:outline-none focus:border-primary transition-colors text-sm tracking-wide"
                            />
                        </div>

                        {/* Email Input */}
                        <div>
                            <input
                                type="email"
                                placeholder="EMAIL ADDRESS"
                                value={formData.email}
                                onChange={(e) => handleChange('email', e.target.value)}
                                className="w-full bg-transparent border-b border-gray-700 text-white placeholder-gray-600 py-3 px-0 focus:outline-none focus:border-primary transition-colors text-sm tracking-wide"
                            />
                        </div>

                        {/* Phone Number Input */}
                        <div>
                            <input
                                type="tel"
                                placeholder="PHONE NUMBER"
                                value={formData.phoneNumber}
                                onChange={(e) => handleChange('phoneNumber', e.target.value)}
                                className="w-full bg-transparent border-b border-gray-700 text-white placeholder-gray-600 py-3 px-0 focus:outline-none focus:border-primary transition-colors text-sm tracking-wide"
                            />
                        </div>

                        {/* Institution Dropdown */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowInstitutions(!showInstitutions)}
                                className="w-full bg-transparent border-b border-gray-700 text-left py-3 px-0 pr-10 focus:outline-none focus:border-primary transition-colors text-sm tracking-wide flex items-center justify-between"
                            >
                                <span className={selectedCollege ? 'text-white' : 'text-gray-600'}>
                                    {selectedCollege?.name || 'SELECT INSTITUTION'}
                                </span>
                                <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${showInstitutions ? 'rotate-180' : ''}`} />
                            </button>

                            {showInstitutions && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-sm shadow-xl max-h-48 overflow-y-auto z-20">
                                    {colleges.map((college) => (
                                        <button
                                            key={college.id}
                                            type="button"
                                            onClick={() => {
                                                handleChange('collegeId', college.id);
                                                setShowInstitutions(false);
                                            }}
                                            className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-[#2A2A2A] hover:text-primary transition-colors"
                                        >
                                            {college.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Password Input */}
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="PASSWORD"
                                value={formData.password}
                                onChange={(e) => handleChange('password', e.target.value)}
                                className="w-full bg-transparent border-b border-gray-700 text-white placeholder-gray-600 py-3 px-0 pr-10 focus:outline-none focus:border-primary transition-colors text-sm tracking-wide"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400"
                            >
                                {showPassword ? (
                                    <EyeOff className="w-5 h-5" />
                                ) : (
                                    <Eye className="w-5 h-5" />
                                )}
                            </button>
                        </div>

                        {/* Confirm Password Input */}
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                placeholder="CONFIRM PASSWORD"
                                value={formData.confirmPassword}
                                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                                className="w-full bg-transparent border-b border-gray-700 text-white placeholder-gray-600 py-3 px-0 pr-10 focus:outline-none focus:border-primary transition-colors text-sm tracking-wide"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400"
                            >
                                {showConfirmPassword ? (
                                    <EyeOff className="w-5 h-5" />
                                ) : (
                                    <Eye className="w-5 h-5" />
                                )}
                            </button>
                        </div>

                        {/* Submit Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className="group relative w-full overflow-hidden bg-primary hover:bg-primary-hover text-black font-semibold py-4 transition-all duration-300 transform hover:scale-[1.02] shadow-[0_0_20px_rgba(255,215,0,0.15)] hover:shadow-[0_0_30px_rgba(255,215,0,0.3)] mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="relative z-10 flex items-center justify-center tracking-widest uppercase text-sm">
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        Create Account
                                        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </span>
                            <div className="absolute inset-0 h-full w-full scale-0 transition-all duration-300 group-hover:scale-100 group-hover:bg-white/20" />
                        </button>

                        {/* Footer Links */}
                        <div className="text-center text-xs text-gray-500 mt-6">
                            <span className="uppercase tracking-wide">Already a member?</span>
                            <Link
                                href="/auth/login"
                                className="ml-2 text-primary hover:text-primary-hover transition-colors uppercase tracking-wide"
                            >
                                Sign In
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Copyright */}
                <div className="text-center mt-6 text-xs text-gray-600 tracking-widest">
                    © 2026 ONLYFOUNDERS
                </div>
            </div>

            {/* Corner Decorative Dots */}
            <div className="fixed top-4 left-4 z-50">
                <div className="h-1 w-1 bg-primary rounded-full animate-pulse shadow-[0_0_10px_#FFD700]" />
            </div>
            <div className="fixed top-4 right-4 z-50">
                <div className="h-1 w-1 bg-primary rounded-full animate-pulse shadow-[0_0_10px_#FFD700]" />
            </div>
            <div className="fixed bottom-4 left-4 z-50">
                <div className="h-1 w-1 bg-primary rounded-full animate-pulse shadow-[0_0_10px_#FFD700]" />
            </div>
            <div className="fixed bottom-4 right-4 z-50">
                <div className="h-1 w-1 bg-primary rounded-full animate-pulse shadow-[0_0_10px_#FFD700]" />
            </div>
        </div>
    );
}
