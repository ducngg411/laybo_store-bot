import { z } from 'zod';

export const emailSchema = z
    .string()
    .email('Email không hợp lệ')
    .toLowerCase()
    .trim()
    .refine((email) => !email.includes(' '), 'Email không được chứa khoảng trắng');

export const emailListSchema = z
    .array(emailSchema)
    .min(1, 'Phải có ít nhất 1 email')
    .max(50, 'Tối đa 50 email');

export function validateEmailList(input: string, expectedCount: number): string[] {
    const lines = input
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    if (lines.length !== expectedCount) {
        throw new Error(
            `Số lượng email không khớp. Bạn đã nhập ${lines.length} email, cần ${expectedCount} email.`
        );
    }

    const emails: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const result = emailSchema.safeParse(lines[i]);
        if (!result.success) {
            errors.push(`Dòng ${i + 1}: ${result.error.errors[0].message}`);
        } else {
            emails.push(result.data);
        }
    }

    if (errors.length > 0) {
        throw new Error(`Email không hợp lệ:\n${errors.join('\n')}`);
    }

    // Check duplicates
    const uniqueEmails = new Set(emails);
    if (uniqueEmails.size !== emails.length) {
        throw new Error('Danh sách email có email trùng lặp. Vui lòng kiểm tra lại.');
    }

    return emails;
}

export function validateQuantity(input: string, min: number, max: number): number {
    const qty = parseInt(input, 10);
    if (isNaN(qty)) {
        throw new Error('Số lượng phải là số nguyên.');
    }
    if (qty < min || qty > max) {
        throw new Error(`Số lượng phải từ ${min} đến ${max}.`);
    }
    return qty;
}
