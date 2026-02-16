const ArchitectureToRoRegister = require("../../models/drawingModels/architectureToRoRegisterModel");
const sendEmail = require("../../utils/email");
const DrawingFolder = require("../../models/drawingModels/drawingFolderModel");
const { catchAsync } = require("../../utils/catchAsync");
const multer = require("multer");
const fs = require("fs");
const AppError = require("../../utils/appError");
const path = require("path");
const {
  processDWGFile,
  getDWGFileToken,
} = require("././dwgFileHandlingController");
const Notification = require("../../models/notificationModel");
const sendNotification = require("../../utils/utilFun");
const multerWrapper = require("../../utils/multerFun");
const getUploadPath = require("../../utils/pathFun");
const User = require("../../models/userModel");
const Site = require("../../models/sitesModel");
const Category = require("../../models/drawingModels/categoryModel");
const ArchitectureToRoRequest = require("../../models/drawingModels/architectureToRoRequestedModel");
const RoToSiteLevelRequest = require("../../models/drawingModels/roToSiteLevelRequestedModel");
const SiteToSiteLevelRequest = require("../../models/drawingModels/siteToSiteLevelRequestedModel");
const mongoose = require("mongoose");
const AssignDesignConsultantsToDepartment = require("../../models/drawingModels/assignDesignConsultantsToDepartMentModel");

const upload = multerWrapper();
const hardCopyUpload = multerWrapper();

exports.createDrawing = catchAsync(async (req, res, next) => {
  const { siteId, drawings } = req.body;
  const userId = req.user.id;
  const user = await User.findOne({ _id: userId });
  const companyId = user.companyId;
  console.log("companyId", companyId);

  if (
    !siteId ||
    !drawings ||
    !Array.isArray(drawings) ||
    drawings.length === 0
  ) {
    return res.status(400).json({
      status: "error",
      statusCode: 400,
      message: "siteId and drawings array are required fields",
    });
  }

  // =====================================================
  // ✅ NEW: Check duplicate drawingNo inside request body
  // =====================================================
  const drawingNosInBody = drawings.map((d) => d.drawingNo);
  const duplicateDrawingNos = drawingNosInBody.filter(
    (item, index) => drawingNosInBody.indexOf(item) !== index,
  );

  if (duplicateDrawingNos.length > 0) {
    const uniqueDuplicates = [...new Set(duplicateDrawingNos)];

    return res.status(400).json({
      status: "error",
      statusCode: 400,
      message: `Duplicate drawing number(s) found in request body: ${uniqueDuplicates.join(
        ", ",
      )}. Each drawing number must be unique.`,
    });
  }

  const site = await Site.findOne({ _id: siteId });
  if (!site) {
    return res.status(404).json({
      status: "error",
      statusCode: 404,
      message: "Invalid siteId provided. Site does not exist.",
    });
  }

  const siteName = site.siteName;

  const createdRegisters = [];
  const notifications = [];
  const createdFolders = [];

  const drawingNos = drawings.map((d) => d.drawingNo); // extract all drawingNos
  const existingDrawings = await ArchitectureToRoRegister.find({
    siteId,
    drawingNo: { $in: drawingNos },
  });

  if (existingDrawings.length > 0) {
    const duplicateDetails = existingDrawings.map(
      (d) =>
        `Drawing No: "${d.drawingNo}", Title: "${d.drawingTitle}", Category: "${d.category}"`,
    );

    return res.status(200).json({
      status: "error",
      message: `The following drawings already exist for this site:\n${duplicateDetails.join(
        "\n",
      )}`,
      duplicates: existingDrawings,
    });
  }

  for (const drawing of drawings) {
    const categoryRecord = await Category.findOne({
      $or: [
        { category: drawing.category, siteId: null, companyId: null }, // Default category
        { category: drawing.category, siteId: siteId, companyId: companyId }, // Site & company-specific
      ],
    });
    console.log("categoryRecord", categoryRecord);

    if (!categoryRecord) {
      return res.status(200).json({
        status: "error",
        message: `category ${drawing.category} does not exist. Please create the category before assigning it to a drawing.`,
      });
    }

    let folderId = drawing.folderId;

    const {
      drawingNo,
      drawingTitle,
      designDrawingConsultant,
      category,
      tower,
      noOfRoHardCopyRevisions,
      noOfSiteHeadHardCopyRevisions,
      acceptedROSubmissionDate,
      acceptedSiteSubmissionDate,
      acceptedArchitectRevisions = [],
      acceptedSiteHeadHardCopyRevisions = [],
      acceptedRORevisions = [],
      acceptedROHardCopyRevisions = [],
    } = drawing;

    if (!folderId) {
      const existingFolder = await DrawingFolder.findOne({
        siteId,
        folderName: siteName,
      });

      if (existingFolder) {
        folderId = existingFolder._id;
      } else {
        try {
          const newFolder = await DrawingFolder.create({
            siteId,
            folderName: siteName,
          });
          createdFolders.push(newFolder);
          folderId = newFolder._id;
        } catch (error) {
          console.error("Error creating folder:", error);
          return next(
            new AppError(
              `Failed to create folder for site ${siteName}: ${error.message}`,
              400,
            ),
          );
        }
      }
    }

    if (!drawingNo || !drawingTitle || !designDrawingConsultant) {
      return res.status(400).json({
        status: "error",
        statusCode: 400,
        message:
          "Each drawing object must have drawingNo, drawingTitle, designDrawingConsultant, category, acceptedROSubmissionDate, and acceptedSiteSubmissionDate",
      });
    }

    const count = await ArchitectureToRoRegister.countDocuments({ siteId });

    try {
      const newRegister = await ArchitectureToRoRegister.create({
        siteId,
        companyId,
        folderId,
        drawingNo,
        drawingTitle,
        designDrawingConsultant,
        category: categoryRecord._id,
        tower,
        noOfRoHardCopyRevisions,
        noOfSiteHeadHardCopyRevisions,
        acceptedROSubmissionDate,
        acceptedSiteSubmissionDate,
        acceptedArchitectRevisions,
        acceptedSiteHeadHardCopyRevisions,
        acceptedRORevisions,
        acceptedROHardCopyRevisions,
        createdBy: req.user.id,
      });

      createdRegisters.push(newRegister);

      const notification = await sendNotification(
        "Drawing",
        `New drawing ${drawingNo} has been assigned.`,
        "New Drawing Assigned",
        "Assigned",
        designDrawingConsultant,
      );
      notifications.push(notification);
    } catch (error) {
      console.error("Error creating register:", error);
      return next(
        new AppError(
          `Failed to create drawing ${drawingNo}: ${error.message}`,
          400,
        ),
      );
    }
  }

  res.status(201).json({
    status: "success",
    data: {
      createdRegisters,
      createdFolders,
      notifications,
    },
  });
});

exports.uploadDrawingPhoto = upload.single("pdfDrawingFileName");

exports.uploadDrawingFiles = upload.fields([
  { name: "pdfDrawingFileName", maxCount: 1 },
  { name: "drawing", maxCount: 1 },
]);

exports.uploadRevisionWithDrawing = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  // Log files right after the upload middleware
  console.log("Uploaded files:", req.files);

  const drawingFileName = req.files["drawing"] ? req.files["drawing"][0] : null;
  const pdfDrawingFileName = req.files["pdfDrawingFileName"]
    ? req.files["pdfDrawingFileName"][0]
    : null;

  // Log the important variables
  console.log({
    drawingFileName,
    pdfDrawingFileName,
    acceptedArchitectRevisions: req.body.acceptedArchitectRevisions,
    acceptedRORevisions: req.body.acceptedRORevisions,
    acceptedSiteRevisions: req.body.acceptedSiteRevisions,
    acceptedSiteHeadRevisions: req.body.acceptedSiteHeadRevisions,
  });

  // Validate revisions
  const {
    acceptedArchitectRevisions,
    acceptedRORevisions,
    acceptedSiteRevisions,
    acceptedSiteHeadRevisions,
  } = req.body;
  if (
    !acceptedArchitectRevisions &&
    !acceptedRORevisions &&
    !acceptedSiteRevisions &&
    !acceptedSiteHeadRevisions
  ) {
    return res.status(400).json({
      status: "fail",
      success: false,
      message: "At least one revision array must be provided",
    });
  }

  // Further processing with existing register logic...

  res.status(200).json({
    status: "success",
    success: true,
    // data: existingRegister,
  });
});

// Resize and save the uploaded file

exports.resizeDrawingPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  if (!req.drawing) {
    req.drawing = await ArchitectureToRoRegister.findById(req.params.id);
  }
  if (!req.drawing) {
    return res.status(200).json({
      status: "error",
      statusCode: 200,
      message: "Drawing not found",
    });
  }

  const fileExtension = path.extname(req.file.originalname);
  const newFilename = `drawing-ArchitectureToRoRegister-${
    req.drawing._id
  }-${Date.now()}${fileExtension}`;

  const companyId = req.user.companyId;

  // Use the new function to get the upload path
  const { uploadToS3, relativePath } = getUploadPath(
    companyId,
    newFilename,
    "drawings",
    req.drawing.siteId,
  ); // Assuming you have companyId in your drawing

  await uploadToS3(file.buffer, file.mimetype);

  req.file.filename = relativePath;
  next();

  try {
    const registerDrawing = await ArchitectureToRoRegister.findById(
      req.params.id,
    );
    const result = await processDWGFile(fullPath);

    if (result.urn && req.route.path.includes("/Ro/")) {
      const latestRevisionIndex =
        registerDrawing.acceptedRORevisions.length - 1;
      const latestRevision =
        registerDrawing.acceptedRORevisions[latestRevisionIndex];
      if (!latestRevision) {
        return res.status(404).json({
          status: "error",
          statusCode: 404,
          message: "No revisions found for this drawing",
        });
      }

      // Update the urn field
      registerDrawing.acceptedRORevisions[latestRevisionIndex].urn = result.urn;
      registerDrawing.acceptedRORevisions[
        latestRevisionIndex
      ].drawingFileName = newFilename;

      const currentDateTime = new Date();
      const expirationDate = new Date(
        currentDateTime.getTime() + 28 * 24 * 60 * 60 * 1000,
      );

      registerDrawing.acceptedRORevisions[
        latestRevisionIndex
      ].urnExpiration = expirationDate;

      // Mark the array as modified
      registerDrawing.markModified("acceptedRORevisions");

      // Save the document
      await registerDrawing.save();
    } else if (result.urn && req.route.path.includes("/site/")) {
      const latestRevisionIndex =
        registerDrawing.acceptedSiteRevisions.length - 1;
      const latestRevision =
        registerDrawing.acceptedSiteRevisions[latestRevisionIndex];

      if (!latestRevision) {
        return res.status(404).json({
          status: "error",
          statusCode: 404,
          message: "No revisions found for this drawing",
        });
      }

      // Update the urn field
      registerDrawing.acceptedSiteRevisions[latestRevisionIndex].urn =
        result.urn;
      registerDrawing.acceptedSiteRevisions[
        latestRevisionIndex
      ].drawingFileName = newFilename;

      const currentDateTime = new Date();
      const expirationDate = new Date(
        currentDateTime.getTime() + 28 * 24 * 60 * 60 * 1000,
      );

      registerDrawing.acceptedSiteRevisions[
        latestRevisionIndex
      ].urnExpiration = expirationDate;

      // Mark the array as modified
      registerDrawing.markModified("acceptedSiteRevisions");

      // Save the document
      await registerDrawing.save();
    } else if (result.urn && req.route.path.includes("/siteHead/")) {
      // Added condition for site head revisions
      const latestRevisionIndex =
        registerDrawing.acceptedSiteHeadRevisions.length - 1;
      const latestRevision =
        registerDrawing.acceptedSiteHeadRevisions[latestRevisionIndex];

      if (!latestRevision) {
        return res.status(404).json({
          status: "error",
          statusCode: 404,
          message: "No revisions found for this drawing",
        });
      }

      // Update the urn field
      registerDrawing.acceptedSiteHeadRevisions[latestRevisionIndex].urn =
        result.urn;
      registerDrawing.acceptedSiteHeadRevisions[
        latestRevisionIndex
      ].drawingFileName = newFilename;

      const currentDateTime = new Date();
      const expirationDate = new Date(
        currentDateTime.getTime() + 28 * 24 * 60 * 60 * 1000,
      );

      registerDrawing.acceptedSiteHeadRevisions[
        latestRevisionIndex
      ].urnExpiration = expirationDate;

      // Mark the array as modified
      registerDrawing.markModified("acceptedSiteHeadRevisions");

      // Save the document
      await registerDrawing.save();
    } else if (result.urn) {
      const latestRevisionIndex =
        registerDrawing.acceptedArchitectRevisions.length - 1;
      const latestRevision =
        registerDrawing.acceptedArchitectRevisions[latestRevisionIndex];
      if (!latestRevision) {
        return res.status(404).json({
          status: "error",
          statusCode: 404,
          message: "No revisions found for this drawing",
        });
      }

      // Update the urn field
      registerDrawing.acceptedArchitectRevisions[latestRevisionIndex].urn =
        result.urn;
      registerDrawing.acceptedArchitectRevisions[
        latestRevisionIndex
      ].drawingFileName = newFilename;

      const currentDateTime = new Date();
      const expirationDate = new Date(
        currentDateTime.getTime() + 28 * 24 * 60 * 60 * 1000,
      );

      registerDrawing.acceptedArchitectRevisions[
        latestRevisionIndex
      ].urnExpiration = expirationDate;

      // Mark the array as modified
      registerDrawing.markModified("acceptedArchitectRevisions");

      // Save the document
      await registerDrawing.save();
    }
  } catch (e) {
    console.log(e);
  }
});

