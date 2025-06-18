const NewPnmWorkFlow = require('../../models/pnmModels/newPnmWorkFlowModel');
const { catchAsync } = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');
const User = require('../../models/userModel');
const Task = require('../../models/taskModel');
const NewPnm = require('../../models/pnmModels/newPnmModel');
const AssetCode = require('../../models/pnmModels/assetCodeModel'); 
const Activity = require('../../models/checklistModels/activityModel');


exports.createNewPnmWorkFlow = catchAsync(async (req, res, next) => {
  const { assignTOUser, assignNewPnmTasks, siteId } = req.body;

  const user = await User.findById(assignTOUser);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  let tasksForUser = [];

  for (const taskId of assignNewPnmTasks) {
    const newPnm = await NewPnm.findById(taskId);
    if (!newPnm) {
      return next(new AppError(`NewPnm task with ID ${taskId} not found`, 404));
    }

    const assetCode = newPnm.assetCode;
    console.log("assetCode:", assetCode);

    const assetData = await AssetCode.findOne({_id: assetCode });
    if (!assetData) {
      return next(new AppError('Asset code not found', 404));
    }
    const activity = await Activity.findById(assetData.activity);
    if (!activity) {
      return next(new AppError(`Activity for asset code ${assetCode} not found`, 404));
    }

    const taskTitle = `Task for activity: ${activity.activity}`;

    tasksForUser.push({
      assignNewPnmTasks: taskId,
      assignedDate: new Date(),
      status: 'permanent task',
      title: taskTitle, 
    });
  }
  let existingTask = await Task.findOne({ assignTo: assignTOUser });

  if (existingTask) {
    const alreadyAssignedTasks = existingTask.assignnewPnmTasksForUser.filter(task =>
      assignNewPnmTasks.includes(task.assignNewPnmTasks.toString())
    );

    if (alreadyAssignedTasks.length > 0) {
      return res.status(200).json({
        status: 'failed',
        message: 'One or more tasks are already assigned to this user in an existing task document.',
      });
    }

    existingTask.assignnewPnmTasksForUser.push(...tasksForUser);
    await existingTask.save();

  } else {
    existingTask = await Task.create({
      assignTo: assignTOUser,
      siteId: siteId,
      assignnewPnmTasksForUser: tasksForUser, 
    });

    user.tasks = existingTask._id;
    await user.save();
  }

  await NewPnm.updateMany(
    { _id: { $in: assignNewPnmTasks } },
    { $addToSet: { assignToUser: assignTOUser }, $set: { status: 'Assigned' } }
  );

  res.status(201).json({
    status: 'success',
    data: {
      task: existingTask,
    },
    message: existingTask ? 'Tasks added to existing assignment' : 'New task created and assigned successfully',
  });
});