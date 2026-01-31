'use client';

import { useRestaurant } from '@/hooks/useRestaurant';
import { useEffect } from 'react';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { restaurant } = useRestaurant();

    useEffect(() => {
        const root = document.documentElement;

        // Remove existing theme classes
        root.classList.remove('theme-light', 'theme-dark', 'theme-orange', 'theme-custom');

        // Apply new theme class if set, otherwise default to dark (which is base)
        // Always force dark theme as per user request
        root.classList.add('theme-dark');

    }, [restaurant?.theme]);

    return <>{children}</>;
}
