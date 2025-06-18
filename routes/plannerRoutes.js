const express = require("express");
const Router = express.Router();
const plannerController = require("../controllers/plannerController");
const authController = require("../controllers/authController");
Router.route("/")
  .get(authController.protect, plannerController.getAllPlans)
  .post(authController.protect, plannerController.createPlan);

Router.route("/:id")
  .get(plannerController.getPlan)
  .patch(plannerController.update);
module.exports = Router;
