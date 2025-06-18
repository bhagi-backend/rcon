const express = require("express");
const authController = require("../controllers/authController");
const connectedDevicesController = require("../controllers/connectedDevicesController"); 
const router = express.Router();

router.post("/", authController.protect, connectedDevicesController.createConnectedDevice);
router.get("/", authController.protect, connectedDevicesController.getAllConnectedDevices);
router.delete("/:id", connectedDevicesController.deleteConnectedDevice);

module.exports = router;
