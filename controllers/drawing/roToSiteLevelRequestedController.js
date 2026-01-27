const ArchitectureToRoRegister = require("../../models/drawingModels/architectureToRoRegisterModel");
const ArchitectureToRoRequest = require("../../models/drawingModels/roToSiteLevelRequestedModel");
const Architecture = require("../../models/drawingModels/architectureToRoRequestedModel");
const { catchAsync } = require("../../utils/catchAsync");
const multer = require("multer");
const fs = require("fs");
const ejs = require("ejs");
const puppeteer = require("puppeteer");
const AppError = require("../../utils/appError");
const path = require("path");
const { processDWGFile, getDWGFileToken } = require("./dwgFileHandlingController");
const sendNotification = require("../../utils/utilFun");
const multerWrapper = require('../../utils/multerFun');
const  getUploadPath  = require("../../utils/pathFun");
const mongoose = require('mongoose');
const User = require("../../models/userModel");
const assignDesignConsultantsToDepartment = require("../../models/drawingModels/assignDesignConsultantsToDepartMentModel");
const upload = multerWrapper();



exports.uploadDrawingFile = upload.single("drawingFileName");
exports.uploadRejectDrawingFile = upload.single("rejectDwgFile");

// Create a new request
exports.createRequest = catchAsync(async (req, res, next) => {
  const {drawingId, drawingNo, revision } = req.body;
  const userId = req.user.id;
  req.body.createdBy =userId;
  try {
    const registerData1 = await ArchitectureToRoRegister.findOne({ _id: drawingId });
    req.body.designDrawingConsultant =registerData1.designDrawingConsultant;
    req.body.folderId =registerData1.folderId;
    if (drawingNo && revision) {
      const existingRequest = await ArchitectureToRoRequest.findOne({
        drawingNo: drawingNo,
        revision: revision,
      });
      if (existingRequest) {
        // Return a response with status code 200 if the revision already exists
        return res.status(200).json({
          status: "error",
          message: `Revision ${revision} already requested from drawing No ${drawingNo}`,
        });
      }
    }
    if (drawingNo) {
      const parts = drawingNo.split('-'); // Split by dashes
  const lastPart = parts[parts.length - 1]; // Get last segment
  const number = lastPart.replace(/\D/g, ''); 
  if (number) {
    req.body.roRfiNo = number.padStart(3, '0'); // Always 3 digits
  } else {
        req.body.roRfiNo = "000"; 
      }
    }
    const newRequest = await ArchitectureToRoRequest.create(req.body);
    const populatedRequest = await ArchitectureToRoRequest.findById(newRequest._id)
    .populate('drawingId', 'designDrawingConsultant'); 

    const { designDrawingConsultant } = populatedRequest.drawingId;
    // const notificationMessage = `A new Ro to site level RFI has been raised for drawing number ${drawingNo} with revision ${revision}.`;

    // const notification = await sendNotification('Drawing', notificationMessage, 'New Request Created', 'Requested', designDrawingConsultant);
   const updatedRegister = await ArchitectureToRoRegister.findOneAndUpdate(
  {
    drawingNo,
    siteId: req.body.siteId
  },
  {
    $set: {
      "acceptedRORevisions.$[ro].rfiStatus": "Raised",
      "acceptedArchitectRevisions.$[arch].siteHeadRfiStatus": "Raised"
    }
  },
  {
    new: true,
    arrayFilters: [
      { "ro.revision": revision },
      { "arch.revision": revision }
    ]
  }
);

    const registerData = await ArchitectureToRoRegister.findOne({ _id: req.body.drawingId }).lean();

    if (!registerData ) {
      return res.status(400).json({
        status: "error",
        message: "No acceptedArchitectRevisions found for the provided drawingId.",
      });
    }

    const latestRevision = registerData.acceptedArchitectRevisions.slice(-1)[0].revision;

    // Check the roToSitelevelRequestModel for this drawingId and latest revision
    const roToSiteLevelRequest = await Architecture.findOne({
      drawingId: req.body.drawingId,
      revision: latestRevision,
    });
    if (roToSiteLevelRequest) {
      newRequest.architectRfiId = roToSiteLevelRequest._id;
    
      await newRequest.save();
    }

    const siteHeadIds = await User.find({
      "permittedSites.siteId": req.body.siteId  
    }).select('permittedSites _id');
    //console.log("siteHeadIds",siteHeadIds);
    if (siteHeadIds.length > 0) {
      for (let user of siteHeadIds) {
        const site = user ? user.permittedSites.find(site => site.siteId.toString() === req.body.siteId  ).enableModules.drawingDetails.roDetails.rfiRaisedAccess : false;
        if (site) {
          console.log("siteHeadIds", siteHeadIds);
    
            const notificationMessage1 = `A RFI has been raised for drawing number ${drawingNo} with architect revision ${revision}.`;
    
            try {
              const notificationToSiteHead = await sendNotification(
                'Drawing', 
                notificationMessage1, 
                'Request Raised', 
                'Raised', 
                user._id
              );
              console.log("notificationToSiteHead", notificationToSiteHead);
            } catch (error) {
              console.error("Error sending notification to SiteHeadId ", user._id, ": ", error);
            }
          
        } 
      }
    } 
console.log("latestRevision",latestRevision)
    // Determine the note based on the existence of data
    const note = roToSiteLevelRequest
      ? "Architect RFI created"
      : "Architect RFI not created";
    res.status(200).json({
      status: "success",
      data: newRequest,
      note,
      //notification
    });
  } catch (error) {
   
    console.error('Error creating request:', error);
    return next(new AppError('Failed to create request', 400));
  }
});
exports.resizeDrawingFile = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  // Find the ArchitectureToRoRequest by ID
  const request = await ArchitectureToRoRequest.findById(req.params.id).populate('drawingId');
  if (!request) {
    return next(new AppError("No request found with that ID", 404));
  }

  // Extract the drawingId from the request and find the corresponding ArchitectureToRoRegister
  const drawingId = request.drawingId._id;
  const architectureToRoRegister = await ArchitectureToRoRegister.findById(drawingId);
  if (!architectureToRoRegister) {
    return next(new AppError("No drawing found with that ID in ArchitectureToRoRegister", 404));
  }

  // Extract siteId from the ArchitectureToRoRegister
  const siteId = architectureToRoRegister.siteId;
  if (!siteId) {
    return next(new AppError("No siteId found for the drawing", 404));
  }

  // Extract the file extension from the original file
  const fileExtension = path.extname(req.file.originalname);
  const newFilename = `request-${req.params.id}-${Date.now()}${fileExtension}`;

  const companyId = req.user.companyId;

  // Use the new function to get the upload path
  const { relativePath, uploadToS3 } = getUploadPath(companyId, newFilename, "drawings", siteId);

  // Upload the file to S3
  await uploadToS3(req.file.buffer, req.file.mimetype);

  // Store relative path in req.file for further use
  req.file.filename = relativePath;

  next();

  try {
    const registerDrawing = await ArchitectureToRoRequest.findById(req.params.id);

    // Use S3 filename and buffer for processing DWG
    const result = await processDWGFile(newFilename, req.file.buffer);

    if (result.urn) {
      registerDrawing.urn = result.urn;
      registerDrawing.drawingFileName = relativePath;

      const currentDateTime = new Date();
      const expirationDate = new Date(currentDateTime.getTime() + 28 * 24 * 60 * 60 * 1000);

      registerDrawing.urnExpiration = expirationDate;

      // Save the document
      await registerDrawing.save();
    }
  } catch (e) {
    console.log(e);
  }
});

