const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Vendor = require('./models/Vendor');
  // Get full vendor details
  const vendors = await Vendor.find({}).lean();
  for (const v of vendors) {
    console.log('\n=== Vendor:', v.businessName || v.name);
    console.log('service:', JSON.stringify(v.service));
    console.log('categories:', JSON.stringify(v.categories));
    console.log('subCategories:', JSON.stringify(v.subCategories));
    console.log('allowedCategories:', JSON.stringify(v.allowedCategories));
  }
  await mongoose.disconnect();
});
