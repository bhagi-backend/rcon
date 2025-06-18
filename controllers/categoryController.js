const Category = require('../models/drawingModels/categoryModel');
const express = require("express");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync").catchAsync;
const ArchitectureToRoRegister = require("../models/drawingModels/architectureToRoRegisterModel");
const AssignCategoriesToDesignDrawingConsultant = require('../models/drawingModels/assignCategoriesToDesignConsultantModel');

exports.createCategories = catchAsync(async (req, res, next) => {
    const categoriesArray = req.body;

    if (!Array.isArray(categoriesArray)) {
        return res.status(400).json({ error: 'Request body should be an array' });
    }

    const savedCategories = [];

    for (let i = 0; i < categoriesArray.length; i++) {
        const { category } = categoriesArray[i];

        try {
            // Create a new object for each category
            const newCategory = new Category({ category });

            // Save the new object to the database
            const savedCategory = await newCategory.save();
            savedCategories.push(savedCategory);
        } catch (err) {
            console.error('Error saving planner category:', err);
            return res.status(400).json({ error: 'Failed to save planner category' });
        }
    }

    res.status(201).json({
        status: 'success',
        data: savedCategories
    });
});

// Get all planner categories
exports.getAllCategories = catchAsync(async (req, res, next) => {
    const categories = await Category.find();

    res.status(200).json({
        status: 'success',
        data: {
            categories,
        },
    });
});
exports.deleteCategory = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const categories = await Category.findById(id);
    if (!categories) {
        return next(new AppError('No category found with that ID', 404));
    }
const category = id;
const categoryName= categories.category;
    const isCategoryInUse = await ArchitectureToRoRegister.findOne({
        category
      });
      if (isCategoryInUse) {
        return res.status(200).json({
          status: 'fail',
          message: `Category ${categoryName} is currently in use in the ArchitectureToRoRegister and cannot be deleted.`
        });
      }
      const isCategoryAssigned = await AssignCategoriesToDesignDrawingConsultant.findOne({ categories: id });
      if (isCategoryAssigned) {
          return res.status(200).json({
              status: 'fail',
              message: `Category ${categoryName} is  assigned to Design Consultant and cannot be deleted.`
          });
      }
      
     
    const category1 = await Category.findByIdAndDelete(id);
    res.status(204).json({
        status: 'success',
        data: null
    });
});
