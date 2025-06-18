const express = require('express');
const router = express.Router();
const CategoryController = require('../controllers/categoryController');

router.post("/create", CategoryController.createCategories);
router.get("/getAll", CategoryController.getAllCategories);
router.delete('/delete/:id', CategoryController.deleteCategory);

module.exports = router;
