const https = require("https");
const { URL } = require("url");
const crypto = require("crypto");

const ACCOUNTS = [
  { cloudName: process.env.CLOUDINARY_CLOUD_NAME, apiKey: process.env.CLOUDINARY_API_KEY, apiSecret: process.env.CLOUDINARY_API_SECRET },
  { cloudName: process.env.CLOUDINARY_CLOUD_NAME_2, apiKey: process.env.CLOUDINARY_API_KEY_2, apiSecret: process.env.CLOUDINARY_API_SECRET_2 },
  { cloudName: process.env.CLOUDINARY_CLOUD_NAME_3, apiKey: process.env.CLOUDINARY_API_KEY_3, apiSecret: process.env.CLOUDINARY_API_SECRET_3 },
  { cloudName: process.env.CLOUDINARY_CLOUD_NAME_4, apiKey: process.env.CLOUDINARY_API_KEY_4, apiSecret: process.env.CLOUDINARY_API_SECRET_4 },
].filter(a => a.cloudName && a.apiKey && a.apiSecret);

let currentIndex = 0;
const getNextAccount = () => {
  if (ACCOUNTS.length === 0) return null;
  const account = ACCOUNTS[currentIndex % ACCOUNTS.length];
  currentIndex++;
  return account;
};

const uploadToCloudinary = async (base64Data, options = {}, account = null) => {
  const acc = account || getNextAccount();
  if (!acc) throw new Error("No Cloudinary accounts configured. Add CLOUDINARY_* keys to .env");

  const { cloudName, apiKey, apiSecret } = acc;
  const mime = options.mimeType || "image/jpeg";
  let resourceType = "auto";
  if (mime.startsWith("video/") || mime.startsWith("audio/")) resourceType = "video";
  else if (mime.startsWith("image/")) resourceType = "image";

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
  const dataUri = base64Data.startsWith("data:") ? base64Data : `data:${mime};base64,${base64Data}`;
  const folder = options.folder || "peace-mindset";
  const timestamp = Math.round(Date.now() / 1000);

  // ✅ FIX: Build params object first, sort alphabetically, THEN sign
  // All params except file, api_key, resource_type must be in signature
  const signParams = { folder, timestamp: timestamp.toString() };
  if (options.publicId) signParams.public_id = options.publicId;
  if (options.transformation) signParams.transformation = options.transformation;

  // Sort keys alphabetically and build string
  const paramString = Object.keys(signParams)
    .sort()
    .map(k => `${k}=${signParams[k]}`)
    .join("&");

  const signature = crypto.createHash("sha1").update(paramString + apiSecret).digest("hex");

  const boundary = `----CloudinaryBoundary${Date.now()}`;
  const fields = { ...signParams, file: dataUri, api_key: apiKey, signature };

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

// ✅ FIX: No more silent base64 fallback — throw if Cloudinary not configured
const smartUpload = async (base64Data, options = {}) => {
  const acc = getNextAccount();
  if (!acc) throw new Error("Cloudinary not configured. Add CLOUDINARY_* keys to your .env file.");
  const result = await uploadToCloudinary(base64Data, options, acc);
  return { url: result.url, publicId: result.publicId, isCloudinary: true, bytes: result.bytes };
};

module.exports = { uploadToCloudinary, deleteFromCloudinary, smartUpload };
