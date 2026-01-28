export type Role = 'owner' | 'admin' | 'waiter' | 'kitchen';

export interface Restaurant {
    id: string;
    name: string;
    ownerId: string;
    createdAt: number;
    // Settings
    currency: string;
    logoUrl?: string;
}

export interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
    role: Role;
    restaurantId: string;
}

export type Category = 'Entradas' | 'Fondos' | 'Bebidas' | 'Postres' | 'Otros';

export interface Product {
    id: string;
    restaurantId: string;
    name: string;
    price: number;
    category: Category;
    imageUrl?: string;
    active: boolean;
    description?: string;
}

export interface CartItem extends Product {
    cartId: string; // Unique ID for the item in cart (to handle same product multiple times)
    quantity: number; // Usually 1 for individual notes, but could be >1
    note?: string;
}

export type OrderStatus = 'pending' | 'cooking' | 'ready' | 'delivered';

export interface OrderItem {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    note?: string;
}

export interface Order {
    id: string;
    restaurantId: string;
    tableId: string;
    tableNumber: string;
    items: OrderItem[];
    status: OrderStatus;
    total: number;
    createdAt: number; // Timestamp
    updatedAt: number;
}

export type TableStatus = 'free' | 'occupied' | 'paying';

export interface Table {
    id: string;
    restaurantId: string;
    number: string; // e.g., "1", "A1"
    status: TableStatus;
    currentOrderId?: string;
}
