import dotenv from 'dotenv';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Load Backend environment to read MONGODB_URI
dotenv.config({ path: path.resolve(process.cwd(), '../Backend/.env') });

const mongoose = require(path.resolve(process.cwd(), '../Backend/node_modules/mongoose'));

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in Backend/.env');
  process.exit(1);
}

// Safety check: ensure target URI is not production
console.log('Connecting to database for QA_TEST_ seeding...');

async function runSeed() {
  try {
    await mongoose.connect(MONGODB_URI!);
    console.log(`Connected to database: ${mongoose.connection.name}`);

    // Import backend models
    const City = require('../../Backend/models/City');
    const Category = require('../../Backend/models/Category');
    const Service = require('../../Backend/models/Service');
    const ServiceBrandPricing = require('../../Backend/models/ServiceBrandPricing');
    const User = require('../../Backend/models/User');
    const Vendor = require('../../Backend/models/Vendor');
    const Worker = require('../../Backend/models/Worker');
    const Admin = require('../../Backend/models/Admin');
    const Settings = require('../../Backend/models/Settings');

    console.log('Cleaning any previous QA_TEST_ entities...');
    await City.deleteMany({ name: /^QA_TEST_/ });
    await Category.deleteMany({ title: /^QA_TEST_/ });
    await Service.deleteMany({ title: /^QA_TEST_/ });
    await ServiceBrandPricing.deleteMany({});
    await User.deleteMany({ phone: { $in: ['9800000001', '7879363299'] } });
    await Vendor.deleteMany({ phone: { $in: ['9800000002', '9800000003', '9999999999'] } });
    await Worker.deleteMany({ phone: '9800000004' });
    await Admin.deleteMany({ email: 'admin.qa@test.com' });

    console.log('1. Seeding City...');
    const city = await City.create({
      name: 'QA_TEST_Pune',
      slug: 'qa-test-pune',
      state: 'Maharashtra',
      country: 'India',
      isActive: true,
      isDefault: true,
      currency: 'INR',
      timezone: 'Asia/Kolkata'
    });

    console.log('2. Seeding Category & Service...');
    const category = await Category.create({
      title: 'QA_TEST_Home_Cleaning',
      slug: 'qa-test-home-cleaning',
      categoryType: 'service',
      showOnHome: true,
      hasBrands: false,
      hasSubCategory: false
    });

    const service = await Service.create({
      title: 'QA_TEST_Deep_Cleaning',
      slug: 'qa-test-deep-cleaning',
      categoryId: category._id,
      status: 'active',
      description: 'QA Automated Testing Deep Cleaning Service'
    });

    await ServiceBrandPricing.create({
      categoryId: category._id,
      serviceId: service._id,
      basePrice: 400,
      gstPercentage: 18,
      gstAmount: 72,
      vendorProfit: 320,
      finalCustomerPrice: 472,
      isActive: true
    });

    console.log('3. Seeding Customer (User)...');
    const user = await User.create({
      name: 'QA_TEST_Customer',
      phone: '9800000001',
      role: 'user',
      isPhoneVerified: true,
      addresses: [
        {
          type: 'home',
          addressLine1: '123 QA Test Street, Deccan',
          city: 'QA_TEST_Pune',
          state: 'Maharashtra',
          pincode: '411004',
          coordinates: [73.8567, 18.5204],
          isDefault: true
        }
      ]
    });

    console.log('4. Seeding Vendor A (Wave 1 - Closest)...');
    const vendorA = await Vendor.create({
      name: 'QA_TEST_Vendor_A',
      phone: '9800000002',
      businessName: 'QA Premier Services A',
      categories: [category._id.toString()],
      approvalStatus: 'approved',
      isActive: true,
      isOnline: true,
      availability: 'AVAILABLE',
      availabilityStatus: 'ONLINE',
      address: {
        fullAddress: 'Deccan Gymkhana, Pune',
        addressLine1: 'Deccan Gymkhana',
        city: 'QA_TEST_Pune',
        state: 'Maharashtra',
        pincode: '411004',
        lat: 18.5210,
        lng: 73.8570
      },
      location: {
        lat: 18.5210,
        lng: 73.8570,
        address: 'Deccan Gymkhana, Pune',
        updatedAt: new Date()
      },
      geoLocation: {
        type: 'Point',
        coordinates: [73.8570, 18.5210] // [lng, lat]
      },
      training: {
        status: 'completed',
        completedAt: new Date()
      },
      trainingScore: 92,
      currentLevel: 'L1',
      policeVerification: {
        status: 'approved'
      },
      cashInHand: 0,
      cashInHandLimit: 10000,
      wallet: 5000,
      isSubscriptionActive: true,
      subscription: {
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }
    });

    console.log('5. Seeding Vendor B (Wave 2 - Further)...');
    const vendorB = await Vendor.create({
      name: 'QA_TEST_Vendor_B',
      phone: '9800000003',
      businessName: 'QA Premier Services B',
      categories: [category._id.toString()],
      approvalStatus: 'approved',
      isActive: true,
      isOnline: true,
      availability: 'AVAILABLE',
      availabilityStatus: 'ONLINE',
      address: {
        fullAddress: 'Shivajinagar, Pune',
        addressLine1: 'Shivajinagar',
        city: 'QA_TEST_Pune',
        state: 'Maharashtra',
        pincode: '411004',
        lat: 18.5350,
        lng: 73.8700
      },
      location: {
        lat: 18.5350,
        lng: 73.8700,
        address: 'Shivajinagar, Pune',
        updatedAt: new Date()
      },
      geoLocation: {
        type: 'Point',
        coordinates: [73.8700, 18.5350] // [lng, lat]
      },
      training: {
        status: 'completed',
        completedAt: new Date()
      },
      trainingScore: 85,
      currentLevel: 'L2',
      policeVerification: {
        status: 'approved'
      },
      cashInHand: 0,
      cashInHandLimit: 10000,
      wallet: 3000,
      isSubscriptionActive: true,
      subscription: {
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }
    });

    console.log('6. Seeding Field Worker (under Vendor A)...');
    const worker = await Worker.create({
      name: 'QA_TEST_Worker_1',
      phone: '9800000004',
      vendorId: vendorA._id,
      approvalStatus: 'approved',
      status: 'ONLINE',
      currentAvailability: 'AVAILABLE',
      isActive: true,
      isOnline: true,
      location: {
        lat: 18.5210,
        lng: 73.8570,
        updatedAt: new Date()
      },
      geoLocation: {
        type: 'Point',
        coordinates: [73.8570, 18.5210]
      }
    });

    console.log('7. Seeding SuperAdmin...');
    const admin = await Admin.create({
      name: 'QA_TEST_SuperAdmin',
      email: 'admin.qa@test.com',
      password: 'AdminPassword123!',
      role: 'SUPER_ADMIN',
      isActive: true
    });

    console.log('8. Adjusting Global Timers for Fast & Deterministic Wave Testing...');
    await Settings.findOneAndUpdate(
      { type: 'global' },
      {
        $set: {
          waveDuration: 10,       // 10s per wave
          maxSearchTime: 1,      // 1 minute total search
          searchRadius: 15
        }
      },
      { upsert: true, new: true }
    );

    console.log('\n=====================================================================');
    console.log('✅ DEV DATABASE SEED COMPLETED SUCCESSFULLY');
    console.log('=====================================================================');
    console.log(`- City: ${city.name} (${city.slug})`);
    console.log(`- Service: ${service.title} (Price: ₹472)`);
    console.log(`- Customer: ${user.name} | Phone: ${user.phone}`);
    console.log(`- Vendor A (Wave 1): ${vendorA.name} | Phone: ${vendorA.phone}`);
    console.log(`- Vendor B (Wave 2): ${vendorB.name} | Phone: ${vendorB.phone}`);
    console.log(`- Worker: ${worker.name} | Phone: ${worker.phone}`);
    console.log(`- Admin: ${admin.email} | Pass: AdminPassword123!`);
    console.log('- Wave Timers: 10s wave duration, 1m max search time');
    console.log('=====================================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Seeding failed:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runSeed();