exports.updateLatestAcceptedArchitectRevisionsDrawing = catchAsync(
  async (req, res, next) => {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({
        status: "error",
        statusCode: 400,
        message: "No file uploaded",
      });
    }

    // Find the document and get the latest revision
    const architectureToRoRegister = await ArchitectureToRoRegister.findById(
      id,
    );
    if (!architectureToRoRegister) {
      return res.status(404).json({
        status: "error",
        statusCode: 404,
        message: "No drawing found with that ID",
      });
    }

    // Get the latest revision
    const latestRevision =
      architectureToRoRegister.acceptedArchitectRevisions[
        architectureToRoRegister.acceptedArchitectRevisions.length - 1
      ];
    if (!latestRevision) {
      return res.status(404).json({
        status: "error",
        statusCode: 404,
        message: "No revisions found for this drawing",
      });
    }

    latestRevision.drawingFileName = req.file.filename;

    await architectureToRoRegister.save();
    const { drawingNo, createdBy } = architectureToRoRegister;
    const { revision } = latestRevision;

    // const notification = await sendNotification(
    //   'Drawing',
    //   `A soft copy has been submitted for drawing number ${drawingNo}, accepted architect revision ${revision}.`,
    //   'Soft Copy Submitted',
    //   'Submitted',
    //   createdBy
    // );

    res.status(200).json({
      status: "success",
      data: {
        architectureToRoRegister,
        // notification,
      },
    });
  },
);
exports.updateLatestAcceptedRoRevisionsDrawing = catchAsync(
  async (req, res, next) => {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        status: "error",
        statusCode: 400,
        message: "No file uploaded",
      });
    }

    // Find the document and get the latest revision
    const architectureToRoRegister = await ArchitectureToRoRegister.findById(
      id,
    );
    if (!architectureToRoRegister) {
      return res.status(404).json({
        status: "error",
        statusCode: 404,
        message: "No drawing found with that ID",
      });
    }

    // Get the latest revision
    const latestRevision =
      architectureToRoRegister.acceptedRORevisions[
        architectureToRoRegister.acceptedRORevisions.length - 1
      ];
    if (!latestRevision) {
      return res.status(404).json({
        status: "error",
        statusCode: 404,
        message: "No revisions found for this drawing",
      });
    }

    // Update the latest revision's drawingFileName
    latestRevision.drawingFileName = req.file.filename;

    // Save the updated document
    await architectureToRoRegister.save();
    const { drawingNo, createdBy } = architectureToRoRegister;
    const { revision } = latestRevision;

    const notification = await sendNotification(
      "Drawing",
      `A soft copy has been submitted for drawing number ${drawingNo}, acceppted Ro revision ${revision}.`,
      "Soft Copy Submitted",
      "Submitted",
      createdBy,
    );
    res.status(200).json({
      status: "success",
      data: {
        architectureToRoRegister,
        notification,
      },
    });
  },
);

exports.updateLatestAcceptedSiteRevisionsDrawing = catchAsync(
  async (req, res, next) => {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({
        status: "error",
        statusCode: 400,
        message: "No file uploaded",
      });
    }

    // Find the document and get the latest revision
    const architectureToRoRegister = await ArchitectureToRoRegister.findById(
      id,
    );
    if (!architectureToRoRegister) {
      return res.status(404).json({
        status: "error",
        statusCode: 404,
        message: "No drawing found with that ID",
      });
    }

    // Get the latest revision
    const latestRevision =
      architectureToRoRegister.acceptedSiteRevisions[
        architectureToRoRegister.acceptedSiteRevisions.length - 1
      ];
    if (!latestRevision) {
      return res.status(404).json({
        status: "error",
        statusCode: 404,
        message: "No revisions found for this drawing",
      });
    }

    // Update the latest revision's drawingFileName
    latestRevision.drawingFileName = req.file.filename;

    // Save the updated document
    await architectureToRoRegister.save();
    const { drawingNo, createdBy } = architectureToRoRegister;
    const { revision } = latestRevision;

    const notification = await sendNotification(
      "Drawing",
      `A soft copy has been submitted for drawing number ${drawingNo}, accepted site  revision ${revision}.`,
      "Soft Copy Submitted",
      "Submitted",
      createdBy,
    );
    res.status(200).json({
      status: "success",
      data: {
        architectureToRoRegister,
        notification,
      },
    });
  },
);
exports.updateLatestAcceptedSiteHeadRevisionsDrawing = catchAsync(
  async (req, res, next) => {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({
        status: "error",
        statusCode: 400,
        message: "No file uploaded",
      });
    }

    // Find the document and get the latest site head revision
    const architectureToRoRegister = await ArchitectureToRoRegister.findById(
      id,
    );
    if (!architectureToRoRegister) {
      return res.status(404).json({
        status: "error",
        statusCode: 404,
        message: "No drawing found with that ID",
      });
    }

    // Get the latest site head revision
    const latestRevision =
      architectureToRoRegister.acceptedSiteHeadRevisions[
        architectureToRoRegister.acceptedSiteHeadRevisions.length - 1
      ];
    if (!latestRevision) {
      return res.status(404).json({
        status: "error",
        statusCode: 404,
        message: "No site head revisions found for this drawing",
      });
    }

    // Update the drawingFileName with the uploaded file's name
    latestRevision.drawingFileName = req.file.filename;

    // Save the updated document
    await architectureToRoRegister.save();

    // Extract relevant information for notification
    const { drawingNo, createdBy } = architectureToRoRegister;
    const { revision } = latestRevision;

    // Send notification about the updated drawing
    const notification = await sendNotification(
      "Drawing",
      `A soft copy has been submitted for drawing number ${drawingNo}, accepted site head revision ${revision}.`,
      "Soft Copy Submitted",
      "Submitted",
      createdBy,
    );

    // Respond with success status and data
    res.status(200).json({
      status: "success",
      data: {
        architectureToRoRegister,
        notification,
      },
    });
  },
);

exports.getAcceptedArchitectRevisionsDrawing = catchAsync(
  async (req, res, next) => {
    const { id, revision } = req.params; // Extract both ID and revision from the URL parameters
    const companyId = req.user.companyId;
    const drawing = await ArchitectureToRoRegister.findById(id);
    if (!drawing) {
      return res.status(404).json({
        status: "error",
        statusCode: 404,
        message: "No drawing found with that ID",
      });
    }

    if (
      !drawing.acceptedArchitectRevisions ||
      !Array.isArray(drawing.acceptedArchitectRevisions)
    ) {
      return res.status(404).json({
        status: "error",
        statusCode: 404,
        message: "No revisions found for this drawing.",
      });
    }

    // Find the revision object based on the provided revision parameter
    const revisionObj = drawing.acceptedArchitectRevisions.find(
      (el) => el.revision === revision,
    );

    const revisionIndex = drawing.acceptedArchitectRevisions.findIndex(
      (r) => r.revision === revision,
    );
    if (!revisionObj) {
      return res.status(404).json({
        status: "error",
        statusCode: 404,
        message: `No drawing file found for the ${revision} revision.`,
      });
    }

    const drawingFileName = revisionObj.drawingFileName;
    const filePath = path.join(
      __dirname,
      `../../uploads/${companyId}/${drawing.siteId}/drawings`,
      drawingFileName,
    );
    if (drawingFileName.endsWith(".dwg")) {
      let result = await getDWGFileToken();

      if (revisionObj.urn && revisionObj.urnExpiration > new Date()) {
        result.urn = revisionObj.urn;
      } else {
        const imgRes = await processDWGFile(filePath);
        result.urn = imgRes.urn;
        const currentDateTime = new Date();
        const expirationDate = new Date(
          currentDateTime.getTime() + 28 * 24 * 60 * 60 * 1000,
        );
        result.urnExpiration = expirationDate;

        //TODO: NEED TO TEST THIS SCENARIO
        drawing.acceptedArchitectRevisions[revisionIndex].urn = result.urn;
        drawing.acceptedArchitectRevisions[
          revisionIndex
        ].urnExpiration = expirationDate;
        await drawing.save();
      }

      if (!result) {
        return res.status(400).json({
          status: "error",
          statusCode: 400,
          message: "Failed to process the DWG file",
        });
      }

      res.status(200).json({
        status: "success",
        data: result,
      });
    } else {
      // Download the file
      res.download(filePath, drawingFileName, (err) => {
        if (err) {
          console.error("Download Error:", err);
          return res.status(400).json({
            status: "error",
            statusCode: 400,
            message: "Failed to download the file.",
          });
        }
      });
    }
    // res.download(filePath, drawingFileName, (err) => {
    //   if (err) {
    //     return next(new AppError("Failed to download the file.", 400));
    //   }
    // });
  },
);

