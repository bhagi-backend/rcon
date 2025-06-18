const ConnectedDevices = require("../models/connectedDevicesModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync").catchAsync;

// Create a new connected device
exports.createConnectedDevice = catchAsync(async (req, res, next) => {
    const loginUserId = req.user.id; 

    const newDevice = await ConnectedDevices.create({
        ...req.body,
        loginUserId, 
    });

    res.status(201).json({
        status: "success",
        data: {
            connectedDevice: newDevice,
        },
    });
});


exports.getAllConnectedDevices = catchAsync(async (req, res, next) => {
    const loginUserId = req.user.id; 

    const connectedDevices = await ConnectedDevices.find({ loginUserId });

    res.status(200).json({
        status: "success",
        results: connectedDevices.length,
        data: {
            connectedDevices,
        },
    });
});




exports.deleteConnectedDevice = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const deletedDevice = await ConnectedDevices.findByIdAndDelete(id);

    if (!deletedDevice) {
        return next(new AppError("Connected device not found", 404));
    }

    res.status(204).json({
        status: "success",
        data: null,
    });
});
