"use client";

import { CacheProvider } from "@/lib/cache/CacheProvider";
import { PageTransitionProvider } from "@/lib/transitions/PageTransition";
import { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
    return (
        <CacheProvider>
            <PageTransitionProvider>
                {children}
            </PageTransitionProvider>
        </CacheProvider>
    );
}
