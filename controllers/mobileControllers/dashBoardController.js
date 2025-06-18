const Task = require("../../models/taskModel");
const AppError = require("../../utils/appError");
const catchAsync = require("../../utils/catchAsync").catchAsync;
exports.getAllTasks = catchAsync(async (req, res, next) => {
    const userId = req.user._id;

    try {
        const tasks = await Task.find({ assignTo: userId })
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
                            select: 'activity',
                            populate: {
                                path: 'activity',
                                select: 'activity _id' // Select both activity name and id
                            }
                        }
                    }
                }
            });

        
        let statusActivities = {
            Delayed: { count: 0, activities: [] },
            InProgress: { count: 0, activities: [] },
            Completed: { count: 0, activities: [] },
            ToDo: { count: 0, activities: [] }
        };

        tasks.forEach(task => {
            task.assignnewPnmTasksForUser.forEach(pnmTask => {
                const taskStatus = pnmTask.newPnmTaskStatus;
                const activity = pnmTask.assignNewPnmTasks?.assetCode?.formNo?.activity;
                
                if (activity) {
                    const activityData = {
                        activity_id: activity._id,
                        activityName: activity.activity
                    };

                    if (taskStatus === "Delayed") {
                        statusActivities.Delayed.count++;
                        statusActivities.Delayed.activities.push(activityData);
                    } else if (taskStatus === "In Progress") {
                        statusActivities.InProgress.count++;
                        statusActivities.InProgress.activities.push(activityData);
                    } else if (taskStatus === "Completed") {
                        statusActivities.Completed.count++;
                        statusActivities.Completed.activities.push(activityData);
                    } else if (taskStatus === "ToDo") {
                        statusActivities.ToDo.count++;
                        statusActivities.ToDo.activities.push(activityData);
                    }
                }
            });
        });

        res.status(200).json({
            status: "success",
            data: {
                statusActivities // Return tasks by status with counts and activities (including id)
            },
        });
    } catch (error) {
        res.status(400).json({
            status: "error",
            message: error.message,
        });
    }
});