exports.getAcceptedRORevisionsDrawing = catchAsync(async (req, res, next) => {
  const { id, revision } = req.params;
  const companyId = req.user.companyId;
  // Find the drawing by its ID
  const drawing = await ArchitectureToRoRegister.findById(id);
  if (!drawing) {
    return res.status(404).json({
      status: "error",
      statusCode: 404,
      message: "No drawing found with that ID",
    });
  }

  // Check if acceptedRORevisions exist and is an array
  if (
    !drawing.acceptedRORevisions ||
    !Array.isArray(drawing.acceptedRORevisions)
  ) {
    return res.status(404).json({
      status: "error",
      statusCode: 404,
      message: "No revisions found for this drawing.",
    });
  }

  // Find the revision object based on the provided revision parameter
  const revisionObj = drawing.acceptedRORevisions.find(
    (el) => el.revision === revision,
  );

  const revisionIndex = drawing.acceptedRORevisions.findIndex(
    (r) => r.revision === revision,
  );

  if (!revisionObj) {
    return res.status(404).json({
      status: "error",
      statusCode: 404,
      message: `No drawing file found for the ${revision} revision.`,
    });
  }

  // Extract the drawing file name and construct the file path
  const drawingFileName = revisionObj.drawingFileName;
  const filePath = path.join(
    __dirname,
    `../../uploads/${companyId}/${drawing.siteId}/drawings`,
    drawingFileName,
  );

  if (drawingFileName.endsWith(".dwg")) {
    let result = await getDWGFileToken();

    if (revisionObj.urn && revisionObj.urnExpiration > new Date()) {
      result.urn = revisionObj.urn;
    } else {
      const imgRes = await processDWGFile(filePath);
      result.urn = imgRes.urn;
      const currentDateTime = new Date();
      const expirationDate = new Date(
        currentDateTime.getTime() + 28 * 24 * 60 * 60 * 1000,
      );
      result.urnExpiration = expirationDate;

      //TODO: NEED TO TEST THIS SCENARIO
      drawing.acceptedRORevisions[revisionIndex].urn = result.urn;
      drawing.acceptedRORevisions[revisionIndex].urnExpiration = expirationDate;
      await drawing.save();
    }

    if (!result) {
      return res.status(400).json({
        status: "error",
        statusCode: 400,
        message: "Failed to process the DWG file",
      });
    }

    res.status(200).json({
      status: "success",
      data: result,
    });
  } else {
    // Download the file
    res.download(filePath, drawingFileName, (err) => {
      if (err) {
        console.error("Download Error:", err);
        return next(new AppError("Failed to download the file.", 400));
      }
    });
  }
});
exports.getAcceptedSiteHeadRevisionsDrawing = catchAsync(
  async (req, res, next) => {
    const { id, revision } = req.params;
    const companyId = req.user.companyId;

    // Find the drawing by its ID
    const drawing = await ArchitectureToRoRegister.findById(id);
    if (!drawing) {
      return next(new AppError("No drawing found with that ID", 404));
    }

    // Check if acceptedSiteHeadRevisions exist and is an array
    if (
      !drawing.acceptedSiteHeadRevisions ||
      !Array.isArray(drawing.acceptedSiteHeadRevisions)
    ) {
      return next(new AppError("No revisions found for this drawing.", 404));
    }

    // Find the revision object based on the provided revision parameter
    const revisionObj = drawing.acceptedSiteHeadRevisions.find(
      (el) => el.revision === revision,
    );
    const revisionIndex = drawing.acceptedSiteHeadRevisions.findIndex(
      (r) => r.revision === revision,
    );

    if (!revisionObj) {
      return next(
        new AppError(
          `No drawing file found for the ${revision} revision.`,
          404,
        ),
      );
    }

    // Extract the drawing file name and construct the file path
    const drawingFileName = revisionObj.drawingFileName;
    const filePath = path.join(
      __dirname,
      `../../uploads/${companyId}/${drawing.siteId}/drawings`,
      drawingFileName,
    );

    if (drawingFileName.endsWith(".dwg")) {
      let result = await getDWGFileToken();

      if (revisionObj.urn && revisionObj.urnExpiration > new Date()) {
        result.urn = revisionObj.urn;
      } else {
        const imgRes = await processDWGFile(filePath);
        result.urn = imgRes.urn;
        const currentDateTime = new Date();
        const expirationDate = new Date(
          currentDateTime.getTime() + 28 * 24 * 60 * 60 * 1000,
        );
        result.urnExpiration = expirationDate;

        // Update the drawing object with the new URN and expiration
        drawing.acceptedSiteHeadRevisions[revisionIndex].urn = result.urn;
        drawing.acceptedSiteHeadRevisions[
          revisionIndex
        ].urnExpiration = expirationDate;
        await drawing.save();
      }

      if (!result) {
        return next(new AppError("Failed to process the DWG file", 400));
      }

      res.status(200).json({
        status: "success",
        data: result,
      });
    } else {
      // Download the file
      res.download(filePath, drawingFileName, (err) => {
        if (err) {
          console.error("Download Error:", err);
          return next(new AppError("Failed to download the file.", 400));
        }
      });
    }
  },
);

exports.getAcceptedSiteRevisionsDrawing = catchAsync(async (req, res, next) => {
  const { id, revision } = req.params;
  const companyId = req.user.companyId;
  // Find the drawing by its ID
  const drawing = await ArchitectureToRoRegister.findById(id);

  if (!drawing) {
    return next(new AppError("No drawing found with that ID", 404));
  }

  // Check if acceptedSiteRevisions exist and is an array
  if (
    !drawing.acceptedSiteRevisions ||
    !Array.isArray(drawing.acceptedSiteRevisions)
  ) {
    return next(new AppError("No revisions found for this drawing.", 404));
  }

  // Find the revision object based on the provided revision parameter
  const revisionObj = drawing.acceptedSiteRevisions.find(
    (el) => el.revision === revision,
  );
  const revisionIndex = drawing.acceptedSiteRevisions.findIndex(
    (r) => r.revision === revision,
  );

  if (!revisionObj) {
    return next(
      new AppError(`No drawing file found for the ${revision} revision.`, 404),
    );
  }

  // Extract the drawing file name and construct the file path
  const drawingFileName = revisionObj.drawingFileName;
  const filePath = path.join(
    __dirname,
    `../../uploads/${companyId}/${drawing.siteId}/drawings`,
    drawingFileName,
  );

  if (drawingFileName.endsWith(".dwg")) {
    let result = await getDWGFileToken();

    if (revisionObj.urn && revisionObj.urnExpiration > new Date()) {
      result.urn = revisionObj.urn;
    } else {
      const imgRes = await processDWGFile(filePath);
      if (!imgRes) {
        return next(new AppError("Failed to process the DWG file", 400));
      }

      result.urn = imgRes.urn;
      const expirationDate = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000); // 28 days
      result.urnExpiration = expirationDate;

      drawing.acceptedSiteRevisions[revisionIndex].urn = result.urn;
      drawing.acceptedSiteRevisions[
        revisionIndex
      ].urnExpiration = expirationDate;
      await drawing.save();
    }

    res.status(200).json({
      status: "success",
      data: result,
    });
  } else {
    // For non-DWG files, download the file
    res.download(filePath, drawingFileName, (err) => {
      if (err) {
        console.error("Download Error:", err);
        return next(new AppError("Failed to download the file.", 400));
      }
    });
  }
});
// Retrieve all drawings
exports.getAllDrawing = catchAsync(async (req, res, next) => {
  const { siteId } = req.query;

  const query = {};
  if (siteId) query.siteId = siteId;

  try {
    const allDrawings = await ArchitectureToRoRegister.find(query)
      .populate({
        path: "category",
      })
      .populate("siteId")
      .populate("designDrawingConsultant");

    res.status(200).json({
      status: "success",
      data: allDrawings,
    });
  } catch (error) {
    return next(new AppError("Failed to retrieve drawings", 400));
  }
});

// Delete a drawing
exports.deleteDrawing = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const deletedDrawing = await ArchitectureToRoRegister.findByIdAndDelete(id);

  if (!deletedDrawing) {
    return next(new AppError("No drawing found with that ID", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

const storage = multer.memoryStorage(); // Store files in memory

const uploads = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accept PDF, image files, and DWG files
    const mimeTypes = [
      "image/jpeg",
      "image/png",
      "application/pdf",
      "application/acad", // Common DWG MIME type
      "application/octet-stream", // Generic binary file type
      "application/dwg", // DWG file type
      "image/vnd.dwg", // DWG image type
    ];

    // Log the MIME type for debugging purposes
    console.log("Uploaded file MIME type:", file.mimetype);

    if (mimeTypes.includes(file.mimetype)) {
      cb(null, true); // Accept the file
    } else {
      cb(
        new AppError(
          "Not a valid file type! Please upload only images, PDFs, or DWG files.",
          400,
        ),
        false,
      ); // Reject the file
    }
  },
});

exports.uploadFiles = upload.fields([
  { name: "drawingFileName", maxCount: 1 },
  { name: "pdfDrawingFileName", maxCount: 1 },
]);

// const getNextRevisionNumber = (revisions, typeOfDrawing) => {
//   // Map typeOfDrawing to prefix
//   const prefixMap = {
//     // "General Arrangement": "GA",
//     Conceptual: "C",
//     Schematic: "S",
//     "Default Design": "D",
//     "As Built": "A",
//     GFC: "",
//   };

//   const currentPrefix = prefixMap[typeOfDrawing] || "";

//   if (!revisions.length) {
//     // If no revisions exist, always start from R0
//     return currentPrefix ? `${currentPrefix}-R0` : `R0`;
//   }

//   const latestRevision = revisions[revisions.length - 1].revision;

//   // Extract prefix and number
//   const [latestPrefix, latestNumberPart] = latestRevision.includes("-")
//     ? latestRevision.split("-")
//     : ["", latestRevision];

//   // If the typeOfDrawing matches the latest revision's prefix → increment
//   if (
//     currentPrefix === latestPrefix ||
//     (currentPrefix === "" && latestPrefix === "") // For GFC case
//   ) {
//     const nextNumber = parseInt(latestNumberPart.slice(1), 10) + 1;
//     return currentPrefix ? `${currentPrefix}-R${nextNumber}` : `R${nextNumber}`;
//   }

//   // If typeOfDrawing changed → start fresh from R0
//   return currentPrefix ? `${currentPrefix}-R0` : `R0`;
// };
const getNextRevisionNumber = (revisions, typeOfDrawing) => {
  const prefixMap = {
    Conceptual: "C",
    Schematic: "S",
    "Default Design": "D",
    "As Built": "A",
    GFC: "",
  };

  const prefix = prefixMap[typeOfDrawing] || "";

  // If no revisions exist → start with R0
  if (!revisions.length) {
    return prefix ? `${prefix}-R0` : `R0`;
  }

  // Extract the highest revision number (global)
  let maxNumber = -1;

  revisions.forEach((rev) => {
    let revision = rev.revision; // example: C-R0, S-R2, R1

    // Remove prefix if exists → get R<number>
    if (revision.includes("-")) {
      revision = revision.split("-")[1]; // R0, R2
    }

    const num = parseInt(revision.replace("R", ""), 10);
    if (!isNaN(num) && num > maxNumber) {
      maxNumber = num;
    }
  });

  // Next revision number globally
  const nextNumber = maxNumber + 1;

  return prefix ? `${prefix}-R${nextNumber}` : `R${nextNumber}`;
};

