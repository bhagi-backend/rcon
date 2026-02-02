const ArchitectureToRoRegister = require("../../models/drawingModels/architectureToRoRegisterModel");
const { catchAsync } = require("../../utils/catchAsync");
const User = require('../../models/userModel'); 
const assignDesignConsultantsToDepartment = require("../../models/drawingModels/assignDesignConsultantsToDepartMentModel");
const RoToSiteLevelRequest = require("../../models/drawingModels/roToSiteLevelRequestedModel");
const ArchitectureToRoRequest = require("../../models/drawingModels/architectureToRoRequestedModel");
const SiteToSiteLevelRequest = require("../../models/drawingModels/siteToSiteLevelRequestedModel");
exports.getAllSiteLevelforDrawingtab = catchAsync(async (req, res, next) => {
    const { siteId } = req.params;
    const { filterType, folderId } = req.query; 
    const userId = req.user.id;
    const userDepartment = req.user.department;
    const user = await User.findOne({
      _id: userId,
      "permittedSites.siteId": siteId
    }).select('permittedSites');
    
    const customizedView = user ? user.permittedSites.find(site => site.siteId.toString() === siteId).enableModules.customizedView : false;
  console.log("customizedView",customizedView);
  console.log("userId",userId);
    // Fetch consultants in the user's department
    const consultantsInDepartment = await assignDesignConsultantsToDepartment.findOne({
      department: userDepartment,
      siteId: siteId,
      module: "siteLevel"
    }).select('designConsultants').exec();

    const designConsultantIds = consultantsInDepartment ? consultantsInDepartment.designConsultants : [];

    let query;

    if (customizedView) {
      // If customizedView is true, use the original query
      query = {
        $and: [
          { siteId }, // Must match siteId
          ...(folderId ? [{ folderId }] : []), // Must match folderId if it exists
          {
            $or: [
              { designDrawingConsultant: { $in: designConsultantIds } }, // Should match design consultants if any exist
              { designDrawingConsultant: { $exists: false } } // Optionally include documents without designDrawingConsultant
            ]
          }
        ]
      };
      console.log("query1");
    } else {
      // If customizedView is false, fetch data based only on siteId
      query = {
        siteId, // Only match by siteId
        ...(folderId ? { folderId } : []) // Include folderId filter if it exists
      };
      console.log("query2");
    }

    const data = await ArchitectureToRoRegister.find(query)
        .populate({
            path: 'designDrawingConsultant',
            select: 'role'
        })
        .populate({
            path: 'siteId',
            select: 'siteName'
        })
        .populate({
            path: 'category',
            select: 'category'
        })
        .populate({
            path: 'folderId',
            select: 'folderName'
        })
        .exec();

    let responseData;

    if (filterType === 'upload') {
        responseData = await Promise.all(data
            .filter(item => (item.acceptedRORevisions && item.acceptedRORevisions.length > 0)&&item.regState === 'Drawing')
            .map(async (item) => {
                const enrichedSiteHeadRevisions = await Promise.all(item.acceptedSiteHeadRevisions.map(async (siteHeadRevision) => {
                    if (siteHeadRevision.roRef) {
                        const matchedSiteHead = item.acceptedRORevisions.find(
                            (headRevision) => headRevision._id.toString() === siteHeadRevision.roRef.toString()
                        );
  
                        // If matchedSiteHead has an architectRef, find the corresponding architect revision
                        if (matchedSiteHead && matchedSiteHead.architectRef) {
                            const matchedArchitectRevision = item.acceptedArchitectRevisions.find(
                                (archRevision) => archRevision._id.toString() === matchedSiteHead.architectRef.toString()
                            );
  
                            if (matchedArchitectRevision) {
                              // Merge the matched revision with currentRevision and from fields
                              const enrichedRevision = {
                                  ...matchedArchitectRevision.toObject(),  // Convert to plain object if it's a Mongoose document
                                  currentRevision: siteHeadRevision.revision,
                                  currentRevisionId:siteHeadRevision._id,
                                  from: 'architect',
                                  siteHeadType:siteHeadRevision.siteHeadType,
                                  currentRevisionSoftCopySubmittedDate:siteHeadRevision.softCopySubmittedDate,
                                  currentRevisionRfiStatus:matchedSiteHead.rfiStatus,
                              };
                              //console.log("enrichedRevision:", enrichedRevision);
                              return enrichedRevision;
                          }
                         // Return architect revision if found, otherwise matchedSiteHead
                        }
                        if (matchedSiteHead) {
                          // Merge the matched revision with currentRevision and from fields
                          const enrichedsRevision = {
                              ...matchedSiteHead.toObject(),  // Convert to plain object if it's a Mongoose document
                              currentRevision: siteHeadRevision.revision,
                              currentRevisionId:siteHeadRevision._id,
                              from: 'ro',
                              siteHeadType:siteHeadRevision.siteHeadType,
                              currentRevisionSoftCopySubmittedDate:siteHeadRevision.softCopySubmittedDate,
                        
                          };
                          //console.log("enrichedRevision:", enrichedRevision);
                          return enrichedsRevision;
                      } // Return matchedSiteHead or original revision
                    }
                    return siteHeadRevision; // If no roRef, return original revision
                }));
                const enrichedRevisions = await Promise.all(
                  item.acceptedRORevisions.map(async (revision) => {
                    if (revision.architectRef) {
                      const matchedRevision = item.acceptedArchitectRevisions.find(
                        (headRevision) => headRevision._id.toString() === revision.architectRef.toString()
                      );
                
                      if (matchedRevision) {
                        return {
                          ...matchedRevision.toObject(),
                          currentRevision: revision.revision,
                          currentRevisionId:revision._id,
                          from: 'architect',
                          roType: revision.roType,
                          roRevisionStatus: revision.roRevisionStatus,
                          currentRevisionRfiStatus: revision.rfiStatus,
                          currentRevisionSoftCopySubmittedDate:revision.softCopySubmittedDate,
                        };
                      }
                    }
                    // If no architectRef or no match, return the original revision
                    return revision;
                  })
                );
                
  
                // Format the response data
                return {
                    drawingId: item._id,
                    siteId: item.siteId,
                    folderId: item.folderId,
                    drawingNo: item.drawingNo,
                    designDrawingConsultant: item.designDrawingConsultant,
                    latestConsultantUploadedRevision:item.latestConsultantUploadedRevision,
            latestRoForwardedRevision:item.latestRoForwardedRevision,
                    drawingTitle: item.drawingTitle,
                    regState:item.regState,
                archRevision:item.archRevision,
                    category: item.category,
                    noOfRoHardCopyRevisions: item.noOfRoHardCopyRevisions,
          noOfSiteHeadHardCopyRevisions: item.noOfSiteHeadHardCopyRevisions,
                    acceptedROSubmissionDate: item.acceptedROSubmissionDate,
                    acceptedSiteSubmissionDate: item.acceptedSiteSubmissionDate,
                    creationDate: item.creationDate,
                    createdBy: item.createdBy,
                    acceptedRORevisions:enrichedRevisions,
                    acceptedSiteHeadRevisions: enrichedSiteHeadRevisions,
                    acceptedSiteHeadHardCopyRevisions:item.acceptedSiteHeadHardCopyRevisions,
  
                };
            })
        );
        }  else if (filterType === 'issued') {
        responseData = await Promise.all(data
            .filter(item => (item.acceptedSiteHeadRevisions && item.acceptedSiteHeadRevisions.length > 0)&&item.regState === 'Drawing')
            .map(async (item) => {
                const enrichedSiteHeadRevisions = await Promise.all(item.acceptedSiteHeadRevisions.map(async (siteHeadRevision) => {
                    if (siteHeadRevision.roRef) {
                        const matchedSiteHead = item.acceptedRORevisions.find(
                            (headRevision) => headRevision._id.toString() === siteHeadRevision.roRef.toString()
                        );

                        if (matchedSiteHead && matchedSiteHead.architectRef) {
                            const matchedArchitectRevision = item.acceptedArchitectRevisions.find(
                                (archRevision) => archRevision._id.toString() === matchedSiteHead.architectRef.toString()
                            );
  
                            if (matchedArchitectRevision) {
                              // Merge the matched revision with currentRevision and from fields
                              const enrichedRevision = {
                                  ...matchedArchitectRevision.toObject(),  // Convert to plain object if it's a Mongoose document
                                  currentRevision: siteHeadRevision.revision,
                                  from: 'architect',
                                  siteHeadType:siteHeadRevision.siteHeadType,
                              };
                              //console.log("enrichedRevision:", enrichedRevision);
                              return enrichedRevision;
                          }
                         // Return architect revision if found, otherwise matchedSiteHead
                        }
                        if (matchedSiteHead) {
                          // Merge the matched revision with currentRevision and from fields
                          const enrichedsRevision = {
                              ...matchedSiteHead.toObject(),  // Convert to plain object if it's a Mongoose document
                              currentRevision: siteHeadRevision.revision,
                              from: 'ro',
                              siteHeadType:siteHeadRevision.siteHeadType,
                          };
                          //console.log("enrichedRevision:", enrichedRevision);
                          return enrichedsRevision;
                      } // Return matchedSiteHead or original revision
                    }
                    return siteHeadRevision; // If no roRef, return original revision
                }));

                // Format the response data
                return {
                    drawingId: item._id,
                    siteId: item.siteId,
                    folderId: item.folderId,
                    drawingNo: item.drawingNo,
                    designDrawingConsultant: item.designDrawingConsultant,
                    latestConsultantUploadedRevision:item.latestConsultantUploadedRevision,
            latestRoForwardedRevision:item.latestRoForwardedRevision,
                    drawingTitle: item.drawingTitle,
                    regState:item.regState,
                archRevision:item.archRevision,
                    category: item.category,
                    acceptedROSubmissionDate: item.acceptedROSubmissionDate,
                    acceptedSiteSubmissionDate: item.acceptedSiteSubmissionDate,
                    creationDate: item.creationDate,
                    createdBy: item.createdBy,
                    acceptedSiteHeadRevisions: enrichedSiteHeadRevisions
                };
            })
        );
    } 
    else if (filterType === 'collected') {
        responseData = data
          .filter(item => (item.acceptedROHardCopyRevisions && item.acceptedROHardCopyRevisions.length > 0))//&&item.regState === 'Drawing')
          .map(item => ({
            drawingId: item._id,
            siteId: item.siteId,
            folderId:item.folderId,
            drawingNo: item.drawingNo,
            designDrawingConsultant: item.designDrawingConsultant,
            latestConsultantUploadedRevision:item.latestConsultantUploadedRevision,
            latestRoForwardedRevision:item.latestRoForwardedRevision,
            drawingTitle: item.drawingTitle,
            regState:item.regState,
                archRevision:item.archRevision,
            category: item.category,
            noOfRoHardCopyRevisions: item.noOfRoHardCopyRevisions,
        noOfSiteHeadHardCopyRevisions: item.noOfSiteHeadHardCopyRevisions,
            acceptedROSubmissionDate: item.acceptedROSubmissionDate,
            acceptedSiteSubmissionDate: item.acceptedSiteSubmissionDate,
            creationDate: item.creationDate,
            createdBy: item.createdBy,
            acceptedROHardCopyRevisions:item.acceptedROHardCopyRevisions,
            acceptedSiteHeadHardCopyRevisions: item.acceptedSiteHeadHardCopyRevisions 
          }));
      }else {
        return next(new Error("Invalid filterType. Use 'upload' or 'issued'.")); // Error if filterType is invalid
    }

    // Send the filtered response
    res.status(200).json({
        status: "success",
        data: responseData,
    });
});

 exports.getAllSiteLevelForPendingTab = catchAsync(async (req, res, next) => {
    const { siteId } = req.params;
    const { filterType , folderId} = req.query; 
    const userId = req.user.id;
    const userDepartment =req.user.department;
    const user = await User.findOne({
      _id: userId,
      "permittedSites.siteId": siteId
    }).select('permittedSites');
    
    const customizedView = user ? user.permittedSites.find(site => site.siteId.toString() === siteId).enableModules.customizedView : false;
  console.log("customizedView",customizedView);
  console.log("userId",userId);
    console.log("userDepartment",userDepartment)
    const consultantsInDepartment = await assignDesignConsultantsToDepartment.findOne({
      department: userDepartment,
      siteId: siteId,
      module:"siteLevel" // Add siteId filter if needed
  }).select('designConsultants').exec();
  
  const designConsultantIds = consultantsInDepartment ? consultantsInDepartment.designConsultants : [];
  let query;

  if (customizedView) {
    // If customizedView is true, use the original query
    query = {
      $and: [
        { siteId }, // Must match siteId
        ...(folderId ? [{ folderId }] : []), // Must match folderId if it exists
        {
          $or: [
            { designDrawingConsultant: { $in: designConsultantIds } }, // Should match design consultants if any exist
            { designDrawingConsultant: { $exists: false } } // Optionally include documents without designDrawingConsultant
          ]
        }
      ]
    };
    console.log("query1");
  } else {
    // If customizedView is false, fetch data based only on siteId
    query = {
      siteId, // Only match by siteId
      ...(folderId ? { folderId } : []) // Include folderId filter if it exists
    };
    console.log("query2");
  }
    const data = await ArchitectureToRoRegister.find(query)
    .populate({
      path: 'designDrawingConsultant',
      select: 'role'
    })
    .populate({
      path: 'siteId',
      select: 'siteName' 
    })
    .populate({
      path: 'category',
      select: 'category' 
    })
    .populate({
      path: 'folderId',
      select: 'folderName' 
    })
    .exec();
    let responseData;
    
      if (filterType === 'upload') {
        const rORevisions = data
        .filter(item => (item.acceptedRORevisions && item.acceptedRORevisions.length <= 0) ||
        item.regState === 'Pending'
    )
        .map(item => ({
          drawingId: item._id,
          siteId: item.siteId,
          folderId: item.folderId,
          drawingNo: item.drawingNo,
          designDrawingConsultant: item.designDrawingConsultant,
          latestConsultantUploadedRevision:item.latestConsultantUploadedRevision,
            latestRoForwardedRevision:item.latestRoForwardedRevision,
          drawingTitle: item.drawingTitle,
          regState:item.regState,
          archRevision:item.archRevision,
          category: item.category,
          noOfRoHardCopyRevisions: item.noOfRoHardCopyRevisions,
          noOfSiteHeadHardCopyRevisions: item.noOfSiteHeadHardCopyRevisions,
          acceptedROSubmissionDate: item.acceptedROSubmissionDate,
          acceptedSiteSubmissionDate: item.acceptedSiteSubmissionDate,
          creationDate: item.creationDate,
          createdBy: item.createdBy,
          acceptedRORevisions: item.acceptedRORevisions,
          for:"ro"
        }));
      const siteHeadRevisions = data
        .filter(item => (item.acceptedSiteHeadRevisions && item.acceptedSiteHeadRevisions.length <= 0) ||
        item.regState === 'Pending'
    )
        .map(item => ({
          drawingId: item._id,
          siteId: item.siteId,
          folderId: item.folderId,
          drawingNo: item.drawingNo,
          designDrawingConsultant: item.designDrawingConsultant,
          latestConsultantUploadedRevision:item.latestConsultantUploadedRevision,
            latestRoForwardedRevision:item.latestRoForwardedRevision,
          drawingTitle: item.drawingTitle,
          regState:item.regState,
          archRevision:item.archRevision,
          category: item.category,
          noOfRoHardCopyRevisions: item.noOfRoHardCopyRevisions,
          noOfSiteHeadHardCopyRevisions: item.noOfSiteHeadHardCopyRevisions,
          acceptedROSubmissionDate: item.acceptedROSubmissionDate,
          acceptedSiteSubmissionDate: item.acceptedSiteSubmissionDate,
          creationDate: item.creationDate,
          createdBy: item.createdBy,
          acceptedSiteHeadRevisions: item.acceptedSiteHeadRevisions,
          for:"siteLevel"
        }));
    
    
      responseData = {
        rORevisions,
        siteHeadRevisions
      
      };
    }else if (filterType === 'collected') {
     
        const rOHardCopyRevisions = data
          .filter(item => (item.acceptedROHardCopyRevisions && item.acceptedROHardCopyRevisions.length <= 0) )//||
          //item.regState === 'Pending' )
          .map(item => ({
            drawingId: item._id,
            siteId: item.siteId,
            folderId: item.folderId,
            drawingNo: item.drawingNo,
            designDrawingConsultant: item.designDrawingConsultant,
            latestConsultantUploadedRevision:item.latestConsultantUploadedRevision,
            latestRoForwardedRevision:item.latestRoForwardedRevision,
            drawingTitle: item.drawingTitle,
            regState:item.regState,
            archRevision:item.archRevision,
            category: item.category,
            noOfRoHardCopyRevisions: item.noOfRoHardCopyRevisions,
            noOfSiteHeadHardCopyRevisions: item.noOfSiteHeadHardCopyRevisions,
            acceptedROSubmissionDate: item.acceptedROSubmissionDate,
            acceptedSiteSubmissionDate: item.acceptedSiteSubmissionDate,
            creationDate: item.creationDate,
            createdBy: item.createdBy,
            acceptedROHardCopyRevisions: item.acceptedROHardCopyRevisions,
            for:"ro"
          }));
      
          const siteHeadHardCopyRevisions =  data
            .filter(item => (item.acceptedSiteHeadHardCopyRevisions && item.acceptedSiteHeadHardCopyRevisions.length <= 0) )//||
           // item.regState === 'Pending' )
            .map(item =>( {
                  drawingId: item._id,
                  siteId: item.siteId,
                  folderId: item.folderId,
                  drawingNo: item.drawingNo,
                  designDrawingConsultant: item.designDrawingConsultant,
                  latestConsultantUploadedRevision:item.latestConsultantUploadedRevision,
            latestRoForwardedRevision:item.latestRoForwardedRevision,
                  drawingTitle: item.drawingTitle,
                  regState:item.regState,
                  archRevision:item.archRevision,
                  category: item.category,
                  acceptedROSubmissionDate: item.acceptedROSubmissionDate,
                  acceptedSiteSubmissionDate: item.acceptedSiteSubmissionDate,
                  creationDate: item.creationDate,
                  createdBy: item.createdBy,
                  acceptedSiteHeadHardCopyRevisions: item.acceptedSiteHeadHardCopyRevisions,
                  for:"siteLevel"
                }));
            responseData = {
              rOHardCopyRevisions,
              siteHeadHardCopyRevisions,
            
            };
        }else {
        return next(new Error("Invalid filterType. Use 'upload'")); // Error if filterType is invalid
      }
    
      res.status(200).json({
        status: "success",
        data: responseData,
      });
    });

      
 exports.getAllForSiteLevelRegisterTab = catchAsync(async (req, res, next) => {
  const { siteId } = req.params;
  const {folderId} = req.query; 
  const userId = req.user.id;
  const userDepartment =req.user.department;
console.log(userDepartment)
// Step 1: Find the user's customizedView value based on siteId
const user = await User.findOne({
  _id: userId,
  "permittedSites.siteId": siteId
}).select('permittedSites');

const customizedView = user ? user.permittedSites.find(site => site.siteId.toString() === siteId).enableModules.customizedView : false;
console.log("customizedView",customizedView);
console.log("userId",userId);
  const consultantsInDepartment = await assignDesignConsultantsToDepartment.findOne({
    department: userDepartment,
    siteId: siteId,
    module:"siteLevel" // Add siteId filter if needed
}).select('designConsultants').exec();

const designConsultantIds = consultantsInDepartment ? consultantsInDepartment.designConsultants : [];

let query;

if (customizedView) {
  // If customizedView is true, use the original query
  query = {
    $and: [
      { siteId }, // Must match siteId
      ...(folderId ? [{ folderId }] : []), // Must match folderId if it exists
      {
        $or: [
          { designDrawingConsultant: { $in: designConsultantIds } }, // Should match design consultants if any exist
         // { designDrawingConsultant: { $exists: false } } // Optionally include documents without designDrawingConsultant
        ]
      }
    ]
  };
  console.log("query1");
} else {
  // If customizedView is false, fetch data based only on siteId
  query = {
    siteId, // Only match by siteId
    ...(folderId ? { folderId } : []) // Include folderId filter if it exists
  };
  console.log("query2");
}
const registers = await ArchitectureToRoRegister.find(query)
.populate({ path: 'category', select: 'category' })
.populate({ path: 'siteId', select: 'siteName' })
.populate({ path: 'folderId', select: 'folderName' })
.populate({ path: 'designDrawingConsultant', select: 'role firstName' })
.populate({ path: 'acceptedSiteHeadRevisions', select: 'revision roRef rfiStatus' });


const enrichedRegisters = await Promise.all(registers.map(async (register) => {
const enrichedRevisions = await Promise.all(register.acceptedRORevisions.map(async (revision) => {
  if (revision.architectRef) {
    const matchedRevision = register.acceptedArchitectRevisions.find(
      (archRevision) => archRevision._id.toString() === revision.architectRef.toString()
    );
    if (matchedRevision) {
      return { ...matchedRevision.toObject(), currentRevision: revision.revision ,
        currentRevisionId:revision._id,
        from: 'architect',
        roType: revision.roType,
        roRevisionStatus: revision.roRevisionStatus,
        currentRevisionRfiStatus: revision.rfiStatus,
        currentRevisionSoftCopySubmittedDate:revision.softCopySubmittedDate,}; // Add currentRevision
    }
  }
  return revision;
}));

const enrichedSiteHeadRevisions = await Promise.all(register.acceptedSiteHeadRevisions.map(async (siteHeadRevision) => {
  if (siteHeadRevision.roRef) {
    
    const matchedSiteHead = register.acceptedRORevisions.find(
      (headRevision) => headRevision._id.toString() === siteHeadRevision.roRef.toString()
    );

    // Check for architectRef in matchedSiteHead
    if (matchedSiteHead && matchedSiteHead.architectRef) {
      const matchedArchitectRevision = register.acceptedArchitectRevisions.find(
        (archRevision) => archRevision._id.toString() === matchedSiteHead.architectRef.toString()
      );
      //return matchedArchitectRevision ? matchedArchitectRevision : matchedSiteHead;
      if (matchedArchitectRevision) {
        return {
          ...matchedArchitectRevision.toObject(),
          currentRevision: siteHeadRevision.revision, 
          from: 'architect',
          siteHeadType: siteHeadRevision.siteHeadType,
          roRevisionStatus: siteHeadRevision.roRevisionStatus,
          currentRevisionRfiStatus: siteHeadRevision.rfiStatus,
          currentRevisionSoftCopySubmittedDate:siteHeadRevision.softCopySubmittedDate,};
      }
    }
    
   // return matchedSiteHead ? matchedSiteHead : null;
   if (matchedSiteHead) {
    return {
      ...matchedSiteHead.toObject(),
      currentRevision: siteHeadRevision.revision,
      from: 'architect',
      siteHeadType: siteHeadRevision.siteHeadType,
      roRevisionStatus: siteHeadRevision.roRevisionStatus,
      currentRevisionRfiStatus: siteHeadRevision.rfiStatus,
      currentRevisionSoftCopySubmittedDate:siteHeadRevision.softCopySubmittedDate,}; // Add currentRevision from siteHeadRevision
   
  }
  return null;
  }
  return siteHeadRevision;
}));

const enrichedSiteLevelRevisions = await Promise.all(register.acceptedSiteRevisions.map(async (siteRevision) => {
  if (siteRevision.siteHeadRef) {
    const matchedSite = register.acceptedSiteHeadRevisions.find(
      (headRevision) => headRevision._id.toString() === siteRevision.siteHeadRef.toString()
    );

    if (matchedSite && matchedSite.roRef) {
      const matchedRoRevision = register.acceptedRORevisions.find(
        (roRevision) => roRevision._id.toString() === matchedSite.roRef.toString()
      );

      if (matchedRoRevision && matchedRoRevision.architectRef) {
        const matchedArchitectRevision = register.acceptedArchitectRevisions.find(
          (archRevision) => archRevision._id.toString() === matchedRoRevision.architectRef.toString()
        );
        //return matchedArchitectRevision ? matchedArchitectRevision : matchedRoRevision;
        if (matchedArchitectRevision) {
          return {
            ...matchedArchitectRevision.toObject(),
            currentRevision: siteRevision.revision, 
            from: 'architect',
            siteTositeType: siteRevision.siteTositeType,
            roRevisionStatus: siteRevision.roRevisionStatus,
            currentRevisionRfiStatus: siteRevision.rfiStatus,
            currentRevisionSoftCopySubmittedDate:siteRevision.softCopySubmittedDate,};
        }
      }

      return matchedRoRevision ? matchedRoRevision : matchedSite;
    }

    return matchedSite ? matchedSite : null;
  }
  return siteRevision;
}));

return {
  ...register.toObject(),
  acceptedRORevisions: enrichedRevisions.filter(Boolean),
  acceptedSiteHeadRevisions: enrichedSiteHeadRevisions.filter(Boolean),
  acceptedSiteRevisions: enrichedSiteLevelRevisions.filter(Boolean),
};
}));

res.status(200).json({
status: 'success',
results: enrichedRegisters.length,
registers: enrichedRegisters ,
});
  });


  
  
  exports.getAllRequestsBySiteIdForSiteLevel = catchAsync(async (req, res, next) => {
        const { siteId, folderId } = req.query;
      
        // Validate siteId
        if (!siteId) {
          return res.status(400).json({
            status: "fail",
            message: 'siteId query parameter is required',
          });
        }
        const userId = req.user.id;
       const userDepartment =req.user.department;
      console.log("department",userDepartment)
      const user = await User.findOne({
        _id: userId,
        "permittedSites.siteId": siteId
      }).select('permittedSites');
      
      const customizedView = user ? user.permittedSites.find(site => site.siteId.toString() === siteId).enableModules.customizedView : false;
      console.log("customizedView",customizedView);
      console.log("userId",userId);
        const consultantsInDepartment = await assignDesignConsultantsToDepartment.findOne({
            department: userDepartment,
            siteId: siteId,
            module:"siteLevel" 
        }).select('designConsultants').exec();
        
        const designConsultantIds = consultantsInDepartment ? consultantsInDepartment.designConsultants : [];
      
        
        let query;
      
        if (customizedView) {
          // If customizedView is true, use the original query
          query = {
            $and: [
              { siteId }, // Must match siteId
              ...(folderId ? [{ folderId }] : []), // Must match folderId if it exists
              {
                $or: [
                  { designDrawingConsultant: { $in: designConsultantIds } }, // Should match design consultants if any exist
                  //{ designDrawingConsultant: { $exists: false } } // Optionally include documents without designDrawingConsultant
                ]
              }
            ]
          };
          console.log("query1");
        } else {
          // If customizedView is false, fetch data based only on siteId
          query = {
            siteId, // Only match by siteId
            ...(folderId ? { folderId } : []) // Include folderId filter if it exists
          };
          console.log("query2");
        }
        // Fetch ArchitectureToRoRequest data for the provided siteId
        const requests = await RoToSiteLevelRequest.find(query)
          .populate({
            path: 'drawingId',
            select: 'drawingTitle designDrawingConsultant category',
            populate: [
              { path: 'designDrawingConsultant', select: 'role' },
              { path: 'category', select: 'category' },
              { path: 'folderId', select: 'folderName' },
            ],
          })
          .exec();
      
        // const architectureRfiData = await ArchitectureToRoRequest.find(query)
        //   .populate({
        //     path: 'drawingId',
        //     select: 'drawingTitle designDrawingConsultant category',
        //     populate: [
        //       { path: 'designDrawingConsultant', select: 'role' },
        //       { path: 'category', select: 'category' },
        //       { path: 'folderId', select: 'folderName' },
        //     ],
        //   })
        //   .exec();
        //   const updatedArchitectureRfiData = architectureRfiData.map((item) => ({
        //     ...item.toObject(), 
        //     for: "architect",
        //   }));
        
          // const roRfiData = await RoToSiteLevelRequest.find(query)
          // .populate({
          //   path: "drawingId",
          //   select: "drawingTitle designDrawingConsultant category",
          //   populate: [
          //     { path: "designDrawingConsultant", select: "role" },
          //     { path: "category", select: "category" },
          //     { path: "folderId", select: "folderName" },
          //   ],
          // })
          // .exec();
      
          // const updatedRoRfiData = await Promise.all(
          //   roRfiData.map(async (item) => {
          //     // Check if drawingId exists
          //     if (!item.drawingId || !item.drawingId._id) {
          //       return {
          //         ...item.toObject(),
          //         for: "ro",
          //         note: "Drawing ID is missing or invalid",
          //       };
          //     }
          
          //     const registerData = await ArchitectureToRoRegister.findOne({
          //       _id: item.drawingId._id,
          //     }).lean();
          
          //     let note = "No acceptedArchitectRevisions found for the provided drawingId.";
          //     if (registerData && registerData.acceptedArchitectRevisions.length > 0) {
          //       const latestRevision = registerData.acceptedArchitectRevisions.slice(-1)[0].revision;
          
          //       const roToSiteLevelRequest = await ArchitectureToRoRequest.findOne({
          //         drawingId: item.drawingId._id,
          //         revision: latestRevision,
          //       });
          
          //       note = roToSiteLevelRequest
          //         ? "Architect RFI created"
          //         : "Architect RFI not created";
          //     }
          
          //     return {
          //       ...item.toObject(),
          //       for: "ro",
          //       note,
          //     };
          //   })
          // );
          const siteToSiteRfiData = await SiteToSiteLevelRequest.find(query)
    .populate({
      path: "drawingId",
      select: "drawingTitle designDrawingConsultant category",
      populate: [
        { path: "designDrawingConsultant", select: "role" },
        { path: "category", select: "category" },
        { path: "folderId", select: "folderName" },
      ],
    })
    .exec();
  
  const updatedSiteToSiteRfiData = siteToSiteRfiData.map((item) => ({
    ...item.toObject(),
    for: "site",
  }));
        res.status(200).json({
          status: "success",
          data: {
            // architectureRfiData: updatedArchitectureRfiData,
            // roRfiData: updatedRoRfiData,
            siteToSiteRfiData: updatedSiteToSiteRfiData,
          },
        });
      });
      