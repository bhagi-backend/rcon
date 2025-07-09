const mongoose = require("mongoose");
const validator = require("validator");

const EnableModuleSchema = new mongoose.Schema({
  drawings: { type: Boolean, default: false },
  pAndM: { type: Boolean, default: false },
  qaAndQc: { type: Boolean, default: false },
  dashBoard: { type: Boolean, default: true },
  workStatus: { type: Boolean, default: false },
  checkList: { type: Boolean, default: false  },
  site: { type: Boolean, default: true  },
  communication: { type: Boolean, default: false  },
  // mail: { type: Boolean, default: false  },
  // chat: { type: Boolean, default: false  },
  ehs: { type: Boolean, default: false },
  company: { type: Boolean, default: false  },
  task: { type: Boolean, default: false },
  qs: { type: Boolean, default: false },
  planner: { type: Boolean, default: false },
  drawingAddFolder: { type: Boolean,default: false  },
  customizedView: { type: Boolean,default: false  },
  rfiRaised: { type: Boolean,default: false  },
  hr: { type: Boolean, default: false },
  user: { type: Boolean, default: false },
  store: { type: Boolean, default: false},
  admin: { type: Boolean, default: false },
  space: { type: Boolean, default: false  },
});
const PermissionsSchema = new mongoose.Schema({
  location: { type: Boolean, required: true },
  authentication: { type: Boolean, required: true },
});
const SiteLocationDetailsSchema = new mongoose.Schema({
  latitude: {
    type: String,
    required: true,
  },
  longitude: {
    type: String,
    required: true,
  },
  radius: {
    type: String,
    required: true,
  },
});
const ClubhousesSchema = new mongoose.Schema({
  
  numBasements: {
    type: Number,
  },
  noOfPouresForABasement: {
    type: Number,
  },
  numFloors: {
    type: Number,
  },
  noOfPouresForAFloor: {
    type: Number,
  },
  unitName: {
    type: String,
  },
});
const VillaTypeDetailsSchema = new mongoose.Schema({
  villaName: {
    type: String,
  },
  villaType: {
    type: String,
  },
  cellar: {
    type: String,
  },
  floor: {
    type: String,
  },
});
const ApartmentsDetailsSchema = new mongoose.Schema({
  basements: {
    type: String,
    enum: ["Yes", "No"],
  },
  basementsAreCommonForEveryTower: {
    type: String,
    enum: ["Yes", "No"],
  },
  noOfBasements: {
    type: Number,
    required: function () {
      return this.basements === "Yes";
    },
  },
  noOfPouresForBasement: {
    type: Number,
    required: function () {
      return this.basements === "Yes";
    },
  },
  noOfTowers: {
    type: Number,
  },
  noOfClubHouses: {
    type: Number,
  },
  towers: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "Tower",
    },
  ],
  clubhouse: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "clubHouse",
    },
  ],
  amenities: [String],
});
const BuildingsDetailsSchema = new mongoose.Schema({
  basements: {
    type: String,
    enum: ["Yes", "No"],
  },
  noOfBasements: {
    type: Number,
    required: function () {
      return this.basements === "Yes";
    },
  },
  noOfPouresForBasement: {
    type: Number,
    required: function () {
      return this.basements === "Yes";
    },
  },
  amenityAreThere: {
    type: String,
    enum: ["Yes", "No"],
  },

  towers: 
    {
      type: mongoose.Schema.ObjectId,
      ref: "Tower",
    },
   
  
  amenities: [String],
});
const VillasDetailsSchema = new mongoose.Schema({
  villaTypesAreCommonForEveryVillas: {
    type: String,
    enum: ["Yes", "No"],
  },
  selectVillaType: {
    type: String,
  },
  noOfClubHouses: {
    type: Number,
  },
  noOfVillas: {
    type: Number,
  },
  cellarIsThereForVillas: {
    type: String,
    enum: ["Yes", "No"],
  },
  cellarAreCommonForEveryVillas: {
    type: String,
    enum: ["Yes", "No"],
    required: function () {
      return this.cellarIsThereForVillas === "Yes";
    },
  },
  noOfCellarsForVillas: {
    type: Number,
  
  },
  floorsAreCommonForEveryVillas: {
    type: String,
    enum: ["Yes", "No"],
    required: function () {
      return this.cellarIsThereForVillas === "Yes";
    },
  },
  villaTypeDetails: {
    type: [VillaTypeDetailsSchema],
    required: function () {
      return this.cellarAreCommonForEveryVillas === "No" && this.floorsAreCommonForEveryVillas === "No";
    },
  },
  noOfFloorsForVillas: {
    type: Number,
    required: function () {
      return this.cellarIsThereForVillas === "Yes";
    },
  },
  
  // towers: [
  //   {
  //     type: mongoose.Schema.ObjectId,
  //     ref: "Tower",
  //   },
  // ],
  clubhouse: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "clubHouse",
    },
  ],
  amenities: [String],
});


const siteSchema = new mongoose.Schema({
  siteName: {
    type: String,
    required: true,
    unique: true
  },
  siteImage: {
    type: String,
  },
  companyId: {
        type: mongoose.Schema.ObjectId,
        ref: "Company",
      },
  companyKeyWord: {
    type: String,
  },
  siteAddress: {
    type: String,
  },
  cityOrState: {
    type: String,
  },
  country: {
    type: String,
  },
  pinCode: {
    type: String,
  },
  fetureDetails: {
    type: String,
    enum: ["1", "2", "3"],
    required: true,
  },
  initial: {
    type: String,
  },
  during: {
    type: String,
  },
  afterCompletion: {
    type: String,
  },
  enableModules: {
    type: EnableModuleSchema,
  },
  permissions: {
    type: PermissionsSchema,
  },
  siteLocationDetails: {
    type: SiteLocationDetailsSchema,
  },
  
  ventureType: {
    type: String,
    enum: ["Apartments", "Villas", "Highrise or Commercial"],
  },
  apartmentsDetails:{
    type: ApartmentsDetailsSchema,
  },
  villasDetails:{
    type: VillasDetailsSchema,
  },
  buildingsDetails:{
    type: BuildingsDetailsSchema,
  },
  projectId: {
    type: String,
  },
  
 }, {
  timestamps: true // ✅ Adds createdAt and updatedAt fields automatically
});

const Site = mongoose.model("Site", siteSchema);
module.exports = Site;
