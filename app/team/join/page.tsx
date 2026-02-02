"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, KeySquare, GraduationCap, Loader2 } from "lucide-react";
import StudentBottomNav from "../../components/StudentBottomNav";

export default function JoinTeamPage() {
  const router = useRouter();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newCode = [...code];
    newCode[index] = value.toUpperCase();
    setCode(newCode);
    setError("");

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSubmit = async () => {
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      setError("Please enter all 6 characters");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch('/api/teams/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: fullCode })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to join team');
        return;
      }

      // Success - redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center px-4 relative overflow-hidden">
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

      {/* Logo */}
      <section className="mt-14 flex flex-col items-center relative z-20 animate-fade-in-up">
        <img src="/only-founders-logo.png" alt="OnlyFounders Logo" className="mx-auto h-20 w-auto" />
      </section>

      {/* Heading */}
      <section className="mt-12 text-center relative z-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 border border-primary/30 mb-4">
          <KeySquare className="w-8 h-8 text-primary" />
        </div>
        <h2 className="font-serif text-3xl font-bold text-white">
          Join Your <span className="text-primary">Team</span>
        </h2>
        <p className="mt-4 text-gray-400 text-sm leading-relaxed max-w-sm mx-auto">
          Enter the exclusive 6-character access code provided by your squad leader.
        </p>
      </section>

      {/* Card */}
      <section className="mt-10 w-full max-w-md glass-panel border border-[#2A2A2A] rounded-sm overflow-hidden relative z-20">
        {/* Gold strip */}
        <div className="h-[2px] bg-primary" />

        <div className="px-6 py-8">
          {/* Code inputs */}
          <div className="flex justify-between gap-2 mb-8">
            {code.map((char, i) => (
              <input
                key={i}
                id={`code-${i}`}
                type="text"
                maxLength={1}
                value={char}
                onChange={(e) => handleCodeChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-12 h-14 bg-[#0A0A0A] border-b-2 border-[#2A2A2A] text-center text-xl font-semibold text-white focus:outline-none focus:border-primary transition-colors"
              />
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-[#2A2A2A] mb-6" />

          {/* Colleges */}
          <div className="flex items-center justify-center gap-3">
            <GraduationCap size={14} strokeWidth={2} className="text-primary" />
            <p className="text-[10px] text-gray-500 tracking-[0.3em] uppercase">
              IIT Delhi • BITS Pilani • IIT Bombay
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="group relative w-full overflow-hidden bg-primary hover:bg-primary-hover text-black font-semibold py-4 transition-all duration-300 transform hover:scale-[1.02] shadow-[0_0_20px_rgba(255,215,0,0.15)] hover:shadow-[0_0_30px_rgba(255,215,0,0.3)] mt-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <span className="relative z-10 flex items-center justify-center tracking-widest uppercase text-sm">
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Joining...
                </>
              ) : (
                <>
                  Join Team
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </span>
            <div className="absolute inset-0 h-full w-full scale-0 transition-all duration-300 group-hover:scale-100 group-hover:bg-white/20" />
          </button>
        </div>
      </section>

      {/* Alternative Link */}
      <section className="mt-10 text-center relative z-20">
        <p className="text-gray-500 text-sm">
          Starting a new venture?
        </p>
        <Link
          href="/team/create"
          className="mt-1 inline-flex items-center text-primary hover:text-primary-hover transition-colors text-sm"
        >
          Create a Team instead
          <ArrowRight className="ml-1 w-4 h-4" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="mt-auto w-full max-w-md pt-10 pb-28 flex items-center gap-3 text-xs text-gray-600 relative z-20">
        <span className="flex-1 border-t border-[#2A2A2A]" />
        <span className="tracking-widest">© 2026 ONLYFOUNDERS</span>
        <span className="flex-1 border-t border-[#2A2A2A]" />
      </footer>

      {/* Bottom Navigation */}
      <StudentBottomNav />
    </div>
  );
}
