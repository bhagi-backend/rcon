const express = require("express");
const Router = express.Router();
const partnersController = require('../controllers/partnersController');


Router.get('/', partnersController.getAllPartners);
Router.post('/',partnersController.createPartner);



module.exports = Router;
