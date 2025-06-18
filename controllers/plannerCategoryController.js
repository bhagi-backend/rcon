const PlannerCategory = require('../models/plannerCategoryModel');
const express = require("express");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync").catchAsync;

exports.createPlannerCategories = catchAsync(async (req, res, next) => {
    const categoriesArray = req.body;

    if (!Array.isArray(categoriesArray)) {
        return res.status(400).json({ error: 'Request body should be an array' });
    }

    const savedCategories = [];

    for (let i = 0; i < categoriesArray.length; i++) {
        const { name } = categoriesArray[i];

        try {
            // Create a new object for each category
            const newCategory = new PlannerCategory({ name });

            // Save the new object to the database
            const savedCategory = await newCategory.save();
            savedCategories.push(savedCategory);
        } catch (err) {
            console.error('Error saving planner category:', err);
            return res.status(500).json({ error: 'Failed to save planner category' });
        }
    }

    res.status(201).json({
        status: 'success',
        data: savedCategories
    });
});

// Get all planner categories
exports.getAllPlannerCategories = catchAsync(async (req, res, next) => {
    const categories = await PlannerCategory.find();

    res.status(200).json({
        status: 'success',
        data: {
            categories,
        },
    });
});
exports.deletePlannerCategory = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const category = await PlannerCategory.findByIdAndDelete(id);

    if (!category) {
        return next(new AppError('No category found with that ID', 404));
    }

    res.status(204).json({
        status: 'success',
        data: null
    });
});
