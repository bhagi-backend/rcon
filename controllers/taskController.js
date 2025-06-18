const Task = require("../models/taskModel");
const WorkSequences = require("../models/workSequenceModel");
const WorkSequenceDoc = require("../models/workSequenceDocumentModel");
const Units = require("../models/unitModel");
const Floors = require("../models/floorModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync").catchAsync;


// exports.createTask = catchAsync(async (req, res, next) => {
//     const taskData = req.body;

//     if (!Array.isArray(taskData)) {
//         return next(new AppError('Request body should be an array', 400));
//     }

//     const createdTasks = [];

//     for (let i = 0; i < taskData.length; i++) {
//         const doc = taskData[i];

//         if (!doc.workSequenceId) {
//             return next(new AppError(`Invalid data format at index ${i}`, 400));
//         }

//         const newTask = new Task({
//             workSequenceId: doc.workSequenceId,
//             startDate: doc.startDate,
//             endDate: doc.endDate,
//             duration: doc.duration,
//             unitId: doc.unitId
//         });

//         const savedTask = await newTask.save();
//         createdTasks.push(savedTask);
//     }

//     res.status(201).json({
//         status: 'success',
//         data: {
//             documents: createdTasks
//         }
//     });
// });

// exports.getTrackerDetails = catchAsync(async (req, res, next) => {
//     if(req.query.siteid){
//         let trackerDetails;
//         if(req.query.category){
//             trackerDetails = await WorkSequences.find({ siteId: req.query.siteid, category: req.query.category });
//         } else {
//             trackerDetails = await WorkSequences.find({ siteId: req.query.siteid });
//         }

//         const dataToSend = []

//         const units = await Units.find({ siteId: req.query.siteid }).select("unitId name floorId").populate("floorId")

//         for (const element of trackerDetails) {
//             const unitsWithDetails = await Promise.all(units.map(async (unit) => {
//                 const taskDetails = await Task.findOne({ unitId: unit.id, workSequenceId: element.id });
//                 let startDate = '';
//                 let endDate = '';
//                 let progress = 0;
//                 if (taskDetails) {
//                     startDate = taskDetails.startDate;
//                     endDate = taskDetails.endDate;
//                     // TODO: CHANGE LOGIC: fetch by keeping logic (( number of documents uploaded / number of documents required for this task ) *100 )
//                     const workSequenceDocumentsReq = await WorkSequenceDoc.findOne({ workSequenceId: element.id });
//                     if(workSequenceDocumentsReq){
//                         progress = workSequenceDocumentsReq.checklists.length*10;
//                     }
//                 }
        
//                 return {
//                     unitid: unit.id,
//                     unitName: unit.name,
//                     floorName: unit.floorId.name,
//                     startDate: startDate,
//                     endDate: endDate,
//                     progress: progress
//                 };
//             }));
        
//             dataToSend.push({
//                 [element.name]: {
//                     units: unitsWithDetails
//                 }
//             });
//         }

//         res.status(200).json({
//             status: "success",
//             data: dataToSend,
//         });
//     }else{
//         res.status(500).json({
//             status: "error",
//             body: {
//                 "message": "siteid is required",
//             },
//         });
//     }
// });

// exports.getTrackerDetailsForFloor = catchAsync(async (req, res, next) => {
//     if(req.query.siteid){
//         let trackerDetails;
//         if(req.query.category){
//             trackerDetails = await WorkSequences.find({ siteId: req.query.siteid, category: req.query.category });
//         } else {
//             trackerDetails = await WorkSequences.find({ siteId: req.query.siteid });
//         }

//         const dataToSend = []

//         const floors = await Floors.find({ siteId: req.query.siteid }).populate("units")

//         for (const element of trackerDetails) {
//             const floorsWithDetails = await Promise.all(floors.map(async (floor) => {
//                 let startDate = '';
//                 let endDate = '';
//                 let progress = 0;
//                 const unitDetails = [];

//                 for(const unit of floor.units){
//                     const taskDetails = await Task.findOne({ unitId: unit.id, workSequenceId: element.id });
//                      if (taskDetails) {
//                         let unitProgress = 0
//                         if (!startDate || new Date(taskDetails.startDate) < new Date(startDate)) {
//                             startDate = taskDetails.startDate;
//                         }

//                         if(!endDate || new Date(taskDetails.endDate) > new Date(endDate)){
//                             endDate = taskDetails.endDate;
//                         }

//                         // TODO: floor level progress track by documents logic on unit level ( based on checlist submit model )

