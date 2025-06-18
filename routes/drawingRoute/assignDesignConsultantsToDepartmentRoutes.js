const express = require('express');
const router = express.Router();
const assignDesignConsultantsToDepartmentController = require('../../controllers/drawing//assignDesignConsultantsToDepartmentController');
const authController = require('../../controllers/authController')

router.post('/',authController.protect, assignDesignConsultantsToDepartmentController.assignCategoriesToDepartment);
router.delete('/designConsultant/',authController.protect, assignDesignConsultantsToDepartmentController.deleteDesignConsultant);
router.get('/designConsultantsByDepartment/',authController.protect, assignDesignConsultantsToDepartmentController.getdesignConsultantsByDepartment);
module.exports = router;
