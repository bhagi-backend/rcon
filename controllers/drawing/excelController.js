const ExcelJS = require("exceljs");
const Site = require("../../models/sitesModel");
const Category = require("../../models/drawingModels/categoryModel");
const User = require("../../models/userModel");
const { catchAsync } = require("../../utils/catchAsync");
const AssignCategoriesToDesignDrawingConsultant = require("../../models/drawingModels/assignCategoriesToDesignConsultantModel");
const mongoose = require("mongoose");

exports.downloadExcel = catchAsync(async (req, res, next) => {
  const downloadedBy = req.user.email;
  const { siteId, companyId, type } = req.body;

  // Validate required parameters
  if (!siteId || !companyId) {
    return res.status(400).json({
      status: "fail",
      message: "siteId and companyId are required",
    });
  }

  // 1. Fetch site details
  const site = await Site.findById(siteId)
    .populate({
      path: "companyId",
      select: "companyKeyWord",
    })
    .lean();

  if (!site) {
    return res.status(404).json({
      status: "fail",
      message: "Site not found",
    });
  }

  console.log("req.user.id", req.user.id);

  let categoryList;
  if (type === "designConsultant") {
    // Fetch categories from AssignCategoriesToDesignDrawingConsultant
    const assignedCategories = await AssignCategoriesToDesignDrawingConsultant.find({
      designDrawingConsultant: req.user.id,
    })
      .populate({
        path: "categories",
        select: "category",
      })
      .lean();

    const categories = assignedCategories.flatMap((assignment) => assignment.categories);
    categoryList = categories.length
      ? categories.map((c) => c.category.replace(/,/g, " ")).join(",")
      : "No Categories Available";
  } else {
    // Fetch categories where siteId is either null OR matches the provided siteId
    const categories = await Category.find({
      $or: [{ siteId: null }, { siteId: siteId }],
    })
      .select("category")
      .lean();

    categoryList = categories.length
      ? categories.map((c) => c.category.replace(/,/g, " ")).join(",")
      : "No Categories Available";
  }

  console.log("categoryList", categoryList);

  // 2. Prepare site location list for metadata
  let siteLocationList = ["Select location","General Arrangement"];
  if (site.ventureType === "Apartments" && site.apartmentsDetails) {
    if (site.apartmentsDetails.towers && site.apartmentsDetails.towers.length > 0) {
      siteLocationList = siteLocationList.concat(
        site.apartmentsDetails.towers.map((tower) => tower.name || "Unnamed Tower")
      );
    }
    if (site.apartmentsDetails.clubhouse && site.apartmentsDetails.clubhouse.length > 0) {
      siteLocationList = siteLocationList.concat(
        site.apartmentsDetails.clubhouse.map((clubhouse) => clubhouse.name || "Unnamed Clubhouse")
      );
    }
  } else if (site.ventureType === "Highrise or Commercial" && site.buildingsDetails) {
    if (site.buildingsDetails.towers && site.buildingsDetails.towers.length > 0) {
      siteLocationList = siteLocationList.concat(
        site.buildingsDetails.towers.map((tower) => tower.name || "Unnamed Tower")
      );
    }
  } else if (site.ventureType === "Villas" && site.villasDetails) {
    if (site.villasDetails.clubhouse && site.villasDetails.clubhouse.length > 0) {
      siteLocationList = siteLocationList.concat(
        site.villasDetails.clubhouse.map((clubhouse) => clubhouse.name || "Unnamed Clubhouse")
      );
    }
  }

  siteLocationList = siteLocationList.length > 1 ? siteLocationList : ["General Arrangement"];
  const siteLocation = siteLocationList[0]; // Use the first option for metadata

  // 3. Create workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Your App Name";
  workbook.lastModifiedBy = downloadedBy;
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet("Drawing Register");

  // Top section (metadata)
  const now = new Date();
  worksheet.getCell("A2").value = `Date: ${now.toISOString().split("T")[0]}`;
  worksheet.mergeCells("A2:B2");
  worksheet.getCell("C2").value = `Time: ${now.toLocaleTimeString("en-US", {
    timeZone: "Asia/Kolkata",
    hour12: false,
  })}`;
  worksheet.mergeCells("C2:D2");

  worksheet.getCell("A3").value = `Company Keyword: ${site.companyId?.companyKeyWord || "N/A"}`;
  worksheet.mergeCells("A3:B3");
  worksheet.getCell("C3").value = `Site Keyword: ${site.siteKeyWord || "N/A"}`;
  worksheet.mergeCells("C3:D3");

  worksheet.getCell("A4").value = `Site Location: ${siteLocation || "N/A"}`;
  worksheet.mergeCells("A4:B4");
  worksheet.getCell("C4").value = `Downloaded By: ${downloadedBy}`;
  worksheet.mergeCells("C4:D4");

  worksheet.getCell("A5").value = `Site Name: ${site.siteName || "N/A"}`;
  worksheet.mergeCells("A5:B5");
  worksheet.getCell("C5").value = `Drawing No Format: ${site.drawingNo || "N/A"}`;
  worksheet.mergeCells("C5:D5");

  // Add site locations in row range (hidden) starting from row 208
  siteLocationList.forEach((location, index) => {
    worksheet.getCell(`B${208 + index}`).value = location.trim();
  });

  // --- FIXED PART: Add headers in row 7 ---
  worksheet.getRow(7).values = [
    "S.NO",
    "Drawing No",
    "Category",
    "Drawing Title",
    "Accepted RO Submission Date",
    "Accepted Site Submission Date",
  ];
  const headerRow = worksheet.getRow(7);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };

  for (let col = 1; col <= 6; col++) {
    const cell = headerRow.getCell(col);
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2D3436" }, // Dark gray background
    };
  }

  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: "medium", color: { argb: "FF000000" } },
      left: { style: "medium", color: { argb: "FF000000" } },
      bottom: { style: "medium", color: { argb: "FF000000" } },
      right: { style: "medium", color: { argb: "FF000000" } },
    };
    cell.protection = { locked: true };
  });

  // Lock metadata cells (rows 2-5)
  for (let row = 2; row <= 5; row++) {
    for (let col = 1; col <= 6; col++) {
      worksheet.getCell(row, col).protection = { locked: true };
    }
  }

  // Unlock row 1 cells
  for (let col = 1; col <= 6; col++) {
    worksheet.getCell(1, col).protection = { locked: false };
  }

  // Set column widths
  worksheet.getColumn(1).width = 15;
  worksheet.getColumn(2).width = 20;
  worksheet.getColumn(3).width = 25;
  worksheet.getColumn(4).width = 30;
  worksheet.getColumn(5).width = 25;
  worksheet.getColumn(6).width = 25;

  // Add categories in row range (hidden) starting from row 108
  const categoriesArray =
    categoryList !== "No Categories Available" ? categoryList.split(",") : [];
  categoriesArray.forEach((category, index) => {
    worksheet.getCell(`A${108 + index}`).value = category.trim();
  });

  // Add two initial empty rows for data
  worksheet.addRow([1, "", "", "", "", ""]);
  worksheet.addRow([2, "", "", "", "", ""]);

  if (categoriesArray.length > 0) {
    const dropdownRowCount = 100;
    const lastCategoryRow = 107 + categoriesArray.length;

    for (let row = 8; row <= 7 + dropdownRowCount; row++) {
      // Validation for S.NO
      const sNoCell = worksheet.getCell(`A${row}`);
      sNoCell.dataValidation = {
        type: "whole",
        allowBlank: true,
        operator: "between",
        formulae: [0, 999999],
        showErrorMessage: true,
        errorTitle: "Invalid S.NO",
        error: "Please enter a valid number",
      };

      // Validation for Category
      const categoryCell = worksheet.getCell(`C${row}`);
      categoryCell.dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`$A$108:$A$${lastCategoryRow}`],
        showErrorMessage: true,
        errorTitle: "Invalid Category",
        error: "Please select a category from the dropdown",
      };

      // Validation for acceptedROSubmissionDate
      const roDateCell = worksheet.getCell(`E${row}`);
      roDateCell.dataValidation = {
        type: "date",
        allowBlank: true,
        operator: "between",
        formulae: ["1900-01-01", "9999-12-31"],
        showErrorMessage: true,
        errorTitle: "Invalid Date",
        error: "Please enter a valid date",
      };

      // Validation for acceptedSiteSubmissionDate
      const siteDateCell = worksheet.getCell(`F${row}`);
      siteDateCell.dataValidation = {
        type: "date",
        allowBlank: true,
        operator: "between",
        formulae: ["1900-01-01", "9999-12-31"],
        showErrorMessage: true,
        errorTitle: "Invalid Date",
        error: "Please enter a valid date",
      };

      // Unlock data cells
      for (let col = 1; col <= 6; col++) {
        worksheet.getCell(row, col).protection = { locked: false };
      }
    }
  }

  // Dropdown for Site Location
  const siteLocationCell = worksheet.getCell("A4");
  siteLocationCell.dataValidation = {
    type: "list",
    allowBlank: true,
    formulae: [`$B$208:$B$${207 + siteLocationList.length}`],
    showErrorMessage: true,
    errorTitle: "Invalid Site Location",
    error: "Please select a site location from the dropdown",
  };
  siteLocationCell.protection = { locked: false };

  // Hide the rows containing categories and site locations
  for (let i = 108; i <= 107 + categoriesArray.length; i++) {
    worksheet.getRow(i).hidden = true;
  }
  for (let i = 208; i <= 207 + siteLocationList.length; i++) {
    worksheet.getRow(i).hidden = true;
  }

  // Protect the worksheet
  worksheet.protect("", {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatColumns: true,
  });

  // Apply thin borders to non-header cells
  for (let i = 1; i <= Math.max(worksheet.rowCount, 9); i++) {
    for (let j = 1; j <= 6; j++) {
      const cell = worksheet.getCell(i, j);
      if (i === 7) continue;
      cell.border = {
        top: { style: "thin", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } },
      };
    }
  }

  console.log("Headers set in row 7:", worksheet.getRow(7).values);

  // Generate unique filename
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const fileName = `drawing-${site.siteKeyWord || "site"}-${year}${month}-${randomNum}.xlsx`;

  // Update user with filename
  await User.findByIdAndUpdate(
    req.user.id,
    { $push: { excelFiles: fileName } },
    { new: true }
  );

  // Send Excel file
  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.send(buffer);
});

