
const SampleCompany = require("../models/sampleCompantModel");
const catchAsync = require("../utils/catchAsync").catchAsync;
const AppError = require("../utils/appError");
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { isValidObjectId } = require('mongoose');

// Configure Multer for Logos
const multerStorageLogos = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/sampleCompanies/logos');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const fileName = `${Date.now()}-${file.originalname}`;
        cb(null, fileName);
    }
});

const multerFilterLogos = (req, file, cb) => {
    if (file.mimetype.startsWith("image")) {
        cb(null, true);
    } else {
        cb(new AppError('Not a valid image file type! Please upload only images.', 400), false);
    }
};

const uploadLogo = multer({ storage: multerStorageLogos, fileFilter: multerFilterLogos });

// Configure Multer for Documents
const multerStorageDocuments = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/sampleCompanies/documents');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const fileName = `${Date.now()}-${file.originalname}`;
        cb(null, fileName);
    }
});

const multerFilterDocuments = (req, file, cb) => {
    if (file.mimetype.startsWith("application") || file.mimetype.startsWith("image")) {
        cb(null, true);
    } else {
        cb(new AppError('Not a valid file type! Please upload only images or documents.', 400), false);
    }
};

const uploadDocuments = multer({
    storage: multerStorageDocuments,
    fileFilter: multerFilterDocuments
}).fields([
    { name: 'gstNo' },
    { name: 'companyPanNo' },
    { name: 'companyTanNo' },
    { name: 'agreementDocument' }
]);

// Middleware to handle file uploads
exports.uploadLogoMiddleware = uploadLogo.single('logo');
exports.uploadDocumentsMiddleware = uploadDocuments

// Controller to create a new SampleCompany
exports.createSampleCompany = catchAsync(async (req, res, next) => {
    const newSampleCompany = new SampleCompany(req.body);
    await newSampleCompany.save();
    res.status(201).json({
        status: "success",
        data: {
            sampleCompany: newSampleCompany
        }
    });
});

// Controller to update the logo for a SampleCompany
exports.updateLogo = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
        return next(new AppError('Invalid SampleCompany ID format', 400));
    }

    const sampleCompany = await SampleCompany.findById(id);
    if (!sampleCompany) {
        return next(new AppError('SampleCompany document not found', 404));
    }

    if (!req.file) {
        return next(new AppError('No logo file uploaded or wrong field name', 400));
    }

    sampleCompany.uploadLogo = req.file.filename;
    await sampleCompany.save();

    res.status(200).json({
        status: 'success',
        data: sampleCompany
    });
});
exports.updateDocuments = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
        return next(new AppError('Invalid SampleCompany ID format', 400));
    }

    const sampleCompany = await SampleCompany.findById(id);
    if (!sampleCompany) {
        return next(new AppError('SampleCompany document not found', 404));
    }

    // Initialize companyDocuments if not already defined
    sampleCompany.companyDocuments = sampleCompany.companyDocuments || {};

    // Handle file uploads and update fields
    if (req.files.gstNo) {
        sampleCompany.companyDocuments.gstNo = req.files.gstNo[0]?.filename || sampleCompany.companyDocuments.gstNo;
    }
    if (req.files.agreementDocument) {
        sampleCompany.companyDocuments.agreementDocument = req.files.agreementDocument[0]?.filename || sampleCompany.companyDocuments.agreementDocument;
    }
    if (req.files.companyPanNo) {
        sampleCompany.companyDocuments.companyPanNo = req.files.companyPanNo[0]?.filename || sampleCompany.companyDocuments.companyPanNo;
    }
    if (req.files.companyTanNo) {
        sampleCompany.companyDocuments.companyTanNo = req.files.companyTanNo[0]?.filename || sampleCompany.companyDocuments.companyTanNo;
    }

    await sampleCompany.save();

    res.status(200).json({
        status: 'success',
        data: sampleCompany
    });
});

// Controller to get the logo for a SampleCompany
exports.getLogo = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
        return next(new AppError('Invalid SampleCompany ID format', 400));
    }

    const sampleCompany = await SampleCompany.findById(id);
    if (!sampleCompany) {
        return next(new AppError('SampleCompany document not found', 404));
    }

    const fileName = sampleCompany.uploadLogo;
    if (!fileName) {
        return next(new AppError('No logo found for the specified SampleCompany', 404));
    }

    const filePath = path.join(__dirname, '../uploads/sampleCompanies/logos', fileName);

    res.sendFile(filePath, (err) => {
        if (err) {
            return next(new AppError('Error sending the logo file', 500));
        }
    });
});

exports.getDocument = catchAsync(async (req, res, next) => {
    const { id, type } = req.params;

    // Validate ObjectId
    if (!isValidObjectId(id)) {
        return next(new AppError('Invalid SampleCompany ID format', 400));
    }

    // Find the SampleCompany by ID
    const sampleCompany = await SampleCompany.findById(id);
    if (!sampleCompany) {
        return next(new AppError('SampleCompany document not found', 404));
    }

    // Retrieve the file name directly from companyDocuments object
    const fileName = sampleCompany.companyDocuments[type];
    if (!fileName) {
        return next(new AppError(`No ${type} document found for the specified SampleCompany`, 404));
    }

    const filePath = path.join(__dirname, '../uploads/sampleCompanies/documents', fileName);

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
        return next(new AppError('File not found on the server', 404));
    }

    // Send the file
    res.sendFile(filePath, (err) => {
        if (err) {
            return next(new AppError('Error sending the document file', 500));
        }
    });
});


// Controller to get all SampleCompanies
exports.getAllSampleCompanies = catchAsync(async (req, res, next) => {
    // Find all SampleCompany documents
    const sampleCompanies = await SampleCompany.find();

    // Respond with the data
    res.status(200).json({
        status: 'success',
        results: sampleCompanies.length,
        data: {
            sampleCompanies
        }
    });
});

