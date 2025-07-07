const AssetCode = require("../../models/pnmModels/assetCodeModel");
const Site = require("../../models/sitesModel");
const BreakDownReport = require("../../models/pnmModels/breakDownReportModel");
const MiscellaneousReport = require("../../models/pnmModels/miscellaneousReportModel");
const express = require("express");
const AppError = require("../../utils/appError");
const catchAsync = require("../../utils/catchAsync").catchAsync;
const path = require('path');
const fs = require('fs');
const User = require("../../models/userModel");
const SharpProcessor = require("../../utils/sharps");
const PdfProcessor = require("../../utils/pdfCompress");
const  getUploadPath  = require("../../utils/pathFun");
const multerWrapper = require('../../utils/multerFun');

const generateUniqueCode = async () => {
  let code;
  let existingCodes;

  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
    existingCodes = await AssetCode.findOne({ subCode: new RegExp(`SC-${code}$`) });
  } while (existingCodes);

  return code;
};


exports.createAssetCode = catchAsync(async (req, res, next) => {
  // Convert name to uppercase if provided
  if (req.body.name) {
    req.body.name = req.body.name.toUpperCase();
  }

  // Check if asset code or name already exists
  const existingAssetCode = await AssetCode.findOne({
    $or: [
      { assetCode: req.body.assetCode },
      { name: req.body.name }
    ]
  });

  if (existingAssetCode) {
    const messages = [];

    // Check for asset code uniqueness
    if (existingAssetCode.assetCode === req.body.assetCode) {
      messages.push('Asset code must be unique');
    }

    // Check for name uniqueness
    if (existingAssetCode.name === req.body.name) {
      messages.push('Name must be unique');
    }

    // Return error messages if any exist
    if (messages.length > 0) {
      return res.status(200).json({
        status: 'fail',
        errors: messages
      });
    }
  }

  // Retrieve user ID from authentication
  const userId = req.user.id;
  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError("User not found", 404));
  }

  // Generate a unique subCode
  const uniqueCode = await generateUniqueCode();
  req.body.subCode = `${req.body.assetCode}-SC-${uniqueCode}`;
  req.body.createdBy = userId;
  req.body.companyId = user.companyId;

  try {
    // Create the new asset code
    const newAssetCode = await AssetCode.create(req.body);
    res.status(201).json({
      status: "success",
      data: {
        assetCode: newAssetCode,
      },
    });
  } catch (error) {
    console.error('Error creating asset code:', error);
    return next(new AppError('Failed to create asset code', 400));
  }
});



exports.getAllAssetCodes = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError("User not found", 404));
  }
  const companyId = user.companyId;
    const AssetCodes = await AssetCode.find({companyId}) .populate('activity')
  .populate( 'formNo');
    res.status(200).json({
        status: "success",
        data: {
            AssetCodes,
        },
    });
});

exports.getAssetCode = catchAsync(async (req, res, next) => {
    const assetCode = await AssetCode.findById(req.params.id) .populate('activity')
    .populate( 'formNo');;

    if (!assetCode) {
        return next(new AppError("No AssetCode found with that ID", 404));
    }

    res.status(200).json({
        status: "success",
        data: {
            assetCode,
        },
    });
});
exports.updateAssetCode = catchAsync(async (req, res, next) => {

  if (!req.params.id) {
    return next(new AppError("AssetCode ID is missing", 400));
  }

  try {
    let existingAssetCode = await AssetCode.findById(req.params.id);

    if (!existingAssetCode) {
      return next(new AppError("No AssetCode found with that ID", 404));
    }
    const existingAssetWithSameCodeOrName = await AssetCode.findOne({
      $and: [
        { _id: { $ne: req.params.id } }, 
        {
          $or: [
            { assetCode: req.body.assetCode }, 
            { name: req.body.name.toUpperCase() } 
          ]
        }
      ]
    });
    if (existingAssetWithSameCodeOrName) {
      const errorMessages = [];

      if (existingAssetWithSameCodeOrName.assetCode === req.body.assetCode) {
        errorMessages.push('Asset code must be unique');
      }

      if (existingAssetWithSameCodeOrName.name.toUpperCase() === req.body.name.toUpperCase()) {
        errorMessages.push('Name must be unique');
      }
      if( existingAssetCode.assetCode === req.body.assetCode && existingAssetCode.name === req.body.name.toUpperCase()){
      errorMessages.push('Asset code and name must be unique');  
    }

      return res.status(200).json({ status: "fail",  errorMessages });
    }
    if (req.body.assetCode) {
      existingAssetCode.assetCode = req.body.assetCode;
      const uniqueCode = await generateUniqueCode();
      existingAssetCode.subCode = `${req.body.assetCode}-SC-${uniqueCode}`;
    }

    if (req.body.type) {
      existingAssetCode.type = req.body.type;
    }

    if (req.body.name) {
      existingAssetCode.name = req.body.name.toUpperCase();
    }

    if (req.body.documents) {
      existingAssetCode.documents = req.body.documents;
    }
    if (req.body.query) {
      existingAssetCode.query = req.body.query;
    }

    await existingAssetCode.save();
    res.status(200).json({
      status: "success",
      data: {
        assetCode: existingAssetCode,
      },
    });
  } catch (error) {
    console.error('Error updating asset code:', error);
    return next(new AppError('Failed to update asset code', 500));
  }
});

