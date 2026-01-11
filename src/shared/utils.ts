import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 8);

export function generatePaymentRef(orderId: string): string {
    // Extract last 8 chars of order ID or generate random
    const shortId = orderId.slice(-8).toUpperCase();
    return `ORD${shortId}`; // No underscore for easier typing
}

export function generateOrderId(): string {
    return nanoid();
}

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(amount);
}

export function calculateExpiryDate(minutes: number): Date {
    return new Date(Date.now() + minutes * 60 * 1000);
}

export function truncateString(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + '...';
}
