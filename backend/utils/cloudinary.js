// ================================================
// Cloudinary Upload Utility
// Rotates across 4 accounts to maximize storage
// Free tier: 25GB storage, 25GB bandwidth/month
// ================================================

const https = require("https");
const http = require("http");
const { URL } = require("url");

// 4 Cloudinary accounts
const ACCOUNTS = [
  {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME_1,
    apiKey: process.env.CLOUDINARY_API_KEY_1,
    apiSecret: process.env.CLOUDINARY_API_SECRET_1,
  },
  {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME_2,
    apiKey: process.env.CLOUDINARY_API_KEY_2,
    apiSecret: process.env.CLOUDINARY_API_SECRET_2,
  },
  {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME_3,
    apiKey: process.env.CLOUDINARY_API_KEY_3,
    apiSecret: process.env.CLOUDINARY_API_SECRET_3,
  },
  {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME_4,
    apiKey: process.env.CLOUDINARY_API_KEY_4,
    apiSecret: process.env.CLOUDINARY_API_SECRET_4,
  },
].filter(a => a.cloudName && a.apiKey && a.apiSecret);

// Round-robin counter
let currentIndex = 0;

const getNextAccount = () => {
  if (ACCOUNTS.length === 0) return null;
  const account = ACCOUNTS[currentIndex % ACCOUNTS.length];
  currentIndex++;
  return account;
};

const uploadToCloudinary = async (base64Data, options = {}, account = null) => {
  const acc = account || getNextAccount();
  if (!acc) throw new Error("No Cloudinary accounts configured.");

  const { cloudName, apiKey, apiSecret } = acc;
  const mime = options.mimeType || "";
  let resourceType = "auto";
  if (mime.startsWith("video/") || mime.startsWith("audio/")) resourceType = "video";
  else if (mime.startsWith("image/")) resourceType = "image";

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
  const dataUri = base64Data.startsWith("data:")
    ? base64Data
    : `data:${mime};base64,${base64Data}`;
  const folder = options.folder || "peace-mindset";
  const timestamp = Math.round(Date.now() / 1000);

  const crypto = require("crypto");
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto.createHash("sha1").update(paramsToSign + apiSecret).digest("hex");

  const boundary = `----CloudinaryBoundary${Date.now()}`;
  const fields = { file: dataUri, api_key: apiKey, timestamp: timestamp.toString(), signature, folder };
  if (options.publicId) fields.public_id = options.publicId;
  if (options.transformation) fields.transformation = options.transformation;

  let body = "";
  for (const [key, value] of Object.entries(fields)) {
    body += `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`;
  }
  body += `--${boundary}--\r\n`;

  return new Promise((resolve, reject) => {
    const urlParsed = new URL(uploadUrl);
    const bodyBuffer = Buffer.from(body, "utf8");
    const req = https.request({
      hostname: urlParsed.hostname,
      path: urlParsed.pathname,
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": bodyBuffer.length,
      },
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          const result = JSON.parse(data);
          if (result.error) reject(new Error(result.error.message || "Cloudinary upload failed"));
          else resolve({ url: result.secure_url, publicId: result.public_id, resourceType: result.resource_type, format: result.format, bytes: result.bytes });
        } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.write(bodyBuffer);
    req.end();
  });
};

const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  const acc = getNextAccount();
  if (!acc) return;
  const { cloudName, apiKey, apiSecret } = acc;
  const timestamp = Math.round(Date.now() / 1000);
  const crypto = require("crypto");
  const signature = crypto.createHash("sha1").update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`).digest("hex");
  const boundary = `----CloudinaryBoundary${Date.now()}`;
  let body = "";
  for (const [key, value] of Object.entries({ public_id: publicId, api_key: apiKey, timestamp: timestamp.toString(), signature })) {
    body += `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`;
  }
  body += `--${boundary}--\r\n`;
  return new Promise((resolve, reject) => {
    const bodyBuffer = Buffer.from(body, "utf8");
    const req = https.request({
      hostname: "api.cloudinary.com",
      path: `/v1_1/${cloudName}/${resourceType}/destroy`,
      method: "POST",
      headers: { "Content-Type": `multipart/form-data; boundary=${boundary}`, "Content-Length": bodyBuffer.length },
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => { try { resolve(JSON.parse(data)); } catch (e) { resolve({}); } });
    });
    req.on("error", reject);
    req.write(bodyBuffer);
    req.end();
  });
};

const smartUpload = async (base64Data, options = {}) => {
  const acc = getNextAccount();
  if (acc) {
    const result = await uploadToCloudinary(base64Data, options, acc);
    return { url: result.url, publicId: result.publicId, isCloudinary: true, bytes: result.bytes };
  }
  // Fallback: base64 (only safe for small files < 8MB)
  const sizeBytes = (base64Data.length * 3) / 4;
  if (sizeBytes > 8 * 1024 * 1024) throw new Error("File too large. Please configure Cloudinary in .env.");
  return { url: base64Data, publicId: null, isCloudinary: false, bytes: sizeBytes };
};

module.exports = { uploadToCloudinary, deleteFromCloudinary, smartUpload };
