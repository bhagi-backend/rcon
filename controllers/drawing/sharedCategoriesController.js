const ArchitectureToRoRegister = require("../../models/drawingModels/architectureToRoRegisterModel");
const { catchAsync } = require("../../utils/catchAsync");
const User = require("../../models/userModel");
const SharedCategories = require("../../models/drawingModels/sharedCategoriesModel");



exports.createOrUpdateSharedCategories = catchAsync(async (req, res, next) => {
  const { siteId, sharedConsultant, sharedCategories } = req.body;

  if (!siteId || !sharedConsultant || !sharedCategories) {
    return res.status(400).json({
      status: "fail",
      message: "siteId, sharedConsultant, and sharedCategories are required.",
    });
  }

  // Step 1: Find existing sharedCategories for given siteId + sharedConsultant
  let existingShared = await SharedCategories.findOne({ siteId, sharedConsultant });

  if (existingShared) {
    // Step 2: Loop through incoming sharedCategories
    sharedCategories.forEach((incomingItem) => {
      const { designDrawingConsultant, category } = incomingItem;

      // Find if the designDrawingConsultant already exists
      const existingConsultant = existingShared.sharedCategories.find(
        (item) => item.designDrawingConsultant.toString() === designDrawingConsultant
      );

      if (existingConsultant) {
        // Merge new categories, avoiding duplicates
        category.forEach((catId) => {
          if (!existingConsultant.category.some((c) => c.toString() === catId)) {
            existingConsultant.category.push(catId);
          }
        });
      } else {
        // Add a new designDrawingConsultant with categories
        existingShared.sharedCategories.push({
          designDrawingConsultant,
          category,
        });
      }
    });

    // Save updated document
    await existingShared.save();

    return res.status(200).json({
      status: "success",
      message: "Shared categories updated successfully.",
      data: existingShared,
    });
  }

  // Step 3: Create a new document if none exists
  const newShared = await SharedCategories.create({
    siteId,
    sharedConsultant,
    sharedCategories,
  });

  return res.status(201).json({
    status: "success",
    message: "Shared categories created successfully.",
    data: newShared,
  });
});



exports.deleteCategory = catchAsync(async (req, res, next) => {
  const { siteId, sharedConsultant, designDrawingConsultant, categoryId } = req.body;

  // Validate input
  if (!siteId || !sharedConsultant || !designDrawingConsultant || !categoryId) {
    return res.status(400).json({
      status: "fail",
      message: "siteId, sharedConsultant, designDrawingConsultant, and categoryId are required.",
    });
  }

  // Step 1: Find the main document
  const sharedDoc = await SharedCategories.findOne({ siteId, sharedConsultant });

  if (!sharedDoc) {
    return res.status(404).json({
      status: "fail",
      message: "No shared categories found for the given siteId and sharedConsultant",
    });
  }

  // Step 2: Find the matching designDrawingConsultant inside sharedCategories
  const consultantEntry = sharedDoc.sharedCategories.find(
    (item) => item.designDrawingConsultant.toString() === designDrawingConsultant
  );

  if (!consultantEntry) {
    return res.status(404).json({
      status: "fail",
      message: "No matching designDrawingConsultant found",
    });
  }

  // Step 3: Remove the category from that consultant's category array
  const initialLength = consultantEntry.category.length;

  consultantEntry.category = consultantEntry.category.filter(
    (cat) => cat.toString() !== categoryId
  );

  if (consultantEntry.category.length === initialLength) {
    return res.status(404).json({
      status: "fail",
      message: "Category not found in the provided designDrawingConsultant",
    });
  }

  // Step 4: If no categories remain for that consultant, remove the consultant entirely
  if (consultantEntry.category.length === 0) {
    sharedDoc.sharedCategories = sharedDoc.sharedCategories.filter(
      (item) => item.designDrawingConsultant.toString() !== designDrawingConsultant
    );
  }

  // Save the updated document
  await sharedDoc.save();

  res.status(200).json({
    status: "success",
    message: "Category deleted successfully",
    data: sharedDoc,
  });
});


// exports.getSharedCategoriesByConsultant = catchAsync(async (req, res, next) => {
//   const { sharedConsultant, siteId } = req.query;

