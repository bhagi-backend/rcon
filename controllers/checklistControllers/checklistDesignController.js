const ChecklistDesign = require('../../models/checklistModels/checklistDesignModel');
const Activity = require('../../models/checklistModels/activityModel');
const User = require("../../models/userModel");
const express = require("express");
const AppError = require("../../utils/appError");
const catchAsync = require("../../utils/catchAsync").catchAsync;
const sendNotification = require("../../utils/utilFun");
const ChecklistWorkFlow= require('../../models/checklistModels/checklistWorkFlowModel');
// Function to generate formNo
const generateFormNo = (department, checklistType, statusType, activityNo) => {
    
    const hasAdmin = department.includes("Admin");
    const otherDepartments = department.filter(dep => dep !== "Admin");
    let formNo = '';
    if (hasAdmin) {
        formNo += 'AN-';
    }
    if (otherDepartments.length > 0) {
        formNo += `${otherDepartments.join('-')}/`;
    } else {
        formNo += '/'; 
    }
    if (checklistType === "Checklist") {
        let statusCode = '';
        if (statusType === "After") {
            statusCode = 'A';
        } else if (statusType === "Before") {
            statusCode = 'B';
        } else if (statusType === "During") {
            statusCode = 'D';
        } else if (statusType === "Testing") {
            statusCode = 'T';
        }
        formNo += `CL-${statusCode}`;
    } else if (checklistType === "Permits") {
        formNo += 'PS';
    } else if (checklistType === "Inspection") {
        formNo += 'IP';
    }
    formNo += `/${activityNo}`;
    return formNo;
};

exports.createChecklistDesign = catchAsync(async (req, res, next) => {
    const { activity, department, checklistType, statusType } = req.body;
    const userId =  req.user.id;
    const user = await User.findById(userId);
    if (!user) {
        return next(new AppError("User not found", 404));
    }
    const companyId = user.companyId;


    if (checklistType === "Checklist" && !statusType) {
        return next(new AppError("statusType is required when checklistType is 'Checklist'", 400));
    }
    const activityData = await Activity.findById(activity);
    if (!activityData) {
        return next(new AppError("Activity not found", 404));
    }
    const activityNo = activityData.aNo; 

    const formNo = generateFormNo(department, checklistType, statusType, activityNo);
    const existingChecklist = await ChecklistDesign.findOne({ formNo });
    if (existingChecklist) {
        return res.status(200).json({
            error: `Checklist design already exists`
        });
    }
    const revisions = req.body.revisions && req.body.revisions.length > 0
    ? req.body.revisions
    : [{ revision: "R0", approvalStatus: "Ongoing" }];

    const newChecklistDesign = new ChecklistDesign({
        companyId,
        activity,
        department,
        checklistType,
        statusType,
        description: req.body.description || [], 
        formNo,
        revisions, 
        createdBy: userId, 
        createdDate: Date.now(),
    });
    const savedChecklistDesign = await newChecklistDesign.save();

    res.status(200).json({
        status: 'success',
        data: savedChecklistDesign
    });
});

