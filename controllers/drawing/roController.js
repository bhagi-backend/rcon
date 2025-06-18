const ArchitectureToRoRegister = require("../../models/drawingModels/architectureToRoRegisterModel");
const RoToSiteLevelRoRequest = require("../../models/drawingModels/roToSiteLevelRequestedModel");
const ArchitectureToRoRequest = require("../../models/drawingModels/architectureToRoRequestedModel");
const { catchAsync } = require("../../utils/catchAsync");
const User = require('../../models/userModel'); 
const assignDesignConsultantsToDepartment = require("../../models/drawingModels/assignDesignConsultantsToDepartMentModel");

exports.getAllForRoforDrawingtab = catchAsync(async (req, res, next) => {
  const { siteId } = req.params;
  const { filterType, folderId } = req.query; // 'upload', 'received', 'issued', or 'all'
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
      module:"ro" 
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
  responseData;
  if (filterType === 'upload') {
    responseData = await Promise.all(
        data
            .filter(item => (item.acceptedArchitectRevisions && item.acceptedArchitectRevisions.length > 0)&&item.regState === 'Drawing')
            .map(async (item) => {
                const architectRevisionsMap = new Map(
                    item.acceptedArchitectRevisions.map(archRevision => [
                        archRevision._id.toString(), archRevision
                    ])
                );

                const enrichedRevisions = await Promise.all(
                    item.acceptedRORevisions.map(async (revision) => {
                        if (revision.architectRef) {
                            const matchedRevision = architectRevisionsMap.get(revision.architectRef.toString());
                           
                            if (matchedRevision) {
                                const enrichedRevision = {
                                    ...matchedRevision.toObject(),  
                                    currentRevision: revision.revision,
                                    currentRevisionId:revision._id,
                                    from: 'architect',
                                    roType:revision.roType,
                                    roRevisionStatus:revision.roRevisionStatus,
                                    currentRevisionRfiStatus:revision.rfiStatus,
                                    currentRevisionSoftCopySubmittedDate:revision.softCopySubmittedDate,
                                    currentId:revision.id,
                                };
                                return enrichedRevision;
                            }
                        }
                        return revision;
                    })
                );

                return {
                    drawingId: item._id,
                    siteId: item.siteId,
                    folderId: item.folderId,
                    drawingNo: item.drawingNo,
                    designDrawingConsultant: item.designDrawingConsultant,
                    drawingTitle: item.drawingTitle,
                    noOfRoHardCopyRevisions:item.noOfRoHardCopyRevisions,
                    noOfSiteHeadHardCopyRevisions:item.noOfSiteHeadHardCopyRevisions,
                    category: item.category,
                    regState:item.regState,
                    archRevision:item.archRevision,
                    acceptedROSubmissionDate: item.acceptedROSubmissionDate,
                    acceptedSiteSubmissionDate: item.acceptedSiteSubmissionDate,
                    creationDate: item.creationDate,
                    createdBy: item.createdBy,
                    acceptedArchitectRevisions: item.acceptedArchitectRevisions,
                    acceptedRORevisions:enrichedRevisions,
                    acceptedROHardCopyRevisions:item.acceptedROHardCopyRevisions,

                };
            })
    );
}

 else if (filterType === 'collected') {
      responseData = data
          .filter(item =>(item.acceptedROHardCopyRevisions && item.acceptedROHardCopyRevisions.length > 0))//&&item.regState === 'Drawing')
          .map(item => ({
              drawingId: item._id,
              siteId: item.siteId,
              folderId: item.folderId,
              drawingNo: item.drawingNo,
              designDrawingConsultant: item.designDrawingConsultant,
              drawingTitle: item.drawingTitle,
              category: item.category,
              regState:item.regState,
          archRevision:item.archRevision,
              acceptedROSubmissionDate: item.acceptedROSubmissionDate,
              acceptedSiteSubmissionDate: item.acceptedSiteSubmissionDate,
              creationDate: item.creationDate,
              createdBy: item.createdBy,
              acceptedROHardCopyRevisions: item.acceptedROHardCopyRevisions 
          }));
  } else if (filterType === 'received') {
      responseData = data
          .filter(item => (item.acceptedROHardCopyRevisions && item.acceptedROHardCopyRevisions.length > 0))//&&item.regState === 'Drawing')
          .map(item => ({
              drawingId: item._id,
              siteId: item.siteId,
              folderId: item.folderId,
              drawingNo: item.drawingNo,
              designDrawingConsultant: item.designDrawingConsultant,
              drawingTitle: item.drawingTitle,
              category: item.category,
              regState:item.regState,
          archRevision:item.archRevision,
              noOfRoHardCopyRevisions:item.noOfRoHardCopyRevisions,
              noOfSiteHeadHardCopyRevisions:item.noOfSiteHeadHardCopyRevisions,
              acceptedROSubmissionDate: item.acceptedROSubmissionDate,
              acceptedSiteSubmissionDate: item.acceptedSiteSubmissionDate,
              creationDate: item.creationDate,
              createdBy: item.createdBy,
              acceptedROHardCopyRevisions: item.acceptedROHardCopyRevisions,
              acceptedSiteHeadHardCopyRevisions: item.acceptedSiteHeadHardCopyRevisions 
          }));
  } else if (filterType === 'issued') {
      responseData = data
          .filter(item => (item.acceptedArchitectRevisions && item.acceptedArchitectRevisions.length > 0))//&&item.regState === 'Drawing')
          .map(item => ({
              drawingId: item._id,
              siteId: item.siteId,
              folderId: item.folderId,
              drawingNo: item.drawingNo,
              designDrawingConsultant: item.designDrawingConsultant,
              drawingTitle: item.drawingTitle,
              category: item.category,
              regState:item.regState,
          archRevision:item.archRevision,
              acceptedROSubmissionDate: item.acceptedROSubmissionDate,
              acceptedSiteSubmissionDate: item.acceptedSiteSubmissionDate,
              creationDate: item.creationDate,
              createdBy: item.createdBy,
              acceptedArchitectRevisions: item.acceptedArchitectRevisions 
          }));
  } else {
      return next(new Error("Invalid filterType. Use 'upload', 'received', or 'all'.")); 
  }
  
  res.status(200).json({
      status: "success",
      data: responseData,
  });
});

 exports.getAllRoForPendingTab = catchAsync(async (req, res, next) => {
    const { siteId } = req.params;
    const { filterType, folderId } = req.query; 
    const userId = req.user.id;
    const userDepartment =req.user.department;
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
      module:"ro" 
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
      const architectRevisions = data
        .filter(item => (item.acceptedArchitectRevisions && item.acceptedArchitectRevisions.length <= 0) ||
        item.regState === 'Pending'
    )
        .map(item => ({
          drawingId: item._id,
          siteId: item.siteId,
          folderId: item.folderId,
          drawingNo: item.drawingNo,
          designDrawingConsultant: item.designDrawingConsultant,
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
          acceptedArchitectRevisions: item.acceptedArchitectRevisions,
          for:"architect"
        }));
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
          for:"siteHead"
        }));
    
    
      responseData = {
        architectRevisions,
        rORevisions,
      
      };
    }
     else if (filterType === 'received') {

      const rOHardCopyRevisions = data
        .filter(item => (item.acceptedROHardCopyRevisions && item.acceptedROHardCopyRevisions.length <= 0))// ||
       // item.regState === 'Pending' )
        .map(item => ({
          drawingId: item._id,
          siteId: item.siteId,
          folderId: item.folderId,
          drawingNo: item.drawingNo,
          designDrawingConsultant: item.designDrawingConsultant,
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
          acceptedArchitectRevisions: item.acceptedArchitectRevisions,
          acceptedROHardCopyRevisions: item.acceptedROHardCopyRevisions,
          for:"architect"
        }));
    
        const siteHeadHardCopyRevisions =  data
          .filter(item => (item.acceptedSiteHeadHardCopyRevisions && item.acceptedSiteHeadHardCopyRevisions.length <= 0))// ||
         // item.regState === 'Pending' )
          .map(item => ({
                drawingId: item._id,
                siteId: item.siteId,
                folderId: item.folderId,
                drawingNo: item.drawingNo,
                designDrawingConsultant: item.designDrawingConsultant,
                drawingTitle: item.drawingTitle,
                regState:item.regState,
                archRevision:item.archRevision,
                category: item.category,
                acceptedROSubmissionDate: item.acceptedROSubmissionDate,
                acceptedSiteSubmissionDate: item.acceptedSiteSubmissionDate,
                creationDate: item.creationDate,
                createdBy: item.createdBy,
                acceptedRORevisions: item.acceptedRORevisions,
                acceptedSiteHeadHardCopyRevisions: item.acceptedSiteHeadHardCopyRevisions,
                for:"siteHead"
              }));
     
          responseData = {
            rOHardCopyRevisions,
            siteHeadHardCopyRevisions,
      
          
          };
      }
      else if (filterType === 'collected') {
        responseData = data
          .filter(item => (item.acceptedSiteHeadHardCopyRevisions && item.acceptedSiteHeadHardCopyRevisions.length <= 0) )//||
          //item.regState === 'Pending'  )
          .map(item => ({
            drawingId:item._id,
            siteId: item.siteId,
            folderId:item.folderId,
            drawingNo: item.drawingNo,
            designDrawingConsultant: item.designDrawingConsultant,
            drawingTitle: item.drawingTitle,
            regState:item.regState,
                archRevision:item.archRevision,
            category: item.category,
            noOfRoHardCopyRevisions:item.noOfRoHardCopyRevisions,
            noOfSiteHeadHardCopyRevisions:item.noOfSiteHeadHardCopyRevisions,
            acceptedROSubmissionDate: item.acceptedROSubmissionDate,
            acceptedSiteSubmissionDate: item.acceptedSiteSubmissionDate,
            creationDate: item.creationDate,
            createdBy: item.createdBy,
            acceptedSiteHeadHardCopyRevisions: item.acceptedSiteHeadHardCopyRevisions, 
          }));
      }  else if (filterType === 'issued') {
        responseData = data
          .filter(item => (item.acceptedArchitectRevisions && item.acceptedArchitectRevisions.length <= 0) ||
          item.regState === 'Pending'
      )
          .map(item => ({
            drawingId:item._id,
            siteId: item.siteId,
            folderId:item.folderId,
            drawingNo: item.drawingNo,
            designDrawingConsultant: item.designDrawingConsultant,
            drawingTitle: item.drawingTitle,
            regState:item.regState,
                archRevision:item.archRevision,
            category: item.category,
            acceptedROSubmissionDate: item.acceptedROSubmissionDate,
            acceptedSiteSubmissionDate: item.acceptedSiteSubmissionDate,
            creationDate: item.creationDate,
            createdBy: item.createdBy,
            acceptedArchitectRevisions: item.acceptedArchitectRevisions 
          }));
      } else {
        return next(new Error("Invalid filterType. Use 'upload', 'received', or 'all'.")); // Error if filterType is invalid
      }
      res.status(200).json({
        status: "success",
        data: responseData,
      });
    });

    exports.getAllRequestsBySiteId = catchAsync(async (req, res, next) => {
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
          module:"ro" 
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
      const requests = await RoToSiteLevelRoRequest.find(query)
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
    
      const architectureRfiData = await ArchitectureToRoRequest.find(query)
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
        const updatedArchitectureRfiData = architectureRfiData.map((item) => ({
          ...item.toObject(), 
          for: "architect",
        }));
      
        const roRfiData = await RoToSiteLevelRoRequest.find(query)
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
    
        const updatedRoRfiData = await Promise.all(
          roRfiData.map(async (item) => {
            // Check if drawingId exists
            if (!item.drawingId || !item.drawingId._id) {
              return {
                ...item.toObject(),
                for: "ro",
                note: "Drawing ID is missing or invalid",
              };
            }
        
            const registerData = await ArchitectureToRoRegister.findOne({
              _id: item.drawingId._id,
            }).lean();
        
            let note = "No acceptedArchitectRevisions found for the provided drawingId.";
            if (registerData && registerData.acceptedArchitectRevisions.length > 0) {
              const latestRevision = registerData.acceptedArchitectRevisions.slice(-1)[0].revision;
        
              const roToSiteLevelRequest = await ArchitectureToRoRequest.findOne({
                drawingId: item.drawingId._id,
                revision: latestRevision,
              });
        
              note = roToSiteLevelRequest
                ? "Architect RFI created"
                : "Architect RFI not created";
            }
        
            return {
              ...item.toObject(),
              for: "ro",
              note,
            };
          })
        );
        
      res.status(200).json({
        status: "success",
        data: {
          architectureRfiData: updatedArchitectureRfiData,
          roRfiData: updatedRoRfiData,
        },
      });
    });
    
    

    
 exports.getAllForRoRegisterTab = catchAsync(async (req, res, next) => {
  const { siteId } = req.params;
  const {folderId} = req.query; 
  const userId = req.user.id;
  const userDepartment =req.user.department;

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
    module:"ro" // Add siteId filter if needed
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