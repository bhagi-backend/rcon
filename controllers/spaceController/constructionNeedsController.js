const ConstructionNeeds = require("../../models/spaceModels/constructionNeedsModel");
const catchAsync = require("../../utils/catchAsync").catchAsync;
const AppError = require("../../utils/appError");
const path = require("path");
const fs = require("fs");
const { isValidObjectId } = require("mongoose");
const SharpProcessor = require("../../utils/sharps");
const PdfProcessor = require("../../utils/pdfCompress");
const multerWrapper = require('../../utils/multerFun');
const  getUploadPath  = require("../../utils/pathFun");

exports.createConstructionNeeds = catchAsync(async (req, res) => {
  try {
    console.log("userObject",req.user)
    const userId = req.user.id;
    const newconstructionNeeds = await ConstructionNeeds.create({
      ...req.body,
      folderCreatedBy: userId,
    });

    res.status(201).json({
      status: "success",
      data: {
        constructionNeeds: newconstructionNeeds,
      },
    });
  } catch (err) {
    // Check for duplicate key error (MongoDB error code 11000)
    if (err.code === 11000 && err.keyPattern && err.keyPattern.fName) {
      return res.status(200).json({
        status: "failed",
        message: `${req.body.fName} already exists`, // Use template literal here
      });
    }

    // Handle other errors
    res.status(400).json({
      status: "failed",
      data: {
        error: err.message,
      },
    });
  }
});

exports.getAllConstructionNeeds = catchAsync(async (req, res) => {
  try {
    const constructionNeeds = await ConstructionNeeds.find()
      .populate({
        path: "folderCreatedBy",
        // select: 'name email',
      })
      .populate({
        path: "contactDetails.fileCreatedBy",
      });
    res.status(200).json({
      status: "success",
      results: constructionNeeds.length,
      data: {
        constructionNeeds,
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
const upload = multerWrapper();
exports.uploadFImage = upload.single("fImage");

exports.updateFImage = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const  companyId  = req.user.companyId;
  if (!isValidObjectId(id)) {
    return next(new AppError("Invalid constructionNeeds ID format", 400));
  }

  const constructionNeeds = await ConstructionNeeds.findById(id);
  if (!constructionNeeds) {
    return next(new AppError("ConstructionNeeds document not found", 404));
  }

  
  if (!req.file) {
    console.log("No file in request:", req.file);
    return next(
      new AppError("No image file uploaded or wrong field name", 400)
    );
  }
  const file = req.file;
  const fileName = `${Date.now()}-${file.originalname}`;

    const { fullPath, relativePath } = getUploadPath(companyId, fileName, "constructionNeeds/images");

    fs.writeFileSync(fullPath, file.buffer);

    const sharpProcessor = new SharpProcessor(file.buffer, { format: path.extname(file.originalname).substring(1), quality: 70 });
    const { originalSize, compressedSize } = await sharpProcessor.compressImage(fullPath);

    console.log(`Original size: ${originalSize} bytes`);
    console.log(`Compressed size: ${compressedSize} bytes`);
    console.log(`Saved compressed image at: ${fullPath}`);
  constructionNeeds.fImage = relativePath;
  await constructionNeeds.save();
  const savedImageSize = fs.statSync(fullPath).size;
  function formatSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
  }

  // Send response with image sizes
  res.status(200).json({
    status: "success",
    data: {
      constructionNeeds,
      originalSize,
      compressedSize,
      savedImageSize: formatSize(savedImageSize)
    },
  });
});

exports.getFImage = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return next(new AppError("Invalid constructionNeeds ID format", 400));
  }

  const constructionNeeds = await ConstructionNeeds.findById(id);
  if (!constructionNeeds) {
    return next(new AppError("constructionNeeds document not found", 404));
  }

  const fileName = constructionNeeds.fImage;
  if (!fileName) {
    return next(new AppError("No image file found for the specified ID", 404));
  }

  // Path to the uploaded image
  const fullPath = path.join(__dirname, "../../", fileName);

  // Send the image file to the client
  res.sendFile(fullPath, (err) => {
    if (err) {
      return next(new AppError("Error sending the image file", 500));
    }
  });
});

exports.updateContactDetails = catchAsync(async (req, res, next) => {
  // console.log("request",req);
  console.log('User object:', req.user); 
  const userId = req.user.id;
  console.log('User id:', req.user.id); 
  const { id } = req.params;
  console.log("id",id)
  const {
    companyName,
    location,
    address,
    contactNumber,
    mailId,
    typesOfServiceProviding,
    description,
    constructionNeedContactName,
    constructionNeedContactRole,
  } = req.body;

  // Validate ObjectId
  if (!isValidObjectId(id)) {
    return next(new AppError("Invalid ConstructionNeeds ID format", 400));
  }

  // Find the ConstructionNeeds by ID
  const constructionNeeds = await ConstructionNeeds.findById(id);
  if (!constructionNeeds) {
    return next(new AppError("ConstructionNeeds document not found", 404));
  }

  // Determine the next CNo
  const nextCNo = constructionNeeds.contactDetails.length
    ? Math.max(
        ...constructionNeeds.contactDetails.map((detail) => detail.cNo)
      ) + 1
    : 1;

  // Create a new contactDetails object with automatically assigned `cNo`
  const newContactDetail = {
    cNo: nextCNo,
    companyName,
    location,
    address,
    contactNumber,
    mailId,
    typesOfServiceProviding,
    description,
    constructionNeedContactName,
    constructionNeedContactRole,
    uploadFile: req.file ? req.file.filename : undefined, // Assuming you handle file uploads separately
    fileCreatedBy: userId,
  };

  // Push the new contact detail to the array
  constructionNeeds.contactDetails.push(newContactDetail);

  // Save the updated ConstructionNeeds document
  await constructionNeeds.save();

  res.status(200).json({
    status: "success",
    data: constructionNeeds,
  });
});

