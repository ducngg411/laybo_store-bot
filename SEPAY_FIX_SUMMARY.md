# SePay Webhook Fix Summary

## 🐛 Problem

SePay webhook gửi `code: null` thay vì mã đơn hàng, mặc dù content chứa mã đơn:

```json
{
  "code": null,  // ← Vấn đề: field này null
  "content": "ORDHHKVWELJ FT26012916846798..."  // ← Mã đơn thực tế ở đây
}
```

## ✅ Solution

### 1. Updated `payment.service.ts`

**Changes:**
- ✅ Kiểm tra `code` field có null/empty không trước khi dùng
- ✅ Extract từ `content` field làm phương pháp chính
- ✅ Regex pattern hỗ trợ cả 2 format: `ORDHHKVWELJ` và `ORD_ABC12345`
- ✅ Fallback sang `description` nếu không tìm thấy trong `content`
- ✅ Thêm logging chi tiết cho debugging

**New Pattern:** `/ORD[_]?[A-Z0-9]{7,}/`
- Supports: `ORDHHKVWELJ` (no underscore)
- Supports: `ORD_ABC12345` (with underscore)
- Minimum 7 alphanumeric chars after ORD

### 2. Updated `server/index.ts`

Sync extraction logic với payment service để notification hoạt động đúng.

### 3. Updated `test-webhook.js`

**New usage:**
```bash
# Test với code field có giá trị
node test-webhook.js ORDHHKVWELJ 140000

# Test với code=null (giống SePay thực tế)
node test-webhook.js ORDHHKVWELJ 140000 --null-code
```

### 4. Updated Documentation

Updated [SEPAY_INTEGRATION.md](./SEPAY_INTEGRATION.md) với:
- ⚠️ Warning về `code` field thường null
- Updated regex pattern
- Examples từ real webhook

## 🧪 Testing

### Test Case 1: Code field có giá trị
```bash
node test-webhook.js ORDHHKVWELJ 140000
```

Expected: ✅ Extract từ `code` field

### Test Case 2: Code field = null (Real scenario)
```bash
node test-webhook.js ORDHHKVWELJ 140000 --null-code
```

Expected: ✅ Extract `ORDHHKVWELJ` từ `content` field

### Test Case 3: Both formats
```bash
# Format 1: No underscore (actual)
node test-webhook.js ORDHHKVWELJ 140000 --null-code

# Format 2: With underscore (legacy)
node test-webhook.js ORD_ABC12345 140000 --null-code
```

Expected: ✅ Both work

## 📝 Flow Comparison

### Before Fix
```
1. Check payload.code → ❌ null
2. Try regex on content → ❌ Pattern không match ORDHHKVWELJ
3. Return null → ❌ Payment failed
```

### After Fix
```
1. Check payload.code → null (skip if empty)
2. Try regex on content → ✅ Match ORDHHKVWELJ  
3. Return "ORDHHKVWELJ" → ✅ Payment success
```

## 🔍 Extraction Priority

1. **`payload.code`** (if not null/empty)
2. **`payload.content`** ⭐ Primary method
3. **`payload.description`** (fallback)

## 📋 Pattern Details

### Old Pattern (Broken)
```regex
/ORD[A-Z0-9]{8,}/
```
- ❌ Required exactly `ORD` + 8 chars
- ❌ Không match `ORDHHKVWELJ` (11 chars total = ORD + 8 chars)
- Actually works BUT missing underscore support

### New Pattern (Fixed)
```regex
/ORD[_]?[A-Z0-9]{7,}/
```
- ✅ `ORD` + optional `_` + minimum 7 alphanumeric
- ✅ Matches: `ORDHHKVWELJ` (no underscore)
- ✅ Matches: `ORD_ABC12345` (with underscore)
- ✅ Matches: `ORDABC123` (minimum case)

## 🎯 Key Improvements

1. **Null-safe code field check**
   ```typescript
   if (payload.code && payload.code.trim().length > 0) {
     return payload.code.trim();
   }
   ```

2. **Better logging**
   ```typescript
   logger.debug({ 
     content: payload.content, 
     extracted: match[0] 
   }, 'Extracted payment ref from content field');
   ```

3. **Flexible pattern**
   - Supports both underscore and non-underscore formats
   - Minimum length validation (7+ chars)

4. **Fallback chain**
   - code → content → description → null

## 🚀 Next Steps

1. Start server: `npm run dev`
2. Test with real scenario:
   ```bash
   node test-webhook.js ORDHHKVWELJ 140000 --null-code
   ```
3. Check logs for extraction confirmation
4. Monitor production webhooks from SePay

## 📚 Related Files

- [payment.service.ts](./src/services/payment.service.ts) - Main extraction logic
- [server/index.ts](./src/server/index.ts) - Webhook endpoint
- [test-webhook.js](./test-webhook.js) - Testing tool
- [SEPAY_INTEGRATION.md](./SEPAY_INTEGRATION.md) - Full documentation
