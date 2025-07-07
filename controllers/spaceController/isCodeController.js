

const IsCode = require("../../models/spaceModels/isCodeModel");
const catchAsync = require("../../utils/catchAsync").catchAsync;
const AppError = require("../../utils/appError");
const path = require("path");
 const fs = require("fs");
// const multer = require("multer");
const { isValidObjectId } = require("mongoose");
const SharpProcessor = require("../../utils/sharps");
const PdfProcessor = require("../../utils/pdfCompress");
const  getUploadPath  = require("../../utils/pathFun");
const multerWrapper = require('../../utils/multerFun');

exports.createIsCode = catchAsync(async (req, res) => {
  try {
    const userId = req.user.id;
    const newIsCode = await IsCode.create({
      ...req.body,
      folderCreatedBy: userId,
    });

    res.status(201).json({
      status: "success",
      data: {
        isCode: newIsCode,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: "failed",
      data: {
        error: err.toString(),
      },
    });
  }
});

exports.getAllIsCodes = catchAsync(async (req, res) => {
  try {
    const isCodes = await IsCode.find()
      .populate({
        path: "folderCreatedBy",
         select: 'firstName email',
      })
      .populate({
        path: "files.fileCreatedBy",
        select: 'firstName email',
      });
    res.status(200).json({
      status: "success",
      results: isCodes.length,
      data: {
        isCodes,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: "failed",
      data: {
        error: err.toString(),
      },
    });
  }3
});
const upload = multerWrapper();
exports.uploadFImage = upload.single("fImage");

exports.updateFImage = catchAsync(async (req, res, next) => {
  try {
    const { id } = req.params;
    const  companyId  = req.user.companyId;
    const isCode = await IsCode.findById(id);
    if (!isCode) {
      return next(new AppError("IsCode document not found", 404));
    }

    if (!req.file) {
      console.log("No file in request:", req.file);
      return next(
        new AppError("No image file uploaded or wrong field name", 400)
      );
    }
   
    const file = req.file;
    const fileName = `${Date.now()}-${file.originalname}`;

    // Get paths for storing the file
    const { fullPath, relativePath,uploadToS3 } = getUploadPath(companyId, fileName, "isCodes/images");

    // Save image to disk
    await uploadToS3(file.buffer, file.mimetype);

    // const sharpProcessor = new SharpProcessor(file.buffer, { format: path.extname(file.originalname).substring(1), quality: 70 });
    // const { originalSize, compressedSize } = await sharpProcessor.compressImage(fullPath);

    // console.log(`Original size: ${originalSize} bytes`);
    // console.log(`Compressed size: ${compressedSize} bytes`);
    // console.log(`Saved compressed image at: ${fullPath}`);

    // Update the fImage field with the relative path
    isCode.fImage = relativePath;
    await isCode.save();

    // // Calculate and format the saved image size
    // const savedImageSize = fs.statSync(fullPath).size;
    // function formatSize(bytes) {
    //   const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    //   if (bytes === 0) return '0 Bytes';
    //   const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    //   return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    //}

    // Send the response
    res.status(200).json({
      status: "success",
      data: {
        isCode,
       // originalSize,
       // compressedSize,
        //savedImageSize: formatSize(savedImageSize),
      },
    });
  } catch (err) {
    res.status(400).json({
      status: "failed",
      data: {
        error: err.toString(),
      },
    });
  }
});

exports.getFImage = catchAsync(async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate the ObjectId format
    if (!isValidObjectId(id)) {
      return next(new AppError("Invalid IsCode ID format", 400));
    }

    // Find the IsCode document by ID
    const isCode = await IsCode.findById(id);
    if (!isCode) {
      return next(new AppError("IsCode document not found", 404));
    }

    // Get the file path from the document
    const filePath = isCode.fImage;
    if (!filePath) {
      return next(new AppError("No image file found for the specified ID", 404));
    }

    // Construct the full path to the image
    const fullPath = path.join(__dirname, "../../", filePath);

    // Check if the image file exists
    if (!fs.existsSync(fullPath)) {
      console.error("Image file does not exist:", fullPath); // Log the missing file
      return next(new AppError("Image file does not exist at the specified path", 404));
    }

    // Send the image file to the client
    res.sendFile(fullPath, (err) => {
      if (err) {
        console.error("Error sending file:", err); // Log the specific error
        return next(new AppError("Error sending the image file", 400));
      }
    });
  } catch (err) {
    console.error("Error in getFImage:", err); // Log the error for debugging
    res.status(400).json({
      status: "failed",
      data: {
        error: err.toString(),
      },
    });
  }
});

exports.updateFileName = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { fileName } = req.body;

  if (!isValidObjectId(id)) {
    return next(new AppError("Invalid IsCode ID format", 400));
  }

  const isCode = await IsCode.findById(id);
  if (!isCode) {
    return next(new AppError("IsCode document not found", 404));
  }

  // Determine the next `fNo` value
  const nextFNo = isCode.files.length
    ? Math.max(...isCode.files.map((file) => file.fNo)) + 1
    : 1;

  // Create a new file object with automatically assigned `fNo`
  const newFile = {
    fNo: nextFNo,
    fileName: fileName,
    fileCreatedBy: userId,
  };

  isCode.files.push(newFile);

  await isCode.save();

  res.status(200).json({
    status: "success",
    data: isCode,
  });
});

exports.uploadFile = upload.single("uploadFile");

