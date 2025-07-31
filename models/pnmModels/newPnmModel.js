

const mongoose = require("mongoose");


const DaysSchema = new mongoose.Schema({
  daysType: {
    type: String,
    enum: ["Week", "Month", "Days", "Years"],
    required: true,
  },
  daysCount: {
    type: Number,
    required: true,
  },
});
const PeriodSchema = new mongoose.Schema({
  periodType: {
    type: String,
    enum: ["Hours", "Days", "Weeks", "Months", "Years","Kilometers", "Both Months & Kilometers",],
  },
  hours: {
    type: Number,
  },
  days: {
    type: Number,
  },
  weeks: {
    type: Number,
  },
  months: {
    type: Number,
  },
  kilometers: {
    type: Number,
  },
  years: {
    type: Number,
  },
});

const DocumentSchema = new mongoose.Schema({
  documentName: {
    type: String,
    required: true,
  },
  documentNo: {
    type: String,
    required: true,
  },
  regDate: {
    type: Date,
    required: true,
  },
  expDate: {
    type: Date,
    required: true,
  },
  documentFile: {
    type: String,
  },
});

const newPnmSchema = new mongoose.Schema({
  // Common Fields
  type: {
    type: String,
    enum: ["own", "hire", "transfer"],
    required: true,
  },
  equipmentType: {
    type: String,
    enum: ["Vehicle", "Machinery", "Power Tools", "Distribution Board", "Batching Plant"],
    required: true,
  },
  assetCode: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AssetCode",
    required: true,
  },

  fuelRnot: {
    type: String,
    enum: ["Petrol", "Diesel", "Power"],
    required: true,
  },
  makeName: {
    type: String,
    required: true,
  },
  modelName: {
    type: String,
    required: true,
  },
  inspections: {
    type: String,
    enum: ["Yes", "No", "Not Applicable"],
    required: true,
  },
  inspectionPeriod: {
    type: PeriodSchema,
    // required: function() {
    //   return this.inspections === 'Yes';
    // },
  },
  services: {
    type: String,
    enum: ["Yes", "No", "Not Applicable"],
  },
  servicePeriod: {
    type: PeriodSchema,
    // required: function() {
    //   return this.services === 'Yes';
    // },
  },
  // hours: {
  //   type: Number,
  // },
  // days: {
  //   type: Number,
  // },
  // months: {
  //   type: Number,
  // },
  // kilometers: {
  //   type: Number,
  // },
  engineRmotor: {
    type: String,
    enum: ["Engine", "Motor"],
    required: true,
  },
  selectNo: {
    type: String,
    enum: ["Single", "Double"],
    required: true,
  },
  // Hire details
  hireVendorName: {
    type: String,
  },
  hireVendorNumber: {
    type: String,
  },
  hirePreviousServiceDate: {
    type: Date,
  },
  daysTypeHireHowManyDays: {
    type: String,
    enum: ["Week", "Month", "Days", "Years"],
  },
  daysCountHireHowManyDays: {
    type: Number,
  },
  hireInsurance: {
    type: DaysSchema,
  },
  hireWarranty: {
    type: DaysSchema,
  },
  hireGuarantee: {
    type: DaysSchema,
  },
  hireCharges: {
    type: String,
    enum: ["Daily", "Hourly"],
  },
  hirePrice: {
    type: Number,
  },
  // Own enum
  own: {
    type: String,
    enum: ["Old", "New"],
  },
  // old previous details
  oldPurchaseDate: {
    type: Date,
  },
  oldPreviousPurchasePrice: {
    type: Number,
  },
  oldPreviousServiceDate: {
    type: Date,
  },
  oldInsurance: {
    type: DaysSchema,
  },
  oldWarranty: {
    type: DaysSchema,
  },
  oldGuarantee: {
    type: DaysSchema,
  },
  // new details
  newPurchaseDate: {
    type: Date,
  },
  newPurchasePrice: {
    type: Number,
  },
  newInsurance: {
    type: DaysSchema,
  },
  newWarranty: {
    type: DaysSchema,
  },
  newGuarantee: {
    type: DaysSchema,
  },
  documents: [DocumentSchema],
  status: {
    type: String,
    enum: ["Not Assigned", "Assigned"],
    required: true,
    default: "Not Assigned",
  },
  companyId:
    {
      type: mongoose.Schema.ObjectId,
      ref: "Company",
      required: true
    },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
  createdDate: {
    type: Date,
    default: Date.now,
     
  },
  assignToUser: [{
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },],
});

// function validatePeriodDetails(details, periodType) {
//   if (!details.periodType) return false;
//   const fields = [details.hours, details.days, details.weeks,details.years, details.months, details.kilometers];
//   const nonEmptyFields = fields.filter(field => field != null && field !== 0);

//   if (
//     (details.periodType === 'Hours' && nonEmptyFields.length !== 1) ||
//     (details.periodType === 'Days' && nonEmptyFields.length !== 1) ||
//     (details.periodType === 'Weeks' && nonEmptyFields.length !== 1) ||
//     (details.periodType === 'Months' && nonEmptyFields.length !== 1) ||
//     (details.periodType === 'Kilometers' && nonEmptyFields.length !== 1) ||
//     (details.periodType === 'Years' && nonEmptyFields.length !== 1) ||
//     (details.periodType === 'Both Months & Kilometers' && (details.months == null || details.kilometers == null))
//   ) {
//     return false;
//   }
//   return true;
// }

// newPnmSchema.path('inspectionPeriod').validate(function (value) {
//   if (this.inspections === 'Yes') {
//     return validatePeriodDetails(value);
//   }
//   return true;
// }, 'inspectionPeriod and exactly one of Hours, Days, Weeks, Months,years or Kilometers must be provided when inspections is Yes.');

// newPnmSchema.path('servicePeriod').validate(function (value) {
//   if (this.services === 'Yes') {
//     return validatePeriodDetails(value);
//   }
//   return true;
// }, 'servicePeriod and exactly one of Hours, Days, Weeks, Months, or Kilometers must be provided when services is Yes.');

// // Custom validation to ensure hire-related fields are required if ownRhire is 'Hire'
// newPnmSchema.path("type").validate(function (value) {
//   if (value === "Hire") {
//     return (
//       this.hireVendorName &&
//       this.hirePreviousServiceDate &&
//       this.daysTypeHireHowManyDays &&
//       this.daysCountHireHowManyDays != null &&
//       this.hireCharges &&
//       this.hirePrice != null
//     );
//   }
//   if (value === "own") {
//     return !!this.own;
//   }
//   return true;
// }, "hireVendorName, hirePreviousServiceDate, daysTypeHireHowManyDays, daysCountHireHowManyDays, hireCharges, and hirePrice are required if type is Hire. OWN is required if type is Own.");

// // Custom validation to ensure old-related fields are required if own is 'Old' and new-related fields if 'New'
// newPnmSchema.path('own').validate(function (value) {
//   if (value === 'Old') {
//     return (
//       this.oldPurchaseDate != null &&
//       this.oldPreviousPurchasePrice != null &&
//       this.oldPreviousServiceDate != null 
//     );
//   }
//   if (value === 'New') {
//     return (
//       this.newPurchaseDate != null &&
//       this.newPurchasePrice != null 
//     );
//   }
//   return true;
// }, 'Fields related to old or new ownership must be filled out based on the own value.');


const NewPnm = mongoose.model("NewPnm", newPnmSchema);

module.exports = NewPnm;