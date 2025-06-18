const express = require("express");
const Router = express.Router();
const preDrawingController = require("../controllers/preDrawingController");
const authController = require("../controllers/authController");

Router.post("/posting", preDrawingController.createPreDrawing);

Router.get("/AllDrawings", preDrawingController.getAllPreDrawings);
module.exports = Router;
