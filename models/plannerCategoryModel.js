const mongoose = require("mongoose");
const validator = require("validator");

const plannerCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
});

const PlannerCategory = mongoose.model('PlannerCategory', plannerCategorySchema);
module.exports = PlannerCategory;