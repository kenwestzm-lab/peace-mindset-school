const cloudinary = require("../config/cloudinary");

const processVideo = async (base64Video, folder, publicId) => {
  const result = await cloudinary.uploader.upload(base64Video, {
    resource_type: "video",
    folder,
    public_id: publicId,
    chunk_size: 6000000,
  });
  return result.secure_url;
};

module.exports = { processVideo };
