const Drawing = require("../models/drawingModel");
const { catchAsync } = require("../utils/catchAsync");
const multer = require("multer");
const fs = require("fs");
const AppError = require("../utils/appError");
const path = require("path");
const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new AppError("Not an image! Please upload only images.", 400), false);
  }
};
const upload = multer({ storage: multerStorage, fileFilter: multerFilter });
exports.createOne = catchAsync(async (req, res, next) => {
  const newDrawing = await Drawing.create(req.body);
  res.status(200).json({
    status: "success",
    data: newDrawing,
  });
});
exports.uploadDrawingPhoto = upload.single("drawingFileName");
exports.resizeDrawingPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();
  // Ensure req.drawing is populated if not present
  if (!req.drawing) {
    req.drawing = await Drawing.findById(req.params.id);
  }
  const newFilename = `drawing-${req.drawing.id}-${Date.now()}.jpeg`;
  req.file.filename = newFilename;

  // Move uploaded file instead of resizing
  const filePath = path.join(__dirname, "../uploads/drawings", newFilename);
  fs.writeFile(filePath, req.file.buffer, (err) => {
    if (err) {
      return next(new AppError("Failed to save uploaded file.", 500));
    }
    next();
  });
});

exports.updateDrawing = catchAsync(async (req, res, next) => {
  // Update the drawing information
  const updateData = req.body;
  if (req.file) {
    updateData.drawingFileName = req.file.filename;
  }
  const updatedDrawing = await Drawing.findByIdAndUpdate(
    req.params.id,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  );
  if (!updatedDrawing) {
    return next(new AppError("No drawing found with that ID", 404));
  }
  res.status(200).json({
    status: "success",
    data: updatedDrawing,
  });
});

exports.getDrawing = catchAsync(async (req, res, next) => {
  const drawing = await Drawing.findById(req.params.id);
  if (!drawing || !drawing.drawingFileName) {
    return next(
      new AppError("No drawing found with that ID or file name.", 404)
    );
  }
  const filePath = path.join(
    __dirname,
    "../uploads/drawings",
    drawing.drawingFileName
  );
  res.download(filePath, drawing.drawingFileName, (err) => {
    if (err) {
      return next(new AppError("Failed to download the file.", 500));
    }
  });
});
exports.getAllDrawing = catchAsync(async (req, res, next) => {
  const allDrawings = await Drawing.find({});
  res.status(200).json({
    status: "success",
    data: allDrawings,
  });
});
