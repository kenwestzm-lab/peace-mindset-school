// ═══════════════════════════════════════════════════════════════════
// Cloudinary Upload Utility
// Free tier: 25GB storage, 25GB bandwidth/month
// Sign up free at cloudinary.com
// ═══════════════════════════════════════════════════════════════════
const https = require("https");
const http = require("http");
const { URL } = require("url");

// Upload base64 data to Cloudinary
// Returns { url, publicId, resourceType, format, bytes }
const uploadToCloudinary = async (base64Data, options = {}) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET to .env");
  }

  // Determine resource type from data URL or mime type
  const mime = options.mimeType || "";
  let resourceType = "auto";
  if (mime.startsWith("video/") || mime.startsWith("audio/")) resourceType = "video";
  else if (mime.startsWith("image/")) resourceType = "image";

  // Build upload URL
  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

  // Build form data (Cloudinary accepts base64 as data URI)
  const dataUri = base64Data.startsWith("data:") ? base64Data : `data:${mime};base64,${base64Data}`;
  const folder = options.folder || "peace-mindset";
  const timestamp = Math.round(Date.now() / 1000);

  // Create signature
  const crypto = require("crypto");
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto.createHash("sha1").update(paramsToSign + apiSecret).digest("hex");

  // Build multipart form body
  const boundary = `----CloudinaryBoundary${Date.now()}`;
  const fields = {
    file: dataUri,
    api_key: apiKey,
    timestamp: timestamp.toString(),
    signature,
    folder,
  };
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
          if (result.error) {
            reject(new Error(result.error.message || "Cloudinary upload failed"));
          } else {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              resourceType: result.resource_type,
              format: result.format,
              bytes: result.bytes,
              width: result.width,
              height: result.height,
              duration: result.duration,
            });
          }
        } catch (e) {
          reject(new Error("Invalid Cloudinary response: " + data.substring(0, 200)));
        }
      });
    });

    req.on("error", reject);
    req.setTimeout(120000, () => { req.destroy(); reject(new Error("Cloudinary upload timeout")); });
    req.write(bodyBuffer);
    req.end();
  });
};

// Delete from Cloudinary
const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return;

  const crypto = require("crypto");
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}`;
  const signature = crypto.createHash("sha1").update(paramsToSign + apiSecret).digest("hex");

  const boundary = `----DeleteBoundary${Date.now()}`;
  let body = `--${boundary}\r\nContent-Disposition: form-data; name="public_id"\r\n\r\n${publicId}\r\n`;
  body += `--${boundary}\r\nContent-Disposition: form-data; name="api_key"\r\n\r\n${apiKey}\r\n`;
  body += `--${boundary}\r\nContent-Disposition: form-data; name="timestamp"\r\n\r\n${timestamp}\r\n`;
  body += `--${boundary}\r\nContent-Disposition: form-data; name="signature"\r\n\r\n${signature}\r\n`;
  body += `--${boundary}--\r\n`;

  return new Promise((resolve) => {
    const bodyBuffer = Buffer.from(body);
    const req = https.request({
      hostname: "api.cloudinary.com",
      path: `/v1_1/${cloudName}/${resourceType}/destroy`,
      method: "POST",
      headers: { "Content-Type": `multipart/form-data; boundary=${boundary}`, "Content-Length": bodyBuffer.length },
    }, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => resolve(JSON.parse(data || "{}")));
    });
    req.on("error", () => resolve({}));
    req.write(bodyBuffer);
    req.end();
  });
};

// Smart upload: if Cloudinary configured, upload there. Otherwise store as base64 (small files only).
const smartUpload = async (base64Data, options = {}) => {
  const hasCloudinary = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY;

  if (hasCloudinary) {
    const result = await uploadToCloudinary(base64Data, options);
    return { url: result.url, publicId: result.publicId, isCloudinary: true, bytes: result.bytes };
  }

  // Fallback: store base64 directly (only safe for small files < 8MB)
  const sizeBytes = (base64Data.length * 3) / 4;
  if (sizeBytes > 8 * 1024 * 1024) {
    throw new Error("File too large for direct storage. Please configure Cloudinary in .env for large file support.");
  }
  return { url: base64Data, publicId: null, isCloudinary: false, bytes: sizeBytes };
};

module.exports = { uploadToCloudinary, deleteFromCloudinary, smartUpload };