exports.uploadFile = upload.single("uploadFile");


exports.updateUploadFile = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const  companyId  = req.user.companyId;
  // Validate ObjectId
  if (!isValidObjectId(id)) {
    return next(new AppError("Invalid ConstructionNeeds ID format", 400));
  }

  // Find the ConstructionNeeds by ID
  const constructionNeeds = await ConstructionNeeds.findById(id);
  if (!constructionNeeds) {
    return next(new AppError("ConstructionNeeds document not found", 404));
  }

  // Check if there are any contact details
  if (constructionNeeds.contactDetails.length === 0) {
    return next(new AppError("No contact details available to update", 404));
  }

  // Find the latest contact detail
  const latestContactDetail = constructionNeeds.contactDetails.reduce(
    (maxDetail, detail) => (detail.cNo > maxDetail.cNo ? detail : maxDetail),
    constructionNeeds.contactDetails[0]
  );

  // Handle file upload
  if (!req.file) {
    return next(new AppError("No file uploaded or wrong field name", 400));
  }

  const file = req.file;
  const fileName = `${Date.now()}-${file.originalname}`;
 const { fullPath, relativePath } = getUploadPath(companyId, fileName, "constructionNeeds/files");

    fs.writeFileSync(fullPath, file.buffer);
 
  // Process and compress the uploaded PDF
  const pdfProcessor = new PdfProcessor(req.file.buffer);


  try {
    let compressionResult;

    // Check the file type and process accordingly
    if (req.file.mimetype === 'application/pdf') {
      // Process and compress the uploaded PDF
      const pdfProcessor = new PdfProcessor(req.file.buffer);
      compressionResult = await pdfProcessor.compressPdf(fullPath);
    } else if (['image/jpeg', 'image/jpg', 'image/png'].includes(req.file.mimetype)) {
      // Process and compress the uploaded image
      const sharpProcessor = new SharpProcessor(req.file.buffer);
      compressionResult = await sharpProcessor.compressImage(fullPath);
    } else {
      return next(new AppError("Unsupported file type", 400));
    }
    latestContactDetail.uploadFile = relativePath;

    await constructionNeeds.save();

    // Respond with success
    res.status(200).json({
      status: "success",
      data: {
        constructionNeeds,
        compressionResult,
      },
    });
  } catch (error) {
    return next(new AppError(`PDF processing failed: ${error.message}`, 400));
  }
});

exports.getFileByCNo = catchAsync(async (req, res, next) => {
  const { id, cNo } = req.params;

  // Validate ObjectId
  if (!isValidObjectId(id)) {
    return next(new AppError("Invalid ConstructionNeeds ID format", 400));
  }

  // Find the ConstructionNeeds by ID
  const constructionNeeds = await ConstructionNeeds.findById(id);
  if (!constructionNeeds) {
    return next(new AppError("ConstructionNeeds document not found", 404));
  }

  // Find the contact detail with the specified cNo
  const contactDetail = constructionNeeds.contactDetails.find(
    (detail) => detail.cNo === parseInt(cNo)
  );
  if (!contactDetail) {
    console.error(
      `Contact detail with cNo ${cNo} not found in ConstructionNeeds document with ID ${id}`
    );
    return next(
      new AppError("Contact detail with the specified cNo not found", 404)
    );
  }

  if (!contactDetail.uploadFile) {
    return next(new AppError("No file available for the specified cNo", 404));
  }

  // Path to the uploaded file
  const filePath = path.join(__dirname, "../../", contactDetail.uploadFile);

  // Check if file exists before sending
  if (!fs.existsSync(filePath)) {
    return next(new AppError("File not found on the server", 404));
  }

  // Send the file to the client
  res.sendFile(filePath, (err) => {
    if (err) {
      return next(new AppError("Error sending the file", 500));
    }
  });
});

exports.deleteConstructionNeeds = catchAsync(async (req, res, next) => {
  const constructionNeeds = await ConstructionNeeds.findByIdAndDelete(
    req.params.id
  );

  if (!constructionNeeds) {
    return next(new AppError("No ConstructionNeeds found with that ID", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
  res.status(200).json({
    status: "success",
    message: "Folder deleted successfully deleted",
  });
});

exports.deleteFile = catchAsync(async (req, res) => {
  const { id, cNo } = req.params;

  // Find the ConstructionNeeds by its ID
  const constructionNeeds = await ConstructionNeeds.findById(id);

  // If ConstructionNeeds is not found, return a 404 error
  if (!constructionNeeds) {
    return res.status(404).json({
      status: "fail",
      message: "ConstructionNeeds not found",
    });
  }

  // Find the index of the contact detail with the specified cNo
  const contactIndex = constructionNeeds.contactDetails.findIndex(
    (contact) => contact.cNo === parseInt(cNo)
  );

  // If the specified contact detail is not found, return a 404 error
  if (contactIndex === -1) {
    return res.status(404).json({
      status: "fail",
      message: "Contact detail not found",
    });
  }

  // Remove the contact detail from the array
  constructionNeeds.contactDetails.splice(contactIndex, 1);

  // Save the updated document
  await constructionNeeds.save();

  // Return success response
  res.status(200).json({
    status: "success",
    message: "Contact detail deleted successfully",
  });
});
