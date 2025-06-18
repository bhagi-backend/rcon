const express = require("express");
const Router = express.Router();
const DashBoardController = require("../../controllers/mobileControllers/dashBoardController");
const authController = require("../../controllers/authController");

Router.route("/")

Router.get("/",authController.protect, DashBoardController.getAllTasks);

module.exports = Router;