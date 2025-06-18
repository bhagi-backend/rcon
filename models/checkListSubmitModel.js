const mongoose = require("mongoose");
const validator = require("validator");
const express = require("express");
const checklistSubmitSchema = new mongoose.Schema({
  siteName: {
    type: mongoose.Schema.ObjectId,
    ref: "Site",
  },
  project:{
    type: String,
    required: [true, "Please tell us Drawing project name"],
  },
  block:{
    type: String,
    required: true,
  },
  floor: String,
  level: String,
  descHeading: String,
  startDate: Date,
  endDate: Date,
  flat: String,
  referenceDrawing :{
    type: String,
  },
  approvalRequest:[ {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },],
  approvedBy : [{
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },],
  addedBy : {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  checkListFormId: {
    type: mongoose.Schema.ObjectId,
    ref: "Checklistform",
  },
  description: [
    {
      heading: String,
      value: String,
      remarks: String,
    },
  ],
 
    heading:{
      type: String,
    }
  
  
});

const checkListSubmit = mongoose.model(
  "checklistFormSubmit",
  checklistSubmitSchema
);
module.exports = checkListSubmit;
