"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import PhotoUploadModal from './PhotoUploadModal';

interface PhotoUploadContextType {
    showUploadModal: boolean;
    setShowUploadModal: (show: boolean) => void;
}

const PhotoUploadContext = createContext<PhotoUploadContextType>({
    showUploadModal: false,
    setShowUploadModal: () => {},
});

export const usePhotoUpload = () => useContext(PhotoUploadContext);

export default function PhotoUploadProvider({ children }: { children: React.ReactNode }) {
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const checkingRef = useRef(false); // Prevent multiple simultaneous checks

    const checkPhotoStatus = useCallback(async () => {
        // Prevent multiple simultaneous checks
        if (checkingRef.current) return;
        
        checkingRef.current = true;
        try {
            const supabase = createClient();
            
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setUserProfile(null);
                setShowUploadModal(false);
                setLoading(false);
                return;
            }

            const { data: profile, error } = await supabase
                .from('profiles')
                .select('id, full_name, photo_url, role')
                .eq('id', user.id)
                .single();

            if (error) {
                console.error('Error fetching profile:', error);
                setLoading(false);
                return;
            }

            if (profile) {
                setUserProfile(profile);
                
                // Show modal if photo not uploaded and user is participant or team_lead
                const shouldShowModal = !profile.photo_url && ['participant', 'team_lead'].includes(profile.role);
                setShowUploadModal(shouldShowModal);
            }
        } catch (error) {
            console.error('Error checking photo status:', error);
        } finally {
            setLoading(false);
            checkingRef.current = false;
        }
    }, []);

    useEffect(() => {
        const supabase = createClient();
        
        // Initial check
        checkPhotoStatus();

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                setLoading(true);
                checkPhotoStatus();
            } else if (event === 'SIGNED_OUT') {
                setUserProfile(null);
                setShowUploadModal(false);
                setLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [checkPhotoStatus]);

    const handleModalClose = useCallback(() => {
        setShowUploadModal(false);
        // Refresh profile to update photo status
        setLoading(true);
        checkPhotoStatus();
    }, [checkPhotoStatus]);

    return (
        <PhotoUploadContext.Provider value={{ showUploadModal, setShowUploadModal }}>
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
