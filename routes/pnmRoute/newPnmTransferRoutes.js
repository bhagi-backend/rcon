const express = require("express");
const router = express.Router();
const newPnmTransferController = require("../../controllers/pnm/newPnmTransferController");
const authController = require("../../controllers/authController");


router.post("/temp", authController.protect, newPnmTransferController.createTemporaryTransfer);
router.get("/temp", authController.protect, newPnmTransferController.getAllTemporaryTransfers);


router.post("/permanent", authController.protect, newPnmTransferController.createPermanentTransfer);
router.get("/permanent", authController.protect, newPnmTransferController.getAllPermanentTransfers);






module.exports = router;