exports.updateRevisions = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { revisionType } = req.query;

  const drawingFile = req.files?.drawingFileName
    ? req.files.drawingFileName[0]
    : null;
  const pdfDrawingFile = req.files?.pdfDrawingFileName
    ? req.files.pdfDrawingFileName[0]
    : null;

  const drawingFileNameFromBody = req.body.drawingFileName || null;
  const pdfDrawingFileNameFromBody = req.body.pdfDrawingFileName || null;
  const typeOfDrawing = req.body.typeOfDrawing;

  if (!revisionType) {
    return res.status(400).json({
      status: "fail",
      success: false,
      message: "revisionType is required",
    });
  }

  if (
    (revisionType === "acceptedRORevisions" ||
      revisionType === "acceptedSiteHeadRevisions") &&
    !req.body.revision
  ) {
    return res.status(400).json({
      status: "fail",
      message: "revision is required in body for RO or SiteHead revisions",
    });
  }

  const existingRegister = await ArchitectureToRoRegister.findById(id);
  if (!existingRegister) {
    return res.status(404).json({
      status: "fail",
      success: false,
      message: "No register found with that ID",
    });
  }

  const siteId = existingRegister.siteId;
  const drawingNo = existingRegister.drawingNo;

  if (!existingRegister[revisionType]) {
    return res.status(400).json({
      status: "fail",
      success: false,
      message: `Invalid revisionType: ${revisionType}`,
    });
  }

  const processRevision = (
    revisionArray,
    newRevision,
    drawingFileName,
    pdfDrawingFileName,
  ) => {
    const existingIndex = existingRegister[revisionType].findIndex(
      (r) => r.revision === newRevision.revision,
    );
    const finalDrawingFileName =
      drawingFileName || drawingFileNameFromBody || null;
    const finalPdfDrawingFileName =
      pdfDrawingFileName || pdfDrawingFileNameFromBody || null;

    const isArchitectRevision = revisionType === "acceptedArchitectRevisions";
    const revisionToUse = isArchitectRevision
      ? getNextRevisionNumber(revisionArray, newRevision.typeOfDrawing)
      : newRevision.revision;

    if (existingIndex >= 0) {
      revisionArray[existingIndex] = {
        revisionCreatedBy: userId,
        ...revisionArray[existingIndex],
        ...newRevision,
        ...(finalDrawingFileName && { drawingFileName: finalDrawingFileName }),
        ...(finalPdfDrawingFileName && {
          pdfDrawingFileName: finalPdfDrawingFileName,
        }),
      };
    } else {
      const newRevisionData = {
        ...newRevision,
        revision: revisionToUse,
        revisionCreatedBy: userId,
        remarks: newRevision.remarks || "",
        ...(finalDrawingFileName && { drawingFileName: finalDrawingFileName }),
        ...(finalPdfDrawingFileName && {
          pdfDrawingFileName: finalPdfDrawingFileName,
        }),
      };
      revisionArray.push(newRevisionData);
    }
  };

  if (revisionType === "acceptedArchitectRevisions") {
    const latestRevision =
      existingRegister[revisionType][existingRegister[revisionType].length - 1];
    // console.log("Latest Revision:", latestRevision);
  }

  try {
    let drawingFileName = null;
    let pdfDrawingFileName = null;
    let drawingFullPath = null;
    let pdfFullPath = null;

    if (drawingFile) {
      const fileExtension = path.extname(drawingFile.originalname);
      drawingFileName = `drawing-ArchitectureToRoRegister-${
        existingRegister._id
      }-${Date.now()}${fileExtension}`;
      drawingFileName1 = drawingFileName;
      const companyId = req.user.companyId;

      const result = getUploadPath(
        companyId,
        drawingFileName,
        "drawings",
        existingRegister.siteId,
      );
      drawingFullPath = result.fullPath;
      drawingFileName = result.relativePath;
      const uploadToS3 = result.uploadToS3;
      await uploadToS3(drawingFile.buffer, drawingFile.mimetype);
    }

    if (pdfDrawingFile) {
      const pdfFileExtension = path.extname(pdfDrawingFile.originalname);
      pdfDrawingFileName = `pdf-ArchitectureToRoRegister-${
        existingRegister._id
      }-${Date.now()}${pdfFileExtension}`;
      const companyId = req.user.companyId;

      const result = getUploadPath(
        companyId,
        pdfDrawingFileName,
        "drawings",
        existingRegister.siteId,
      );
      pdfFullPath = result.fullPath;
      pdfDrawingFileName = result.relativePath;
      const uploadToS3 = result.uploadToS3;
      await uploadToS3(pdfDrawingFile.buffer, pdfDrawingFile.mimetype);
    }

    // =====================================================
    // ✅ PROCESS REVISION
    // =====================================================
    const newRevision = req.body;
    processRevision(
      existingRegister[revisionType],
      newRevision,
      drawingFileName,
      pdfDrawingFileName,
    );

    // =====================================================
    // ✅ LATEST & PREVIOUS REVISION TRACKING
    // =====================================================
    const latestIndex = existingRegister[revisionType].length - 1;

    const latestUploadedRevision =
      existingRegister[revisionType][latestIndex]?.revision;

    const previousRevision =
      latestIndex > 0
        ? existingRegister[revisionType][latestIndex - 1]?.revision
        : null;

    if (revisionType === "acceptedArchitectRevisions") {
      existingRegister.latestConsultantUploadedRevision = latestUploadedRevision;
    }

    if (revisionType === "acceptedRORevisions") {
      existingRegister.latestRoForwardedRevision = latestUploadedRevision;
    }

    // =====================================================
    // ✅ SUSPEND PREVIOUS REVISION RFIs
    // =====================================================
    // if (revisionType === "acceptedArchitectRevisions" && previousRevision) {
    if (revisionType === "acceptedRORevisions") {
      const baseQuery = {
        drawingId: existingRegister._id,
        // architectRevision: previousRevision,
      };

      // If status = Requested → change to suspended
//     await RoToSiteLevelRequest.updateMany(
//   {
//     ...baseQuery,
//     status: { $in: ["Requested", "reopened", "forwarded",] }
//   },
//   {
//     $set: {
//       status: "suspended",
//       isSuspended: true
//     }
//   }
// );


      // await SiteToSiteLevelRequest.updateMany(
      //   { ...baseQuery, status: "Requested" },
      //   { $set: { status: "suspended", isSuspended: true } },
      // );

      // For all other statuses → only set isSuspended = true
      // await RoToSiteLevelRequest.updateMany(
      //   { ...baseQuery, status: { $ne: "Requested" } },
      //   { $set: { isSuspended: true } },
      // );

      // await SiteToSiteLevelRequest.updateMany(
      //   { ...baseQuery, status: { $ne: "Requested" } },
      //   { $set: { isSuspended: true } },
      // );
      const suspendStatuses = ["Requested", "ReOpened", "Forwarded", "Responded"];

/* =====================================================
   1. Suspend matching statuses → change status + isSuspended
===================================================== */

await Promise.all([

  RoToSiteLevelRequest.updateMany(
    {
      ...baseQuery,
      status: { $in: suspendStatuses },
    },
    {
      $set: {
        status: "Suspended",
        isSuspended: true,
      },
    }
  ),

  SiteToSiteLevelRequest.updateMany(
    {
      ...baseQuery,
      status: { $in: suspendStatuses },
    },
    {
      $set: {
        status: "Suspended",
        isSuspended: true,
      },
    }
  ),

  ArchitectureToRoRequest.updateMany(
    {
      ...baseQuery,
      status: { $in: suspendStatuses },
    },
    {
      $set: {
        status: "Suspended",
        isSuspended: true,
      },
    }
  )

]);

/* =====================================================
   2. All other statuses → only set isSuspended = true
===================================================== */

await Promise.all([

  RoToSiteLevelRequest.updateMany(
    {
      ...baseQuery,
      status: { $nin: suspendStatuses },
    },
    {
      $set: {
        isSuspended: true,
      },
    }
  ),

  SiteToSiteLevelRequest.updateMany(
    {
      ...baseQuery,
      status: { $nin: suspendStatuses },
    },
    {
      $set: {
        isSuspended: true,
      },
    }
  ),

  ArchitectureToRoRequest.updateMany(
    {
      ...baseQuery,
      status: { $nin: suspendStatuses },
    },
    {
      $set: {
        isSuspended: true,
      },
    }
  )

]);

    }

    // =====================================================
    // ✅ UPDATE REVISION STATUS BASED ON REFERENCES
    // =====================================================
    if (req.body.architectRef) {
      const architectRevision = existingRegister.acceptedArchitectRevisions.find(
        (rev) => rev._id.toString() === req.body.architectRef,
      );
      if (architectRevision) {
        architectRevision.architectRevisionStatus = "Forwarded";
      }
    }

    if (req.body.roRef) {
      const roRevision = existingRegister.acceptedRORevisions.find(
        (rev) => rev._id.toString() === req.body.roRef,
      );
      if (roRevision) {
        roRevision.roRevisionStatus = "Forwarded";
      }
    }

    if (revisionType === "acceptedArchitectRevisions") {
      existingRegister.regState = "Drawing";
    }

    const updatedRegister = await existingRegister.save();

    // =====================================================
    // ✅ PROCESS DWG FILE
    // =====================================================
    if (drawingFile && drawingFullPath) {
      try {
        const result = await processDWGFile(
          drawingFileName1,
          drawingFile.buffer,
        );

        const latestRevisionIndex = existingRegister[revisionType].length - 1;
        const latestRevision =
          existingRegister[revisionType][latestRevisionIndex];

        if (result.urn) {
          latestRevision.urn = result.urn;
          latestRevision.drawingFileName = drawingFileName;

          const expirationDate = new Date();
          expirationDate.setDate(expirationDate.getDate() + 28);
          latestRevision.urnExpiration = expirationDate;

          existingRegister.markModified(revisionType);
          existingRegister.currentDrawingType = typeOfDrawing;
          await existingRegister.save();
        }
      } catch (e) {
        console.error("Error processing DWG file:", e);
        return res.status(200).json({
          status: "fail",
          message: "Error processing DWG file: " + e.message,
        });
      }
    }

    // =====================================================
    // ✅ SEND NOTIFICATIONS TO SITE HEADS / RO
    // =====================================================
    const siteHeadIds = await User.find({
      "permittedSites.siteId": siteId,
    }).select("permittedSites _id");

    const latestRevisionFinal =
      updatedRegister[revisionType][updatedRegister[revisionType].length - 1];
    const revision = latestRevisionFinal?.revision;

    if (
      revisionType === "acceptedArchitectRevisions" &&
      siteHeadIds.length > 0
    ) {
      for (let user of siteHeadIds) {
        const site = user?.permittedSites?.find(
          (site) => site?.siteId?.toString() === siteId.toString(),
        );
        if (!site) continue;

        const rfiAccessEnabled =
          site?.enableModules?.drawingDetails?.roDetails?.forwardAccess;
        if (rfiAccessEnabled) {
          await sendNotification(
            "Drawing",
            `A soft copy has been submitted for drawing number ${drawingNo}, accepted architect revision ${revision}.`,
            "Soft Copy Submitted",
            "Submitted",
            user._id,
          );
        }
      }
    }

    if (revisionType === "acceptedRORevisions" && siteHeadIds.length > 0) {
      for (let user of siteHeadIds) {
        const site = user?.permittedSites?.find(
          (site) => site?.siteId?.toString() === siteId.toString(),
        );
        if (!site) continue;

        const rfiAccessEnabled =
          site?.enableModules?.drawingDetails?.siteHeadDetails?.forwardAccess;
        if (rfiAccessEnabled) {
          await sendNotification(
            "Drawing",
            `A soft copy has been submitted for drawing number ${drawingNo}, accepted ro revision ${revision}.`,
            "Soft Copy Submitted",
            "Submitted",
            user._id,
          );
        }
      }
    }

    if (
      revisionType === "acceptedSiteHeadRevisions" &&
      siteHeadIds.length > 0
    ) {
      for (let user of siteHeadIds) {
        const site = user?.permittedSites?.find(
          (site) => site?.siteId?.toString() === siteId.toString(),
        );
        if (!site) continue;

        const rfiAccessEnabled =
          site?.enableModules?.drawingDetails?.siteToSite;
        if (rfiAccessEnabled) {
          await sendNotification(
            "Drawing",
            `A soft copy has been submitted for drawing number ${drawingNo}, accepted siteHead revision ${revision}.`,
            "Soft Copy Submitted",
            "Submitted",
            user._id,
          );
        }
      }
    }

    res.status(200).json({
      status: "success",
      success: true,
      data: updatedRegister,
    });
  } catch (error) {
    console.error("Error updating revisions:", error.message);
    res.status(400).json({
      status: "fail",
      success: false,
      message: error.message,
    });
  }
});
// exports.updateRevisions = catchAsync(async (req, res, next) => {
//   const { id } = req.params;
//   const userId = req.user.id;
//   const { revisionType } = req.query;

