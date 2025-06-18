const express = require("express");
const Router = express.Router();
const machineController = require("../controllers/machineryController");
const authController = require("../controllers/authController");

Router.route("/")
  .get(machineController.getAllMachinery)
  .post(machineController.createMachinery);

Router.route("/:id").get(machineController.getMachine);
module.exports = Router;
