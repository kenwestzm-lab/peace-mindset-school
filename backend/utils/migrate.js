#!/usr/bin/env node
// Run this ONCE to add profilePic field to existing User and Child documents
// Usage: node ~/peace-mindset/backend/utils/migrate.js

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    const db = mongoose.connection.db;

    // Add profilePic to users collection
    const usersResult = await db.collection("users").updateMany(
      { profilePic: { $exists: false } },
      { $set: { profilePic: null } }
    );
    console.log(`✅ Users updated: ${usersResult.modifiedCount} documents`);

    // Add profilePic to children collection
    const childrenResult = await db.collection("children").updateMany(
      { profilePic: { $exists: false } },
      { $set: { profilePic: null } }
    );
    console.log(`✅ Children updated: ${childrenResult.modifiedCount} documents`);

    // Add studentId to children if missing
    const studentIdResult = await db.collection("children").updateMany(
      { studentId: { $exists: false } },
      { $set: { studentId: null } }
    );
    console.log(`✅ StudentId field added: ${studentIdResult.modifiedCount} documents`);

    console.log("🎉 Migration complete!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration error:", err.message);
    process.exit(1);
  }
}

migrate();
