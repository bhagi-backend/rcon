const Company = require('../models/companyModel'); 
const User =require('../models/userModel.js')
const catchAsync = require("../utils/catchAsync").catchAsync;
const AppError = require('../utils/appError'); 
const path = require('path');
const fs = require('fs');
const { isValidObjectId } = require('mongoose');
const { CognitoIdentityProviderClient, CreateGroupCommand } = require('@aws-sdk/client-cognito-identity-provider');
const getUploadPath = require("../utils/pathFun");
const multerWrapper = require('../utils/multerFun');
require('dotenv').config();  
const { AWS_REGION } = process.env;

// Initialize the Cognito client
const cognitoClient = new CognitoIdentityProviderClient({
  region: AWS_REGION || 'ap-south-1' // Use the environment variable or default to 'ap-south-1'
});

exports.createCompany = catchAsync(async (req, res, next) => {
  try {
    const newCompany = new Company(req.body);
    await newCompany.save();
    const { companyName } = newCompany.companyDetails;

    const params = {
      GroupName: companyName, 
      UserPoolId: process.env.COGNITO_USER_POOL_ID, 
      Description: `Group for ${companyName}`,
    };

    try {
      const command = new CreateGroupCommand(params);
      await cognitoClient.send(command); // Send the command to create the group
    } catch (error) {
      return next(new AppError(`Failed to create Cognito group: ${error.message}`, 500));
    }
    
    res.status(201).json({
      status: 'success',
      data: {
        company: newCompany,
      },
    });
  } catch (err) {
    res.status(400).json({
      status: 'failed',
      data: {
        error: err.toString(),
      },
    });
  }
});

const uploadLogo = multerWrapper();

// Middleware to handle file uploads
exports.uploadLogoMiddleware = uploadLogo.single('logo');
exports.updateLogo = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return next(new AppError('Invalid company ID format', 400));
  }

  const company = await Company.findById(id);
  if (!company) {
    return next(new AppError('Company document not found', 404));
  }

  if (!req.file) {
    return next(new AppError('No logo file uploaded or wrong field name', 400));
  }

  const file = req.file;
  const fileName = `${Date.now()}-${file.originalname}`;

  const { relativePath, uploadToS3 } = getUploadPath(id, fileName, "utilities/documents");

  // ✅ Upload directly to S3
  await uploadToS3(file.buffer, file.mimetype);

  // ✅ Save S3 path in DB
  company.uploadLogo = relativePath;
  await company.save();

  res.status(200).json({
    status: 'success',
    data: company
  });
});


const uploadDocuments = multerWrapper().fields([
  { name: 'logo' },
  { name: 'gstNo' },
  { name: 'companyPanNo' },
  { name: 'companyTanNo' },
  { name: 'agreementDocument' }
]);

// Middleware to handle file uploads
exports.uploadDocumentsMiddleware = uploadDocuments;

exports.updateDocuments = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return next(new AppError('Invalid company ID format', 400));
  }

  const company = await Company.findById(id);
  if (!company) {
    return next(new AppError('Company document not found', 404));
  }
  
  if (!company.companyDocuments) {
    company.companyDocuments = {};
  }

  if (req.files) {
    const documentFields = ['gstNo', 'companyPanNo', 'companyTanNo', 'agreementDocument'];

    for (const field of documentFields) {
      if (req.files[field] && req.files[field][0]) {
        const file = req.files[field][0];
        const fileName = `${Date.now()}-${file.originalname}`;

        const { relativePath, uploadToS3 } = getUploadPath(id, fileName, "utilities/documents");

        // Upload to S3 (no sharp involved)
        await uploadToS3(file.buffer, file.mimetype);

        // Save relative path in DB
        company.companyDocuments[field] = relativePath;
      }
    }
  }

  Object.keys(req.body).forEach(key => {
    if (!['gstNo', 'companyPanNo', 'companyTanNo', 'agreementDocument', 'logo'].includes(key)) {
      company[key] = req.body[key];
    }
  });

  await company.save();

  res.status(200).json({
    status: 'success',
    data: company
  });
});

// Controller to get the logo for a SampleCompany
exports.getLogo = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return next(new AppError('Invalid SampleCompany ID format', 400));
  }

  const sampleCompany = await Company.findById(id);
  if (!sampleCompany) {
    return next(new AppError('SampleCompany document not found', 404));
  }

  const fileName = sampleCompany.uploadLogo;
  if (!fileName) {
    return next(new AppError('No logo found for the specified SampleCompany', 404));
  }

  const fullPath = path.join(__dirname, '../', fileName.replace(/\\/g, '/'));

  res.sendFile(fullPath, (err) => {
    if (err) {
      return next(new AppError('Error sending the logo file', 500));
    }
  });
});

exports.getDocument = catchAsync(async (req, res, next) => {
  try {
    const { id, type } = req.query;

    if (!isValidObjectId(id)) {
      return next(new AppError('Invalid company ID format', 400));
    }

    const company = await Company.findById(id);
    if (!company) {
      return next(new AppError('Company document not found', 404));
    }

    const fileName = company.companyDocuments[type];
    if (!fileName) {
      return next(new AppError(`No ${type} document found for the specified company`, 404));
    }

    const filePath = path.join(__dirname, '../', fileName);

    if (!fs.existsSync(filePath)) {
      return next(new AppError('File not found on the server', 404));
    }

    res.sendFile(filePath, (err) => {
      if (err) {
        return next(new AppError('Error sending the document file', 500));
      }
    });
  } catch (err) {
    res.status(400).json({
      status: 'failed',
      data: {
        error: err.toString(),
      },
    });
  }
});
exports.getAllCompanies = catchAsync(async (req, res, next) => {
  const companies = await Company.find({ isDelete: false }) // ✅ Filter deleted companies
    .sort({ createdAt: -1 })
    .populate("sites");

  // For each company, also fetch its Admin user
  const filteredCompanies = await Promise.all(
    companies.map(async (company) => {
      const companyObj = company.toObject();

      // filter enabled modules
      const companyEnableModules = companyObj.companyEnableModules || {};
      const filteredModules = {};
      for (const [key, value] of Object.entries(companyEnableModules)) {
        if (value === true) {
          filteredModules[key] = value;
        }
      }

      // fetch admin user for this company
      const adminUser = await User.findOne({
        companyId: company._id,
        role: "Admin",
        department: "Company Admin",
      }).select("firstName lastName email contactNumber empId role department");

      return {
        ...companyObj,
        companyEnableModules: filteredModules,
        adminUser: adminUser || null, // attach admin user if exists
      };
    })
  );

  res.status(200).json({
    status: "success",
    results: filteredCompanies.length,
    data: {
      companies: filteredCompanies,
    },
  });
});


exports.updateCompany = catchAsync(async (req, res, next) => {
  const company = await Company.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate('sites');

  if (!company) {
    return next(new AppError('No company found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      company,
    },
  });
});

exports.deleteCompany = catchAsync(async (req, res, next) => {
  const company = await Company.findByIdAndUpdate(
    req.params.id,
    { isDelete: true },
    { new: true, runValidators: true }
  );

  if (!company) {
    return next(new AppError('No company found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'Company marked as deleted successfully',
    data: company,
  });
});

