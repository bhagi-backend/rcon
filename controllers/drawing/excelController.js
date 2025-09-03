const ExcelJS = require("exceljs");
const Site = require("../../models/sitesModel");
const Category = require("../../models/drawingModels/categoryModel");
const { catchAsync } = require("../../utils/catchAsync");

exports.downloadExcel = catchAsync(async (req, res, next) => {
  const downloadedBy = req.user.email;
  const { siteId, companyId } = req.body;

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

  // 2. Fetch categories for dropdown
  const categories = await Category.find({
    $or: [{ companyId }, { companyId: null }],
  }).lean();
  const categoryList = categories.length
    ? categories.map((c) => c.category.replace(/,/g, " ")).join(",")
    : "No Categories Available";
  console.log("Category List:", categoryList); // Debug: Check the category list

  // 3. Create workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Your App Name";
  workbook.lastModifiedBy = downloadedBy;
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet("Drawing Register");

  // Top section (metadata)
  const now = new Date(); // 12:15 PM IST on September 03, 2025
  worksheet.addRow([]); // Row 2
  worksheet.mergeCells("A2:B2");
  worksheet.mergeCells("C2:D2");
  worksheet.getCell("A2").value = `Date: ${now.toISOString().split("T")[0]}`; // 2025-09-03
  worksheet.getCell("C2").value = `Time: ${now.toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata", hour12: false })}`; // 12:15:00

  worksheet.addRow([]); // Row 3
  worksheet.mergeCells("A3:B3");
  worksheet.mergeCells("C3:D3");
  worksheet.getCell("A3").value = `Company Keyword: ${site.companyId?.companyKeyWord || "N/A"}`;
  worksheet.getCell("C3").value = `Site Keyword: ${site.siteKeyWord || "N/A"}`;

  worksheet.addRow([]); // Row 4
  worksheet.mergeCells("A4:B4");
  worksheet.mergeCells("C4:D4");
  worksheet.getCell("A4").value = `Site Location: ${site.siteAddress || "N/A"}`;
  worksheet.getCell("C4").value = `Downloaded By: ${downloadedBy}`;

  worksheet.addRow([]); // Row 5
  worksheet.mergeCells("A5:B5"); // Adjusted merge for Site Name
  worksheet.mergeCells("C5:D5"); // Merge for Drawing No
  worksheet.getCell("A5").value = `Site Name: ${site.siteName || "N/A"}`;
  worksheet.getCell("C5").value = `Drawing No: ${site.drawingNo || "N/A"}`;

  worksheet.addRow([]); // Row 6 - Spacer

  // Set column headers in row 7 with enhanced styling
  worksheet.addRow(["S.NO", "Drawing No", "Category", "Drawing Title"]); // Headers in row 7
  const headerRow = worksheet.getRow(7); // Style row 7
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2D3436" }, // Dark gray background
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
    cell.protection = { locked: true }; // Lock header cells
  });

  // Lock metadata cells (rows 2-5)
  for (let row = 2; row <= 5; row++) {
    for (let col = 1; col <= 4; col++) {
      worksheet.getCell(row, col).protection = { locked: true };
    }
  }

  // Unlock row 1 cells
  for (let col = 1; col <= 4; col++) {
    worksheet.getCell(1, col).protection = { locked: false };
  }

  // Set initial wider column widths for metadata, headers, and data
  worksheet.getColumn(1).width = 15; // Wider for S.NO and metadata labels
  worksheet.getColumn(2).width = 20; // Wider for Drawing No and metadata values
  worksheet.getColumn(3).width = 25; // Wider for Category and metadata values
  worksheet.getColumn(4).width = 30; // Wider for Drawing Title and metadata values

  // Add categories in row range (hidden) starting from row 108
  const categoriesArray = categoryList !== "No Categories Available"
    ? categoryList.split(",")
    : [];
  categoriesArray.forEach((category, index) => {
    worksheet.getCell(`A${108 + index}`).value = category.trim(); // Column A, rows 108 onwards
  });
  console.log("Categories populated in A108:A" + (107 + categoriesArray.length)); // Debug

  // Add sample data rows with dropdown starting in row 8
  worksheet.addRow([1, "", "", ""]); // Row 8
  worksheet.addRow([2, "", "", ""]); // Row 9

  // Apply dropdown for Category column (C) starting from row 8 using range
  if (categoriesArray.length > 0) {
    const dropdownRowCount = 100; // Adjustable: number of rows with dropdown
    const lastCategoryRow = 107 + categoriesArray.length; // Last row with categories (e.g., 153 for 46 categories)
    for (let row = 8; row <= 7 + dropdownRowCount; row++) {
      const cell = worksheet.getCell(`C${row}`);
      cell.dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`$A$108:$A$${lastCategoryRow}`], // Range reference to hidden rows
        showErrorMessage: true,
        errorTitle: "Invalid Category",
        error: "Please select a category from the dropdown",
      };
      console.log(`Applied dataValidation to C${row} with range $A$108:$A$${lastCategoryRow}`); // Debug
      // Unlock data cells to allow editing
      worksheet.getCell(`A${row}`).protection = { locked: false };
      worksheet.getCell(`B${row}`).protection = { locked: false };
      worksheet.getCell(`C${row}`).protection = { locked: false };
      worksheet.getCell(`D${row}`).protection = { locked: false };
    }
  }

  // Hide the row range containing categories
  for (let i = 108; i <= 107 + categoriesArray.length; i++) {
    worksheet.getRow(i).hidden = true;
  }

  // Protect the worksheet with permission to adjust column widths
  worksheet.protect("", { // Empty password, can be set to a string like "Pass123" if needed
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatColumns: true // Allows manual width adjustment
  });

  // Apply borders to populated cells
  for (let i = 1; i <= Math.max(worksheet.rowCount, 9); i++) {
    for (let j = 1; j <= 4; j++) {
      const cell = worksheet.getCell(i, j);
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    }
  }

  // Generate unique filename
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const fileName = `drawing-${site.siteKeyWord || "site"}-${year}${month}-${randomNum}.xlsx`;

  // Set response headers
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

  // Stream workbook to response
  await workbook.xlsx.write(res);
});