exports.updateChecklistDesign = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { activity, department, checklistType, statusType, assigningIncharge,descriptionDetails } = req.body;

    const checklistDesign = await ChecklistDesign.findById(id);
    if (!checklistDesign) {
        return next(new AppError("Checklist Design not found", 404));
    }
    
    if (checklistType === "Checklist" && !statusType) {
        return next(new AppError("statusType is required when checklistType is 'Checklist'", 400));
    }

    // If activity is updated, validate the new activity
    let activityNo;
    if (activity && activity !== checklistDesign.activity.toString()) {
        const activityData = await Activity.findById(activity);
        if (!activityData) {
            return next(new AppError("Activity not found", 404));
        }
        activityNo = activityData.aNo;
    } else {
        const activityData = await Activity.findById(checklistDesign.activity);
        activityNo = activityData.aNo;
    }

    const updatedFormNo = generateFormNo(
        department || checklistDesign.department,
        checklistType || checklistDesign.checklistType,
        statusType || checklistDesign.statusType,
        activityNo
    );

   
    checklistDesign.activity = activity || checklistDesign.activity;
    checklistDesign.department = department || checklistDesign.department;
    checklistDesign.checklistType = checklistType || checklistDesign.checklistType;
    checklistDesign.statusType = statusType || checklistDesign.statusType;
    checklistDesign.formNo = updatedFormNo;

    if (descriptionDetails) {
        const existingDescriptions = checklistDesign.descriptionDetails || [];
        
        const nextDNoStart = existingDescriptions.length + 1;

        descriptionDetails.forEach((desc, index) => {
            const dNo = nextDNoStart + index;
            desc.dNo = dNo.toString().padStart(3, '0'); 
        });
        checklistDesign.descriptionDetails = [...existingDescriptions, ...descriptionDetails];
    }
    if (assigningIncharge) {
        const existingIncharges = checklistDesign.assigningIncharge || [];
        const nextRoleIndex = existingIncharges.length + 1;
        assigningIncharge.forEach((incharge, index) => {
           
            incharge.roleIndex = nextRoleIndex + index; 
        });
        checklistDesign.assigningIncharge = [...existingIncharges, ...assigningIncharge];
    }

    const updatedChecklistDesign = await checklistDesign.save();

    res.status(200).json({
        status: 'success',
        data: updatedChecklistDesign
    });
});


exports.getUsersByDepartment = catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
        return res.status(404).json({
            status: "fail",
            message: "User not found"
        });
    }

    const companyId = user.companyId; // Extract companyId from the logged-in user

    const { department } = req.query;  // Get department from query parameters

    if (!department) {
        return res.status(400).json({
            status: "fail",
            message: "Please provide a department"
        });
    }

    // Find users by both companyId and department
    const users = await User.find({ companyId, department });

    if (users.length === 0) {
        return res.status(400).json({
            status: "fail",
            message: "No users found in this department"
        });
    }

    res.status(200).json({
        status: "success",
        results: users.length,
        data: {
            users
        }
    });
});

exports.updateApprovalStatus = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { approvalStatus, reDoReason, rejectReason } = req.body;
    const userId = req.user.id;

    const checklistDesign = await ChecklistDesign.findById(id);
    if (!checklistDesign) {
        return next(new AppError('Checklist Design not found', 404));
    }

    if (checklistDesign.revisions.length === 0) {
        return next(new AppError('No revisions found to update', 404));
    }

    const latestRevision = checklistDesign.revisions[checklistDesign.revisions.length - 1];
    latestRevision.approvalStatus = approvalStatus;

    let notifications = [];  

    if (approvalStatus === 'Requesting') {
        latestRevision.requestedBy = userId;
        latestRevision.requestedDate = Date.now();
        const requestingUser = await User.findById(userId);
        if (!requestingUser) {
            return next(new AppError('Requesting user not found', 404));
        }
        // const departmentHead = await User.findOne({ 
        //     department: requestingUser.department, 
        //     role: 'Head' 
        // });

        // if (departmentHead) {
        //     const formNo = checklistDesign.formNo;
        //     const notification = await sendNotification(
        //         'Checklist', 
        //         `A new request for checklist design (Form No: ${formNo}) has been made. Please review it.`,
        //         'New Checklist Design Request', 
        //         'Requesting', 
        //         departmentHead._id
        //     );

        //     notifications.push(notification); 
        
        const formNo = checklistDesign.formNo;

        const workflow = await ChecklistWorkFlow.findOne({ companyId: checklistDesign.companyId });
        if (!workflow) {
            return next(new AppError('Checklist workflow not found for the company', 404));
        }
        const firstLevel = workflow.levelsInfo.find(level => level.level === 'L1');
        if (!firstLevel || !firstLevel.user) {
            return next(new AppError('No user found for the first level in the workflow', 404));
        }

        const firstLevelUser = await User.findById(firstLevel.user);
        if (!firstLevelUser) {
            return next(new AppError('First level user not found', 404));
        }

        // Send a notification to the first level user
        const notification = await sendNotification(
            'Checklist',
            `A new request for checklist design (Form No: ${formNo}) has been made. Please review it.`,
            'New Checklist Design Request',
            'Requesting',
            firstLevelUser._id
        );
        notifications.push(notification);

        // Assign the checklist to the first level user
        firstLevelUser.assignChecklistForUser.push({
            assignChecklist: checklistDesign._id,
            assignedDate: Date.now()
        });
        await firstLevelUser.save();
    }

    else if (approvalStatus === 'Redo') {
        if (!reDoReason) {
            return next(new AppError('reDoReason is required when approvalStatus is Redo', 400));
        }
        latestRevision.reDoReason.push(reDoReason);
        const createdBy = checklistDesign.createdBy;
        if (createdBy) {
            const formNo = checklistDesign.formNo;
            const notification = await sendNotification(
                'Checklist',
                `The checklist design (Form No: ${formNo}) requires redo. Reason: ${reDoReason}`,
                'Checklist Design Redo Required',
                'Redo',
                createdBy
            );
            notifications.push(notification); 
        }

    } else if (approvalStatus === 'Rejected') {
        if (!rejectReason) {
            return next(new AppError('rejectReason is required when approvalStatus is Rejected', 400));
        }
        latestRevision.rejectReason.push(rejectReason);

        const createdBy = checklistDesign.createdBy;
        if (createdBy) {
            const formNo = checklistDesign.formNo;
            const notification = await sendNotification(
                'Checklist',
                `The checklist design (Form No: ${formNo}) has been rejected. Reason: ${rejectReason}`,
                'Checklist Design Rejected',
                'Rejected',
                createdBy
            );
            notifications.push(notification); 
        }

    } else if (approvalStatus === 'Approved') {
        latestRevision.approvedBy = userId;
        latestRevision.approvedDate = Date.now();
        const createdBy = checklistDesign.createdBy;
        if (createdBy) {
            const formNo = checklistDesign.formNo;
            const notification = await sendNotification(
                'Checklist',
                `The checklist design (Form No: ${formNo}) has been approved.`,
                'Checklist Design Approved',
                'Approved',
                createdBy
            );
            notifications.push(notification); 
        }
    }

    const updatedChecklistDesign = await checklistDesign.save();

    res.status(200).json({
        status: 'success',
        data: updatedChecklistDesign,
        notifications  
    });
});

