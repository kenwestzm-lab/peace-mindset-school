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
  if (!acc) throw new Error("No Cloudinary accounts configured.");

  const { cloudName, apiKey, apiSecret } = acc;
  // Strip codecs from mime type e.g. "audio/webm;codecs=opus" -> "audio/webm"
  const mime = (options.mimeType || "image/jpeg").split(";")[0].trim();

  let resourceType = "image";
  if (mime.startsWith("video/")) resourceType = "video";
  else if (mime.startsWith("audio/")) resourceType = "raw"; // raw bypasses ALL transformations

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
  
  // Fix data URI - strip codecs from data URI header
  let dataUri = base64Data;
  if (base64Data.startsWith("data:")) {
    // Replace any data:audio/webm;codecs=opus;base64 with data:audio/webm;base64
    dataUri = base64Data.replace(/^data:[^;]+(?:;codecs=[^;]+)?;base64,/, `data:${mime};base64,`);
  } else {
    dataUri = `data:${mime};base64,${base64Data}`;
  }

  const folder = options.folder || "peace-mindset";
  const timestamp = Math.round(Date.now() / 1000);

  // ONLY folder and timestamp in signature - nothing else
  const signParams = { folder, timestamp: timestamp.toString() };

  const paramString = Object.keys(signParams)
    .sort()
    .map(k => `${k}=${signParams[k]}`)
    .join("&");

  const signature = crypto.createHash("sha1").update(paramString + apiSecret).digest("hex");

  const boundary = `----CloudinaryBoundary${Date.now()}`;
  // ONLY send what is signed - no extra fields like transformation
  const fields = { folder, timestamp: timestamp.toString(), file: dataUri, api_key: apiKey, signature };

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

const smartUpload = async (base64Data, options = {}) => {
  if (ACCOUNTS.length === 0) throw new Error("Cloudinary not configured.");
  // Try ALL accounts in order until one succeeds
  let lastError;
  for (let i = 0; i < ACCOUNTS.length; i++) {
    const acc = ACCOUNTS[(currentIndex + i) % ACCOUNTS.length];
    try {
      const result = await uploadToCloudinary(base64Data, options, acc);
      currentIndex = (currentIndex + i + 1) % ACCOUNTS.length;
      return { url: result.url, publicId: result.publicId, isCloudinary: true, bytes: result.bytes };
    } catch (err) {
      console.error(`Cloudinary account ${i+1} failed:`, err.message);
      lastError = err;
    }
  }
  throw new Error("All Cloudinary accounts failed: " + lastError.message);
};

const smartDelete = async (publicId, resourceType = "image") => {
  return deleteFromCloudinary(publicId, resourceType);
};

module.exports = { uploadToCloudinary, deleteFromCloudinary, smartUpload, smartDelete };
