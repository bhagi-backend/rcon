const DrawingFolder = require("../../models/drawingModels/drawingFolderModel");
const { catchAsync } = require("../../utils/catchAsync"); 

const ArchitectureToRoRegister = require("../../models/drawingModels/architectureToRoRegisterModel");

exports.createDrawingFolder = catchAsync(async (req, res, next) => {
    const { siteId, folderNames } = req.body; 
    const createdFolders = [];
    const existingFolders = [];
    

    for (const folderName of folderNames) {
        const existingFolder = await DrawingFolder.findOne({ siteId, folderName });
        
        if (existingFolder) {
            return res.status(200).json({
                status: "fail",
                message: `Folder with name ${folderName} already exists for the specified site.`,
            });
        } else {
            const drawingFolder = await DrawingFolder.create({ siteId, folderName });
            createdFolders.push(drawingFolder);
        }
    }

    res.status(201).json({
        status: "success",
        message: "Folder creation process completed.",
        data: {
            createdFolders, 
        },
    });
});


exports.getDrawingFoldersBySiteId = catchAsync(async (req, res, next) => {
    const { siteId } = req.query; 

    const folders = await DrawingFolder.find({ siteId });

    // // If no folders found, return a message
    // if (folders.length === 0) {
    //     return res.status().json({
    //         status: 'fail',
    //         message: 'No drawing folders found for this siteId.',
    //     });
    // }

    // Respond with the found folders
    res.status(200).json({
        status: 'success',
        results: folders.length,
        data: {
            folders,
        },
    });
});


exports.deleteDrawingFolderById = catchAsync(async (req, res, next) => {
    const { id } = req.params; 

    const deletedFolder = await DrawingFolder.findByIdAndDelete(id);

    // If no folder was found, send an error response
    if (!deletedFolder) {
        return res.status(400).json({
            status: 'fail',
            message: 'No drawing folder found with that ID',
        });
    }

    // Send a success response
    res.status(204).json({
        status: 'success',
        data: null, // No content to send back
    });
});

exports.getFilteredDrawingData = catchAsync(async (req, res, next) => {
  const { designConsultantId, siteId, tower, category } = req.query;

  // Validate required params
  if (!designConsultantId || !siteId) {
    return res.status(200).json({
      status: "fail",
      message: "designConsultantId and siteId are required",
    });
  }

  // Base query
  const baseFilter = {
    designDrawingConsultant: designConsultantId,
    siteId,
  };

  let responseData = {};

  // 1️⃣ Case: Only designConsultantId + siteId → Return **towers and categories**
  if (!tower && !category) {
    const records = await ArchitectureToRoRegister.find(baseFilter)
      .select("tower category")
      .populate("category", "_id category");

    const uniqueTowers = [
      ...new Set(records.map((rec) => rec.tower).filter(Boolean)),
    ];

    const uniqueCategories = [
      ...new Map(
        records
          .filter((rec) => rec.category)
          .map((rec) => [
            rec.category._id.toString(),
            {
              _id: rec.category._id,
              category: rec.category.category,
            },
          ])
      ).values(),
    ];

    responseData = {
      towers: uniqueTowers,
      categories: uniqueCategories,
    };
  }

  // 2️⃣ Case: designConsultantId + siteId + tower → Return **categories**
  else if (tower && !category) {
    const records = await ArchitectureToRoRegister.find({
      ...baseFilter,
      tower,
    })
      .select("category")
      .populate("category", "_id category");

    const uniqueCategories = [
      ...new Map(
        records
          .filter((rec) => rec.category)
          .map((rec) => [
            rec.category._id.toString(),
            {
              _id: rec.category._id,
              category: rec.category.category,
            },
          ])
      ).values(),
    ];

    responseData = {
      categories: uniqueCategories,
    };
  }

  // 3️⃣ Case: designConsultantId + siteId + category → Return **towers**
  else if (!tower && category) {
    const records = await ArchitectureToRoRegister.find({
      ...baseFilter,
      category,
    }).select("tower");

    const uniqueTowers = [
      ...new Set(records.map((rec) => rec.tower).filter(Boolean)),
    ];

    responseData = {
      towers: uniqueTowers,
    };
  }

  // 4️⃣ Case: designConsultantId + siteId + tower + category → Return **full records**
  else if (tower && category) {
    const records = await ArchitectureToRoRegister.find({
      ...baseFilter,
      tower,
      category,
    })
      .populate("category", "_id category")
      .populate("designDrawingConsultant", "firstName lastName email");

    responseData = {
      records,
    };
  }

  return res.status(200).json({
    status: "success",
    data: responseData,
  });
});
