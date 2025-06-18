const mongoose = require("mongoose");
const validator = require("validator");
const express = require("express");
const AssigningInchargeSchema = new mongoose.Schema({
  department: {
    type: String,
    
  },
  role:{
    type: String,

  },
 
});
const DescriptionSchema = new mongoose.Schema({
  dNo: {
    type: String,
  },
  description: {
    type: String,
  },
  mandatoryOrNot: {
    type: String,
    enum: ["Yes", "No","Not Applicable"],
    default: "Not Applicable",
  },
  inputType: {
    type: String,
    enum: ["Yes", "No","Not Applicable"],
    default: "Not Applicable",
  },
  image: {
    type: String,
    enum: ["Yes", "No","Not Applicable"],
    default: "Not Applicable",
  },
  Remarks: {
    type: String,
    enum: ["Yes", "No","Not Applicable"],
    default: "Not Applicable",
  },
 
});

const RevisionSchema = new mongoose.Schema({
  revision: {
    type: String, 
   default: "R0",
   required: true
  },
  approvalStatus: {
    type: String,
    enum: ["Ongoing", "Requesting","Redo" ,"Rejected","Approved"],
    default: "Ongoing",
    required: true
  },
  requestedBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  requestedDate: {
    type: Date,
     
  },
  approvedBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  approvedDate: {
    type: Date, 
  
  },
  rejectReason:[ {
    type: String, 
  },],
  reDoReason: [ {
    type: String, 
  },],
});
const ChecklistDesignSchema = new mongoose.Schema({
  
  companyId:
    {
      type: mongoose.Schema.ObjectId,
      ref: "Company",
      required: true
    },
  activity: 
    {
      type: mongoose.Schema.ObjectId,
      ref: "Activity",
      required: true
    },
    

  department:[ {
    type: String,
    enum: [
      "PNM",
      "QC",
      "MEP",
      "EHS",
      "Admin",
    ],
    required: true
  }],
  checklistType: {
    type: String,
    enum: ["Permitts", "Checklist", "Inspection"],
    required: true
  },
  statusType: {
    type: String,
    enum: ["Before", "During", "After","Testing"],
    required: function() {
      return this.checklistType === "Checklist";
  }
  },
  
  descriptionDetails: {
    type: [DescriptionSchema],
  },
  formNo: {
    type: String,
    unique: true
  },
  revisions: {
    type: [RevisionSchema],
    required: true
  },
  assigningIncharge: {
    type: [AssigningInchargeSchema],
    
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  createdDate: {
    type: Date,
     
  },
  sharedTo: [{
    type: mongoose.Schema.ObjectId,
    ref: "User",
  }],
});

const ChecklistDesign = mongoose.model("ChecklistDesign", ChecklistDesignSchema);
module.exports = ChecklistDesign;