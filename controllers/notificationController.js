const Notification = require('../models/notificationModel');
const express = require("express");
const { query } = require("express");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync").catchAsync;

exports.getAllNotifications = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const notifications = await Notification.find({ sentTo: userId }).populate('sentTo');

  res.status(200).json({
      status: 'success',
      results: notifications.length,
      data: {
          notifications
      }
  });
});

exports.markNotificationAsRead = catchAsync(async (req, res, next) => {
    const { id } = req.params;
  
    if (!id) {
      return next(new AppError('Mail ID is missing', 400));
    }
  
    const notification = await Notification.findById(id);
  
    if (!notification) {
      return next(new AppError('No mail found with that ID', 404));
    }
  
    notification.isRead = true;
    await notification.save();
  
    res.status(200).json({
      status: 'success',
      data: {
        notification
      }
    });
  });
  exports.deleteNotifications = catchAsync(async (req, res, next) => {
    try {
      console.log('Running the notification cleanup process...');
  
      // Get today's date
      const now = new Date();
  
      // Delete notifications based on isRead status and creation date
      const result = await Notification.deleteMany({
        $or: [
          // For isRead = true, delete notifications older than 15 days
          {
            isRead: true,
            $expr: {
              $gt: [
                { $subtract: [now, "$createdDate"] },
                15 * 24 * 60 * 60 * 1000 // 15 days in milliseconds
              ]
            }
          },
          // For isRead = false, delete notifications older than 30 days
          {
            isRead: false,
            $expr: {
              $gt: [
                { $subtract: [now, "$createdDate"] },
                30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds
              ]
            }
          }
        ]
      });
  
      console.log(`${result.deletedCount} old notifications were deleted.`);
  
      // Return success response
      res.status(200).json({
        message: `${result.deletedCount} old notifications were deleted.`,
        deletedCount: result.deletedCount
      });
    } catch (error) {
      console.error('Error during notification cleanup:', error);
      res.status(400).json({
        message: 'Error occurred during notification cleanup.',
        error: error.message
      });
    }
  });
  