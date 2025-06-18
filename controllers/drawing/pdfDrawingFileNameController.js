const ArchitectureToRoRegister = require("../../models/drawingModels/architectureToRoRegisterModel");
const { catchAsync } = require("../../utils/catchAsync");
const fs = require("fs");
const AppError = require("../../utils/appError");
const path = require("path");
const multerWrapper = require('../../utils/multerFun');
const  getUploadPath  = require("../../utils/pathFun");

const ArchitectureToRoRequest = require("../../models/drawingModels/architectureToRoRequestedModel");

const roToSiteRequest = require("../../models/drawingModels/roToSiteLevelRequestedModel");

const upload = multerWrapper();
exports.uploadDrawingPhoto = upload.single("pdfDrawingFileName");
exports.updatePdfInLatestRevisions = catchAsync(async (req, res, next) => {
    if (!req.file) {
      return next(new AppError("No file uploaded", 400));
  }

  const drawing = req.drawing || await ArchitectureToRoRegister.findById(req.params.id);
  if (!drawing) {
      return next(new AppError('Drawing not found', 404));
  }

  const fileExtension = path.extname(req.file.originalname);
  const newFilename = `drawing-ArchitectureToRoRegister-${drawing._id}-${Date.now()}${fileExtension}`;
  req.file.filename = newFilename;
  const companyId = req.user.companyId;
  const { fullPath, relativePath } = getUploadPath(companyId, newFilename, "drawings", drawing.siteId);

  fs.writeFile(fullPath, req.file.buffer, async (err) => {
      if (err) {
          return next(new AppError('Failed to save uploaded file.', 400));
      }

      const { revisionType } = req.query;
      const revisionMap = {
          'Architect': drawing.acceptedArchitectRevisions,
          'RO': drawing.acceptedRORevisions,
          'SiteHead': drawing.acceptedSiteHeadRevisions,
          'Site': drawing.acceptedSiteRevisions,
      };

      const revisionsArray = revisionMap[revisionType];
      if (!revisionsArray) {
          return next(new AppError("Invalid revision type specified", 400));
      }
      const latestRevision = revisionsArray[revisionsArray.length - 1];
      if (!latestRevision) {
          return next(new AppError("No revisions found for this drawing", 404));
      }
      console.log("relativePath",relativePath)
      latestRevision.pdfDrawingFileName = relativePath;
      
      const result = await drawing.save();

      res.status(200).json({
          status: "success",
          data: {
              result,
          },
      });
  });
});




// Function to resize and save drawing photo
exports.resizeDrawingPhotoforRfi = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  // Retrieve the drawing by ID or create if it does not exist
  if (!req.drawing) {
    req.drawing = await ArchitectureToRoRequest.findById(req.params.id);
  }

  if (!req.drawing) {
    return next(new AppError('Drawing not found', 404));
  }

  // Define new file name and upload path
  const fileExtension = path.extname(req.file.originalname);
  const newFilename = `request-ArchitectureToRoRequest-${req.drawing._id}-${Date.now()}${fileExtension}`;
 // req.file.filename = newFilename;
  const companyId = req.user.companyId;
  
  // Get the full path for saving the file
  const { fullPath, relativePath } = getUploadPath(companyId, newFilename, "drawings", req.drawing.siteId);

  // Save the file to the specified location
  fs.writeFile(fullPath, req.file.buffer, (err) => {
    if (err) {
      return next(new AppError('Failed to save uploaded file.', 500));
    }
    next();
  });
  req.file.filename = relativePath;
});

// Function to resize and save drawing photo
exports.resizeDrawingPhotoforRoRfi = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  // Retrieve the drawing by ID or create if it does not exist
  if (!req.drawing) {
    req.drawing = await roToSiteRequest.findById(req.params.id);
  }

  if (!req.drawing) {
    return next(new AppError('Drawing not found', 404));
  }

  // Define new file name and upload path
  const fileExtension = path.extname(req.file.originalname);
  const newFilename = `request-roToSiteRequest-${req.drawing._id}-${Date.now()}${fileExtension}`;
  // req.file.filename = newFilename;
  const companyId = req.user.companyId;
  
  // Get the full path for saving the file
  const { fullPath,relativePath } = getUploadPath(companyId, newFilename, "drawings", req.drawing.siteId);

  // Save the file to the specified location
  fs.writeFile(fullPath, req.file.buffer, (err) => {
    if (err) {
      return next(new AppError('Failed to save uploaded file.', 500));
    }
    next();
  });
  req.file.filename = relativePath;
});

// Function to update the PDF in the latest revision of ArchitectureToRoRequest
exports.updatePdfInLatestRevisionsforRfi = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { revisionType } = req.query; // Specify revision type through query

  if (!req.file) {
    return next(new AppError("No file uploaded", 400));
  }

  // Fetch the specific ArchitectureToRoRequest document by ID
  const architectureToRoRequest = await ArchitectureToRoRequest.findById(id);
  if (!architectureToRoRequest) {
    return next(new AppError("No drawing found with that ID", 404));
  }

  

  architectureToRoRequest.pdfDrawingFileName = req.file.filename;

  // Save the updated ArchitectureToRoRequest document
  await architectureToRoRequest.save();

  res.status(200).json({
    status: "success",
    data: {
      architectureToRoRequest,
    },
  });
});




// Function to update the PDF in the latest revision of ArchitectureToRoRequest
exports.updatePdfInLatestRevisionsforRoRfi = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { revisionType } = req.query; // Specify revision type through query

  if (!req.file) {
    return next(new AppError("No file uploaded", 400));
  }

  // Fetch the specific ArchitectureToRoRequest document by ID
  const Request = await roToSiteRequest.findById(id);
  if (!Request) {
    return next(new AppError("No drawing found with that ID", 404));
  }

  

  Request.pdfDrawingFileName = req.file.filename;

  // Save the updated ArchitectureToRoRequest document
  await Request.save();

  res.status(200).json({
    status: "success",
    data: {
      Request,
    },
  });
});
