const crypto = require("crypto");
require("dotenv").config();

const KEK = Buffer.from(process.env.MASTER_KEK, "hex");

function envelopeDecrypt(payload) {
  // 1. Decrypt DEK using KEK
  const decipherDek = crypto.createDecipheriv(
    "aes-256-gcm",
    KEK,
    Buffer.from(payload.dekIv, "hex")
  );

  decipherDek.setAuthTag(Buffer.from(payload.dekTag, "hex"));

  let DEK = decipherDek.update(payload.encryptedDEK, "hex");
  DEK = Buffer.concat([DEK, decipherDek.final()]);

  // 2. Decrypt actual data using DEK
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    DEK,
    Buffer.from(payload.dataIv, "hex")
  );

  decipher.setAuthTag(Buffer.from(payload.dataTag, "hex"));

  let data = decipher.update(payload.encryptedData, "hex", "utf8");
  data += decipher.final("utf8");

  return data;
}

module.exports = { envelopeDecrypt };
