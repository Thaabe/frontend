import { Alert, Platform, Share } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

function xmlEscape(value) {
  return String(value != null ? value : "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildExcelXml(rows, title) {
  const headers = Object.keys(rows[0] || {});
  const headerCells = headers.map((header) => (
    `<Cell ss:StyleID="Header"><Data ss:Type="String">${xmlEscape(header)}</Data></Cell>`
  )).join("");

  const dataRows = rows.map((row) => {
    const cells = headers.map((header) => {
      const value = row[header];
      const numberValue = Number(value);
      const isNumber = value !== "" && value !== null && value !== undefined && Number.isFinite(numberValue);
      const type = isNumber ? "Number" : "String";
      const dataValue = isNumber ? numberValue : xmlEscape(value);
      return `<Cell ss:StyleID="Data"><Data ss:Type="${type}">${dataValue}</Data></Cell>`;
    }).join("");
    return `<Row>${cells}</Row>`;
  }).join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>${xmlEscape(title)}</Title>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Header">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1F5C4A" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
  </Style>
  <Style ss:ID="Data">
   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="${xmlEscape(title).substring(0, 30) || "Report"}">
  <Table>
   <Row>${headerCells}</Row>
   ${dataRows}
  </Table>
 </Worksheet>
</Workbook>`;
}

async function saveAndShareExcel(fileName, rows) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fullFileName = `${fileName}_${timestamp}.xls`;
  const fileUri = FileSystem.documentDirectory + fullFileName;
  const excelXml = buildExcelXml(rows, fileName);

  await FileSystem.writeAsStringAsync(fileUri, excelXml, {
    encoding: FileSystem.EncodingType.UTF8
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: "application/vnd.ms-excel",
      dialogTitle: `${fileName} export`
    });
    return true;
  }

  await Share.share({
    title: `${fileName}.xls`,
    message: `Export saved at ${fileUri}`,
    url: fileUri
  });
  return true;
}

export async function exportRowsToExcel(fileName, rows) {
  if (!rows || !rows.length) {
    Alert.alert("No Data", "There are no records to export.");
    return false;
  }

  try {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const excelXml = buildExcelXml(rows, fileName);
      const blob = new Blob([excelXml], { type: "application/vnd.ms-excel" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      Alert.alert("Success", "Excel file downloaded successfully.");
      return true;
    }

    await saveAndShareExcel(fileName, rows);
    Alert.alert("Success", "Excel file generated and ready to share.");
    return true;
  } catch (error) {
    console.error("Export error:", error);
    Alert.alert("Export Failed", `Unable to export Excel file: ${error.message}`);
    return false;
  }
}

export async function exportRowsWithCustomColumns(fileName, rows, columns) {
  if (!rows || !rows.length) {
    Alert.alert("No Data", "There are no records to export.");
    return false;
  }

  try {
    const filteredRows = rows.map((row) => {
      const next = {};
      columns.forEach((column) => {
        if (row[column] !== undefined) {
          next[column] = row[column];
        }
      });
      return next;
    });
    return await exportRowsToExcel(fileName, filteredRows);
  } catch (error) {
    console.error("Custom export error:", error);
    Alert.alert("Export Failed", "Unable to export selected columns.");
    return false;
  }
}
