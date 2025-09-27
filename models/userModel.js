const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const express = require("express");

const ArchitectureToRoModuleSchema = new mongoose.Schema({
  drawing: {
    type: Boolean,
    default: false
  },
  rfi: {
    type: Boolean,
    default: false
  },
  pending: {
    type: Boolean,
    default: false
  },
  register: {
    type: Boolean,
    default: false
  },
  analysis: {
    type: Boolean,
    default: false
  },
  reports: {
    type: Boolean,
    default: false
  },
});

const RoModuleSchema = new mongoose.Schema({
  drawing: {
    type: Boolean,
    default: false
  },
  rfi: {
    type: Boolean,
    default: false
  },
  pending: {
    type: Boolean,
    default: false
  },
  register: {
    type: Boolean,
    default: false
  },
  reports: {
    type: Boolean,
    default: false
  },
  analysis: {
    type: Boolean,
    default: false
  },
  rfiRaisedAccess: {
    type: Boolean,
    default: false
  },
  forwardAccess: {
    type: Boolean,
    default: false
  },
});

const SiteHeadModuleSchema = new mongoose.Schema({
  drawing: {
    type: Boolean,
    default: false
  },
  rfi: {
    type: Boolean,
    default: false
  },
  pending: {
    type: Boolean,
    default: false
  },
  register: {
    type: Boolean,
    default: false
  },
  analysis: {
    type: Boolean,
    default: false
  },
  reports: {
    type: Boolean,
    default: false
  },
  rfiRaisedAccess: {
    type: Boolean,
    default: false
  },
  forwardAccess: {
    type: Boolean,
    default: false
  },
});

const SiteToSiteModuleSchema = new mongoose.Schema({
  drawing: {
    type: Boolean,
    default: false
  },
  pending: {
    type: Boolean,
    default: false
  },
  register: {
    type: Boolean,
    default: false
  },
  analysis: {
    type: Boolean,
    default: false
  },
  reports: {
    type: Boolean,
    default: false
  },
  rfiRaisedAccess: {
    type: Boolean,
    default: false
  },
  forwardAccess: {
    type: Boolean,
    default: false
  },
});
const workFlowModuleSchema = new mongoose.Schema({
  consultant: {
    type: Boolean,
    default: false
  },
  ro: {
    type: Boolean,
    default: false
  },
  siteHead: {
    type: Boolean,
    default: false
  },
  siteLevel: {
    type: Boolean,
    default: false
  },
  rfiTimeStamp: {
    type: Boolean,
    default: false
  },
});
const deawingRegisterModuleSchema = new mongoose.Schema({
  registerApproval: {
    type: Boolean,
    default: false
  },
  registerEdit: {
    type: Boolean,
    default: false
  },
 registerDelete: {
    type: Boolean,
    default: false
  },
  
});
const addRegisterModuleSchema = new mongoose.Schema({
  addFolder: {
    type: Boolean,
    default: false
  },
  addRegister: {
    type: Boolean,
    default: false
  },
  deawingRegister: {
    type: Boolean,
    default: false
  },
   deawingRegisterDetails: {
    type: deawingRegisterModuleSchema,
    default: {}
  },
});
const assignCategoryModuleSchema = new mongoose.Schema({
  assignCategory: {
    type: Boolean,
    default: false
  },
  assignFileFormat: {
    type: Boolean,
    default: false
  },
 
  
});
const OptionsModuleSchema = new mongoose.Schema({
  categoryRegister: {
    type: Boolean,
    default: false
  },
  assignCategory: {
    type: Boolean,
    default: false
  },
  assignCategoryDetails: {
    type: assignCategoryModuleSchema,
    default: {}
  },
  addRegister: {
    type: Boolean,
    default: false
  },
  addRegisterDetails: {
    type: addRegisterModuleSchema,
    default: {}
  },
  workFlow: {
    type: Boolean,
    default: false
  },
  workFlowDetails: {
    type: workFlowModuleSchema,
    default: {}
  },
});

const DrawingModuleSchema = new mongoose.Schema({
  architectureToRo: {
    type: Boolean,
    default: false,
  },
  architectureToRoDetails: {
    type: ArchitectureToRoModuleSchema,
    default: {}
  },
  ro: {
    type: Boolean,
    default: false,
  },
  roDetails: {
    type: RoModuleSchema,
    default: {}
  },
  siteHead: {
    type: Boolean,
    default: false,
  },
  siteHeadDetails: {
    type: SiteHeadModuleSchema,
    default: {}
  },
  siteToSite: {
    type: Boolean,
    default: false,
  },
  siteToSiteDetails: {
    type: SiteToSiteModuleSchema,
    default: {}
  },
  options: {
    type: Boolean,
    default: false,
  },
  optionsDetails: {
    type: OptionsModuleSchema,
    default: {}
  },
});
const UserModuleSchema = new mongoose.Schema({
  employee: {
    type: Boolean,
    default: false,
  },
  profile: {
    type: Boolean,
    default: false,
  },
  organizationChart: {
    type: Boolean,
    default: false,
  },
  
});
const communicationModuleSchema = new mongoose.Schema({
  mail: { type: Boolean, default: false  },
  chat: { type: Boolean, default: false  },
  
});
const ChecklistModuleSchema = new mongoose.Schema({
  design: {
    type: Boolean,
    default: false,
  },
  approval: {
    type: Boolean,
    default: false,
  },
  forms: {
    type: Boolean,
    default: false,
  },
  
});
const SpaceModuleSchema = new mongoose.Schema({
  isCodes: {
    type: Boolean,
    default: false,
  },
  constructionNeeds: {
    type: Boolean,
    default: false,
  }
  
});
const assignChecklistsSchema = new mongoose.Schema({
  assignChecklist:{
    type: mongoose.Schema.ObjectId,
    ref: "ChecklistDesign",
  },
  assignedDate: {
    type: Date, 
  },
  
  
});
const assignFormatsSchema = new mongoose.Schema({
  siteId:{
    type: mongoose.Schema.ObjectId,
    ref: "Site",
  },
  formats: [{
    type: String
  },],
  
  
});
const assignNewPnmsSchema = new mongoose.Schema({
  assignNewPnmTasks:{
    type: mongoose.Schema.ObjectId,
    ref: "NewPnm",
  },
  assignedDate: {
    type: Date, 
  },
  lastDateForSubmission:{
    type: Date, 
  },
  status: {
    type: String,
    enum: ["permanent task","temporary task"],
    
    
  },
  temporaryUserSubmissiondate:{
    type: Date, 
  },
  
});
const sharedChecklistsSchema = new mongoose.Schema({
  sharedChecklist:{
    type: mongoose.Schema.ObjectId,
    ref: "ChecklistDesign",
  },
  sharedDate: {
    type: Date, 
  },
  
});

