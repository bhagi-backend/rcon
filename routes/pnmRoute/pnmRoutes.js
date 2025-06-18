const express = require("express");
const router = express.Router();
const pnmController = require("../../controllers/pnm/pnmController");
const pnmReportController = require("../../controllers/pnm/pnmReportController");
const authController = require("../../controllers/authController");

router.post("/assetCode", authController.protect, pnmController.createAssetCode);
router.get("/assetCode",authController.protect,  pnmController.getAllAssetCodes);
router.get("/assetCode/:id", pnmController.getAssetCode);
router.put("/assetCode/:id", pnmController.updateAssetCode);
router.delete("/deleteAssetCode/:id", pnmController.deleteAssetCode)


router.post("/breakDownReport", pnmController.createBreakDownReport);
router.get("/breakDownReport", pnmController.getAllBreakDownReports);
router.get("/breakDownReport/:id", pnmController.getDocument);
router.put("/breakDownReport/:id",authController.protect,pnmController.uploadDocument, pnmController.updateDocument);
router.put("/breakDownReport/update/:id", pnmController.updateBreakDownReport);
router.delete("/breakDownReport/:id", pnmController.deleteBreakDownReport);


router.post("/miscellaneous", pnmController.createMiscellaneous);
router.get("/miscellaneous", pnmController.getAllMiscellaneous);
router.put("/miscellaneous/:id", pnmController.updateMiscellaneousReport);
router.delete("/miscellaneous/:id", pnmController.deleteMiscellaneousReport);

router.get("/report", pnmReportController.getReports);

module.exports = router;
