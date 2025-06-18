const express = require('express');
const router = express.Router();
const ArchitectureToRoSelectionRegisterController = require('../../controllers/drawing/architectureToRoSelectionRegisterController');
const authController = require("../../controllers/authController");

router.post('/create', ArchitectureToRoSelectionRegisterController.selectionRegister);

router.delete('/categories', ArchitectureToRoSelectionRegisterController.deleteCategoryFromConsultant);
router.get('/getAll', ArchitectureToRoSelectionRegisterController.getAllRegisters);
router.get('/getAllcategoriesAssigned', ArchitectureToRoSelectionRegisterController.getAllCategoriesAssignments);
router.put('/addFormats', authController.protect,ArchitectureToRoSelectionRegisterController.addAssignFormatsForConsultant);
router.delete('/removeFormats/:id', authController.protect,ArchitectureToRoSelectionRegisterController.removeFormatFromConsultant);
router.get('/formats', authController.protect,ArchitectureToRoSelectionRegisterController.getFormatsByUserAndSite);
router.get('/consultants/:id', authController.protect,ArchitectureToRoSelectionRegisterController.getConsultants);
module.exports = router;
