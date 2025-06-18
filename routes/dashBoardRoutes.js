const express = require('express');
const router = express.Router();
const dashBoardController = require('../controllers/dashBoardController');
const authController = require('../controllers/authController');

router.get('/getAllTasks', authController.protect,dashBoardController.getDesignConsultantData);


module.exports = router;
