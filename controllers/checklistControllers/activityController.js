const Activity = require('../../models/checklistModels/activityModel');
const ChecklistDesign = require('../../models/checklistModels/checklistDesignModel');
const express = require("express");
const AppError = require("../../utils/appError");
const User = require('../../models/userModel');
const catchAsync = require("../../utils/catchAsync").catchAsync;
exports.createActivities = catchAsync(async (req, res, next) => {
    const activitiesArray = req.body;
    const userId =  req.user.id;
    const user = await User.findById(userId);
    if (!user) {
        return next(new AppError("User not found", 404));
    }
    const companyId = user.companyId;


    if (!Array.isArray(activitiesArray)) {
        return res.status(400).json({ error: 'Request body should be an array' });
    }

    const savedActivities = [];

    // Find the highest existing aNo in the database to continue from
    const lastActivity = await Activity.findOne().sort({ aNo: -1 }).exec();
    let aNoCounter = lastActivity ? parseInt(lastActivity.aNo) + 1 : 1; // If no activity exists, start from 1

    for (let i = 0; i < activitiesArray.length; i++) {
        const { activity } = activitiesArray[i];

        const existingActivity = await Activity.findOne({ activity });
        if (existingActivity) {
            return res.status(200).json({
                error: `Activity name ${activity} already exists. Each activity name must be unique.`
            });
        }
        try {
            const aNo = String(aNoCounter).padStart(3, '0');
            const newActivity = new Activity({
                activity,
                aNo,
                companyId
            });
            const savedActivity = await newActivity.save();
            savedActivities.push(savedActivity);

            aNoCounter++;
        } catch (err) {
            console.error('Error saving activity:', err);
            return res.status(500).json({ error: 'Failed to save activity' });
        }
    }

    res.status(200).json({
        status: 'success',
        data: savedActivities
    });
});


// Get all planner categories
exports.getAllActivities = catchAsync(async (req, res, next) => {
const userId = req.user.id;
  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError("User not found", 404));
  }
  const companyId = user.companyId;
    const activities = await Activity.find({companyId});

    res.status(200).json({
        status: 'success',
        data: {
            activities,
        },
    });
});

exports.deleteActivity = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const isActivityInUse = await ChecklistDesign.findOne({ activity: id });

    if (isActivityInUse) {
        return res.status(200).json({
        error:'This activity is in use in a checklist design and cannot be deleted.'
    });
    }

    const activity = await Activity.findByIdAndDelete(id);

    if (!activity) {
        return next(new AppError('No activity found with that ID', 404));
    }

    res.status(204).json({
        status: 'success',
        data: null
    });
});
