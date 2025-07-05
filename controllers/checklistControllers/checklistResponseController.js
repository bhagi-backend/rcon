const ChecklistResponse = require('../../models/checklistModels/checklistResponseModel');
const NewPnm = require('../../models/pnmModels/newPnmModel');
const AssetCode = require('../../models/pnmModels/assetCodeModel');
const Task = require('../../models/taskModel'); 
const express = require("express");
const AppError = require("../../utils/appError");
const catchAsync = require("../../utils/catchAsync").catchAsync;
const mongoose = require('mongoose');
const path = require("path");
const fs = require("fs");
const SharpProcessor = require("../../utils/sharps");
const PdfProcessor = require("../../utils/pdfCompress");
const  getUploadPath  = require("../../utils/pathFun");
const multerWrapper = require('../../utils/multerFun');


const upload = multerWrapper();
exports.createChecklistResponse = catchAsync(async (req, res) => {
   
    const companyId = req.user.companyId; 
  
    const checklistResponse = await ChecklistResponse.create({
      checklistId: req.body.checklistId,
      companyId,
      siteId: req.body.siteId,
      descriptions: req.body.descriptions,
      createdBy: req.user._id, 
    });
  
    // Step 1: Fetch the `AssetCode` based on `formNo` (checklistId)
    const assetCode = await AssetCode.findOne({ formNo: req.body.checklistId });
    if (!assetCode) {
      return res.status(404).json({
        status: 'fail',
        message: 'AssetCode not found for the provided checklistId',
      });
    }
  
    // Step 2: Fetch the `NewPnm` based on `assetCode`
    const newPnm = await NewPnm.findOne({ assetCode: assetCode._id });
    console.log("newPnmId:",newPnm.id);
    if (!newPnm) {
      return res.status(404).json({
        status: 'fail',
        message: 'NewPnm not found for the provided assetCode',
      });
    }
  
    // Step 3: Update the `TaskModel` with the `checklistResponse` ID
    const updatedTask = await Task.findOneAndUpdate(
        { 
          "assignnewPnmTasksForUser.assignNewPnmTasks": new mongoose.Types.ObjectId(newPnm._id) 
        },
        {
          $set: {
            "assignnewPnmTasksForUser.$[elem].checklistResponse": checklistResponse._id,
          },
        },
        {
          new: true,
          arrayFilters: [{ "elem.assignNewPnmTasks": new mongoose.Types.ObjectId(newPnm._id) }],
        }
      );
  
    if (!updatedTask) {
      return res.status(404).json({
        status: 'fail',
        message: 'Task not found for the provided newPnmId',
      });
    }
  
    return res.status(201).json({
      status: 'success',
      data: {
        checklistResponse,
        updatedTask,
      },
    });
  });

 exports.updateChecklistResponse = catchAsync(async (req, res, next) => {
    const { checklistResponseId, descriptionId } = req.params;

    const { response, remarks, image } = req.body; 
    const checklistResponse = await ChecklistResponse.findById(checklistResponseId);
    if (!checklistResponse) {
        return next(new AppError('ChecklistResponse not found', 404));
    }
    const descriptionIndex = checklistResponse.descriptions.findIndex(desc => 
        desc.descriptionId.toString() === descriptionId
    );

    if (descriptionIndex === -1) {
        return next(new AppError('Description not found in the checklist response', 404));
    }
    if (response) checklistResponse.descriptions[descriptionIndex].response = response;
    if (remarks) checklistResponse.descriptions[descriptionIndex].remarks = remarks;
    if (image) checklistResponse.descriptions[descriptionIndex].image = image;

    await checklistResponse.save();
    const responses = checklistResponse.descriptions.map(desc => desc.response);

const hasNotApplicable = responses.includes("Not Applicable");
const hasNo = !hasNotApplicable && responses.includes("No"); 
const allYes = responses.every(response => response === "Yes");

let newPnmTaskStatus;
let reDoDate;

if (hasNotApplicable) {
    newPnmTaskStatus = "In Progress";
} else if (hasNo) {
    newPnmTaskStatus = "Redo";
    reDoDate= Date.now();
} else if (allYes) {
    newPnmTaskStatus = "In Progress";
}
let task;
if (newPnmTaskStatus) {
  task= await Task.findOneAndUpdate(
        { "assignnewPnmTasksForUser.checklistResponse": checklistResponseId }, 
        { 
          $set: { 
              "assignnewPnmTasksForUser.$.newPnmTaskStatus": newPnmTaskStatus,
              "assignnewPnmTasksForUser.$.reDoDate": reDoDate 
          } 
      }

    );
}

    res.status(200).json({
        status: 'success',
        data: {
            checklistResponse,
            task
        },
    });
});

