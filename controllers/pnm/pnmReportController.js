const AssetCode = require("../../models/pnmModels/assetCodeModel");
const Site = require("../../models/sitesModel");
const BreakDownReport = require("../../models/pnmModels/breakDownReportModel");
const MiscellaneousReport = require("../../models/pnmModels/miscellaneousReportModel");
const Batching = require("../../models/pnmModels/dailyLogReportModel/batchingPointModel");
const Distribution = require("../../models/pnmModels/dailyLogReportModel/distributionBoardModel");
const PowerTool = require("../../models/pnmModels/dailyLogReportModel/powerToolModel");
const VehicleAndMachinery = require("../../models/pnmModels/dailyLogReportModel/vehicleAndMachineryModel");
const mongoose = require('mongoose');

const { catchAsync } = require("../../utils/catchAsync");


exports.getReports = catchAsync(async (req, res) => {
    
    try {
        const {
            reportType,
            equipmentType,
            selectTimePeriod,
            fromDate,
            toDate,
            month,
            year,
            fromYear,
            toYear,

        } = req.query;
        let data;

        // Ensure that `fromDate` and `toDate` are correctly parsed
        const parseDate = dateStr => new Date(dateStr);

        // Determine the model to query based on reportType
        switch (reportType) {
            case 'dailyLogReport':
                if (equipmentType === 'Machinery') {
                    let query = { equipmentType: 'Machinery' };
                    let startDate, endDate;

                    if (selectTimePeriod === 'byDate') {
                        if (!fromDate || !toDate) {
                            return res.status(400).json({ message: 'FromDate and ToDate are required for byDate' });
                        }
                        startDate = parseDate(fromDate);
                        endDate = parseDate(toDate);
                        endDate.setDate(endDate.getDate() + 1); // To include end date

                        console.log('Query Date Range:', { startDate, endDate });

                        data = await VehicleAndMachinery.find(query).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                        data = data.filter(item => item.transitionDate >= startDate && item.transitionDate < endDate);
                    } else if (selectTimePeriod === 'byMonth') {
                        if (!month || !year) {
                            return res.status(400).json({ message: 'Month and Year are required for byMonth' });
                        }
                        startDate = new Date(year, month - 1, 1); // Start of the month
                        endDate = new Date(year, month, 1); // Start of the next month

                        console.log('Query Month Range:', { startDate, endDate });

                        data = await VehicleAndMachinery.find(query).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                        data = data.filter(item => item.transitionDate >= startDate && item.transitionDate < endDate);
                    } else if (selectTimePeriod === 'last6Months') {
                        if (!fromDate || !toDate) {
                            return res.status(400).json({ message: 'FromDate and ToDate are required for last6Months' });
                        }
                        startDate = parseDate(fromDate);
                        endDate = parseDate(toDate);
                        endDate.setDate(endDate.getDate() + 1); // To include end date

                        console.log('Query Last 6 Months Range:', { startDate, endDate });

                        data = await VehicleAndMachinery.find(query).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                        data = data.filter(item => item.transitionDate >= startDate && item.transitionDate < endDate);
                    } else if (selectTimePeriod === 'fromBeginningToTillDate') {
                        startDate = new Date(0); // Beginning of time
                        endDate = new Date(); // Current date

                        console.log('Query From Beginning to Till Date:', { startDate, endDate });

                        data = await VehicleAndMachinery.find(query).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                        data = data.filter(item => item.transitionDate >= startDate && item.transitionDate <= endDate);
                    } 
                    else if (selectTimePeriod === 'byYear') {
                        if (!fromYear || !toYear) {
                            return res.status(400).json({ message: 'FromYear and ToYear are required for byYear' });
                        }
                        startDate = new Date(fromYear, 0, 1); // Start of the fromYear
                        endDate = new Date(toYear + 1, 0, 1); // Start of the next year
                
                        console.log('Query Year Range:', { startDate, endDate });
                
                        data = await VehicleAndMachinery.find(query).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                        data = data.filter(item => item.transitionDate >= startDate && item.transitionDate < endDate);
                    }else {
                        return res.status(400).json({ message: 'Invalid selectTimePeriod' });
                    }

                    console.log('Filtered Data:', data);

                    return res.status(200).json(data);
                }

                if (equipmentType === 'Vehicle') {
                    let query = { equipmentType: 'Vehicle' };
                    let startDate, endDate;

                    if (selectTimePeriod === 'byDate') {
                        if (!fromDate || !toDate) {
                            return res.status(400).json({ message: 'FromDate and ToDate are required for byDate' });
                        }
                        startDate = parseDate(fromDate);
                        endDate = parseDate(toDate);
                        endDate.setDate(endDate.getDate() + 1); // To include end date

                        console.log('Query Date Range:', { startDate, endDate });

                        data = await VehicleAndMachinery.find(query).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                        data = data.filter(item => item.transitionDate >= startDate && item.transitionDate < endDate);
                    } else if (selectTimePeriod === 'byMonth') {
                        if (!month || !year) {
                            return res.status(400).json({ message: 'Month and Year are required for byMonth' });
                        }
                        startDate = new Date(year, month - 1, 1); // Start of the month
                        endDate = new Date(year, month, 1); // Start of the next month

                        console.log('Query Month Range:', { startDate, endDate });

                        data = await VehicleAndMachinery.find(query).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                        data = data.filter(item => item.transitionDate >= startDate && item.transitionDate < endDate);
                    } else if (selectTimePeriod === 'last6Months') {
                        if (!fromDate || !toDate) {
                            return res.status(400).json({ message: 'FromDate and ToDate are required for last6Months' });
                        }
                        startDate = parseDate(fromDate);
                        endDate = parseDate(toDate);
                        endDate.setDate(endDate.getDate() + 1); // To include end date

                        console.log('Query Last 6 Months Range:', { startDate, endDate });

                        data = await VehicleAndMachinery.find(query).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                        data = data.filter(item => item.transitionDate >= startDate && item.transitionDate < endDate);
                    } else if (selectTimePeriod === 'byYear') {
                        if (!fromYear || !toYear) {
                            return res.status(400).json({ message: 'FromYear and ToYear are required for byYear' });
                        }
                        startDate = new Date(fromYear, 0, 1); // Start of the fromYear
                        endDate = new Date(toYear + 1, 0, 1); // Start of the next year
                
                        console.log('Query Year Range:', { startDate, endDate });
                

                        data = await VehicleAndMachinery.find(query).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                        data = data.filter(item => item.transitionDate >= startDate && item.transitionDate <= endDate);
                    } else {
                        return res.status(400).json({ message: 'Invalid selectTimePeriod' });
                    }

                    console.log('Filtered Data:', data);

                    return res.status(200).json(data);
                }

                 if (equipmentType === 'Power Tools') {
                    let query = { equipmentType: 'Power Tools' };
                    let startDate, endDate;
                
                    if (selectTimePeriod === 'byDate') {
                        if (!fromDate || !toDate) {
                            return res.status(400).json({ message: 'FromDate and ToDate are required for byDate' });
                        }
                        startDate = parseDate(fromDate);
                        endDate = parseDate(toDate);
                        endDate.setDate(endDate.getDate() + 1); // To include end date
                
                        console.log('Query Date Range:', { startDate, endDate });
                
                        data = await PowerTool.find({
                            equipmentType: 'Power Tools',
                            transitionDate: { $gte: startDate, $lt: endDate }
                        }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                    } else if (selectTimePeriod === 'byMonth') {
                        if (!month || !year) {
                            return res.status(400).json({ message: 'Month and Year are required for byMonth' });
                        }
                        startDate = new Date(year, month - 1, 1); // Start of the month
                        endDate = new Date(year, month, 1); // Start of the next month
                
                        console.log('Query Month Range:', { startDate, endDate });
                
                        data = await PowerTool.find({
                            equipmentType: 'Power Tools',
                            transitionDate: { $gte: startDate, $lt: endDate }
                        }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                    } else if (selectTimePeriod === 'last6Months') {
                        let currentDate = new Date();
                        let sixMonthsAgo = new Date();
                        sixMonthsAgo.setMonth(currentDate.getMonth() - 6);
                
                        startDate = sixMonthsAgo;
                        endDate = currentDate;
                
                        console.log('Query Last 6 Months Range:', { startDate, endDate });
                
                        data = await PowerTool.find({
                            equipmentType: 'Power Tools',
                            transitionDate: { $gte: startDate, $lt: endDate }
                        }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                    } else if (selectTimePeriod === 'byYear') {
                        if (!fromYear || !toYear) {
                            return res.status(400).json({ message: 'FromYear and ToYear are required for byYear' });
                        }
                        startDate = new Date(fromYear, 0, 1); // Start of the fromYear
                        endDate = new Date(toYear + 1, 0, 1); // Start of the next year
                
                        console.log('Query Year Range:', { startDate, endDate });
                
                
                        data = await PowerTool.find({
                            equipmentType: 'Power Tools',
                            transitionDate: { $gte: startDate, $lte: endDate }
                        }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                    } else {
                        return res.status(400).json({ message: 'Invalid selectTimePeriod' });
                    }
                
                    console.log('Filtered Data:', data);
                    return res.status(200).json(data);
                }
                 
                if (equipmentType === 'Distribution Board') {
                    let query = { equipmentType: 'Distribution Board' };
                    let startDate, endDate;
                
                    if (selectTimePeriod === 'byDate') {
                        if (!fromDate || !toDate) {
                            return res.status(400).json({ message: 'FromDate and ToDate are required for byDate' });
                        }
                        startDate = parseDate(fromDate);
                        endDate = parseDate(toDate);
                        endDate.setDate(endDate.getDate() + 1); // To include end date
                
                        console.log('Query Date Range:', { startDate, endDate });
                
                        data = await Distribution.find({
                            equipmentType: 'Distribution Board',
                            transitionDate: { $gte: startDate, $lt: endDate }
                        }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                    } else if (selectTimePeriod === 'byMonth') {
                        if (!month || !year) {
                            return res.status(400).json({ message: 'Month and Year are required for byMonth' });
                        }
                        startDate = new Date(year, month - 1, 1); // Start of the month
                        endDate = new Date(year, month, 1); // Start of the next month
                
                        console.log('Query Month Range:', { startDate, endDate });
                
                        data = await Distribution.find({
                            equipmentType: 'Distribution Board',
                            transitionDate: { $gte: startDate, $lt: endDate }
                        }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                    } else if (selectTimePeriod === 'last6Months') {
                        let currentDate = new Date();
                        let sixMonthsAgo = new Date();
                        sixMonthsAgo.setMonth(currentDate.getMonth() - 6);
                
                        startDate = sixMonthsAgo;
                        endDate = currentDate;
                
                        console.log('Query Last 6 Months Range:', { startDate, endDate });
                
                        data = await Distribution.find({
                            equipmentType: 'Distribution Board',
                            transitionDate: { $gte: startDate, $lt: endDate }
                        }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                    }else if (selectTimePeriod === 'byYear') {
                        if (!fromYear || !toYear) {
                            return res.status(400).json({ message: 'FromYear and ToYear are required for byYear' });
                        }
                        startDate = new Date(fromYear, 0, 1); // Start of the fromYear
                        endDate = new Date(toYear + 1, 0, 1); // Start of the next year
                
                        console.log('Query Year Range:', { startDate, endDate });
                
                        data = await Distribution.find({
                            equipmentType: 'Distribution Board',
                            transitionDate: { $gte: startDate, $lte: endDate }
                        }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                    } else {
                        return res.status(400).json({ message: 'Invalid selectTimePeriod' });
                    }
                
                    console.log('Filtered Data:', data);
                    return res.status(200).json(data);
                }
               
                if (equipmentType === 'Batching Plant') {
                    let query = { equipmentType: 'Batching Plant' };
                    let startDate, endDate;
                
                    if (selectTimePeriod === 'byDate') {
                        if (!fromDate || !toDate) {
                            return res.status(400).json({ message: 'FromDate and ToDate are required for byDate' });
                        }
                        startDate = parseDate(fromDate);
                        endDate = parseDate(toDate);
                        endDate.setDate(endDate.getDate() + 1); // To include end date
                
                        console.log('Query Date Range:', { startDate, endDate });
                
                        data = await Batching.find({
                            equipmentType: 'Batching Plant',
                            transitionDate: { $gte: startDate, $lt: endDate }
                        }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                    } else if (selectTimePeriod === 'byMonth') {
                        if (!month || !year) {
                            return res.status(400).json({ message: 'Month and Year are required for byMonth' });
                        }
                        startDate = new Date(year, month - 1, 1); // Start of the month
                        endDate = new Date(year, month, 1); // Start of the next month
                
                        console.log('Query Month Range:', { startDate, endDate });
                
                        data = await Batching.find({
                            equipmentType: 'Batching Plant',
                            transitionDate: { $gte: startDate, $lt: endDate }
                        }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                    } else if (selectTimePeriod === 'last6Months') {
                        let currentDate = new Date();
                        let sixMonthsAgo = new Date();
                        sixMonthsAgo.setMonth(currentDate.getMonth() - 6);
                
                        startDate = sixMonthsAgo;
                        endDate = currentDate;
                
                        console.log('Query Last 6 Months Range:', { startDate, endDate });
                
                        data = await Batching.find({
                            equipmentType: 'Batching Plant',
                            transitionDate: { $gte: startDate, $lt: endDate }
                        }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                    } else if (selectTimePeriod === 'byYear') {
                        if (!fromYear || !toYear) {
                            return res.status(400).json({ message: 'FromYear and ToYear are required for byYear' });
                        }
                        startDate = new Date(fromYear, 0, 1); // Start of the fromYear
                        endDate = new Date(toYear + 1, 0, 1); // Start of the next year
                
                        console.log('Query Year Range:', { startDate, endDate });
                
                        console.log('Query From Beginning to Till Date:', { startDate, endDate });
                
                        data = await Batching.find({
                            equipmentType: 'Batching Plant',
                            transitionDate: { $gte: startDate, $lte: endDate }
                        }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                    } else {
                        return res.status(400).json({ message: 'Invalid selectTimePeriod' });
                    }
                
                    console.log('Filtered Data:', data);
                    return res.status(200).json(data);
                }
                
                case 'breakDownReport':
                    if (equipmentType === 'Machinery') {
                        let query = { equipmentType: 'Machinery' };
                        let startDate, endDate;
    
                        if (selectTimePeriod === 'byDate') {
                            if (!fromDate || !toDate) {
                                return res.status(400).json({ message: 'FromDate and ToDate are required for byDate' });
                            }
                            startDate = parseDate(fromDate);
                            endDate = parseDate(toDate);
                            endDate.setDate(endDate.getDate() + 1); // To include end date
                    
                            console.log('Query Date Range:', { startDate, endDate });
                    
                            data = await BreakDownReport.find({
                                equipmentType: 'Machinery',
                                transitionDate: { $gte: startDate, $lt: endDate }
                            }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                        } else if (selectTimePeriod === 'byMonth') {
                            if (!month || !year) {
                                return res.status(400).json({ message: 'Month and Year are required for byMonth' });
                            }
                            startDate = new Date(year, month - 1, 1); // Start of the month
                            endDate = new Date(year, month, 1); // Start of the next month
                    
                            console.log('Query Month Range:', { startDate, endDate });
                    
                            data = await BreakDownReport.find({
                                equipmentType: 'Machinery',
                                transitionDate: { $gte: startDate, $lt: endDate }
                            }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                        } else if (selectTimePeriod === 'last6Months') {
                            let currentDate = new Date();
                            let sixMonthsAgo = new Date();
                            sixMonthsAgo.setMonth(currentDate.getMonth() - 6);
                    
                            startDate = sixMonthsAgo;
                            endDate = currentDate;
                    
                            console.log('Query Last 6 Months Range:', { startDate, endDate });
                    
                            data = await BreakDownReport.find({
                                equipmentType: 'Machinery',
                                transitionDate: { $gte: startDate, $lt: endDate }
                            }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                        } else if (selectTimePeriod === 'byYear') {
                            if (!fromYear || !toYear) {
                                return res.status(400).json({ message: 'FromYear and ToYear are required for byYear' });
                            }
                            startDate = new Date(fromYear, 0, 1); // Start of the fromYear
                            endDate = new Date(toYear + 1, 0, 1); // Start of the next year
                    
                            console.log('Query Year Range:', { startDate, endDate });
                    
                    
                            data = await BreakDownReport.find({
                                equipmentType: 'Machinery',
                                transitionDate: { $gte: startDate, $lte: endDate }
                            }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                        } else {
                            return res.status(400).json({ message: 'Invalid selectTimePeriod' });
                        }
                    
                        console.log('Filtered Data:', data);
                        return res.status(200).json(data);
                    }
    
                    if (equipmentType === 'Vehicle') {
                        let query = { equipmentType: 'Vehicle' };
                        let startDate, endDate;
    
                        if (selectTimePeriod === 'byDate') {
                            if (!fromDate || !toDate) {
                                return res.status(400).json({ message: 'FromDate and ToDate are required for byDate' });
                            }
                            startDate = parseDate(fromDate);
                            endDate = parseDate(toDate);
                            endDate.setDate(endDate.getDate() + 1); // To include end date
                    
                            console.log('Query Date Range:', { startDate, endDate });
                    
                            data = await BreakDownReport.find({
                                equipmentType: 'Vehicle',
                                transitionDate: { $gte: startDate, $lt: endDate }
                            }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                        } else if (selectTimePeriod === 'byMonth') {
                            if (!month || !year) {
                                return res.status(400).json({ message: 'Month and Year are required for byMonth' });
                            }
                            startDate = new Date(year, month - 1, 1); // Start of the month
                            endDate = new Date(year, month, 1); // Start of the next month
                    
                            console.log('Query Month Range:', { startDate, endDate });
                    
                            data = await BreakDownReport.find({
                                equipmentType: 'Vehicle',
                                transitionDate: { $gte: startDate, $lt: endDate }
                            }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                        } else if (selectTimePeriod === 'last6Months') {
                            let currentDate = new Date();
                            let sixMonthsAgo = new Date();
                            sixMonthsAgo.setMonth(currentDate.getMonth() - 6);
                    
                            startDate = sixMonthsAgo;
                            endDate = currentDate;
                    
                            console.log('Query Last 6 Months Range:', { startDate, endDate });
                    
                            data = await BreakDownReport.find({
                                equipmentType: 'Vehicle',
                                transitionDate: { $gte: startDate, $lt: endDate }
                            }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                        } else if (selectTimePeriod === 'byYear') {
                            if (!fromYear || !toYear) {
                                return res.status(400).json({ message: 'FromYear and ToYear are required for byYear' });
                            }
                            startDate = new Date(fromYear, 0, 1); // Start of the fromYear
                            endDate = new Date(toYear + 1, 0, 1); // Start of the next year
                    
                            console.log('Query Year Range:', { startDate, endDate });
                    
                    
                            data = await BreakDownReport.find({
                                equipmentType: 'Vehicle',
                                transitionDate: { $gte: startDate, $lte: endDate }
                            }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                        } else {
                            return res.status(400).json({ message: 'Invalid selectTimePeriod' });
                        }
                    
                        console.log('Filtered Data:', data);
                        return res.status(200).json(data);
                    }
    
    
                     if (equipmentType === 'Power Tools') {
                        let query = { equipmentType: 'Power Tools' };
                        let startDate, endDate;
                    
                        if (selectTimePeriod === 'byDate') {
                            if (!fromDate || !toDate) {
                                return res.status(400).json({ message: 'FromDate and ToDate are required for byDate' });
                            }
                            startDate = parseDate(fromDate);
                            endDate = parseDate(toDate);
                            endDate.setDate(endDate.getDate() + 1); // To include end date
                    
                            console.log('Query Date Range:', { startDate, endDate });
                    
                            data = await BreakDownReport.find({
                                equipmentType: 'Power Tools',
                                transitionDate: { $gte: startDate, $lt: endDate }
                            }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                        } else if (selectTimePeriod === 'byMonth') {
                            if (!month || !year) {
                                return res.status(400).json({ message: 'Month and Year are required for byMonth' });
                            }
                            startDate = new Date(year, month - 1, 1); // Start of the month
                            endDate = new Date(year, month, 1); // Start of the next month
                    
                            console.log('Query Month Range:', { startDate, endDate });
                    
                            data = await BreakDownReport.find({
                                equipmentType: 'Power Tools',
                                transitionDate: { $gte: startDate, $lt: endDate }
                            }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                        } else if (selectTimePeriod === 'last6Months') {
                            let currentDate = new Date();
                            let sixMonthsAgo = new Date();
                            sixMonthsAgo.setMonth(currentDate.getMonth() - 6);
                    
                            startDate = sixMonthsAgo;
                            endDate = currentDate;
                    
                            console.log('Query Last 6 Months Range:', { startDate, endDate });
                    
                            data = await BreakDownReport.find({
                                equipmentType: 'Power Tools',
                                transitionDate: { $gte: startDate, $lt: endDate }
                            }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                        } else if (selectTimePeriod === 'byYear') {
                            if (!fromYear || !toYear) {
                                return res.status(400).json({ message: 'FromYear and ToYear are required for byYear' });
                            }
                            startDate = new Date(fromYear, 0, 1); // Start of the fromYear
                            endDate = new Date(toYear + 1, 0, 1); // Start of the next year
                    
                            console.log('Query Year Range:', { startDate, endDate });
                    
                    
                            data = await BreakDownReport.find({
                                equipmentType: 'Power Tools',
                                transitionDate: { $gte: startDate, $lte: endDate }
                            }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                        } else {
                            return res.status(400).json({ message: 'Invalid selectTimePeriod' });
                        }
                    
                        console.log('Filtered Data:', data);
                        return res.status(200).json(data);
                    }
                     
                    if (equipmentType === 'Distribution Board') {
                        let query = { equipmentType: 'Distribution Board' };
                        let startDate, endDate;
                    
                        if (selectTimePeriod === 'byDate') {
                            if (!fromDate || !toDate) {
                                return res.status(400).json({ message: 'FromDate and ToDate are required for byDate' });
                            }
                            startDate = parseDate(fromDate);
                            endDate = parseDate(toDate);
                            endDate.setDate(endDate.getDate() + 1); // To include end date
                    
                            console.log('Query Date Range:', { startDate, endDate });
                    
                            data = await BreakDownReport.find({
                                equipmentType: 'Distribution Board',
                                transitionDate: { $gte: startDate, $lt: endDate }
                            }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                        } else if (selectTimePeriod === 'byMonth') {
                            if (!month || !year) {
                                return res.status(400).json({ message: 'Month and Year are required for byMonth' });
                            }
                            startDate = new Date(year, month - 1, 1); // Start of the month
                            endDate = new Date(year, month, 1); // Start of the next month
                    
                            console.log('Query Month Range:', { startDate, endDate });
                    
                            data = await BreakDownReport.find({
                                equipmentType: 'Distribution Board',
                                transitionDate: { $gte: startDate, $lt: endDate }
                            }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                        } else if (selectTimePeriod === 'last6Months') {
                            let currentDate = new Date();
                            let sixMonthsAgo = new Date();
                            sixMonthsAgo.setMonth(currentDate.getMonth() - 6);
                    
                            startDate = sixMonthsAgo;
                            endDate = currentDate;
                    
                            console.log('Query Last 6 Months Range:', { startDate, endDate });
                    
                            data = await BreakDownReport.find({
                                equipmentType: 'Distribution Board',
                                transitionDate: { $gte: startDate, $lt: endDate }
                            }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                        } else if (selectTimePeriod === 'byYear') {
                            if (!fromYear || !toYear) {
                                return res.status(400).json({ message: 'FromYear and ToYear are required for byYear' });
                            }
                            startDate = new Date(fromYear, 0, 1); // Start of the fromYear
                            endDate = new Date(toYear + 1, 0, 1); // Start of the next year
                    
                            console.log('Query Year Range:', { startDate, endDate });
                    
                    
                            data = await BreakDownReport.find({
                                equipmentType: 'Distribution Board',
                                transitionDate: { $gte: startDate, $lte: endDate }
                            }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                        } else {
                            return res.status(400).json({ message: 'Invalid selectTimePeriod' });
                        }
                    
                        console.log('Filtered Data:', data);
                        return res.status(200).json(data);
                    }
                   
                    if (equipmentType === 'Batching Plant') {
                        let query = { equipmentType: 'Batching Plant' };
                        let startDate, endDate;
                    
                        if (selectTimePeriod === 'byDate') {
                            if (!fromDate || !toDate) {
                                return res.status(400).json({ message: 'FromDate and ToDate are required for byDate' });
                            }
                            startDate = parseDate(fromDate);
                            endDate = parseDate(toDate);
                            endDate.setDate(endDate.getDate() + 1); // To include end date
                    
                            console.log('Query Date Range:', { startDate, endDate });
                    
                            data = await BreakDownReport.find({
                                equipmentType: 'Batching Plant',
                                transitionDate: { $gte: startDate, $lt: endDate }
                            }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                        } else if (selectTimePeriod === 'byMonth') {
                            if (!month || !year) {
                                return res.status(400).json({ message: 'Month and Year are required for byMonth' });
                            }
                            startDate = new Date(year, month - 1, 1); // Start of the month
                            endDate = new Date(year, month, 1); // Start of the next month
                    
                            console.log('Query Month Range:', { startDate, endDate });
                    
                            data = await BreakDownReport.find({
                                equipmentType: 'Batching Plant',
                                transitionDate: { $gte: startDate, $lt: endDate }
                            }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                        } else if (selectTimePeriod === 'last6Months') {
                            let currentDate = new Date();
                            let sixMonthsAgo = new Date();
                            sixMonthsAgo.setMonth(currentDate.getMonth() - 6);
                    
                            startDate = sixMonthsAgo;
                            endDate = currentDate;
                    
                            console.log('Query Last 6 Months Range:', { startDate, endDate });
                    
                            data = await BreakDownReport.find({
                                equipmentType: 'Batching Plant',
                                transitionDate: { $gte: startDate, $lt: endDate }
                            }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                        } else if (selectTimePeriod === 'byYear') {
                            if (!fromYear || !toYear) {
                                return res.status(400).json({ message: 'FromYear and ToYear are required for byYear' });
                            }
                            startDate = new Date(fromYear, 0, 1); // Start of the fromYear
                            endDate = new Date(toYear + 1, 0, 1); // Start of the next year
                    
                            console.log('Query Year Range:', { startDate, endDate });
                    
                            data = await BreakDownReport.find({
                                equipmentType: 'Batching Plant',
                                transitionDate: { $gte: startDate, $lte: endDate }
                            }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                        } else {
                            return res.status(400).json({ message: 'Invalid selectTimePeriod' });
                        }
                    
                        console.log('Filtered Data:', data);
                        return res.status(200).json(data);
                    }
                    
                    case 'miscellaneous':
                        if (equipmentType === 'Machinery') {
                            let query = { equipmentType: 'Machinery' };
                            let startDate, endDate;
        
                            if (selectTimePeriod === 'byDate') {
                                if (!fromDate || !toDate) {
                                    return res.status(400).json({ message: 'FromDate and ToDate are required for byDate' });
                                }
                                startDate = parseDate(fromDate);
                                endDate = parseDate(toDate);
                                endDate.setDate(endDate.getDate() + 1); // To include end date
                        
                                console.log('Query Date Range:', { startDate, endDate });
                        
                                data = await MiscellaneousReport.find({
                                    equipmentType: 'Machinery',
                                    transitionDate: { $gte: startDate, $lt: endDate }
                                }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                            } else if (selectTimePeriod === 'byMonth') {
                                if (!month || !year) {
                                    return res.status(400).json({ message: 'Month and Year are required for byMonth' });
                                }
                                startDate = new Date(year, month - 1, 1); // Start of the month
                                endDate = new Date(year, month, 1); // Start of the next month
                        
                                console.log('Query Month Range:', { startDate, endDate });
                        
                                data = await MiscellaneousReport.find({
                                    equipmentType: 'Machinery',
                                    transitionDate: { $gte: startDate, $lt: endDate }
                                }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                            } else if (selectTimePeriod === 'last6Months') {
                                let currentDate = new Date();
                                let sixMonthsAgo = new Date();
                                sixMonthsAgo.setMonth(currentDate.getMonth() - 6);
                        
                                startDate = sixMonthsAgo;
                                endDate = currentDate;
                        
                                console.log('Query Last 6 Months Range:', { startDate, endDate });
                        
                                data = await MiscellaneousReport.find({
                                    equipmentType: 'Machinery',
                                    transitionDate: { $gte: startDate, $lt: endDate }
                                }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                            } else if (selectTimePeriod === 'byYear') {
                                if (!fromYear || !toYear) {
                                    return res.status(400).json({ message: 'FromYear and ToYear are required for byYear' });
                                }
                                startDate = new Date(fromYear, 0, 1); // Start of the fromYear
                                endDate = new Date(toYear + 1, 0, 1); // Start of the next year
                        
                                console.log('Query Year Range:', { startDate, endDate });
                        
                                data = await MiscellaneousReport.find({
                                    equipmentType: 'Machinery',
                                    transitionDate: { $gte: startDate, $lte: endDate }
                                }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                            } else {
                                return res.status(400).json({ message: 'Invalid selectTimePeriod' });
                            }
                        
                            console.log('Filtered Data:', data);
                            return res.status(200).json(data);
                        }
        
                        if (equipmentType === 'Vehicle') {
                            let query = { equipmentType: 'Vehicle' };
                            let startDate, endDate;
        
                            if (selectTimePeriod === 'byDate') {
                                if (!fromDate || !toDate) {
                                    return res.status(400).json({ message: 'FromDate and ToDate are required for byDate' });
                                }
                                startDate = parseDate(fromDate);
                                endDate = parseDate(toDate);
                                endDate.setDate(endDate.getDate() + 1); // To include end date
                        
                                console.log('Query Date Range:', { startDate, endDate });
                        
                                data = await MiscellaneousReport.find({
                                    equipmentType: 'Vehicle',
                                    transitionDate: { $gte: startDate, $lt: endDate }
                                }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                            } else if (selectTimePeriod === 'byMonth') {
                                if (!month || !year) {
                                    return res.status(400).json({ message: 'Month and Year are required for byMonth' });
                                }
                                startDate = new Date(year, month - 1, 1); // Start of the month
                                endDate = new Date(year, month, 1); // Start of the next month
                        
                                console.log('Query Month Range:', { startDate, endDate });
                        
                                data = await MiscellaneousReport.find({
                                    equipmentType: 'Vehicle',
                                    transitionDate: { $gte: startDate, $lt: endDate }
                                }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                            } else if (selectTimePeriod === 'last6Months') {
                                let currentDate = new Date();
                                let sixMonthsAgo = new Date();
                                sixMonthsAgo.setMonth(currentDate.getMonth() - 6);
                        
                                startDate = sixMonthsAgo;
                                endDate = currentDate;
                        
                                console.log('Query Last 6 Months Range:', { startDate, endDate });
                        
                                data = await MiscellaneousReport.find({
                                    equipmentType: 'Vehicle',
                                    transitionDate: { $gte: startDate, $lt: endDate }
                                }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                            } else if (selectTimePeriod === 'byYear') {
                                if (!fromYear || !toYear) {
                                    return res.status(400).json({ message: 'FromYear and ToYear are required for byYear' });
                                }
                                startDate = new Date(fromYear, 0, 1); // Start of the fromYear
                                endDate = new Date(toYear + 1, 0, 1); // Start of the next year
                        
                                console.log('Query Year Range:', { startDate, endDate });
                        
                                data = await MiscellaneousReport.find({
                                    equipmentType: 'Vehicle',
                                    transitionDate: { $gte: startDate, $lte: endDate }
                                }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                            } else {
                                return res.status(400).json({ message: 'Invalid selectTimePeriod' });
                            }
                        
                            console.log('Filtered Data:', data);
                            return res.status(200).json(data);
                        }
        
        
                         if (equipmentType === 'Power Tools') {
                            let query = { equipmentType: 'Power Tools' };
                            let startDate, endDate;
                        
                            if (selectTimePeriod === 'byDate') {
                                if (!fromDate || !toDate) {
                                    return res.status(400).json({ message: 'FromDate and ToDate are required for byDate' });
                                }
                                startDate = parseDate(fromDate);
                                endDate = parseDate(toDate);
                                endDate.setDate(endDate.getDate() + 1); // To include end date
                        
                                console.log('Query Date Range:', { startDate, endDate });
                        
                                data = await MiscellaneousReport.find({
                                    equipmentType: 'Power Tools',
                                    transitionDate: { $gte: startDate, $lt: endDate }
                                }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                            } else if (selectTimePeriod === 'byMonth') {
                                if (!month || !year) {
                                    return res.status(400).json({ message: 'Month and Year are required for byMonth' });
                                }
                                startDate = new Date(year, month - 1, 1); // Start of the month
                                endDate = new Date(year, month, 1); // Start of the next month
                        
                                console.log('Query Month Range:', { startDate, endDate });
                        
                                data = await MiscellaneousReport.find({
                                    equipmentType: 'Power Tools',
                                    transitionDate: { $gte: startDate, $lt: endDate }
                                }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                            } else if (selectTimePeriod === 'last6Months') {
                                let currentDate = new Date();
                                let sixMonthsAgo = new Date();
                                sixMonthsAgo.setMonth(currentDate.getMonth() - 6);
                        
                                startDate = sixMonthsAgo;
                                endDate = currentDate;
                        
                                console.log('Query Last 6 Months Range:', { startDate, endDate });
                        
                                data = await MiscellaneousReport.find({
                                    equipmentType: 'Power Tools',
                                    transitionDate: { $gte: startDate, $lt: endDate }
                                }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                            } else if (selectTimePeriod === 'byYear') {
                                if (!fromYear || !toYear) {
                                    return res.status(400).json({ message: 'FromYear and ToYear are required for byYear' });
                                }
                                startDate = new Date(fromYear, 0, 1); // Start of the fromYear
                                endDate = new Date(toYear + 1, 0, 1); // Start of the next year
                        
                                console.log('Query Year Range:', { startDate, endDate });
                        
                                data = await MiscellaneousReport.find({
                                    equipmentType: 'Power Tools',
                                    transitionDate: { $gte: startDate, $lte: endDate }
                                }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                            } else {
                                return res.status(400).json({ message: 'Invalid selectTimePeriod' });
                            }
                        
                            console.log('Filtered Data:', data);
                            return res.status(200).json(data);
                        }
                         
                        if (equipmentType === 'Distribution Board') {
                            let query = { equipmentType: 'Distribution Board' };
                            let startDate, endDate;
                        
                            if (selectTimePeriod === 'byDate') {
                                if (!fromDate || !toDate) {
                                    return res.status(400).json({ message: 'FromDate and ToDate are required for byDate' });
                                }
                                startDate = parseDate(fromDate);
                                endDate = parseDate(toDate);
                                endDate.setDate(endDate.getDate() + 1); // To include end date
                        
                                console.log('Query Date Range:', { startDate, endDate });
                        
                                data = await MiscellaneousReport.find({
                                    equipmentType: 'Distribution Board',
                                    transitionDate: { $gte: startDate, $lt: endDate }
                                }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                            } else if (selectTimePeriod === 'byMonth') {
                                if (!month || !year) {
                                    return res.status(400).json({ message: 'Month and Year are required for byMonth' });
                                }
                                startDate = new Date(year, month - 1, 1); // Start of the month
                                endDate = new Date(year, month, 1); // Start of the next month
                        
                                console.log('Query Month Range:', { startDate, endDate });
                        
                                data = await MiscellaneousReport.find({
                                    equipmentType: 'Distribution Board',
                                    transitionDate: { $gte: startDate, $lt: endDate }
                                }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                            } else if (selectTimePeriod === 'last6Months') {
                                let currentDate = new Date();
                                let sixMonthsAgo = new Date();
                                sixMonthsAgo.setMonth(currentDate.getMonth() - 6);
                        
                                startDate = sixMonthsAgo;
                                endDate = currentDate;
                        
                                console.log('Query Last 6 Months Range:', { startDate, endDate });
                        
                                data = await MiscellaneousReport.find({
                                    equipmentType: 'Distribution Board',
                                    transitionDate: { $gte: startDate, $lt: endDate }
                                }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                            } else if (selectTimePeriod === 'byYear') {
                                if (!fromYear || !toYear) {
                                    return res.status(400).json({ message: 'FromYear and ToYear are required for byYear' });
                                }
                                startDate = new Date(fromYear, 0, 1); // Start of the fromYear
                                endDate = new Date(toYear + 1, 0, 1); // Start of the next year
                        
                                console.log('Query Year Range:', { startDate, endDate });
                        
                                data = await MiscellaneousReport.find({
                                    equipmentType: 'Distribution Board',
                                    transitionDate: { $gte: startDate, $lte: endDate }
                                }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                            } else {
                                return res.status(400).json({ message: 'Invalid selectTimePeriod' });
                            }
                        
                            console.log('Filtered Data:', data);
                            return res.status(200).json(data);
                        }
                       
                        if (equipmentType === 'Batching Plant') {
                            let query = { equipmentType: 'Batching Plant' };
                            let startDate, endDate;
                        
                            if (selectTimePeriod === 'byDate') {
                                if (!fromDate || !toDate) {
                                    return res.status(400).json({ message: 'FromDate and ToDate are required for byDate' });
                                }
                                startDate = parseDate(fromDate);
                                endDate = parseDate(toDate);
                                endDate.setDate(endDate.getDate() + 1); // To include end date
                        
                                console.log('Query Date Range:', { startDate, endDate });
                        
                                data = await MiscellaneousReport.find({
                                    equipmentType: 'Batching Plant',
                                    transitionDate: { $gte: startDate, $lt: endDate }
                                }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                            } else if (selectTimePeriod === 'byMonth') {
                                if (!month || !year) {
                                    return res.status(400).json({ message: 'Month and Year are required for byMonth' });
                                }
                                startDate = new Date(year, month - 1, 1); // Start of the month
                                endDate = new Date(year, month, 1); // Start of the next month
                        
                                console.log('Query Month Range:', { startDate, endDate });
                        
                                data = await MiscellaneousReport.find({
                                    equipmentType: 'Batching Plant',
                                    transitionDate: { $gte: startDate, $lt: endDate }
                                }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                            } else if (selectTimePeriod === 'last6Months') {
                                let currentDate = new Date();
                                let sixMonthsAgo = new Date();
                                sixMonthsAgo.setMonth(currentDate.getMonth() - 6);
                        
                                startDate = sixMonthsAgo;
                                endDate = currentDate;
                        
                                console.log('Query Last 6 Months Range:', { startDate, endDate });
                        
                                data = await MiscellaneousReport.find({
                                    equipmentType: 'Batching Plant',
                                    transitionDate: { $gte: startDate, $lt: endDate }
                                }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                            } else if (selectTimePeriod === 'byYear') {
                                if (!fromYear || !toYear) {
                                    return res.status(400).json({ message: 'FromYear and ToYear are required for byYear' });
                                }
                                startDate = new Date(fromYear, 0, 1); // Start of the fromYear
                                endDate = new Date(toYear + 1, 0, 1); // Start of the next year
                        
                                console.log('Query Year Range:', { startDate, endDate });
                        
                        
                                data = await MiscellaneousReport.find({
                                    equipmentType: 'Batching Plant',
                                    transitionDate: { $gte: startDate, $lte: endDate }
                                }).populate({
                                path: 'siteName',
                                select: 'siteName' 
                            })
                            .populate({
                                path: 'assetCode',
                                select: 'assetCode' 
                            }).exec();
                            } else {
                                return res.status(400).json({ message: 'Invalid selectTimePeriod' });
                            }
                        
                            console.log('Filtered Data:', data);
                            return res.status(200).json(data);
                        }
                    
            default:
                return res.status(400).json({ message: 'Invalid reportType' });
        }
    } catch (err) {
        res.status(400).json({
          status: 'failed',
          data: {
            error: err.toString(),
          },
        });
      }
      });