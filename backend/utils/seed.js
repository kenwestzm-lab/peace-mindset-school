const User = require("../models/User");
const { FeeSettings } = require("../models/index");

const seed = async () => {
  try {
    // Seed Admin
    const adminExists = await User.findOne({ email: process.env.ADMIN_EMAIL });
    if (!adminExists) {
      await User.create({
        name: "Peace Mindset Admin",
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
        role: "admin",
      });
      console.log("✅ Admin account created:", process.env.ADMIN_EMAIL);
    }

    // Seed Developer - always update password
    const devExists = await User.findOne({ email: process.env.DEVELOPER_EMAIL });
    if (!devExists) {
      await User.create({
        name: "Ken West (Developer)",
        email: process.env.DEVELOPER_EMAIL,
        password: process.env.DEVELOPER_PASSWORD,
        role: "developer",
      });
      console.log("✅ Developer account created:", process.env.DEVELOPER_EMAIL);
    } else {
      // Force update developer password
      devExists.password = process.env.DEVELOPER_PASSWORD;
      await devExists.save();
      console.log("✅ Developer password updated");
    }

    // Seed default fee settings
    const feeExists = await FeeSettings.findOne();
    if (!feeExists) {
      await FeeSettings.create({
        schoolFeeMonthly: 150,
        schoolFeeTermly: 450,
        testFeeLower: 30,
        testFeeUpper: 40,
      });
      console.log("✅ Default fee settings created");
    }
  } catch (err) {
    console.error("❌ Seed error:", err.message);
  }
};

module.exports = seed;
