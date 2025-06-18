const express = require("express");
const Router = express.Router();
const checklistSubmitController = require("../controllers/checklistSubmitController");
const authController = require("../controllers/authController");

Router.post(
  "/formSubmit",
  authController.protect,
  checklistSubmitController.createOne
);

Router.get("/AllFormsSumitted", checklistSubmitController.getAll);
Router.patch(
  "/update/:id",
  authController.protect,
  checklistSubmitController.updateOne
);
Router.get("/fetchApproved", checklistSubmitController.fetchApproved);
module.exports = Router;
