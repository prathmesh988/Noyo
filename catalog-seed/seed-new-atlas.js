/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Noyo Platform: Master MongoDB Atlas Seeder Script (All Services, Forms & Static Data)
 * Platform Agency: Appzeto Technologies
 * ─────────────────────────────────────────────────────────────────────────────
 * This script seeds a fresh, clutter-free MongoDB Atlas database with:
 *
 * 1. Core Service Marketplace:
 *    - 30 Clean Production Categories
 *    - 55 Subcategories
 *    - 185 User Services (with packages, descriptions, and feature lists)
 *    - 1,292 Zone Pricing Configurations (Customer price, Vendor payout, GST)
 *    - 8 Vendor Add-on Parts Catalogs (Spare parts & materials)
 *    - 8 Platform Professions
 *    - Operating Cities & 12 Geographical Zones
 *
 * 2. Help Center / Forums / Support FAQs:
 *    - 7 Help Categories with nested FAQs (Manage Booking, Safety, Billing, etc.)
 *
 * 3. Partner Training & Certification:
 *    - 8 Partner Training / Quiz Questions
 *    - 3 Partner Training Videos
 *
 * 4. Forms, Schemas & Dynamic Layouts:
 *    - 8 Category Templates (Schemas & Forms)
 *    - 2 Property Templates (2BHK, 3BHK)
 *    - 183 Service Workflows (Multi-visit schedules)
 *    - 25 Service Workflow Steps
 *    - 842 Service Page Blocks (Dynamic forms, FAQs, review blocks)
 *
 * 5. Platform Settings & Plans:
 *    - 1 Global Settings Document (Taxes, GST, TDS, support@noyo.in)
 *    - 4 Wallet Credit Packages
 *    - 3 Subscription & Membership Plans (Gold, Diamond)
 *
 * 6. CMS & Marketing:
 *    - 17 Home Content, Image Boxes, Banners & Dashboard CMS records
 *    - 1 Partner Terms & Privacy Policy (Noyo Partner Agreement)
 *    - 11 Promo Codes & Discount Rules
 *
 * 7. Specialized Verticals:
 *    - 17 Consultant Products & Storefront Page Designs
 *    - 2 Painting Settings & Ratecards
 *
 * 8. Super Admin Account:
 *    - admin.qa@test.com / Admin@1234
 *
 * USAGE:
 *   node catalog-seed/seed-new-atlas.js [OPTIONAL_MONGODB_URI]
 *
 * If no argument is passed, it reads MONGODB_URI from Backend/.env
 * ─────────────────────────────────────────────────────────────────────────────
 */

const fs = require('fs');
const path = require('path');
// Determine path to backend node_modules & .env
const backendDir = path.join(__dirname, '..', 'Backend');
const mongoose = require(path.join(backendDir, 'node_modules', 'mongoose'));
const dotenv = require(path.join(backendDir, 'node_modules', 'dotenv'));
const bcrypt = require(path.join(backendDir, 'node_modules', 'bcryptjs'));

dotenv.config({ path: path.join(backendDir, '.env') });

const targetUri = process.argv[2] || process.env.MONGODB_URI;

if (!targetUri) {
  console.error('\n❌ ERROR: No MongoDB URI provided.');
  console.error('Please either specify MONGODB_URI in Backend/.env or run:');
  console.error('  node catalog-seed/seed-new-atlas.js "mongodb+srv://<user>:<pwd>@<cluster>.mongodb.net/<db>"\n');
  process.exit(1);
}

// Load clean export
const exportFilePath = path.join(__dirname, 'catalog_export.json');
if (!fs.existsSync(exportFilePath)) {
  console.error(`\n❌ ERROR: Clean catalog export file not found at: ${exportFilePath}\n`);
  process.exit(1);
}

const catalog = JSON.parse(fs.readFileSync(exportFilePath, 'utf8'));

