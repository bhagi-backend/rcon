const ArchitectureToRoRegister = require("../../models/drawingModels/architectureToRoRegisterModel");
const { catchAsync } = require("../../utils/catchAsync");
const { AppError } = require("../../utils/appError");
const User = require('../../models/userModel'); 
const ArchitectureToRoRequest = require("../../models/drawingModels/architectureToRoRequestedModel");
const RoToSiteLevelRequest = require("../../models/drawingModels/roToSiteLevelRequestedModel");

exports.getUsersDepartmentsforRo = catchAsync(async (req, res, next) => {
    
        const { siteId } = req.query;
    
        // Find users where 'ro' is true for the specific siteId in permittedSites
        const users = await User.find({
          'permittedSites': {
            $elemMatch: {
              siteId: siteId,
              'enableModules.drawingDetails.ro': true, 
            },
          }
        }).select('firstName department role empId permittedSites.siteId permittedSites.enableModules.drawingDetails.roDetails.rfiRaisedAccess permittedSites.enableModules.drawingDetails.roDetails.forwardAccess');
    
        res.status(200).json({
          status: 'success',
          results: users.length,
          data: {
            users,
          },
        });
      
    });

    
exports.getUsersDepartmentsforsiteHead = catchAsync(async (req, res, next) => {
    
    const { siteId } = req.query;

    // Find users where 'ro' is true for the specific siteId in permittedSites
    const users = await User.find({
      'permittedSites': {
        $elemMatch: {
          siteId: siteId,
          'enableModules.drawingDetails.siteHead': true, 
        },
      }
    }).select('firstName department role empId permittedSites.siteId permittedSites.enableModules.drawingDetails.siteHeadDetails.rfiRaisedAccess permittedSites.enableModules.drawingDetails.siteHeadDetails.forwardAccess');

    res.status(200).json({
      status: 'success',
      results: users.length,
      data: {
        users,
      },
    });
  
});

exports.getUsersDepartmentsforSiteLevel= catchAsync(async (req, res, next) => {
    const { siteId } = req.query;

    const users = await User.find({
        permittedSites: {
            $elemMatch: {
                siteId: siteId,
                'enableModules.drawingDetails.siteToSite': true,
            },
        },
      //  department: 'SiteManagement', 
    }).select('firstName department role empId ');

    res.status(200).json({
        status: 'success',
        results: users.length,
        data: {
            users,
        },
    });
});

exports.updateModuleAccess = catchAsync(async (req, res, next) => {
    const { userId } = req.params;
    const { module, siteId } = req.query;
    const {  rfiRaisedAccess, forwardAccess } = req.body; 

    // Validate the module parameter
    if (!['roDetails', 'siteHeadDetails'].includes(module)) {
        return res.status(200).json({
            status: 'fail',
            message: 'Invalid module specified. Use "roDetails" or "siteHeadDetails".',
        });
    }

    // Construct the update object based on the module
    const updateObject = {
        [`permittedSites.$[site].enableModules.drawingDetails.${module}.rfiRaisedAccess`]: rfiRaisedAccess,
        [`permittedSites.$[site].enableModules.drawingDetails.${module}.forwardAccess`]: forwardAccess,
    };

    // Find the user and update the specified fields using an array filter for siteId
    const user = await User.findOneAndUpdate(
        { _id: userId, 'permittedSites.siteId': siteId }, // Match user and siteId
        { $set: updateObject },
        {
            new: true, // Return the updated document
            runValidators: true, // Validate updates against the schema
            arrayFilters: [{ 'site.siteId': siteId }], // Filter for the correct site
        }
    );

    // If no user found, return an error
    if (!user) {
        return res.status(404).json({
            status: 'fail',
            message: 'User not found',
        });
    }

    // Respond with the updated user information
    res.status(200).json({
        status: 'success',
        data: {
            user,
        },
    });
});

