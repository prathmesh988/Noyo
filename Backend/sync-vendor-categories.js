/**
 * Migration script: Sync vendor.categories from vendor.service, including group category expansion.
 * 
 * Problem: When a vendor offers "Cleaning Service", "Painting Service", "Solar Service", or "Electrician / Plumber / Carpenter",
 * these are Group Categories. The actual services in the database belong to the mapped categories
 * (e.g. "Home Cleaning", "Painting", "Solar Installation", "Plumber", "Carpenter").
 * 
 * This script:
 * 1. Ensures Group Categories have all corresponding child category IDs mapped.
 * 2. Expands all group categories so that vendors receive both the Group Category IDs/titles AND
 *    all child category IDs/titles in their `categories` array.
 * 3. Simulates vendor matching for all services to verify 100% coverage.
 */
const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB\n');

  const Vendor = require('./models/Vendor');
  const Category = require('./models/Category');
  const Service = require('./models/Service');

  // 1. Update Group Category mappings in database
  const allCategories = await Category.find({}).lean();
  const categoryById = {};
  const categoryByTitle = {};
  allCategories.forEach(c => {
    categoryById[c._id.toString()] = c;
    categoryByTitle[c.title.toLowerCase().trim()] = c;
  });

  // Ensure Cleaning Service has all cleaning categories
  const cleaningGroup = categoryByTitle['cleaning service'];
  if (cleaningGroup) {
    const cleaningCats = allCategories.filter(c => 
      c.title.toLowerCase().includes('cleaning') && c._id.toString() !== cleaningGroup._id.toString()
    );
    const existingMapped = new Set((cleaningGroup.mappedCategories || []).map(id => id.toString()));
    cleaningCats.forEach(c => existingMapped.add(c._id.toString()));
    // Also add Sofa Carpet and More
    if (categoryByTitle['sofa carpet and more']) {
      existingMapped.add(categoryByTitle['sofa carpet and more']._id.toString());
    }
    await Category.findByIdAndUpdate(cleaningGroup._id, {
      mappedCategories: Array.from(existingMapped)
    });
    console.log('Updated Cleaning Service mappedCategories:', Array.from(existingMapped));
  }

  // Ensure Painting Service has all painting categories
  const paintingGroup = categoryByTitle['painting service'];
  if (paintingGroup) {
    const paintingCats = allCategories.filter(c => 
      c.title.toLowerCase().includes('paint') && c._id.toString() !== paintingGroup._id.toString()
    );
    const existingMapped = new Set((paintingGroup.mappedCategories || []).map(id => id.toString()));
    paintingCats.forEach(c => existingMapped.add(c._id.toString()));
    await Category.findByIdAndUpdate(paintingGroup._id, {
      mappedCategories: Array.from(existingMapped)
    });
    console.log('Updated Painting Service mappedCategories:', Array.from(existingMapped));
  }

  // Ensure Solar Service has Solar Installation
  const solarGroup = categoryByTitle['solar service'];
  if (solarGroup) {
    const solarCats = allCategories.filter(c => 
      c.title.toLowerCase().includes('solar') && c._id.toString() !== solarGroup._id.toString()
    );
    const existingMapped = new Set((solarGroup.mappedCategories || []).map(id => id.toString()));
    solarCats.forEach(c => existingMapped.add(c._id.toString()));
    await Category.findByIdAndUpdate(solarGroup._id, {
      mappedCategories: Array.from(existingMapped)
    });
    console.log('Updated Solar Service mappedCategories:', Array.from(existingMapped));
  }

  // Re-fetch all categories with updated mappedCategories
  const refreshedCategories = await Category.find({}).lean();
  const catById = {};
  const catByTitle = {};
  refreshedCategories.forEach(c => {
    catById[c._id.toString()] = c;
    catByTitle[c.title.toLowerCase().trim()] = c;
  });

  // 2. Update all active vendors
  const vendors = await Vendor.find({ isActive: true });
  console.log(`\nProcessing ${vendors.length} active vendors...`);

  for (const vendor of vendors) {
    const serviceArray = vendor.service || [];
    if (serviceArray.length === 0) continue;

    const newCategories = new Set(vendor.categories || []);

    for (const svc of serviceArray) {
      const trimmed = svc.trim();
      newCategories.add(trimmed);

      const cat = catByTitle[trimmed.toLowerCase()];
      if (cat) {
        newCategories.add(cat._id.toString());

        // Expand mappedCategories if it's a group category
        if (Array.isArray(cat.mappedCategories)) {
          for (const childId of cat.mappedCategories) {
            const childIdStr = childId.toString();
            newCategories.add(childIdStr);
            const childDoc = catById[childIdStr];
            if (childDoc && childDoc.title) {
              newCategories.add(childDoc.title.trim());
            }
          }
        }
      }
    }

    const newCategoriesArray = Array.from(newCategories);
    vendor.categories = newCategoriesArray;
    await vendor.save();

    console.log(`\n✅ Vendor: ${vendor.businessName || vendor.name}`);
    console.log(`   service (${vendor.service.length}):`, vendor.service);
    console.log(`   categories (${newCategoriesArray.length}):`, newCategoriesArray);
  }

  // 3. Test booking query for all sample services
  console.log('\n=== TESTING VENDOR MATCHING ACROSS SERVICES ===');
  const services = await Service.find({}).select('title categoryId').lean();
  let matchedCount = 0;
  let missingCount = 0;

  for (const s of services) {
    const sCat = catById[s.categoryId?.toString()];
    const searchArray = [];
    if (sCat) {
      searchArray.push(new RegExp(`^${sCat.title.trim()}$`, 'i'));
      searchArray.push(sCat._id.toString());
    }

    const matching = await Vendor.find({
      isActive: true,
      categories: { $in: searchArray }
    }).select('_id name businessName').lean();

    if (matching.length > 0) {
      matchedCount++;
    } else {
      missingCount++;
      console.log(`⚠️ No vendor for service "${s.title}" (Category: "${sCat?.title}" [${s.categoryId}])`);
    }
  }

  console.log(`\nResult: ${matchedCount} services matched a vendor, ${missingCount} services had no vendor.`);

  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
