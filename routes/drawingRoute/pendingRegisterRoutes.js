const express = require('express');
const router = express.Router();
const PendingRegisterController = require('../../controllers/drawing/pendingRegisterController')




router.get('/Architecture', PendingRegisterController.getAllArchitecturePendingBySiteId);
router.get('/Ro', PendingRegisterController.getAllRoPendingBySiteId);
module.exports = router;