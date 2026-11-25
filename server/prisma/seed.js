import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { INITIAL_USERS, INITIAL_TECHNICIANS, SERVICE_CATEGORIES } from '../mockData.js';

const prisma = new PrismaClient();

export async function runDatabaseSeed() {
  console.log('[Seed] 🚀 Initiating idempotent seed for ResQDispatch database...');

  try {
    // 1. Seed Service Categories
    console.log('[Seed] Seeding service categories...');
    for (const cat of SERVICE_CATEGORIES) {
      await prisma.serviceCategory.upsert({
        where: { id: cat.id },
        update: {
          name: cat.name,
          icon: cat.icon,
          slaTargetMin: cat.slaTargetMin,
          commonIssues: cat.commonIssues,
          defaultPriority: cat.defaultPriority,
          description: cat.description
        },
        create: {
          id: cat.id,
          name: cat.name,
          icon: cat.icon,
          slaTargetMin: cat.slaTargetMin,
          commonIssues: cat.commonIssues,
          defaultPriority: cat.defaultPriority,
          description: cat.description
        }
      });
    }
    console.log(`[Seed] ✅ Seeded ${SERVICE_CATEGORIES.length} Service Categories.`);

    // 2. Seed Customer Users
    console.log('[Seed] Seeding customer accounts with hashed credentials...');
    const customerUser = INITIAL_USERS.find((u) => u.role === 'customer');
    if (customerUser) {
      const hashedCustPassword = bcrypt.hashSync(customerUser.password || 'cust123', 10);
      await prisma.customer.upsert({
        where: { id: customerUser.id },
        update: {
          name: customerUser.name,
          email: customerUser.email.toLowerCase(),
          phone: customerUser.phone,
          avatar: customerUser.avatar,
          address: customerUser.address,
          latitude: customerUser.coordinates.lat,
          longitude: customerUser.coordinates.lng
        },
        create: {
          id: customerUser.id,
          name: customerUser.name,
          email: customerUser.email.toLowerCase(),
          passwordHash: hashedCustPassword,
          role: 'customer',
          phone: customerUser.phone,
          avatar: customerUser.avatar,
          address: customerUser.address,
          latitude: customerUser.coordinates.lat,
          longitude: customerUser.coordinates.lng
        }
      });
      console.log(`[Seed] ✅ Seeded Customer (${customerUser.name} - ${customerUser.email}).`);
    }

    // 3. Seed Technicians
    console.log('[Seed] Seeding 6 verified specialist technicians with hashed credentials...');
    for (const tech of INITIAL_TECHNICIANS) {
      const hashedTechPassword = bcrypt.hashSync(tech.password || 'tech123', 10);
      await prisma.technician.upsert({
        where: { id: tech.id },
        update: {
          name: tech.name,
          email: tech.email.toLowerCase(),
          phone: tech.phone,
          avatar: tech.avatar,
          categoryId: tech.category,
          categoryName: tech.categoryName,
          rating: tech.rating,
          reviewCount: tech.reviewCount,
          isOnline: tech.isOnline,
          status: tech.status,
          currentLat: tech.currentLocation.lat,
          currentLng: tech.currentLocation.lng,
          currentAddress: tech.currentLocation.address,
          workingRadiusKm: tech.workingRadiusKm || 15.0,
          walletBalance: tech.walletBalance || 380.0,
          vehicleType: tech.vehicle?.type || 'Emergency Response Van',
          vehiclePlate: tech.vehicle?.plate || 'RES-7721'
        },
        create: {
          id: tech.id,
          name: tech.name,
          email: tech.email.toLowerCase(),
          passwordHash: hashedTechPassword,
          role: 'technician',
          phone: tech.phone,
          avatar: tech.avatar,
          categoryId: tech.category,
          categoryName: tech.categoryName,
          rating: tech.rating,
          reviewCount: tech.reviewCount,
          isOnline: tech.isOnline,
          status: tech.status,
          currentLat: tech.currentLocation.lat,
          currentLng: tech.currentLocation.lng,
          currentAddress: tech.currentLocation.address,
          workingRadiusKm: tech.workingRadiusKm || 15.0,
          completedJobsToday: 0,
          walletBalance: tech.walletBalance || 380.0,
          earningsToday: 0.0,
          vehicleType: tech.vehicle?.type || 'Emergency Response Van',
          vehiclePlate: tech.vehicle?.plate || 'RES-7721'
        }
      });
    }
    console.log(`[Seed] ✅ Seeded ${INITIAL_TECHNICIANS.length} Emergency Specialists.`);

    console.log('[Seed] 🎯 Idempotent database seed finished successfully.');
    return { success: true };
  } catch (error) {
    console.error('[Seed] ❌ Database seed error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Standalone execution entrypoint
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  runDatabaseSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