// Update an existing request
exports.updateRequest = catchAsync(async (req, res, next) => {
  const updateData = req.body;
  if (req.file) {
    updateData.drawingFileName = req.file.filename;
  }

  const updatedRequest = await ArchitectureToRoRequest.findByIdAndUpdate(
    req.params.id,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedRequest) {
    return next(new AppError("No request found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: updatedRequest,
  });
});

exports.getRequest = catchAsync(async (req, res, next) => {
    const revision = req.query.revision;
  
    // Find the ArchitectureToRoRegister by ID
    const request = await ArchitectureToRoRegister.findById(req.params.id);
    console.log('Request:', request);
  
    // If no request found, return error
    if (!request) {
      return next(new AppError("No request found with that ID", 404));
    }
  
    // Ensure acceptedRORevisions exist and is an array
    if (!request.acceptedRORevisions || !Array.isArray(request.acceptedRORevisions)) {
      return next(new AppError("No revisions found for this request.", 404));
    }
  
    // Find the specific revision in acceptedRORevisions
    const revisionObj = request.acceptedRORevisions.find(el => el.revision === revision);
  
    // If the revision is not found, return error
    if (!revisionObj) {
      return next(new AppError("No drawing file found for the specified revision.", 404));
    }
  
    // Extract the drawing file name and siteId
    const drawingFileName = revisionObj.drawingFileName;
    const siteId = request.siteId;  // Assuming siteId is directly in the request object
  
    console.log('Drawing File Name:', drawingFileName);
    console.log('Site ID:', siteId);
    const companyId =req.user.companyId;
    const filePath = path.join(__dirname, `../../uploads/${companyId}/${siteId}/drawings`, drawingFileName);
    console.log('File Path:', filePath);
  
    // Download the file
    res.download(filePath, drawingFileName, (err) => {
      if (err) {
        console.error('Download Error:', err);
        return next(new AppError("Failed to download the file.", 400));
      }
    });
  });

// exports.getRequestBeforeUpdateRevision = catchAsync(async (req, res, next) => {
//   // Find the ArchitectureToRoRequest by ID
//   const request = await ArchitectureToRoRequest.findById(req.params.id).populate('drawingId');
//   if (!request) {
//     return next(new AppError("No request found with that ID", 404));
//   }

//   if (!request.drawingFileName) {
//     return next(new AppError("No drawing file found for this request.", 404));
//   }

//   const drawingId = request.drawingId._id;
//   const architectureToRoRegister = await ArchitectureToRoRegister.findById(drawingId);
//   if (!architectureToRoRegister) {
//     return next(new AppError("No drawing found with that ID in ArchitectureToRoRegister", 404));
//   }
//   const siteId = architectureToRoRegister.siteId;
//   if (!siteId) {
//     return next(new AppError("No siteId found for the drawing", 404));
//   }

  
//   const drawingFileName = request.drawingFileName;
  
//   const companyId =req.user.companyId;
//   const filePath = path.join(__dirname, `../../uploads/${companyId}/${siteId}/drawings`, drawingFileName);
//   if (drawingFileName.endsWith('.dwg')) {
  
//     let result = await getDWGFileToken();
  
//     if(request.urn && request.urnExpiration > new Date()){
//       result.urn = request.urn;
//     } else {
//       const imgRes = await processDWGFile(filePath);
//       result.urn = imgRes.urn
//       const currentDateTime = new Date();
//       const expirationDate = new Date(currentDateTime.getTime() + 28 * 24 * 60 * 60 * 1000);
//       result.urnExpiration = expirationDate
  
//       //TODO: NEED TO TEST THIS SCENARIO
//       request.urn = result.urn;
//       request.urnExpiration = expirationDate;
//       await request.save();
//     }
  
//     if (!result) {
//       return next(new AppError("Failed to process the DWG file", 400));
//     }
//     res.status(200).json({
//       status: "success",
//       data: result
//     });
//   }
//   else{
//   // Download the file
//   res.download(filePath, drawingFileName, (err) => {
//     if (err) {
//       console.error('Download Error:', err);
//       return next(new AppError("Failed to download the file.", 400));
//     }
//   });
//   }
//   });

exports.getRequestBeforeUpdateRevision = catchAsync(async (req, res, next) => {
  // Find the ArchitectureToRoRequest by ID
  const request = await ArchitectureToRoRequest.findById(
    req.params.id
  ).populate({
        path: "drawingId",
        select: "drawingTitle designDrawingConsultant category",
        populate: [
          { path: "designDrawingConsultant", select: "role" },
          { path: "category", select: "category" },
          { path: "folderId", select: "folderName" },
        ],
      })
      .exec();
  if (!request) {
    return next(new AppError("No request found with that ID", 404));
  }

  // if (!request.drawingFileName) {
  //   return next(new AppError("No drawing file found for this request.", 404));
  // }

  const drawingId = request.drawingId._id;
  const architectureToRoRegister = await ArchitectureToRoRegister.findById(
    drawingId
  );
  if (!architectureToRoRegister) {
    return next(
      new AppError(
        "No drawing found with that ID in ArchitectureToRoRegister",
        404
      )
    );
  }
  const siteId = architectureToRoRegister.siteId;
  if (!siteId) {
    return next(new AppError("No siteId found for the drawing", 404));
  }

    res.status(200).json({
      status: "success",
      data: request,
    });
 
});


exports.getAllRequests = catchAsync(async (req, res, next) => {
  const allRequests = await ArchitectureToRoRequest.find({})
    .populate({
      path: 'drawingId',
      populate: [
        { path: 'siteId' }, 
        { path: 'category' }, 
        { path: 'designDrawingConsultant' } 
      ]
    });

  res.status(200).json({
    status: "success",
    data: allRequests,
  });
});
// exports.getAllRequestsBySiteId = catchAsync(async (req, res, next) => {
//     const { siteId } = req.query; // Access siteId from query parameters

//     // Validate siteId
//     if (!siteId) {
//       return res.status(400).json({
//         status: "fail",
//         message: 'siteId query parameter is required'
//       });
//     }
//     const requests = await ArchitectureToRoRequest.find({ siteId })
//       .populate({
//         path: 'drawingId',
//         select: 'drawingTitle designDrawingConsultant category',
//         populate: [
//           { path: 'designDrawingConsultant', select: 'role' },
//           { path: 'category', select: 'category' },
//           { path: 'folderId', select: 'folderName' },
//         ],
//       })
//       .exec();
  
//     // Log the requests to inspect the result
//     console.log('Requests:', requests);
  
//     if (requests.length === 0) {
//       return res.status(200).json({
//         status: "fail",
//         message: "No requests found for the specified site ID"
//       });
//     }
  
//     res.status(200).json({
//       status: "success",
//       data: requests
//     });
//   });
  

exports.getAllRequestsBySiteId = catchAsync(async (req, res, next) => {
  const { siteId , folderId} = req.query; 
  if (!siteId) {
    return res.status(400).json({
      status: "fail",
      message: 'siteId query parameter is required',
    });
  }
  const userId = req.user.id;
  const userDepartment = req.user.department;
  
  // Step 1: Find the user's customizedView value based on siteId
  const user = await User.findOne({
    _id: userId,
    "permittedSites.siteId": siteId
  }).select('permittedSites');
  
  const customizedView = user ? user.permittedSites.find(site => site.siteId.toString() === siteId).enableModules.customizedView : false;
console.log("customizedView",customizedView);
console.log("userId",userId);
console.log("userDepartment",userDepartment);
  // Step 2: Fetch the design consultants based on the department
  const consultantsInDepartment = await assignDesignConsultantsToDepartment.findOne({
    department: userDepartment,
    siteId: siteId,
    module: "siteHead" // Add siteId filter if needed
  }).select('designConsultants').exec();
  
  const designConsultantIds = consultantsInDepartment ? consultantsInDepartment.designConsultants : [];

  // Step 3: Build the query based on customizedView and other filters
  let query;

  if (customizedView) {
    query = {
      $and: [
        { siteId }, 
        ...(folderId ? [{ folderId }] : []), 
        {
          $or: [
            { designDrawingConsultant: { $in: designConsultantIds } }, 
           
          ]
          
        }
      ]
    };
    console.log("query1");
  } else {
    query = {
      siteId,
      ...(folderId ? { folderId } : [])
    };
    console.log("query2");
  }


  const requests = await ArchitectureToRoRequest.find(query)
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

  // Log the requests to inspect the result
  //console.log('Requests:', requests);

  if (requests.length === 0) {
    return res.status(200).json({
      status: "fail",
      message: "No requests found for the specified site ID",
    });
  }

  

  res.status(200).json({
    status: "success",
    data: requests,
  });
});

exports.updateArchitectureToRoRegisterAndUpdateRequest = catchAsync(async (req, res, next) => {
    if (req.file) {
      req.body.drawingFileName = req.file.filename;
    }
  
    // Find the RO request by ID and populate drawingId
    const architectureToRoRequest = await ArchitectureToRoRequest.findById(req.params.id).populate('drawingId');
    if (!architectureToRoRequest) {
      return next(new AppError("No RO request found with that ID", 404));
    }
  
    // Find the ArchitectureToRoRegister by drawingId
    const architectureToRoRegister = await ArchitectureToRoRegister.findById(architectureToRoRequest.drawingId._id);
    if (!architectureToRoRegister) {
      return next(new AppError("No architectureToRoRegister found with that ID", 404));
    }
  
    // Create a new revision object
    const newRevision = {
      revision: `R${architectureToRoRegister.acceptedRORevisions.length}`, 
      submittedDate: req.body.submittedDate,
      issuedSoftCopy: req.body.issuedSoftCopy,
      receivedHardCopy: req.body.receivedHardCopy,
      drawingFileName: req.body.drawingFileName // Added drawingFileName to new revision
    };
  
    // Add the new revision to the acceptedRORevisions array
    architectureToRoRegister.acceptedRORevisions.push(newRevision);
  
    // Save the updated ArchitectureToRoRegister
    const updatedArchitectureToRoRegister = await architectureToRoRegister.save();
  
    // Update the status of the ArchitectureToRoRequest
    const updatedRequest = await ArchitectureToRoRequest.findByIdAndUpdate(
      req.params.id,
      {
        status: 'Submitted',
        reason: `Approved and changed status to revision ${newRevision.revision}`
      },
      {
        new: true,
        runValidators: true
      }
    );
  
    if (!updatedRequest) {
      return next(new AppError("Failed to update RO request", 400));
    }
  
    // Send the response
    res.status(200).json({
      status: "success",
      data: {
        updatedArchitectureToRoRegister,
        updatedRequest
      }
    });
  });
// Controller function to update only the drawingFileName in the latest revision of acceptedRORevisions
exports.updateDrawingFileNameInLatestRevision = catchAsync(async (req, res, next) => {
    if (!req.file) {
      return next(new AppError("No file uploaded", 400));
    }
  
    const newDrawingFileName = req.file.filename;
  
    // Find the RO request by ID and populate drawingId
    const architectureToRoRequest = await ArchitectureToRoRequest.findById(req.params.id).populate('drawingId');
    if (!architectureToRoRequest) {
      return next(new AppError("No RO request found with that ID", 404));
    }
  
    // Find the ArchitectureToRoRegister by drawingId
    const architectureToRoRegister = await ArchitectureToRoRegister.findById(architectureToRoRequest.drawingId._id);
    if (!architectureToRoRegister) {
      return next(new AppError("No architectureToRoRegister found with that ID", 404));
    }
  
    // Find the last revision index in acceptedRORevisions
    const lastRevisionIndex = architectureToRoRegister.acceptedRORevisions.length - 1;
    if (lastRevisionIndex >= 0) {
      // Update the drawingFileName of the latest revision
      architectureToRoRegister.acceptedRORevisions[lastRevisionIndex].drawingFileName = newDrawingFileName;
    } else {
      return next(new AppError("No revisions found to update drawing file name", 400));
    }
  
    // Save the updated ArchitectureToRoRegister
    const updatedArchitectureToRoRegister = await architectureToRoRegister.save();
  
    // Send the response
    res.status(200).json({
      status: "success",
      data: updatedArchitectureToRoRegister
    });
  });

  exports.rejectRequest = catchAsync(async (req, res, next) => {
    const userId =req.user.id;
    const architectureToRoRequest = await ArchitectureToRoRequest.findById(req.params.id).populate('drawingId');
  
    if (!architectureToRoRequest) {
      return res.status(200).json({
      
        message: "No RO request found with that ID"
      });
    }
  
    
    const updatedRequest = await ArchitectureToRoRequest.findByIdAndUpdate(
      req.params.id,
      {
        status: 'Rejected',
      rejectedBy:userId,
      rejectedDate:Date.now(),
      reason: req.body.reason 
      },
      {
        new: true,
        runValidators: true
      }
    );
  
    if (!updatedRequest) {
      return res.status(200).json({
        
        message: "Failed to update RO request"
      });
    }
    const { drawingNo,siteId, revision } = updatedRequest;
  const updatedRegister = await ArchitectureToRoRegister.findOneAndUpdate(
    { drawingNo, siteId }, 
      { $set: { "acceptedRORevisions.$[elem].rfiStatus": "Not Raised" ,
        "acceptedRORevisions.$[elem].rfiRejectStatus": "Rejected",
        "acceptedArchitectRevisions.$[arch].siteHeadRfiStatus": "Not Raised"
      } }, 
      {
        new: true,  
        arrayFilters: [{ "elem.revision": revision },
           { "arch.revision": revision }
        ]  
      }
    );
    const siteHeadIds = await User.find({
      "permittedSites.siteId": siteId
    }).select('permittedSites _id');
    if (siteHeadIds.length > 0) {
      for (let user of siteHeadIds) {
        //console.log(`User ${user._id} permittedSites:`, JSON.stringify(user.permittedSites, null, 2));
        const site = user?.permittedSites?.find(site => {
          console.log("Checking site:", site?.siteId, "against input:", siteId);
          return site?.siteId?.toString() === siteId.toString();
        });
    
        if (!site) {
          console.warn(`No matching site found for user ${user._id} and siteId ${siteId}`);
          continue;
        }
    
        const rfiAccessEnabled = site?.enableModules?.drawingDetails?.siteHeadDetails?.rfiRaisedAccess;
        console.log(`RFI Access Enabled for site ${site?.siteId}:`, rfiAccessEnabled);
    
        if (rfiAccessEnabled) {
            const notificationMessage1 = `A RFI has been Rejected for drawing number ${drawingNo} with  revision ${revision}.`;
    
            try {
              const notificationToSiteHead = await sendNotification(
                'Drawing', 
                notificationMessage1, 
                'RFI Rejected', 
                'Rejected', 
                user._id
              );
              console.log("notificationToSiteHead", notificationToSiteHead);
            } catch (error) {
              console.error("Error sending notification to SiteHeadId ", user._id, ": ", error);
            
          }
        } 
      }
    } 
    res.status(200).json({
      status: "success",
      data: updatedRequest
    });
  });
  exports.uploadRejectedFile = upload.single('rejectedFile');
  exports.updateRejectedFile = catchAsync(async (req, res, next) => {
    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }
  
    // Find the ArchitectureToRoRequest by ID
    const request = await ArchitectureToRoRequest.findById(req.params.id).populate('drawingId');
    if (!request) {
      return next(new AppError("No request found with that ID", 404));
    }
  
    // Check if the status of the request is "rejected"
    if (request.status !== 'Rejected') {
      return next(new AppError("Request status is not rejected", 400));
    }
  
    // Extract the drawingId from the request and find the corresponding ArchitectureToRoRegister
    const drawingId = request.drawingId._id;
    const architectureToRoRegister = await ArchitectureToRoRegister.findById(drawingId);
    if (!architectureToRoRegister) {
      return next(new AppError("No drawing found with that ID in ArchitectureToRoRegister", 404));
    }
  
    // Extract siteId from the ArchitectureToRoRegister
    const siteId = architectureToRoRegister.siteId;
    if (!siteId) {
      return next(new AppError("No siteId found for the drawing", 404));
    }
  
    // Extract the file extension from the original file
    const fileExtension = path.extname(req.file.originalname);
    const newFilename = `rejectedFile-${req.params.id}-${Date.now()}${fileExtension}`;
   
    const companyId = req.user.companyId;

    // Use the new function to get the upload path
    const { fullPath,relativePath,uploadToS3} = getUploadPath(companyId, newFilename, "drawings", siteId); // Assuming you have companyId in your drawing
  
    try {
      // Save the file
      // await fs.promises.writeFile(fullPath, req.file.buffer);
      // req.file.filename = relativePath;
      await uploadToS3(req.file.buffer, req.file.mimetype);
req.file.filename = relativePath; 
      console.log('File saved successfully:', fullPath);
    } catch (err) {
      console.error('Error saving file:', err);
      return next(new AppError('Failed to save uploaded file.', 400));
    }
  
    try {
      // Update the request with the new file path
      const updatedRequest = await ArchitectureToRoRequest.findByIdAndUpdate(
        req.params.id,
        { rejectedFile: relativePath },
        { new: true, runValidators: true }
      );
  
      if (!updatedRequest) {
        return next(new AppError("No request found with that ID", 404));
      }
  
      console.log('Request updated successfully:', updatedRequest);
  
      res.status(200).json({
        status: 'success',
        data: updatedRequest,
      });
    } catch (err) {
      console.error('Failed to update request:', err);
      return next(new AppError("Failed to update the request with the new file path.", 400));
    }
  });
  
  
  exports.getRejectedFile = catchAsync(async (req, res, next) => {
    
    const request = await ArchitectureToRoRequest.findById(req.params.id).populate('drawingId');
    if (!request) {
      return next(new AppError("No request found with that ID", 404));
    }
    if (request.status !== 'Rejected') {
      return next(new AppError("The request status is not rejected.", 400));
    }
    if (!request.rejectedFile) {
      return next(new AppError("No rejected file found for this request.", 404));
    }
    const drawingId = request.drawingId._id;
    const architectureToRoRegister = await ArchitectureToRoRegister.findById(drawingId);
    if (!architectureToRoRegister) {
      return next(new AppError("No drawing found with that ID in ArchitectureToRoRegister", 404));
    }
    const siteId = architectureToRoRegister.siteId;
    if (!siteId) {
      return next(new AppError("No siteId found for the drawing", 404));
    }
   
  const companyId =req.user.companyId;
  const filePath = path.join(__dirname, `../../uploads/${companyId}/${siteId}/drawings`, request.rejectedFile);
  
    res.download(filePath, request.rejectedFile, (err) => {
      if (err) {
        return next(new AppError("Failed to download the file.", 400));
      }
    });
  });
  
  
