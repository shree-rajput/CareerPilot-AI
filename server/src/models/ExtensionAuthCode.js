import mongoose from "mongoose";

const extensionAuthCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: "0" } // TTL Index: MongoDB automatically deletes documents when expiresAt is reached
    }
  },
  { timestamps: true }
);

export const ExtensionAuthCode = mongoose.model("ExtensionAuthCode", extensionAuthCodeSchema);
