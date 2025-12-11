const express = require("express");
const siteKeywordController = require("../controllers/siteKeywordController");
const authController = require("../controllers/authController");
const Router = express.Router();

Router.post("/", authController.protect, siteKeywordController.addOrUpdateTowers);

module.exports = Router;