// ---------------------------------------------------------------
//  FINAL: 100% WORKING – NO ERRORS, NO EMPTY DROPDOWNS
// ---------------------------------------------------------------
// exports.downloadExcel = catchAsync(async (req, res, next) => {
//   const { siteId, companyId, type } = req.body;
//   if (!siteId || !companyId) {
//     return res.status(400).json({ status: "fail", message: "siteId & companyId required" });
//   }

//   const site = await Site.findById(siteId)
//     .populate({ path: "companyId", select: "companyKeyWord" })
//     .lean();
//   if (!site) return res.status(404).json({ status: "fail", message: "Site not found" });

//   const now = new Date();

//   // === SAFE PREFIX FOR ALL NAMED RANGES ===
//   const PREFIX = "_";

//   // === 1. Consultants ===
//   const consultantList = [];
//   const consultantMap = {};

//   if (!type) {
//     const users = await User.find({
//       "permittedSites.siteId": siteId,
//       department: "Design Consultant",
//     }).select("firstName role _id").lean();

//     for (const u of users) {
//       const full = `${u.firstName} (${u.role || "Consultant"})`;
//       const safe = full.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20);
//       const key = `${PREFIX}CATS_${safe}`;

//       const assign = await AssignCategoriesToDesignDrawingConsultant.find({
//         designDrawingConsultant: u._id,
//       }).populate({ path: "categories", select: "category" }).lean();

