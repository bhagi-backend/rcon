const ArchitectureToRoRegister = require("../../models/drawingModels/architectureToRoRegisterModel");
const ArchitectureToRoRequest = require("../../models/drawingModels/architectureToRoRequestedModel");
const ArchitecturePendingRegisters = require("../../models/drawingModels/architecturePendingRegisterModel");
const { catchAsync } = require("../../utils/catchAsync");
const multer = require("multer");
const fs = require("fs");
const AppError = require("../../utils/appError");
const {
  processDWGFile,
  getDWGFileToken,
} = require("./dwgFileHandlingController");
const path = require("path");
const sendNotification = require("../../utils/utilFun");
const multerWrapper = require("../../utils/multerFun");
const getUploadPath = require("../../utils/pathFun");
const mongoose = require("mongoose");
const User = require("../../models/userModel");
const RoToSiteLevelRequest = require("../../models/drawingModels/roToSiteLevelRequestedModel");
const upload = multerWrapper();
const ejs = require("ejs");
const puppeteer = require("puppeteer");
exports.uploadDrawingFile = upload.single("drawingFileName");
exports.uploadRejectDrawingFile = upload.single("rejectDwgFile");

// Create a new request
exports.createRequest = catchAsync(async (req, res, next) => {
  const { drawingId, drawingNo, revision, roRfiId, rfiType, siteId } = req.body;
  const userId = req.user.id;
  req.body.createdBy = userId;

  // Fetch the drawing register data
  const registerData = await ArchitectureToRoRegister.findOne({
    _id: drawingId,
  });

  req.body.designDrawingConsultant = registerData.designDrawingConsultant;
  req.body.folderId = registerData.folderId;
  if (drawingNo && revision) {
    const existingRequest = await ArchitectureToRoRequest.findOne({
      drawingNo: drawingNo,
      revision: revision,
    });
    console.log("existingRequest",existingRequest)
    if (existingRequest) {
      return res.status(200).json({
        status: "error",
        message: `Revision ${revision} already requested from drawing No ${drawingNo}`,
      });
    }
  }

  if (drawingNo) {
    const parts = drawingNo.split("-");
    const lastPart = parts[parts.length - 1];
    const number = lastPart.replace(/\D/g, "");
    if (number) {
      req.body.architectRfiNo = number.padStart(3, "0");
    } else {
      req.body.architectRfiNo = "000";
    }
  }

  const newRequest = await ArchitectureToRoRequest.create(req.body);

  const populatedRequest = await ArchitectureToRoRequest.findById(
    newRequest._id
  ).populate("drawingId", "designDrawingConsultant");

  const { designDrawingConsultant } = populatedRequest.drawingId;

  const notificationMessage = `A new architecture to Ro RFI has been raised for drawing number ${drawingNo} with revision ${revision}.`;
  const notification = await sendNotification(
    "Drawing",
    notificationMessage,
    "New Request Created",
    "Requested",
    designDrawingConsultant
  );

  const updatedRegister = await ArchitectureToRoRegister.findOneAndUpdate(
    { drawingNo, siteId: req.body.siteId },
    { $set: { "acceptedArchitectRevisions.$[elem].rfiStatus": "Raised" } },
    {
      new: true,
      arrayFilters: [{ "elem.revision": revision }],
    }
  );

  const siteHeadIds = await User.find({
    "permittedSites.siteId": siteId,
  }).select("permittedSites _id");

  if (siteHeadIds.length > 0) {
    for (let user of siteHeadIds) {
      const site = user
        ? user.permittedSites.find((site) => site.siteId.toString() === siteId)
            .enableModules.drawingDetails.siteHeadDetails.rfiRaisedAccess
        : false;
      if (site) {
        if (rfiType) {
          const notificationMessage1 = `A RFI has been forwarded for drawing number ${drawingNo} with architect revision ${revision}.`;

          try {
            await sendNotification(
              "Drawing",
              notificationMessage1,
              "Request forwarded",
              "Forwarded",
              user._id
            );
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
  }

  if (roRfiId) {
    await RoToSiteLevelRequest.findByIdAndUpdate(
      roRfiId,
      {
        $set: {
          architectRfiId: newRequest._id,
          rfiState: "Forwarded",
          status: "Forwarded",
        },
      },
      { new: true }
    );
  }

  res.status(200).json({
    status: "success",
    data: newRequest,
    notification,
    updatedRegister,
  });
});

// exports.resizeDrawingFile = catchAsync(async (req, res, next) => {
//   if (!req.file) return next();

//   // Find the ArchitectureToRoRequest by ID
//   const request = await ArchitectureToRoRequest.findById(
//     req.params.id
//   ).populate("drawingId");
//   if (!request) {
//     return next(new AppError("No request found with that ID", 404));
//   }

//   // Extract the drawingId from the request and find the corresponding ArchitectureToRoRegister
//   const drawingId = request.drawingId._id;
//   const architectureToRoRegister = await ArchitectureToRoRegister.findById(
//     drawingId
//   );
//   if (!architectureToRoRegister) {
//     return next(
//       new AppError(
//         "No drawing found with that ID in ArchitectureToRoRegister",
//         404
//       )
//     );
//   }

//   // Extract siteId from the ArchitectureToRoRegister
//   const siteId = architectureToRoRegister.siteId;
//   if (!siteId) {
//     return next(new AppError("No siteId found for the drawing", 404));
//   }

//   // Extract the file extension from the original file
//   const fileExtension = path.extname(req.file.originalname);
//   const newFilename = `request-${req.params.id}-${Date.now()}${fileExtension}`;

//   const companyId = req.user.companyId;
//   // Use the new function to get the upload path
//   const { fullPath, relativePath,uploadToS3} = getUploadPath(
//     companyId,
//     newFilename,
//     "drawings",
//     siteId
//   ); // Assuming you have companyId in your drawing

//   // Save the file
//   // fs.writeFile(fullPath, req.file.buffer, (err) => {
//   //   if (err) {
//   //     return next(new AppError("Failed to save uploaded file.", 400));
//   //   }
//   //   next();
//   //   req.file.filename = relativePath;
//   // });
//    // Upload to S3 (no sharp)
//   await uploadToS3(req.file.buffer, req.file.mimetype);

//   // Store relative path in req.file for later use
//   req.file.filename = relativePath;

//   next();

//   try {
//     const registerDrawing = await ArchitectureToRoRequest.findById(
//       req.params.id
//     );

//   //  const result = await processDWGFile(fullPath);
//      const result = await processDWGFile(drawingFileName, drawingFile.buffer);

//     if (result.urn) {
//       registerDrawing.urn = result.urn;
//       registerDrawing.drawingFileName = relativePath;

//       const currentDateTime = new Date();
//       const expirationDate = new Date(
//         currentDateTime.getTime() + 28 * 24 * 60 * 60 * 1000
//       );

//       registerDrawing.urnExpiration = expirationDate;

//       // Mark the array as modified
//       //registerDrawing.markModified('acceptedRORevisions');

//       // Save the document
//       await registerDrawing.save();
//     }
//   } catch (e) {
//     console.log(e);
//   }
// });
exports.resizeDrawingFile = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  const request = await ArchitectureToRoRequest.findById(req.params.id).populate("drawingId");
  if (!request) return next(new AppError("No request found with that ID", 404));

  const drawingId = request.drawingId._id;
  const architectureToRoRegister = await ArchitectureToRoRegister.findById(drawingId);
  if (!architectureToRoRegister) return next(new AppError("No drawing found in ArchitectureToRoRegister", 404));

  const siteId = architectureToRoRegister.siteId;
  const fileExtension = path.extname(req.file.originalname);
  const newFilename = `request-${req.params.id}-${Date.now()}${fileExtension}`;
  const companyId = req.user.companyId;

  const { relativePath, uploadToS3 } = getUploadPath(companyId, newFilename, "drawings", siteId);

  // Upload to S3
  await uploadToS3(req.file.buffer, req.file.mimetype);
  req.file.filename = relativePath;

  next(); // Continue response pipeline

  // Trigger Autodesk DWG translation
  try {
    const result = await processDWGFile(newFilename, req.file.buffer);
    if (result.urn) {
      request.urn = result.urn;
      request.drawingFileName = relativePath;
      request.urnExpiration = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000);
      await request.save();
    }
  } catch (e) {
    console.log("Autodesk DWG processing failed:", e.message);
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

exports.getViewRequest = catchAsync(async (req, res, next) => {
  const revision = req.query.revision;
  const token = req.headers.authorization.split(" ")[1]; // Extract the token from the Authorization header

  console.log("Token:", token);
  console.log("URL:", req.originalUrl);

  // Find the ArchitectureToRoRegister by ID
  const request = await ArchitectureToRoRegister.findById(req.params.id);
  console.log("Request:", request);

  // If no request found, return error
  if (!request) {
    return next(new AppError("No request found with that ID", 404));
  }

  // Ensure revisions exist and is an array
  if (
    !request.acceptedArchitectRevisions ||
    !Array.isArray(request.acceptedArchitectRevisions)
  ) {
    return next(new AppError("No revisions found for this request.", 404));
  }

  // Find the specific revision
  const revisionObj = request.acceptedArchitectRevisions.find(
    (el) => el.revision === revision
  );

  // If the revision is not found, return error
  if (!revisionObj) {
    return next(
      new AppError("No drawing file found for the specified revision.", 404)
    );
  }

  // Extract the drawing file name and siteId
  const drawingFileName = revisionObj.drawingFileName;
  const siteId = request.siteId; // Assuming siteId is directly in the request object

  console.log("Drawing File Name:", drawingFileName);
  console.log("Site ID:", siteId);

  const companyId = req.user.companyId;
  const filePath = path.join(
    __dirname,
    `../../uploads/${companyId}/${siteId}/drawings`,
    drawingFileName
  );
  console.log("File Path:", filePath);

  // Handle DWG files with special processing
  if (drawingFileName.endsWith(".dwg")) {
    try {
      const result = await processDWGFile(filePath);

      if (!result) {
        return next(new AppError("Failed to process the DWG file", 400));
      }

      // Return JSON response with urn and token
      res.status(200).json({
        urn: result.urn, // Assuming `urn` is part of the result
        token: result.token, // Include the extracted token from the result
      });
    } catch (error) {
      console.error("Processing Error:", error);
      return next(
        new AppError("An error occurred while processing the file", 400)
      );
    }
  } else {
    // Handle image files by sending them for download
    res.download(filePath, drawingFileName, (err) => {
      if (err) {
        console.error("Download Error:", err);
        return next(new AppError("Failed to download the file.", 400));
      }
    });
  }
});
exports.getRequest = catchAsync(async (req, res, next) => {
  const revision = req.query.revision;

  // Find the ArchitectureToRoRegister by ID
  const request = await ArchitectureToRoRegister.findById(req.params.id);
  console.log("Request:", request);

  // If no request found, return error
  if (!request) {
    return next(new AppError("No request found with that ID", 404));
  }

  // Ensure revisions exist and is an array
  if (
    !request.acceptedArchitectRevisions ||
    !Array.isArray(request.acceptedArchitectRevisions)
  ) {
    return next(new AppError("No revisions found for this request.", 404));
  }

  // Find the specific revision
  const revisionObj = request.acceptedArchitectRevisions.find(
    (el) => el.revision === revision
  );

  // If the revision is not found, return error
  if (!revisionObj) {
    return next(
      new AppError("No drawing file found for the specified revision.", 404)
    );
  }

  // Extract the drawing file name and siteId
  const drawingFileName = revisionObj.drawingFileName;
  const siteId = request.siteId; // Assuming siteId is directly in the request object

  console.log("Drawing File Name:", drawingFileName);
  console.log("Site ID:", siteId);

  const companyId = req.user.companyId;
  const filePath = path.join(
    __dirname,
    `../../uploads/${companyId}/${siteId}/drawings`,
    drawingFileName
  );
  console.log("File Path:", filePath);

  // Download the file
  res.download(filePath, drawingFileName, (err) => {
    if (err) {
      console.error("Download Error:", err);
      return next(new AppError("Failed to download the file.", 400));
    }
  });
});

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

  // const drawingFileName = request.drawingFileName;

  // const companyId = req.user.companyId;
  // const filePath = path.join(
  //   __dirname,
  //   `../../uploads/${companyId}/${siteId}/drawings`,
  //   drawingFileName
  // );

  // if (drawingFileName.endsWith(".dwg")) {
  //   let result = await getDWGFileToken();

  //   if (request.urn && request.urnExpiration > new Date()) {
  //     result.urn = request.urn;
  //   } else {
  //     const imgRes = await processDWGFile(filePath);
  //     result.urn = imgRes.urn;
  //     const currentDateTime = new Date();
  //     const expirationDate = new Date(
  //       currentDateTime.getTime() + 28 * 24 * 60 * 60 * 1000
  //     );
  //     result.urnExpiration = expirationDate;

  //     //TODO: NEED TO TEST THIS SCENARIO
  //     request.urn = result.urn;
  //     request.urnExpiration = expirationDate;
  //     await request.save();
  //   }

  //   if (!result) {
  //     return next(new AppError("Failed to process the DWG file", 400));
  //   }
    res.status(200).json({
      status: "success",
      data: request,
    });
  // } else {
  //   // Download the file
  //   res.download(filePath, drawingFileName, (err) => {
  //     if (err) {
  //       console.error("Download Error:", err);
  //       return next(new AppError("Failed to download the file.", 400));
  //     }
  //   });
  // }
});

exports.getAllRequests = catchAsync(async (req, res, next) => {
  const allRequests = await ArchitectureToRoRequest.find({}).populate({
    path: "drawingId",
    populate: [
      { path: "siteId" },
      { path: "category" },
      { path: "designDrawingConsultant" },
    ],
  });

  res.status(200).json({
    status: "success",
    data: allRequests,
  });
});

exports.getAllRequestsBySiteId = catchAsync(async (req, res, next) => {
  const { siteId } = req.query;

  // Construct the query object
  const query = {};

  // If siteId is provided, add it to the query object
  if (siteId) {
    query.siteId = siteId;
  }
  if (folderId) query.folderId = folderId;
  try {
    const allRequests = await ArchitectureToRoRequest.find(query)
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

    res.status(200).json({
      status: "success",
      data: allRequests.length ? allRequests : [],
    });
  } catch (error) {
    console.error("Error fetching requests:", error);
    return next(new AppError("Failed to retrieve requests", 400));
  }
});
exports.updateArchitectureToRoRegisterAndUpdateRequest = catchAsync(
  async (req, res, next) => {
    if (req.file) {
      req.body.drawingFileName = req.file.filename;
    }
    const architectureToRoRequest = await ArchitectureToRoRequest.findById(
      req.params.id
    ).populate("drawingId");
    if (!architectureToRoRequest) {
      return next(new AppError("No RO request found with that ID", 404));
    }

    const architectureToRoRegister = await ArchitectureToRoRegister.findById(
      architectureToRoRequest.drawingId._id
    );
    if (!architectureToRoRegister) {
      return next(
        new AppError("No architectureToRoRegister found with that ID", 404)
      );
    }

    const newRevision = {
      revision: `R${architectureToRoRegister.acceptedArchitectRevisions.length}`,
      submittedDate: req.body.submittedDate,
      issuedSoftCopy: req.body.issuedSoftCopy,
      receivedHardCopy: req.body.receivedHardCopy,
    };

    architectureToRoRegister.acceptedArchitectRevisions.push(newRevision);

    const updatedArchitectureToRoRegister = await architectureToRoRegister.save();

    const updatedRequest = await ArchitectureToRoRequest.findByIdAndUpdate(
      req.params.id,
      {
        status: "Submitted",
        reason: `Approved and changed status to revision ${newRevision.revision}`,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedRequest) {
      return next(new AppError("Failed to update RO request", 400));
    }

    res.status(200).json({
      status: "success",
      data: {
        updatedArchitectureToRoRegister,
        updatedRequest,
      },
    });
  }
);

// Controller function to update only the drawingFileName
exports.updateDrawingFileNameInLatestRevision = catchAsync(
  async (req, res, next) => {
    if (!req.file) {
      return next(new AppError("No file uploaded", 400));
    }

    const newDrawingFileName = req.file.filename;

    const architectureToRoRequest = await ArchitectureToRoRequest.findById(
      req.params.id
    ).populate("drawingId");
    if (!architectureToRoRequest) {
      return next(new AppError("No RO request found with that ID", 404));
    }

    const architectureToRoRegister = await ArchitectureToRoRegister.findById(
      architectureToRoRequest.drawingId._id
    );
    if (!architectureToRoRegister) {
      return next(
        new AppError("No architectureToRoRegister found with that ID", 404)
      );
    }

    const lastRevisionIndex =
      architectureToRoRegister.acceptedArchitectRevisions.length - 1;
    if (lastRevisionIndex >= 0) {
      architectureToRoRegister.acceptedArchitectRevisions[
        lastRevisionIndex
      ].drawingFileName = newDrawingFileName;
    } else {
      return next(
        new AppError("No revisions found to update drawing file name", 400)
      );
    }

    const updatedArchitectureToRoRegister = await architectureToRoRegister.save();

    res.status(200).json({
      status: "success",
      data: updatedArchitectureToRoRegister,
    });
  }
);

exports.rejectRequest = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  // Fetch the ArchitectureToRoRequest and populate the drawingId
  const architectureToRoRequest = await ArchitectureToRoRequest.findById(
    req.params.id
  ).populate("drawingId");

  if (!architectureToRoRequest) {
    return next(new AppError("No RO request found with that ID", 404));
  }

  // Update the RO request to Rejected
  const updatedRequest = await ArchitectureToRoRequest.findByIdAndUpdate(
    req.params.id,
    {
      status: "Rejected",
      rejectedBy: userId,
      rejectedDate: Date.now(),
      reason: req.body.reason,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedRequest) {
    return next(new AppError("Failed to update RO request", 400));
  }

  const { drawingNo, siteId, revision, rfiType, roRfiId } = updatedRequest;

  if (rfiType === "Created") {
    // Handle case where rfiType is "Created"
    const updatedRegister = await ArchitectureToRoRegister.findOneAndUpdate(
      { drawingNo, siteId },
      {
        $set: { "acceptedArchitectRevisions.$[elem].rfiStatus": "Not Raised" },
      },
      {
        new: true,
        arrayFilters: [{ "elem.revision": revision }],
      }
    );

    if (!updatedRegister) {
      return next(
        new AppError("Failed to update ArchitectureToRoRegister", 400)
      );
    }
    const siteHeadIds = await User.find({
      "permittedSites.siteId": siteId,
    }).select("permittedSites _id");
    if (siteHeadIds.length > 0) {
      for (let user of siteHeadIds) {
        //console.log(`User ${user._id} permittedSites:`, JSON.stringify(user.permittedSites, null, 2));
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
          site?.enableModules?.drawingDetails?.roDetails?.rfiRaisedAccess;
        console.log(
          `RFI Access Enabled for site ${site?.siteId}:`,
          rfiAccessEnabled
        );

        if (rfiAccessEnabled) {
          const notificationMessage1 = `A RFI has been Rejected for drawing number ${drawingNo} with  revision ${revision}.`;

          try {
            const notificationToSiteHead = await sendNotification(
              "Drawing",
              notificationMessage1,
              "RFI Rejected",
              "Rejected",
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
      data: updatedRequest,
      updatedRegister,
    });
  } else if (rfiType === "Forwarded") {
    // Handle case where rfiType is "Forwarded"
    const roRequest = await RoToSiteLevelRequest.findById(roRfiId);

    if (!roRequest) {
      return next(
        new AppError("No RO-to-Site Level Request found with that ID", 404)
      );
    }

    // Update the RO-to-Site Level Request status to Rejected
    const updatedRoRequest = await RoToSiteLevelRequest.findByIdAndUpdate(
      roRfiId,
      {
        status: "Rejected",
        rejectedBy: userId,
        rejectedDate: Date.now(),
        reason: req.body.reason,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedRoRequest) {
      return next(
        new AppError("Failed to update RO-to-Site Level Request", 400)
      );
    }
    const roRevision = updatedRoRequest.revision;
    // Proceed to update the register for forwarded case if necessary
    const updatedRegister = await ArchitectureToRoRegister.findOneAndUpdate(
      { drawingNo, siteId },
      {
        $set: {
          "acceptedArchitectRevisions.$[architectElem].rfiStatus": "Not Raised",
          "acceptedRORevisions.$[roElem].rfiStatus": "Not Raised",
        },
      },
      {
        new: true,
        arrayFilters: [
          { "architectElem.revision": revision }, // Filter for acceptedArchitectRevisions
          { "roElem.revision": roRevision }, // Filter for acceptedRORevisions
        ],
      }
    );

    const siteHeadIds = await User.find({
      "permittedSites.siteId": siteId,
    }).select("permittedSites _id");
    if (siteHeadIds.length > 0) {
      for (let user of siteHeadIds) {
        //console.log(`User ${user._id} permittedSites:`, JSON.stringify(user.permittedSites, null, 2));
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
          site?.enableModules?.drawingDetails?.roDetails?.rfiRaisedAccess;
        console.log(
          `RFI Access Enabled for site ${site?.siteId}:`,
          rfiAccessEnabled
        );

        if (rfiAccessEnabled) {
          const notificationMessage1 = `A RFI has been Rejected for drawing number ${drawingNo} with  revision ${revision}.`;

          try {
            const notificationToSiteHead = await sendNotification(
              "Drawing",
              notificationMessage1,
              "RFI Rejected",
              "Rejected",
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
      data: updatedRequest,
      updatedRoRequest,
      updatedRegister,
    });
  } else {
    return next(new AppError("Invalid rfiType value", 400));
  }
});

exports.uploadRejectedFile = upload.single("rejectedFile");

exports.updateRejectedFile = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError("No file uploaded", 400));
  }

  // Log the request ID
  console.log("Request ID:", req.params.id);

  // Check if the request ID is valid
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return next(new AppError("Invalid request ID", 400));
  }

  // Find the ArchitectureToRoRequest by ID
  const request = await ArchitectureToRoRequest.findById(
    req.params.id
  ).populate("drawingId");
  if (!request) {
    return next(new AppError("No request found with that ID", 404));
  }

  // Check if the status of the request is "rejected"
  if (request.status !== "Rejected") {
    return next(new AppError("Request status is not rejected", 400));
  }

  // Extract the drawingId from the request and find the corresponding ArchitectureToRoRegister
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

  // Extract siteId from the ArchitectureToRoRegister
  const siteId = architectureToRoRegister.siteId;
  if (!siteId) {
    return next(new AppError("No siteId found for the drawing", 404));
  }

  // Extract the file extension from the original file
  const fileExtension = path.extname(req.file.originalname);
  const newFilename = `rejectedFile-${
    req.params.id
  }-${Date.now()}${fileExtension}`;

  const companyId = req.user.companyId;

  // Use the new function to get the upload path
  const { fullPath, relativePath,uploadToS3 } = getUploadPath(
    companyId,
    newFilename,
    "drawings",
    siteId
  ); // Assuming you have companyId in your drawing

  try {
    // Save the file
    //await fs.promises.writeFile(fullPath, req.file.buffer);
     await uploadToS3(req.file.buffer, req.file.mimetype);
    req.file.filename = relativePath;
    //console.log("File saved successfully:", fullPath);
  } catch (err) {
    console.error("Error saving file:", err);
    return next(new AppError("Failed to save uploaded file.", 400));
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

    console.log("Request updated successfully:", updatedRequest);

    res.status(200).json({
      status: "success",
      data: updatedRequest,
    });
  } catch (err) {
    console.error("Failed to update request:", err);
    return next(
      new AppError("Failed to update the request with the new file path.", 400)
    );
  }
});

exports.getRejectedFile = catchAsync(async (req, res, next) => {
  // Find the ArchitectureToRoRequest by ID
  const request = await ArchitectureToRoRequest.findById(
    req.params.id
  ).populate("drawingId");
  if (!request) {
    return next(new AppError("No request found with that ID", 404));
  }

  // Check if the status is rejected
  if (request.status !== "Rejected") {
    return next(new AppError("The request status is not rejected.", 400));
  }

  // Check if the rejectedFile exists
  if (!request.rejectedFile) {
    return next(new AppError("No rejected file found for this request.", 404));
  }

  // Extract the drawingId from the request and find the corresponding ArchitectureToRoRegister
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

  // Extract siteId from the ArchitectureToRoRegister
  const siteId = architectureToRoRegister.siteId;
  if (!siteId) {
    return next(new AppError("No siteId found for the drawing", 404));
  }

  const companyId = req.user.companyId;
  const filePath = path.join(
    __dirname,
    `../../uploads/${companyId}/${siteId}/drawings`,
    request.rejectedFile
  );

  // Send the rejected file as a download
  res.download(filePath, request.rejectedFile, (err) => {
    if (err) {
      return next(new AppError("Failed to download the file.", 400));
    }
  });
});
exports.acceptRequest = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  // Fetch the ArchitectureToRoRequest and populate the drawingId
  const architectureToRoRequest = await ArchitectureToRoRequest.findById(
    req.params.id
  ).populate({
    path: "drawingId",
    select: "_id",
  });

  // Handle missing RO request
  if (!architectureToRoRequest) {
    return res.status(404).json({
      status: "fail",
      message: "No RO request found with that ID",
    });
  }

  // Handle missing drawingId in the request
  if (!architectureToRoRequest.drawingId) {
    return res.status(404).json({
      status: "fail",
      message: "No drawingId found in the RO request",
    });
  }

  // Update the RO request status
  const updatedRequest = await ArchitectureToRoRequest.findByIdAndUpdate(
    req.params.id,
    {
      status: "Responded",
      acceptedBy: userId,
      acceptedDate: Date.now(),
    },
    {
      new: true,
      runValidators: true,
    }
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
  // Update revision in ArchitectureToRoRegister if revisionToUpdate exists
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

    const revisionIndex = architectureToRoRegister.acceptedArchitectRevisions.findIndex(
      (rev) => rev.revision === revisionToUpdate
    );

    if (revisionIndex !== -1) {
      architectureToRoRegister.acceptedArchitectRevisions[
        revisionIndex
      ].issuesInRevision = architectureToRoRequest.remarks;
      architectureToRoRegister.archRevision = revisionToUpdate;
      architectureToRoRegister.regState = "Pending";
      await architectureToRoRegister.save();
      console.log("Document updated successfully");
    }
  }

  // Handle RO RFI updates if `roRfiId` exists
  const roRfiId = architectureToRoRequest.roRfiId;
  const RoRequest = roRfiId
    ? await RoToSiteLevelRequest.findById(roRfiId).populate({
        path: "drawingId",
        select: "_id",
      })
    : null;

  const updatedRoRequest = roRfiId
    ? await RoToSiteLevelRequest.findByIdAndUpdate(
        roRfiId,
        {
          status: "Responded",
          acceptedBy: userId,
          acceptedDate: Date.now(),
        },
        {
          new: true,
          runValidators: true,
        }
      )
    : null;

  if (RoRequest) {
    const roDrawingId = RoRequest.drawingId?._id || null;
    const roRevisionToUpdate = RoRequest.revision || null;

    if (roRevisionToUpdate && roDrawingId) {
      const roRegister = await ArchitectureToRoRegister.findById(roDrawingId);

      if (roRegister) {
        const revisionIndex1 = roRegister.acceptedRORevisions.findIndex(
          (rev) => rev.revision === roRevisionToUpdate
        );

        if (revisionIndex1 !== -1) {
          roRegister.acceptedRORevisions[revisionIndex1].issuesInRevision =
            architectureToRoRequest.remarks;
          await roRegister.save();
        }
      }
    }
  }

  // Fetch updated data for response
  const updatedArchitectureToRoRegister = await ArchitectureToRoRegister.findById(
    drawingId
  );

  const siteHeadIds = await User.find({
    "permittedSites.siteId": siteId,
  }).select("permittedSites _id");
  if (siteHeadIds.length > 0) {
    for (let user of siteHeadIds) {
      //console.log(`User ${user._id} permittedSites:`, JSON.stringify(user.permittedSites, null, 2));
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
        site?.enableModules?.drawingDetails?.roDetails?.rfiRaisedAccess;
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
            "Responded",
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
      updatedRoRequest: updatedRoRequest || null,
      updatedArchitectureToRoRegister: updatedArchitectureToRoRegister || null,
    },
  });
});

exports.closeRequest = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  // Step 1: Find the request and populate drawingId
  const architectureToRoRequest = await ArchitectureToRoRequest.findById(
    req.params.id
  ).populate("drawingId");

  if (!architectureToRoRequest) {
    return res.status(404).json({
      status: "fail",
      message: "No RO request found with that ID",
    });
  }

  // Step 2: Update the request status to 'Closed'
  const updatedRequest = await ArchitectureToRoRequest.findByIdAndUpdate(
    req.params.id,
    {
      status: "Closed",
      closedBy: userId,
      closedDate: Date.now(),
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedRequest) {
    return res.status(400).json({
      status: "error",
      message: "Failed to update RO request",
    });
  }

  const {
    drawingNo,
    revision,
    siteId,
    designDrawingConsultant,
  } = updatedRequest;
  const updatedRegister = await ArchitectureToRoRegister.findOneAndUpdate(
    { drawingNo, siteId },
    {
      $set: {
        "acceptedArchitectRevisions.$[elem].rfiStatus": "Raised",
        regState: "Drawing",
      },
    },
    {
      new: true,
      arrayFilters: [{ "elem.revision": revision }],
    }
  );
  const notificationMessage = `A  has been Closed for drawing number ${drawingNo} with revision ${revision}.`;
  const notification = await sendNotification(
    "Drawing",
    notificationMessage,
    " RFI Closed",
    "Closed",
    designDrawingConsultant
  );
  res.status(200).json({
    status: "success",
    data: updatedRequest,
    updatedRegister,
  });
});

