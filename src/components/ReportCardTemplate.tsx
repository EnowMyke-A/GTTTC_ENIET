import React, { useEffect, useState, ReactNode } from "react";
import Avatar from "/avatar.png";
import { getBase64Image, LOGO_BASE64 } from "@/utils/imageUtils";
import { Subscript } from "lucide-react";

interface ReportCardTemplateProps {
  data: {
    pob: ReactNode;
    department: ReactNode;
    level: ReactNode;
    term: ReactNode;
    academic_year: string;
    student_name: string;
    dob: string;
    class: string;
    gender: string;
    num_subjects: number;
    student_id: string;
    num_passed: number;
    repeater: string;
    class_master: string;
    student_photo_base64?: string;
    subjects: Array<{
      ca_score(ca_score: any): number;
      exam_score(exam_score: any): number;
      weighted_average(weighted_average: any): number;
      min_max_average: ReactNode;
      remark_on_average: ReactNode;
      subject: string;
      teacher: string;
      competencies: string;
      marks: number;
      average: number;
      coef: number;
      total: number;
      grade: string;
      min_max: string;
      remark: string;
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
      total_weighted_score(total_weighted_score: any): number;
      total_coef: ReactNode;
      class_postion: ReactNode;
      total_score: number;
      coef: number;
      rank: string;
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

const ReportCardTemplate: React.FC<ReportCardTemplateProps> = ({ data }) => {
  function roundToTwoDecimalPlaces(num: number): number {
    if (num % 1 === 0) {
      return num;
    } else {
      return Math.round(num * 100) / 100;
    }
  }

  function roundToTwoDecimalPlacesAvg(num: number): string {
  if (!Number.isFinite(num)) {
    return "0.00"; // or "--"
  }

  return num.toFixed(2);
  }

  function toTitleCase(value: string): string {
  if (!value) return "";

  return value
    .split(/(\([^)]*\))/g) // split but keep bracketed parts
    .map(part => {
      // If part is inside brackets, return as-is
      if (part.startsWith("(") && part.endsWith(")")) {
        return part;
      }

      // Title-case only non-bracket text
      return part
        .toLowerCase()
        .replace(/\b\w/g, char => char.toUpperCase());
    })
    .join("");
}


  const formatOrdinalPosition = (position: number): JSX.Element => {
    const getOrdinalSuffix = (num: number): string => {
      const j = num % 10;
      const k = num % 100;
      if (j === 1 && k !== 11) return "st";
      if (j === 2 && k !== 12) return "nd";
      if (j === 3 && k !== 13) return "rd";
      return "th";
    };

    const suffix = getOrdinalSuffix(position);

    return (
      <span>
        {position}
        <span className="text-xs">{suffix}</span>
      </span>
    );
  };

  function shouldDisplayRed(
    score: number,
    type: "score" | "weighted",
    average?: number
  ): boolean {
    if (type === "score") {
      // For ca_score, exam_score, and average - display red if less than 12
      return score < 12;
    } else if (type === "weighted") {
      // For weighted_average - display red if the average is less than 12
      return average !== undefined && average < 12;
    }
    return false;
  }
  const styles = `
    @font-face {
      font-family: 'Roboto Condensed';
      src: url('/fonts/RobotoCondensed-VariableFont_wght.ttf') format('truetype');
      font-weight: 100 900;
      font-style: normal;
      font-display: swap;
    }
    /* Print Mode Styles */
    @media print {
      .report-card {
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      
      @page {
        size: A4;
        margin: 0;
      }

      /* Use Archivo Narrow font only in print mode */
      .report-card * {
        font-family: "Roboto Condensed", sans-serif !important;
      }
    }
    /* Scoped styles for report card only */
    .report-card {
        margin: 0;
        padding: 0;
        background: #fff;
        color: #000;
        font-size: 12px;
    }
    
    .report-card *{
        box-sizing: border-box;
        font-size: 12px;
        font-family: "Roboto Condensed", sans-serif !important;
    }

    .report-card {
        width: 100%;
        max-width: 850px;
        margin: auto;
        padding: 20px 30px;
        border: 2px solid #0000008f;
    }

    /* HEADER */
    .header {
        text-align: center;
        margin-bottom: 0px;
        border-bottom: 2px solid #000;
        padding-bottom: 4px;
        display: flex;
        justify-content: space-between;
        flex-wrap: nowrap;
        align-items: start;
    }

    /* Ensure the individual header sections are sized correctly for the layout */
    .english-header,
    .french-header {
        width: 300px;
    }

    .header h1 {
        font-size: 18px;
        margin: 0;
        font-weight: bold;
        text-transform: uppercase;
    }

    .header h2 {
        font-size: 12px;
        margin: 3px 0;
        font-weight: normal;
    }

    .term-title {
        text-align: center;
        font-weight: bold;
        margin: 10px 0;
        font-size: 14px;
        text-transform: uppercase;
        text-decoration: underline;
    }

    /* STUDENT INFO */
    .student-box {
        padding: 0;
        margin-bottom: 4px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-direction: row-reverse;
        gap: 20px;

    }

    .student-details {
        width: 80%;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px 100px;
    }

    .student-photo {
        width: 15%;
        text-align: center;
        font-size: 12px;
        background: #f9f9f9;
        border-radius: 4px;
    }

    /* GENERAL TABLE - Scoped to report card only */
    .report-card table {
        width: 100%;
        border-collapse: collapse;
        margin: 0;
        padding: 0;
    }

    .report-card th,
    .report-card td {
        border: 1px solid #0000008f;
        padding: 2px 6px;
        text-align: center;
        font-size: 12px;
    }

    .report-card .three-column-joint-table td td, .three-column-joint-table th{
      padding: 4px 6px;
    }

    .report-card th {
        background: #f0f0f0;
        font-weight: 600;
        font-size: 12px;
    }

    .report-card tbody tr:nth-child(even) {
        background: #f9f9f9;
    }

    .report-card .three-column-joint table tr {
        border: none !important;
    }
    
    /* Ensure nested tables inherit styles */
    .report-card table table {
        font-size: inherit;
    }

    /* FOOTER */
    .footer {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        margin-top: 30px;
        text-align: center;
        font-size: 12px;
        gap: 20px;
    }

    .footer div {
        border-top: 1px solid #000;
        padding-top: 25px;
    }

    /* =========================================================================== */
    /* PRINT STYLES - This is the crucial part for making it print-ready */
    /* =========================================================================== */
    @media print {
      @page {
        size: A4 portrait;
        margin: 7mm;
      }

      /* Make the printable area predictable */
      .report-card {
        max-width: none !important;
        padding: 0 !important;
        margin: 0 !important;
        border: none !important;
      }

      /* Images: force printing & sizing */
      img {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        max-width: 100% !important;
        height: auto !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      /* Keep key sections together */
      .report-card .header,
      .report-card .student-box,
      .report-card table,
      .report-card .footer {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      /* Preserve header/table shading */
      .report-card th {
        background: #f0f0f0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .report-card tbody tr:nth-child(even) {
        background: #f9f9f9 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      /* Make borders visible in print */
      .report-card th, 
      .report-card td {
        border-color: #0000008f !important;
        word-wrap: break-word !important;
        white-space: normal !important;
      }

      /* Remove anything that can trip rasterization */
      * {
        box-shadow: none !important;
        filter: none !important;
        transform: none !important;
      }

      .report-card table.three-column-joint-table thead th{
      font-weight: 500 !important;
      }

      .report-card table.three-column-joint-table tbody th{
      font-weight: 500 !important;
      }

      /* Background images still won't print unless user enables them,
        so we don't rely on them for logos/photos. */
    }

  `;

  function getGradeFromAverage(arg0: number): string {
    return arg0 >= 18.5
      ? "A"
      : arg0 >= 16.5
      ? "B"
      : arg0 >= 15.5
      ? "C"
      : arg0 >= 13.5
      ? "D"
      : arg0 >= 12
      ? "E"
      : "F";
  }

  return (
    <div className="isolate">
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="report-card" style={{ all: "revert" }}>
        {/* HEADER */}
        <div className="header">
          {/* English Side */}
          <div className="english-header" style={{ width: "300px" }}>
            <h1 style={{ fontSize: "14px" }}>Republic of Cameroon</h1>
            <h2>Peace – Work – Fatherland</h2>
            <h2 style={{ textTransform: "uppercase", fontSize: "12px" }}>
              Ministry of Secondary Education
            </h2>
            <h2 style={{ textTransform: "uppercase", fontSize: "12px" }}>
              Government Technical Teacher Training College (G.T.T.T.C) Kumba
            </h2>
          </div>

          {/* Center Logo — now using inline <img> with base64 */}
          <div
            style={{
              width: "90px",
              height: "90px",
              display: "flex",
              alignItems: "start",
              justifyContent: "center",
            }}
          >
            <img
              src={LOGO_BASE64} // 🔥 Replace with your imported base64 string
              alt="School Logo"
              style={{
                width: "100%",
                objectFit: "contain",
                WebkitPrintColorAdjust: "exact",
                printColorAdjust: "exact",
              }}
            />
          </div>

          {/* French Side */}
          <div className="french-header" style={{ width: "300px" }}>
            <h1 style={{ fontSize: "14px" }}>République du Cameroun</h1>
            <h2>Paix – Travail – Patrie</h2>
            <h2 style={{ textTransform: "uppercase", fontSize: "12px" }}>
              Ministère des Enseignements Secondaires
            </h2>
            <h2 style={{ textTransform: "uppercase", fontSize: "12px" }}>
              ECOLE NORMALE D'INSTITUTEURS DE L'ENSEIGNEMENT TECHNIQUE
              (E.N.I.E.T) DE KUMBA
            </h2>
          </div>
        </div>

        <div className="term-title">
          {data.term} Term Academic Report Card {data.academic_year}
        </div>

        {/* STUDENT INFO */}
        <div className="student-box">
          <div
            className="student-details"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr",
              gap:"0",
              border: "1px solid #0000008f",
              fontSize: "14px",
              width: "100%",
            }}
          >
            {/* ROW 1 */}
            <div
              style={{
                gridColumn: "span 5",
                borderBottom: "1px solid #0000008f",
                padding: "2px 6px",
              }}
            >
              <span style={{fontWeight: "500"}}>Name of Student:</span>&nbsp;&nbsp;&nbsp;<strong style={{fontSize:"12px", letterSpacing:"1px"}}>{data.student_name}</strong> 
            </div>

            <div
              style={{
                borderLeft: "1px solid #0000008f",
                gridColumn: "span 1",
                borderBottom: "1px solid #0000008f",
                padding: "2px 6px",
              }}  
            >
              <strong>Class:</strong>&nbsp;&nbsp;&nbsp;{data.department}
              <sub style={{ fontSize: "9px", fontWeight: "500" }}>
                {data.level}
              </sub>
            </div>

            {/* ROW 2 */}
            <div style={{ borderBottom: "1px solid #0000008f", padding: "2px 6px", gridColumn: "span 4", }}>
              <span style={{fontWeight: "500"}}>Date and Place of Birth:</span>&nbsp;&nbsp;&nbsp;{data.dob}&nbsp;<b>at</b>&nbsp;{data.pob}
            </div>

            <div
              style={{
                borderLeft: "1px solid #0000008f",
                borderBottom: "1px solid #0000008f",
                padding: "2px 6px",
              }}
            >
              <span style={{fontWeight: "500"}}>Gender:</span>&nbsp;&nbsp;&nbsp;{data.gender}
            </div>

            <div
              style={{
                borderLeft: "1px solid #0000008f",
                borderBottom: "1px solid #0000008f",
                padding: "2px 6px",
              }}
            >
              <span style={{fontWeight: "500"}}>Repeater:</span>&nbsp;&nbsp;&nbsp;{data.repeater}
            </div>

            {/* ROW 3 */}
            <div style={{ padding: "2px 6px", gridColumn: "span 2" }}>
              <span style={{fontWeight: "500"}}>Matricule:</span>&nbsp;&nbsp;&nbsp;{data.student_id}
            </div>

            <div style={{ borderLeft: "1px solid #0000008f", padding: "2px 6px" }}>
              <span style={{fontWeight: "500"}}>Subjects:</span>&nbsp;&nbsp;&nbsp;{data.num_subjects}
            </div>

            <div style={{ borderLeft: "1px solid #0000008f", padding: "2px 6px" }}>
              <span style={{fontWeight: "500"}}>Subj. Passed:</span>&nbsp;&nbsp;&nbsp;{data.num_passed}
            </div>

            <div style={{ borderLeft: "1px solid #0000008f", padding: "2px 6px", gridColumn: "span 2"  }}>
              <span style={{fontWeight: "500"}}>Class Master:</span>&nbsp;&nbsp;&nbsp;{data.class_master}
            </div>
          </div>

          <div
            className="student-photo"
            style={{
              width: "70px",
              height: "70px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {data.student_photo_base64 ? (
              <img
                src={data.student_photo_base64}
                alt="Student Photo"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}
              />
            ) : (
              <img
                src={Avatar}
                alt="Student Photo"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}
              />
            )}
          </div>
        </div>

        {/* SUBJECTS TABLE */}
        <table style={{ marginBottom: "5px" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Subjects and Teacher Names</th>
              <th>Competencies Evaluated</th>
              <th>Mks/20</th>
              <th>Mks/20</th>
              <th>Avg/20</th>
              <th>Coef</th>
              <th>Avg*Coef</th>
              <th>Grade</th>
              <th>Min-Max</th>
              <th>Remark and Teacher Sign.</th>
            </tr>
          </thead>
          <tbody>
            {data.subjects.map((subject, index) => (
              <tr key={index}>
                <td
                  style={{
                    textAlign: "left",
                    width: "180px",
                    fontWeight: "500",
                  }}
                >
                  {toTitleCase(subject.subject)} <br />{" "}
                  <span style={{ fontSize: "8px", fontWeight: "400", display: "block", marginTop: "-1px" }}>
                    {toTitleCase(subject.teacher)}
                  </span>
                </td>
                <td style={{ width: "80px" }}>{subject.competencies}</td>
                <td
                  style={{
                    color: shouldDisplayRed(Number(subject.ca_score), "score")
                      ? "red"
                      : "inherit",
                  }}
                >
                  {roundToTwoDecimalPlaces(Number(subject.ca_score))}
                </td>
                <td
                  style={{
                    color: shouldDisplayRed(Number(subject.exam_score), "score")
                      ? "red"
                      : "inherit",
                  }}
                >
                  {roundToTwoDecimalPlaces(Number(subject.exam_score))}
                </td>
                <td
                  style={{
                    color: shouldDisplayRed(Number(subject.average), "score")
                      ? "red"
                      : "inherit",
                  }}
                >
                  {roundToTwoDecimalPlaces(Number(subject.average))}
                </td>
                <td>{subject.coef}</td>
                <td
                  style={{
                    color: shouldDisplayRed(
                      Number(subject.weighted_average),
                      "weighted",
                      Number(subject.average)
                    )
                      ? "red"
                      : "inherit",
                  }}
                >
                  {roundToTwoDecimalPlaces(Number(subject.weighted_average))}
                </td>
                <td
                  style={{
                    color: shouldDisplayRed(
                      Number(subject.weighted_average),
                      "weighted",
                      Number(subject.average)
                    )
                      ? "red"
                      : "inherit",
                  }}
                >
                  {subject.grade}
                </td>
                <td style={{ fontSize: "9px" }}>{subject.min_max_average}</td>
                <td
                  style={{
                    width: "100px",
                    padding: "0",
                    verticalAlign: "top",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      left: 0,
                      right: 0,
                      overflow: "hidden",
                    }}
                  >
                    <table
                      style={{
                        width: "100%",
                        height: "100%",
                        borderCollapse: "collapse",
                        boxSizing: "border-box",
                      }}
                    >
                      <tbody>
                        <tr>
                          <td style={{ border: "none" }}>
                            {subject.remark_on_average}
                          </td>
                          <td
                            style={{
                              width: "30px",
                              border: "none",
                              borderLeft: "1px solid #0000008f",
                            }}
                          ></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* THREE-COLUMN JOINT TABLE */}
        <table
          style={{
            marginBottom: "0px",
            borderCollapse: "collapse",
            tableLayout: "fixed", // 🔑 Forces stable column widths
            width: "100%", // 🔑 Full width table
          }}
          className="three-column-joint-table"
        >
          <colgroup>
            <col style={{ width: "33.33%" }} />
            <col style={{ width: "33.33%" }} />
            <col style={{ width: "33.33%" }} />
          </colgroup>

          <thead>
            <tr>
              <th style={{ borderBottom: "none" }}>Discipline</th>
              <th style={{ borderBottom: "none" }}>Student Performance</th>
              <th style={{ borderBottom: "none" }}>Class Profile</th>
            </tr>
          </thead>

          <tbody
            style={{ verticalAlign: "top" }}
            className="three-column-joint"
          >
            <tr>
              {/* Discipline Column */}
              <td
                style={{
                  padding: 0,
                  verticalAlign: "top",
                  border: "none",
                  borderRight: "1px solid #0000008f",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    tableLayout: "fixed",
                  }}
                >
                  <tbody>
                    <tr>
                      <th style={{ textAlign: "left" }}>Unjustified Abs</th>
                      <td style={{ borderRight: "none" }}>
                        {data.discipline.unjustified_abs}
                      </td>
                    </tr>
                    <tr>
                      <th style={{ textAlign: "left" }}>Justified Abs</th>
                      <td style={{ borderRight: "none" }}>
                        {data.discipline.justified_abs}
                      </td>
                    </tr>
                    <tr>
                      <th style={{ textAlign: "left" }}>Late (times)</th>
                      <td style={{ borderRight: "none" }}>
                        {data.discipline.late}
                      </td>
                    </tr>
                    <tr>
                      <th style={{ textAlign: "left" }}>Punishment (hrs)</th>
                      <td style={{ borderRight: "none" }}>
                        {data.discipline.punishment}
                      </td>
                    </tr>
                    <tr>
                      <th style={{ textAlign: "left" }}>Conduct</th>
                      <td style={{ borderRight: "none" }}>
                        {data.discipline.conduct}
                      </td>
                    </tr>
                    <tr>
                      <th style={{ textAlign: "left" }}>Warnings</th>
                      <td style={{ borderRight: "none" }}>
                        {data.discipline.warning}
                      </td>
                    </tr>
                    <tr>
                      <th style={{ textAlign: "left" }}>Reprimands</th>
                      <td style={{ borderRight: "none" }}>
                        {data.discipline.reprimand}
                      </td>
                    </tr>
                    <tr>
                      <th style={{ textAlign: "left" }}>Suspensions</th>
                      <td style={{ borderRight: "none" }}>
                        {data.discipline.suspension}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>

              {/* Student Performance Column */}
              <td
                style={{
                  padding: 0,
                  verticalAlign: "top",
                  border: "none",
                  borderRight: "1px solid #0000008f",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    tableLayout: "fixed",
                  }}
                >
                  <tbody>
                    <tr>
                      <th style={{ textAlign: "left", borderLeft: "none" }}>
                        Total Score
                      </th>
                      <td style={{ borderRight: "none" }}>
                        {roundToTwoDecimalPlaces(
                          Number(data.performance.total_weighted_score)
                        )}
                      </td>
                    </tr>
                    <tr>
                      <th style={{ textAlign: "left", borderLeft: "none" }}>
                        Total Coef
                      </th>
                      <td style={{ borderRight: "none" }}>
                        {data.performance.total_coef}
                      </td>
                    </tr>
                    <tr>
                      <th style={{ textAlign: "left", borderLeft: "none" }}>
                        Rank
                      </th>
                      <td style={{ borderRight: "none" }}>
                        {data.performance.class_postion}
                        {/*formatOrdinalPosition(
                          Number(data.performance.class_postion)
                        )*/}
                      </td>
                    </tr>
                    <tr>
                      <th style={{ textAlign: "left", borderLeft: "none" }}>
                        Term Average
                      </th>
                      <td style={{ borderRight: "none" }}>
                        {roundToTwoDecimalPlacesAvg(
                          Number(data.performance.term_average)
                        )}
                      </td>
                    </tr>
                    <tr>
                      <th style={{ textAlign: "left", borderLeft: "none" }}>
                        Grade
                      </th>
                      <td style={{ borderRight: "none" }}>
                        {getGradeFromAverage(
                          roundToTwoDecimalPlaces(
                            Number(data.performance.term_average)
                          )
                        )}
                      </td>
                    </tr>
                    {/* Subtable for CVWA-CWA-CA-CAA-CAN */}
                    <tr>
                      <th
                        colSpan={2}
                        style={{
                          textAlign: "center",
                          borderLeft: "none",
                          borderRight: "none",
                        }}
                      >
                        Remark
                      </th>
                    </tr>
                    <tr>
                      <td
                        colSpan={2}
                        style={{
                          padding: "0",
                          borderLeft: "none",
                          borderRight: "none",
                        }}
                      >
                        <table
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            tableLayout: "fixed",
                          }}
                        >
                          <thead>
                            <tr>
                              <th
                                style={{
                                  border: "none",
                                  borderRight: "1px solid #0000008f",
                                  borderBottom: "1px solid #0000008f",
                                }}
                              >
                                CVWA
                              </th>
                              <th
                                style={{
                                  border: "none",
                                  borderRight: "1px solid #0000008f",
                                  borderBottom: "1px solid #0000008f",
                                }}
                              >
                                CWA
                              </th>
                              <th
                                style={{
                                  border: "none",
                                  borderRight: "1px solid #0000008f",
                                  borderBottom: "1px solid #0000008f",
                                }}
                              >
                                CA
                              </th>
                              <th
                                style={{
                                  border: "none",
                                  borderRight: "1px solid #0000008f",
                                  borderBottom: "1px solid #0000008f",
                                }}
                              >
                                CAA
                              </th>
                              <th
                                style={{
                                  border: "none",
                                  borderBottom: "1px solid #0000008f",
                                }}
                              >
                                CAN
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td
                                style={{
                                  border: "none",
                                  borderRight: "1px solid #0000008f",
                                }}
                              >
                                &nbsp;
                              </td>
                              <td
                                style={{
                                  border: "none",
                                  borderRight: "1px solid #0000008f",
                                }}
                              >
                                &nbsp;
                              </td>
                              <td
                                style={{
                                  border: "none",
                                  borderRight: "1px solid #0000008f",
                                }}
                              >
                                &nbsp;
                              </td>
                              <td
                                style={{
                                  border: "none",
                                  borderRight: "1px solid #0000008f",
                                }}
                              >
                                &nbsp;
                              </td>
                              <td style={{ border: "none" }}>&nbsp;</td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>

              {/* Class Profile Column */}
              <td style={{ padding: 0, verticalAlign: "top", border: "none" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    tableLayout: "fixed",
                  }}
                >
                  <tbody>
                    <tr>
                      <th style={{ textAlign: "left", borderLeft: "none" }}>
                        Class Average
                      </th>
                      <td>
                        {Number(data.class_profile.class_average).toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <th style={{ textAlign: "left", borderLeft: "none" }}>
                        Min - Max
                      </th>
                      <td>{data.class_profile.min_max}</td>
                    </tr>
                    <tr>
                      <th style={{ textAlign: "left", borderLeft: "none" }}>
                        No. Enrolled
                      </th>
                      <td>{data.class_profile.num_enrolled}</td>
                    </tr>
                    <tr>
                      <th style={{ textAlign: "left", borderLeft: "none" }}>
                        No. Passed
                      </th>
                      <td>{data.class_profile.num_passed}</td>
                    </tr>
                    <tr>
                      <th style={{ textAlign: "left", borderLeft: "none" }}>
                        Annual Avg
                      </th>
                      <td>{data.class_profile.annual_average}</td>
                    </tr>
                    <tr>
                      <th style={{ textAlign: "left", borderLeft: "none" }}>
                        Annual Passed
                      </th>
                      <td>{data.class_profile.annual_num_passed}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        <table style={{ marginTop: "5px" }}>
          <thead>
            <tr>
              <th>Remarks on Student Performance</th>
              <th>Parent/Guardian's Signature</th>
              <th>Class Master's Signature</th>
              <th>The Principal</th>
            </tr>
          </thead>
          <tbody
            style={{ verticalAlign: "top" }}
            className="three-column-joint"
          >
            <tr>
              {/* Remark Column */}
              <td style={{ padding: "15px", width: "25%" }}></td>

              {/* Parent Signature Column */}
              <td style={{ padding: "15px", width: "25%" }}></td>

              {/* Class Master's Signature Column */}
              <td style={{ padding: "15px", width: "25%" }}></td>

              {/* Principal's Column */}
              <td style={{ padding: "15px", width: "25%" }}></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReportCardTemplate;