exports.deleteAssetCode = catchAsync(async (req, res, next) => {
  const assetCode = await AssetCode.findByIdAndDelete(req.params.id);

  if (!assetCode) {
      return next(new AppError("No AssetCode found with that ID", 404));
  }

  res.status(204).json({
      status: "success",
      data: null,
  });
});


// breck down report code

function generateAbbreviation(siteName) {
  return siteName.split(' ')
    .map(word => word[0].toUpperCase())
    .join('');
}

async function generateTransitionId(breakDownReport) {
  
  const site = await Site.findById(breakDownReport.siteName);
  if (!site) throw new AppError('Site not found', 404); // Custom error handling

  const siteName = site.siteName;
  const siteAbbreviation = generateAbbreviation(siteName);
  const typeInitial = breakDownReport.type === 'Hire' ? 'H' : 'O';
  const assetType = breakDownReport.equipmentType.split(' ')
  .map(word => word[0].toUpperCase())
  .join('');
  const currentDate = new Date();
  const dateString = `${currentDate.getFullYear()}${String(currentDate.getMonth() + 1).padStart(2, '0')}${String(currentDate.getDate()).padStart(2, '0')}`;

  const transitionIdPrefix = `${siteAbbreviation}-BDR-${typeInitial}-${assetType}-${dateString}`;

  const latestLog = await BreakDownReport.findOne({
    transitionId: { $regex: `^${transitionIdPrefix}` }  
  }).sort({ transitionId: -1 }).limit(1);  

  let id = '001';  
  if (latestLog) {
    const lastId = parseInt(latestLog.transitionId.slice(-3), 10);  
    id = String(lastId + 1).padStart(3, '0'); 
  }

  if (parseInt(id, 10) > 100) throw new AppError('Exceeded the maximum number of IDs for today', 400);

  return `${transitionIdPrefix}${id}`;
}
  //breakDownReport details
  exports.createBreakDownReport = catchAsync(async (req, res) => {
    try {
      req.body.transitionId = await generateTransitionId(req.body);
    const newBreakDownReport = await BreakDownReport.create(req.body);
    res.status(201).json({
      status: "success",
      data: {
        breakDownReport: newBreakDownReport,
      },
    });
    } catch (err) {
      res.status(201).json({
        status: 'failed',
        data: {
          error: err.toString(),
        },
      });
    }
  });


exports.updateBreakDownReport = catchAsync(async (req, res, next) => {
  const updatedReport = await BreakDownReport.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true, 
  });

  if (!updatedReport) {
    return next(new AppError('No breakDown report found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      breakDownReport: updatedReport,
    },
  });
});

