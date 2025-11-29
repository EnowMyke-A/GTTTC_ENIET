import React from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { LOGO_BASE64 } from "@/utils/imageUtils";

interface ExportReportProps {
    data: {
        academic_year: string;
        student_name: string;
        dob: string;
        pob: string;
        department: string;
        level: string;
        gender: string;
        num_subjects: number;
        student_id: string;
        num_passed: number;
        repeater: string;
        term: string;
        class_master: string;
        student_photo_base64?: string;
        subjects: Array<{
          subject: string;
          competencies: string;
          ca_score: number;
          exam_score: number;
          average: number;
          coef: number;
          weighted_average: number;
          grade: string;
          min_max_average: string;
          remark_on_average: string;
        }>;
        discipline: {
          unjustified_abs: string;
          justified_abs: string;
          late: string;
          punishment: string;
          conduct: string;
          warning: string;
          reprimand: string;
          suspension: string;
        };
        performance: {
          total_weighted_score: number;
          total_coef: number;
          class_postion: string;
          term_average: number;
          performance_remark: string;
        };
        class_profile: {
          class_average: number;
          min_max: string;
          num_enrolled: number;
          num_passed: number;
          annual_average: number;
          annual_num_passed: number;
        };
      };
}

const ExportReportToExcel: React.FC<ExportReportProps> = ({ data }) => {
  const roundToTwoDecimalPlaces = (num: number): number => {
    if (num % 1 === 0) {
      return num;
    } else {
      return Math.round(num * 100) / 100;
    }
  };

  const shouldDisplayRed = (score: number, type: 'score' | 'weighted', average?: number): boolean => {
    if (type === 'score') {
      return score < 12;
    } else if (type === 'weighted') {
      return average !== undefined && average < 12;
    }
    return false;
  };

  const getGradeFromAverage = (average: number): string => {
    return (average >= 18.5 ? "A" : average >= 16.5 ? "B" : average >= 15.5 ? "C" : average >= 13.5 ? "D" : average >= 12 ? "E" : "F");
  };

  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Report Card", {
      pageSetup: { 
        paperSize: 9, 
        orientation: "portrait",
        margins: {
          left: 0.7,
          right: 0.7,
          top: 0.75,
          bottom: 0.75,
          header: 0.3,
          footer: 0.3
        }
      },
    });

    // Set default row height
    sheet.properties.defaultRowHeight = 18;

    let currentRow = 1;

    // -----------------------------
    // 1. HEADER SECTION - Exact replica of template
    // -----------------------------
    
    // Add logo
    if (LOGO_BASE64) {
      const logoId = workbook.addImage({
        base64: LOGO_BASE64,
        extension: "png",
      });
      sheet.addImage(logoId, {
        tl: { col: 4, row: 0 },
        ext: { width: 100, height: 100 },
      });
    }

    // English header (left side)
    sheet.mergeCells(`A${currentRow}:D${currentRow + 3}`);
    const englishHeader = sheet.getCell(`A${currentRow}`);
    englishHeader.value = "Republic of Cameroon\nPeace – Work – Fatherland\nMINISTRY OF SECONDARY EDUCATION\nGOVERNMENT TECHNICAL TEACHER TRAINING COLLEGE (G.T.T.T.C) KUMBA";
    englishHeader.alignment = { vertical: "top", horizontal: "left", wrapText: true };
    englishHeader.font = { name: "Roboto", size: 11, bold: true };

    // French header (right side)
    sheet.mergeCells(`F${currentRow}:J${currentRow + 3}`);
    const frenchHeader = sheet.getCell(`F${currentRow}`);
    frenchHeader.value = "République du Cameroun\nPaix – Travail – Patrie\nMINISTÈRE DES ENSEIGNEMENTS SECONDAIRES\nECOLE NORMALE D'INSTITUTEURS DE L'ENSEIGNEMENT TECHNIQUE (E.N.I.E.T) DE KUMBA";
    frenchHeader.alignment = { vertical: "top", horizontal: "right", wrapText: true };
    frenchHeader.font = { name: "Roboto", size: 11, bold: true };

    currentRow += 5;

    // Header border
    sheet.mergeCells(`A${currentRow}:J${currentRow}`);
    const borderCell = sheet.getCell(`A${currentRow}`);
    borderCell.border = {
      bottom: { style: "thick", color: { argb: "000000" } }
    };

    currentRow += 1;

    // Term title
    sheet.mergeCells(`A${currentRow}:J${currentRow}`);
    const termTitle = sheet.getCell(`A${currentRow}`);
    termTitle.value = `${data.term} Term Academic Report ${data.academic_year}`;
    termTitle.alignment = { horizontal: "center", vertical: "middle" };
    termTitle.font = { name: "Roboto", size: 14, bold: true, underline: true };

    currentRow += 2;

    // -----------------------------
    // 2. STUDENT INFO SECTION - Exact replica
    // -----------------------------
    
    // Add student photo if available
    if (data.student_photo_base64) {
      const studentImgId = workbook.addImage({
        base64: data.student_photo_base64,
        extension: "png",
      });
      sheet.addImage(studentImgId, {
        tl: { col: 8, row: currentRow - 1 },
        ext: { width: 100, height: 100 },
      });
    }

    // Student info in grid layout (2 columns)
    const studentInfoData = [
      ['Name of Student:', data.student_name.toUpperCase(), '', 'Date and Place of Birth:', `${data.dob}, ${data.pob}`],
      ['Class:', `${data.department}${data.level}`, '', 'Gender:', data.gender],
      ['Number of Subjects:', data.num_subjects, '', 'Matricule:', data.student_id],
      ['No. Passed Subjects:', data.num_passed, '', 'Repeater:', data.repeater],
      ['Class Master:', data.class_master, '', '', '']
    ];

    studentInfoData.forEach((rowData, index) => {
      const row = sheet.getRow(currentRow + index);
      rowData.forEach((cellValue, colIndex) => {
        const cell = row.getCell(colIndex + 1);
        cell.value = cellValue;
        if (colIndex === 0 || colIndex === 3) { // Bold labels
          cell.font = { name: "Roboto", size: 12, bold: true };
        } else {
          cell.font = { name: "Roboto", size: 12 };
        }
      });
    });

    currentRow += 6;

    // -----------------------------
    // 3. SUBJECTS TABLE - Exact replica
    // -----------------------------
    const subjectHeaders = [
      'Subjects and Teacher Names',
      'Competencies Evaluated', 
      'Mks/20',
      'Mks/20', 
      'Avg/20',
      'Coef',
      'Avg*Coef',
      'Grade',
      'Min-Max',
      'Remark and Teacher Sign.'
    ];

    // Add subject headers
    const headerRow = sheet.getRow(currentRow);
    subjectHeaders.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { name: "Roboto", size: 12, bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F0F0F0" } };
      cell.border = {
        top: { style: "thin", color: { argb: "0000008F" } },
        bottom: { style: "thin", color: { argb: "0000008F" } },
        left: { style: "thin", color: { argb: "0000008F" } },
        right: { style: "thin", color: { argb: "0000008F" } }
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    });

    currentRow++;

    // Add subject data with exact formatting
    data.subjects.forEach((subject, index) => {
      const row = sheet.getRow(currentRow + index);
      const subjectRowData = [
        subject.subject,
        subject.competencies || 'N/A',
        roundToTwoDecimalPlaces(subject.ca_score),
        roundToTwoDecimalPlaces(subject.exam_score),
        roundToTwoDecimalPlaces(subject.average),
        subject.coef,
        roundToTwoDecimalPlaces(subject.weighted_average),
        subject.grade,
        subject.min_max_average || 'N/A',
        subject.remark_on_average || 'N/A'
      ];

      subjectRowData.forEach((cellValue, colIndex) => {
        const cell = row.getCell(colIndex + 1);
        cell.value = cellValue;
        cell.font = { name: "Roboto", size: 12 };
        cell.border = {
          top: { style: "thin", color: { argb: "0000008F" } },
          bottom: { style: "thin", color: { argb: "0000008F" } },
          left: { style: "thin", color: { argb: "0000008F" } },
          right: { style: "thin", color: { argb: "0000008F" } }
        };
        
        // Apply red color for scores below 12 (exact replica logic)
        if ((colIndex === 2 || colIndex === 3 || colIndex === 4) && shouldDisplayRed(Number(cellValue), 'score')) {
          cell.font = { name: "Roboto", size: 12, color: { argb: "FF0000" } };
        }
        if (colIndex === 6 && shouldDisplayRed(Number(cellValue), 'weighted', subject.average)) {
          cell.font = { name: "Roboto", size: 12, color: { argb: "FF0000" } };
        }

        // Zebra striping (exact replica)
        if (index % 2 === 1) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F9F9F9" } };
        }

        // Text alignment
        if (colIndex === 0) {
          cell.alignment = { horizontal: "left", vertical: "middle" };
        } else {
          cell.alignment = { horizontal: "center", vertical: "middle" };
        }
      });
    });

    currentRow += data.subjects.length + 2;

    // -----------------------------
    // 4. THREE-COLUMN JOINT TABLE - Exact replica
    // -----------------------------
    const threeColumnHeaders = ['Discipline', 'Student Performance', 'Class Profile'];
    const threeColumnHeaderRow = sheet.getRow(currentRow);
    
    threeColumnHeaders.forEach((header, index) => {
      const startCol = index * 3 + 1;
      const endCol = startCol + 2;
      sheet.mergeCells(currentRow, startCol, currentRow, endCol);
      const cell = threeColumnHeaderRow.getCell(startCol);
      cell.value = header;
      cell.font = { name: "Roboto", size: 12, bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F0F0F0" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin", color: { argb: "0000008F" } },
        bottom: { style: "thin", color: { argb: "0000008F" } },
        left: { style: "thin", color: { argb: "0000008F" } },
        right: { style: "thin", color: { argb: "0000008F" } }
      };
    });

    currentRow++;

    // Discipline data (exact replica structure)
    const disciplineData = [
      ['Unjustified Abs', data.discipline.unjustified_abs],
      ['Justified Abs', data.discipline.justified_abs],
      ['Late (times)', data.discipline.late],
      ['Punishment (hrs)', data.discipline.punishment],
      ['Conduct', data.discipline.conduct],
      ['Warnings', data.discipline.warning],
      ['Reprimands', data.discipline.reprimand],
      ['Suspensions', data.discipline.suspension]
    ];

    // Performance data (exact replica structure)
    const performanceData = [
      ['Total Score', roundToTwoDecimalPlaces(data.performance.total_weighted_score)],
      ['Coefficient', data.performance.total_coef],
      ['Rank', data.performance.class_postion],
      ['Term Average', roundToTwoDecimalPlaces(data.performance.term_average)],
      ['Grade', getGradeFromAverage(data.performance.term_average)],
      ['', ''], // Remark header
      ['CVWA', ''], // Performance remark sub-table
      ['', '']
    ];

    // Class Profile data (exact replica structure)
    const classProfileData = [
      ['Class Average', data.class_profile.class_average.toFixed(2)],
      ['Min - Max', data.class_profile.min_max],
      ['No. Enrolled', data.class_profile.num_enrolled],
      ['No. Passed', data.class_profile.num_passed],
      ['Annual Avg', data.class_profile.annual_average],
      ['Annual Passed', data.class_profile.annual_num_passed],
      ['', ''],
      ['', '']
    ];

    const maxRows = Math.max(disciplineData.length, performanceData.length, classProfileData.length);
    
    for (let i = 0; i < maxRows; i++) {
      const row = sheet.getRow(currentRow + i);
      
      // Discipline column
      if (i < disciplineData.length) {
        row.getCell(1).value = disciplineData[i][0];
        row.getCell(2).value = disciplineData[i][1];
        row.getCell(1).font = { name: "Roboto", size: 11, bold: true };
        row.getCell(2).font = { name: "Roboto", size: 11 };
        row.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
        row.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
      }
      
      // Performance column  
      if (i < performanceData.length) {
        row.getCell(4).value = performanceData[i][0];
        row.getCell(5).value = performanceData[i][1];
        row.getCell(4).font = { name: "Roboto", size: 11, bold: true };
        row.getCell(5).font = { name: "Roboto", size: 11 };
        row.getCell(4).alignment = { horizontal: "left", vertical: "middle" };
        row.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
      }
      
      // Class Profile column
      if (i < classProfileData.length) {
        row.getCell(7).value = classProfileData[i][0];
        row.getCell(8).value = classProfileData[i][1];
        row.getCell(7).font = { name: "Roboto", size: 11, bold: true };
        row.getCell(8).font = { name: "Roboto", size: 11 };
        row.getCell(7).alignment = { horizontal: "left", vertical: "middle" };
        row.getCell(8).alignment = { horizontal: "center", vertical: "middle" };
      }

      // Add borders to all cells in the three-column section
      for (let col = 1; col <= 9; col++) {
        const cell = row.getCell(col);
        cell.border = {
          top: { style: "thin", color: { argb: "0000008F" } },
          bottom: { style: "thin", color: { argb: "0000008F" } },
          left: { style: "thin", color: { argb: "0000008F" } },
          right: { style: "thin", color: { argb: "0000008F" } }
        };
      }
    }

    currentRow += maxRows + 1;

    // -----------------------------
    // 5. FOOTER SIGNATURES TABLE - Exact replica
    // -----------------------------
    const footerHeaders = [
      'Remarks on Student Performance',
      'Parent/Guardian\'s Signature',
      'Class Master\'s Signature',
      'The Principal'
    ];

    const footerHeaderRow = sheet.getRow(currentRow);
    footerHeaders.forEach((header, index) => {
      const cell = footerHeaderRow.getCell(index + 1);
      cell.value = header;
      cell.font = { name: "Roboto", size: 12, bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F0F0F0" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin", color: { argb: "0000008F" } },
        bottom: { style: "thin", color: { argb: "0000008F" } },
        left: { style: "thin", color: { argb: "0000008F" } },
        right: { style: "thin", color: { argb: "0000008F" } }
      };
    });

    currentRow++;

    // Add empty signature rows
    const signatureRow = sheet.getRow(currentRow);
    for (let col = 1; col <= 4; col++) {
      const cell = signatureRow.getCell(col);
      cell.value = '';
      cell.border = {
        top: { style: "thin", color: { argb: "0000008F" } },
        bottom: { style: "thin", color: { argb: "0000008F" } },
        left: { style: "thin", color: { argb: "0000008F" } },
        right: { style: "thin", color: { argb: "0000008F" } }
      };
    }

    // Set row height for signature space
    signatureRow.height = 50;

    // -----------------------------
    // 6. SET COLUMN WIDTHS - Exact replica proportions
    // -----------------------------
    sheet.columns = [
      { width: 25 }, // A - Subject names
      { width: 15 }, // B - Competencies  
      { width: 10 }, // C - CA Score
      { width: 10 }, // D - Exam Score
      { width: 10 }, // E - Average
      { width: 8 },  // F - Coef
      { width: 12 }, // G - Weighted
      { width: 8 },  // H - Grade
      { width: 12 }, // I - Min-Max
      { width: 20 }  // J - Remarks
    ];

    // -----------------------------
    // 7. SAVE FILE
    // -----------------------------
    const buf = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buf]), `${data.student_name}_Report.xlsx`);
  };

  return <button onClick={exportExcel}>Export Report to Excel</button>;
};

export default ExportReportToExcel;
