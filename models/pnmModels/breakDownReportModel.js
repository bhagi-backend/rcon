const mongoose = require("mongoose");
const Schema = mongoose.Schema;


const vehicleAndMachinerySchema = new mongoose.Schema({
  mechanic:{
    type: String
  },
  firstKmOrHrMeter:{
    type: String
  },
  secondKmOrHrMeter:{
    type: String
  },
  repeatedProblem:{
    type: String,
    enum: ["Yes", "No","Not Applicable"],
  },
  leakages:{
    type: String,
    enum: ["Yes", "No","Not Applicable"],
  },
  fuelPumpSystem:{
    type: String,
    enum: ["Ok", "Not","Not Applicable"],
  },
  fuelPumpStatus:{
    type: String,
    enum: ["Ok", "Not","Not Applicable"],
  },
  tyreStatus:{
    type: String,
    enum: ["Ok", "Not","Not Applicable"],
  },
  
  gasOrOilCondition:{
    type: String,
    enum: ["Ok", "Not","Not Applicable"],
    },
    
    engineOrMotorStatus:{
      type: String,
      enum: ["Ok", "Not","Not Applicable"],
    },
    
    radiatorStatus:{
      type: String,
      enum: ["Ok", "Not","Not Applicable"],
    },
    batteryStatus:{
      type: String,
    enum: ["Ok", "Not","Not Applicable"],
    },

spareCost: {

  type: Number,
},
serviceCost: {

  type: Number,
},
totalCost: {

  type: Number,
},
sparesUsed: {
  type: String,
},
remarks:{
type: String
},

});

const powerToolSchema = new mongoose.Schema({
  mechanic:{
    type: String
  },
  deadManSwitch:{
    type: String
  },
  machineHandleCondition:{
    type: String,
    enum: ["Ok", "Not","Not Applicable"],
  },
  machineCableCondition:{
    type: String,
    enum: ["Ok", "Not","Not Applicable"],
  },
  repeatedProblem:{
    type: String,
    enum: ["Yes", "No","Not Applicable"],
  },
  wheelGuardCondition:{
    type: String,
    enum: ["Ok", "Not","Not Applicable"],
  },
  spareCost: {

  type: Number,
},
serviceCost: {

  type: Number,
},
totalCost: {

  type: Number,
},
sparesUsed: {
  type: String,
},
remarks:{
type: String
},

});
const batchingPointSchema = new mongoose.Schema({
  weighingSystem:{
    type: String,
    enum: ["Ok", "Not","Not Applicable"],
  },
  concreteMixerSystem:{
    type: String,
    enum: ["Ok", "Not","Not Applicable"],
  },
  dustCollectors:{
    type: String,
    enum: ["Ok", "Not","Not Applicable"],
  },
  storageSilasSystem:{
    type: String,
    enum: ["Ok", "Not","Not Applicable"],
  },
  screwConveyor:{
    type: String,
    enum: ["Ok", "Not","Not Applicable"],
  },
  fourBinFeederSystem:{
    type: String,
    enum: ["Ok", "Not","Not Applicable"],
  },
  PlcControlSystem:{
    type: String,
    enum: ["Ok", "Not","Not Applicable"],
  },
  airCompressorSystem:{
    type: String,
    enum: ["Ok", "Not","Not Applicable"],
  },
  firstMeter:{
    type: String
  },
  secondMeter:{
    type: String
  },
  mechanic:{
    type: String
  },
  
 
  repeatedProblem:{
    type: String,
    enum: ["Yes", "No"],
  },
  
  spareCost: {

  type: Number,
},
serviceCost: {

  type: Number,
},
totalCost: {

  type: Number,
},
sparesUsed: {
  type: String,
},
remarks:{
type: String
},

});
const distributionBoardSchema = new mongoose.Schema({
  mechanic:{
    type: String
  },
  bodyEarthing:{
    type: String
  },
  mcbAndRcbCondition:{
    type: String,
    enum: ["Ok", "Not","Not Applicable"],
  },
  threePhaseIndicatorLight:{
    type: String,
    enum: ["Ok", "Not","Not Applicable"],
  },
  repeatedProblem:{
    type: String,
    enum: ["Yes", "No","Not Applicable"],
  },

  voltageIndicatorDisplay:{
    type: String,
    enum: ["Ok", "Not","Not Applicable"],
  },
  spareCost: {

  type: Number,
},
serviceCost: {

  type: Number,
},
totalCost: {

  type: Number,
},
sparesUsed: {
  type: String,
},
remarks:{
type: String
},

});

const breakDownReportSchema = new Schema({
  siteName: {
    type: mongoose.Schema.ObjectId,
    ref: "Site",
  },
  transitionId: {
    type: String,
    unique: true
  },
  transitionDate: {
    type: Date,
    required: true
  },
  equipmentType: {
    type: String,
    enum: ["Vehicle", "Machinery", "Power Tools",'Distribution Board','Batching Plant'],
    required: true
  },
  assetCode: {
    type: mongoose.Schema.ObjectId,
    ref: "AssetCode",
    required: true
  },
  type: {
    type: String,
    enum: ['Hire', 'Own'],
    required: true
  },
  subCode: {
    type: String,
    required: true
  },
  model: {
    type: String,
    required: true
  },
  breakDownType: {
    type: String,
    enum: ['BreakDown', 'General Service','Service'],
    required: true
  },
  
  breakDownDate: {
    type: Date,
    required: true
  },
  breakDownTime: {
    type: String,
    required: true
  },
  repairDate: {
    type: Date,
    required: true
  },
  repairTime: {
  type: String,
  required: true
  },
  repairStatus: {
    type: String,
    enum: ["Ok for use", "Not for use"],
    required: true
  },
  mechIncharge: {
    type: String ,
    required: true
   },
   issue: {
    type: String ,
    required: true
   },
   actionTaken:  {
    type: String,
    required: true
  },
  vehicleAndMachineryQueriesDetails: {
    type: vehicleAndMachinerySchema,
  },
  powerToolsQueriesDetails: {
    type: powerToolSchema,
  },
  batchingPointQueriesDetails: {
    type: batchingPointSchema,
  },
  distributionBoardQueriesDetails: {
    type: distributionBoardSchema,
  },
  
  documentAttached:{
    type: String
    },
});
const BreakDownReport = mongoose.model("BreakDownReport", breakDownReportSchema);

module.exports = BreakDownReport;