async function seed() {
  console.log('======================================================================');
  console.log('🚀 NOYO / APPZETO: COMPLETE MONGODB ATLAS SEEDER ENGINE');
  console.log('======================================================================');
  console.log(`Target URI: ${targetUri.replace(/:([^:@]+)@/, ':****@')}`);

  await mongoose.connect(targetUri);
  const db = mongoose.connection.db;
  console.log(`✅ Connected successfully to database: "${mongoose.connection.name}"\n`);

  // Helper for batch upsert/insert
  async function upsertCollection(name, items, idField = '_id') {
    if (!items || items.length === 0) return 0;
    const coll = db.collection(name);
    console.log(`⏳ Seeding "${name}" (${items.length} records)...`);

    // Helper to get natural unique filter for collections with alternate unique keys
    function getFilter(cleanDoc) {
      if (name === 'professions' && cleanDoc.name) {
        return { name: cleanDoc.name };
      }
      if (name === 'cities' && cleanDoc.name) {
        return { name: cleanDoc.name };
      }
      if (name === 'zones' && cleanDoc.name) {
        return { name: cleanDoc.name };
      }
      if (name === 'settings') {
        return { type: cleanDoc.type || 'global' };
      }
      if (name === 'propertytemplates' && cleanDoc.code) {
        return { code: cleanDoc.code };
      }
      if (name === 'categorytemplates' && cleanDoc.code) {
        return { code: cleanDoc.code };
      }
      if (name === 'paintbrands' && cleanDoc.name) {
        return { name: cleanDoc.name };
      }
      if (name === 'paintingsettings' && cleanDoc.profileCode) {
        return { profileCode: cleanDoc.profileCode };
      }
      if (name === 'paintingratecards' && cleanDoc.key) {
        return { key: cleanDoc.key };
      }
      if (name === 'promocodes' && cleanDoc.code) {
        return { code: cleanDoc.code };
      }
      return { [idField]: cleanDoc[idField] };
    }

    const operations = items.map(doc => {
      const cleanDoc = { ...doc };
      
      // Cast _id to ObjectId if valid 24-char hex
      if (cleanDoc._id && typeof cleanDoc._id === 'string' && /^[0-9a-fA-F]{24}$/.test(cleanDoc._id)) {
        cleanDoc._id = new mongoose.Types.ObjectId(cleanDoc._id);
      }
      
      // Cast relational ObjectId fields if needed
      const relKeys = [
        'categoryId', 'subCategoryId', 'serviceId', 'brandId', 'zoneId', 'variantId', 
        'workflowId', 'templateId', 'cityId', 'videoId', 'activeVersionId', 'consultantVendorId'
      ];
      
      relKeys.forEach(k => {
        if (cleanDoc[k] && typeof cleanDoc[k] === 'string' && /^[0-9a-fA-F]{24}$/.test(cleanDoc[k])) {
          cleanDoc[k] = new mongoose.Types.ObjectId(cleanDoc[k]);
        }
      });

      // Cast array of ObjectIds
      ['cityIds', 'zoneIds', 'categoryIds', 'subCategoryIds', 'serviceIds'].forEach(arrKey => {
        if (Array.isArray(cleanDoc[arrKey])) {
          cleanDoc[arrKey] = cleanDoc[arrKey].map(item => 
            (typeof item === 'string' && /^[0-9a-fA-F]{24}$/.test(item)) ? new mongoose.Types.ObjectId(item) : item
          );
        }
      });

      const filter = getFilter(cleanDoc);
      // If matching by alternate unique key, use $set so we don't attempt to overwrite an existing immutable _id
      const isCustomFilter = filter !== null && !filter[idField];
      if (isCustomFilter) {
        const updateDoc = { ...cleanDoc };
        delete updateDoc._id; // avoid immutable _id modification if doc already exists with different _id
        return {
          updateOne: {
            filter,
            update: { $set: updateDoc, $setOnInsert: { _id: cleanDoc._id } },
            upsert: true
          }
        };
      }

      return {
        replaceOne: {
          filter,
          replacement: cleanDoc,
          upsert: true
        }
      };
    });

    // Chunk bulk writes into batches of 500 for safety on Atlas
    const chunkSize = 500;
    let totalUpserted = 0;
    let totalModified = 0;

    for (let i = 0; i < operations.length; i += chunkSize) {
      const chunk = operations.slice(i, i + chunkSize);
      try {
        const res = await coll.bulkWrite(chunk, { ordered: false });
        totalUpserted += res.upsertedCount || 0;
        totalModified += res.modifiedCount || 0;
      } catch (err) {
        if (err.result) {
          totalUpserted += err.result.upsertedCount || 0;
          totalModified += err.result.modifiedCount || 0;
        } else {
          throw err;
        }
      }
    }

    console.log(`   ✅ "${name}": ${totalUpserted} inserted, ${totalModified} updated.`);
    return items.length;
  }

  // 1. Core Service Marketplace
  console.log('\n--- [1/7] Seeding Core Service Marketplace ---');
  await upsertCollection('categories', catalog.categories);
  await upsertCollection('subcategories', catalog.subcategories);
  await upsertCollection('services', catalog.services);
  // Ensure no conflicting legacy unique index on pricingconfigs
  try {
    const pcColl = db.collection('pricingconfigs');
    const pcIndexes = await pcColl.indexes();
    const badIdx = pcIndexes.find(idx => idx.name === 'categoryId_1_subCategoryId_1_serviceId_1_brandId_1_cityId_1_packageTitle_1' && idx.unique);
    if (badIdx) {
      console.log('   ℹ️ Dropping conflicting unique index on pricingconfigs...');
      await pcColl.dropIndex('categoryId_1_subCategoryId_1_serviceId_1_brandId_1_cityId_1_packageTitle_1');
    }
  } catch (err) {
    // ignore if doesn't exist
  }

  await upsertCollection('pricingconfigs', catalog.pricingconfigs);
  await upsertCollection('vendorservicecatalogs', catalog.vendorservicecatalogs);
  await upsertCollection('professions', catalog.professions);
  await upsertCollection('cities', catalog.cities);
  await upsertCollection('zones', catalog.zones);

  // 2. Help Center / Support Forums
  console.log('\n--- [2/7] Seeding Help Center & Support FAQs ---');
  await upsertCollection('helpcategories', catalog.helpcategories);

  // 3. Partner Training & Certification
  console.log('\n--- [3/7] Seeding Partner Training & Quiz Modules ---');
  await upsertCollection('trainingquestions', catalog.trainingquestions);
  await upsertCollection('trainingvideos', catalog.trainingvideos);

  // 4. Forms, Schemas & Dynamic Layouts
  console.log('\n--- [4/7] Seeding Forms, Templates & Service Page Blocks ---');
  await upsertCollection('categorytemplates', catalog.categorytemplates);
  await upsertCollection('propertytemplates', catalog.propertytemplates);
  await upsertCollection('serviceworkflows', catalog.serviceworkflows);
  await upsertCollection('serviceworkflowsteps', catalog.serviceworkflowsteps);
  await upsertCollection('servicepageblocks', catalog.servicepageblocks);

  // 5. Global Settings & Monetization Plans
  console.log('\n--- [5/7] Seeding Global Platform Settings & Wallet Plans ---');
  await upsertCollection('settings', catalog.settings);
  await upsertCollection('creditpackages', catalog.creditpackages);
  await upsertCollection('subscriptionplans', catalog.subscriptionplans);
  await upsertCollection('plans', catalog.plans);

  // 6. CMS & Marketing Content
  console.log('\n--- [6/7] Seeding CMS Content, Banners & Partner Policies ---');
  await upsertCollection('homecontents', catalog.homecontents);
  await upsertCollection('imageboxes', catalog.imageboxes);
  await upsertCollection('offerbanners', catalog.offerbanners);
  await upsertCollection('vendordashboardcontents', catalog.vendordashboardcontents);
  await upsertCollection('vendorprivacypolicies', catalog.vendorprivacypolicies);
  await upsertCollection('promocodes', catalog.promocodes);

  // 7. Specialized Verticals (Consulting & Painting)
  console.log('\n--- [7/7] Seeding Verticals (Consultant & Painting) ---');
  await upsertCollection('consultantpages', catalog.consultantpages);
  await upsertCollection('consultantproducts', catalog.consultantproducts);
  await upsertCollection('paintbrands', catalog.paintbrands);
  await upsertCollection('paintingsettings', catalog.paintingsettings);
  await upsertCollection('paintingratecards', catalog.paintingratecards);

  // 8. Super Admin Account
  console.log('\n⏳ Ensuring Admin account...');
  const adminsColl = db.collection('admins');
  const existingAdmin = await adminsColl.findOne({ email: 'admin.qa@test.com' });
  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Admin@1234', salt);
    await adminsColl.insertOne({
      _id: new mongoose.Types.ObjectId('6a6edcf9c36ab2a6509683e2'),
      name: 'Super Admin',
      email: 'admin.qa@test.com',
      password: hashedPassword,
      role: 'superadmin',
      permissions: ['all'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('   ✅ Created Super Admin account: admin.qa@test.com / Admin@1234');
  } else {
    console.log('   ✅ Super Admin account already present: admin.qa@test.com');
  }

  console.log('\n======================================================================');
  console.log('🎉 ATLAS SEEDING COMPLETE: ALL DATA RESTORED CLEANLY!');
  console.log('======================================================================');
  console.log(`- Categories: ${catalog.categories?.length || 0}`);
  console.log(`- Subcategories: ${catalog.subcategories?.length || 0}`);
  console.log(`- Services: ${catalog.services?.length || 0}`);
  console.log(`- Pricing Configs: ${catalog.pricingconfigs?.length || 0}`);
  console.log(`- Help Categories (FAQs / Forums): ${catalog.helpcategories?.length || 0}`);
  console.log(`- Training Modules (Questions & Videos): ${(catalog.trainingquestions?.length || 0) + (catalog.trainingvideos?.length || 0)}`);
  console.log(`- Dynamic Forms & Page Blocks: ${(catalog.categorytemplates?.length || 0) + (catalog.servicepageblocks?.length || 0)}`);
  console.log(`- Service Workflows & Steps: ${(catalog.serviceworkflows?.length || 0) + (catalog.serviceworkflowsteps?.length || 0)}`);
  console.log(`- Global Settings, Wallet Credits & Plans: ${(catalog.settings?.length || 0) + (catalog.creditpackages?.length || 0) + (catalog.subscriptionplans?.length || 0)}`);
  console.log(`- CMS Banners, Terms & Marketing: ${(catalog.homecontents?.length || 0) + (catalog.offerbanners?.length || 0) + (catalog.promocodes?.length || 0)}`);
  console.log('\nYour new Atlas database is now fully populated, clean, and ready to use!');
  console.log('======================================================================\n');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('\n❌ Seeding Failed:', err);
  process.exit(1);
});
