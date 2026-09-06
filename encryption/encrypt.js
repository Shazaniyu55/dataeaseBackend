const crypto = require("crypto");
require("dotenv").config();

const KEK = Buffer.from(process.env.MASTER_KEK, "hex");

function envelopeEncrypt(plainText) {
  // 1. Generate DEK (for data)
  const DEK = crypto.randomBytes(32);

  // 2. Encrypt data with DEK
  const ivData = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", DEK, ivData);

  let encryptedData = cipher.update(plainText, "utf8", "hex");
  encryptedData += cipher.final("hex");
  const dataTag = cipher.getAuthTag().toString("hex");

  // 3. Encrypt DEK with KEK (AES-256-GCM)
  const ivDek = crypto.randomBytes(12);
  const cipherDek = crypto.createCipheriv("aes-256-gcm", KEK, ivDek);

  let encryptedDEK = cipherDek.update(DEK, null, "hex");
  encryptedDEK += cipherDek.final("hex");
  const dekTag = cipherDek.getAuthTag().toString("hex");

  return {
    encryptedData,
    dataIv: ivData.toString("hex"),
    dataTag,
    encryptedDEK,
    dekIv: ivDek.toString("hex"),
    dekTag,
  };
}

module.exports = { envelopeEncrypt };
