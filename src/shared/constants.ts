export const PRODUCT_CODES = {
    CANVA: 'CANVA',
    NETFLIX: 'NETFLIX',
} as const;

export const VARIANT_CODES = {
    CANVA_1M: 'CANVA_1M',
    CANVA_3M: 'CANVA_3M',
    CANVA_6M: 'CANVA_6M',
    CANVA_12M: 'CANVA_12M',
    NETFLIX_1M: 'NETFLIX_1M',
} as const;

export const ORDER_STATUSES = {
    DRAFT: 'DRAFT',
    PENDING_PAYMENT: 'PENDING_PAYMENT',
    PAID: 'PAID',
    IN_PROGRESS: 'IN_PROGRESS',
    FULFILLED: 'FULFILLED',
    FAILED: 'FAILED',
    CANCELLED: 'CANCELLED',
    EXPIRED: 'EXPIRED',
} as const;

export const ACTIVE_ORDER_STATUSES = [
    'DRAFT',
    'PENDING_PAYMENT',
    'PAID',
    'IN_PROGRESS',
] as const;

export const BOT_COMMANDS = {
    START: 'start',
    HELP: 'help',
    CANCEL: 'cancel',
} as const;

export const CALLBACK_ACTIONS = {
    // Main menu
    SELECT_CANVA: 'select_canva',
    SELECT_NETFLIX: 'select_netflix',
    SUPPORT: 'support',
    REFRESH_INVENTORY: 'refresh_inventory',

    // Canva flow
    CANVA_PLAN_PREFIX: 'canva_plan_',
    CANVA_QTY_PREFIX: 'canva_qty_',
    CANVA_QTY_CUSTOM: 'canva_qty_custom',
    CANVA_GO_BACK_TO_MAIN: 'canva_back_main',
    CANVA_GO_BACK_TO_PLANS: 'canva_back_plans',
    CANVA_GO_BACK_TO_QUANTITY: 'canva_back_qty',

    // Netflix flow
    NETFLIX_PLAN_PREFIX: 'netflix_plan_',
    NETFLIX_QTY_PREFIX: 'netflix_qty_',
    NETFLIX_QTY_CUSTOM: 'netflix_qty_custom',
    NETFLIX_QTY_MAX: 'netflix_qty_max', // ⭐ NEW: Mua tối đa
    NETFLIX_GO_BACK_TO_MAIN: 'netflix_back_main', // ⭐ Quay lại menu chính
    NETFLIX_GO_BACK_TO_PLANS: 'netflix_back_plans', // ⭐ Quay lại chọn plan

    // Order actions
    VIEW_QR: 'view_qr',
    CANCEL_ORDER: 'cancel_order',
    CONFIRM_PAYMENT: 'confirm_payment',
    BUY_MORE: 'buy_more', // ⭐ Mua thêm
    BACK_TO_MAIN: 'back_to_main', // ⭐ Menu chính

    // Admin actions
    ADMIN_IN_PROGRESS: 'admin_in_progress_',
    ADMIN_FULFILLED: 'admin_fulfilled_',
    ADMIN_FAILED: 'admin_failed_',

    // Copy actions (Netflix)
    COPY_USERNAME: 'copy_username_',
    COPY_PASSWORD: 'copy_password_',
} as const;

export const BOT_MESSAGES = {
    WELCOME: '🎉 *Chào mừng bạn đến với LayBo Store!*\n\nBạn muốn mua gì hôm nay?',
    SUPPORT: '💬 *Hỗ trợ*\n\nNếu bạn cần hỗ trợ, vui lòng liên hệ admin: @ducngg411',

    ORDER_EXISTS: (orderId: string, status: string) =>
        `⚠️ Bạn đang có đơn hàng *#${orderId}* với trạng thái *${status}*.\n\nVui lòng hoàn tất hoặc huỷ đơn hiện tại trước khi tạo đơn mới.`,

    ORDER_CANCELLED_MESSAGE: '❌ *Đơn hàng này đã bị huỷ*',
    ORDER_CANCELLED_CONFIRMATION:
        '✅ *Huỷ đơn thành công!*\n\n' +
        'Bạn có thể tạo đơn mới bất cứ lúc nào.\n\n' +
        '👉 Gõ /start để mua lại\n' +
        '📩 Cần hỗ trợ? Liên hệ admin @ducngg411',

    ORDER_EXPIRED_MESSAGE: '⏰ *Đơn hàng này đã hết hạn thanh toán*',
    ORDER_EXPIRED_NOTIFICATION:
        '⏰ *Đơn hàng đã hết hạn*\n\n' +
        'Đơn hàng của bạn đã quá thời gian thanh toán.\n\n' +
        '👉 Gõ /start để tạo đơn mới\n' +
        '📩 Cần hỗ trợ? Liên hệ admin @ducngg411',

    PAYMENT_SUCCESS: '✅ *Thanh toán thành công!*\n\nĐang xử lý đơn hàng của bạn. Vui lòng đợi 2-3 phút.\n\n⏳ Nếu sau 15 phút chưa nhận được phản hồi, vui lòng liên hệ admin @ducngg411',

    ORDER_FULFILLED: (emails: string[]) =>
        `🎉 *Đơn hàng đã hoàn thành!*\n\n✅ Các email sau đã được nâng cấp thành công:\n${emails.map((e) => `• ${e}`).join('\n')}\n\n📧 Vui lòng kiểm tra hòm thư và xác nhận để hoàn tất nâng cấp.`,

    ORDER_FAILED: '❌ *Đơn hàng thất bại*\n\nRất tiếc, đơn hàng của bạn không thể hoàn thành.\n\nVui lòng liên hệ admin @ducngg411 để được hoàn 100% tiền.',

    NETFLIX_DELIVERED: (accounts: Array<{ username: string; password: string; expiryDate: string }>) => {
        let msg = '🎉 *Đơn hàng Netflix đã hoàn thành!*\n\n';
        accounts.forEach((acc, idx) => {
            msg += `📺 *Tài khoản ${idx + 1}:*\n`;
            msg += `👤 Username: \`${acc.username}\`\n`;
            msg += `🔑 Password: \`${acc.password}\`\n`;
            msg += `⏰ Hạn dùng: ${acc.expiryDate}\n\n`;
        });
        msg += '💡 Nhấn vào để copy, hoặc dùng nút bên dưới.';
        return msg;
    },

    // ⭐ NEW: Insufficient stock messages
    NETFLIX_INSUFFICIENT_STOCK: (requestedQty: number, availableQty: number) =>
        `⚠️ *Không đủ hàng*\n\n` +
        `🎬 Netflix Premium 4K hiện còn: *${availableQty} tài khoản*.\n` +
        `Bạn vừa chọn: *${requestedQty}*.\n\n` +
        `Vui lòng chọn số lượng mới:`,

    NETFLIX_INVALID_QUANTITY: (min: number, max: number) =>
        `⚠️ *Số lượng không hợp lệ.*\n\n` +
        `Vui lòng nhập số từ *${min}* đến *${max}*.`,
} as const;

export const LIMITS = {
    EMAIL_MIN: 1,
    EMAIL_MAX: 50,
    NETFLIX_QTY_MIN: 1,
    NETFLIX_QTY_MAX: 100,
} as const;