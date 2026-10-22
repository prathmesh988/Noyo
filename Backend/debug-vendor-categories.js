/**
 * Debug script - run from d:/Noyo/Backend directory
 */
const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB\n');

  const Vendor = require('./models/Vendor');
  const Category = require('./models/Category');
  const Service = require('./models/Service');

  // 1. Get all vendors who are active and approved
  const vendors = await Vendor.find({ 
    isActive: true, 
    approvalStatus: 'APPROVED' 
  }).select('name businessName categories service isOnline availabilityStatus availability').lean();

  console.log('=== ALL APPROVED VENDORS ===');
  for (const v of vendors) {
    console.log(`\nVendor: ${v.businessName || v.name}`);
    console.log(`  isOnline: ${v.isOnline}, availability: ${v.availability}, availabilityStatus: ${v.availabilityStatus}`);
    console.log(`  categories: ${JSON.stringify(v.categories)}`);
    console.log(`  service: ${JSON.stringify(v.service)}`);
  }

  // 2. Get all categories
  const categories = await Category.find({}).select('title slug _id').lean();
  console.log('\n=== ALL CATEGORIES ===');
  for (const c of categories) {
    console.log(`  ID: ${c._id} | Title: "${c.title}" | Slug: "${c.slug}"`);
  }

  // 3. Sample services
  const services = await Service.find({}).select('title categoryId category serviceCategory').limit(15).lean();
  console.log('\n=== SAMPLE SERVICES ===');
  for (const s of services) {
    console.log(`  "${s.title}" | categoryId: ${s.categoryId} | category: "${s.category}" | serviceCategory: "${s.serviceCategory}"`);
  }

  // 4. Simulate vendor matching for each category
  console.log('\n=== VENDOR MATCHING PER CATEGORY ===');
  for (const cat of categories) {
    const searchArray = [
      new RegExp(`^${cat.title.trim()}$`, 'i'),
      cat._id.toString()
    ];

    const matchingVendors = await Vendor.find({
      isActive: true,
      categories: { $in: searchArray }
    }).select('_id name businessName categories').lean();

    console.log(`\nCategory "${cat.title}" => ${matchingVendors.length} vendor(s)`);
    for (const v of matchingVendors) {
      console.log(`    - ${v.businessName || v.name}: ${JSON.stringify(v.categories)}`);
    }
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
