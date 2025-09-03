const ExcelJS = require("exceljs");
const Site = require("../../models/sitesModel");
const Category = require("../../models/drawingModels/categoryModel");
const { catchAsync } = require("../../utils/catchAsync");

exports.downloadExcel = catchAsync(async (req, res, next) => {
  const downloadedBy = req.user.firstName || req.user.email || "Unknown";
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
  const now = new Date(); // 10:36 AM IST on September 03, 2025
  worksheet.addRow([]); // Row 2
  worksheet.mergeCells("A2:B2");
  worksheet.mergeCells("C2:D2");
  worksheet.getCell("A2").value = `Date: ${now.toISOString().split("T")[0]}`; // 2025-09-03
  worksheet.getCell("C2").value = `Time: ${now.toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata", hour12: false })}`; // 10:36:00

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
  worksheet.mergeCells("A5:C5"); // Adjusted merge to leave D5 for Drawing No example
  worksheet.getCell("A5").value = `Site Name: ${site.siteName || "N/A"}`;
  worksheet.getCell("D5").value = `Drawing No: ${site.drawingNo || "N/A"}`; // Drawing No example

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
  });

  // Add categories in column E (hidden) starting from row 8
  const categoriesArray = categoryList !== "No Categories Available"
    ? categoryList.split(",")
    : [];
  categoriesArray.forEach((category, index) => {
    worksheet.getCell(`E${index + 8}`).value = category.trim(); // Column E, rows 8 onwards
  });

  // Add sample data rows with dropdown starting in row 8
  worksheet.addRow([1, "", "", ""]); // Row 8
  worksheet.addRow([2, "", "", ""]); // Row 9

  // Apply dropdown for Category column (C) starting from row 8 using range
  if (categoriesArray.length > 0) {
    const dropdownRowCount = 100; // Adjustable: number of rows with dropdown
    const lastCategoryRow = 7 + categoriesArray.length; // Last row with categories
    for (let row = 8; row <= 7 + dropdownRowCount; row++) {
      worksheet.getCell(`C${row}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`$E$8:$E$${lastCategoryRow}`], // Reference range in column E
        showErrorMessage: true,
        errorTitle: "Invalid Category",
        error: "Please select a category from the dropdown",
      };
    }
  }

  // Hide column E to keep it out of view
  worksheet.getColumn(5).hidden = true; // Column E is index 5

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