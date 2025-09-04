const express = require('express');
const router = express.Router();
const excelController = require('../../controllers/drawing/excelController');
const authController = require('../../controllers/authController')

router.post('/download',authController.protect, excelController.downloadExcel);
router.get("/checkFile", authController.protect, excelController.checkFileName);


module.exports = router;
