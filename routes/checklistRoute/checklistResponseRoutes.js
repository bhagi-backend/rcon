const express = require('express');
const router = express.Router();
const ChecklistResponseController = require('../../controllers/checklistControllers/checklistResponseController');
const authController = require("../../controllers/authController");

router.post("/create", authController.protect,ChecklistResponseController.createChecklistResponse);
router.put("/addDescriptions/:checklistResponseId",ChecklistResponseController.addDescriptions);
router.put("/TaskStatusToCompleted/:checklistResponseId", authController.protect,ChecklistResponseController.updateTaskStatusByChecklistResponseId);
router.put("/checklistResponseId/:checklistResponseId/descriptionId/:descriptionId",ChecklistResponseController.updateChecklistResponse);
router.put("/image/checklistResponseId/:checklistResponseId/descriptionId/:descriptionId",authController.protect,ChecklistResponseController.uploadImage, ChecklistResponseController.updateImage);


module.exports = router;
