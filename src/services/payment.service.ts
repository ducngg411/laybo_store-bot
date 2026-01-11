import { OrderStatus, ProductType } from '@prisma/client';
import { orderRepository } from '../db/repositories/order.repository';
import { paymentEventRepository } from '../db/repositories/payment.repository';
import { inventoryRepository } from '../db/repositories/inventory.repository';
import { logger } from '../shared/logger';
import { config } from '../shared/config';
import crypto from 'crypto';

export interface SepayWebhookPayload {
    // Transaction info
    id?: string; // Transaction ID
    referenceCode?: string; // Alternative transaction ID

    // Amount
    transferAmount: number; // Số tiền chuyển

    // Order info
    content?: string; // Nội dung chuyển khoản (chứa mã đơn, VD: "Thanh toan ORD_ABC123...")
    description?: string; // Mô tả (alternative)
    code?: string; // Mã đơn hàng (nếu có sẵn)

    // Bank info
    gateway?: string; // Mã ngân hàng (MB, VCB, etc.)

    // Date
    transactionDate?: string; // Ngày giao dịch

    // Transfer type
    transferType?: 'in' | 'out'; // 'in' = tiền vào, 'out' = tiền ra
}

export class PaymentService {
    /**
     * Generate event key for idempotency
     * Uses SePay transaction ID (id or referenceCode)
     */
    private generateEventKey(payload: SepayWebhookPayload): string {
        const transactionId = payload.id || payload.referenceCode;
        if (transactionId) {
            return `sepay_${transactionId}`;
        }

        const hash = crypto
            .createHash('sha256')
            .update(JSON.stringify(payload))
            .digest('hex')
            .slice(0, 16);
        return `sepay_${hash}`;
    }

    /**
     * Extract payment reference from webhook payload
     * Format: ORDXXXXXXXX (no underscore)
     */
    private extractPaymentRef(payload: SepayWebhookPayload): string | null {
        // Priority 1: Explicit code field
        if (payload.code) {
            return payload.code;
        }

        // Priority 2: Extract from content or description
        const content = payload.content || payload.description || '';

        // Match pattern: ORDXXXXXXXX (at least 8 chars after ORD)
        const match = content.match(/ORD[A-Z0-9]{8,}/);
        if (match) {
            return match[0];
        }

        logger.warn({ payload }, 'Could not extract payment reference from SePay webhook');
        return null;
    }

    /**
     * Process SePay webhook
     * Returns true if processed, false if duplicate/ignored
     */
    async processWebhook(payload: SepayWebhookPayload): Promise<boolean> {
        // Validate transferType (must be 'in' - incoming transfer)
        if (payload.transferType && payload.transferType !== 'in') {
            logger.warn(
                { transferType: payload.transferType },
                'Invalid transfer type - only incoming transfers accepted'
            );
            return false;
        }

        const eventKey = this.generateEventKey(payload);
        const paymentRef = this.extractPaymentRef(payload);

        if (!paymentRef) {
            logger.warn({ payload }, 'No payment reference in webhook');
            return false;
        }

        // Find order
        const order = await orderRepository.findByPaymentRef(paymentRef);
        if (!order) {
            logger.warn({ paymentRef }, 'Order not found for payment reference');
            return false;
        }

        // Type assertion: we know order includes product from repository
        type OrderWithProduct = typeof order & { product: { type: ProductType } };

        // Check if already processed (idempotency)
        const { created } = await paymentEventRepository.createIfNotExists({
            order: { connect: { id: order.id } },
            provider: 'SEPAY',
            eventKey,
            raw: payload as any,
        });

        if (!created) {
            logger.info({ eventKey, orderId: order.id }, 'Duplicate webhook ignored');
            return false;
        }

        // Check if order is in valid state
        if (order.status !== OrderStatus.PENDING_PAYMENT) {
            logger.info(
                { orderId: order.id, status: order.status },
                'Order not in PENDING_PAYMENT status, ignoring webhook'
            );
            return false;
        }

        // Validate amount
        const paidAmount = payload.transferAmount || 0;
        if (paidAmount < order.totalVnd) {
            logger.warn(
                {
                    orderId: order.id,
                    paymentRef,
                    expected: order.totalVnd,
                    received: paidAmount,
                    difference: order.totalVnd - paidAmount,
                },
                'Payment amount insufficient'
            );
            // Still process but log the discrepancy
        }

        // Update order to PAID
        await orderRepository.updateStatus(order.id, OrderStatus.PAID);

        // For DIGITAL_GOOD, mark inventory as sold
        if ((order as OrderWithProduct).product.type === ProductType.DIGITAL_GOOD) {
            const items = await inventoryRepository.findByOrder(order.id);
            if (items.length > 0) {
                await inventoryRepository.markAsSold(
                    items.map((i) => i.id),
                    order.id
                );
            }
        }

        logger.info(
            {
                orderId: order.id,
                paymentRef,
                transactionId: payload.id || payload.referenceCode,
                amount: paidAmount,
                gateway: payload.gateway,
                transactionDate: payload.transactionDate,
            },
            'Payment processed successfully'
        );

        return true;
    }

    /**
     * Generate QR code for payment
     * Uses VietQR API with account info from .env
     */
    async generateQRCode(paymentRef: string, amount: number): Promise<string> {
        // Use config from .env
        const baseUrl = 'https://img.vietqr.io/image';
        const bankId = config.sepay.bankCode;
        const accountNo = config.sepay.accountNumber;
        const template = config.sepay.template;
        const accountName = encodeURIComponent(config.sepay.accountName);

        const qrUrl = `${baseUrl}/${bankId}-${accountNo}-${template}.jpg?amount=${amount}&addInfo=${paymentRef}&accountName=${accountName}`;

        logger.info({ paymentRef, amount, bankId, accountNo, qrUrl }, 'QR code generated');
        return qrUrl;
    }
}

export const paymentService = new PaymentService();
