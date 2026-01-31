import { create } from 'zustand';
import { CartItem, Product } from '@/lib/types';

interface AppState {
    // Global
    restaurantId: string | null;
    setRestaurantId: (id: string) => void;

    // Cart (Waiter)
    cart: CartItem[];
    addToCart: (product: Product) => void;
    removeFromCart: (cartId: string) => void;
    updateCartItemNote: (cartId: string, note: string) => void;
    clearCart: () => void;

    // UI
    isCartOpen: boolean;
    toggleCart: () => void;
}

export const useStore = create<AppState>((set) => ({
    restaurantId: 'demo-restaurant-1', // Default for MVP
    setRestaurantId: (id) => set({ restaurantId: id }),

    cart: [],
    addToCart: (product) => set((state) => {
        // Check if same product exists? 
        // Usually for restaurants, we want distinct regular items if they have notes, 
        // but if no notes, maybe merge? 
        // For MVP, simplistic: Always add new line item to allow specific notes per item.
        const newItem: CartItem = {
            ...product,
            cartId: crypto.randomUUID(),
            quantity: 1, // Default to 1
            note: '',
            // These will be mapped to OrderItem later, but good to have structure
        };
        return { cart: [...state.cart, newItem] };
    }),
    removeFromCart: (cartId) => set((state) => ({
        cart: state.cart.filter((item) => item.cartId !== cartId)
    })),
    updateCartItemNote: (cartId, note) => set((state) => ({
        cart: state.cart.map((item) =>
            item.cartId === cartId ? { ...item, note } : item
        )
    })),
    clearCart: () => set({ cart: [] }),

    isCartOpen: false,
    toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),
}));
