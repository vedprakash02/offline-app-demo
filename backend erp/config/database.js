const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect("mongodb://127.0.0.1:27017/newuser");
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Older builds created a unique multikey index on receipt numbers. It also
    // indexed unpaid fee documents as null, so the second unpaid bill failed.
    const feesCollection = conn.connection.db.collection("fees");
    const indexes = await feesCollection.indexes().catch(() => []);
    if (indexes.some((index) => index.name === "payments.receiptNo_1")) {
      await feesCollection.dropIndex("payments.receiptNo_1");
      console.log("Removed stale payments.receiptNo_1 index");
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1); // à¤à¤°à¤° à¤†à¤¨à¥‡ à¤ªà¤° à¤ªà¥à¤°à¥‹à¤¸à¥‡à¤¸ à¤¬à¤‚à¤¦ à¤•à¤° à¤¦à¥‡
  }
};

module.exports = connectDB;