const EnableModuleSchema = new mongoose.Schema({
  drawings: { type: Boolean, default: false  },
  drawingDetails: {
    type: DrawingModuleSchema,
    default: {}
  },
  pAndM: { type: Boolean, default: false },
  qaAndQc: { type: Boolean, default: false },
  ehs: { type: Boolean, default: false  },
  dashBoard: { type: Boolean, default: true },
  workStatus: { type: Boolean, default: false },
  site: { type: Boolean, default: true  },
  communication: { type: Boolean, default: false  },
  communicationDetails: {
    type: communicationModuleSchema,
    default: {}
  },
  customizedView: { type: Boolean,default: false  },
  rfiRaised: { type: Boolean,default: false  },
  areYouReceivingHardCopiesFromAllConsultants: { type: Boolean,default: false  },
  whichConsultantsHaveNotSubmittedHardCopies: [{
          type: mongoose.Schema.ObjectId,
          ref: "User",
        }],
  qs: { type: Boolean, default: false  },
  planner: { type: Boolean, default: false  },
  hr: { type: Boolean, default: false },
  drawingAddFolder: { type: Boolean,default: false  },
  company: { type: Boolean, default: false  },
  task: { type: Boolean, default: false },
  user: { type: Boolean, default: false },
  userDetails: {
    type: UserModuleSchema,
    default: {}
  },
  store: { type: Boolean, default: false  },
  admin: { type: Boolean,default: false  },
  space: { type: Boolean, default: false  },
  spaceDetails: {
    type: SpaceModuleSchema,
    default: {}
  },
  checkList: { type: Boolean, default: false  },
  checkListDetails: {
    type: ChecklistModuleSchema,
    default: {}
  },
});
const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, "Please tell us your first name!"],
  },
  lastName: {
    type: String,
    required: [true, "Please tell us your last name!"],
  },
  contactNumber: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: [true, "Please tell us your email!"],
    unique: true,
    lowercase: true,
    validator: [validator.isEmail, "Please provide a valid email"],
  },
  workMode: String,
  // password: {
  //   type: String,
  //   default: function() {
  //     return this.email;
  //   },
  //   select: false,
  // },
  bloodGroup: String,
  emergencyContact: Number,
  role: {
    type: String,
    default: "user",
  },
  department: {
    type: String,
    enum: [
      "Management",
      "Execution",
      "Planning",
      "SiteManagement",
      "Structural",
      "Architectural",
      "Drawing",
      "QualitySurveyorBilling",
      "MEP",
      "EHS",
      "CRMTECH",
      "Store",
      "Survey",
      "Accounts",
      "Admin",
      "Design Consultant",
      "Company Admin",
      "Super Admin",
      "PNM"
    ],
  },
  empId:{
    type: String,
    unique: true,
   // required: true,

  },
  reportingEmpId:{
    type: String,
   // required: true,

  },
  reportingEmpIdName:{
    type: String,
   // required: true,

  },
  reportingUserId:{
    type: mongoose.Schema.ObjectId,
     ref: "User",

  },
  
  favouriteUsers:[{
    
      type: mongoose.Schema.ObjectId,
      ref: "User",
  }],
  
    permittedSites: [{
      siteId: {
        type: mongoose.Schema.ObjectId,
        ref: "Site",
      },
      enableModules: EnableModuleSchema,
    }],

  companyId:
    {
      type: mongoose.Schema.ObjectId,
      ref: "Company",
    },
  notifications:[{
    type: mongoose.Schema.ObjectId,
    ref: "Notification",
  }],
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  createdDate: {
    type: Date,
    default: Date.now, 
  },
  profilePic: {
    type: String,
  },
  banner: {
    type: String,
  },
  assignChecklistForUser:[{
    type: assignChecklistsSchema,
    default: {}
  }],
  
  sharedChecklist:[{
    type: sharedChecklistsSchema,
    default: {}
  }],
  tasks:{
    type: mongoose.Schema.ObjectId,
    ref: "Task",
  },
    loginUser: {
    type: String,
    enum: ["Support","User"],
    default:"User" 
  },
  assignFormatsForConsultant:[{
    type: assignFormatsSchema,
    default: {}
  }],
   excelFiles:[ {
    type: String,
  },],
  // assignnewPnmTasksForUser:[{
  //   type: assignNewPnmsSchema,
  //   default: {}
  // }],
  
  // cv: String,
  // pan: String,
  // aadhar: String,
  // experience: String,
});
userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

const User = mongoose.model("User", userSchema);
module.exports = User;
