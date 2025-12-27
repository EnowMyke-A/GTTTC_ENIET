import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

/* =======================
   TYPES (MATCH EXCEL)
======================= */

type GenderStats = {
  boys_percentage: number;
  girls_percentage: number;
  total_percentage: number;
  boys: number;
  girls: number;
  total: number;
};

type SubjectRow = {
  subject: string;

  enrollment: GenderStats;

  topics: {
    planned: number;
    taught: number;
    percentage: number;
  };

  periods: {
    planned: number;
    taught: number;
    percentage: number;
  };

  average: number;

  passedGte10: GenderStats;
  avgLte5: GenderStats;
};

type SummaryStatistics = {
  title: string;
  institutionName: string;
  academicYear?: string;
  department?: string;
  level?: string;
  subjects: SubjectRow[];
};

/* =======================
   EXCEL EXPORT FUNCTION
======================= */

const exportSummaryStatisticsToExcel = async (data: SummaryStatistics) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Summary Statistics", {
    pageSetup: { 
      paperSize: 9, // A4
      orientation: "landscape",
      margins: {
        left: 0.7,
        right: 0.7,
        top: 0.75,
        bottom: 0.75,
        header: 0.3,
        footer: 0.3,
      },
    },
  });

  // Set column widths
  sheet.columns = [
    { width: 4 },   // S/N
    { width: 25 },  // SUBJECT
    { width: 4.55 },  // BOYS
    { width: 4.55 },  // GIRLS  
    { width: 5.55 },  // TOTAL
    { width: 7.55 },  // PLANNED
    { width: 6.55 },  // TAUGHT
    { width: 3.55 },   // %
    { width: 7.55 },  // PLANNED
    { width: 6.55 },  // TAUGHT
    { width: 3.55 },   // %
    { width: 8 },  // AVERAGE
    { width: 4.55 },  // B
    { width: 4.55  },  // G
    { width: 4.55  },  // T
    { width: 4.55 },  // B
    { width: 4.55  },  // G
    { width: 4.55  },  // T
    { width: 4.55 },  // BOYS
    { width: 4.55 },  // GIRLS
    { width: 5.55 },  // TOTAL
  ];

  // Title
  sheet.mergeCells('A1:U1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = data.title.toUpperCase();
  titleCell.font = { bold: true, size: 11, name: 'Times New Roman' };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Institution
  sheet.mergeCells('A2:U2');
  const institutionCell = sheet.getCell('A2');
  institutionCell.value = `NAME OF INSTITUTION: ${data.institutionName.toUpperCase()}`;
  institutionCell.font = { bold: true, size: 11, name: 'Times New Roman' };
  institutionCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Academic Year, Department, and Level
  sheet.mergeCells('A3:U3');
  const infoCell = sheet.getCell('A3');
  const infoText = [];
  if (data.academicYear) infoText.push(`ACADEMIC YEAR: ${data.academicYear.toUpperCase()}`);
  if (data.department) infoText.push(`DEPARTMENT: ${data.department.toUpperCase()}`);
  if (data.level) infoText.push(`LEVEL: ${data.level.toUpperCase()}`);
  infoCell.value = infoText.join('     |     ');
  infoCell.font = { bold: true, size: 11, name: 'Times New Roman' };
  infoCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Header Row 1
  const header1Row = sheet.getRow(5);
  header1Row.values = ['S/N', 'SUBJECT', 'ENROLLMENT', '', '', 'TOPICS', '', '', 'PERIODS', '', '', 'CLASS AVG', 'STUDENTS WITH AVG ≥10','','','','','','AVERAGE ≤ 5 / 20'];
  header1Row.font = { bold: true, size: 7, name: 'Times New Roman' };
  header1Row.alignment = { horizontal: 'center', vertical: 'middle' };
  
  // Merge header cells
  sheet.mergeCells('C5:E5'); // ENROLLMENT
  sheet.mergeCells('F5:H5'); // TOPICS
  sheet.mergeCells('I5:K5'); // PERIODS
  sheet.mergeCells('M5:R5'); // ≥ 12 PASSED
  sheet.mergeCells('S5:U5'); // ≤ 5 / 20

  // Header Row 2
  const header2Row = sheet.getRow(6);
  header2Row.values = ['', '', 'BOYS', 'GIRLS', 'TOTAL', 'PLANNED', 'TAUGHT', '%', 'PLANNED', 'TAUGHT', '%', '', 'NO PASSED','', '', '% PASSED', '', '', '', '', ''];
  header2Row.font = { bold: true, size: 7, name: 'Times New Roman' };
  header2Row.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.mergeCells('M6:O6');
  sheet.mergeCells('P6:R6');
  sheet.mergeCells('S6:U6');

  // Header Row 3
  const header3Row = sheet.getRow(7);
  header3Row.values = ['', '', '', '', '', '', '', '', '', '', '', '', 'B', 'G', 'T', 'B', 'G', 'T','BOYS', 'GIRLS', 'TOTAL'];
  header3Row.font = { bold: true, size: 7, name: 'Times New Roman' };
  header3Row.alignment = { horizontal: 'center', vertical: 'middle' };

  // Data rows
  data.subjects.forEach((subject, index) => {
    const rowNum = 8 + index;
    const dataRow = sheet.getRow(rowNum);
    dataRow.values = [
      index + 1,
      subject.subject.toUpperCase(),
      subject.enrollment.boys, //num of boys enrolled for that course
      subject.enrollment.girls, //num of girls enrolled for that course
      subject.enrollment.total, //num of total enrolled for that course
      subject.topics.planned > 0 ? subject.topics.planned : "",//ignore this for now
      subject.topics.taught > 0 ? subject.topics.taught : "",//ignore this for now
      subject.topics.percentage > 0 ? `${subject.topics.percentage}%` : "", //ignore this for now
      subject.periods.planned > 0 ? subject.periods.planned : "", //ignore this for now
      subject.periods.taught > 0 ? subject.periods.taught : "", //ignore this for now
      subject.periods.percentage > 0 ? `${subject.periods.percentage}%` : "", //ignore this for now
      subject.average, //average score for that course
      subject.passedGte10.boys, // num of boys passed with greater than 10 for that subject or course
      subject.passedGte10.girls, // num of girls passed with greater than 10 for that subject or course
      subject.passedGte10.total, // Total passed with greater than 10 for that subject or course
      subject.passedGte10.boys_percentage,
      subject.passedGte10.girls_percentage,
      subject.passedGte10.total_percentage,
      subject.avgLte5.boys, // num of boys passed with less than 10 for that subject or course
      subject.avgLte5.girls, // num of girls passed with less than 10 for that subject or course
      subject.avgLte5.total // num of Total passed with less than 10 for that subject or course
    ];
    dataRow.font = { size: 8, name: 'Times New Roman' };
    dataRow.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // Left align subject name
    const subjectCell = sheet.getCell(`B${rowNum}`);
    subjectCell.alignment = { horizontal: 'left', vertical: 'middle' };
  });

  // Add borders to all used cells
  for (let rowNum = 5; rowNum <= 7 + data.subjects.length; rowNum++) {
    const row = sheet.getRow(rowNum);
    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  }

  // Add background color to headers
  for (let rowNum = 5; rowNum <= 7; rowNum++) {
    const row = sheet.getRow(rowNum);
    row.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8F9FA' }
      };
    });
  }

  sheet.eachRow({ includeEmpty: true }, (row) => {
  row.height = 24; // height in points
  });

  return workbook;
};

export { exportSummaryStatisticsToExcel };
