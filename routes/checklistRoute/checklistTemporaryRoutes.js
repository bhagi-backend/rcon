const express = require('express');
const router = express.Router();
const ChecklistTemporaryController = require('../../controllers/checklistControllers/checklistTemporaryController');
const authController = require("../../controllers/authController");

router.post("/", authController.protect,ChecklistTemporaryController.createChecklistTemporary);
router.get(
    "/usersByDepartment/:id",authController.protect, ChecklistTemporaryController.getUsersByDepartmentAndAssignedDate
  );
router.get("/",authController.protect, ChecklistTemporaryController.getAllChecklistTemporary);
router.put("/:id", ChecklistTemporaryController.updateChecklistTemporary);


module.exports = router;