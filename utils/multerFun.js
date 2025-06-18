const multer = require('multer');
const AppError = require('./appError'); 
const multerWrapper = () => {
  const multerStorage = multer.memoryStorage();
  
  const multerFilter = (req, file, cb) => {
    if (
      file.mimetype.startsWith("application") ||
      file.mimetype.startsWith("image")
    ) {
      cb(null, true);
    } else {
      cb(new AppError("Not an image! Please upload only images.", 400), false);
    }
  };

  return multer({ storage: multerStorage,
     fileFilter: multerFilter
    });
};

module.exports = multerWrapper;
