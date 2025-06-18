const DrawingFolder = require("../../models/drawingModels/drawingFolderModel");
const { catchAsync } = require("../../utils/catchAsync"); 

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