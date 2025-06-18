const mongoose = require("mongoose");

const revisionSchema = new mongoose.Schema({
  revision: {
    type: String,
    required: true,
    default: "RO",
  },
  drawingFileName: {
    type: String,
  },
  remarks: {
    type: String,
  },
});

const architectureToRoSchema = new mongoose.Schema({
  siteId:{
    type: mongoose.Schema.ObjectId,
    ref: "Site",
  },
  drawingRegisterId: {
    type: mongoose.Schema.ObjectId,
    ref: "ArchitectureToRoRegister",
  },
  acceptedScheduledSubmissionDate: {
    type: Date,
    required: true
  },
  actualSubmissionDate: {
    type: Date,
    required: true
  },
  issuedSoftCopy: {
    type: String,
    enum: ["Yes", "No"],
    required: true
  },
  receivedHardCopy: {
    type: String,
    enum: ["Yes", "No"],
    required: true
  },
  dueDays: {
    type: String,
    required: true
  },
  revisions: {
    type: [revisionSchema],
    default: function() {
      return [{ revision: "R0", drawingFileName: "" }];
    }
  }
});

const ArchitectureToRoDrawing = mongoose.model("ArchitectureToRoDrawing", architectureToRoSchema);
module.exports = ArchitectureToRoDrawing;