//                         const workSequenceDocumentsReq = await WorkSequenceDoc.findOne({ workSequenceId: element.id });
//                         if(workSequenceDocumentsReq){
//                             unitProgress = workSequenceDocumentsReq.checklists.length*10;
//                         }

//                         progress = progress + unitProgress;

//                         unitDetails.push({
//                             startDate: taskDetails.startDate,
//                             unitid: unit.id,
//                             endDate: taskDetails.endDate,
//                             progress: unitProgress
//                         })
//                      } else {
//                         unitDetails.push({
//                             startDate: '',
//                             unitid: unit.id,
//                             endDate: '',
//                             progress: 0
//                         })
//                      }
//                 }

//                 progress = ( progress ) / ( floor.units.length )
        
//                 return {
//                     floor: floor.id,
//                     floorName: floor.name,
//                     units: unitDetails,
//                     startDate: startDate,
//                     endDate: endDate,
//                     progress: progress
//                 };
//             }));
        
//             dataToSend.push({
//                 [element.name]: {
//                     floors: floorsWithDetails
//                 }
//             });
//         }

//         res.status(200).json({
//             status: "success",
//             data: dataToSend,
//         });
//     }else{
//         res.status(500).json({
//             status: "error",
//             body: {
//                 "message": "siteid is required",
//             },
//         });
//     }
// });

// exports.getAllTasks = catchAsync(async (req, res, next) => {
//     const tasks = await Task.find({}).populate('workSequenceId').populate('unitId');
//     res.status(200).json({
//         status: "success",
//         data: {
//             tasks,
//         },
//     });
// });

// exports.getTask = catchAsync(async (req, res, next) => {
//     const task = await Task.findById(req.params.id).populate('workSequenceId').populate('unitId');

//     if (!task) {
//         return next(new AppError("No task found with that ID", 404));
//     }

//     res.status(200).json({
//         status: "success",
//         data: {
//             task,
//         },
//     });
// });
// exports.getTaskByWorkSequenceId = catchAsync(async (req, res, next) => {
//     const workSequences = await Task.find({ workSequenceId: req.params.workSequenceId }).populate('workSequenceId');

//     if (!workSequences.length) {
//         return next(new AppError("No work sequences found with that ID", 404));
//     }

//     res.status(200).json({
//         status: "success",
//         data: {
//             workSequences,
//         },
//     });
// });
// exports.getTaskByUnitId = catchAsync(async (req, res, next) => {
//     const units = await Task.find({ unitId: req.params.unitId }).populate('unitId');

//     if (!units.length) {
//         return next(new AppError("No units found with that ID", 404));
//     }

//     res.status(200).json({
//         status: "success",
//         data: {
//             units,
//         },
//     });
// });
// exports.getTaskBySiteId = catchAsync(async (req, res, next) => {
//     const siteId = req.params.id;

   
//     const workSequences = await WorkSequences.find({ siteId }).select('_id');

//     if (!workSequences.length) {
//         return next(new AppError("No work sequences found for the given site ID", 404));
//     }

//     const workSequenceIds = workSequences.map(seq => seq._id);

//     const tasks = await Task.find({
//         workSequenceId: { $in: workSequenceIds }
//     }).populate('workSequenceId').populate('unitId');

//     if (!tasks.length) {
//         return next(new AppError("No tasks found for the given site ID", 404));
//     }

//     res.status(200).json({
//         status: "success",
//         data: {
//             tasks,
//         },
//     });
// });

// exports.updateTask = catchAsync(async (req, res, next) => {
//     const { taskId } = req.params;
//     const updateFields = req.body; 
//     const updatedTask = await Task.findByIdAndUpdate(taskId, updateFields, {
//         new: true, 
//         runValidators: true,
//     });

//     if (!updatedTask) {
//         return next(new AppError("No task found with that ID", 404));
//     }

//     res.status(200).json({
//         status: "success",
//         data: {
//             task: updatedTask,
//         },
//     });
// });


// exports.getTaskByUserId = catchAsync(async (req, res, next) => {
//     const { userId } = req.params;
//     const { startDate, endDate } = req.query;

//     const query = { assignTo: userId };
//     if (startDate) {
//         query.startDate = { $gte: new Date(startDate) };
//     }
//     if (endDate) {
//         query.endDate = query.endDate || {};
//         query.endDate.$lte = new Date(endDate);
//     }
//     const tasks = await Task.find(query)
//         .populate('workSequenceId')
//         .populate('unitId')
//         .populate('assignTo');

