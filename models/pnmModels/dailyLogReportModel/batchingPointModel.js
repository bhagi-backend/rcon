const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const batchingPointSchema = new Schema({
  siteName: {
    type: mongoose.Schema.ObjectId,
    ref: "Site",
    required: true
  },
  equipmentType: {
    type: String,
    enum: ["Vehicle", "Machinery", "Power Tools",'Distribution Board','Batching Plant'],
    default: 'Batching Plant',
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
  meterStartReadings: {
    type: Number,
  },
  meterEndReadings: {
    type: Number,
  },
  meterDifference: {
    type: Number,
  },
  Engine2StartReadings: {
    type: Number,
  },
  Engine2EndReadings: {
    type: Number,
  },
  Engine2ReadingsDifference: {
    type: Number,
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
  totalConcreteProduction: {
    type: String,
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
});

const BatchingPoint = mongoose.model("BatchingPoint", batchingPointSchema);

module.exports = BatchingPoint;