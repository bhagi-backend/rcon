const NewPnm = require('../../models/pnmModels/newPnmModel');
const AppError = require('../../utils/appError'); 
const NewPnmTemporaryTransfer = require('../../models/pnmModels/newPnmTemporaryTransferModel'); 
const NewPnmPermanentTransfer = require('../../models/pnmModels/newPnmPermanentTransferModel'); 
const User = require('../../models/userModel');
const Task = require('../../models/taskModel');
const catchAsync = require('../../utils/catchAsync').catchAsync;

exports.createTemporaryTransfer = catchAsync(async (req, res, next) => {
    const { user, fromDate, toDate, assignNewPnmTasks, assignToAnotherUser, siteId } = req.body;
    const companyId = req.user.companyId;

    // Fetch the user for the temporary transfer
    const transferringUser = await User.findById(user);
    if (!transferringUser) {
        return next(new AppError('User not found', 404));
    }

    // Create the new temporary transfer
    const transfer = await NewPnmTemporaryTransfer.create({
        companyId,
        user,
        fromDate,
        toDate,
        Tasks: assignNewPnmTasks,
        assignToAnotherUser,
    });

    // Initialize an array to store errors
    const errors = [];

    // Update NewPnm tasks based on the temporary user assignments
    const updates = assignToAnotherUser.map(async (assignment) => {
        const { assignedToUser, assignNewPnmTasks } = assignment;

        // Fetch the user to whom the tasks will be assigned
        const assignedUser = await User.findById(assignedToUser);
        if (!assignedUser) {
            errors.push(`Assigned user with ID ${assignedToUser} not found`);
            return;
        }

        // Check for existing tasks assigned to the user
        let existingTask = await Task.findOne({ assignTo: assignedToUser });

        if (existingTask) {
            // Check for already assigned tasks
            const alreadyAssignedTasks = existingTask.assignnewPnmTasksForUser.filter(task =>
                assignNewPnmTasks.includes(task.assignNewPnmTasks.toString())
            );

            if (alreadyAssignedTasks.length > 0) {
                errors.push(`One or more tasks are already assigned to user ${assignedToUser}`);
                return;
            }

            // Add new tasks to the existing task document
            const newTasksForUser = assignNewPnmTasks.map(taskId => ({
                assignNewPnmTasks: taskId,
                assignedDate: new Date(),
                status: 'temporary task',
            }));
            existingTask.assignnewPnmTasksForUser.push(...newTasksForUser);
            await existingTask.save();

        } else {
            // Create a new task document for the user if none exists
            existingTask = await Task.create({
                assignTo: assignedToUser,
                siteId: siteId,
                assignnewPnmTasksForUser: assignNewPnmTasks.map(taskId => ({
                    assignNewPnmTasks: taskId,
                    assignedDate: new Date(),
                    status: 'temporary task',
                })),
            });

            assignedUser.tasks = existingTask._id;
            await assignedUser.save();
        }

        // Update the NewPnm model by adding the new user to assignToUser array
        await NewPnm.updateMany(
            { _id: { $in: assignNewPnmTasks } },
            { $addToSet: { assignToUser: assignedToUser } }
        );
    });

    // Wait for all updates to complete
    await Promise.all(updates);

    // Check for errors and respond accordingly
    if (errors.length > 0) {
        return res.status(200).json({
            status: 'fail',
            message: 'Some tasks could not be assigned',
            errors: errors,
        });
    }

    res.status(201).json({
        status: 'success',
        data: {
            transfer,
        },
    });
});


exports.getAllTemporaryTransfers = catchAsync(async (req, res) => {
    const companyId =req.user.companyId;
    const transfers = await NewPnmTemporaryTransfer.find({companyId}).populate('user Tasks assignToAnotherUser.assignedToUser');
    res.status(200).json({
        status: 'success',
        results: transfers.length,
        data: {
            transfers,
        },
    });
});
exports.createPermanentTransfer = catchAsync(async (req, res, next) => {
    const { user, assignNewPnmTasks, assignToAnotherUser, siteId } = req.body;
    const companyId = req.user.companyId;

    // Fetch the user for the permanent transfer
    const transferringUser = await User.findById(user);
    if (!transferringUser) {
        return next(new AppError('User not found', 404));
    }

    // Create the new permanent transfer
    const transfer = await NewPnmPermanentTransfer.create({
        companyId,
        user,
        assignNewPnmTasks,
        assignToAnotherUser,
    });

    // Initialize an array to store errors
    const errors = [];

    // Update NewPnm tasks based on the permanent user assignments
    const updates = assignToAnotherUser.map(async (assignment) => {
        const { assignedToUser, assignNewPnmTasks } = assignment;

        // Fetch the user to whom the tasks will be assigned
        const assignedUser = await User.findById(assignedToUser);
        if (!assignedUser) {
            errors.push(`Assigned user with ID ${assignedToUser} not found`);
            return;
        }

        // Check for existing tasks assigned to the user
        let existingTask = await Task.findOne({ assignTo: assignedToUser });

        if (existingTask) {
            // Check for already assigned tasks
            const alreadyAssignedTasks = existingTask.assignnewPnmTasksForUser.filter(task =>
                assignNewPnmTasks.includes(task.assignNewPnmTasks.toString())
            );

            if (alreadyAssignedTasks.length > 0) {
                errors.push(`One or more tasks are already assigned to user ${assignedToUser} in an existing task document.`);
                return;
            }

            // Add new tasks to the existing task document
            const newTasksForUser = assignNewPnmTasks.map(taskId => ({
                assignNewPnmTasks: taskId,
                assignedDate: new Date(),
                status: 'permanent task',
            }));
            existingTask.assignnewPnmTasksForUser.push(...newTasksForUser);
            await existingTask.save();
        } else {
            // Create a new task document for the user if none exists
            existingTask = await Task.create({
                assignTo: assignedToUser,
                siteId: siteId,
                assignnewPnmTasksForUser: assignNewPnmTasks.map(taskId => ({
                    assignNewPnmTasks: taskId,
                    assignedDate: new Date(),
                    status: 'permanent task',
                })),
            });

            assignedUser.tasks = existingTask._id;
            await assignedUser.save();
        }

        // Update the NewPnm model by adding the new user to assignToUser array
        await NewPnm.updateMany(
            { _id: { $in: assignNewPnmTasks } },
            { $addToSet: { assignToUser: assignedToUser } }
        );
    });

    await Promise.all(updates); // Wait for all updates to complete

    // Check for errors and respond accordingly
    if (errors.length > 0) {
        return res.status(200).json({
            status: 'fail',
            message: 'Some tasks could not be assigned',
            errors: errors,
        });
    }

    res.status(201).json({
        status: 'success',
        data: {
            transfer,
        },
    });
});


exports.getAllPermanentTransfers = catchAsync(async (req, res) => {
    const companyId = req.user.companyId;
    const transfers = await NewPnmPermanentTransfer.find({ companyId })
        .populate('user assignNewPnmTasks assignToAnotherUser.assignedToUser');

    res.status(200).json({
        status: 'success',
        results: transfers.length,
        data: {
            transfers,
        },
    });
});
