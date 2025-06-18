const express = require('express');
const router = express.Router();
const plannerCategoryController = require('../controllers/plannerCategoryController');

router.post("/create", plannerCategoryController.createPlannerCategories);
router.get("/getAll", plannerCategoryController.getAllPlannerCategories);
router.delete('/delete/:id', plannerCategoryController.deletePlannerCategory);

module.exports = router;