//   if (!mongoose.Types.ObjectId.isValid(id)) {
//     return res.status(400).json({
//       status: "fail",
//       success: false,
//       message: "Invalid register id",
//     });
//   }

//   const drawingFile = req.files?.drawingFileName
//     ? req.files.drawingFileName[0]
//     : null;
//   const pdfDrawingFile = req.files?.pdfDrawingFileName
//     ? req.files.pdfDrawingFileName[0]
//     : null;

//   const drawingFileNameFromBody = req.body.drawingFileName || null;
//   const pdfDrawingFileNameFromBody = req.body.pdfDrawingFileName || null;
//   const typeOfDrawing = req.body.typeOfDrawing;

//   if (!revisionType) {
//     return res.status(400).json({
//       status: "fail",
//       success: false,
//       message: "revisionType is required",
//     });
//   }

//   if (
//     (revisionType === "acceptedRORevisions" ||
//       revisionType === "acceptedSiteHeadRevisions") &&
//     !req.body.revision
//   ) {
//     return res.status(400).json({
//       status: "fail",
//       message: "revision is required in body for RO or SiteHead revisions",
//     });
//   }

//   const existingRegister = await ArchitectureToRoRegister.findById(id);
//   if (!existingRegister) {
//     return res.status(404).json({
//       status: "fail",
//       success: false,
//       message: "No register found with that ID",
//     });
//   }

//   const siteId = existingRegister.siteId;
//   const drawingNo = existingRegister.drawingNo;

//   if (!existingRegister[revisionType]) {
//     return res.status(400).json({
//       status: "fail",
//       success: false,
//       message: `Invalid revisionType: ${revisionType}`,
//     });
//   }

//   /**
//    * ------------------------------
//    * Handles revision insert/update
//    * ------------------------------
//    */
//   const processRevision = (
//     revisionArray,
//     newRevision,
//     drawingFileName,
//     pdfDrawingFileName
//   ) => {
//     const existingIndex = existingRegister[revisionType].findIndex(
//       (r) => r.revision === newRevision.revision
//     );

//     const finalDrawingFileName =
//       drawingFileName || drawingFileNameFromBody || null;
//     const finalPdfDrawingFileName =
//       pdfDrawingFileName || pdfDrawingFileNameFromBody || null;

//     const isArchitectRevision =
//       revisionType === "acceptedArchitectRevisions";

//     const revisionToUse = isArchitectRevision
//       ? getNextRevisionNumber(revisionArray, newRevision.typeOfDrawing)
//       : newRevision.revision;

//     if (existingIndex >= 0) {
//       revisionArray[existingIndex] = {
//         revisionCreatedBy: userId,
//         ...revisionArray[existingIndex],
//         ...newRevision,
//         ...(finalDrawingFileName && { drawingFileName: finalDrawingFileName }),
//         ...(finalPdfDrawingFileName && {
//           pdfDrawingFileName: finalPdfDrawingFileName,
//         }),
//       };
//     } else {
//       revisionArray.push({
//         ...newRevision,
//         revision: revisionToUse,
//         revisionCreatedBy: userId,
//         remarks: newRevision.remarks || "",
//         ...(finalDrawingFileName && { drawingFileName: finalDrawingFileName }),
//         ...(finalPdfDrawingFileName && {
//           pdfDrawingFileName: finalPdfDrawingFileName,
//         }),
//       });
//     }
//   };

//   try {
//     let drawingFileName = null;
//     let pdfDrawingFileName = null;
//     let drawingFullPath = null;
//     let pdfFullPath = null;

//     if (drawingFile) {
//       const fileExtension = path.extname(drawingFile.originalname);
//       drawingFileName = `drawing-ArchitectureToRoRegister-${existingRegister._id}-${Date.now()}${fileExtension}`;
//       drawingFileName1 = drawingFileName;

//       const companyId = req.user.companyId;
//       const result = getUploadPath(
//         companyId,
//         drawingFileName,
//         "drawings",
//         existingRegister.siteId
//       );

//       drawingFullPath = result.fullPath;
//       drawingFileName = result.relativePath;
//       await result.uploadToS3(drawingFile.buffer, drawingFile.mimetype);
//     }

//     if (pdfDrawingFile) {
//       const pdfFileExtension = path.extname(pdfDrawingFile.originalname);
//       pdfDrawingFileName = `pdf-ArchitectureToRoRegister-${existingRegister._id}-${Date.now()}${pdfFileExtension}`;

//       const companyId = req.user.companyId;
//       const result = getUploadPath(
//         companyId,
//         pdfDrawingFileName,
//         "drawings",
//         existingRegister.siteId
//       );

//       pdfFullPath = result.fullPath;
//       pdfDrawingFileName = result.relativePath;
//       await result.uploadToS3(pdfDrawingFile.buffer, pdfDrawingFile.mimetype);
//     }

//     const newRevision = req.body;

//     processRevision(
//       existingRegister[revisionType],
//       newRevision,
//       drawingFileName,
//       pdfDrawingFileName
//     );

//     const latestIndex = existingRegister[revisionType].length - 1;
//     const latestUploadedRevision =
//       existingRegister[revisionType][latestIndex]?.revision;

//     const previousRevision =
//       latestIndex > 0
//         ? existingRegister[revisionType][latestIndex - 1]?.revision
//         : null;

//     /**
//      * ==================================================
//      * SUSPENSION LOGIC (THIS IS WHAT YOU ASKED ABOUT)
//      * ==================================================
//      *
//      * Runs ONLY when:
//      * - A NEW architect revision is uploaded
//      * - AND there was a previous architect revision
//      */
//     if (revisionType === "acceptedArchitectRevisions" && previousRevision) {
//       const baseQuery = {
//         drawingId: existingRegister._id,
//         architectRevision: previousRevision,
//       };

//       /**
//        * Case 1:
//        * RFIs still in "Requested" state
//        * → convert them to "suspended"
//        */
//       await RoToSiteLevelRequest.updateMany(
//         { ...baseQuery, status: "Requested" },
//         { $set: { status: "suspended", isSuspended: true } }
//       );

//       await SiteToSiteLevelRequest.updateMany(
//         { ...baseQuery, status: "Requested" },
//         { $set: { status: "suspended", isSuspended: true } }
//       );

//       /**
//        * Case 2:
//        * RFIs already progressed (Accepted / Forwarded / Responded etc.)
//        * → keep status unchanged
//        * → only mark isSuspended = true
//        */
//       await RoToSiteLevelRequest.updateMany(
//         { ...baseQuery, status: { $ne: "Requested" } },
//         { $set: { isSuspended: true } }
//       );

//       await SiteToSiteLevelRequest.updateMany(
//         { ...baseQuery, status: { $ne: "Requested" } },
//         { $set: { isSuspended: true } }
//       );
//     }

//     if (revisionType === "acceptedArchitectRevisions") {
//       existingRegister.latestConsultantUploadedRevision =
//         latestUploadedRevision;
//       existingRegister.regState = "Drawing";
//     }

//     if (revisionType === "acceptedRORevisions") {
//       existingRegister.latestRoForwardedRevision =
//         latestUploadedRevision;
//     }

//     const updatedRegister = await existingRegister.save();

//     res.status(200).json({
//       status: "success",
//       success: true,
//       data: updatedRegister,
//     });
//   } catch (error) {
//     console.error("Error updating revisions:", error);
//     res.status(400).json({
//       status: "fail",
//       success: false,
//       message: error.message,
//     });
//   }
// });

exports.getRegisterBySiteId = catchAsync(async (req, res, next) => {
  const { siteId, status, folderId } = req.query;

  const query = {};
  if (status) query.status = status;
  if (siteId) query.siteId = siteId;
  if (folderId) query.folderId = folderId;

  try {
    const registers = await ArchitectureToRoRegister.find(query)
      .populate({ path: "category", select: "category" })
      .populate({ path: "siteId", select: "siteName" })
      .populate({ path: "folderId", select: "folderName" })
      .populate({ path: "designDrawingConsultant", select: "role firstName" })
      .populate({
        path: "acceptedSiteHeadRevisions",
        select: "revision roRef rfiStatus",
      });

    // Debugging: log the populated data
    console.log("Registers:", registers);

    const enrichedRegisters = await Promise.all(
      registers.map(async (register) => {
        const enrichedRevisions = await Promise.all(
          register.acceptedRORevisions.map(async (revision) => {
            if (revision.architectRef) {
              const matchedRevision = register.acceptedArchitectRevisions.find(
                (archRevision) =>
                  archRevision._id.toString() ===
                  revision.architectRef.toString(),
              );
              return matchedRevision ? matchedRevision : null;
            }
            return revision;
          }),
        );

        const enrichedSiteHeadRevisions = await Promise.all(
          register.acceptedSiteHeadRevisions.map(async (siteHeadRevision) => {
            if (siteHeadRevision.roRef) {
              const matchedSiteHead = register.acceptedRORevisions.find(
                (headRevision) =>
                  headRevision._id.toString() ===
                  siteHeadRevision.roRef.toString(),
              );

              // Check for architectRef in matchedSiteHead
              if (matchedSiteHead && matchedSiteHead.architectRef) {
                const matchedArchitectRevision = register.acceptedArchitectRevisions.find(
                  (archRevision) =>
                    archRevision._id.toString() ===
                    matchedSiteHead.architectRef.toString(),
                );
                return matchedArchitectRevision
                  ? matchedArchitectRevision
                  : matchedSiteHead;
              }

              return matchedSiteHead ? matchedSiteHead : null;
            }
            return siteHeadRevision;
          }),
        );

        const enrichedSiteLevelRevisions = await Promise.all(
          register.acceptedSiteRevisions.map(async (siteRevision) => {
            if (siteRevision.siteHeadRef) {
              const matchedSite = register.acceptedSiteHeadRevisions.find(
                (headRevision) =>
                  headRevision._id.toString() ===
                  siteRevision.siteHeadRef.toString(),
              );

              if (matchedSite && matchedSite.roRef) {
                const matchedRoRevision = register.acceptedRORevisions.find(
                  (roRevision) =>
                    roRevision._id.toString() === matchedSite.roRef.toString(),
                );

                if (matchedRoRevision && matchedRoRevision.architectRef) {
                  const matchedArchitectRevision = register.acceptedArchitectRevisions.find(
                    (archRevision) =>
                      archRevision._id.toString() ===
                      matchedRoRevision.architectRef.toString(),
                  );
                  return matchedArchitectRevision
                    ? matchedArchitectRevision
                    : matchedRoRevision;
                }

                return matchedRoRevision ? matchedRoRevision : matchedSite;
              }

              return matchedSite ? matchedSite : null;
            }
            return siteRevision;
          }),
        );

        return {
          ...register.toObject(),
          acceptedRORevisions: enrichedRevisions.filter(Boolean),
          acceptedSiteHeadRevisions: enrichedSiteHeadRevisions.filter(Boolean),
          acceptedSiteRevisions: enrichedSiteLevelRevisions.filter(Boolean),
        };
      }),
    );

    res.status(200).json({
      status: "success",
      results: enrichedRegisters.length,
      data: { registers: enrichedRegisters },
    });
  } catch (error) {
    console.error(error);
    return next(
      new AppError(`Failed to retrieve drawings: ${error.message}`, 400),
    );
  }
});

