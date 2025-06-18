const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const powerToolSchema = new Schema({
  siteName: {
    type: mongoose.Schema.ObjectId,
    ref: "Site",
    required: true
  },
  equipmentType: {
    type: String,
    enum: ["Vehicle", "Machinery", "Power Tools",'Distribution Board','Batching Plant'],
    default: 'Power Tools',
    required: true
  },
  type: {
    type: String,
    enum: ['Hire', 'Own'],
    required: true
  },
  assetCode: {
    type: mongoose.Schema.ObjectId,
    ref: "AssetCode",
    required: true
  },
  // name: {
  //   type: mongoose.Schema.ObjectId,
  //   ref: "AssetCode",
  //   required: true
  // },
  subCode: {
    type: String,
  },
  
  transitionId: {
    type: String,
    unique: true
  },
  transitionDate: {
    type: Date,
  },
  
  issuedEmployeeType: {
    type: String,
  },
  issuedEmployeeId: {
    type: String,
  },
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
  },
  differenceDate: {
    type: String,
  },
  startTime: {
    type: String,
  },
  endTime: {
    type: String,
  },
  differenceTime: {
    type: String,
  },
  fuelType: {
    type: String,
    enum: ['Petrol', 'Diesel','Power'],
  },
  oil: {
    type: Number
  },
  oilIn: {
    type: String,
    enum: ['Litre', 'Gallon'],
  },
  debitNote: {
    type: String,
    enum: ["Yes", "No"],
    default: "No",
  },
  employeeType: {
    type: String,
    required: function() {
      return this.debitNote === 'Yes';
    }
  },
  employeeId: {
    type: String,
    required: function() {
      return this.debitNote === 'Yes';
    }
  },
  debitAmount: {
    type: String,
    required: function() {
      return this.debitNote === 'Yes';
    }
  },
  debitReason: {
    type: String,
    required: function() {
      return this.debitNote === 'Yes';
    }
  },
  scopeOfWorkDetails: {
    type: String,
  },
  location: {
    type: String,
  },
  remarks: {
    type: String,
  },
  
});



const PowerTool = mongoose.model("PowerTool", powerToolSchema);

module.exports = PowerTool;