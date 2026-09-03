import { v2 as cloudinary } from "cloudinary";
import { env } from "./env.js";

const isCloudinaryConfigured = Boolean(
  env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
  });
}

// Diagnostic startup log (safe: never logs secret value)
console.log("CLOUDINARY CONFIGURATION:");
console.log(`  ✓ Cloud Name: ${env.cloudinaryCloudName ? "configured" : "MISSING"}`);
console.log(`  ✓ API Key: ${env.cloudinaryApiKey ? "configured" : "MISSING"}`);
console.log(`  ✓ API Secret: ${env.cloudinaryApiSecret ? "configured" : "MISSING"}`);

/**
 * Uploads a buffer to Cloudinary
 * @param {Buffer} buffer - The file buffer
 * @param {string} folder - The destination folder in Cloudinary
 * @param {string} resourceType - 'auto', 'raw', 'image', 'video'
 * @param {object} options - Additional options (e.g. filename_override, format)
 * @returns {Promise<object>} - Cloudinary upload result
 */
export const uploadBufferToCloudinary = (
  buffer,
  folder = "resumes",
  resourceType = "raw",
  options = {}
) => {
  return new Promise((resolve, reject) => {
    if (!env.cloudinaryCloudName) {
      return reject(new Error("Cloudinary configuration is missing."));
    }

    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
      return reject(new Error("Cannot upload empty or invalid buffer to Cloudinary."));
    }

    const uploadOptions = {
      folder,
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true,
      ...options,
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * Deletes a file from Cloudinary by its public ID
 * @param {string} publicId - The Cloudinary public ID
 * @param {string} resourceType - 'auto', 'raw', 'image', 'video'
 * @returns {Promise<object>} - Cloudinary deletion result
 */
export const deleteFromCloudinary = async (publicId, resourceType = "raw") => {
  if (!publicId || !env.cloudinaryCloudName) return;
  return await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};
