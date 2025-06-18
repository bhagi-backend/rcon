const Notification = require("../models/notificationModel");

async function sendNotification(department, message, subject, status, userId) {
  const notifications = [];

  const notification = new Notification({
    department: department || '',
    message: message || '',
    subject: subject || '',
    status: status || '',
    sentTo: userId,
    isRead: false,
  });

  try {
   // console.log("notify", notification);
    const savedNotification = await notification.save();
    notifications.push(savedNotification);
    return notifications; // Return the array of saved notifications
  } catch (error) {
    console.error("Error saving notification:", error);
    throw new Error('Failed to save notification');
  }
}

module.exports = sendNotification;
