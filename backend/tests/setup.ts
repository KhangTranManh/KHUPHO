// Chạy trước mỗi file test, trước khi import code ứng dụng → env.ts đọc được các giá trị này.
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.JWT_ACCESS_SECRET = 'test-secret-'.padEnd(48, 'x');
// Giá trị giả để qua kiểm tra env; test kết nối tới MongoDB in-memory (tests/helpers/db.ts).
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/unused';
process.env.LOGIN_MAX_FAILED_ATTEMPTS = '3';
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
process.env.DATA_INDEX_KEY = 'test-index-key-'.padEnd(40, 'y');
process.env.FIREBASE_PROJECT_ID = 'khupho-test';
process.env.BCRYPT_COST = '4';
process.env.RATE_LIMIT_ENABLED ??= 'false'; // file test riêng bật lại (rateLimit.test.ts)
process.env.BANK_WEBHOOK_PROVIDER = 'sepay';
process.env.BANK_WEBHOOK_API_KEY = 'test-webhook-key-'.padEnd(32, 'z');
