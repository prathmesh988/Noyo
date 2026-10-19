import dotenv from 'dotenv';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

dotenv.config({ path: path.resolve(process.cwd(), '../Backend/.env') });

const mongoose = require(path.resolve(process.cwd(), '../Backend/node_modules/mongoose'));

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in Backend/.env');
  process.exit(1);
}

async function runCleanup() {
  try {
    await mongoose.connect(MONGODB_URI!);
    console.log(`Connected to database for cleanup: ${mongoose.connection.name}`);

    const City = require('../../Backend/models/City');
    const Category = require('../../Backend/models/Category');
    const Service = require('../../Backend/models/Service');
    const ServiceBrandPricing = require('../../Backend/models/ServiceBrandPricing');
    const User = require('../../Backend/models/User');
    const Vendor = require('../../Backend/models/Vendor');
    const Worker = require('../../Backend/models/Worker');
    const Admin = require('../../Backend/models/Admin');
    const Booking = require('../../Backend/models/Booking');
    const BookingRequest = require('../../Backend/models/BookingRequest');
    const Settings = require('../../Backend/models/Settings');

    console.log('Purging QA_TEST_* data...');
    await City.deleteMany({ name: /^QA_TEST_/ });
    await Category.deleteMany({ title: /^QA_TEST_/ });
    await Service.deleteMany({ title: /^QA_TEST_/ });
    await User.deleteMany({ phone: '9800000001' });
    await Vendor.deleteMany({ phone: { $in: ['9800000002', '9800000003'] } });
    await Worker.deleteMany({ phone: '9800000004' });
    await Admin.deleteMany({ email: 'admin.qa@test.com' });
    await Booking.deleteMany({ 'address.addressLine1': /QA Test/i });
    await BookingRequest.deleteMany({});

    console.log('Restoring default global timers (waveDuration: 60s, maxSearchTime: 10m)...');
    await Settings.findOneAndUpdate(
      { type: 'global' },
      {
        $set: {
          waveDuration: 60,
          maxSearchTime: 10,
          searchRadius: 10
        }
      }
    );

    console.log('✅ QA_TEST_ cleanup complete.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Cleanup failed:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runCleanup();