exports.reopenRequest = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { roRfiId } = req.body;
  const { rfiType } = req.body;

  // Find the RO request by ID
  const architectureToRoRequest = await ArchitectureToRoRequest.findById(
    id
  ).populate("drawingId");

  if (!architectureToRoRequest) {
    return res.status(404).json({
      status: "fail",
      message: "No RO request found with that ID",
    });
  }

  // Merge request body with fields to update status, reopen date, and reopen by user
  const updateData = {
    ...req.body, // Include any fields sent in req.body for editing
    status: "ReOpened", // Set status to 'ReOpened'
    reOpenedBy: userId, // Track the user who reopened the request
    reOpenedDate: Date.now(), // Track the date when the request was reopened
  };

  // Update the request with the new fields and merged data
  const updatedRequest = await ArchitectureToRoRequest.findByIdAndUpdate(
    id,
    updateData,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedRequest) {
    return res.status(400).json({
      status: "error",
      message: "Failed to update RO request",
    });
  }

  const { drawingNo, siteId, revision } = updatedRequest;
  const updatedRegister = await ArchitectureToRoRegister.findOneAndUpdate(
    { drawingNo, siteId },
    { $set: { "acceptedArchitectRevisions.$[elem].rfiStatus": "Raised" } },
    {
      new: true,
      arrayFilters: [{ "elem.revision": revision }],
    }
  );
  if (roRfiId) {
    const rf = await RoToSiteLevelRequest.findByIdAndUpdate(
      roRfiId,
      {
        $set: {
          architectRfiId: updatedRequest._id,
          rfiState: "Forwarded",
          status: "Forwarded",
        },
      },
      { new: true }
    );
    console.log("rfdata:", rf.rfiState);
  }
  const designDrawingConsultant = updatedRequest.designDrawingConsultant;
  console.log("designDrawingConsultant", designDrawingConsultant);
  const notificationMessage = `A RFI has been reopened for drawing number ${drawingNo} with revision ${revision}.`;
  const notification = await sendNotification(
    "Drawing",
    notificationMessage,
    " Request Reopened",
    "Reopened",
    designDrawingConsultant
  );
  const siteHeadIds = await User.find({
    "permittedSites.siteId": siteId,
  }).select("permittedSites _id");
  if (siteHeadIds.length > 0) {
    for (let user of siteHeadIds) {
      //console.log(`User ${user._id} permittedSites:`, JSON.stringify(user.permittedSites, null, 2));
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
        if (rfiType) {
          const notificationMessage1 = `A RFI has been Reopened for drawing number ${drawingNo} with architect revision ${revision}.`;

          try {
            const notificationToSiteHead = await sendNotification(
              "Drawing",
              notificationMessage1,
              "RFI reopened",
              "Reopened",
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
  }

  res.status(200).json({
    status: "success",
    data: updatedRequest,
    updatedRegister,
    notification,
  });
});
exports.getAllRequestsBySiteIdForArchitect = catchAsync(
  async (req, res, next) => {
    const { siteId } = req.query; // Get siteId from query parameters
    const userId = req.user.id; // Get the user ID from the request
    const user = await User.findById(userId)
      .select("role")
      .exec(); // Fetch the user's role

    if (!user) {
      return next(new AppError("User not found.", 404)); // Error if user is not found
    }

    const userRole = user.role; // Get the user's role

    // Construct the query object
    const query = {};
    if (siteId) {
      query.siteId = siteId; // Add siteId to the query if provided
    }

    try {
      // Fetch all requests with the specified siteId
      const allRequests = await ArchitectureToRoRequest.find(query)
        .populate({
          path: "drawingId",
          populate: [
            {
              path: "designDrawingConsultant",
              match: { role: userRole }, // Match the designDrawingConsultant based on userRole
              select: "role",
            },
            {
              path: "siteId",
              select: "siteName", // Populate siteId with siteName
            },
            {
              path: "category",
              select: "category", // Populate category with category field
            },
            { path: "folderId", select: "folderName" },
          ],
        })
        .exec();

      // Filter out requests where designDrawingConsultant is not present
      const filteredRequests = allRequests.filter(
        (request) => request.drawingId?.designDrawingConsultant
      );

      res.status(200).json({
        status: "success",
        data: filteredRequests, // Return filtered requests
      });
    } catch (error) {
      console.error("Error fetching requests:", error);
      return next(new AppError("Failed to retrieve requests", 400));
    }
  }
);exports.resizeRejectedDrawingFile = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  // 1. Fetch request and drawing details
  const request = await ArchitectureToRoRequest.findById(req.params.id).populate("drawingId");
  if (!request) return next(new AppError("No request found with that ID", 404));

  const drawingId = request.drawingId._id;
  const architectureToRoRegister = await ArchitectureToRoRegister.findById(drawingId);
  if (!architectureToRoRegister) return next(new AppError("No drawing found with that ID", 404));

  const siteId = architectureToRoRegister.siteId;
  if (!siteId) return next(new AppError("No siteId found for the drawing", 404));

  // 2. Prepare file info
  const fileExtension = path.extname(req.file.originalname);
  const newFilename = `rejected-${req.params.id}-${Date.now()}${fileExtension}`;
  const companyId = req.user.companyId;

  const { uploadToS3, relativePath } = getUploadPath(
    companyId,
    newFilename,
    "rejected_drawings",
    siteId
  );

  // 3. Upload to S3 (your backup)
  try {
    await uploadToS3(req.file.buffer, req.file.mimetype);
    req.file.filename = relativePath;
    console.log("✅ File uploaded to S3:", relativePath);
  } catch (s3Err) {
    console.error("❌ Failed to upload to S3:", s3Err);
    return next(new AppError("Failed to upload to S3", 500));
  }

  // 4. Upload to Autodesk Forge
  try {
    const result = await processDWGFile(newFilename, req.file.buffer);

    if (result.urn) {
      request.urn = result.urn;
      request.rejectedDwgFile = relativePath; // store relative path to your S3
      request.urnExpiration = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000); // +28 days

      await request.save();
      console.log("✅ Uploaded to Autodesk Forge & request updated");
    } else {
      return next(new AppError("Failed to get URN from Autodesk", 500));
    }
  } catch (forgeErr) {
    console.error("❌ Autodesk DWG processing failed:", forgeErr.response?.data || forgeErr.message);
    return next(new AppError("Autodesk DWG processing failed", 500));
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
  const token = req.headers.authorization.split(" ")[1]; // Extract the token from the Authorization header

  console.log("Token:", token);
  console.log("URL:", req.originalUrl);

  // Find the ArchitectureToRoRegister by ID
  const request = await ArchitectureToRoRequest.findById(req.params.id);
  console.log("Request:", request);

  // Extract the drawing file name and siteId
  const rejectedDwgFile = request.rejectedDwgFile;
  const siteId = request.siteId; // Assuming siteId is directly in the request object

  const companyId = req.user.companyId;
  const filePath = path.join(
    __dirname,
    `../../uploads/${companyId}/${siteId}/rejected_drawings`,
    rejectedDwgFile
  );
  console.log("File Path:", filePath);

  // Handle DWG files with special processing
  if (rejectedDwgFile.endsWith(".dwg")) {
    try {
      const result = await processDWGFile(filePath);

      if (!result) {
        return next(new AppError("Failed to process the DWG file", 400));
      }

      // Return JSON response with urn and token
      res.status(200).json({
        rejectUrn: result.urn,
        rejectUrnExpiration: Date.now(), // Assuming `urn` is part of the result
        token: result.token, // Include the extracted token from the result
      });
    } catch (error) {
      console.error("Processing Error:", error);
      return next(
        new AppError("An error occurred while processing the file", 400)
      );
    }
  } else {
    // Handle image files by sending them for download
    res.download(filePath, drawingFileName, (err) => {
      if (err) {
        console.error("Download Error:", err);
        return next(new AppError("Failed to download the file.", 400));
      }
    });
  }
});

