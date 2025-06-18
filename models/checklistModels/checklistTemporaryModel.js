const mongoose = require("mongoose");
const validator = require("validator");
const express = require("express");

const ChecklistTemporarySchema = new mongoose.Schema({
  
  companyId:
    {
      type: mongoose.Schema.ObjectId,
      ref: "Company",
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
      
      user: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
      fromDate: {
        type: Date,
         
      },
      toDate: {
        type: Date, 
      },
      assignedChecklists: [{
        type: mongoose.Schema.ObjectId,
        ref: "ChecklistDesign",
      }],
      allocateUser: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
      createdBy: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
      createdDate: {
        type: Date,
        default: Date.now, 
      },
  
});

const ChecklistTemporary = mongoose.model("ChecklistTemporary", ChecklistTemporarySchema);
module.exports = ChecklistTemporary;