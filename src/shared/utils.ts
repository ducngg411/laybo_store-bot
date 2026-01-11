import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 8);

export function generatePaymentRef(orderId: string): string {
    // Extract last 10 chars and remove special characters
    const cleanId = orderId
        .slice(-10)  // Lấy 10 ký tự cuối
        .replace(/[^A-Z0-9]/gi, '')  // Bỏ hết ký tự đặc biệt
        .toUpperCase()
        .slice(-8);  // Chỉ lấy 8 ký tự

    return `ORD${cleanId}`;
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