exports.acceptRequest = catchAsync(async (req, res, next) => {
  // Step 1: Find the request and populate drawingId
  const userId = req.user.id;
  const architectureToRoRequest = await ArchitectureToRoRequest.findById(
    req.params.id
  ).populate("drawingId");

  if (!architectureToRoRequest) {
    return res.status(404).json({
      status: "fail",
      message: "No RO request found with that ID",
    });
  }

  // ✅ ADDED: conditional status (else works as it is)
  const requestStatus =
    req.query?.status === "Partially Accepted"
      ? "Partially Accepted"
      : "Accepted";

  /* =========================================================
     ✅ ADDED LOGIC ONLY:
     If Accepted → update all Requested reasons to Accepted
  ========================================================= */
  const updateObj = {
    status: requestStatus,
    acceptedBy: userId,
    acceptedDate: Date.now(),
  };

  const updateOptions = {
    new: true,
    runValidators: true,
  };

  if (requestStatus === "Accepted") {
    updateObj["natureOfRequestedInformationReasons.$[elem].action"] =
      "Accepted";
    updateOptions.arrayFilters = [{ "elem.action": "Requested" }];
  }
  /* ======================= END ADDED ====================== */

  // Step 2: Update the request status
  const updatedRequest = await ArchitectureToRoRequest.findByIdAndUpdate(
    req.params.id,
    updateObj,
    updateOptions
  );

  if (!updatedRequest) {
    return res.status(400).json({
      status: "error",
      message: "Failed to update RO request",
    });
  }

  const drawingId = architectureToRoRequest.drawingId._id;
  const revisionToUpdate = architectureToRoRequest.revision;
  const siteId = architectureToRoRequest.siteId;
  const drawingNo = architectureToRoRequest.drawingNo;

  if (revisionToUpdate) {
    const architectureToRoRegister = await ArchitectureToRoRegister.findById(
      drawingId
    );

    if (!architectureToRoRegister) {
      return res.status(404).json({
        status: "fail",
        message: "No ArchitectureToRoRegister found with that drawingId",
      });
    }

    // Find the revision and update issuesInRevision
    const revisionIndex =
      architectureToRoRegister.acceptedRORevisions.findIndex(
        (rev) => rev.revision === revisionToUpdate
      );

    if (revisionIndex === -1) {
      return res.status(404).json({
        status: "fail",
        message: "No matching revision found to update",
      });
    }

    architectureToRoRegister.acceptedRORevisions[revisionIndex].issuesInRevision =
      architectureToRoRequest.remarks;

    // ✅ ADDED: rfiRespondedDate
    architectureToRoRegister.acceptedRORevisions[
      revisionIndex
    ].rfiRespondedDate = Date.now();

    await architectureToRoRegister.save();

    // Fetch the updated ArchitectureToRoRegister document to include in the response
    const updatedArchitectureToRoRegister =
      await ArchitectureToRoRegister.findById(drawingId);

    const siteHeadIds = await User.find({
      "permittedSites.siteId": siteId,
    }).select("permittedSites _id");

    if (siteHeadIds.length > 0) {
      for (let user of siteHeadIds) {
        const site = user?.permittedSites?.find((site) => {
          console.log("Checking site:", site?.siteId, "against input:", siteId);
          return site?.siteId?.toString() === siteId.toString();
        });

        if (!site) {
          console.warn(
            `No matching site found for user ${user._id} and siteId ${siteId}`
          );
          continue;
        }

        const rfiAccessEnabled =
          site?.enableModules?.drawingDetails?.siteHeadDetails?.rfiRaisedAccess;

        console.log(
          `RFI Access Enabled for site ${site?.siteId}:`,
          rfiAccessEnabled
        );

        if (rfiAccessEnabled) {
          const notificationMessage1 = `A RFI has been Responded for drawing number ${drawingNo} with  revision ${revisionToUpdate}.`;

          try {
            const notificationToSiteHead = await sendNotification(
              "Drawing",
              notificationMessage1,
              "RFI Responded",
              requestStatus,
              user._id
            );
            console.log("notificationToSiteHead", notificationToSiteHead);
          } catch (error) {
            console.error(
              "Error sending notification to SiteHeadId ",
              user._id,
              ": ",
              error
            );
          }
        }
      }
    }

    res.status(200).json({
      status: "success",
      data: {
        updatedRequest,
        updatedArchitectureToRoRegister,
      },
    });
  }
});


