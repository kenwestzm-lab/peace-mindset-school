require("dotenv").config();
const mongoose = require("mongoose");
const Payment = require("./models/Payment");
const Child = require("./models/Child");
const { Earnings, Withdrawal, Message, SchoolCalendar } = require("./models/index");

const cleanup = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { tlsAllowInvalidCertificates: true });
    console.log("✅ MongoDB connected");

    // Clear all payments/transactions
    const payments = await Payment.deleteMany({});
    console.log(`🗑️  Deleted ${payments.deletedCount} payments`);

    // Clear all earnings
    const earnings = await Earnings.deleteMany({});
    console.log(`🗑️  Deleted ${earnings.deletedCount} earnings records`);

    // Clear all withdrawals
    const withdrawals = await Withdrawal.deleteMany({});
    console.log(`🗑️  Deleted ${withdrawals.deletedCount} withdrawals`);

    // Clear all students/children
    const children = await Child.deleteMany({});
    console.log(`🗑️  Deleted ${children.deletedCount} students`);

    // Clear all messages
    const messages = await Message.deleteMany({});
    console.log(`🗑️  Deleted ${messages.deletedCount} messages`);

    // Clear calendar events
    const calendar = await SchoolCalendar.deleteMany({});
    console.log(`🗑️  Deleted ${calendar.deletedCount} calendar events`);

    console.log("\n✅ Database cleaned successfully!");
    console.log("✅ All transactions, students, and messages cleared.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Cleanup error:", err.message);
    process.exit(1);
  }
};

cleanup();