exports.getAllForArchitectforDrawingtab = catchAsync(async (req, res, next) => {
  const { siteId } = req.params; 
    const { filterType,folderId,consultantId } = req.query; // 'upload', 'received', or 'all'
    const userId = req.user.id;
    const user = await User.findById(userId).select('role').exec();
    if (!user) {
      return next(new Error("User not found.")); // Error handling
    }
    const userRole = user.role;
    const query = { siteId };
    if (consultantId) {
      query.designDrawingConsultant = consultantId;
    } else {
      query.designDrawingConsultant = userId;
    }
  
    if (folderId) {
      query.folderId = folderId;
    }
  
    const data = await ArchitectureToRoRegister.find(query)
      .populate({
        path: 'designDrawingConsultant',
        //match: { role: userRole },
        select: 'role'
      }).populate({
        path: 'siteId',
        select: 'siteName'
      })
      .populate({
        path: 'folderId',
        select: 'folderName' 
      })
      .populate({
        path: 'category',
        select: 'category' 
      })
      .exec();
  
    const filteredData = data.filter((item) => item.designDrawingConsultant);
  
    let responseData;
    if (filterType === 'upload') {
        responseData = filteredData
          .filter(item => (item.acceptedArchitectRevisions && item.acceptedArchitectRevisions.length > 0)&&item.regState === 'Drawing')
          .map(item => ({
            drawingId: item._id,
            siteId: item.siteId,
            folderId:item.folderId,
            drawingNo: item.drawingNo,
            designDrawingConsultant: item.designDrawingConsultant,
            drawingTitle: item.drawingTitle,
            regState:item.regState,
            category: item.category,
            acceptedROSubmissionDate: item.acceptedROSubmissionDate,
            acceptedSiteSubmissionDate: item.acceptedSiteSubmissionDate,
            creationDate: item.creationDate,
            createdBy: item.createdBy,
            acceptedArchitectRevisions: item.acceptedArchitectRevisions ,
            acceptedRORevisions: item.acceptedRORevisions ,
            acceptedSiteHeadRevisions: item.acceptedSiteHeadRevisions ,
            acceptedSiteLevelRevisions:item.acceptedSiteRevisions

          }));
      } else if (filterType === 'received') {
        responseData = filteredData
          .filter(item => (item.acceptedROHardCopyRevisions && item.acceptedROHardCopyRevisions.length > 0))//&&item.regState === 'Drawing')
          .map(item => ({
            drawingId: item._id,
            siteId: item.siteId,
            folderId:item.folderId,
            drawingNo: item.drawingNo,
            designDrawingConsultant: item.designDrawingConsultant,
            drawingTitle: item.drawingTitle,
            regState:item.regState,
            category: item.category,
            acceptedROSubmissionDate: item.acceptedROSubmissionDate,
            acceptedSiteSubmissionDate: item.acceptedSiteSubmissionDate,
            creationDate: item.creationDate,
            createdBy: item.createdBy,
            acceptedROHardCopyRevisions: item.acceptedROHardCopyRevisions,
            acceptedSiteHeadHardCopyRevisions: item.acceptedSiteHeadHardCopyRevisions,

          }));
      } else if (filterType === 'all') {
        responseData = filteredData
          .map(item => ({
            drawingId: item._id,
            siteId: item.siteId,
            folderId:item.folderId,
            drawingNo: item.drawingNo,
            designDrawingConsultant: item.designDrawingConsultant,
            drawingTitle: item.drawingTitle,
            regState:item.regState,
            category: item.category,
            acceptedROSubmissionDate: item.acceptedROSubmissionDate,
            acceptedSiteSubmissionDate: item.acceptedSiteSubmissionDate,
            creationDate: item.creationDate,
            createdBy: item.createdBy,
            acceptedArchitectRevisions: item.acceptedArchitectRevisions,
            acceptedROHardCopyRevisions: item.acceptedROHardCopyRevisions
          }));
      } else {
        return next(new Error("Invalid filterType. Use 'upload', 'received', or 'all'.")); // Error if filterType is invalid
      }
      res.status(200).json({
        status: "success",
        data: responseData,
      });
    });