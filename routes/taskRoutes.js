const express = require("express");
const Router = express.Router();
const TaskController = require("../controllers/taskController");
const authController = require("../controllers/authController");

Router.route("/")
// .get(TaskController.getAllTasks)
//   .post(TaskController.createTask);
// Router.route("/getTrackerDetails").get(TaskController.getTrackerDetails);
// Router.route("/getTrackerDetailsForFloor").get(TaskController.getTrackerDetailsForFloor);
// Router.route("/:id").get(TaskController.getTask);

// Router.route("/getTask/:id").get(TaskController.getTaskBySiteId);
// Router.route("/:taskId").put(TaskController.updateTask);
// Router.route("/userId/:userId").get(TaskController.getTaskByUserId);
Router.get("/user/:userId/siteId/:siteId", TaskController.getNewPnmTasksByStatus);
Router.get("/allNewPnmTasks/user/:userId/siteId/:siteId", TaskController.getallNewPnmTasks);

module.exports = Router;