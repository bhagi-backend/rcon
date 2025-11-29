const RfiTimeStamp = require('../../models/drawingModels/rfiTimeStampModel');
const { catchAsync } = require("../../utils/catchAsync");
const AppError = require("../../utils/appError");
const ArchitectureToRoRegister = require('../../models/drawingModels/architectureToRoRegisterModel');
const Company = require('../../models/companyModel');
const Site = require('../../models/sitesModel');
const User = require('../../models/userModel');


exports.createRfiTimeStamp = catchAsync(async (req, res, next) => {
  const {
    roRfiTimeStampDays,
    siteHeadRfiTimeStampDays,
    siteId,
    isDrawingAddFolder,
    drawingAddFolder,
    customizedView,
    rfiRaised,
    areYouReceivingHardCopiesFromAllConsultants,
    whichConsultantsHaveNotSubmittedHardCopies
  } = req.body;

  const companyId = req.user.companyId;
  const userId = req.user._id;
  // if (!companyId || !roRfiTimeStampDays || !siteHeadRfiTimeStampDays) {
  //   return next(
  //     new AppError(
  //       'All fields (companyId, roRfiTimeStampDays, siteHeadRfiTimeStampDays) are required.',
  //       400
  //     )
  //   );
  // }
  let rfiTimeStamp = await RfiTimeStamp.findOne({ companyId,siteId });

  if (rfiTimeStamp) {
    // Update existing document
    rfiTimeStamp.roRfiTimeStampDays = roRfiTimeStampDays;
    rfiTimeStamp.siteHeadRfiTimeStampDays = siteHeadRfiTimeStampDays;
    if (siteId) rfiTimeStamp.siteId = siteId;
    if (isDrawingAddFolder !== undefined) rfiTimeStamp.isDrawingAddFolder = isDrawingAddFolder;
    if (drawingAddFolder !== undefined) rfiTimeStamp.drawingAddFolder = drawingAddFolder;
    if (customizedView !== undefined) rfiTimeStamp.customizedView = customizedView;
    if (rfiRaised !== undefined) rfiTimeStamp.rfiRaised = rfiRaised;
    if (areYouReceivingHardCopiesFromAllConsultants !== undefined) {
      rfiTimeStamp.areYouReceivingHardCopiesFromAllConsultants = areYouReceivingHardCopiesFromAllConsultants;
    }
    if (whichConsultantsHaveNotSubmittedHardCopies !== undefined) {
      rfiTimeStamp.whichConsultantsHaveNotSubmittedHardCopies = whichConsultantsHaveNotSubmittedHardCopies;
    }
    await rfiTimeStamp.save();
  } else {
    // Create new document if no existing RFI timestamp
    // rfiTimeStamp = await RfiTimeStamp.create({
    //   companyId,
    //   siteId,
    //   createdBy: userId,
    //   roRfiTimeStampDays,
    //   siteHeadRfiTimeStampDays,
    //   isDrawingAddFolder,
    //   drawingAddFolder,
    //   customizedView,
    //   rfiRaised,
    //   areYouReceivingHardCopiesFromAllConsultants,
    //   whichConsultantsHaveNotSubmittedHardCopies
    // });
    rfiTimeStamp = await RfiTimeStamp.create({
  ...req.body,
  companyId,
  createdBy: userId
});

  }

  // Update related documents in ArchitectureToRoRegister
  await ArchitectureToRoRegister.updateMany(
    { companyId },
    {
      $set: {
        'acceptedArchitectRevisions.$[].roRfiTimeStampDays': roRfiTimeStampDays,
        'acceptedRORevisions.$[].siteHeadRfiTimeStampDays': siteHeadRfiTimeStampDays,
      },
    },
    { multi: true }
  );
  
  if (drawingAddFolder !== undefined && customizedView !== undefined && rfiRaised !== undefined) {
    const updatedCompany = await Company.findOneAndUpdate(
      { _id: companyId },
      {
        $set: {
          'companyEnableModules.drawingAddFolder': drawingAddFolder,
          'companyEnableModules.customizedView': customizedView,
        },
      },
      { new: true }
    );

    const updatedSite = await Site.findOneAndUpdate(
      { _id: siteId },
      {
        $set: {
          'enableModules.drawingAddFolder': drawingAddFolder,
          'enableModules.customizedView': customizedView,
          'enableModules.rfiRaised': rfiRaised,
        },
      },
      { new: true }
    );
    
    const updatedUsers = await User.updateMany(
      { 'permittedSites.siteId': siteId, 'permittedSites.enableModules.drawings': true },
      {
        $set: {
          'permittedSites.$[elem].enableModules.drawingAddFolder': drawingAddFolder,
          'permittedSites.$[elem].enableModules.customizedView': customizedView,
          'permittedSites.$[elem].enableModules.rfiRaised': rfiRaised,
          'permittedSites.$[elem].enableModules.areYouReceivingHardCopiesFromAllConsultants': areYouReceivingHardCopiesFromAllConsultants,
          'permittedSites.$[elem].enableModules.whichConsultantsHaveNotSubmittedHardCopies': whichConsultantsHaveNotSubmittedHardCopies,
        },
      },
      {
        runValidators: true,
        arrayFilters: [{ 'elem.siteId': siteId }],
      }
    );
    
    return res.status(200).json({
      status: 'success',
      success: true,
      data: rfiTimeStamp,
      updatedCompany,
      updatedSite,
      updatedUsers,
    });
  }
  res.status(200).json({
    status: 'success',
    success: true,
    data: rfiTimeStamp,
  });
});


exports.getRfiTimeStampById = catchAsync(async (req, res, next) => {
  const { companyId, department } = req.user;
  console.log(req.user.id)
  const { siteId } = req.query;

  const rfiTimeStamp = await RfiTimeStamp.findOne({ companyId, siteId });

  if (!rfiTimeStamp) {
    return res.status(404).json({
      status: "failed",
      message: "No RFI timestamp found for this company and site",
    });
  }

  // ---------------------------------------------
  // NEW LOGIC: Fetch users with drawingEditAccess
  // ---------------------------------------------

  let userFilter = {
    companyId,
    permittedSites: {
      $elemMatch: {
        siteId,
        "enableModules.drawingDetails.drawingEditAccess": true,
      },
    },
  };

  // If login user is Design Consultant → fetch only Design Consultant
  if (department === "Design Consultant") {
    userFilter.department = "Design Consultant";
  }

  const usersWithDrawingEditAccess = await User.find(userFilter).select(
    "firstName lastName email department empId profilePic"
  );

  // ---------------------------------------------

  res.status(200).json({
    status: "success",
    success: true,
    data: rfiTimeStamp,
    usersWithDrawingEditAccess, // Added to output (no existing logic touched)
  });
});

  

// Update an RFI timestamp by ID
exports.updateRfiTimeStamp = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { roRfiTimeStampDays, siteHeadRfiTimeStampDays } = req.body;

  const updatedRfiTimeStamp = await RfiTimeStamp.findByIdAndUpdate(
    id,
    { roRfiTimeStampDays, siteHeadRfiTimeStampDays },
    { new: true, runValidators: true }
  );

  if (!updatedRfiTimeStamp) {
    return next(new AppError('No RFI timestamp found with that ID.', 404));
  }

  res.status(200).json({
    status: 'success',
    success: true,
    data: updatedRfiTimeStamp,
  });
});

