const express = require("express");
const router = express.Router();
const newPnmController = require("../../controllers/pnm/newPnmController");
const authController = require("../../controllers/authController");


router.post("/", authController.protect, newPnmController.createNewPnm);
router.get('/newpnm',authController.protect, newPnmController.getNewPnmByEquipmentTypeAndType);

router.get("/",  authController.protect, newPnmController.getAllNewPnms);

router.get("/pnmsByStatus", authController.protect,newPnmController.getPnmsByStatus);

router.get("/:id", authController.protect,newPnmController.getNewPnm);

router.put("/update/:id",authController.protect, newPnmController.addDocuments);
router.put("/updateDocument/:newPnmId/DocumentId/:documentId",authController.protect, newPnmController.updateExistingDocument);
//multipleDocuments
router.put("/upload/:id",authController.protect, newPnmController.uploadDocuments, newPnmController.handleDocumentUpload);
//singleDocument
router.put("/uploadDocument/:newPnmId/DocumentId/:documentId", authController.protect,newPnmController.uploadDocument, newPnmController.updateExistingDocumentFile);

router.get("/:id/document/:documentName", authController.protect,newPnmController.getDocument);
router.delete("/newpnm/:id",authController.protect,newPnmController.deleteNewPnm);
router.put("/newpnm/:id",authController.protect, newPnmController.updateNewPnm);

router.get("/pnmsByStatus",authController.protect, authController.protect,newPnmController.getPnmsByStatus);





module.exports = router;

