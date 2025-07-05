const NewPnm = require("../../models/pnmModels/newPnmModel");
const express = require("express");
const AppError = require("../../utils/appError");
const catchAsync = require("../../utils/catchAsync").catchAsync;
const AssetCode = require("../../models/pnmModels/assetCodeModel");
const { isValidObjectId } = require("mongoose");
const fs = require("fs");
const path = require("path");
const User = require("../../models/userModel");
const SharpProcessor = require("../../utils/sharps");
const PdfProcessor = require("../../utils/pdfCompress");
const  getUploadPath  = require("../../utils/pathFun");
const multerWrapper = require('../../utils/multerFun');

const upload = multerWrapper();
exports.uploadDocuments = upload.array("documents");
exports.handleDocumentUpload = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const companyId = req.user.companyId;

  // Find the NewPnm document by ID
  const newPnm = await NewPnm.findById(id);
  if (!newPnm) {
    return next(new AppError("NewPnm document not found", 404));
  }

  // Check if any files were uploaded
  if (!req.files || req.files.length === 0) {
    return next(new AppError("No files uploaded", 400));
  }

  // Iterate over the uploaded files with proper async/await
  for (let index = 0; index < req.files.length; index++) {
    const file = req.files[index];
    const fileName = `${Date.now()}-${file.originalname}`;
    const { relativePath, uploadToS3 } = getUploadPath(
      companyId,
      fileName,
      "newPnm/documents"
    );

    // Upload the file to S3
    await uploadToS3(file.buffer, file.mimetype);

    // Add or update the corresponding document reference
    if (newPnm.documents[index]) {
      newPnm.documents[index].documentFile = relativePath;
    } else {
      newPnm.documents.push({ documentFile: relativePath });
    }
  }

  // Save the updated NewPnm document
  await newPnm.save();

  res.status(200).json({
    status: "success",
    data: newPnm,
  });
});

exports.addDocuments = catchAsync(async (req, res, next) => {
  const { id } = req.params; 
  const { documents } = req.body;
  const newPnm = await NewPnm.findById(id);
  if (!newPnm) {
    return next(new AppError("NewPnm document not found", 404));
  }

  if (!Array.isArray(documents)) {
    return next(new AppError("Documents field must be an array", 400));
  }

  if (newPnm.documents && newPnm.documents.length > 0) {
  
    newPnm.documents = documents;
  } else { 
    newPnm.documents = documents;
  }
  await newPnm.save();
  res.status(200).json({
    status: "success",
    data: newPnm,
  });
});


exports.updateExistingDocument= catchAsync(async (req, res, next) => {
  const { newPnmId, documentId } = req.params;
  const updatedDocumentData = req.body; 

    const updatedNewPnm = await NewPnm.findOneAndUpdate(
      { _id: newPnmId, "documents._id": documentId },
      { $set: { "documents.$": updatedDocumentData } },
      { new: true, runValidators: true }
    );

    if (!updatedNewPnm) {
      return res.status(404).json({ message: "NewPnm or document not found" });
    }
    res.status(200).json({
      status: "success",
      data: updatedNewPnm,
    });
   
});
const uploads = multerWrapper();
exports.uploadDocument = uploads.single("document");
exports.updateExistingDocumentFile= catchAsync(async (req, res, next) => {
  const { newPnmId, documentId } = req.params;
  const companyId = req.user.companyId;
  const newPnm = await NewPnm.findById(newPnmId);
    if (!newPnm) {
        return next(new AppError("NewPnm document not found", 404));
    }

    const document = newPnm.documents.id(documentId);
    if (!document) {
        return next(new AppError("Document not found in NewPnm", 404));
    }

    if (!req.file) {
        return next(new AppError("No document file uploaded", 400));
    }
  
    const file = req.file;
    const fileName = `${Date.now()}-${file.originalname}`;
  
    const { fullPath, relativePath } = getUploadPath(companyId, fileName, "newPnm/documents");
  
    fs.writeFileSync(fullPath, file.buffer);

    document.documentFile = relativePath;

    await newPnm.save();

    res.status(200).json({
        status: "success",
        data: {
            newPnm,
            message: "Document file updated successfully"
        },
    });
});



// const generateUniqueCode = async () => {
//   let code;
//   let existingCodes;

//   do {
//     code = Math.floor(1000 + Math.random() * 9000).toString();
//     existingCodes = await NewPnm.findOne({ subCode: `${code}` });
//   } while (existingCodes);

//   return code;
// };


// exports.createNewPnm = async (req, res) => {
//   const { assetCode } = req.body;
//   try {
//     if (!isValidObjectId(assetCode)) {
//       return res.status(400).json({
//         status: "error",
//         message: "Invalid assetCode format",
//       });
//     }
//     const assetCodeDoc = await AssetCode.findById(assetCode);
//     if (!assetCodeDoc) {
//       return res.status(404).json({
//         status: "error",
//         message: "AssetCode not found",
//       });
//     }
//     const uniqueCode = await generateUniqueCode();
//     const subCode = `${assetCodeDoc.assetCode}-sc-${uniqueCode}`;

//     // Create new NewPnm document
//     const newPnm = await NewPnm.create({
//       assetCode: assetCodeDoc._id,
//       subCode,
//     });

