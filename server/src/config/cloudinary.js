import { v2 as cloudinary } from "cloudinary";
import { env } from "./env.js";

// Configure cloudinary only if variables are present, else it will throw later if used
if (env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret) {
  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret
  });
}

/**
 * Uploads a buffer to Cloudinary
 * @param {Buffer} buffer - The file buffer
 * @param {string} folder - The destination folder in Cloudinary
 * @param {string} resourceType - 'auto', 'raw', 'image', 'video'
 * @returns {Promise<object>} - Cloudinary upload result
 */
export const uploadBufferToCloudinary = (buffer, folder = "resumes", resourceType = "auto") => {
  return new Promise((resolve, reject) => {
    if (!env.cloudinaryCloudName) {
      return reject(new Error("Cloudinary configuration is missing."));
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: resourceType,
      },
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