exports.closeRequest = catchAsync(async (req, res, next) => {
  // Step 1: Find the request and populate drawingId
  const userId =req.user.id;
  const architectureToRoRequest = await ArchitectureToRoRequest.findById(req.params.id).populate('drawingId');

  if (!architectureToRoRequest) {
    return res.status(404).json({
      status: 'fail',
      message: 'No RO request found with that ID'
    });
  }

  // Step 2: Update the request status to 'Closed'
  const updatedRequest = await ArchitectureToRoRequest.findByIdAndUpdate(
    req.params.id,
    {
      status: 'Closed',
      closedBy:userId,
      closedDate:Date.now()
    },
    {
      new: true,
      runValidators: true
    }
  );

  if (!updatedRequest) {
    return res.status(400).json({
      status: 'error',
      message: 'Failed to update RO request'
    });
  }
  const { drawingNo,siteId, revision } = updatedRequest;
  const updatedRegister = await ArchitectureToRoRegister.findOneAndUpdate(
    { drawingNo, siteId },   // Find by drawing number
    { $set: { "acceptedRORevisions.$[elem].rfiStatus": "Raised" ,
      regState: "Drawing"
    } }, 
    {
      new: true,  
      arrayFilters: [{ "elem.revision": revision }]  
    }
  );

  const siteHeadIds = await User.find({
    "permittedSites.siteId": siteId
  }).select('permittedSites _id');
  if (siteHeadIds.length > 0) {
    for (let user of siteHeadIds) {
      //console.log(`User ${user._id} permittedSites:`, JSON.stringify(user.permittedSites, null, 2));
      const site = user?.permittedSites?.find(site => {
        console.log("Checking site:", site?.siteId, "against input:", siteId);
        return site?.siteId?.toString() === siteId.toString();
      });
  
      if (!site) {
        console.warn(`No matching site found for user ${user._id} and siteId ${siteId}`);
        continue;
      }
  
      const rfiAccessEnabled = site?.enableModules?.drawingDetails?.roDetails?.rfiRaisedAccess;
      console.log(`RFI Access Enabled for site ${site?.siteId}:`, rfiAccessEnabled);
  
      if (rfiAccessEnabled) {
          const notificationMessage1 = `A RFI has been Closed for drawing number ${drawingNo} with  revision ${revision}.`;
  
          try {
            const notificationToSiteHead = await sendNotification(
              'Drawing', 
              notificationMessage1, 
              'RFI Closed', 
              'Closed', 
              user._id
            );
            console.log("notificationToSiteHead", notificationToSiteHead);
          } catch (error) {
            console.error("Error sending notification to SiteHeadId ", user._id, ": ", error);
          
        }
      } 
    }
  } 


  res.status(200).json({
    status: 'success',
    data: updatedRequest,
    updatedRegister
  });
});

