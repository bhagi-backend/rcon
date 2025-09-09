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
});
const RoToSitelevelRequestSchema = new mongoose.Schema({
  siteId: {
    type: mongoose.Schema.Types.ObjectId, 
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
  roRfiNo: {
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
    
  },
  architectRevision: {
    type: String,
    
  },
  architectRfiId: {
    type: String,
    
  },
  rfiState: {
    type: String,
    default: "Not Forwarded",
    enum: ["Not Forwarded", "Forwarded",]
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
    enum: ["Requested", "Accepted", "Rejected","Submitted","Closed","ReOpened","Not Responded","Completed"]
  },
  natureOfRequestedInformationReasons : {
    type: [reasonSchema],
    
  },
  reason: {
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
});

const RoToSiteLevelRequest = mongoose.model("RoToSiteLevelRequest", RoToSitelevelRequestSchema);
module.exports = RoToSiteLevelRequest;
