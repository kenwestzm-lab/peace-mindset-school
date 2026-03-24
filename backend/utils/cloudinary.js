const cloudinary = require("cloudinary");

// 4 separate Cloudinary instances
const cloud1 = cloudinary.v2; // profiles & images
const cloud2 = new (require("cloudinary").v2.constructor)(); // audio & voice  
const cloud3 = new (require("cloudinary").v2.constructor)(); // videos
const cloud4 = new (require("cloudinary").v2.constructor)(); // results & stories

cloud1.config({ cloud_name: process.env.CLOUD_NAME_1, api_key: process.env.API_KEY_1, api_secret: process.env.API_SECRET_1 });
cloud2.config({ cloud_name: process.env.CLOUD_NAME_2, api_key: process.env.API_KEY_2, api_secret: process.env.API_SECRET_2 });
cloud3.config({ cloud_name: process.env.CLOUD_NAME_3, api_key: process.env.API_KEY_3, api_secret: process.env.API_SECRET_3 });
cloud4.config({ cloud_name: process.env.CLOUD_NAME_4, api_key: process.env.API_KEY_4, api_secret: process.env.API_SECRET_4 });

const smartUpload = async (base64Data, { mimeType, folder }) => {
  // Pick the right account based on file type
  let instance;
  if (mimeType?.startsWith("audio/") || folder?.includes("voice")) {
    instance = cloud2; // audio account
  } else if (mimeType?.startsWith("video/")) {
    instance = cloud3; // video account
  } else if (folder?.includes("result") || folder?.includes("stor")) {
    instance = cloud4; // results & stories account
  } else {
    instance = cloud1; // default: images & profiles
  }

  const resourceType =
    mimeType?.startsWith("video/") ? "video" :
    mimeType?.startsWith("audio/") ? "video" : // cloudinary uses "video" for audio too
    "image";

  const result = await instance.uploader.upload(base64Data, {
    folder: folder || "peace-mindset/general",
    resource_type: resourceType,
  });

  return { url: result.secure_url, publicId: result.public_id };
};

module.exports = { smartUpload };
