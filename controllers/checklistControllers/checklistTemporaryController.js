const ChecklistTemporary= require('../../models/checklistModels/checklistTemporaryModel');
const User = require("../../models/userModel");
const express = require("express");
const AppError = require("../../utils/appError");
const catchAsync = require("../../utils/catchAsync").catchAsync;

exports.createChecklistTemporary = catchAsync(async (req, res, next) => {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
        return next(new AppError("User not found", 404));
    }

    const companyId = user.companyId;
    const createdBy = userId; 
    req.body.companyId = companyId;

    const checklist = await ChecklistTemporary.create({
        ...req.body,
        createdBy,
    });
    const allocateUserId = req.body.allocateUser; 

    const allocateUser = await User.findById(allocateUserId);
    if (!allocateUser) {
        return next(new AppError("Allocated user not found", 404));
    }

    if (req.body.assignedChecklists && Array.isArray(req.body.assignedChecklists)) {
       
        for (const checklistId of req.body.assignedChecklists) {
          
            allocateUser.assignChecklistForUser.push({
                assignChecklist: checklistId, 
                assignedDate: Date.now() 
            });
        }
    }
    await allocateUser.save();

    res.status(201).json({
        status: "success",
        data: {
            checklist,
        },
    });
});

  
  
  exports.getAllChecklistTemporary = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const user = await User.findById(userId);
  
    if (!user) {
      return next(new AppError("User not found", 404));
    }
  
    const companyId = user.companyId;
  
    const checklists = await ChecklistTemporary.find({ companyId })
      .populate({
        path: "companyId",
        select: "companyName", 
      })
      .populate({
        path: "user",
        select: "firstName", 
      })
      .populate({
        path: "allocateUser",
        select: "firstName", 
      })
      .populate({
        path: "createdBy",
        select: "firstName", 
      });
  
    res.status(200).json({
      status: "success",
      results: checklists.length,
      data: {
        checklists,
      },
    });
  });
  exports.updateChecklistTemporary = catchAsync(async (req, res) => {
    const checklist = await ChecklistTemporary.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    )
      .populate({
        path: "companyId",
        select: "companyName", 
      })
      .populate({
        path: "user",
        select: "firstName", 
      })
      .populate({
        path: "allocateUser",
        select: "firstName", 
      })
      .populate({
        path: "createdBy",
        select: "firstName", 
      });
  
    if (!checklist) {
      return res.status(404).json({
        status: "fail",
        message: "No checklist found with that ID",
      });
    }
  
    res.status(200).json({
      status: "success",
      data: {
        checklist,
      },
    });
  });
  exports.getUsersByDepartmentAndAssignedDate = async (req, res) => {
    try {
        const { fromDate, toDate } = req.query;

        const userId = req.params.id; 

        const companyId = req.user.companyId;

        let userFilter = { companyId, _id: userId }; 

        let dateFilter = {};
        let adjustedToDate; 
        if (fromDate && toDate) {
          
            adjustedToDate = new Date(toDate);
            adjustedToDate.setDate(adjustedToDate.getDate() + 1);

            dateFilter = {
                $gte: new Date(fromDate),
                $lte: adjustedToDate, 
            };
        }
        const users = await User.find(userFilter).populate({
            path: 'assignChecklistForUser.assignChecklist',
            model: 'ChecklistDesign', 
            match: fromDate && toDate ? { 'assignChecklistForUser.assignedDate': dateFilter } : {}, 
        });
        const filteredUsers = users.map(user => {
            const filteredChecklists = user.assignChecklistForUser.filter(checklist => {
                if (fromDate && toDate) {
                    return checklist.assignedDate >= new Date(fromDate) && checklist.assignedDate <= adjustedToDate; // Use the adjusted toDate
                }
                return true; 
            });

            return {
                //...user.toObject(), 
                assignChecklistForUser: filteredChecklists,
            };
        }).filter(user => user.assignChecklistForUser.length > 0);

        res.status(200).json({
            status: "success",
            results: filteredUsers.length,
            data: {
                user: filteredUsers,
            },
        });
    } catch (err) {
        res.status(400).json({
            status: "error",
            message: "Something went wrong",
            error: err.message,
        });
    }
};
