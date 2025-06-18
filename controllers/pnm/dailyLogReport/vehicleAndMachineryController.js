const VehicleAndMachinery = require("../../../models/pnmModels/dailyLogReportModel/vehicleAndMachineryModel");
const Site = require("../../../models/sitesModel"); 
const express = require("express");
const AppError = require('../../../utils/appError');
const catchAsync = require("../../../utils/catchAsync").catchAsync;

// Generate abbreviation from siteName
function generateAbbreviation(siteName) {
  return siteName.split(' ')
    .map(word => word[0].toUpperCase())
    .join('');
}

async function generateTransitionId(vehicleAndMachinery) {
  
  const site = await Site.findById(vehicleAndMachinery.siteName);
  if (!site) throw new AppError('Site not found', 404); // Custom error handling

  const siteName = site.siteName;
  const siteAbbreviation = generateAbbreviation(siteName);
  const typeInitial = vehicleAndMachinery.type === 'Hire' ? 'H' : 'O';
  const assetType = vehicleAndMachinery.equipmentType[0].toUpperCase();
  const currentDate = new Date();
  const dateString = `${currentDate.getFullYear()}${String(currentDate.getMonth() + 1).padStart(2, '0')}${String(currentDate.getDate()).padStart(2, '0')}`;

  const transitionIdPrefix = `${siteAbbreviation}-DLR-${typeInitial}-${assetType}-${dateString}`;

  const latestLog = await VehicleAndMachinery.findOne({
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

exports.createVehicleAndMachinery = async (req, res, next) => {
  try {
    req.body.transitionId = await generateTransitionId(req.body);
    const newEntry = await VehicleAndMachinery.create(req.body);
  
    res.status(201).json({
      status: 'success',
      data: {
        vehicleAndMachinery: newEntry,
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
};
  exports.getAllVehicleAndMachinery = catchAsync(async (req, res, next) => {
    const entries = await VehicleAndMachinery.find().populate('siteName').populate('assetCode');;
    res.status(200).json({
      status: 'success',
      results: entries.length,
      data: {
        vehicleAndMachinery: entries,
      },
    });
  });
  
  exports.updateVehicleAndMachinery = catchAsync(async (req, res, next) => {
    const updatedEntry = await VehicleAndMachinery.findByIdAndUpdate(req.params.id, req.body, {
      new: true, 
      runValidators: true, 
    });
  
    if (!updatedEntry) {
      return res.status(404).json({
        status: 'error',
        message: 'No entry found with that ID',
      });
    }
  
    res.status(200).json({
      status: 'success',
      data: {
        vehicleAndMachinery: updatedEntry,
      },
    });
  });
  exports.deleteVehicleAndMachinery = catchAsync(async (req, res, next) => {
    const deletedEntry = await VehicleAndMachinery.findByIdAndDelete(req.params.id);
  
    if (!deletedEntry) {
      return res.status(404).json({
        status: 'error',
        message: 'No entry found with that ID',
      });
    }
  
    res.status(204).json({
      status: 'success',
      data: null,
    });
  });


