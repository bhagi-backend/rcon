//const ArchitectureToRoSelectionRegister = require('../models/drawingModels/architectureToRoSelectionRegisterModel');
const ArchitectureToRoRegister = require("../../models/drawingModels/architectureToRoRegisterModel");
const Category = require('../../models/drawingModels/categoryModel');
const AssignCategoriesToDesignConsultant = require('../../models/drawingModels/assignCategoriesToDesignConsultantModel');
const AppError = require("../../utils/appError.js");
const User = require('../../models/userModel.js');
const catchAsync = require("../../utils/catchAsync").catchAsync;


exports.getAllRegisters = catchAsync(async (req, res, next) => {
  try {
    const categories = await Category.find();
    const designDrawingConsultants = await User.find({department:"Design Consultant"});

    res.status(200).json({
      status: 'success',
      results: {
        categories: categories.length,
        designDrawingConsultants: designDrawingConsultants.length
      },
      data: {
        categories,
        designDrawingConsultants
      }
    });
  } catch (err) {
    return next(new AppError('Failed to fetch registers', 500));
  }
});

exports.selectionRegister = catchAsync(async (req, res, next) => {
  const { selectionType, categories ,assignCategoriesToDesignDrawingConsultant} = req.body;

  if ((!selectionType&& !categories)||(!selectionType&&!assignCategoriesToDesignDrawingConsultant )) {
    return next(new AppError('Invalid data format. Must provide selectionType and either categories or designDrawingConsultants or assignCategoriesToDesignDrawingConsultant ', 400));
  }
  if (selectionType === 'category') {
    if (!Array.isArray(categories) || categories.length === 0) {
      return next(new AppError('Categories must be provided when selectionType is "category"', 400));
    }
  
    const savedCategories = [];
  
    for (let i = 0; i < categories.length; i++) {
      const { category } = categories[i];
  
      if (!category) {
        return next(new AppError('Category name is required', 400));
      }
      const upperCaseCategory = category.toUpperCase();
      
      try {
        
        const newCategory = new Category({ category: upperCaseCategory });
        const savedCategory = await newCategory.save();
        savedCategories.push(savedCategory);
  
      } catch (err) {
      
        if (err.code === 11000) {
          res.status(200).json({
            status: 'fail',
            message: { error: `Category '${upperCaseCategory}' already exists` },
          
          });
         
        }
  
        console.error('Error saving category:', err);
        return res.status(500).json({ error: 'Failed to save category' });
      }
    }
  
    res.status(201).json({
      status: 'success',
      data: savedCategories
    });
  }
  

  if (selectionType === 'assignCategoriesToDesignDrawingConsultant') {
    const { designDrawingConsultant, categories } = assignCategoriesToDesignDrawingConsultant;

    if (!designDrawingConsultant || !categories || !Array.isArray(categories) || categories.length === 0) {
      return next(new AppError('Design Drawing Consultant and Categories are required.', 400));
    }

    try {
      
      const existingAssignment = await AssignCategoriesToDesignConsultant.findOne({ designDrawingConsultant });

      if (existingAssignment) {
        
        const existingCategoryIds = existingAssignment.categories.map(cat => cat.toString());

  
        const newCategories = categories.filter(
          category => !existingCategoryIds.includes(category.toString())
        );
        existingAssignment.categories.push(...newCategories);

        const updatedAssignment = await existingAssignment.save();

        res.status(200).json({
          status: 'success',
          data: updatedAssignment
        });
      } else {
       
        const newAssignment = new AssignCategoriesToDesignConsultant({
          designDrawingConsultant,
          categories
        });

        const savedAssignment = await newAssignment.save();

        res.status(201).json({
          status: 'success',
          data: savedAssignment
        });
      }
    } catch (err) {
      console.error('Error assigning categories to design drawing consultant:', err);
      return res.status(500).json({ error: err.message });
    }
  }
});
  

 
exports.handleValidationError = (err, req, res, next) => {
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(el => el.message);
    return res.status(400).json({
      status: 'fail',
      message: `Invalid data. ${errors.join('. ')}`,
    });
  }
  next(err); 
};


const mongoose = require('mongoose');

exports.getAllCategoriesAssignments = catchAsync(async (req, res, next) => {
  try {
    let { designDrawingConsultantId } = req.query;

    if (designDrawingConsultantId) {
      // Trim whitespace and validate ObjectId format
      designDrawingConsultantId = designDrawingConsultantId.trim();

      if (!mongoose.Types.ObjectId.isValid(designDrawingConsultantId)) {
        return next(new AppError('Invalid designDrawingConsultantId format', 400));
      }
    }

    const query = {};

    if (designDrawingConsultantId) {
      query.designDrawingConsultant = designDrawingConsultantId;
    }

    const allCategories = await Category.find();
    if (!allCategories || allCategories.length === 0) {
      return next(new AppError('No categories found', 404));
    }

    const assignments = await AssignCategoriesToDesignConsultant.find(query)
      .populate('categories')
      .populate('designDrawingConsultant');

    //console.log('Assignments:', assignments);

    if (!designDrawingConsultantId) {
      return res.status(200).json({
        status: 'success',
        data: {
          assignments
        }
      });
    }

    const assignedCategoryIds = assignments.flatMap(assignment =>
      assignment.categories ? assignment.categories.map(category => category._id.toString()) : []
    );

    //console.log('Assigned Category IDs:', assignedCategoryIds);

    const assignedCategories = allCategories.filter(category => assignedCategoryIds.includes(category._id.toString()));
    const unassignedCategories = allCategories.filter(category => !assignedCategoryIds.includes(category._id.toString()));

    res.status(200).json({
      status: 'success',
      data: {
        assignedCategories,
        unassignedCategories
      }
    });
  } catch (err) {
    console.error('Error in getAllCategoriesAssignments:', err); // More detailed logging
    return next(new AppError('Failed to fetch categories and assignments', 500));
  }
});