exports.updateHardCopyRevisions = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;
  const {
    acceptedSiteHeadHardCopyRevisions,
    acceptedROHardCopyRevisions,
  } = req.body;

  // Find the existing register
  const existingRegister = await ArchitectureToRoRegister.findById(id);

  if (!existingRegister) {
    return res.status(404).json({
      status: "fail",
      success: false,
      message: "No register found with that ID",
    });
  }

  // Log the existing register for debugging
  console.log("Existing Register:", existingRegister);

  // Process acceptedSiteHeadHardCopyRevisions if applicable
  if (
    acceptedSiteHeadHardCopyRevisions &&
    Array.isArray(acceptedSiteHeadHardCopyRevisions)
  ) {
    for (const hardCopy of acceptedSiteHeadHardCopyRevisions) {
      const existingHardCopyIndex = existingRegister.acceptedSiteHeadHardCopyRevisions.findIndex(
        (r) => r.revision === hardCopy.revision,
      );

      if (existingHardCopyIndex >= 0) {
        // Update existing hard copy revision
        existingRegister.acceptedSiteHeadHardCopyRevisions[
          existingHardCopyIndex
        ] = {
          revisionCreatedBy: userId,
          ...existingRegister.acceptedSiteHeadHardCopyRevisions[
            existingHardCopyIndex
          ],
          ...hardCopy,
        };
      } else {
        // Add new hard copy revision
        if (existingRegister.acceptedSiteHeadHardCopyRevisions.length > 0) {
          const previousHardCopy =
            existingRegister.acceptedSiteHeadHardCopyRevisions[
              existingRegister.acceptedSiteHeadHardCopyRevisions.length - 1
            ];
          if (!previousHardCopy.hardCopyFile && !hardCopy.hardCopyFile) {
            return res.status(400).json({
              status: "fail",
              success: false,
              message: `Cannot add new hard copy revision ${hardCopy.revision} because previous revision does not have a hard copy file and current revision does not have a hard copy file`,
            });
          }
          if (!previousHardCopy.hardCopyFile) {
            return res.status(400).json({
              status: "fail",
              success: false,
              message: `Cannot add new hard copy revision ${hardCopy.revision} because previous revision does not have a hard copy file`,
            });
          }
        }
        // Directly add the new revision provided in the body
        existingRegister.acceptedSiteHeadHardCopyRevisions.push({
          ...hardCopy,
          remarks: hardCopy.remarks || "", // Default to empty string if remarks are not provided
        });
      }
    }
  }

  // Process acceptedROHardCopyRevisions if applicable
  if (
    acceptedROHardCopyRevisions &&
    Array.isArray(acceptedROHardCopyRevisions)
  ) {
    for (const hardCopy of acceptedROHardCopyRevisions) {
      const existingHardCopyIndex = existingRegister.acceptedROHardCopyRevisions.findIndex(
        (r) => r.revision === hardCopy.revision,
      );

      if (existingHardCopyIndex >= 0) {
        // Update existing hard copy revision
        existingRegister.acceptedROHardCopyRevisions[existingHardCopyIndex] = {
          revisionCreatedBy: userId,
          ...existingRegister.acceptedROHardCopyRevisions[
            existingHardCopyIndex
          ],
          ...hardCopy,
        };
      } else {
        // Add new hard copy revision
        if (existingRegister.acceptedROHardCopyRevisions.length > 0) {
          const previousHardCopy =
            existingRegister.acceptedROHardCopyRevisions[
              existingRegister.acceptedROHardCopyRevisions.length - 1
            ];
          if (!previousHardCopy.hardCopyFile && !hardCopy.hardCopyFile) {
            return res.status(400).json({
              status: "fail",
              success: false,
              message: `Cannot add new hard copy revision ${hardCopy.revision} because previous revision does not have a hard copy file and current revision does not have a hard copy file`,
            });
          }
          if (!previousHardCopy.hardCopyFile) {
            return res.status(400).json({
              status: "fail",
              success: false,
              message: `Cannot add new hard copy revision ${hardCopy.revision} because previous revision does not have a hard copy file`,
            });
          }
        }
        // Directly add the new revision provided in the body
        existingRegister.acceptedROHardCopyRevisions.push({
          ...hardCopy,
          remarks: hardCopy.remarks || "", // Default to empty string if remarks are not provided
        });
      }
    }
  }

  // Save the updated register
  const updatedRegister = await existingRegister.save();

  res.status(200).json({
    status: "success",
    success: true,
    data: updatedRegister,
  });
});

exports.uploadHardCopyFile = upload.single("hardCopyFile");

// Resize and save the uploaded file
exports.resizeHardCopyFile = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  if (!req.drawing) {
    req.drawing = await ArchitectureToRoRegister.findById(req.params.id);
  }

  if (!req.drawing) {
    return next(new AppError("Drawing not found", 200)); // As per your preference
  }

  const fileExtension = path.extname(req.file.originalname);
  const newFilename = `hardCopy-ArchitectureToRoRegister-${
    req.drawing._id
  }-${Date.now()}${fileExtension}`;

  const companyId = req.user.companyId;

  const { fullPath, relativePath, uploadToS3 } = getUploadPath(
    companyId,
    newFilename,
    "drawings",
    req.drawing.siteId,
  );

  // Upload to S3 (no sharp)
  await uploadToS3(req.file.buffer, req.file.mimetype);

  // Store relative path in req.file for later use
  req.file.filename = relativePath;

  next();
});

exports.updateAcceptedROHardcopyRevisionsHardCopyFile = catchAsync(
  async (req, res, next) => {
    const { id } = req.params;

    const architectureToRoRegister = await ArchitectureToRoRegister.findById(
      id,
    );
    if (!architectureToRoRegister) {
      return next(new AppError("No drawing found with that ID", 404));
    }

    const latestRevision =
      architectureToRoRegister.acceptedROHardCopyRevisions[
        architectureToRoRegister.acceptedROHardCopyRevisions.length - 1
      ];
    if (!latestRevision) {
      return next(new AppError("No revisions found for this drawing", 404));
    }

    if (!req.file || !req.file.filename) {
      return next(new AppError("No file uploaded or filename missing", 400));
    }

    latestRevision.hardCopyFile = req.file.filename;

    await architectureToRoRegister.save();

    const { drawingNo, designDrawingConsultant } = architectureToRoRegister;
    const { revision } = latestRevision;

    const notification = await sendNotification(
      "Drawing",
      `A hard copy has been received for drawing number ${drawingNo}, accepted Ro hard copy revision ${revision}.`,
      "Hard Copy Received",
      "Received",
      designDrawingConsultant,
    );

    res.status(200).json({
      status: "success",
      data: architectureToRoRegister,
      notification,
    });
  },
);

exports.updateAcceptedArchitectHardCopyRevisions = catchAsync(
  async (req, res, next) => {
    const { id } = req.params;

    const architectureToRoRegister = await ArchitectureToRoRegister.findById(
      id,
    );
    if (!architectureToRoRegister) {
      return next(new AppError("No drawing found with that ID", 404));
    }

    const latestRevision =
      architectureToRoRegister.acceptedSiteHeadHardCopyRevisions[
        architectureToRoRegister.acceptedSiteHeadHardCopyRevisions.length - 1
      ];

    if (!latestRevision) {
      return next(new AppError("No revisions found for this drawing", 404));
    }

    if (!req.file || !req.file.filename) {
      return next(new AppError("No file uploaded or filename missing", 400));
    }

    // ✅ Update hard copy file path
    latestRevision.hardCopyFile = req.file.filename;

    await architectureToRoRegister.save();

    const { drawingNo, siteId } = architectureToRoRegister;
    const { revision } = latestRevision;

    const siteHeadIds = await User.find({
      "permittedSites.siteId": siteId,
    }).select("permittedSites _id");

    if (siteHeadIds.length > 0) {
      for (let user of siteHeadIds) {
        const site = user?.permittedSites?.find(
          (site) => site?.siteId?.toString() === siteId.toString(),
        );
        if (!site) {
          console.warn(
            `No matching site found for user ${user._id} and siteId ${siteId}`,
          );
          continue;
        }

        const rfiAccessEnabled =
          site?.enableModules?.drawingDetails?.siteHeadDetails?.rfiRaisedAccess;
        console.log(
          `RFI Access Enabled for site ${site?.siteId}:`,
          rfiAccessEnabled,
        );

        if (rfiAccessEnabled) {
          const notificationMessage = `A hard copy has been received for drawing number ${drawingNo}, accepted architect hard copy revision ${revision}.`;
          try {
            const notificationToSiteHead = await sendNotification(
              "Drawing",
              notificationMessage,
              "Hard Copy Received",
              "Received",
              user._id,
            );
            console.log("notificationToSiteHead", notificationToSiteHead);
          } catch (error) {
            console.error(
              "Error sending notification to SiteHeadId ",
              user._id,
              ": ",
              error,
            );
          }
        }
      }
    }

    res.status(200).json({
      status: "success",
      data: architectureToRoRegister,
    });
  },
);

