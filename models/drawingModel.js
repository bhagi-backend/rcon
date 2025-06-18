const mongoose = require("mongoose");
const validator = require("validator");
const drawingSchema = new mongoose.Schema({
  drawingNo: {
    type: Number,
    required: [true, "Please tell us your Drawing No!"],
  },
  drawingTitle: {
    type: String,
    required: [true, "Please tell us Drawing Title"],
  },
  name: {
    type: String,
    required: [true, "Please tell us name"],
  },
  remarks: {
    type: String,
    required: [true, "Please tell us remarks"],
  },
  releaseDate: {
    type: Date,
    default: Date.now(),
  },
  revisions: {
    type: String,
    enum: ["No", "R1", "R2"],
  },
  drawingFileName: {
    type: String,
  },
  date: {
    type: Date,
  },
  role: {
    type: String,
  },
});

const Drawing = mongoose.model("Drawing", drawingSchema);
module.exports = Drawing;
