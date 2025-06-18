const express = require("express");
const router = express.Router();
const newPnmWorkFlowController = require("../../controllers/pnm/newPnmWorkFlowController");
const authController = require("../../controllers/authController");


router.post("/", authController.protect, newPnmWorkFlowController.createNewPnmWorkFlow);






module.exports = router;