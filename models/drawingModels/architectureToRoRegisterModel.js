const mongoose = require("mongoose");

const siteSoftrevisionSchema = new mongoose.Schema({
  typeOfDrawing: {
    type: String,
    enum: ["General Arrangement", "Conceptual", "Schematic", "GFC"],
  },
  revision: {
    type: String,
  },
  forwardRevision: {
    type: String,
  },
  drawingFileName: {
    type: String,
  },
  pdfDrawingFileName: {
    type: String,
  },

  urn: {
    type: String,
  },

  urnExpiration: {
    type: Date,
  },

  softCopySubmittedDate: {
    type: Date,
  },
  issuedSoftCopy: {
    type: String,
    enum: ["Yes", "No"],
    default: "Yes",
  },
  issuesInRevision: [
    {
      type: String,
    },
  ],
  changes: {
    type: String,
  },
  siteHeadRef: {
    type: String,
  },
  revisionCreationDate: {
    type: Date,
    default: Date.now,
  },
  siteTositeType: {
    type: String,
    enum: ["Created", "Forwarded"],
    default: "Created",
  },
  revisionCreatedBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  viewDates: {
    type: [Date],
  },
});
const SiteHeadSoftrevisionSchema = new mongoose.Schema({
  typeOfDrawing: {
    type: String,
    enum: ["General Arrangement", "Conceptual", "Schematic", "GFC"],
  },
  revision: {
    type: String,
  },
  forwardRevision: {
    type: String,
  },
  drawingFileName: {
    type: String,
  },
  pdfDrawingFileName: {
    type: String,
  },

  urn: {
    type: String,
  },

  urnExpiration: {
    type: Date,
  },

  softCopySubmittedDate: {
    type: Date,
  },
  issuedSoftCopy: {
    type: String,
    enum: ["Yes", "No"],
    default: "Yes",
  },
  issuesInRevision: [
    {
      type: String,
    },
  ],
  changes: {
    type: String,
  },
  roRef: {
    type: String,
  },
  revisionCreationDate: {
    type: Date,
    default: Date.now,
  },
  revisionCreatedBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  siteHeadType: {
    type: String,
    enum: ["Created", "Forwarded"],
    default: "Created",
  },
  rfiStatus: {
    type: String,
    enum: ["Raised", "Not Raised"],
    default: "Not Raised",
  },
  viewDates: {
    type: [Date],
  },
});
const RoSoftrevisionSchema = new mongoose.Schema({
  typeOfDrawing: {
    type: String,
    enum: ["General Arrangement", "Conceptual", "Schematic", "GFC"],
  },
  revision: {
    type: String,
  },
  forwardRevision: {
    type: String,
  },
  drawingFileName: {
    type: String,
  },
  pdfDrawingFileName: {
    type: String,
  },

  urn: {
    type: String,
  },

  urnExpiration: {
    type: Date,
  },

  softCopySubmittedDate: {
    type: Date,
  },
  issuedSoftCopy: {
    type: String,
    enum: ["Yes", "No"],
    default: "Yes",
  },
  issuesInRevision: [
    {
      type: String,
    },
  ],
  changes: {
    type: String,
  },
  architectRef: {
    type: String,
  },
  revisionCreationDate: {
    type: Date,
    default: Date.now,
  },
  revisionCreatedBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  roType: {
    type: String,
    enum: ["Created", "Forwarded"],
    default: "Created",
  },
  rfiStatus: {
    type: String,
    enum: ["Raised", "Not Raised"],
    default: "Not Raised",
  },
  roRevisionStatus: {
    type: String,
    enum: ["Not Forwarded", "Forwarded"],
    default: "Not Forwarded",
  },
  siteHeadRfiTimeStampDays: {
    type: Number,
  },
  viewDates: {
    type: [Date],
  },
});
const architectSoftRevisionSchema = new mongoose.Schema({
  typeOfDrawing: {
    type: String,
    enum: ["General Arrangement", "Conceptual", "Schematic", "GFC"],
  },
  revision: {
    type: String,
  },
  drawingFileName: {
    type: String,
  },
  pdfDrawingFileName: {
    type: String,
  },
  urn: {
    type: String,
  },

  urnExpiration: {
    type: Date,
  },

  softCopySubmittedDate: {
    type: Date,
  },
  issuedSoftCopy: {
    type: String,
    enum: ["Yes", "No"],
    default: "Yes",
  },
  issuesInRevision: [
    {
      type: String,
    },
  ],
  changes: {
    type: String,
  },
  revisionCreationDate: {
    type: Date,
    default: Date.now,
  },
  revisionCreatedBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  architectRevisionStatus: {
    type: String,
    enum: ["Not Forwarded", "Forwarded"],
    default: "Not Forwarded",
  },
  rfiStatus: {
    type: String,
    enum: ["Raised", "Not Raised"],
    default: "Not Raised",
  },
  roRfiTimeStampDays: {
    type: Number,
  },
  viewDates: {
    type: [Date],
  },
});

const HardCopyRevisionSchema = new mongoose.Schema({
  revision: {
    type: String,
  },

  receivedCopies: {
    type: Number,
  },

  hardCopySubmittedDate: {
    type: Date,
  },
  receivedHardCopy: {
    type: String,
    enum: ["Yes", "No"],
    default: "Yes",
  },
  hardCopyFile: {
    type: String,
  },
  revisionCreationDate: {
    type: Date,
    default: Date.now,
  },
  revisionCreatedBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
});

const ArchitectureToRoRegisterSchema = new mongoose.Schema({
  siteId: {
    type: mongoose.Schema.ObjectId,
    ref: "Site",
  },
  companyId: {
    type: mongoose.Schema.ObjectId,
    ref: "Company",
  },
  folderId: {
    type: mongoose.Schema.ObjectId,
    ref: "DrawingFolder",
  },
  drawingNo: {
    type: String,
    required: true,
    uppercase: true,
  },
  designDrawingConsultant: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  drawingTitle: {
    type: String,
    required: true,
  },
  category: {
    type: mongoose.Schema.ObjectId,
    ref: "Category",
  },
  noOfRoHardCopyRevisions: {
    type: Number,
  },
  noOfSiteHeadHardCopyRevisions: {
    type: Number,
  },
  regState: {
    type: String,
    enum: ["Pending", "Drawing"],
    default: "Pending",
  },
  archRevision: {
    type: String,
  },
  acceptedROSubmissionDate: {
    type: Date,
    // required: true
  },
  acceptedSiteSubmissionDate: {
    type: Date,
    // required: true
  },
  creationDate: {
    type: Date,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  tower: {
    type: String,
  },
  drawingStatus: {
    type: String,
    enum: ["Approval", "Not Approval"],
    default: "Not Approval",
  },
  acceptedArchitectRevisions: {
    type: [architectSoftRevisionSchema],
  },
  acceptedRORevisions: {
    type: [RoSoftrevisionSchema],
  },
  acceptedSiteHeadRevisions: {
    type: [SiteHeadSoftrevisionSchema],
  },
  acceptedSiteRevisions: {
    type: [siteSoftrevisionSchema],
  },
  // acceptedArchitectHardCopyRevisions: {
  //   type: [HardCopyRevisionSchema],

  // },

  acceptedROHardCopyRevisions: {
    type: [HardCopyRevisionSchema],
  },
  acceptedSiteHeadHardCopyRevisions: {
    type: [HardCopyRevisionSchema],
  },
});

const ArchitectureToRoRegister = mongoose.model(
  "ArchitectureToRoRegister",
  ArchitectureToRoRegisterSchema
);

module.exports = ArchitectureToRoRegister;
