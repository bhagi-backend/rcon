const mongoose = require("mongoose");
const validator = require("validator");
const plannerSchema = new mongoose.Schema({
  taskTitle: {
    type: String,
    required: [true, "Please tell us your task title!"],
  },
  AssignedName: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  startDate: {
    type: Date,
    default: Date.now(),
  },
  completionDate: {
    type: Date,
    default: Date.now(),
  },
  duration: {
    type: Number,
    required: true,
  },
  site_name: {
    type: String,
    required: true,
  },
  block: {
    type: String,
    required: true,
  },
  floor: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    default: "Not Started",
    enum: ["Completed", "Ongoing", "Not Started", "startDelay", "End Delay"],
  },
  category: {
    type: String,
    enum: ["Finishing", "Structural", "Others"],
    required: true,
  },
});
const planner = mongoose.model("Planner", plannerSchema);
module.exports = planner;
