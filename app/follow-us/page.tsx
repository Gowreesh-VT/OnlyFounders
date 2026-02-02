"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function FollowUsPage() {
    const socialLinks = [
        {
            name: "OnlyFounders",
            username: "@onlyfounders__",
            url: "https://www.instagram.com/onlyfounders__",
            image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1974&auto=format&fit=crop", // Placeholder or dynamic image
        },
        {
            name: "Microsoft Innovations Club",
            username: "@microsoft.innovations.vitc",
            url: "https://www.instagram.com/microsoft.innovations.vitc",
            image: "https://images.unsplash.com/photo-1611262588024-d12430b98920?q=80&w=1974&auto=format&fit=crop",
        },
        {
            name: "Yuva VIT Chennai",
            username: "@yuva_vitcc",
            url: "https://www.instagram.com/yuva_vitcc",
            image: "https://images.unsplash.com/photo-1611262588024-d12430b98920?q=80&w=1974&auto=format&fit=crop",
        },
    ];

    return (
        <div className="min-h-screen bg-[#0A0A0A] flex flex-col relative overflow-hidden font-sans text-gray-100">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div
                    className="absolute top-0 right-0 w-full h-2/3 bg-cover bg-center opacity-10 mix-blend-color-dodge"
                    style={{ backgroundImage: "url('https://images.unsplash.com/photo-1516912481808-3406841bd33c?q=80&w=2444&auto=format&fit=crop')" }}
                />
                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A] to-transparent z-10" />
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#0A0A0A]/80 via-transparent to-[#0A0A0A] z-10" />
                <div className="absolute top-1/4 left-0 w-64 h-64 bg-red-900/20 rounded-full blur-3xl" />
            </div>

            <div className="fixed top-6 left-6 z-50">
                <Link href="/" className="inline-flex items-center text-sm text-gray-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    BACK TO HOME
                </Link>
            </div>

            <main className="relative z-20 flex-grow flex flex-col items-center justify-center px-6 py-12 w-full max-w-md mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-3xl font-light text-white mb-2">Connect <span className="text-primary font-normal">With Us</span></h1>
                    <p className="text-gray-500 text-xs tracking-widest uppercase">Stay Updated With The Latest</p>
                </div>

                {/* Social Links */}
                <div className="w-full space-y-4">
                    {socialLinks.map((link) => (
                        <a
                            key={link.username}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group block relative overflow-hidden bg-[#1A1A1A] border border-[#2A2A2A] hover:border-primary/50 rounded-sm p-4 transition-all duration-300 hover:transform hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(255,215,0,0.1)]"
                        >
                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center">
                                        <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-white group-hover:text-primary transition-colors">{link.name}</h3>
                                        <p className="text-xs text-gray-500">{link.username}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
                        </a>
                    ))}
                </div>

                {/* Footer */}
                <div className="mt-12 text-center text-[10px] text-gray-600 tracking-widest uppercase">
                    © 2026 OnlyFounders
                </div>
            </main>

            {/* Decorative Elements */}
            <div className="fixed top-4 left-4 z-50 hidden sm:block">
                <div className="h-1 w-1 bg-primary rounded-full animate-pulse shadow-[0_0_10px_#FFD700]" />
            </div>
            <div className="fixed top-4 right-4 z-50 hidden sm:block">
                <div className="h-1 w-1 bg-primary rounded-full animate-pulse shadow-[0_0_10px_#FFD700]" />
            </div>
            <div className="fixed bottom-4 left-4 z-50 hidden sm:block">
                <div className="h-1 w-1 bg-primary rounded-full animate-pulse shadow-[0_0_10px_#FFD700]" />
            </div>
            <div className="fixed bottom-4 right-4 z-50 hidden sm:block">
                <div className="h-1 w-1 bg-primary rounded-full animate-pulse shadow-[0_0_10px_#FFD700]" />
            </div>
        </div>
    );
}