exports.reopenRequest = catchAsync(async (req, res, next) => {
  const userId = req.user.id; 
  const { id } = req.params;
  
  // Check if the RO request exists
  const architectureToRoRequest = await ArchitectureToRoRequest.findById(id).populate('drawingId');
  if (!architectureToRoRequest) {
    return res.status(404).json({
      status: 'fail',
      message: 'No RO request found with that ID',
    });
  }

  const updateData = {
    ...req.body, 
    status: 'ReOpened', 
    reOpenedBy: userId,
    reOpenedDate: Date.now(),
  };
  const updatedRequest = await ArchitectureToRoRequest.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!updatedRequest) {
    return res.status(400).json({
      status: 'error',
      message: 'Failed to update RO request',
    });
  }
  const { drawingNo,siteId, revision } = updatedRequest;
  const updatedRegister = await ArchitectureToRoRegister.findOneAndUpdate(
    { drawingNo, siteId },
    { $set: { "acceptedRORevisions.$[elem].rfiStatus": "Raised" ,"acceptedArchitectRevisions.$[arch].siteHeadRfiStatus": "Raised"} }, 
    {
      new: true,  
      arrayFilters: [{ "elem.revision": revision },
         { "arch.revision": revision }
      ]  
    }
  );
  const siteHeadIds = await User.find({
    "permittedSites.siteId": siteId
  }).select('permittedSites _id');
  if (siteHeadIds.length > 0) {
    for (let user of siteHeadIds) {
      //console.log(`User ${user._id} permittedSites:`, JSON.stringify(user.permittedSites, null, 2));
      const site = user?.permittedSites?.find(site => {
        console.log("Checking site:", site?.siteId, "against input:", siteId);
        return site?.siteId?.toString() === siteId.toString();
      });
  
      if (!site) {
        console.warn(`No matching site found for user ${user._id} and siteId ${siteId}`);
        continue;
      }
  
      const rfiAccessEnabled = site?.enableModules?.drawingDetails?.siteHeadDetails?.rfiRaisedAccess;
      console.log(`RFI Access Enabled for site ${site?.siteId}:`, rfiAccessEnabled);
  
      if (rfiAccessEnabled) {
        
          const notificationMessage1 = `A RFI has been Reopened for drawing number ${drawingNo} with  revision ${revision}.`;
  
          try {
            const notificationToSiteHead = await sendNotification(
              'Drawing', 
              notificationMessage1, 
              'RFI reopened', 
              'Reopened', 
              user._id
            );
            console.log("notificationToSiteHead", notificationToSiteHead);
          } catch (error) {
            console.error("Error sending notification to SiteHeadId ", user._id, ": ", error);
          }
        
      } 
    }
  } 

  res.status(200).json({
    status: 'success',
    data: updatedRequest,
    updatedRegister
  });
});
exports.resizeRejectedDrawingFile = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  // Find the ArchitectureToRoRequest by ID
  const request = await ArchitectureToRoRequest.findById(req.params.id).populate("drawingId");
  if (!request) {
    return next(new AppError("No request found with that ID", 404));
  }

  // Extract the drawingId from the request and find the corresponding ArchitectureToRoRegister
  const drawingId = request.drawingId._id;
  const architectureToRoRegister = await ArchitectureToRoRegister.findById(drawingId);
  if (!architectureToRoRegister) {
    return next(new AppError("No drawing found with that ID in ArchitectureToRoRegister", 404));
  }

  const siteId = architectureToRoRegister.siteId;
  if (!siteId) {
    return next(new AppError("No siteId found for the drawing", 404));
  }

  const fileExtension = path.extname(req.file.originalname);
  const newFilename = `rejected-${req.params.id}-${Date.now()}${fileExtension}`;
  const companyId = req.user.companyId;

  const { relativePath, uploadToS3 } = getUploadPath(companyId, newFilename, "rejected_drawings", siteId);

  // Upload to S3
  await uploadToS3(req.file.buffer, req.file.mimetype, relativePath);
  req.file.filename = relativePath;

  try {
    const requestDoc = await ArchitectureToRoRequest.findById(req.params.id);

    // Directly process from memory buffer and filename (S3 key)
    const result = await processDWGFile(newFilename, req.file.buffer);

    if (result.urn) {
      requestDoc.urn = result.urn;
      requestDoc.rejectedDwgFile = relativePath;

      const currentDateTime = new Date();
      const expirationDate = new Date(currentDateTime.getTime() + 28 * 24 * 60 * 60 * 1000);

      requestDoc.urnExpiration = expirationDate;

      await requestDoc.save();
    }
  } catch (e) {
    console.error("DWG processing failed:", e);
  }

  next();
});
exports.updateRejectDwgFile = catchAsync(async (req, res, next) => {
  const updateData = req.body;
  if (req.file) {
    updateData.rejectedDwgFile = req.file.filename;
  }

  const updatedRequest = await ArchitectureToRoRequest.findByIdAndUpdate(
    req.params.id,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedRequest) {
    return next(new AppError("No request found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: updatedRequest,
  });
});

exports.getViewRejectDwgFile = catchAsync(async (req, res, next) => {
  const token = req.headers.authorization.split(' ')[1]; // Extract the token from the Authorization header
 
  console.log('Token:', token);
  console.log('URL:', req.originalUrl);
 
  // Find the ArchitectureToRoRegister by ID
  const request = await ArchitectureToRoRequest.findById(req.params.id);
  console.log('Request:', request);
 
 
  // Extract the drawing file name and siteId
  const rejectedDwgFile = request.rejectedDwgFile;
  const siteId = request.siteId;  // Assuming siteId is directly in the request object
 
 
  const companyId =req.user.companyId;
  const filePath = path.join(__dirname, `../../uploads/${companyId}/${siteId}/rejected_drawings`, rejectedDwgFile);
  console.log('File Path:', filePath);
 
  // Handle DWG files with special processing
  if (rejectedDwgFile.endsWith('.dwg')) {
    try {
      const result = await processDWGFile(filePath);
 
      if (!result) {
        return next(new AppError("Failed to process the DWG file", 400));
      }
 
      // Return JSON response with urn and token
      res.status(200).json({
        rejectUrn: result.urn,
        rejectUrnExpiration:Date.now(), // Assuming `urn` is part of the result
        token: result.token // Include the extracted token from the result
      });
 
    } catch (error) {
      console.error('Processing Error:', error);
      return next(new AppError("An error occurred while processing the file", 400));
    }
  } else {
    // Handle image files by sending them for download
    res.download(filePath, drawingFileName, (err) => {
      if (err) {
        console.error('Download Error:', err);
        return next(new AppError("Failed to download the file.", 400));
      }
    });
  }
});

exports.uploadImpactImages = upload.array("impactImages", 10);

exports.updateImpactImages = catchAsync(async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next(new AppError("No images uploaded", 400));
  }

  const request = await ArchitectureToRoRequest.findById(req.params.id);
  if (!request) {
    return next(new AppError("No request found with that ID", 404));
  }

  const siteId = request.siteId;
  const companyId = req.user.companyId;
  const uploadedFilenames = [];

  for (const file of req.files) {
    const fileExtension = path.extname(file.originalname);
    const newFilename = `impactImage-${req.params.id}-${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExtension}`;

    const { relativePath, uploadToS3 } = getUploadPath(companyId, newFilename, "drawings", siteId);

    // Upload directly to S3 (no local write)
    await uploadToS3(file.buffer, file.mimetype, relativePath);

    uploadedFilenames.push(relativePath);
  }

  const updatedRequest = await ArchitectureToRoRequest.findByIdAndUpdate(
    req.params.id,
    { $push: { impactImages: { $each: uploadedFilenames } } },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    status: "success",
    data: updatedRequest,
  });
});

