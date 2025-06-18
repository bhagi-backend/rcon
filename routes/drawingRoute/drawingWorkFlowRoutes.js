const express = require('express');
const router = express.Router();
const DrawingWorkFlowController = require('../../controllers/drawing/drawingWorkFlowController');
const authController = require('../../controllers/authController')

router.get('/',authController.protect, DrawingWorkFlowController.getUsersDepartmentsforRo);
router.get('/siteHeadTrue',authController.protect, DrawingWorkFlowController.getUsersDepartmentsforsiteHead);
router.get('/siteLevelTrue',authController.protect, DrawingWorkFlowController.getUsersDepartmentsforSiteLevel);
router.put('/updateModules/:userId',authController.protect, DrawingWorkFlowController.updateModuleAccess);
router.get('/drawings/:siteId',authController.protect, DrawingWorkFlowController.getAllForArchitectforDrawingtab);
module.exports = router;
