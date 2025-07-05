const AWS = require("aws-sdk");
const path = require("path");

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const bucketName = "rconfiles";


const getUploadPath = (companyId, fileName, subDirectory = "", siteId = "") => {
  const safeCompanyId = companyId.toString();
  const safeSiteId = siteId.toString();

  const key = path.posix.join(
    "uploads",
    safeCompanyId,
    safeSiteId || "",
    subDirectory,
    fileName
  );
  const fullPath = `s3://${bucketName}/${key}`;
console.log(bucketName,"bucketName")

  return {
    fullPath,
    relativePath: key,
    uploadToS3: async (buffer, mimetype) => {
      const params = {
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
      };
      await s3.upload(params).promise();
    },
  };
};

module.exports = getUploadPath;

// const fs = require('fs');
// const path = require('path');

// const ensureDirectoryExists = (directory) => {
//   if (!fs.existsSync(directory)) {
//     fs.mkdirSync(directory, { recursive: true });
//   }
// };

// const getUploadPath = (companyId, fileName, subDirectory = "", siteId = "") => {
//   const safeCompanyId = companyId.toString();
//   const safeSiteId = siteId.toString();
//   const uploadDir = siteId
//     ? path.join(__dirname, `../uploads/${safeCompanyId}/${safeSiteId}`, subDirectory)
//     : path.join(__dirname, `../uploads/${safeCompanyId}`, subDirectory);

//   // Ensure the directory exists or create it
//   ensureDirectoryExists(uploadDir);

//   const filePath = path.join(uploadDir, fileName);
//   return {
//     fullPath: filePath,
//     relativePath: path.posix.join("uploads", safeCompanyId, safeSiteId ? safeSiteId : "", subDirectory, fileName),
//   };
// };

// module.exports = getUploadPath;