exports.getRequestByDrawingId = catchAsync(async (req, res, next) => {
  const { drawingId, revision, designDrawingConsultant } = req.query;

  const query = {};

  if (drawingId) {
    query.drawingId = drawingId;
  }

  if (revision) {
    query.revision = revision;
  }

  if (designDrawingConsultant) {
    query.designDrawingConsultant = designDrawingConsultant;
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
    })
    .populate("createdBy", "firstName lastName ")
    .populate("acceptedBy", "firstName lastName ")
    .populate("closedBy", "firstName lastName ")
    .populate("reOpenedBy", "firstName lastName ")
    .exec();

  if (!requests || requests.length === 0) {
    return res.status(400).json({
      status: "failed",
      message: "No matching requests found",
    });
  }

  // Extract the highest revision
  const revisions = requests.map((r) => r.revision);

  // Sort revisions properly assuming format like 'R0', 'R1', ..., 'R10'
  const highestRevision =
    revisions
      .map((r) => ({ original: r, num: parseInt(r.replace(/^R/, ""), 10) }))
      .sort((a, b) => b.num - a.num)[0]?.original || null;

  res.status(200).json({
    status: "success",
    highestRevision,
    data: requests,
  });
});

// exports.generatePdfReport = async (req, res) => {
//   const groupedData = req.body.groupedByDrawing;
//   const userInfo = req.body.userInfo;