exports.getRequestByDrawingId = catchAsync(async (req, res, next) => {
  const { drawingId, revision, designDrawingConsultant } = req.query;

  const query = {}; // start with empty query

  if (drawingId) {
    query.drawingId = drawingId;
  }

  if (revision) {
    query.revision = revision;
  }

  if (designDrawingConsultant) {
    query['designDrawingConsultant'] = designDrawingConsultant;
  }

  const requests = await ArchitectureToRoRequest.find(query)
    .populate({
      path: "drawingId",
      populate: [
        { path: "designDrawingConsultant", select: "role" },
        { path: "siteId", select: "siteName siteAddress" },
        { path: "companyId", select: "companyDetails.companyName" },
        { path: "category", select: "category" },
        { path: "folderId", select: "folderName" },
      ],
    }).populate('createdBy', 'firstName lastName ').populate('acceptedBy', 'firstName lastName ').populate('closedBy', 'firstName lastName ').populate('reOpenedBy', 'firstName lastName ')
    .exec();

  if (!requests || requests.length === 0) {
    return res.status(400).json({
      status: "failed",
      message: "No matching requests found"
    });
  }

  res.status(200).json({
    status: "success",
    data: requests
  });
});

exports.generatePdfReport = catchAsync(async (req, res) => {
  const { drawingId, revision, designDrawingConsultant } = req.query;

  const query = {};
  if (drawingId) query.drawingId = drawingId;
  if (revision) query.revision = revision;
  if (designDrawingConsultant)
    query.designDrawingConsultant = designDrawingConsultant;

  const requests = await ArchitectureToRoRequest.find(query)
    .populate({
      path: "drawingId",
      populate: [
        { path: "designDrawingConsultant", select: "role" },
        { path: "siteId", select: "siteName siteAddress" },
        { path: "companyId", select: "companyDetails.companyName uploadLogo" },
        { path: "category", select: "category" },
        { path: "folderId", select: "folderName" },
      ],
    })
    .populate("createdBy", "firstName lastName department")
    .populate("acceptedBy", "firstName lastName department")
    .populate("closedBy", "firstName lastName department")
    .populate("reOpenedBy", "firstName lastName department");

  if (!requests || requests.length === 0) {
    return res.status(404).json({ message: "No matching requests found" });
  }

  const first = requests[0];
  const cdnBase = "https://rconfiles.b-cdn.net";

  // Group data by drawingId (matching React component structure)
  const groupedByDrawing = requests.reduce((acc, item) => {
    const drawingIdKey = item?.drawingId?._id?.toString();
    if (!drawingIdKey) return acc;
    
    if (!acc[drawingIdKey]) {
      acc[drawingIdKey] = [];
    }
    acc[drawingIdKey].push(item);
    return acc;
  }, {});

  // Process each request to prepare URLs
  const processedRequests = requests.map((item) => {
    // Convert main PDF
    const fullPdfPath = item.pdfDrawingFileName
      ? item.pdfDrawingFileName.startsWith("http")
        ? item.pdfDrawingFileName
        : `${cdnBase}/${item.pdfDrawingFileName}`
      : null;

    // Process impact images
    const fullImpactImages = Array.isArray(item.impactImages)
      ? item.impactImages.map((imgPath) =>
          imgPath.startsWith("http") ? imgPath : `${cdnBase}/${imgPath}`
        )
      : [];

    // Process reasonFile in natureOfRequestedInformationReasons
    if (
      Array.isArray(item.natureOfRequestedInformationReasons) &&
      item.natureOfRequestedInformationReasons.length > 0
    ) {
      item.natureOfRequestedInformationReasons = item.natureOfRequestedInformationReasons.map((x) => {
        if (x.reasonFile) {
          let file = x.reasonFile || "";
          // Remove Markdown formatting if present
          file = file.replace(/\[.*?\]\((.*?)\)/, "$1");
          if (!file.startsWith("http")) {
            x.reasonFile = `${cdnBase}/${file}`;
          }
        }
        return x;
      });
    }

    return {
      ...item.toObject(),
      pdfDrawingFileName: fullPdfPath,
      impactImages: fullImpactImages,
    };
  });

  // Rebuild groupedByDrawing with processed data
  const processedGroupedByDrawing = processedRequests.reduce((acc, item) => {
    const drawingIdKey = item?.drawingId?._id?.toString();
    if (!drawingIdKey) return acc;
    
    if (!acc[drawingIdKey]) {
      acc[drawingIdKey] = [];
    }
    acc[drawingIdKey].push(item);
    return acc;
  }, {});

  // Company logo path
  let logoPath = null;
  if (first?.drawingId?.companyId?.uploadLogo) {
    const logoFile = first.drawingId.companyId.uploadLogo;

    if (logoFile.startsWith("http")) {
      logoPath = logoFile;
    } else {
      logoPath = `${cdnBase}/${logoFile}`;
    }
  }

  const templatePath = path.join(__dirname, "../../templates/rfi-analysis-template.ejs");

  const userInfo = {
    name: `${first?.createdBy?.firstName || ""} ${first?.createdBy?.lastName ||
      ""}`,
    role: first?.drawingId?.designDrawingConsultant?.role || "",
    department: first?.createdBy?.department || "",
  };

  // Get current user who is downloading the PDF
  const currentUser = await User.findById(req.user.id).select("firstName lastName");
  const downloadedBy = currentUser
    ? `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim()
    : userInfo.name;
  const downloadDate = new Date().toLocaleDateString();

  try {
    const html = await ejs.renderFile(templatePath, {
      groupedByDrawing: processedGroupedByDrawing,
      userInfo,
      logoPath,
      cdnBase,
      downloadedBy,
      downloadDate,
    });

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath: puppeteer.executablePath(),
    });

    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "load" });

    // Wait until all images finish downloading
    await page.evaluate(async () => {
      const imgs = Array.from(document.images);
      await Promise.all(
        imgs.map((img) => {
          if (img.complete) return;
          return new Promise((resolve) => {
            img.addEventListener("load", resolve);
            img.addEventListener("error", resolve);
          });
        }),
      );
    });

    await new Promise((resolve) => setTimeout(resolve, 800));

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div style="font-size: 10px; width: 100%; text-align: center; color: #666;"></div>',
      footerTemplate: `<div style="font-size: 10px; width: 100%; padding: 0 20px; display: flex; justify-content: space-between; color: #666;">
        <span>Downloaded By: <strong>${downloadedBy}</strong> | Date: <strong>${downloadDate}</strong></span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>`,
      margin: {
        top: "20px",
        right: "20px",
        bottom: "80px",
        left: "20px",
      },
    });

    await browser.close();

    const timestamp = new Date()
      .toISOString()
      .replace(/[-:T.]/g, "")
      .slice(0, 14);

    const fileName = `rfi-report-${timestamp}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.end(pdfBuffer);
  } catch (err) {
    console.error("PDF Generation Error:", err);
    res.status(400).json({
      message: "Failed to generate PDF",
      error: err.message,
    });
  }
});

