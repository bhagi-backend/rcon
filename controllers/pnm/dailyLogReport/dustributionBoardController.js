const Distribution = require("../../../models/pnmModels/dailyLogReportModel/distributionBoardModel");
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

// Generate transitionId
async function generateTransitionId(DitributionBoard) {
  // Get siteName from siteId
  const site = await Site.findById(DitributionBoard.siteName);
  if (!site) throw new AppError('Site not found', 404); // Custom error handling

  const siteName = site.siteName;
  const siteAbbreviation = generateAbbreviation(siteName);
  const typeInitial = DitributionBoard.type === 'Hire' ? 'H' : 'O';
  const assetType = 'DB'; 
  const currentDate = new Date();
  const dateString = `${currentDate.getFullYear()}${String(currentDate.getMonth() + 1).padStart(2, '0')}${String(currentDate.getDate()).padStart(2, '0')}`;

  const transitionIdPrefix = `${siteAbbreviation}-DLR-${typeInitial}-${assetType}-${dateString}`;

  const latestLog = await Distribution.findOne({
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

// Create a new PowerTool entry
exports.createDitributionBoard = catchAsync(async (req, res, next) => {
try {
  req.body.transitionId = await generateTransitionId(req.body);
  const newEntry = await Distribution.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      DitributionBoard: newEntry,
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

// Get all PowerTool entries
exports.getAllDitributionBoards = catchAsync(async (req, res, next) => {
  const entries = await Distribution.find().populate('siteName').populate('assetCode');;
  res.status(200).json({
    status: 'success',
    results: entries.length,
    data: {
        DitributionBoards: entries,
    },
  });
});

exports.updateDitributionBoard = catchAsync(async (req, res, next) => {
  const updatedEntry = await Distribution.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!updatedEntry) {
    return next(new AppError('No entry found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
        DitributionBoard: updatedEntry,
    },
  });
});
exports.deleteDistributionBoard = catchAsync(async (req, res, next) => {
  const deletedEntry = await Distribution.findByIdAndDelete(req.params.id);

  if (!deletedEntry) {
    return next(new AppError('No entry found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