exports.updateRevision = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { approvalStatus, requestedBy, reDoReason, rejectReason } = req.body;

    const checklistDesign = await ChecklistDesign.findById(id);
    if (!checklistDesign) {
        return next(new AppError('Checklist Design not found', 404));
    }

    const latestRevision = checklistDesign.revisions[checklistDesign.revisions.length - 1];
    let newRevisionNumber;

    if (latestRevision) {
        const currentRevision = latestRevision.revision;
        const revisionNumber = parseInt(currentRevision.slice(1)); 
        newRevisionNumber = `R${revisionNumber + 1}`; 
    } else {
       
        newRevisionNumber = "R0";
    }

    const newRevision = {
        revision: newRevisionNumber,
        approvalStatus: approvalStatus || "Ongoing", 
        requestedBy: approvalStatus === "Requesting" ? requestedBy : null,
        requestedDate: approvalStatus === "Requesting" ? Date.now() : null,
        approvedBy: approvalStatus === "Approved" ? requestedBy : null,
        approvedDate: approvalStatus === "Approved" ? Date.now() : null,
        rejectReason: approvalStatus === "Rejected" ? [rejectReason] : [],
        reDoReason: approvalStatus === "Redo" ? [reDoReason] : [],
    };

    checklistDesign.revisions.push(newRevision);
    const updatedChecklistDesign = await checklistDesign.save();
    res.status(200).json({
        status: 'success',
        data: updatedChecklistDesign
    });
});
exports.getChecklistDesignsByCompanyId = catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    console.log(`userId: ${userId}`);

    const user = await User.findById(userId).exec();

    if (!user) {
        return res.status(404).json({
            status: "fail",
            message: "User not found",
        });
    }
    
    const companyId = user.companyId;

    // Fetch only the checklist designs created by the logged-in user
    const checklistDesigns = await ChecklistDesign.find({ 
        companyId, 
        createdBy: userId 
    })
    .populate("activity")
    .populate("revisions.requestedBy")
    .populate("revisions.approvedBy")
    .populate('companyId')
    .populate('sharedTo');

    if (!checklistDesigns.length) {
        return next(new AppError("No Checklist Designs found for this user", 404));
    }

    res.status(200).json({
        status: 'success',
        data: checklistDesigns
    });
});