exports.uploadImage = upload.single("image");

exports.updateImage = catchAsync(async (req, res, next) => {
  const { checklistResponseId, descriptionId } = req.params;
  const  companyId  = req.user.companyId;
  const checklistResponse = await ChecklistResponse.findById(checklistResponseId);
  if (!checklistResponse) {
    return next(new AppError("ChecklistResponse document not found", 404));
  }
  const descriptionIndex = checklistResponse.descriptions.findIndex(desc =>
    desc.descriptionId.toString() === descriptionId
  );

  if (descriptionIndex === -1) {
    return next(new AppError("Description not found in the checklist response", 404));
  }
  
  const file = req.file;
  const fileName = `${Date.now()}-${file.originalname}`;

  // Get paths for storing the file
  const { fullPath, relativePath,uploadToS3 } = getUploadPath(companyId, fileName, "checklistResponses/images",checklistResponse.siteId);

  // // Save image to disk
  // fs.writeFileSync(fullPath, file.buffer);
await uploadToS3(file.buffer, file.mimetype);
  // const sharpProcessor = new SharpProcessor(file.buffer, { format: path.extname(file.originalname).substring(1), quality: 70 });
  // const { originalSize, compressedSize } = await sharpProcessor.compressImage(fullPath);

  // console.log(`Original size: ${originalSize} bytes`);
  // console.log(`Compressed size: ${compressedSize} bytes`);
  // console.log(`Saved compressed image at: ${fullPath}`);

  checklistResponse.descriptions[descriptionIndex].image = relativePath;

  await checklistResponse.save();

  res.status(200).json({
    status: "success",
    data: {
      checklistResponse,
    },
  });
});


exports.addDescriptions = catchAsync(async (req, res) => {
    const { checklistResponseId } = req.params;
    const { newDescriptions } = req.body; 
  
    const checklistResponse = await ChecklistResponse.findById(checklistResponseId);
    if (!checklistResponse) {
      return res.status(404).json({ status: "fail", message: "ChecklistResponse document not found" });
    }
  
    if (!Array.isArray(newDescriptions) || newDescriptions.length === 0) {
      return res.status(400).json({ status: "fail", message: "New descriptions must be an array and cannot be empty" });
    }
    newDescriptions.forEach(newDesc => {
        const exists = checklistResponse.descriptions.some(existingDesc =>
            existingDesc.descriptionId.toString() === newDesc.descriptionId
        );
        if (exists) {
            return res.status(200).json({
                status: 'fail',
                message: `Description with ID ${newDesc.descriptionId} already exists.`,
            });
        }
        if (!exists) {
            checklistResponse.descriptions.push({
                descriptionId: newDesc.descriptionId,
                response: newDesc.response || "Not Applicable", 
                remarks: newDesc.remarks || "", 
                image: newDesc.image || "", 
            });
        }
    });
  
    await checklistResponse.save();
  
    res.status(200).json({
      status: "success",
      data: {
        checklistResponse,
      },
    });
  });

  exports.updateTaskStatusByChecklistResponseId= catchAsync(async (req, res, next) => {
    const { checklistResponseId } = req.params;
    const checklistResponse = await ChecklistResponse.findById(checklistResponseId);
    if (!checklistResponse) {
        return res.status(404).json({ status: 'fail', message: 'ChecklistResponse not found' });
    }
    // Check for "No" response
    const hasNoResponse = checklistResponse.descriptions.some(desc => desc.response === "No");
    

    const { department, role } = req.user; 
    const isQcHead = department === 'PNM' && role === 'QC Head';
    const isEngineer = department === 'PNM' && role === 'Engineer';

    if (!isQcHead && !isEngineer) {
        return res.status(200).json({ status: 'fail', message: 'Unauthorized: You do not have permission to update the status.' });
    }

    if (isQcHead) {
        if (hasNoResponse) {
            return res.status(200).json({ status: 'fail', message: 'Cannot update: one or more descriptions contain No' });
        }
     
        await Task.updateMany(
            { "assignnewPnmTasksForUser.checklistResponse": checklistResponseId },
            { $set: { "assignnewPnmTasksForUser.$.newPnmTaskStatus": "Completed" } }
        );
    }

    if (isEngineer) {
        
        await Task.updateMany(
            { "assignnewPnmTasksForUser.checklistResponse": checklistResponseId },
            { $set: { "assignnewPnmTasksForUser.$.newPnmTaskStatus": "Completed" } }
        );
    }

    res.status(200).json({
        status: 'success',
        data: {
            checklistResponse,
        },
    });
});
