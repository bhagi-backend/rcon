const express = require("express");
const Router = express.Router();
const drawingController = require("../controllers/drawingController");
const authController = require("../controllers/authController");

Router.post("/PostDrawing", drawingController.createOne);
Router.put(
  "/:id",
  drawingController.uploadDrawingPhoto,
  drawingController.resizeDrawingPhoto,
  drawingController.updateDrawing
);

Router.get("/:id", drawingController.getDrawing);
Router.get("/", drawingController.getAllDrawing);
module.exports = Router;