exports.getHardCopyFileAcceptedArchitectRevision = catchAsync(
  async (req, res, next) => {
    const { id, revision } = req.params; // Extract both ID and revision from the URL parameters
    const companyId = req.user.companyId;
    const architectureToRoRegister = await ArchitectureToRoRegister.findById(
      id,
    );

    if (!architectureToRoRegister) {
      return next(new AppError("No drawing found with that ID", 404));
    }

    if (
      !architectureToRoRegister.acceptedSiteHeadHardCopyRevisions ||
      !Array.isArray(architectureToRoRegister.acceptedSiteHeadHardCopyRevisions)
    ) {
      return next(new AppError("No revisions found for this drawing.", 404));
    }

    // Find the revision object based on the provided revision parameter
    const revisionObj = architectureToRoRegister.acceptedSiteHeadHardCopyRevisions.find(
      (el) => el.revision === revision,
    );

    if (!revisionObj) {
      return next(
        new AppError(
          `No hard copy file found for the ${revision} revision.`,
          404,
        ),
      );
    }
    console.log("siteId:", architectureToRoRegister.siteId);

    const siteIdStr = architectureToRoRegister.siteId.toString();
    const hardCopyFileName = revisionObj.hardCopyFile;
    const filePath = path.join(
      __dirname,
      `../../uploads/${companyId}/${architectureToRoRegister.siteId}/drawings`,
      hardCopyFileName,
    );
    console.log("path:", filePath);
    //   if (hardCopyFileName.endsWith('.dwg')) {
    //     const result =await processDWGFile(filePath);
    //     console.log("recieved result",result);
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
    //   res.sendFile(filePath, (err) => {
    //     if (err) {
    //       console.error('Send File Error:', err);
    //       return next(new AppError("Failed to fetch the image file.", 400));
    //     }
    //   });
    // }
    // });
    res.sendFile(filePath, (err) => {
      if (err) {
        return next(new AppError("Error sending the image file", 400));
      }
    });
  },
);

exports.getHardCopyFileAcceptedRoRevision = catchAsync(
  async (req, res, next) => {
    const { id, revision } = req.params; // Extract both ID and revision from the URL parameters
    const companyId = req.user.companyId;
    const architectureToRoRegister = await ArchitectureToRoRegister.findById(
      id,
    );

    if (!architectureToRoRegister) {
      return next(new AppError("No drawing found with that ID", 404));
    }

    if (
      !architectureToRoRegister.acceptedROHardCopyRevisions ||
      !Array.isArray(architectureToRoRegister.acceptedROHardCopyRevisions)
    ) {
      return next(new AppError("No revisions found for this drawing.", 404));
    }

    // Find the revision object based on the provided revision parameter
    const revisionObj = architectureToRoRegister.acceptedROHardCopyRevisions.find(
      (el) => el.revision === revision,
    );

    if (!revisionObj) {
      return next(
        new AppError(
          `No hard copy file found for the ${revision} revision.`,
          404,
        ),
      );
    }

    const hardCopyFileName = revisionObj.hardCopyFile;
    const filePath = path.join(
      __dirname,
      `../../uploads/${companyId}/${architectureToRoRegister.siteId}/drawings`,
      hardCopyFileName,
    );
    if (hardCopyFileName.endsWith(".dwg")) {
      const result = await processDWGFile(filePath);
      console.log("recieved result", result);
      if (!result) {
        return next(new AppError("Failed to process the DWG file", 400));
      }
      res.status(200).json({
        status: "success",
        data: result,
      });
    } else {
      // Download the file
      res.sendFile(filePath, (err) => {
        if (err) {
          console.error("Send File Error:", err);
          return next(new AppError("Failed to fetch the image file.", 400));
        }
      });
    }
  },
);
// exports.updateArchitectureToRoRegister = catchAsync(async (req, res, next) => {
//   const { id } = req.params;
//   const update = req.body;

//   const architectureToRoRegister = await ArchitectureToRoRegister.findByIdAndUpdate(id, update, {
//     new: true,
//     runValidators: true,
//   });

//   if (!architectureToRoRegister) {
//     return next(new AppError("No drawing found with that ID", 404));
//   }

//   res.status(200).json({
//     status: "success",
//     data: architectureToRoRegister,
//   });
// });
exports.updateArchitectureToRoRegister = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const update = req.body;
  const loginUser = req.user;
  const userId = req.user.id;

  // -----------------------------------------
  // 1️⃣ FIND THE REGISTER FIRST
  // -----------------------------------------
  const architectureToRoRegister = await ArchitectureToRoRegister.findById(id);

  if (!architectureToRoRegister) {
    return next(new AppError("No drawing found with that ID", 404));
  }

  // -----------------------------------------
  // 2️⃣ SAVE HISTORY BEFORE UPDATING
  // -----------------------------------------
  if (Object.keys(update).length > 0) {
    architectureToRoRegister.history = architectureToRoRegister.history || [];
    architectureToRoRegister.history.unshift({
      updatedBy: userId,
      updatedAt: new Date(),
      updatedFields: update,
    });
  }

  // -----------------------------------------
  // 3️⃣ APPLY UPDATES
  // -----------------------------------------
  Object.assign(architectureToRoRegister, update);

  // -----------------------------------------
  // 4️⃣ SAVE THE DOCUMENT
  // -----------------------------------------
  await architectureToRoRegister.save({ validateBeforeSave: true });

  // -----------------------------------------
  // 5️⃣ GET CHANGED FIELDS (for notifications)
  // -----------------------------------------
  const changedFields = Object.keys(update)
    .map((key) => `${key}: ${update[key]}`)
    .join(", ");

  const drawingNo =
    update.drawingNo || architectureToRoRegister.drawingNo || "";

  // -----------------------------------------
  // 6️⃣ ONLY DESIGN CONSULTANT TRIGGERS RO NOTIFICATIONS
  // -----------------------------------------
  if (loginUser.department === "Design Consultant") {
    const siteId = architectureToRoRegister.siteId;

    // Check if this consultant has RO access on this site
    const assigned = await AssignDesignConsultantsToDepartment.findOne({
      siteId,
      module: "ro",
      designConsultants: architectureToRoRegister.designDrawingConsultant,
    });

    if (assigned) {
      const departments = [assigned.department];
      console.log("Departments with RO access:", departments);

      // -----------------------------------------
      // 7️⃣ GET USERS IN THESE DEPARTMENTS WITH RO ACCESS
      // -----------------------------------------
      const departmentUsers = await User.find({
        department: { $in: departments },
        permittedSites: {
          $elemMatch: {
            siteId,
            "enableModules.drawingDetails.ro": true,
          },
        },
      });

      const notifications = [];

      // -----------------------------------------
      // 8️⃣ SEND APP NOTIFICATIONS
      // -----------------------------------------
      for (const user of departmentUsers) {
        const notification = await sendNotification(
          "Drawing",
          `RO Register updated (Drawing No: ${drawingNo}). Changes: ${changedFields}`,
          "Drawing Register Updated",
          "Updated",
          user._id,
        );

        notifications.push(notification);
      }

      console.log("Notifications sent:", notifications);

      // -----------------------------------------
      // 9️⃣ EMAIL NOTIFICATIONS (With safe error handling)
      // -----------------------------------------
      const emailSender = process.env.EMAIL_USER;

      for (const user of departmentUsers) {
        try {
          await sendEmail({
            email: user.email,
            from: emailSender,
            subject: "RO Drawing Register Updated",
            message: `
Hello ${user.firstName},

The RO Drawing Register has been updated.

Drawing No: ${drawingNo}
Updated By: ${loginUser.firstName} ${loginUser.lastName}
Site: ${siteId}

Changed Fields:
${changedFields}

Regards,
${emailSender}
            `,
          });

          console.log(`Email sent to ${user.email}`);
        } catch (emailErr) {
          console.error("Email failed for:", user.email, emailErr.message);
          // Email failure WILL NOT stop the API response
        }
      }
    }
  }

  // -----------------------------------------
  // 🔟 RESPONSE
  // -----------------------------------------
  res.status(200).json({
    status: "success",
    data: architectureToRoRegister,
  });
});

exports.getByPathName = catchAsync(async (req, res, next) => {
  const relativePath = req.params[0];

  if (!relativePath) {
    return res.status(400).json({ error: "Invalid file path" });
  }
  const uploadsDir = path.resolve(__dirname, "../../uploads");
  const filePath = path.join(uploadsDir, relativePath);
  console.log(filePath);
  console.log(uploadsDir);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }
  res.download(filePath, (err) => {
    if (err) {
      return next(err);
    }
  });
});

exports.updateFolderIdForRegisters = catchAsync(async (req, res, next) => {
  const { folderId } = req.query;
  const { ids } = req.body;

  if (!folderId) {
    return res
      .status(400)
      .json({ status: "fail", message: "folderId is required in the query" });
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      status: "fail",
      message: "An array of IDs is required in the body",
    });
  }
  const result = await ArchitectureToRoRegister.updateMany(
    { _id: { $in: ids } },
    { $set: { folderId } },
  );

  res.status(200).json({
    status: "success",
    message: `documents updated successfully`,
    result,
  });
});
exports.getCategoriesByDesignConsultant = catchAsync(async (req, res, next) => {
  const { designDrawingConsultantId } = req.query;
  console.log(designDrawingConsultantId);
  const categories = await ArchitectureToRoRegister.find(
    {
      designDrawingConsultant: designDrawingConsultantId,
      category: { $exists: true, $ne: null },
    },
    { category: 1, _id: 0 },
  ).populate("category", "category"); // Assuming 'name' is the field you want from the category model

  if (!categories || categories.length === 0) {
    return res.status(404).json({
      status: "fail",
      message: "No categories found for the provided designDrawingConsultantId",
    });
  }

  // Response with categories
  res.status(200).json({
    status: "success",
    message: "Categories retrieved successfully",
    categories,
  });
});
exports.getDrawingsByDesignConsultantAndCategory = catchAsync(
  async (req, res, next) => {
    const { categoryId, designDrawingConsultantId } = req.query;
    const drawings = await ArchitectureToRoRegister.find({
      category: categoryId,
      designDrawingConsultant: designDrawingConsultantId,
    })
      .populate("designDrawingConsultant", "role")
      .populate("category", "category")
      .populate("folderId", "folderName");

    if (!drawings || drawings.length === 0) {
      return res.status(404).json({
        status: "fail",
        message:
          "No drawings found for the provided category and designDrawingConsultantId",
      });
    }

    res.status(200).json({
      status: "success",
      data: drawings,
    });
  },
);

exports.updateViewDates = catchAsync(async (req, res, next) => {
  const { _id, revision, newViewDate } = req.body;
  const { revisionType } = req.query;

  // Validate required parameters
  if (!_id || !revision || !newViewDate || !revisionType) {
    return res.status(400).json({
      status: "fail",
      message: "_id, revision, newViewDate, and revisionType are required",
    });
  }

  // Define the valid revision types
  const validRevisionTypes = [
    "acceptedArchitectRevisions",
    "acceptedRORevisions",
    "acceptedSiteHeadRevisions",
    "acceptedSiteRevisions",
    "acceptedROHardCopyRevisions",
    "acceptedSiteHeadHardCopyRevisions",
  ];

  if (!validRevisionTypes.includes(revisionType)) {
    return res.status(400).json({
      status: "fail",
      message: `revisionType must be one of ${validRevisionTypes.join(", ")}`,
    });
  }

  // Check if document and revision exist
  const register = await ArchitectureToRoRegister.findOne({
    _id: _id,
    [revisionType]: {
      $elemMatch: { revision: revision },
    },
  });

  if (!register) {
    return res.status(404).json({
      status: "fail",
      message: "No matching document or revision found",
    });
  }

  // Update the viewDates
  const updatedRegister = await ArchitectureToRoRegister.findOneAndUpdate(
    {
      _id: _id,
      [revisionType]: {
        $elemMatch: { revision: revision },
      },
    },
    {
      $push: {
        [`${revisionType}.$.viewDates`]: newViewDate,
      },
    },
    { new: true },
  );

  res.status(200).json({
    status: "success",
    data: {
      register: updatedRegister,
    },
  });
});

