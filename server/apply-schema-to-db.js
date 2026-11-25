import 'dotenv/config';
import { prisma } from './db/prisma.js';

async function applyDdl() {
  console.log('Connecting to PostgreSQL to apply Phase 8 columns and tables...');
  try {
    // 1. Invoices columns
    await prisma.$executeRawUnsafe(`
      ALTER TABLE invoices 
      ADD COLUMN IF NOT EXISTS "razorpayOrderId" TEXT,
      ADD COLUMN IF NOT EXISTS "razorpayPaymentId" TEXT,
      ADD COLUMN IF NOT EXISTS "razorpaySignature" TEXT,
      ADD COLUMN IF NOT EXISTS "refundId" TEXT,
      ADD COLUMN IF NOT EXISTS "refundStatus" TEXT;
    `);
    console.log('✅ Invoices table columns added/verified.');

    // 2. payment_transactions table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id TEXT PRIMARY KEY,
        "invoiceId" TEXT NOT NULL,
        "requestId" TEXT NOT NULL,
        gateway TEXT NOT NULL DEFAULT 'RAZORPAY',
        "orderId" TEXT NOT NULL,
        "paymentId" TEXT,
        "amountPaise" INTEGER NOT NULL,
        currency TEXT NOT NULL DEFAULT 'INR',
        status TEXT NOT NULL,
        "signatureVerified" BOOLEAN NOT NULL DEFAULT false,
        "idempotencyKey" TEXT UNIQUE NOT NULL,
        "errorDescription" TEXT,
        "refundId" TEXT,
        metadata TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ payment_transactions table created/verified.');

    // 3. external_notifications table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS external_notifications (
        id TEXT PRIMARY KEY,
        channel TEXT NOT NULL,
        recipient TEXT NOT NULL,
        "recipientRole" TEXT NOT NULL,
        event TEXT NOT NULL,
        "templateId" TEXT NOT NULL,
        status TEXT NOT NULL,
        "providerId" TEXT,
        attempts INTEGER NOT NULL DEFAULT 1,
        error TEXT,
        "requestId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ external_notifications table created/verified.');

    // 4. storage_files table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS storage_files (
        id TEXT PRIMARY KEY,
        bucket TEXT NOT NULL,
        "filePath" TEXT UNIQUE NOT NULL,
        "fileName" TEXT NOT NULL,
        "mimeType" TEXT NOT NULL,
        "fileSizeBytes" INTEGER NOT NULL,
        "uploadedBy" TEXT NOT NULL,
        "userRole" TEXT NOT NULL,
        "requestId" TEXT,
        "fileCategory" TEXT NOT NULL,
        "isPublic" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ storage_files table created/verified.');

    console.log('🎉 All Phase 8 DDL migrations applied successfully to Supabase PostgreSQL!');
    process.exit(0);
  } catch (err) {
    console.error('❌ DDL Error:', err.message);
    process.exit(1);
  }
}

applyDdl();
