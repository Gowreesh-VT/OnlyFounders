"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Copy, ChevronDown, Users, Sparkles, Loader2 } from "lucide-react";
import StudentBottomNav from "../../components/StudentBottomNav";

interface College {
  id: string;
  name: string;
}

export default function TeamCreatePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    teamName: "",
    collegeId: "",
    size: "4",
    track: "FinTech & Digital Payments",
  });
  const [colleges, setColleges] = useState<College[]>([]);
  const [isCreated, setIsCreated] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [showInstitutions, setShowInstitutions] = useState(false);
  const [showSize, setShowSize] = useState(false);
  const [showTrack, setShowTrack] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const sizes = ["4", "5", "6"];
  const tracks = [
    "FinTech & Digital Payments",
    "AI, Automation & Digital Media",
    "Gaming & Entertainment Tech",
    "Digital Health & Wellness Tech",
    "EdTech & Learning Automation",
  ];

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
    if (!formData.teamName || !formData.collegeId) {
      setError("Please fill in all required fields");
      setTimeout(() => setError(""), 3000);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamName: formData.teamName,
          collegeId: formData.collegeId,
          size: parseInt(formData.size),
          track: formData.track,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create team');
        return;
      }

      setGeneratedCode(data.team.displayCode);
      setIsCreated(true);
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Create team error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode.replace("-", ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedCollege = colleges.find(c => c.id === formData.collegeId);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center px-4 relative overflow-hidden">
      {/* Background Effects - Landing Page Style */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div
          className="absolute top-0 right-0 w-full h-2/3 bg-cover bg-center opacity-10 mix-blend-color-dodge"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1516912481808-3406841bd33c?q=80&w=2444&auto=format&fit=crop')" }}
        />
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A] to-transparent z-10" />
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#0A0A0A]/80 via-transparent to-[#0A0A0A] z-10" />
        <div className="absolute top-1/4 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-0 w-48 h-48 bg-green-500/10 rounded-full blur-3xl" />
      </div>

      {/* Logo */}
      <section className="mt-14 flex flex-col items-center relative z-20">
        <img src="/only-founders-logo.png" alt="OnlyFounders Logo" className="mx-auto h-20 w-auto" />
      </section>

      {/* Heading */}
      <section className="mt-12 text-center relative z-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 border border-primary/30 mb-4 shadow-[0_0_30px_rgba(255,215,0,0.15)]">
          <Users className="w-8 h-8 text-primary" />
        </div>
        <h2 className="font-serif text-3xl font-bold text-white">
          Create Your <span className="text-primary">Team</span>
        </h2>
        <p className="mt-4 text-gray-400 text-sm leading-relaxed max-w-sm mx-auto">
          Assemble your squad and begin your startup journey at OnlyFounders.
        </p>
      </section>

      {error && (
        <div className="w-full max-w-md relative z-20 mt-6 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm text-center animate-pulse">
          {error}
        </div>
      )}

      <div className="w-full max-w-md relative z-20 mt-10">
        {/* Form Card */}
        {!isCreated && (
          <section className="glass-panel border border-[#2A2A2A] rounded-xl">
            {/* Gold strip */}
            <div className="h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />

            <div className="p-6">
              {/* Team Name */}
              <div className="mb-5">
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2">
                  Team Name *
                </label>
                <input
                  type="text"
                  placeholder="Name your squad"
                  value={formData.teamName}
                  onChange={(e) => handleChange("teamName", e.target.value)}
                  className="w-full bg-[#0A0A0A] border-b-2 border-[#262626] text-white placeholder-gray-600 py-3 px-1 focus:outline-none focus:border-primary transition-colors text-sm"
                />
              </div>

              {/* Institution Dropdown */}
              <div className="mb-5 relative">
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2">
                  Institution *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowInstitutions(!showInstitutions);
                    setShowSize(false);
                    setShowTrack(false);
                  }}
                  className="w-full bg-[#0A0A0A] border-b-2 border-[#262626] text-left py-3 px-1 flex items-center justify-between focus:outline-none hover:border-primary/50 transition-colors"
                >
                  <span className={selectedCollege ? "text-white text-sm" : "text-gray-600 text-sm"}>
                    {selectedCollege?.name || "Select your college"}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showInstitutions ? "rotate-180" : ""}`} />
                </button>

                {showInstitutions && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#1A1A1A] border border-[#262626] rounded-lg shadow-xl max-h-48 overflow-y-auto z-[60]">
                    {colleges.map((college) => (
                      <button
                        key={college.id}
                        type="button"
                        onClick={() => {
                          handleChange("collegeId", college.id);
                          setShowInstitutions(false);
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-[#262626] hover:text-primary transition-colors"
                      >
                        {college.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Size and Track Row */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Size Dropdown */}
                <div className="relative">
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2">
                    Size
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSize(!showSize);
                      setShowInstitutions(false);
                      setShowTrack(false);
                    }}
                    className="w-full bg-[#0A0A0A] border-b-2 border-[#262626] text-left py-3 px-1 flex items-center justify-between focus:outline-none hover:border-primary/50 transition-colors"
                  >
                    <span className="text-white text-sm">{formData.size} members</span>
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showSize ? "rotate-180" : ""}`} />
                  </button>

                  {showSize && (
                    <div className="absolute bottom-full mb-1 left-0 right-0 bg-[#1A1A1A] border border-[#262626] rounded-lg shadow-xl z-[60] max-h-60 overflow-y-auto">
                      {sizes.map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            handleChange("size", size);
                            setShowSize(false);
                          }}
                          className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-[#262626] hover:text-primary transition-colors"
                        >
                          {size} members
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Track Dropdown */}
                <div className="relative">
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2">
                    Track
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowTrack(!showTrack);
                      setShowInstitutions(false);
                      setShowSize(false);
                    }}
                    className="w-full bg-[#0A0A0A] border-b-2 border-[#262626] text-left py-3 px-1 flex items-center justify-between focus:outline-none hover:border-primary/50 transition-colors"
                  >
                    <span className="text-white text-sm">{formData.track}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showTrack ? "rotate-180" : ""}`} />
                  </button>

                  {showTrack && (
                    <div className="absolute bottom-full mb-1 left-0 right-0 bg-[#1A1A1A] border border-[#262626] rounded-lg shadow-xl z-[60] max-h-60 overflow-y-auto">
                      {tracks.map((track) => (
                        <button
                          key={track}
                          type="button"
                          onClick={() => {
                            handleChange("track", track);
                            setShowTrack(false);
                          }}
                          className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-[#262626] hover:text-primary transition-colors"
                        >
                          {track}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Generate Code Button */}
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="group relative w-full overflow-hidden bg-primary hover:bg-primary-hover text-black font-semibold py-4 transition-all duration-300 transform hover:scale-[1.02] shadow-[0_0_20px_rgba(255,215,0,0.15)] hover:shadow-[0_0_30px_rgba(255,215,0,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="relative z-10 flex items-center justify-center tracking-widest uppercase text-sm">
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Generate Code
                      <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
                <div className="absolute inset-0 h-full w-full scale-0 transition-all duration-300 group-hover:scale-100 group-hover:bg-white/20" />
              </button>
            </div>
          </section>
        )}

        {/* Success State */}
        {isCreated && (
          <section className="glass-panel border border-[#2A2A2A] rounded-xl overflow-hidden">
            {/* Gold strip */}
            <div className="h-[2px] bg-gradient-to-r from-transparent via-green-500 to-transparent" />

            <div className="p-8 text-center">
              {/* Checkmark */}
              <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                <Check className="w-8 h-8 text-green-500" />
              </div>

              {/* Title */}
              <h2 className="font-serif text-2xl font-bold text-white mb-2">
                Squad Formed!
              </h2>
              <p className="text-gray-500 text-sm mb-8">
                Share this access code with your team members.
              </p>

              {/* Code Display */}
              <button
                onClick={handleCopy}
                className="w-full border-2 border-primary/30 bg-[#0A0A0A] rounded-lg p-5 mb-4 flex items-center justify-center gap-4 hover:border-primary/50 transition-colors group"
              >
                <span className="font-mono text-4xl font-bold text-primary tracking-[0.2em]">
                  {generatedCode}
                </span>
                {copied ? (
                  <Check className="w-6 h-6 text-green-500" />
                ) : (
                  <Copy className="w-6 h-6 text-gray-500 group-hover:text-primary transition-colors" />
                )}
              </button>

              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-8">
                {copied ? "✓ Copied to clipboard!" : "Tap to copy code"}
              </p>

              {/* Continue Button */}
              <button
                onClick={() => window.location.href = "/dashboard"}
                className="w-full border border-[#262626] text-gray-400 font-semibold py-4 rounded-lg hover:border-primary hover:text-primary transition-colors text-sm uppercase tracking-wider"
              >
                Continue to Dashboard
              </button>
            </div>
          </section>
        )}

        {/* Alternative Link */}
        {!isCreated && (
          <section className="mt-10 text-center">
            <p className="text-gray-500 text-sm">
              Already have a code?
            </p>
            <Link
              href="/team/join"
              className="mt-1 inline-flex items-center text-primary hover:text-primary-hover transition-colors text-sm"
            >
              Join a Team instead
              <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </section>
        )}
      </div>

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
