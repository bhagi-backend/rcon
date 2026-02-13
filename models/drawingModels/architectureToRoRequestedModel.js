const { response } = require("express");
const mongoose = require("mongoose");
const reasonSchema = new mongoose.Schema({
  natureOfRequest:  {
    type: String,
  },
  reason:  {
    type: String,
  },
   action: {
    type: String,
    enum: ["Completed", "Not Completed","Rejected","Reopened","Requested","Accepted"],
   
  },
   reasonFile: {
    type: String,
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  typeOfDrawing: {
    type: String,
  },
  isHistory: { type: Boolean, default: false },
});

const ArchitectureToRoRequestSchema = new mongoose.Schema({
  siteId: {
    type: mongoose.Schema.ObjectId, 
    ref: "Site",
  },
   companyId: {
      type: mongoose.Schema.ObjectId,
      ref: "Company",
    },
  drawingId: {
        type: mongoose.Schema.ObjectId,
        ref: "ArchitectureToRoRegister",
      },
      
  drawingFileName: {
    type: String,
  },
  designDrawingConsultant: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  folderId: {
    type: mongoose.Schema.ObjectId,
    ref: "DrawingFolder",
  },
  pdfDrawingFileName: {
    type: String,
  },
  drawingNo: {
    type: String,
  },
  architectRfiNo: {
    type: String,
  },
  remarks: {
   
    type: String,
  },
  submittedDate : {
    type: Date,
  
  },
  natureOfRequestedInformation:[ {
    type: String,
    enum: ["A - Missing Information", "B - Clarification","C - Additional Information","D - Uncoordinated Drawings"],
  },] ,
  revision: {
    type: String,
    required: true,
  },
  typeOfDrawing: {
    type: String,
  },
  roRfiId: {
    type: String,
  },
  issuedSoftCopy: {
    type: String,
    enum: ["Yes", "No"],
  },
  receivedHardCopy: {
    type: String,
    enum: ["Yes", "No"],
   
  },
  requestedDate: {
    required: true,
    type: Date,
  },
  expectedDate: {
    required: true,
    type: Date,
  },
  status: {
    type: String,
    default: "Requested",
    enum: ["Requested", "Accepted", "Rejected","Submitted","Closed","ReOpened","Forwarded","Not Responded","Completed","Responded","Partially Accepted" ],
  },
  rfiType: {
    type: String,
    default: "Created",
    enum: ["Created", "Forwarded",]
  },
  natureOfRequestedInformationReasons : {
    type: [reasonSchema],
    
  },
   rfiRaisedBy: {
    type: String,
    default: "RO",
    enum: ["RO", "SITE HEAD",]
  },
  reason:  {
    type: String,
  },
 
  rejectedFile: {
    type: String,
  },
  rejectedDwgFile: {
    type: String,
  },
  rejectUrn: {
    type: String
  },

  rejectUrnExpiration: {
    type: Date,
  },
  urn: {
    type: String
  },

  urnExpiration: {
    type: Date,
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  creationDate: {
    type: Date,
    default: Date.now
  },
  rejectedBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  rejectedDate: {
    type: Date,

  },
  acceptedBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  acceptedDate: {
    type: Date,

  },
  closedBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  closedDate: {
    type: Date,

  },
  reOpenedBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  reOpenedDate: {
    type: Date,
  },
  impactReasons: [{
    type: String
  },],
  impactImages: [{
    type: String
  },],
  // viewDates: {
  //   type: [Date],
  // },
   viewedBy: [
    {
      user: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
      viewedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],

});

const ArchitectureToRoRequest = mongoose.model("ArchitectureToRoRequest", ArchitectureToRoRequestSchema);
module.exports = ArchitectureToRoRequest;