//     if (!tasks.length) {
//         return next(new AppError("No tasks found assigned to that user ID", 404));
//     }

//     const tasksWithDocuments = [];
//     for (const task of tasks) {
//         if (!task.workSequenceId) {
//             continue; 
//         }
//         const workSequence = await WorkSequences.findById(task.workSequenceId);
//         if (!workSequence) {
//             continue; 
//         }

//         const workSequenceDocuments = await WorkSequenceDoc.find({ workSequenceId: workSequence._id });

//         tasksWithDocuments.push({
//             task: task,
//             workSequenceDocuments: workSequenceDocuments
//         });
//     }
//     res.status(200).json({
//         status: "success",
//         data: {
//             tasks: tasksWithDocuments,
//         },
//     });
// });



exports.getNewPnmTasksByStatus = async (req, res) => {
    const { userId,siteId } = req.params;
    const { status } = req.query;

    try {
        
        const tasks = await Task.find({ assignTo: userId, siteId})
        .populate('assignTo', 'firstName') 
            .populate('siteId', 'siteName')
            .populate({
                path: 'assignnewPnmTasksForUser',
                populate: {
                    path: 'assignNewPnmTasks',
                    select: 'assetCode equipmentType',
                    populate: {
                            path: 'assetCode',
                            select: 'formNo', 
                            populate: {
                                path: 'formNo', 
                                select: 'activity department formNo' ,
                                populate: {
                                    path: 'activity', 
                                    select: 'activity' ,
                                }
                            }
                        }
                }
            });

        if (!tasks || tasks.length === 0) {
            return res.status(404).json({
                status: "fail",
                message: "No tasks found for the specified user.",
            });
        }

        const filteredNewPnmTasks = tasks.map(task => {
            const filteredTasks = status === "All" 
                ? task.assignnewPnmTasksForUser 
                : task.assignnewPnmTasksForUser.filter(
                    pnmTask => pnmTask.newPnmTaskStatus === status
                );

            return {
                taskId: task._id,
                siteId: task.siteId,
                assignTo: task.assignTo,
                assignnewPnmTasksForUser: filteredTasks,
            };
        }).filter(task => task.assignnewPnmTasksForUser.length > 0); 

        if (filteredNewPnmTasks.length === 0) {
            return res.status(200).json({
                status: "fail",
                message: "No newPnms tasks found with the specified status.",
            });
        }

        res.status(200).json({
            status: "success",
            results: filteredNewPnmTasks.length,
            data: {
                tasks: filteredNewPnmTasks,
            },
        });
    } catch (error) {
        res.status(400).json({
            status: "error",
            message: error.message,
        });
    }
};


exports.getallNewPnmTasks = async (req, res) => {
    const { userId, siteId } = req.params;

    try {
        

       const tasks = await Task.find({ assignTo: userId, siteId})
       .populate('assignTo', 'firstName') 
       .populate('siteId', 'siteName')
       .populate({
           path: 'assignnewPnmTasksForUser',
           populate: {
               path: 'assignNewPnmTasks',
               select: 'assetCode',
               populate: {
                       path: 'assetCode',
                       select: 'formNo', 
                       populate: {
                           path: 'formNo', 
                           select: 'activity department formNo' ,
                           populate: {
                               path: 'activity', 
                               select: 'activity' ,
                           }
                       }
                   }
           }
       });
        if (!tasks || tasks.length === 0) {
            return res.status(404).json({
                status: "fail",
                message: "No tasks found for the specified user and site.",
            });
        }

        // Filter the newPnms tasks that are not "Completed"
        const remainingNewPnmTasks = tasks.map(task => {
            const filteredTasks = task.assignnewPnmTasksForUser.filter(
                pnmTask => pnmTask.newPnmTaskStatus !== "Completed"
            );

            return {
                taskId: task._id,
                siteId: task.siteId,
                assignTo: task.assignTo,
                assignnewPnmTasksForUser: filteredTasks,
            };
        }).filter(task => task.assignnewPnmTasksForUser.length > 0); // Keep only tasks that have remaining newPnmTasks

        if (remainingNewPnmTasks.length === 0) {
            return res.status(200).json({
                status: "fail",
                message: "All newPnms tasks are completed for this user on this site.",
            });
        }

        res.status(200).json({
            status: "success",
            results: remainingNewPnmTasks.length,
            data: {
                tasks: remainingNewPnmTasks,
            },
        });
    } catch (error) {
        res.status(400).json({
            status: "error",
            message: error.message,
        });
    }
};