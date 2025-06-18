const express = require('express');
const router = express.Router();
const ArchitectController = require('../../controllers/drawing/architectController');
const RoController = require('../../controllers/drawing/roController');
const SiteHeadController = require('../../controllers/drawing/siteHeadController');
const SiteLevelController = require('../../controllers/drawing/siteLevelController');
const authController = require("../../controllers/authController");



router.get('/upload/:siteId',authController.protect, ArchitectController.getAllForArchitectforDrawingtab);
router.get('/pending/:siteId',authController.protect, ArchitectController.getAllForArchitectForPendingTab);
router.get('/register/:siteId',authController.protect, ArchitectController.getAllForArchitectForRegisterTab);


router.get('/drawingRo/:siteId',authController.protect, RoController.getAllForRoforDrawingtab);
router.get('/pendingRo/:siteId',authController.protect, RoController.getAllRoForPendingTab);
router.get('/registerRo/:siteId',authController.protect, RoController.getAllForRoRegisterTab);
router.get('/rfiRo',authController.protect, RoController.getAllRequestsBySiteId);

router.get('/drawingSiteHead/:siteId',authController.protect, SiteHeadController.getAllSiteHeadforDrawingtab);
router.get('/pendingSiteHead/:siteId',authController.protect, SiteHeadController.getAllSiteHeadForPendingTab);
router.get('/registerSiteHead/:siteId',authController.protect, SiteHeadController.getAllSiteHeadForRegisterTab);


router.get('/drawingSiteLevel/:siteId',authController.protect, SiteLevelController.getAllSiteLevelforDrawingtab);
router.get('/pendingSiteLevel/:siteId',authController.protect, SiteLevelController.getAllSiteLevelForPendingTab);
router.get('/registerSiteLevel/:siteId',authController.protect, SiteLevelController.getAllForSiteLevelRegisterTab);
module.exports = router;
