#!/usr/bin/env node

/**
 * Script to test SePay webhook locally
 * Usage: 
 *   node test-webhook.js <orderId> <amount> [--null-code]
 * 
 * Examples:
 *   node test-webhook.js ORDHHKVWELJ 140000
 *   node test-webhook.js ORDHHKVWELJ 140000 --null-code  (test with code=null)
 */

const http = require('http');

const orderId = process.argv[2] || 'ORDHHKVWELJ';
const amount = parseInt(process.argv[3] || '140000', 10);
const testCodeNull = process.argv[4] === '--null-code'; // Test with code=null

// SePay webhook format (based on real implementation)
const payload = {
  id: `TXN_${Date.now()}`, // Transaction ID
  referenceCode: `REF_${Date.now()}`, // Alternative transaction ID
  transferAmount: amount, // Số tiền chuyển
  content: `${orderId} FT${Date.now()}`, // Nội dung chuyển khoản (order code ở đầu)
  description: `Payment for order ${orderId}`, // Mô tả
  code: testCodeNull ? null : orderId, // Mã đơn hàng (có thể null như SePay thực tế)
  gateway: 'MB', // Ngân hàng (MB, VCB, TCB, etc.)
  transactionDate: new Date().toISOString(), // Ngày giao dịch
  transferType: 'in', // 'in' = tiền vào, 'out' = tiền ra
};

const data = JSON.stringify(payload);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/webhooks/sepay',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
  },
};

console.log('🧪 Testing webhook with payload:');
console.log(JSON.stringify(payload, null, 2));
console.log('\n📡 Sending request to http://localhost:3000/webhooks/sepay ...\n');

const req = http.request(options, (res) => {
  console.log(`✅ Status Code: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);

  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    console.log('\n📦 Response Body:');
    try {
      console.log(JSON.stringify(JSON.parse(body), null, 2));
    } catch (e) {
      console.log(body);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
  console.log('\n💡 Make sure the server is running: npm run dev');
});

req.write(data);
req.end();
