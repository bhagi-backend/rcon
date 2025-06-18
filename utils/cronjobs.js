// cronJobs.js
const cron = require('node-cron');
const Task = require("../models/taskModel");
const Notification = require("../models/notificationModel"); 

function scheduleTaskStatusUpdate() {
  cron.schedule('30 2 * * *', async () => {  
    try {
      console.log('Running the cron job to update newPnmTaskStatus...');

      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Update tasks where `newPnmTaskStatus` is "ToDo" and `assignedDate` is more than 24 hours old
      const updatedTasks = await Task.updateMany(
        {
          'assignnewPnmTasksForUser.newPnmTaskStatus': 'ToDo',
          'assignnewPnmTasksForUser.assignedDate': { $lt: twentyFourHoursAgo }
        },
        {
          $set: { 'assignnewPnmTasksForUser.$[elem].newPnmTaskStatus': 'Delayed' }
        },
        {
          arrayFilters: [{ 'elem.newPnmTaskStatus': 'ToDo', 'elem.assignedDate': { $lt: twentyFourHoursAgo } }]
        }
      );

      console.log(`${updatedTasks.modifiedCount} tasks were updated to "Delayed" status.`);
    } catch (error) {
      console.error('Error running the cron job:', error);
    }
  });
}

function scheduleNotificationCleanup() {
  // Schedule the cron job to run every day at midnight (0 0 * * *)
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log('Running the cron job to delete old notifications...');

      // Get today's date and subtract 15 days
      const now = new Date();
      const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

      // Delete notifications where the createdDate is more than 15 days ago
      const result = await Notification.deleteMany({
        createdDate: { $lt: fifteenDaysAgo }
      });

      console.log(`${result.deletedCount} old notifications were deleted.`);
    } catch (error) {
      console.error('Error running the cron job for notification cleanup:', error);
    }
  });
}

module.exports = { scheduleNotificationCleanup ,scheduleTaskStatusUpdate};