// GET register by ID + related requests
exports.getArchitectureToRoRegisterById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // 1) Fetch the main register
  const register = await ArchitectureToRoRegister.findById(id)
    .populate("siteId", "siteName")
    //.populate("companyId")
    //.populate("folderId")
    .populate("designDrawingConsultant", "firstName lastName email role");

  if (!register) {
    return next(new AppError("No register found with that ID", 404));
  }

  // 2) Fetch related requests with populated reasons
  const architectureRequests = await ArchitectureToRoRequest.find({
    drawingId: id,
  })
    .select("natureOfRequestedInformationReasons") // ✅ correct
    .populate(
      "natureOfRequestedInformationReasons.createdBy",
      "firstName lastName email role",
    );

  const roToSiteRequests = await RoToSiteLevelRequest.find({ drawingId: id })
    .select("natureOfRequestedInformationReasons") // ✅ correct
    .populate(
      "natureOfRequestedInformationReasons.createdBy",
      "firstName lastName email role",
    );

  const siteToSiteRequests = await SiteToSiteLevelRequest.find({
    drawingId: id,
  })
    .select("natureOfRequestedInformationReasons") // ✅ correct
    .populate(
      "natureOfRequestedInformationReasons.createdBy",
      "firstName lastName email role",
    );
  // 3) Combine data
  const result = {
    register,
    relatedRequests: {
      architectureRequests,
      roToSiteRequests,
      siteToSiteRequests,
    },
  };

  res.status(200).json({
    status: "success",
    data: result,
  });
});

exports.deleteMultipleRegisters = catchAsync(async (req, res, next) => {
  const { ids } = req.body; // Expect an array of register IDs

  console.log(ids);
  // 1. Fetch all registers by provided IDs
  const registers = await ArchitectureToRoRegister.find({ _id: { $in: ids } });

  if (!registers || registers.length === 0) {
    return next(new AppError("No registers found for the provided IDs", 404));
  }

  // 2. Separate registers into two groups
  const cannotDelete = registers.filter(
    (reg) =>
      reg.acceptedArchitectRevisions &&
      reg.acceptedArchitectRevisions.length > 0,
  );

  const canDelete = registers.filter(
    (reg) =>
      !reg.acceptedArchitectRevisions ||
      reg.acceptedArchitectRevisions.length === 0,
  );

  // 3. Delete only those without revisions
  const deleted = await ArchitectureToRoRegister.deleteMany({
    _id: { $in: canDelete.map((reg) => reg._id) },
  });

  // 4. Return response
  return res.status(200).json({
    status: "success",
    message: `${deleted.deletedCount} registers deleted successfully.`,
    skippedRegisters: cannotDelete.map((reg) => ({
      id: reg._id,
      drawingNo: reg.drawingNo,
      message: "This register has soft copy submitted, so it was not deleted",
    })),
  });
});

exports.updateMultipleRegisters = catchAsync(async (req, res, next) => {
  const { updates } = req.body;

  if (!Array.isArray(updates) || updates.length === 0) {
    return next(new AppError("Please provide an array of updates.", 400));
  }

  const userId = req.user.id; // logged-in user ID

  const results = await Promise.all(
    updates.map(async ({ id, data }) => {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return { id, status: "failed", message: "Invalid register ID" };
      }

      // STEP 1: Find the register first
      const register = await ArchitectureToRoRegister.findById(id);

      if (!register) {
        return { id, status: "failed", message: "Register not found" };
      }

      // STEP 2: Save history BEFORE applying updates (to capture what will change)
      if (Object.keys(data).length > 0) {
        register.history = register.history || [];
        register.history.unshift({
          updatedBy: userId,
          updatedAt: new Date(),
          updatedFields: data, // Store the fields that will be updated
        });
      }

      // STEP 3: Apply updates
      Object.assign(register, data);

      // STEP 4: Mark history array as modified to ensure Mongoose saves it
      register.markModified("history");

      // STEP 5: Save
      await register.save({ validateBeforeSave: true });

      return { id, status: "success", updatedFields: data };
    }),
  );

  res.status(200).json({ status: "success", results });
});

exports.getRegistersBySiteAndConsultant = catchAsync(async (req, res, next) => {
  const { siteId, consultantId } = req.query;

  // ---- Validate required siteId ----
  if (!siteId) {
    return next(new AppError("siteId is required.", 400));
  }

  // ---- Create dynamic filter ----
  const filter = { siteId };

  // If consultantId is provided, filter by consultant
  // If consultantId is NOT provided, show all registers for the site
  if (consultantId) {
    filter.designDrawingConsultant = consultantId;
  }
  // When consultantId is not provided, filter only contains { siteId }
  // which means all registers for that site will be returned

  const registers = await ArchitectureToRoRegister.find(filter)
    .populate({ path: "siteId", select: "siteName siteCode" })
    .populate({ path: "companyId", select: "companyName companyKeyWord" })
    .populate({ path: "folderId", select: "folderName" })
    .populate({
      path: "designDrawingConsultant",
      select: "firstName lastName email role",
    })
    .populate({ path: "category", select: "categoryName" })

    // ---- Revision Populations ----
    .populate({
      path: "acceptedArchitectRevisions.revisionCreatedBy",
      select: "firstName lastName email role",
    })
    .populate({
      path: "acceptedRORevisions.revisionCreatedBy",
      select: "firstName lastName email role",
    })
    .populate({
      path: "acceptedSiteHeadRevisions.revisionCreatedBy",
      select: "firstName lastName email role",
    })
    .populate({
      path: "acceptedSiteRevisions.revisionCreatedBy",
      select: "firstName lastName email role",
    })
    .populate({
      path: "acceptedROHardCopyRevisions.revisionCreatedBy",
      select: "firstName lastName email role",
    })
    .populate({
      path: "acceptedSiteHeadHardCopyRevisions.revisionCreatedBy",
      select: "firstName lastName email role",
    })

    // ---- History ----
    .populate({
      path: "history.updatedBy",
      select: "firstName lastName email role",
    })
    .lean();

  if (!registers || registers.length === 0) {
    return res.status(404).json({
      status: "fail",
      message: "No registers found for the given filters",
    });
  }

  // Sort history latest → oldest
  registers.forEach((reg) => {
    reg.history = reg.history?.sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
    );

    // Add previousFields and modifiedFields to each history entry
    if (reg.history && reg.history.length > 0) {
      reg.history = reg.history.map((historyEntry, index) => {
        const modifiedFields = historyEntry.updatedFields || {};
        const previousFields = {};

        // For each field that was modified in this entry, find its previous value
        Object.keys(modifiedFields).forEach((field) => {
          let previousValue = null;

          // Look in older history entries (indices > index) to find the last time this field was changed
          // The value in the most recent older entry that changed this field is the previous value
          for (let i = index + 1; i < reg.history.length; i++) {
            const olderEntry = reg.history[i];
            const olderUpdatedFields = olderEntry.updatedFields || {};
            if (olderUpdatedFields.hasOwnProperty(field)) {
              previousValue = olderUpdatedFields[field];
              break; // Found the most recent older change to this field
            }
          }

          // If field wasn't found in older history entries, it means this was the first time it was changed
          // In this case, we can't determine the previous value from history alone
          // We'll leave it as null/undefined to indicate the previous value is unknown
          previousFields[field] =
            previousValue !== null ? previousValue : undefined;
        });

        return {
          ...historyEntry,
          previousFields,
          modifiedFields,
        };
      });
    }
  });

  return res.status(200).json({
    status: "success",
    results: registers.length,
    data: registers,
  });
});
// exports.getRegistersBySiteAndConsultant = catchAsync(async (req, res, next) => {
//   const { siteId, consultantId } = req.query;
//   const userId = req.user.id;
//   const userRole = req.user.role;

//   // ---- Validate required siteId ----
//   if (!siteId) {
//     return next(new AppError("siteId is required.", 400));
//   }

//   // ---- Create dynamic filter ----
//   const filter = { siteId };

//   // ---- Role-based filtering ----
//   // If logged-in user is Design Consultant, show only their drawings
//   // Otherwise, show all drawings (ignore consultantId filter)
//   if (userRole === "Design Consultant") {
//     // Design Consultant can only see their own drawings
//     filter.designDrawingConsultant = userId;
//   } else {
//     // For other roles, show all drawings (don't filter by consultantId)
//     // consultantId query parameter is ignored for non-Design Consultant roles
//   }

//   const registers = await ArchitectureToRoRegister.find(filter)
//     .populate({ path: "siteId", select: "siteName siteCode" })
//     .populate({ path: "companyId", select: "companyName companyKeyWord" })
//     .populate({ path: "folderId", select: "folderName" })
//     .populate({
//       path: "designDrawingConsultant",
//       select: "firstName lastName email role",
//     })
//     .populate({ path: "category", select: "categoryName" })

//     // ---- Revision Populations ----
//     .populate({
//       path: "acceptedArchitectRevisions.revisionCreatedBy",
//       select: "firstName lastName email role",
//     })
//     .populate({
//       path: "acceptedRORevisions.revisionCreatedBy",
//       select: "firstName lastName email role",
//     })
//     .populate({
//       path: "acceptedSiteHeadRevisions.revisionCreatedBy",
//       select: "firstName lastName email role",
//     })
//     .populate({
//       path: "acceptedSiteRevisions.revisionCreatedBy",
//       select: "firstName lastName email role",
//     })
//     .populate({
//       path: "acceptedROHardCopyRevisions.revisionCreatedBy",
//       select: "firstName lastName email role",
//     })
//     .populate({
//       path: "acceptedSiteHeadHardCopyRevisions.revisionCreatedBy",
//       select: "firstName lastName email role",
//     })

//     // ---- History ----
//     .populate({
//       path: "history.updatedBy",
//       select: "firstName lastName email role",
//     })
//     .lean();

//   if (!registers || registers.length === 0) {
//     return res.status(404).json({
//       status: "fail",
//       message: "No registers found for the given filters",
//     });
//   }

//   // Sort history latest → oldest
//   registers.forEach((reg) => {
//     reg.history = reg.history?.sort(
//       (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
//     );

//     // Add previousFields and modifiedFields to each history entry
//     if (reg.history && reg.history.length > 0) {
//       reg.history = reg.history.map((historyEntry, index) => {
//         const modifiedFields = historyEntry.updatedFields || {};
//         const previousFields = {};

//         // For each field that was modified in this entry, find its previous value
//         Object.keys(modifiedFields).forEach((field) => {
//           let previousValue = null;

//           // Look in older history entries (indices > index) to find the last time this field was changed
//           // The value in the most recent older entry that changed this field is the previous value
//           for (let i = index + 1; i < reg.history.length; i++) {
//             const olderEntry = reg.history[i];
//             const olderUpdatedFields = olderEntry.updatedFields || {};
//             if (olderUpdatedFields.hasOwnProperty(field)) {
//               previousValue = olderUpdatedFields[field];
//               break; // Found the most recent older change to this field
//             }
//           }

//           // If field wasn't found in older history entries, it means this was the first time it was changed
//           // In this case, we can't determine the previous value from history alone
//           // We'll leave it as null/undefined to indicate the previous value is unknown
//           previousFields[field] = previousValue !== null ? previousValue : undefined;
//         });

//         return {
//           ...historyEntry,
//           previousFields,
//           modifiedFields,
//         };
//       });
//     }
//   });

//   return res.status(200).json({
//     status: "success",
//     results: registers.length,
//     data: registers,
//   });
// });
