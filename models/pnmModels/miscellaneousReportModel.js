const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const MiscellaneousReportSchema = new Schema({
  siteName: {
    type: mongoose.Schema.ObjectId,
    ref: "Site",
    required: true
  },
  equipmentType: {
    type: String,
    enum: ["Vehicle", "Machinery", "Power Tools",'Distribution Board','Batching Plant'],
    required: true
  },
  transitionId: {
    type: String,
    unique: true
  },

  transitionDate: {
    type: Date,
    required: true,
  }, 
 
  assetCode: {
    type: Schema.Types.ObjectId,
    ref: "AssetCode",
    required: true
  },
  
  makeName: {
    type: String,
    required: true,
  },
  model: {
    type: String,
    required: true,
  },
  vendor: {
    type: String,
    required: true,
  },
  mobileNo: {
    type: String,
    required: true,
  },
  selectRateType: {
    type: String,
    enum: ["Day", "Week", "Hour"],
    required: true,
  },
  rateCharge: {
    type: String,
    required: true,
  },
  vehicleNo: {
    type: String,
    required: true,
  },
  
  
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  differenceDate: {
    type: String,
    required: true,
  },
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
  differenceTime: {
    type: String,
    required: true,
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
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  remarks: {
    type: String,
    required: true,
  },
  
});




const MiscellaneousReport = mongoose.model("MiscellaneousReport", MiscellaneousReportSchema);

module.exports = MiscellaneousReport;