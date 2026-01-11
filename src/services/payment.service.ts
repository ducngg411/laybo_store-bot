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
     * Handles both formats: ORD_XXXXXXXX and ORDXXXXXXXX
     * 
     * Priority:
     * 1. payload.code (if not null)
     * 2. Regex from content field
     * 3. Regex from description field
     */
    private extractPaymentRef(payload: SepayWebhookPayload): string | null {
        // Priority 1: Explicit code field (if not null/empty)
        if (payload.code && payload.code.trim().length > 0) {
            logger.debug({ code: payload.code }, 'Using code field from webhook');
            return payload.code.trim();
        }

        // Priority 2: Extract from content field
        if (payload.content) {
            // Match pattern: ORD followed by alphanumeric (at least 8 chars total)
            // Supports both ORD_ABC12345 and ORDABC12345 formats
            const match = payload.content.match(/ORD[_]?[A-Z0-9]{7,}/);
            if (match) {
                logger.debug(
                    { content: payload.content, extracted: match[0] },
                    'Extracted payment ref from content field'
                );
                return match[0];
            }
        }

        // Priority 3: Extract from description field (fallback)
        if (payload.description) {
            const match = payload.description.match(/ORD[_]?[A-Z0-9]{7,}/);
            if (match) {
                logger.debug(
                    { description: payload.description, extracted: match[0] },
                    'Extracted payment ref from description field'
                );
                return match[0];
            }
        }

        logger.warn(
            {
                code: payload.code,
                content: payload.content,
                description: payload.description
            },
            'Could not extract payment reference from SePay webhook'
        );
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
            // Find items that were reserved for this order (by productId and RESERVED status)
            const items = await inventoryRepository.findReservedByProduct(
                (order as OrderWithProduct).product.id,
                order.expiresAt!
            );
            if (items.length > 0) {
                await inventoryRepository.markAsSold(
                    items.map((i) => i.id),
                    order.id
                );
                logger.info({ orderId: order.id, itemCount: items.length }, 'Inventory marked as sold');
            } else {
                logger.warn({ orderId: order.id, productId: (order as OrderWithProduct).product.id }, 'No reserved items found to mark as sold');
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