exports.updateNatureOfReasons = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { natureOfRequestId } = req.query; // ✅ NEW

  // 1) Load request + drawing (for siteId used in S3 path)
  const request = await ArchitectureToRoRequest.findById(id).populate("drawingId", "siteId");
  if (!request || !request.drawingId) {
    return next(new AppError("Request or associated drawing not found", 404));
  }

  const companyId = req.user.companyId;

  // Normalize existing reasons as an array
  const existingReasons = Array.isArray(request.natureOfRequestedInformationReasons)
    ? request.natureOfRequestedInformationReasons
    : [];

  // Process single entry
  const newReason = {};

  // Body fields
  if (req.body.natureOfRequest) newReason.natureOfRequest = req.body.natureOfRequest || null;
  if (req.body.reason) newReason.reason = req.body.reason || null;
  if (req.body.action) newReason.action = req.body.action || null;

  // createdBy
  newReason.createdBy = req.user.id;

  // File processing
  const file = req.files && req.files.length > 0 ? req.files[0] : null;
  if (file && file.fieldname.startsWith("reasonFile")) {
    const ext = path.extname(file.originalname) || "";
    const newFilename = `reason-${id}-${Date.now()}${ext}`;

    const { uploadToS3, relativePath } = getUploadPath(
      companyId,
      newFilename,
      "reasons",
      request.drawingId.siteId
    );

    try {
      await uploadToS3(file.buffer, file.mimetype);
      newReason.reasonFile = relativePath;
    } catch (err) {
      return next(new AppError(`Failed to upload file: ${err.message}`, 500));
    }
  }

  // Validate at least one field
  if (
    !newReason.natureOfRequest &&
    !newReason.reason &&
    !newReason.action &&
    !newReason.reasonFile
  ) {
    return next(
      new AppError(
        "At least one field (natureOfRequest, reason, action, or reasonFile) is required",
        400
      )
    );
  }

  let updatedReasons;

  // =====================================================
  // ✅ NEW LOGIC: UPDATE EXISTING REASON IF ID PROVIDED
  // =====================================================
  if (natureOfRequestId) {
    let found = false;

    updatedReasons = existingReasons.map((r) => {
      if (r._id.toString() === natureOfRequestId) {
        found = true;
        return {
          ...r.toObject(),
          ...newReason,
          isHistory: true, // optional: mark edited record
        };
      }
      return r;
    });

    if (!found) {
      return next(new AppError("Nature of request reason not found", 404));
    }

  } else {
    // =====================================================
    // ✅ EXISTING LOGIC (UNCHANGED): PREPEND NEW ENTRY
    // =====================================================
    updatedReasons = [
      newReason,
      ...existingReasons.filter(
        (r) => r.natureOfRequest || r.reason || r.action || r.reasonFile
      ),
    ];
  }

  // Save updated reasons back to the document
  const updatedRequest = await ArchitectureToRoRequest.findByIdAndUpdate(
    id,
    { $set: { natureOfRequestedInformationReasons: updatedReasons } },
    { new: true, runValidators: true }
  );

  if (!updatedRequest) {
    return next(new AppError("No request found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: updatedRequest,
  });
});