//   if (!Array.isArray(groupedData) || groupedData.length === 0) {
//     return res.status(400).json({ message: "No grouped data provided" });
//   }

//   const first = groupedData[0];
//   const siteInfo = first?.drawingId?.siteId || {
//     siteName: "Site Name",
//     siteAddress: "Site Address",
//   };

//   // ✅ Use localhost
//   const baseUrl = `http://localhost:4500`;

//   // ✅ Build full URLs for image and file fields
//   const updatedGroupedData = groupedData.map((item) => {
//     const fullPdfPath = item.pdfDrawingFileName
//       ? item.pdfDrawingFileName.startsWith("http")
//         ? item.pdfDrawingFileName
//         : `${baseUrl}/${item.pdfDrawingFileName}`
//       : null;

//     const fullImpactImages = Array.isArray(item.impactImages)
//       ? item.impactImages.map((imgPath) =>
//           imgPath.startsWith("http") ? imgPath : `${baseUrl}/${imgPath}`
//         )
//       : [];
//     console.log(fullPdfPath);
//     console.log(fullImpactImages);
//     return {
//       ...item,
//       pdfDrawingFileName: fullPdfPath,
//       impactImages: fullImpactImages,
//     };
//   });

//   // ✅ Resource paths for logo and CSS
//   const logoPath = `file://${path
//     .join(__dirname, "../../public/logo/rcon.png")
//     .replace(/\\/g, "/")}`;
//   const cssFileUrl = `file://${path
//     .join(__dirname, "../../public/styles/pdfgenerator.css")
//     .replace(/\\/g, "/")}`;
//   const templatePath = path.join(__dirname, "../../templates/rfi-template.ejs");

