const express = require('express');
const router = express.Router();
const ActivityController = require('../../controllers/checklistControllers/activityController');
const authController = require("../../controllers/authController");

router.post("/create",authController.protect, ActivityController.createActivities);
router.get("/getAll",authController.protect,  ActivityController.getAllActivities);
router.delete('/delete/:id', ActivityController.deleteActivity);

module.exports = router;
