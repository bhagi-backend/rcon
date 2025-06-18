const express = require("express");
const Router = express.Router();
const authController = require("../controllers/authController");
const notificationController = require('../controllers/notificationController');

// Route to get all notifications
Router.get('/',authController.protect, notificationController.getAllNotifications);
Router.route("/read/:id").put(notificationController.markNotificationAsRead);
// Router.get('/allNotification', notificationController.deleteNotifications);


module.exports = Router;
