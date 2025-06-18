const mongoose = require("mongoose");
const validator = require("validator");
const machinerySchema = new mongoose.Schema({
  SCode: {
    type: String,
    required: true,
  },
  SubCode: {
    type: String,
    required: true,
  },
  Name: {
    type: String,
    required: [true, "Please enter the  name"],
  },
  BrandName: {
    type: String,
    required: [true, "Please enter the BrandName"],
  },
  FuelOrNot: {
    type: String,
    required: true,
  },
  Type: {
    type: String,
    required: true,
  },
  OwnOrHire: {
    type: String,
    required: true,
  },
  PreService: {
    type: Date,
    required: [true],
  },
  NextService: {
    type: Date,
    required: [true],
  },
});

const Machinary = mongoose.model("Machine", machinerySchema);
module.exports = Machinary;
