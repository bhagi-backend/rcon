const express = require("express");
const Router = express.Router();
const WorkSequenceController = require("../controllers/WorkSequenceController");
const authController = require("../controllers/authController");

Router.route("/")
.get(WorkSequenceController.getAllWorkSequence)
  .post(WorkSequenceController.createWorkSequence);
Router.route("/:id").get(WorkSequenceController.getWorkSequence);
Router.route("/site/:siteId").get(WorkSequenceController.getWorkSequenceBySiteId);
module.exports = Router;



