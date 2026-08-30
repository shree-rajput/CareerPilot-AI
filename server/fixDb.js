import mongoose from "mongoose";
import { connectDatabase } from "./src/config/db.js";
import { User } from "./src/models/User.js";

async function fix() {
  await connectDatabase();
  const res = await User.updateMany({}, { $set: { targetRoles: [] } });
  console.log("Fixed", res.modifiedCount);
  process.exit(0);
}
fix();
