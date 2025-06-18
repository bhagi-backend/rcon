const ArchitecturePendingRegisters = require('../../models/drawingModels/architecturePendingRegisterModel');
const RoPendingRegisters = require('../../models/drawingModels/roPendingRegisterModel');
const { catchAsync } = require("../../utils/catchAsync");
const AppError = require("../../utils/appError");


exports.getAllArchitecturePendingBySiteId = catchAsync(async (req, res, next) => {
    const { siteId, status } = req.query;
  
    const query = {};
  
    if (status) {
      query.status = status;
    }
  
    if (siteId) {
      query.siteId = siteId;
    }
  
    try {
      // Query all pending registers and populate related fields
      const pendingRegisters = await ArchitecturePendingRegisters.find(query)
        .populate('category')  // If `category` field is populated
        .populate('designDrawingConsultant')  // If `designDrawingConsultant` field is populated
        .populate('siteId');  // Ensure to populate if needed
  
      // Respond with success and data
      res.status(200).json({
        status: 'success',
        results: pendingRegisters.length,
        data: {
          pendingRegisters,
        },
      });
    } catch (error) {
      // Handle errors during retrieval
      return next(new AppError('Failed to retrieve pending registers', 400));
    }
  });



exports.getAllRoPendingBySiteId = catchAsync(async (req, res, next) => {
    const { siteId, status } = req.query;
  
    const query = {};
  
    if (status) {
      query.status = status;
    }
  
    if (siteId) {
      query.siteId = siteId;
    }
  
    try {
      // Query all pending registers and populate related fields
      const pendingRegisters = await RoPendingRegisters.find(query)
        .populate('category')  // Populate related fields as needed
        .populate('designDrawingConsultant') 
        .populate('siteId');
  
      // Respond with success and data
      res.status(200).json({
        status: 'success',
        results: pendingRegisters.length,
        data: {
          pendingRegisters,
        },
      });
    } catch (error) {
      // Handle errors during retrieval
      return next(new AppError('Failed to retrieve pending registers', 400));
    }
  });