//   try {
//     const html = await ejs.renderFile(templatePath, {
//       dataGroupedByDrawing: updatedGroupedData,
//       userInfo,
//       logoPath,
//       cssFileUrl,
//       siteInfo,
//       baseUrl,
//     });

//     const browser = await puppeteer.launch({
//       headless: "new",
//       args: ["--no-sandbox"],
//     });

//     const page = await browser.newPage();
//     await page.setContent(html, { waitUntil: "networkidle0" });

//     // Wait 1 second to allow images to load
//     await new Promise((resolve) => setTimeout(resolve, 1000));

//     const pdfBuffer = await page.pdf({
//       format: "A4",
//       printBackground: true,
//     });
//     await browser.close();

//     res.setHeader("Content-Type", "application/pdf");
//     res.setHeader(
//       "Content-Disposition",
//       'attachment; filename="rfi-report.pdf"'
//     );
//     res.end(pdfBuffer);
//   } catch (err) {
//     console.error("PDF Generation Error:", err);
//     res
//       .status(400)
//       .json({ message: "Failed to generate PDF", error: err.message });
//   }
// };

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
const siteInfo = first?.drawingId?.siteId || {
siteName: "Site Name",
siteAddress: "Site Address",
};

const cdnBase = "https://rconfiles.b-cdn.net";

