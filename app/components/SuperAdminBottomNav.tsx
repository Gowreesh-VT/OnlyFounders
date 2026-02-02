"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, UserPlus, Shield } from "lucide-react";

const navItems = [
    { href: "/super-admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/super-admin/colleges", icon: Building2, label: "Colleges" },
    { href: "/super-admin/colleges/create", icon: UserPlus, label: "Onboard" },
];

export default function SuperAdminBottomNav() {
    const pathname = usePathname();

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#121212]/95 backdrop-blur-md border-t border-[#262626] pb-6 pt-3 px-6">
            <div className="flex justify-between items-center max-w-lg mx-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href ||
                        (item.label === "Dashboard" && pathname === "/super-admin/dashboard") ||
                        (item.label === "Colleges" && pathname === "/super-admin/colleges") ||
                        (item.label === "Onboard" && pathname === "/super-admin/colleges/create");

                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            className="flex flex-col items-center gap-1 group w-16"
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
