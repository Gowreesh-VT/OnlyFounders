"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, FileText } from "lucide-react";

const navItems = [
    { href: "/dashboard", icon: Home, label: "Home" },
    { href: "/team", icon: Users, label: "Team" },
    { href: "/submission", icon: FileText, label: "Submit" },
];

export default function StudentBottomNav() {
    const pathname = usePathname();

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#121212]/95 backdrop-blur-md border-t border-[#262626] pb-6 pt-3 px-6">
            <div className="flex justify-around items-center max-w-lg mx-auto">
                {navItems.map((item) => {
                    const isActive =
                        pathname === item.href ||
                        (item.label === "Home" && pathname === "/dashboard") ||
                        (item.label === "Team" && pathname.startsWith("/team"));

                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            className="flex flex-col items-center gap-1 group"
                        >
                            <item.icon
                                className={`w-6 h-6 transition-colors ${isActive ? "text-primary" : "text-gray-500 group-hover:text-gray-300"
                                    }`}
                            />
                            <span
                                className={`text-[9px] font-medium uppercase tracking-wider transition-colors ${isActive ? "text-primary" : "text-gray-500 group-hover:text-gray-300"
                                    }`}
                            >
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
