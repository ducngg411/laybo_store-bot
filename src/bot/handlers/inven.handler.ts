import { Context } from 'telegraf';
import { orderRepository } from '../../db/repositories/order.repository';
import { OrderStatus } from '@prisma/client';

export async function handleInventoryCommand(ctx: Context) {
    try {
        // Lấy tất cả đơn hàng đã hoàn thành
        const orders = await orderRepository.findAllCompleted();

        if (orders.length === 0) {
            await ctx.reply('📦 Chưa có đơn hàng nào được hoàn thành.');
            return;
        }

        // Tạo thông điệp hiển thị danh sách đơn hàng
        let message = '📊 *DANH SÁCH ĐƠN HÀNG ĐÃ BÁN*\n\n';

        let totalRevenue = 0;
        orders.forEach((order, index) => {
            const createdDate = new Date(order.createdAt).toLocaleString('vi-VN');
            const userName = order.username || 'N/A';
            const productName = order.product?.name || 'Unknown';
            const variantName = order.variant?.name || '';
            const price = order.totalVnd;
            const quantity = order.quantity;
            const status = order.status === OrderStatus.FULFILLED ? '✅' :
                order.status === OrderStatus.CANCELLED ? '❌' : '⏳';

            totalRevenue += price;

            message += `${index + 1}. ${status} *${productName}* ${variantName ? `(${variantName})` : ''}\n`;
            message += `   👤 ${userName}\n`;
            message += `   💰 ${price.toLocaleString('vi-VN')}đ (SL: ${quantity})\n`;
            message += `   📅 ${createdDate}\n\n`;
        });

        message += `━━━━━━━━━━━━━━━━━━\n`;
        message += `💵 *Tổng doanh thu:* ${totalRevenue.toLocaleString('vi-VN')}đ\n`;
        message += `📦 *Tổng đơn hàng:* ${orders.length}`;

        await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Error in handleInventoryCommand:', error);
        await ctx.reply('❌ Có lỗi xảy ra khi lấy danh sách đơn hàng.');
    }
}
