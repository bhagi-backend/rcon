const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const validator = require("validator");

const EnableModuleSchema = new mongoose.Schema({
  drawings: { type: Boolean, required: true },
  pAndM: { type: Boolean, required: true },
  qaAndQc: { type: Boolean, required: true },
  dashBoard: { type: Boolean, default: true },
  workStatus: { type: Boolean, default: false },
  checkList: { type: Boolean, default: false },
  checklistProcess: {
    type: String,
    enum: ["manual", "automatic"],
    required: function() {
      return this.checkList;
    },
  },
  site: { type: Boolean, default: true },
  communication: { type: Boolean, default: false },
  // mail: { type: Boolean, default: false },
  // chat: { type: Boolean, default: false },
  ehs: { type: Boolean, default: false },
  qs: { type: Boolean, default: false },
  planner: { type: Boolean, default: false },
  company: { type: Boolean, default: false },
  task: { type: Boolean, default: false },
  hr: { type: Boolean, default: false },
  hrProcess: {
    type: String,
    enum: ["manual", "automatic"],
    required: function() {
      return this.hr;
    },
  },

  isDrawingAddFolder: {
    type: String,
    enum: ["Yes", "No"],
    default: "No",
  },
  drawingAddFolder: { type: Boolean, default: false },
  customizedView: { type: Boolean, default: false },
  user: { type: Boolean, default: false },
  store: { type: Boolean, default: false },
  admin: { type: Boolean, default: false },
  space: { type: Boolean, default: false },
});

// Company Details Schema
const CdetailsSchema = new Schema({
  companyName: {
    type: String,
    required: true,
    unique: true,
  },
  ownerName: {
    type: String,
    required: true,
  },
  companyMailingaddress: {
    type: String,
    required: true,
  },
  phoneNo: {
    type: String,
    required: true,
  },
  gstNo: {
    type: String,
    required: true,
  },
  panNo: {
    type: String,
    required: true,
  },
});

// Personal Details Schema
const PersonalDetailsSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  designation: {
    type: String,
    required: true,
  },
  emailId: {
    type: String,
    validate: [validator.isEmail, "Invalid email"],
    required: true,
  },
  phNo: {
    type: String,
    required: true,
  },
});

// Company Address Schema
const CAddressSchema = new Schema({
  officeAddress: {
    type: String,
    required: true,
  },
  country: {
    type: String,
    required: true,
  },
  cityOrState: {
    type: String,
    required: true,
  },
  pinCode: {
    type: String,
    required: true,
  },
  industry: {
    type: String,
    required: true,
  },
  webSiteUrl: {
    type: String,
  },
  description: {
    type: String,
  },
});

// Company Documents Schema
const CDocumentsSchema = new Schema({
  gstNo: {
    type: String,
  },
  companyPanNo: {
    type: String,
  },
  companyTanNo: {
    type: String,
  },
  agreementDocument: {
    type: String,
  },
});

const companySchema = new Schema({
  uploadLogo: {
    type: String,
  },
  companyKeyWord: {
    type: String,
  },
  companyDocuments: CDocumentsSchema,
  companyDetails: CdetailsSchema,
  personalInfo: PersonalDetailsSchema,
  companyAddress: CAddressSchema,

  companyEnableModules: {
    type: EnableModuleSchema,
  },
  sites: [
    {
      type: Schema.Types.ObjectId,
      ref: "Site",
    },
  ],
});

const Company = mongoose.model("Company", companySchema);

module.exports = Company;
