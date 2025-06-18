const express = require('express');
const router = express.Router();
const multer = require('multer');
const ArchitectureToRoRegisterController = require('../../controllers/drawing/architectureToRoRegisterController');
const pdfController = require('../../controllers/drawing/pdfDrawingFileNameController');
const authController = require("../../controllers/authController");
const AppError = require("../../utils/appError");

router.post('/create', authController.protect,ArchitectureToRoRegisterController.createDrawing);

router.put('/update/:id',authController.protect, ArchitectureToRoRegisterController.updateArchitectureToRoRegister);
router.get('/getRegisterBySiteId',authController.protect, ArchitectureToRoRegisterController.getRegisterBySiteId);
router.get('/', authController.protect,ArchitectureToRoRegisterController.getAllDrawing);

router.delete('/:id',authController.protect, ArchitectureToRoRegisterController.deleteDrawing);


router.put('/revisions/:id',authController.protect,ArchitectureToRoRegisterController.uploadFiles,ArchitectureToRoRegisterController.updateRevisions,);

router.put("/updateFolderId",authController.protect,ArchitectureToRoRegisterController.updateFolderIdForRegisters);
router.put(
  "/Ro/:id",
  authController.protect,
  ArchitectureToRoRegisterController.uploadDrawingPhoto,
  ArchitectureToRoRegisterController.resizeDrawingPhoto,
  ArchitectureToRoRegisterController.updateLatestAcceptedRoRevisionsDrawing
);
router.put(
  "/siteHead/:id",
  authController.protect,
  ArchitectureToRoRegisterController.uploadDrawingPhoto,
  ArchitectureToRoRegisterController.resizeDrawingPhoto,
  ArchitectureToRoRegisterController.updateLatestAcceptedSiteHeadRevisionsDrawing
);
router.put(
  "/site/:id",
  authController.protect,
  ArchitectureToRoRegisterController.uploadDrawingPhoto,
  ArchitectureToRoRegisterController.resizeDrawingPhoto,
  ArchitectureToRoRegisterController.updateLatestAcceptedSiteRevisionsDrawing
);
router.put(
  "/:id",
  authController.protect,
  ArchitectureToRoRegisterController.uploadDrawingPhoto,
  ArchitectureToRoRegisterController.resizeDrawingPhoto,
  ArchitectureToRoRegisterController.updateLatestAcceptedArchitectRevisionsDrawing
);

router.get('/:id/revisions/:revision', authController.protect,ArchitectureToRoRegisterController.getAcceptedArchitectRevisionsDrawing);
router.get('/:id/revisionsRo/:revision', authController.protect, ArchitectureToRoRegisterController.getAcceptedRORevisionsDrawing);
router.get('/:id/revisionsSiteHead/:revision', authController.protect, ArchitectureToRoRegisterController.getAcceptedSiteHeadRevisionsDrawing);
router.get('/:id/revisionsSite/:revision', authController.protect, ArchitectureToRoRegisterController.getAcceptedSiteRevisionsDrawing);



//router.put('/hardCopy/:id', ArchitectureToRoRegisterController.updateReceivedHardCopyAcceptedArchitect);


//router.put('/hardCopyRo/:id', ArchitectureToRoRegisterController.updateReceivedHardCopyAcceptedRo);


router.put('/HardCopyRevision/:id', authController.protect,ArchitectureToRoRegisterController.updateHardCopyRevisions);

router.put(
  "/hardCopyFile/:id",
  authController.protect,
  ArchitectureToRoRegisterController.uploadHardCopyFile,
  ArchitectureToRoRegisterController.resizeHardCopyFile,
  ArchitectureToRoRegisterController.updateAcceptedArchitectHardCopyRevisions);
router.get('/:id/hardCopy/:revision', authController.protect,ArchitectureToRoRegisterController.getHardCopyFileAcceptedArchitectRevision);

router.put(
  "/RoHardCopyFile/:id",
  authController.protect,
  ArchitectureToRoRegisterController.uploadHardCopyFile,
  ArchitectureToRoRegisterController.resizeHardCopyFile,
  ArchitectureToRoRegisterController.updateAcceptedROHardcopyRevisionsHardCopyFile);
router.get('/:id/RoHardCopy/:revision', authController.protect,ArchitectureToRoRegisterController.getHardCopyFileAcceptedRoRevision);

router.get("/byPath/*", ArchitectureToRoRegisterController.getByPathName);

router.put(
  "/pdf/:id",
  authController.protect,
  pdfController.uploadDrawingPhoto,
  pdfController.updatePdfInLatestRevisions
);
router.get("/categories", authController.protect,ArchitectureToRoRegisterController.getCategoriesByDesignConsultant);
router.get("/drawings", authController.protect,ArchitectureToRoRegisterController.getDrawingsByDesignConsultantAndCategory);
module.exports = router;
