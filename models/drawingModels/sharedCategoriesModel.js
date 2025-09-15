const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const sharedCategoriesSchema = new mongoose.Schema({
    designDrawingConsultant: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
 
  category: [{
    type: mongoose.Schema.ObjectId,
    ref: "Category",
  },],
  
  
});
// Define the PendingRegisters Schema
const sharedSchema = new Schema({
  siteId: {
    type: mongoose.Schema.ObjectId,
    ref: "Site",
  },
 
  sharedConsultant: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
  },
 
 

  creationDate: {
    type: Date,
    default: Date.now
  },
  
  sharedCategories: {
    type: [sharedCategoriesSchema],
    
  },

});
// Create the PendingRegisters model
const sharedCategories = mongoose.model('sharedCategories', sharedSchema);

module.exports = sharedCategories;