//   if (!sharedConsultant) {
//     return res.status(400).json({
//       status: "fail",
//       message: "sharedConsultant parameter is required.",
//     });
//   }

//   const data = await SharedCategories.find({ siteId, sharedConsultant })
//       .populate("siteId", "siteName") // populate only siteName
//       .populate("sharedConsultant", "firstName email role") // populate shared consultant basic info
//       .populate("sharedCategories.designDrawingConsultant", "firstName email role") // nested population
//       .populate("sharedCategories.category", "category"); // nested population

//   if (!data || data.length === 0) {
//     return res.status(404).json({
//       status: "fail",
//       message: "No shared categories found for this consultant",
//     });
//   }

//   res.status(200).json({
//     status: "success",
//     results: data.length,
//     data,
//   });
// });
exports.getSharedCategoriesByConsultant = catchAsync(async (req, res, next) => {
  const { sharedConsultant, siteId } = req.query;

  if (!sharedConsultant) {
    return res.status(400).json({
      status: "fail",
      message: "sharedConsultant parameter is required.",
    });
  }

  const data = await SharedCategories.find({ siteId, sharedConsultant })
    .populate("siteId", "siteName")
    .populate("sharedConsultant", "firstName email role")
    .populate("sharedCategories.designDrawingConsultant", "firstName email role")
    .populate("sharedCategories.category", "category");

  if (!data || data.length === 0) {
    return res.status(404).json({
      status: "fail",
      message: "No shared categories found for this consultant",
    });
  }

  // ⭐ NEW PART – DO NOT CHANGE ORIGINAL LOGIC
  // Fetch sharedConsultant user
  const user = await User.findById(sharedConsultant).select("permittedSites");

  let drawingEditAccess = false;

  if (user && user.permittedSites && user.permittedSites.length > 0) {
    const site = user.permittedSites.find(
      (s) => String(s.siteId) === String(siteId)
    );

    if (site) {
      drawingEditAccess =
        site.enableModules?.drawingDetails?.drawingEditAccess || false;
    }
  }

  // ⭐ Append new field (not changing existing response)
  const responseData = {
    drawingEditAccess, // <-- added
    records: data,      // <-- original data untouched
  };

  // ⭐ Final response (no changes in "status", "results")
  res.status(200).json({
    status: "success",
    results: data.length,
    data: responseData,
  });
});



exports.getRegistersByCategoryAndState = catchAsync(async (req, res, next) => {
  const { siteId, sharedConsultant, type } = req.query;

  if (!siteId || !sharedConsultant || !type) {
    return res.status(400).json({
      status: "fail",
      message: "siteId, sharedConsultant, and type are required.",
    });
  }

  // 1️⃣ Get the sharedCategories document
  const sharedDoc = await SharedCategories.findOne({ siteId, sharedConsultant });
  if (!sharedDoc) {
    return res.status(404).json({
      status: "fail",
      message: "No shared categories found for this consultant at this site.",
    });
  }

  // 2️⃣ Collect all categories for this consultant
  const allCategories = sharedDoc.sharedCategories.flatMap(sc => sc.category);

  if (!allCategories.length) {
    return res.status(404).json({
      status: "fail",
      message: "No categories found for this consultant at this site.",
    });
  }

  // 3️⃣ Build query condition
  const baseMatch = {
    siteId: siteId,
    category: { $in: allCategories },
  };

  if (type === "Pending") {
    // Pending => acceptedArchitectRevisions array is empty
    baseMatch.acceptedArchitectRevisions = { $size: 0 };
    baseMatch.regState = "Pending";
  } else if (type === "Drawing") {
    // Drawing => acceptedArchitectRevisions has at least 1 item
    baseMatch.acceptedArchitectRevisions = { $exists: true, $not: { $size: 0 } };
    baseMatch.regState = "Drawing";
  } else {
    return res.status(400).json({
      status: "fail",
      message: "Invalid type. Must be either 'Pending' or 'Drawing'.",
    });
  }

  // 4️⃣ Fetch matching records
  const registers = await ArchitectureToRoRegister.find(baseMatch)
    .populate("siteId", "siteName")
    .populate("category", "category")
    .populate("designDrawingConsultant", "firstName email role")
    .populate("createdBy", "firstName email role");

  res.status(200).json({
    status: "success",
    results: registers.length,
    data: registers,
  });
});