const express = require("express");
const router = express.Router();
const ArchitectureToRoRequestedController = require("../../controllers/drawing/architectureToRoRequestedController");
const authController = require("../../controllers/authController");
const pdfController = require("../../controllers/drawing/pdfDrawingFileNameController");
const multerWrapper = require("../../utils/multerFun");
router.use(express.urlencoded({ extended: true }));
const upload = multerWrapper();

router.post(
  "/postRequest",
  authController.protect,
  ArchitectureToRoRequestedController.uploadDrawingFile,
  ArchitectureToRoRequestedController.resizeDrawingFile,
  ArchitectureToRoRequestedController.createRequest
);
router.post(
  "/siteHeadRfi",
  authController.protect,
  ArchitectureToRoRequestedController.createCombinedRequest
);
router.put(
  "/updateAction",
  authController.protect,
  ArchitectureToRoRequestedController.updateAction
);
router.put(
  "/:id",
  authController.protect,
  ArchitectureToRoRequestedController.uploadDrawingFile,
  ArchitectureToRoRequestedController.resizeDrawingFile,
  ArchitectureToRoRequestedController.updateRequest
);
router.put(
  "/rejectDwgFile/:id",
  authController.protect,
  ArchitectureToRoRequestedController.uploadRejectDrawingFile,
  ArchitectureToRoRequestedController.resizeRejectedDrawingFile,
  ArchitectureToRoRequestedController.updateRejectDwgFile
);
router.get(
  "/site",
  authController.protect,
  ArchitectureToRoRequestedController.getAllRequestsBySiteId
);
router.get(
  "/architect",
  authController.protect,
  ArchitectureToRoRequestedController.getAllRequestsBySiteIdForArchitect
);
router.get(
  "/request/:id",
  authController.protect,
  ArchitectureToRoRequestedController.getRequestBeforeUpdateRevision
);
router.get(
  "/byDrawingId",
  authController.protect,
  ArchitectureToRoRequestedController.getRequestByDrawingId
);
router.get(
  "/pdfbyDrawingId",
  authController.protect,
  ArchitectureToRoRequestedController.generatePdfReport
);
router.get("/", ArchitectureToRoRequestedController.getAllRequests);
router.get(
  "/:id",
  authController.protect,
  ArchitectureToRoRequestedController.getRequest
);
router.get(
  "/view/:id",
  authController.protect,
  ArchitectureToRoRequestedController.getViewRequest
);
router.get(
  "/viewRejectDwg/:id",
  authController.protect,
  ArchitectureToRoRequestedController.getViewRejectDwgFile
);

router.put(
  "/updateRevision/:id",
  authController.protect,
  ArchitectureToRoRequestedController.updateArchitectureToRoRegisterAndUpdateRequest
);

router.put(
  "/drawing/:id",
  authController.protect,
  ArchitectureToRoRequestedController.uploadDrawingFile,
  ArchitectureToRoRequestedController.resizeDrawingFile,
  ArchitectureToRoRequestedController.updateDrawingFileNameInLatestRevision
);
router.put(
  "/drawingPdf/:id",
  authController.protect,
  pdfController.uploadDrawingPhoto,
  pdfController.resizeDrawingPhotoforRfi,
  pdfController.updatePdfInLatestRevisionsforRfi
);
router.put(
  "/reject/:id",
  authController.protect,
  ArchitectureToRoRequestedController.rejectRequest
);
router.put(
  "/rejectFile/:id",
  authController.protect,
  ArchitectureToRoRequestedController.uploadRejectedFile,
  ArchitectureToRoRequestedController.updateRejectedFile
);
router.get(
  "/rejectFile/:id",
  authController.protect,
  ArchitectureToRoRequestedController.getRejectedFile
);
router.put(
  "/accept/:id",
  authController.protect,
  ArchitectureToRoRequestedController.acceptRequest
);
router.put(
  "/closed/:id",
  authController.protect,
  ArchitectureToRoRequestedController.closeRequest
);
router.put(
  "/reOpen/:id",
  authController.protect,
  ArchitectureToRoRequestedController.reopenRequest
);
router.put(
  "/impactImages/:id",
  authController.protect,
  ArchitectureToRoRequestedController.uploadImpactImages,
  ArchitectureToRoRequestedController.updateImpactImages
);
router.put(
  "/natureOfRequests/:id",
  authController.protect,
  upload.any(),
  ArchitectureToRoRequestedController.updateNatureOfReasons
);

module.exports = router;
