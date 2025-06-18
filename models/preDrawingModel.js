const mongoose = require("mongoose");
const validator = require("validator");
const preDrawingSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  drawingNumber: {
    type: String,
    required: true
  },
  drawingName: {
    type: String,
    required: true
  },
  expectedDate: {
    type: Date,
    required: true
  }
});


const PreDrawing = mongoose.model('PreDrawing', preDrawingSchema);

module.exports = PreDrawing;

