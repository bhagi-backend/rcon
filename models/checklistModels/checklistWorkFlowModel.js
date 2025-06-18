const mongoose = require("mongoose");
const validator = require("validator");
const express = require("express");


const LevelSchema = new mongoose.Schema({
  level: {
    type: String, 
   default: "L1",
   required: true
  },
  department: {
    type: String,
    enum: [
      "PNM",
      "QC",
      "MEP",
      "EHS",
      "Admin",
    ],
    required: true
  },
  
  role: {
    type: String, 
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
});
const ChecklistWorkFlowSchema = new mongoose.Schema({
  
  companyId:
    {
      type: mongoose.Schema.ObjectId,
      ref: "Company",
      required: true
    },
    degreeOfAuthorityForChecklistApproval: {
      type: Number, 
      required: true
    },
  levelsInfo: {
    type: [LevelSchema],
  },
  
  
});

const ChecklistWorkFlow = mongoose.model("ChecklistWorkFlow", ChecklistWorkFlowSchema);
module.exports = ChecklistWorkFlow;