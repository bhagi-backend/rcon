const express = require('express');
const router = express.Router();
const DrawingFolderController = require('../../controllers/drawing/drawingFolderController');
const authController = require('../../controllers/authController')

router.post('/',authController.protect, DrawingFolderController.createDrawingFolder);
router.get('/bySiteId',authController.protect, DrawingFolderController.getDrawingFoldersBySiteId);
router.delete('/:id',authController.protect, DrawingFolderController.deleteDrawingFolderById);

module.exports = router;
