const express = require('express');
const router = express.Router();
const pdfController = require('../../controllers/drawing/pdfController');
const authController = require('../../controllers/authController')

router.get('/report',authController.protect, pdfController.getArchitectReports);

//router.get('/allConsultants',authController.protect, pdfController.getAllArchitectReports);

router.get('/RoReport', authController.protect,pdfController.getRoReports);

router.get('/SiteHeadReport',authController.protect, pdfController.getsiteHeadReports);
router.get('/SiteHeadReportsOfAllConsultants',authController.protect,  authController.protect,pdfController.getAllSiteHeadReports);
router.get('/RoReportsOfAllConsultants', authController.protect,pdfController.getAllRoReports);

router.get('/SiteLevelReport',authController.protect, pdfController.getsiteLevelReports);
router.get('/SiteLevelReportsOfAllConsultants',authController.protect,  authController.protect,pdfController.getAllSiteToSiteReports);
module.exports = router;