exports.updateDescriptionByDNo = catchAsync(async (req, res, next) => {
    const { id, dNo } = req.params; 
    const { image, inputType, mandatoryOrNot, Remarks } = req.body;

    const checklistDesign = await ChecklistDesign.findById(id);
    if (!checklistDesign) {
        return next(new AppError("Checklist Design not found", 404));
    }
    const description = checklistDesign.descriptionDetails.find(desc => desc.dNo === dNo);
    if (!description) {
        return next(new AppError(`Description with dNo ${dNo} not found`, 404));
    }
    if (image) {
        description.image = image;
    }
    if (inputType) {
        description.inputType = inputType;
    }
    if (mandatoryOrNot) {
        description.mandatoryOrNot = mandatoryOrNot;
    }
    if (Remarks) {
        description.Remarks = Remarks;
    }
    await checklistDesign.save();

    res.status(200).json({
        status: 'success',
        data: checklistDesign
    });
});
exports.deleteDescriptionByDNo = catchAsync(async (req, res, next) => {
    const { id, dNo } = req.params;
    const checklistDesign = await ChecklistDesign.findById(id);
    if (!checklistDesign) {
        return next(new AppError("Checklist Design not found", 404));
    }
    const descriptionIndex = checklistDesign.descriptionDetails.findIndex(desc => desc.dNo === dNo);
    if (descriptionIndex === -1) {
        return next(new AppError(`Description with dNo ${dNo} not found`, 404));
    }
    checklistDesign.descriptionDetails.splice(descriptionIndex, 1);
    await checklistDesign.save();
    res.status(200).json({
        status: 'success',
        message: `Description with dNo ${dNo} has been deleted successfully.`,
        data: checklistDesign
    });
});

