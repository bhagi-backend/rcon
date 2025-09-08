const express = require("express");
const router = express.Router();
const RoToSiteLevelRequestedController= require("../../controllers/drawing/roToSiteLevelRequestedController");
const authController = require("../../controllers/authController");
const pdfController= require("../../controllers/drawing/pdfDrawingFileNameController");
const multerWrapper = require("../../utils/multerFun");
router.use(express.urlencoded({ extended: true }));
const upload = multerWrapper();


router.post("/postRequest", 
  authController.protect,
    RoToSiteLevelRequestedController.uploadDrawingFile,
    RoToSiteLevelRequestedController.resizeDrawingFile,
    RoToSiteLevelRequestedController.createRequest
);

router.put(
  "/:id",
  authController.protect,
  RoToSiteLevelRequestedController.uploadDrawingFile,
  RoToSiteLevelRequestedController.resizeDrawingFile,
  RoToSiteLevelRequestedController.updateRequest
);

router.put(
  "/drawingPdf/:id",
  authController.protect,
  pdfController.uploadDrawingPhoto,
  pdfController.resizeDrawingPhotoforRoRfi,
  pdfController.updatePdfInLatestRevisionsforRoRfi
);
router.put(
  "/rejectDwgFile/:id",
  authController.protect,
  RoToSiteLevelRequestedController.uploadRejectDrawingFile,
  RoToSiteLevelRequestedController.resizeRejectedDrawingFile,
  RoToSiteLevelRequestedController.updateRejectDwgFile
);
router.get("/request/:id",authController.protect, RoToSiteLevelRequestedController.getRequestBeforeUpdateRevision);
router.get("/", RoToSiteLevelRequestedController.getAllRequests);
router.get("/byDrawingId",authController.protect, RoToSiteLevelRequestedController.getRequestByDrawingId);
router.get("/pdfbyDrawingId",authController.protect, RoToSiteLevelRequestedController.generatePdfReport);
router.get("/site",authController.protect, RoToSiteLevelRequestedController.getAllRequestsBySiteId);
router.get("/:id", authController.protect,RoToSiteLevelRequestedController.getRequest);
router.get("/viewRejectDwg/:id",authController.protect, RoToSiteLevelRequestedController.getViewRejectDwgFile);
router.put(
  "/updateRevision/:id",
  authController.protect,
  RoToSiteLevelRequestedController.updateArchitectureToRoRegisterAndUpdateRequest  
);
router.put(
  "/drawing/:id",
  authController.protect,
  RoToSiteLevelRequestedController.uploadDrawingFile,
  RoToSiteLevelRequestedController.resizeDrawingFile,
  RoToSiteLevelRequestedController.updateDrawingFileNameInLatestRevision
);
router.put("/reject/:id",authController.protect,RoToSiteLevelRequestedController.rejectRequest);
router.put(
  "/rejectFile/:id",
  authController.protect,
  RoToSiteLevelRequestedController.uploadRejectedFile,
  RoToSiteLevelRequestedController.updateRejectedFile);
  router.get("/rejectFile/:id", authController.protect,RoToSiteLevelRequestedController.getRejectedFile);
router.put("/accept/:id",authController.protect,RoToSiteLevelRequestedController.acceptRequest);
router.put("/closed/:id",authController.protect,RoToSiteLevelRequestedController.closeRequest);
router.put("/reOpen/:id",authController.protect,RoToSiteLevelRequestedController.reopenRequest);
router.put(
  "/impactImages/:id",
  authController.protect,
  RoToSiteLevelRequestedController.uploadImpactImages,
  RoToSiteLevelRequestedController.updateImpactImages);
router.put(
  "/natureOfRequests/:id",
  authController.protect,upload.any(),
  RoToSiteLevelRequestedController.updateNatureOfReasons
);
module.exports = router;