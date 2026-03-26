const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");

async function seedAdmin() {
  console.log("MONGODB_URI:", process.env.MONGODB_URI ? "Found ✅" : "Missing ❌");
  console.log("ADMIN_EMAIL:", process.env.ADMIN_EMAIL || "Missing ❌");

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB ✅");

  const existing = await User.findOne({ email: process.env.ADMIN_EMAIL });
  if (existing) {
    console.log("Admin already exists:", existing.email);
    process.exit(0);
  }

  const admin = await User.create({
    name: "Admin",
    email: process.env.ADMIN_EMAIL,
    password: "Peacemindset@2026",
    role: "admin",
    isActive: true,
  });

  console.log("✅ Admin created:", admin.email);
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
