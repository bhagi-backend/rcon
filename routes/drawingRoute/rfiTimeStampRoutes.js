const express = require('express');
const router = express.Router();
const RfiTimeStampController = require('../../controllers/drawing/rfiTimeStampController');
const authController = require('../../controllers/authController')

router.post('/',authController.protect, RfiTimeStampController.createRfiTimeStamp);
router.get('/byCompanyId',authController.protect, RfiTimeStampController.getRfiTimeStampById);

module.exports = router;
