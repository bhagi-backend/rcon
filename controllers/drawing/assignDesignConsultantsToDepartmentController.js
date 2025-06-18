
const { catchAsync } = require("../../utils/catchAsync"); 
const AssignDesignConsultantsToDepartment = require('../../models/drawingModels/assignDesignConsultantsToDepartMentModel'); 
const ArchitectureToRoRegister = require("../../models/drawingModels/architectureToRoRegisterModel");

exports.assignCategoriesToDepartment = catchAsync(async (req, res, next) => {
    const { siteId,department, module, designConsultants } = req.body;

        const existingAssignment = await AssignDesignConsultantsToDepartment.findOne({siteId, department, module });

        if (existingAssignment) {
            
            const existingConsultantIds = existingAssignment.designConsultants.map(cons => cons.toString());

            const newConsultants = designConsultants.filter(
                consultant => !existingConsultantIds.includes(consultant.toString())
            );

            existingAssignment.designConsultants.push(...newConsultants);

            const updatedAssignment = await existingAssignment.save();

            return res.status(200).json({
                status: 'success',
                data: updatedAssignment
            });
        } else {
            const newAssignment = new AssignDesignConsultantsToDepartment({
                siteId,
                department,
                module,
                designConsultants
            });

            const savedAssignment = await newAssignment.save();

            return res.status(201).json({
                status: 'success',
                data: savedAssignment
            });
        }
    
});

exports.deleteDesignConsultant = catchAsync(async (req, res, next) => {
    const { assignDesignConsultantsToDepartmentId, designConsultantId } = req.query;
    // const isReferenced = await ArchitectureToRoRegister.findOne({
    //     designDrawingConsultant: designConsultantId,
    // });

    // if (isReferenced) {
    //     return res.status(200).json({
    //         status: 'fail',
    //         message: 'Cannot delete. Design Consultant is in use in Register.',
    //     });
    // }

    const result = await AssignDesignConsultantsToDepartment.findOneAndUpdate(
        { _id: assignDesignConsultantsToDepartmentId },
        { $pull: { designConsultants: designConsultantId } },
        { new: true }
    );
    if (!result) {
        return res.status(200).json({
            status: 'fail',
            message: 'Design Consultant not found in the specified assignment.'
        });
    }

    res.status(200).json({
        status: 'success',
        data: {
            result
        }
    });
});
exports.getdesignConsultantsByDepartment = catchAsync(async (req, res, next) => {
    const { department, module } = req.query;
    const query = {};
    
    if (department) {
        query.department = department; 
    }

    if (module) {
        query.module = module; 
    }
    const assignments = await AssignDesignConsultantsToDepartment.find(query)
        .populate({ path: 'designConsultants', select: "role" });

    res.status(200).json({
        status: 'success',
        results: assignments.length,
        data: {
            assignments,
        },
    });
});