// --------------------------------------------------
// UPDATE: PROCESS reasonFile instead of impactImages
// --------------------------------------------------
const updatedGroupedData = requests.map((item) => {
// Convert main PDF
const fullPdfPath = item.pdfDrawingFileName
? item.pdfDrawingFileName.startsWith("http")
? item.pdfDrawingFileName
: `${cdnBase}/${item.pdfDrawingFileName}`
: null;

// Extract all reasonFile images as URLs
let reasonFileImages = [];

if (
  Array.isArray(item.natureOfRequestedInformationReasons) &&
  item.natureOfRequestedInformationReasons.length > 0
) {
  reasonFileImages = item.natureOfRequestedInformationReasons
    .filter((x) => x.reasonFile)
  .map((x) => {
  let file = x.reasonFile || "";

  // Remove Markdown formatting if present
  file = file.replace(/\[.*?\]\((.*?)\)/, "$1");

  return file.startsWith("http") ? file : `${cdnBase}/${file}`;
})

}
console.log("reasonFileImages",reasonFileImages)
return {
  ...item.toObject(),
  pdfDrawingFileName: fullPdfPath,
  reasonFileImages,
};


});

// --------------------------------------------------
// Company logo path
// --------------------------------------------------
let logoPath = null;
if (first?.drawingId?.companyId?.uploadLogo) {
const logoFile = first.drawingId.companyId.uploadLogo;


if (logoFile.startsWith("http")) {
  logoPath = logoFile;
} else {
  logoPath = `${cdnBase}/${logoFile}`;
}


}