//     res.status(201).json({
//       status: "success",
//       data: {
//         newPnm,
//       },
//     });
//   } catch (err) {
//     res.status(400).json({
//       status: "error",
//       message: err.message,
//     });
//   }
// };

// Create NewPnm document
exports.createNewPnm = catchAsync(async (req, res, next) => {
  const { assetCode, ...otherFields } = req.body;
  const userId =  req.user.id;
    const user = await User.findById(userId);
    if (!user) {
        return next(new AppError("User not found", 404));
    }
    const companyId = user.companyId;
  if (!isValidObjectId(assetCode)) {
    return next(new AppError("Invalid assetCode format", 400));
  }

  const assetCodeDoc = await AssetCode.findById(assetCode);
  if (!assetCodeDoc) {
    return next(new AppError("AssetCode not found", 404));
  }

  const newPnmData = {
    assetCode: assetCodeDoc._id,
    createdBy: userId,
    companyId:companyId,
    ...otherFields 
  };

 
  const newPnm = await NewPnm.create(newPnmData);

  res.status(201).json({
    status: "success",
    data: newPnm,
  });
});
exports.getAllNewPnms = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const user = await User.findById(userId).exec();
  if (!user) {
      return res.status(404).json({
          status: "fail",
          message: "User not found",
      });
  }

  const companyId = user.companyId;
    const newPnms = await NewPnm.find({companyId}).populate('assetCode');
  
    res.status(200).json({
      status: "success",
      data: {
        newPnms,
      },
    });
  });
  

// Get a single NewPnm document
exports.getNewPnm = catchAsync(async (req, res, next) => {
  const newPnm = await NewPnm.findById(req.params.id);
  if (!newPnm) {
    return next(new AppError("No NewPnm document found with that ID", 404));
  }
  
  res.status(200).json({
    status: "success",
    data: newPnm,
  });
});

exports.getDocument = catchAsync(async (req, res, next) => {
  const { id, documentName } = req.params;
  const newPnm = await NewPnm.findById(id);
  if (!newPnm) {
    return next(new AppError("No NewPnm document found with that ID", 404));
  }

  // Find the document based on documentName
  const document = newPnm.documents.find(doc => doc.documentName === documentName);
  if (!document || !document.documentFile) {
    return next(new AppError("Document not found", 404));
  }

  // Define the file path
  const filePath = document.documentFile;

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return next(new AppError("File does not exist", 404));
  }

  // Send the file for download
  res.download(filePath, (err) => {
    if (err) {
      return next(new AppError("Failed to download the file", 500));
    }
  });
});

exports.deleteNewPnm = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const deletedDocument = await NewPnm.findByIdAndDelete(id);
  if (!deletedDocument) {
      return next(new AppError('No document found with that ID', 404));
  }

  res.status(204).json({
      status: 'success',
      data: null, 
  });
});

exports.updateNewPnm = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const updateData = req.body;
  const updatedDocument = await NewPnm.findByIdAndUpdate(id, updateData, {
      new: true, 
      // runValidators: true, 
  });
  if (!updatedDocument) {
      return next(new AppError('No document found with that ID', 404));
  }

  res.status(200).json({
      status: 'success',
      data: {
          updatedDocument,
      },
  });
});

exports.getNewPnmByEquipmentTypeAndType = catchAsync(async (req, res) => {
  const { equipmentType, type } = req.query;
  const userId = req.user.id;
  const user = await User.findById(userId).exec();
  if (!user) {
      return res.status(404).json({
          status: "fail",
          message: "User not found",
      });
  }

  const companyId = user.companyId;

  if (!equipmentType || !type) {
      return res.status(400).json({
          status: 'fail',
          message: 'Both equipmentType and type query parameters are required.'
      });
  }

  const newPnms = await NewPnm.find({ companyId, equipmentType, type }).populate('assetCode');

  if (newPnms.length === 0) {
      return res.status(404).json({
          status: 'fail',
          message: 'No documents found for the specified equipmentType and type.'
      });
  }

  res.status(200).json({
      status: 'success',
      data: {
          newPnms
      }
  });
});

exports.getPnmsByStatus = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const user = await User.findById(userId).exec();
  if (!user) {
      return res.status(404).json({
          status: "fail",
          message: "User not found",
      });
  }

  const companyId = user.companyId;
  const { status } = req.query; 

  if (!status || (status !== 'Not Assigned' && status !== 'Assigned')) {
      return res.status(400).json({
          status: "fail",
          message: "Status must be 'Not Assigned' or 'Assigned'.",
      });
  }

  const pnms = await NewPnm.find({
      companyId,
      status, 
    })
    .populate({
        path: 'createdBy',
        select: 'firstName'
    })
    .populate({
        path: 'assetCode',
        populate: [
            {
                path: 'createdBy', 
                select: 'firstName' 
            },
            {
                path: 'formNo', 
                select: 'activity formNo'
            }
        ]
    })
    .exec();

  if (!pnms.length) {
      return next(new AppError("No PNM documents found for this user with the specified status", 400));
  }

  res.status(200).json({
      status: 'success',
      data: pnms,
  });
});