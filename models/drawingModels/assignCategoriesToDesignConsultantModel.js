const mongoose = require("mongoose");
const validator = require("validator");

const assignCategoriesToDesignDrawingConsultantSchema = new mongoose.Schema({
 
    designDrawingConsultant: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
       
    },

    categories: [{
        type: mongoose.Schema.ObjectId,
        ref: "Category",
    },],
});

const AssignCategoriesToDesignDrawingConsultant = mongoose.model('AssignCategoriesToDesignDrawingConsultant', assignCategoriesToDesignDrawingConsultantSchema);
module.exports = AssignCategoriesToDesignDrawingConsultant;