exports.deleteBreakDownReport = catchAsync(async (req, res, next) => {
  const report = await BreakDownReport.findByIdAndDelete(req.params.id);

  if (!report) {
    return next(new AppError('No breakDown report found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});


const upload = multerWrapper();
// Middleware to handle single file upload
exports.uploadDocument =upload.single("documentAttached");
exports.updateDocument = catchAsync(async (req, res, next) => {
  try {
  const { id } = req.params; 
  const companyId = req.user.companyId;
  

  if (!req.file) {
    return next(new AppError('No document file uploaded or wrong field name', 400));
  }
  const file = req.file;
  const fileName = `${Date.now()}-${file.originalname}`;

  const { fullPath, relativePath,uploadToS3} = getUploadPath(companyId, fileName, "breakDown/documents");

  await uploadToS3(file.buffer, file.mimetype);

  const updatedReport = await BreakDownReport.findByIdAndUpdate(
    id,
    { documentAttached:relativePath},
    { new: true, runValidators: true }
  );

  if (!updatedReport) {
    return next(new AppError('No BreakDownReport found with that ID', 404));
  }
  res.status(200).json({
    status: 'success',
    data: {
      report: updatedReport,
    },
  });
}catch(err){
  res.status(201).json({
    status : "failed",
    data:{
      error: err.toString(),
    }
  })
}
});
exports.getDocument = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const report = await BreakDownReport.findById(id);
  if (!report || !report.documentAttached) {
    return next(new AppError('No document found for this report ID', 404));
  }
  const documentPath = path.join(__dirname, `../../${report.documentAttached}`);

  if (!fs.existsSync(documentPath)) {
    return next(new AppError('Document not found on server', 404));
  }
  res.sendFile(documentPath, (err) => {
    if (err) {
      return next(new AppError('Error sending the image file', 400));
    }
  });
});

  exports.getAllBreakDownReports = catchAsync(async (req, res, next) => {
    const breakDownReports = await BreakDownReport.find().populate("assetCode siteName");
    res.status(200).json({
      status: "success",
      data: {
        breakDownReports,
      },
    });
  });
  

  // for miscellaneous
  function generateAbbreviationForMiscellaneous(siteName) {
    return siteName.split(' ')
      .map(word => word[0].toUpperCase())
      .join('');
  }
  
  async function generateTransitionIdForMiscellaneous(miscellaneousReport) {
    
    const site = await Site.findById(miscellaneousReport.siteName);
    if (!site) throw new AppError('Site not found', 404); // Custom error handling
  
    const siteName = site.siteName;
    const siteAbbreviation = generateAbbreviationForMiscellaneous(siteName);
    const assetType = miscellaneousReport.equipmentType.split(' ')
    .map(word => word[0].toUpperCase())
    .join('');
    const currentDate = new Date();
    const dateString = `${currentDate.getFullYear()}${String(currentDate.getMonth() + 1).padStart(2, '0')}${String(currentDate.getDate()).padStart(2, '0')}`;

    const transitionIdPrefix = `${siteAbbreviation}-ML-${typeInitial}-${assetType}-${dateString}`;
  
    const latestLog = await MiscellaneousReport.findOne({
      transitionId: { $regex: `^${transitionIdPrefix}` }  
    }).sort({ transitionId: -1 }).limit(1);  
  
    let id = '001';  
    if (latestLog) {
      const lastId = parseInt(latestLog.transitionId.slice(-3), 10);  
      id = String(lastId + 1).padStart(3, '0'); 
    }
  
    if (parseInt(id, 10) > 100) throw new AppError('Exceeded the maximum number of IDs for today', 400);
  
    return `${transitionIdPrefix}${id}`;
  }
    //breakDownReport details
    exports.createMiscellaneous = catchAsync(async (req, res) => {
      try {
        req.body.transitionId = await generateTransitionIdForMiscellaneous(req.body);
      const miscellaneousReport = await MiscellaneousReport.create(req.body);
      res.status(201).json({
        status: "success",
        data: {
          miscellaneousReport: miscellaneousReport,
        },
      });
      } catch (err) {
        res.status(201).json({
          status: 'failed',
          data: {
            error: err.toString(),
          },
        });
      }
    });
    exports.getAllMiscellaneous = catchAsync(async (req, res, next) => {
      const miscellaneousReport = await MiscellaneousReport.find().populate("assetCode siteName");
      res.status(200).json({
        status: "success",
        data: {
          miscellaneousReport,
        },
      });
    });

exports.updateMiscellaneousReport = catchAsync(async (req, res, next) => {
  const updatedReport = await MiscellaneousReport.findByIdAndUpdate(req.params.id, req.body, {
    new: true, 
    runValidators: true,
  });

  if (!updatedReport) {
    return next(new AppError('No miscellaneous report found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      miscellaneousReport: updatedReport,
    },
  });
});
exports.deleteMiscellaneousReport = catchAsync(async (req, res, next) => {
  const report = await MiscellaneousReport.findByIdAndDelete(req.params.id);

  if (!report) {
    return next(new AppError('No miscellaneous report found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
