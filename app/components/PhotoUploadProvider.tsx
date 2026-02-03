"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import PhotoUploadModal from './PhotoUploadModal';

interface UserProfile {
    id: string;
    full_name: string;
    photo_url: string | null;
    role: string;
}

interface PhotoUploadContextType {
    showUploadModal: boolean;
    setShowUploadModal: (show: boolean) => void;
    setProfileFromLogin: (profile: UserProfile) => void;
}

const PhotoUploadContext = createContext<PhotoUploadContextType>({
    showUploadModal: false,
    setShowUploadModal: () => {},
    setProfileFromLogin: () => {},
});

export const usePhotoUpload = () => useContext(PhotoUploadContext);

export default function PhotoUploadProvider({ children }: { children: React.ReactNode }) {
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const hasInitializedRef = useRef(false);

    // Called by login page with profile data - NO API CALLS NEEDED
    const setProfileFromLogin = useCallback((profile: UserProfile) => {
        setUserProfile(profile);
        
        // Show modal immediately if no photo and user is participant/team_lead
        const shouldShowModal = !profile.photo_url && ['participant', 'team_lead'].includes(profile.role);
        setShowUploadModal(shouldShowModal);
        setLoading(false);
        hasInitializedRef.current = true;
    }, []);

    // Only fetch profile on initial load (page refresh) when user is already logged in
    useEffect(() => {
        if (hasInitializedRef.current) return;

        const initializeFromSession = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                setLoading(false);
                hasInitializedRef.current = true;
                return;
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('id, full_name, photo_url, role')
                .eq('id', user.id)
                .single();

            if (profile) {
                setUserProfile(profile);
                const shouldShowModal = !profile.photo_url && ['participant', 'team_lead'].includes(profile.role);
                setShowUploadModal(shouldShowModal);
            }
            
            setLoading(false);
            hasInitializedRef.current = true;
        };

        initializeFromSession();

        // Listen for sign out
        const supabase = createClient();
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT') {
                setUserProfile(null);
                setShowUploadModal(false);
                hasInitializedRef.current = false;
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleModalClose = useCallback(() => {
        setShowUploadModal(false);
    }, []);

    return (
        <PhotoUploadContext.Provider value={{ showUploadModal, setShowUploadModal, setProfileFromLogin }}>
            {children}
            
            {!loading && userProfile && (
                <PhotoUploadModal
                    isOpen={showUploadModal}
                    onClose={handleModalClose}
                    userId={userProfile.id}
                    userName={userProfile.full_name}
                />
            )}
        </PhotoUploadContext.Provider>
    );
}
