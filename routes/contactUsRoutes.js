const express = require("express");
const contactController = require("../controllers/contactUsController"); // Adjust the path to your controller
const router = express.Router();

router.post("/", contactController.submitContactUs);

module.exports = router;
