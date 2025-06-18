const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get("/getAll", userController.getAllConsultants);

module.exports = router;