exports.deleteCategoryFromConsultant = async (req, res, next) => {
  const { designDrawingConsultant, categories } = req.query; // Use req.query to get parameters

  if (!designDrawingConsultant || !categories) {
    return next(new AppError('Design Drawing Consultant and Category ID are required.', 400));
  }

  try {
    const isCategoryInUse = await ArchitectureToRoRegister.findOne({
      category: categories
    });

    if (isCategoryInUse) {
      return res.status(200).json({
        status: 'fail',
        message: `Category ${categories} is currently in use in the ArchitectureToRoRegister and cannot be deleted.`
      });
    }
    const existingAssignment = await AssignCategoriesToDesignConsultant.findOne({ designDrawingConsultant });

    if (!existingAssignment) {
      return res.status(404).json({
        status: 'error',
        message: `No assignment found for design drawing consultant ${designDrawingConsultant}`
      });
    }

    // Filter out the category to delete
    const updatedCategories = existingAssignment.categories.filter(
      cat => cat.toString() !== categories
    );

    if (updatedCategories.length === existingAssignment.categories.length) {
      return res.status(404).json({
        status: 'error',
        message: `Category  ${categories} not found in the assignment`
      });
    }

    existingAssignment.categories = updatedCategories;
    const updatedAssignment = await existingAssignment.save();

    res.status(200).json({
      status: 'success',
      data: updatedAssignment
    });
  } catch (err) {
    console.error('Error deleting category from design drawing consultant:', err);
    return res.status(500).json({ error: err.message });
  }
};
exports.addAssignFormatsForConsultant = catchAsync(async (req, res, next) => {
  const assignments = req.body; // Expecting an array of objects [{ userId, siteId, formats }, ...]

  if (!Array.isArray(assignments) || assignments.length === 0) {
    return res.status(400).json({
      status: 'fail',
      message: 'Assignments must be provided as a non-empty array of objects.',
    });
  }

  const updatedUsers = [];

  for (const assignment of assignments) {
    const { userId, siteId, formats } = assignment;

    const user = await User.findById(userId);

    if (!user) {
      continue; // Skip if user is not found
    }

    // Check if siteId already exists in assignFormatsForConsultant
    const existingAssignment = user.assignFormatsForConsultant.find(
      (entry) => entry.siteId.toString() === siteId.toString()
    );

    if (existingAssignment) {
      // Update formats if siteId already exists
      existingAssignment.formats = formats;
    } else {
      // Add new assignment if siteId is not present
      user.assignFormatsForConsultant.push({ siteId, formats });
    }

    // Save changes
    await user.save();
    updatedUsers.push(user);
  }

  if (updatedUsers.length === 0) {
    return res.status(404).json({
      status: 'fail',
      message: 'No users were found or updated.',
    });
  }

  res.status(200).json({
    status: 'success',
    message: 'Assignments added/updated successfully.',
    data: updatedUsers,
  });
});


exports.removeFormatFromConsultant = catchAsync(async (req, res, next) => {
    const { siteId, format } = req.body;
    const userId = req.params.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found.',
      });
    }

    // Find the specific assignment by siteId
    const assignment = user.assignFormatsForConsultant.find(
      (assignment) => assignment.siteId.toString() === siteId
    );

    if (!assignment) {
      return res.status(404).json({
        status: 'fail',
        message: 'Assignment with the specified Site ID not found.',
      });
    }

    // Remove the format from the formats array
    const formatIndex = assignment.formats.indexOf(format);
    if (formatIndex === -1) {
      return res.status(404).json({
        status: 'fail',
        message: 'Format not found in the specified assignment.',
      });
    }

    assignment.formats.splice(formatIndex, 1);

    // Save the updated user document
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Format removed successfully.',
      data: user,
    });
  
});

exports.getFormatsByUserAndSite = catchAsync(async (req, res, next) => {
  const { siteId } = req.query;

  if (!siteId) {
    return res.status(400).json({
      status: "fail",
      message: "Site ID is required.",
    });
  }

  const siteObjectId = new mongoose.Types.ObjectId(siteId);

  // Fetch users who belong to the Design Consultant department and have the given siteId in permittedSites
  const users = await User.find({
    department: "Design Consultant",
    "permittedSites.siteId": siteObjectId,
  });

  if (users.length === 0) {
    return res.status(404).json({
      status: "fail",
      message: "No consultants found for the given siteId.",
    });
  }

  // Extract formats for each user
  const formatsByUsers = users.map(user => {
    const assignment = user.assignFormatsForConsultant.find(
      (assignment) => assignment.siteId.toString() === siteId
    );

    return {
      userId: user._id,
      name: user.firstName, 
      role: user.role,
      formats: assignment ? assignment.formats : [],
    };
  });

  res.status(200).json({
    status: "success",
    data: formatsByUsers,
  });
});

exports.getConsultants = catchAsync(async (req, res, next) => {
  const siteId  = req.params.id;

  if (!siteId) {
    return res.status(400).json({
      status: "fail",
      message: "siteId query parameter is required",
    });
  }

  const users = await User.find({
    "permittedSites.siteId": siteId,
    department: "Design Consultant",
  })  .select("firstName role")
  res.status(200).json({
    status: "success",
    results: users.length,
    data: {
      users,
    },
  });
});
