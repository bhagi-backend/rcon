const express = require('express');
const router = express.Router();
const sharedCategoriesController = require('../../controllers/drawing/sharedCategoriesController');
const authController = require('../../controllers/authController')

router.post('/',authController.protect, sharedCategoriesController.createOrUpdateSharedCategories);
router.get('/byConsultant',authController.protect, sharedCategoriesController.getSharedCategoriesByConsultant);
router.get('/sharedRegisters',authController.protect, sharedCategoriesController.getRegistersByCategoryAndState);
router.delete('/removeCategory',authController.protect, sharedCategoriesController.deleteCategory);

module.exports = router;
