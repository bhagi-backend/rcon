const express = require('express');
const router = express.Router();
const analysisController = require('../../controllers/drawing/analysisController');
const authController = require("../../controllers/authController");

router.get('/report/:siteId', authController.protect,analysisController.getAcceptedArchitectRevisions);

router.get('/roReport/:siteId', authController.protect,analysisController.getAcceptedRoRevisions);
router.get('/siteHeadReport/:siteId', authController.protect,analysisController.getSiteHeadRevisions);

router.get('/arrchitectRfiReport/:siteId', authController.protect,analysisController.getArchitectRfi);
router.get('/roRfiReport/:siteId', authController.protect,analysisController.getRoRfi);

// router.get('/allConsultants', pdfController.getAllArchitectReports);

// router.get('/RoReport', pdfController.getRoReports);
// router.get('/RoReportsOfAllConsultants', pdfController.getAllRoReports);


router.get('/consultantAnalysisCount/:siteId', authController.protect,analysisController.getAcceptedArchitectRevisionsAnalysisCount);
router.get('/consultantRfiAnalysisCount/:siteId', authController.protect,analysisController.getRfiAnalysisCountForConsultant);
router.get('/roDrawingAnalysisCount/:siteId', authController.protect,analysisController.getDrawingsAnalysisCountForRo);
router.get('/roAndSiteHeadRfiAnalysisCount/:siteId', authController.protect,analysisController.getDrawingsAnalysisCountForRo);
router.get('/SiteHeadDrawingAnalysisCount/:siteId', authController.protect,analysisController.getDrawingsAnalysisCountForSiteHead);
router.get('/consultantHardCopyAnalysisCount/:siteId', authController.protect,analysisController.getHardCopyAnalysisCountForConsultant);
router.get('/roHardCopyAnalysisCount/:siteId', authController.protect,analysisController.getHardCopyAnalysisCountForRo);

module.exports = router;
