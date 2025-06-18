const mongoose = require("mongoose");
const validator = require("validator");
const express = require("express");

const DescriptionSchema = new mongoose.Schema({
    descriptionId: {
        type: mongoose.Schema.ObjectId,
        ref: "Description", 
        required: true, 
      },
      response: {
        type: String,
        enum: ["Yes", "No", "Not Applicable"],
        default: "Not Applicable", 
      },
      remarks: {
        type: String,
        default: "", 
      },
     image: {
        type: String,
        default: "",
      },
    
  });
  

const ChecklistResponseSchema = new mongoose.Schema({
  checklistId: {
    type: mongoose.Schema.ObjectId,
    ref: "ChecklistDesign",
    required: true, 
  },
  companyId:  {
    type: mongoose.Schema.ObjectId,
    ref: "Company",
    required: true
  },
  siteId: {
    type: mongoose.Schema.ObjectId,
    ref: "Site",
    required: true, 
  },
  descriptions: {
    type: [DescriptionSchema],
  },
  
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User", 
    required: true, 
  },
  createdDate: {
    type: Date,
    default: Date.now, 
  },
});

const ChecklistResponse = mongoose.model("ChecklistResponse", ChecklistResponseSchema);
module.exports = ChecklistResponse;