const cssFileUrl = null;

const templatePath = path.join(
__dirname,
"../../templates/rfi-template.ejs"
);

const userInfo = {
name: `${first?.createdBy?.firstName || ""} ${first?.createdBy?.lastName || ""}`,
role: first?.drawingId?.designDrawingConsultant?.role || "",
department: first?.createdBy?.department || "",
};

try {
const html = await ejs.renderFile(templatePath, {
dataGroupedByDrawing: updatedGroupedData,
userInfo,
logoPath,
cssFileUrl,
siteInfo,
});

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
  executablePath: puppeteer.executablePath(),
});

const page = await browser.newPage();

// await page.setContent(html, { waitUntil: "networkidle0" });
await page.setContent(html, { waitUntil: "load" });

// Wait until all images finish downloading
await page.evaluate(async () => {
  const imgs = Array.from(document.images);
  await Promise.all(imgs.map(img => {
    if (img.complete) return;
    return new Promise(resolve => {
      img.addEventListener('load', resolve);
      img.addEventListener('error', resolve);
    });
  }));
});


await new Promise((resolve) => setTimeout(resolve, 800));

const pdfBuffer = await page.pdf({
  format: "A4",
  printBackground: true,
});

await browser.close();

const timestamp = new Date()
  .toISOString()
  .replace(/[-:T.]/g, "")
  .slice(0, 14);