exports.deleteChecklistDesignById = catchAsync(async (req, res, next) => {
    const { id } = req.params; 
    const checklistDesign = await ChecklistDesign.findByIdAndDelete(id);
    if (!checklistDesign) {
        return next(new AppError("Checklist Design not found", 404));
    }
    res.status(200).json({
        status: 'success',
        message: `Checklist Design with ID ${id} has been deleted successfully.`,
        data: null
    });
});
exports.getApprovedChecklists = catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const user = await User.findById(userId).exec();

    if (!user) {
        return res.status(404).json({
            status: "fail",
            message: "User not found",
        });
    }

    const companyId = user.companyId;
    const checklistDesigns = await ChecklistDesign.find({ companyId })
        .populate({
            path: 'companyId',
            select: 'companyDetails.companyName', 
        })
        .populate("activity") 
        .populate({
            path: 'revisions.approvedBy',
            select: 'firstName lastName role', 
          })
        .populate({
            path: 'revisions.requestedBy',
            select: 'firstName lastName role',
          });
 
    const approvedChecklistDesigns = checklistDesigns.filter(checklist =>
        checklist.revisions.some(revision => revision.approvalStatus === "Approved")
    );

    if (!approvedChecklistDesigns.length) {
        return next(new AppError("No approved Checklist Designs found for this companyId", 404));
    }

  
    const departmentActivities = [];

    approvedChecklistDesigns.forEach(checklist => {
        const activityName = checklist.activity?.activity || "Unknown"; 
        const checklistType = checklist.checklistType || "Unknown"; 
        checklist.department.forEach(departmentName => {
            let departmentEntry = departmentActivities.find(dep => dep.department === departmentName);
            if (!departmentEntry) {
                departmentEntry = { department: departmentName, activities: [] };
                departmentActivities.push(departmentEntry);
            }
            let activityEntry = departmentEntry.activities.find(activity => activity.name === activityName);
            if (!activityEntry) {
                activityEntry = {
                    name: activityName,
                    count: 0,
                    totalChecklistCount: 0,
                    typesOfChecklist: {},
                    checklists: []
                };
                departmentEntry.activities.push(activityEntry);
            }
            activityEntry.count++;
            activityEntry.checklists.push(checklist); 
            if (!activityEntry.typesOfChecklist[checklistType]) {
                activityEntry.typesOfChecklist[checklistType] = 0; 
            }
            activityEntry.typesOfChecklist[checklistType]++;
            activityEntry.totalChecklistCount++;
        });
    });
    const uniqueDepartmentActivities = [];
    
    departmentActivities.forEach(department => {
        department.activities.forEach(activity => {
            uniqueDepartmentActivities.push({
                department: department.department,
                activity: activity
            });
        });
    });
    res.status(200).json({
        status: "success",
        data: uniqueDepartmentActivities,
    });
});
exports.updateSharedTo = catchAsync(async (req, res, next) => {
    const { checklistId } = req.params; 
    const { userId } = req.body; 

    if (!userId) {
        return next(new AppError('userId is required to update sharedTo field', 400));
    }

    const checklist = await ChecklistDesign.findById(checklistId);
    if (!checklist) {
        return next(new AppError('ChecklistDesign not found', 404));
    }

    // Check if the user is already in the sharedTo list
    const isUserAlreadyShared = checklist.sharedTo.some(
        (id) => id.toString() === userId
    );

    // Add user to sharedTo only if not already present
    if (!isUserAlreadyShared) {
        checklist.sharedTo.push(userId);

        // Save the updated checklist
        const updatedChecklist = await checklist.save();

        // Find the user and add the checklist to their sharedChecklists
        const user = await User.findById(userId);
        if (!user) {
            return next(new AppError('User not found', 404));
        }

        // Add the checklist to the user's sharedChecklist
        user.sharedChecklist.push({
            sharedChecklist: checklistId,
            sharedDate: new Date()
        });

        // Save the updated user data
        await user.save();

        // Send a notification for the new addition
        const formNo = updatedChecklist.formNo;
        const notification = await sendNotification(
            'Checklist', 
            `You have been added to the shared list for the checklist design (Form No: ${formNo}). Please review it at your convenience.`,
            'Checklist Design Shared', 
            'Shared', 
            userId 
        );

        res.status(200).json({
            status: 'success',
            data: {
                checklist: updatedChecklist,
                user,
                notification
            }
        });
    } else {
        // If the user is already in the list, just return a response without changing data
        res.status(200).json({
            status: 'success',
            message: 'User is already in the sharedTo list',
            data: {
                checklist
            }
        });
    }
});

exports.getPnmDepartmentChecklistDesigns = catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    console.log(`userId: ${userId}`);

    const user = await User.findById(userId).exec();
    if (!user) {
        return res.status(404).json({
            status: "fail",
            message: "User not found",
        });
    }

    const companyId = user.companyId;

    const checklistDesigns = await ChecklistDesign.find({
        companyId,
        department: "PNM"
    })
    .populate("activity", "activity") 
    .exec();

    if (!checklistDesigns.length) {
        return next(new AppError("No Checklist Designs found for this user with PNM department", 400));
    }

    res.status(200).json({
        status: 'success',
        data: checklistDesigns,
    });
});

exports.deleteAssignInchargeById = catchAsync(async (req, res, next) => {
    const { checklistId, inchargeId } = req.params;

    const updatedChecklist = await ChecklistDesign.findByIdAndUpdate(
      checklistId,
      {
        $pull: {
          assigningIncharge: { _id: inchargeId },
        },
      },
      { new: true }
    );

    if (!updatedChecklist) {
      return res.status(400).json({ message: "ChecklistDesign or assigningIncharge not found" });
    }

    res.status(200).json({
      message: "assigningIncharge removed successfully",
      data: updatedChecklist,
    });
});


exports.getChecklistDesignById = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const checklistDesign = await ChecklistDesign.findById(id)
    .populate({ 
        path: 'activity', 
        select: 'activity' 
    })

    if (!checklistDesign) {
        return next(new AppError("Checklist Design not found", 404));
    }

    // Send the response
    res.status(200).json({
        status: "success",
        data: { checklistDesign },
    });
});