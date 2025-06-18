const mongoose = require("mongoose");
const validator = require("validator");
const express = require("express");
const checklistformSchema = new mongoose.Schema({
  heading: {
    type: String,
    required: true, 
    trim: true, 
    minlength: [3, "Heading must be at least 3 characters long"],
    maxlength: [100, "Heading must be less than 100 characters long"]
  },
  description: [{
    type: String,
    trim: true,
    minlength: [3, "Description must be at least 3 characters long"],
    maxlength: [500, "Description must be less than 500 characters long"]
  }],
  category: {
    type: String,
    enum: ["Finishing", "Structural", "Others"],
    required: true
  },
  department: {
    type: String,
    enum: [
      "Management",
      "Execution",
      "Planning",
      "SiteManagement",
      "QualitySurveyorBilling",
      "MEP",
      "EHS",
      "CRMTECH",
      "Store",
      "Survey",
      "Accounts",
      "Admin",
    ],
    required: true
  },
  formid: {
    type: String,
    unique: true
  }
});


checklistformSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await mongoose.model('Checklistform').countDocuments();
    const categoryPrefix = this.category.substring(0, 2).toUpperCase();
    const departmentPrefix = this.department.substring(0, 2).toUpperCase();
    this.formid = `${categoryPrefix}${departmentPrefix}${count + 1}`;
  }
  next();
});

const Checklistform = mongoose.model("Checklistform", checklistformSchema);
module.exports = Checklistform;