//       const cats = assign.flatMap(a => a.categories.map(c => c.category)).filter(Boolean);

//       if (cats.length) {
//         consultantMap[full] = { key, cats };
//         consultantList.push(full);
//       }
//     }
//     if (!consultantList.length) consultantList.push("No Consultants");
//   }

//   // === 2. Global Categories ===
//   let globalCats = [];
//   if (type === "designConsultant") {
//     const assign = await AssignCategoriesToDesignDrawingConsultant.find({
//       designDrawingConsultant: req.user.id,
//     }).populate({ path: "categories", select: "category" }).lean();
//     globalCats = assign.flatMap(a => a.categories.map(c => c.category));
//   } else if (type) {
//     globalCats = await Category.find({ $or: [{ siteId: null }, { siteId }] })
//       .select("category").lean().then(c => c.map(x => x.category));
//   }

//   // === 3. Workbook ===
//   const wb = new ExcelJS.Workbook();
//   wb.creator = "RCON System";
//   wb.lastModifiedBy = req.user.email;
//   wb.created = wb.modified = now;

//   const ws = wb.addWorksheet("Drawing Register");
//   const ds = wb.addWorksheet("DataSheet");
//   ds.state = "veryHidden";

//   // === 4. Headers ===
//   let hdr = ["S.NO", "Drawing No", "Category", "Drawing Title", "Accepted RO Submission Date", "Accepted Site Submission Date"];
//   if (!type) hdr.splice(2, 0, "Design Consultant");

//   ws.getRow(7).values = hdr;
//   const hRow = ws.getRow(7);
//   hRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
//   hRow.alignment = { horizontal: "center", vertical: "middle" };
//   hdr.forEach((_, i) => hRow.getCell(i + 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2D3436" } });
//   ws.columns = hdr.map((_, i) => ({ width: i === 0 ? 8 : i === 3 ? 40 : 22 }));