// PUT: /api/site-requests/updateAction?rfiId=...&reasonId=...
exports.updateAction = catchAsync(async (req, res, next) => {
  const { rfiId, reasonId } = req.query;
  const { action } = req.body;

  // Validate ObjectIds
  if (!mongoose.Types.ObjectId.isValid(rfiId)) {
    return next(new AppError("Invalid rfiId format", 400));
  }

  if (!mongoose.Types.ObjectId.isValid(reasonId)) {
    return next(new AppError("Invalid reasonId format", 400));
  }

  // Validate action field
  if (!action) {
    return next(new AppError("Action field is required", 400));
  }

  // Update nested array element
const updatedRequest = await ArchitectureToRoRequest.findOneAndUpdate(
  {
    _id: rfiId, // Parent document
    "natureOfRequestedInformationReasons._id": reasonId // Nested array match
  },
  {
    $set: { "natureOfRequestedInformationReasons.$.action": action } // ✅ Correct usage
  },
  { new: true }
);


  if (!updatedRequest) {
    return next(new AppError("Request or reason not found", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Action updated successfully",
    data: updatedRequest
  });
});

exports.updateViewDates = catchAsync(async (req, res, next) => {
  const { _id } = req.body;
  const userId = req.user.id;

  if (!_id) {
    return res.status(400).json({
      status: "fail",
      message: "_id is required",
    });
  }

  // Check document exists
  const rfi = await ArchitectureToRoRequest.findById(_id);
  if (!rfi) {
    return res.status(404).json({
      status: "fail",
      message: "No matching document found",
    });
  }

  // Check if user already viewed
  const alreadyViewed = rfi.viewedBy?.some(
    (v) => v.user?.toString() === userId.toString(),
  );

  if (!alreadyViewed) {
    await ArchitectureToRoRequest.findOneAndUpdate(
      { _id },
      {
        $push: {
          viewedBy: {
            user: userId,
            viewedAt: new Date(),
          },
        },
        $set: {
          status: "Responded", // ✅ added
        },
      },
      { new: true },
    );
  }

  const updatedRfi = await ArchitectureToRoRequest.findById(_id);

  res.status(200).json({
    status: "success",
    data: {
      rfi: updatedRfi,
    },
  });
});

exports.getRequestById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // 1️⃣ Fetch the request by ID
  const request = await ArchitectureToRoRequest.findById(id)
    .populate({
      path: "drawingId",
      select: "drawingTitle designDrawingConsultant category",
      populate: [
        { path: "designDrawingConsultant", select: "role" },
        { path: "category", select: "category" },
        { path: "folderId", select: "folderName" },
      ],
    })
    .populate({
      path: "viewedBy.user",
      select: "firstName email role",
    });

  if (!request) {
    return res.status(404).json({
      status: "fail",
      message: "Request not found",
    });
  }

  // 2️⃣ Fetch related requests by same drawingId (excluding current request)
   const relatedRequests = await ArchitectureToRoRequest.find({
    drawingId: request.drawingId,
    // _id: { $ne: request._id }, // exclude the current request
  })
    .populate({
      path: "drawingId",
      select: "drawingTitle designDrawingConsultant category",
      populate: [
        { path: "designDrawingConsultant", select: "role" },
        { path: "category", select: "category" },
        { path: "folderId", select: "folderName" },
      ],
    })
    .populate({
      path: "viewedBy.user",
      select: "firstName email role",
    });

  res.status(200).json({
    status: "success",
    data: {
      request,
      relatedRequests,
    },
  });
});


exports.deleteNatureOfReason = catchAsync(async (req, res, next) => {
  const { id, reasonId } = req.params;

  const request = await ArchitectureToRoRequest.findById(id);
  if (!request) {
    return next(new AppError("Request not found", 404));
  }

  const reasons = Array.isArray(request.natureOfRequestedInformationReasons)
    ? request.natureOfRequestedInformationReasons
    : [];

  const initialLength = reasons.length;

  const updatedReasons = reasons.filter(
    (r) => r._id.toString() !== reasonId
  );

  if (updatedReasons.length === initialLength) {
    return next(new AppError("Reason not found", 404));
  }

  request.natureOfRequestedInformationReasons = updatedReasons;
  await request.save();

  res.status(200).json({
    status: "success",
    message: "Reason deleted successfully",
  });
});
