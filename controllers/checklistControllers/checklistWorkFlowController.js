const ChecklistWorkFlow= require('../../models/checklistModels/checklistWorkFlowModel');
const User = require("../../models/userModel");
const express = require("express");
const AppError = require("../../utils/appError");
const catchAsync = require("../../utils/catchAsync").catchAsync;

exports.createChecklistWorkFlow = catchAsync(async (req, res, next) => {
    const userId =  req.user.id;
    const user = await User.findById(userId);
    if (!user) {
        return next(new AppError("User not found", 404));
    }
    const companyId = user.companyId;
    req.body.companyId = companyId;
    const newChecklistWorkFlow = await ChecklistWorkFlow.create(req.body);
   
    res.status(201).json({
      status: "success",
      data: {
        checklistWorkFlow: newChecklistWorkFlow,
      },
    });
  });


  exports.updateChecklistWorkFlow = catchAsync(async (req, res, next) => {
    const { id } = req.params;
  
    const updatedChecklistWorkFlow = await ChecklistWorkFlow.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    }).populate({
        path: 'levelsInfo.user',
        select: 'firstName',
      });
  
    if (!updatedChecklistWorkFlow) {
      return next(new AppError("Checklist Workflow not found", 404));
    }
  
    res.status(200).json({
      status: "success",
      data: {
        checklistWorkFlow: updatedChecklistWorkFlow,
      },
    });
  });

  exports.getAllChecklistWorkFlows = catchAsync(async (req, res, next) => {
    // Get the companyId from the logged-in user
    const userId = req.user.id;
    const user = await User.findById(userId);
  
    if (!user) {
      return next(new AppError("User not found", 404));
    }
  
    const companyId = user.companyId;
  
    // Fetch all checklist workflows for the user's companyId
    const checklistWorkFlows = await ChecklistWorkFlow.find({ companyId })
    .populate({
        path: 'levelsInfo.user',
        select: 'firstName',
      });
  
    res.status(200).json({
      status: "success",
      results: checklistWorkFlows.length,
      data: {
        checklistWorkFlows,
      },
    });
  });
  
  exports.getUsersByDepartmentAndRole = catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({
            status: "fail",
            message: "User not found"
        });
    }
    const companyId = user.companyId; 
    const { department, role } = req.query; 
    if (!department) {
        return res.status(400).json({
            status: "fail",
            message: "Please provide a department"
        });
    }
    const query = { companyId, department, role };
    const users = await User.find(query);

    if (users.length === 0) {
        return res.status(400).json({
            status: "fail",
            message: "No users found for the specified department and role"
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