//   // === 5. WRITE DATA & DEFINE NAMES ===
//   let row = 1;

//   // 5A. Consultant List
//   if (!type) {
//     consultantList.forEach(n => ds.getCell(`A${row++}`).value = n);
//     wb.definedNames.add(`${PREFIX}ConsultantList`, `DataSheet!$A$1:$A$${row - 1}`);
//     row += 2;
//   }

//   // 5B. Mapping Table
//   const mapStart = row;
//   if (!type) {
//     if (Object.keys(consultantMap).length) {
//       Object.entries(consultantMap).forEach(([name, { key }], i) => {
//         ds.getCell(`D${mapStart + i}`).value = name;
//         ds.getCell(`E${mapStart + i}`).value = key;
//       });
//       const mapEnd = mapStart + Object.keys(consultantMap).length - 1;
//       wb.definedNames.add(`${PREFIX}ConsultantMap`, `DataSheet!$D$${mapStart}:$E$${mapEnd}`);
//     } else {
//       ds.getCell(`D${row}`).value = "No Consultants";
//       ds.getCell(`E${row}`).value = `${PREFIX}CATS_NONE`;  // FIXED
//       wb.definedNames.add(`${PREFIX}ConsultantMap`, `DataSheet!$D$${row}:$E$${row}`);
//     }
//     row = mapStart + (Object.keys(consultantMap).length || 1) + 3;
//   }

//   // 5C. Category Lists
//   if (!type) {
//     for (const { key, cats } of Object.values(consultantMap)) {
//       const start = row;
//       (cats.length ? cats : ["--"]).forEach(c => ds.getCell(`B${row++}`).value = c);
//       wb.definedNames.add(key, `DataSheet!$B$${start}:$B$${row - 1}`);
//       row += 2;
//     }
//     // Fallback
//     const noneStart = row;
//     ds.getCell(`B${row++}`).value = "--";
//     wb.definedNames.add(`${PREFIX}CATS_NONE`, `DataSheet!$B$${noneStart}:$B$${row - 1}`);  // FIXED
//   }

//   // 5D. Global
//   if (type) {
//     const start = row;
//     (globalCats.length ? globalCats : ["--"]).forEach(c => ds.getCell(`C${row++}`).value = c);
//     wb.definedNames.add(`${PREFIX}CategoryList`, `DataSheet!$C$${start}:$C$${row - 1}`);
//   }

//   // === 6. Data Validation ===
//   const ROWS = 200;
//   for (let i = 8; i <= 7 + ROWS; i++) {
//     if (!type) {
//       ws.getCell(`C${i}`).dataValidation = {
//         type: "list",
//         allowBlank: true,
//         formulae: [`=${PREFIX}ConsultantList`],
//       };
//       ws.getCell(`D${i}`).dataValidation = {
//         type: "list",
//         allowBlank: true,
//         formulae: [`=IF(C${i}="","",INDIRECT(VLOOKUP(C${i},${PREFIX}ConsultantMap,2,FALSE)))`],
//       };
//     } else {
//       ws.getCell(`C${i}`).dataValidation = {
//         type: "list",
//         allowBlank: true,
//         formulae: [`=${PREFIX}CategoryList`],
//       };
//     }
//   }

//   // === 7. Protect ===
//   ws.views = [{ state: "frozen", xSplit: 0, ySplit: 7 }];
//   ws.protect("", { selectUnlockedCells: true });

//   for (let i = 8; i <= 7 + ROWS; i++) {
//     const cols = !type ? ["B", "C", "D", "E", "F", "G"] : ["B", "C", "D", "E", "F"];
//     cols.forEach(c => ws.getCell(`${c}${i}`).protection = { locked: false });
//   }

//   // === 8. Send ===
//   const fname = `drawing-${site.companyId?.companyKeyWord || "site"}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}.xlsx`;

//   await User.findByIdAndUpdate(req.user.id, { $push: { excelFiles: fname } });

//   const buffer = await wb.xlsx.writeBuffer();
//   res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
//   res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
//   res.send(buffer);
// });





exports.checkFileName = catchAsync(async (req, res) => {
  const { filename } = req.query;

  const user = await User.findOne({
    _id: req.user.id, // logged-in user
    excelFiles: filename,
  });

  if (user) {
    return res.status(200).json({
      status: "success",
      exists: true,
      message: "File exists in user's excelFiles",
    });
  }

  return res.status(200).json({
    status: "Failed",
    exists: false,
    message: "File does not exist in user's excelFiles",
  });
});