exports.updateUploadFile = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const companyId = req.user.companyId;
  if (!isValidObjectId(id)) {
    return next(new AppError("Invalid IsCode ID format", 400));
  }

  const isCode = await IsCode.findById(id);
  if (!isCode) {
    return next(new AppError("IsCode document not found", 404));
  }

  if (isCode.files.length === 0) {
    return next(new AppError("No files to update", 404));
  }

  

  if (!req.file) {
    return next(new AppError("No file uploaded or wrong field name", 400));
  }
  const file = req.file;
  const fileName = `${Date.now()}-${file.originalname}`;
  const { fullPath, relativePath,uploadToS3 } = getUploadPath(companyId, fileName, "isCodes/files");

  // Save the file to disk
  await uploadToS3(file.buffer, file.mimetype);

  // Process and compress the uploaded PDF or image
  // let compressionResult;

  // if (req.file.mimetype === 'application/pdf') {
  //   // Process and compress the uploaded PDF
  //   const pdfProcessor = new PdfProcessor(req.file.buffer);
  //   compressionResult = await pdfProcessor.compressPdf(fullPath);
  // } else if (['image/jpeg', 'image/jpg', 'image/png'].includes(req.file.mimetype)) {
  //   // Process and compress the uploaded image
  //   const sharpProcessor = new SharpProcessor(req.file.buffer, { format: path.extname(file.originalname).substring(1), quality: 70 });
  //   compressionResult = await sharpProcessor.compressImage(fullPath);
  // } else {
  //   return next(new AppError("Unsupported file type", 400));
  // }

  // Find the file with the highest `fNo` and update its uploadFile path
  const latestFile = isCode.files.reduce(
    (maxFile, file) => (file.fNo > maxFile.fNo ? file : maxFile),
    isCode.files[0]
  );

  latestFile.uploadFile = relativePath; // Use relativePath from getUploadPath

  await isCode.save();

  // Calculate and format the saved file size
  // const savedFileSize = fs.statSync(fullPath).size;
  // function formatSize(bytes) {
  //   const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  //   if (bytes === 0) return '0 Bytes';
  //   const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  //   return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
  // }

  // Send the response
  res.status(200).json({
    status: "success",
    data: {
      isCode,
    //   compressionResult, // Include compression result in response
    //   savedFileSize: formatSize(savedFileSize),
     },
  });
});

exports.getFileByFNo = catchAsync(async (req, res, next) => {
  try {
    const { id, fNo } = req.params;

    if (!isValidObjectId(id)) {
      return next(new AppError("Invalid IsCode ID format", 400));
    }

    const isCode = await IsCode.findById(id);
    if (!isCode) {
      return next(new AppError("IsCode document not found", 404));
    }

    // Find the file with the specified `fNo`
    const file = isCode.files.find((file) => file.fNo === parseInt(fNo));
    if (!file) {
      return next(new AppError("File with the specified fNo not found", 404));
    }

    if (!file.uploadFile) {
      return next(new AppError("No file available for the specified fNo", 404));
    }

    // Path to the uploaded file
    const filePath = path.join(__dirname, "../../", file.uploadFile);

    // Send the file to the client
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(err); // Log the error for debugging
        return next(new AppError("Error sending the file: " + err.message, 500));
      }
    });
  } catch (err) {
    res.status(400).json({
      status: "failed",
      data: {
        error: err.toString(),
      },
    });
  }
});

exports.updateIsCodeById = catchAsync(async (req, res) => {
  const isCodeId = req.params.id;
  const updateData = req.body;
  const updatedIsCode = await IsCode.findByIdAndUpdate(isCodeId, updateData, {
    new: true,
    runValidators: true,
  });
  if (!updatedIsCode) {
    return res.status(400).json({
      status: "fail",
      message: "floor not found",
    });
  }
  res.status(200).json({
    status: "success",
    data: updatedIsCode,
  });
});

exports.deleteIsCode = catchAsync(async (req, res, next) => {
  const isCode = await IsCode.findByIdAndDelete(req.params.id);

  if (!isCode) {
    return next(new AppError("No AssetCode found with that ID", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

exports.deleteFile = catchAsync(async (req, res) => {
  const { id, fNo } = req.params;

  const isCode = await IsCode.findById(id);

  if (!isCode) {
    return res.status(404).json({
      status: "fail",
      message: "IsCode not found",
    });
  }

  // Find the index of the file with the specified fNo
  const fileIndex = isCode.files.findIndex(
    (file) => file.fNo === parseInt(fNo)
  );

  if (fileIndex === -1) {
    return res.status(404).json({
      status: "fail",
      message: "File not found",
    });
  }
  isCode.files.splice(fileIndex, 1);

  await isCode.save();

  res.status(200).json({
    status: "success",
    message: "File deleted successfully",
  });
});

exports.updateFileByFNo = catchAsync(async (req, res) => {
  const { id, fNo } = req.params;
  const updateData = req.body; // This contains the fields to update

  // Find the IsCode document by id
  const isCode = await IsCode.findById(id);

  if (!isCode) {
    return res.status(404).json({
      status: "fail",
      message: "IsCode not found",
    });
  }

  // Find the index of the file within the files array
  const fileIndex = isCode.files.findIndex(
    (file) => file.fNo === parseInt(fNo)
  );

  if (fileIndex === -1) {
    return res.status(404).json({
      status: "fail",
      message: "File not found",
    });
  }

  // Update the file fields
  const fileToUpdate = isCode.files[fileIndex];
  Object.keys(updateData).forEach((key) => {
    if (updateData[key] !== undefined) {
      fileToUpdate[key] = updateData[key];
    }
  });

  // Save the updated IsCode document
  await isCode.save();

  res.status(200).json({
    status: "success",
    data: {
      file: fileToUpdate,
    },
  });
});