const fileName = `rfi-report-${timestamp}.pdf`;

res.setHeader("Content-Type", "application/pdf");
res.setHeader(
  "Content-Disposition",
  `attachment; filename="${fileName}"`
);
res.end(pdfBuffer);


} catch (err) {
console.error("PDF Generation Error:", err);
res.status(400).json({
message: "Failed to generate PDF",
error: err.message,
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

    // Upload to S3 (no local file write)
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
exports.updateNatureOfReasons = catchAsync(async (req, res, next) => {
  const { id } = req.params;

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

  // Body fields (handle flat text fields)
  if (req.body.natureOfRequest) newReason.natureOfRequest = req.body.natureOfRequest || null;
  if (req.body.reason) newReason.reason = req.body.reason || null;
  if (req.body.action) newReason.action = req.body.action || null;

  // **Add createdBy field from logged-in user**
  newReason.createdBy = req.user.id;

  // File processing (handle single file)
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

  // Validate that at least one field is provided
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

  // Update reasons array (prepend the new entry)
  const updatedReasons = [
    newReason,
    ...existingReasons.filter(
      (r) => r.natureOfRequest || r.reason || r.action || r.reasonFile
    ),
  ];

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




exports.createCombinedRequest = catchAsync(async (req, res, next) => {
  const {
    drawingId,
    drawingNo,
    revision,
    rfiType,
    siteId
  } = req.body;

  const userId = req.user.id;
  req.body.createdBy = userId;


    // STEP 1: Fetch the common register data
    const registerData = await ArchitectureToRoRegister.findOne({ _id: drawingId });
    if (!registerData) {
      return res.status(404).json({
        status: "error",
        message: "Drawing not found in ArchitectureToRoRegister",
      });
    }

    req.body.designDrawingConsultant = registerData.designDrawingConsultant;
    req.body.folderId = registerData.folderId;

    // Helper to generate padded RFI numbers
    const generateRfiNumber = (drawingNo) => {
      const parts = drawingNo.split("-");
      const lastPart = parts[parts.length - 1];
      const number = lastPart.replace(/\D/g, "");
      return number ? number.padStart(3, "0") : "000";
    };

    //---------------------------------------------
    // STEP 2: Create Architecture → RO Request
    //---------------------------------------------
    const existingArchRequest = await ArchitectureToRoRequest.findOne({ drawingNo, revision });
    if (existingArchRequest) {
      return res.status(200).json({
        status: "error",
        message: `Revision ${revision} already requested from drawing No ${drawingNo}`,
      });
    }
 const existingRoRequest = await RoToSiteLevelRequest.findOne({ drawingNo, revision });
    if (existingRoRequest) {
      return res.status(200).json({
        status: "error",
        message: `RO revision ${revision} already requested from drawing No ${drawingNo}`,
      });
    }
    // Generate architect RFI number
    req.body.architectRfiNo = generateRfiNumber(drawingNo);

    // Create the Architecture → RO request
    const archRequest = await ArchitectureToRoRequest.create(req.body);

    // Populate created request
    const populatedArchRequest = await ArchitectureToRoRequest.findById(archRequest._id)
      .populate("drawingId", "designDrawingConsultant");

    const { designDrawingConsultant } = populatedArchRequest.drawingId;

    // Send notification to design drawing consultant
    const notificationMessage = `A new architecture to RO RFI has been raised for drawing number ${drawingNo} with revision ${revision}.`;
    const archNotification = await sendNotification(
      "Drawing",
      notificationMessage,
      "New Request Created",
      "Requested",
      designDrawingConsultant
    );

    // Update register for Architect revision
    const updatedArchRegister = await ArchitectureToRoRegister.findOneAndUpdate(
      { drawingNo, siteId },
      { $set: { "acceptedArchitectRevisions.$[elem].rfiStatus": "Raised" } },
      {
        new: true,
        arrayFilters: [{ "elem.revision": revision }],
      }
    );

    //---------------------------------------------
    // STEP 3: Create RO → Site Level Request
    //---------------------------------------------
   

    // Generate RO RFI number
    req.body.roRfiNo = generateRfiNumber(drawingNo);

    // Link RO → Site Level request with Architect request
    req.body.architectRfiId = archRequest._id;

    const roRequest = await RoToSiteLevelRequest.create(req.body);

    const populatedRoRequest = await RoToSiteLevelRequest.findById(roRequest._id)
      .populate("drawingId", "designDrawingConsultant");

    // Update register for RO revision
    const updatedRoRegister = await ArchitectureToRoRegister.findOneAndUpdate(
      { drawingNo, siteId },
      { $set: { "acceptedRORevisions.$[elem].rfiStatus": "Raised" } },
      {
        new: true,
        arrayFilters: [{ "elem.revision": revision }],
      }
    );

    //---------------------------------------------
    // STEP 4: Send Notifications to Site Heads
    //---------------------------------------------
    const siteHeadIds = await User.find({ "permittedSites.siteId": siteId }).select("permittedSites _id");
    for (let user of siteHeadIds) {
      const siteConfig = user.permittedSites.find((site) => site.siteId.toString() === siteId);

      // // Notify for Architecture → RO forwarding
      // if (siteConfig?.enableModules.drawingDetails.roDetails.rfiRaisedAccess && rfiType) {
      //   const forwardMsg = `A RFI has been forwarded for drawing number ${drawingNo} with architect revision ${revision}.`;
      //   try {
      //     await sendNotification("Drawing", forwardMsg, "Request Forwarded", "Forwarded", user._id);
      //   } catch (error) {
      //     console.error("Error notifying SiteHead (Arch):", error);
      //   }
      // }

      // Notify for RO → Site Level raise
      if (siteConfig?.enableModules.drawingDetails.roDetails.rfiRaisedAccess) {
        const raisedMsg = `A RO RFI has been raised for drawing number ${drawingNo} with revision ${revision}.`;
        try {
          await sendNotification("Drawing", raisedMsg, "Request Raised", "Raised", user._id);
        } catch (error) {
          console.error("Error notifying SiteHead (RO):", error);
        }
      }
    }

    //---------------------------------------------
    // STEP 5: Final response
    //---------------------------------------------
    res.status(200).json({
      status: "success",
      message: "Both Architecture → RO and RO → Site Level RFIs created successfully",
      data: {
        architectureToRo: archRequest,
        roToSiteLevel: roRequest,
      },
      notifications: {
        architectureNotification: archNotification,
      },
      updatedRegisters: {
        architectureRegister: updatedArchRegister,
        roRegister: updatedRoRegister,
      },
    });
 
});
