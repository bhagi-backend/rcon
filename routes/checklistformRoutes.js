const express = require("express");
const Router = express.Router();
const checklistformController = require("../controllers/checklistformController");
const authController = require("../controllers/authController");

Router.post("/form", authController.protect, checklistformController.createOne);

Router.get("/AllForms", checklistformController.getAll);

Router.get("/form/:id", checklistformController.getFormById);

Router.put("/form/:id",  checklistformController.updateOne);

module.exports = Router;
