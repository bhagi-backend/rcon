const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const RoSoftrevisionSchema = new mongoose.Schema({
  revision: {
    type: String,
    
  },
  drawingFileName: {
    type: String,
  },
  
  softCopySubmittedDate : {
    type: Date,
  
  },
  issuedSoftCopy: {
    type: String,
    enum: ["Yes", "No"],
    default: "Yes"
  },
  issuesInRevision:[
    {
      type: String,
    }
  ],
  changes:{
    type:String
  },
  architectRef:
  {
    type: String,
  },
  revisionCreationDate: {
    type: Date,
    default: Date.now
  },
 
 
});
const architectSoftRevisionSchema = new mongoose.Schema({
  revision: {
    type: String,
    
  },
  drawingFileName: {
    type: String,
  },
  
  softCopySubmittedDate : {
    type: Date,
  
  },
  issuedSoftCopy: {
    type: String,
    enum: ["Yes", "No"],
    default: "Yes"
  },
  issuesInRevision:[
    {
      type: String,
    }
  ],
  changes:{
    type:String
  },
  revisionCreationDate: {
    type: Date,
    default: Date.now
  },
 
  
 
});

const HardCopyRevisionSchema = new mongoose.Schema({
  revision: {
    type: String,
    
  },
  
  receivedCopies:{
    type: Number,

  },
 
  hardCopySubmittedDate : {
    type: Date,
  
  },
  receivedHardCopy: {
    type: String,
    enum: ["Yes", "No"],
    default: "Yes"
   
  },
  hardCopyFile: {
    type: String,
    
  },
});
// Define the PendingRegisters Schema
const RoPendingRegistersSchema = new Schema({
  siteId: {
    type: mongoose.Schema.ObjectId,
    ref: "Site",
  },
  drawingNo: {
    type: String,
    required: true,
    uppercase: true,
  },
  designDrawingConsultant: {
    type: mongoose.Schema.ObjectId,
    ref: "DesignDrawingConsultant",
  },
  drawingTitle: {
    type: String,
    required: true
  },
  category: {
    type: mongoose.Schema.ObjectId,
    ref: "Category",
  },
  acceptedROSubmissionDate : {
    type: Date,
    required: true
  },
  acceptedSiteSubmissionDate : {
    type: Date,
    required: true
  },
  creationDate: {
    type: Date,
    default: Date.now
  },
  
  acceptedArchitectRevisions: {
    type: [architectSoftRevisionSchema],
    
  },
  acceptedRORevisions: {
    type: [RoSoftrevisionSchema],
    
  },
  
  acceptedArchitectHardCopyRevisions: {
    type: [HardCopyRevisionSchema],
    
  },
  
  acceptedROHardCopyRevisions: {
    type: [HardCopyRevisionSchema],
    
  },
});
// Create the PendingRegisters model
const RoPendingRegisters = mongoose.model('RoPendingRegisters', RoPendingRegistersSchema);

module.exports = RoPendingRegisters;
