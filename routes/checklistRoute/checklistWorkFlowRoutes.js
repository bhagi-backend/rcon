const express = require('express');
const router = express.Router();
const ChecklistWorkFlowController = require('../../controllers/checklistControllers/checklistWorkFlowController');
const authController = require("../../controllers/authController");
router
  .route("/")
  .post(authController.protect,ChecklistWorkFlowController.createChecklistWorkFlow)
  .get(authController.protect,ChecklistWorkFlowController.getAllChecklistWorkFlows);
  router.route("/users")
  .get(authController.protect,ChecklistWorkFlowController.getUsersByDepartmentAndRole);

router
  .route("/:id")
  .put(ChecklistWorkFlowController.updateChecklistWorkFlow);

module.exports = router;