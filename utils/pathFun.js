const fs = require('fs');
const path = require('path');

const ensureDirectoryExists = (directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true }); 
  }
};

const getUploadPath = (companyId, fileName, subDirectory = "", siteId = "") => {
  const safeCompanyId = companyId.toString(); 
  const safeSiteId = siteId.toString(); 
  const uploadDir = siteId
    ? path.join(__dirname, `../uploads/${safeCompanyId}/${safeSiteId}`, subDirectory) 
    : path.join(__dirname, `../uploads/${safeCompanyId}`, subDirectory); 

  // Ensure the directory exists or create it
  ensureDirectoryExists(uploadDir); 

  const filePath = path.join(uploadDir, fileName); 
  return {
    fullPath: filePath,
    relativePath: path.posix.join("uploads", safeCompanyId, safeSiteId ? safeSiteId : "", subDirectory, fileName), 
  };
};

module.exports = getUploadPath; 
