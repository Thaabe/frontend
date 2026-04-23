import { Alert, Linking, Platform, Share } from "react-native";
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

function escapeCell(value) {
  const text = String(value != null ? value : "");
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv(rows) {
  if (!rows.length) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const body = rows.map((row) => headers.map((header) => escapeCell(row[header])).join(","));
  return [headers.join(","), ...body].join("\n");
}

async function saveAndShareCSV(fileName, csv) {
  try {
  
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fullFileName = `${fileName}_${timestamp}.csv`;
    
    
    const fileUri = FileSystem.documentDirectory + fullFileName;
    
   
    await FileSystem.writeAsStringAsync(fileUri, csv, {
      encoding: FileSystem.EncodingType.UTF8
    });
    
  
    const isSharingAvailable = await Sharing.isAvailableAsync();
    
    if (isSharingAvailable) {
    
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Report',
        UTI: 'public.comma-separated-values-text'
      });
    } else {
     
      Alert.alert(
        "Export Complete",
        `File saved to: ${fileUri}\n\nYou can access it through your file manager.`,
        [
          { text: "OK", style: "cancel" },
          { text: "Copy Path", onPress: () => Linking.openURL(fileUri) }
        ]
      );
    }
    
    return true;
  } catch (error) {
    console.error("Error saving file:", error);
    throw error;
  }
}

export async function exportRowsToExcel(fileName, rows) {
  if (!rows || !rows.length) {
    Alert.alert("No Data", "There are no records to export.");
    return false;
  }

  try {
    const csv = toCsv(rows);
    
  
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      Alert.alert("Success", "File downloaded successfully!");
      return true;
    }
    

    if (Platform.OS === "ios" || Platform.OS === "android") {
 
      const isSharingAvailable = await Sharing.isAvailableAsync();
      
      if (isSharingAvailable) {
        await saveAndShareCSV(fileName, csv);
        Alert.alert("Success", "File exported successfully!");
        return true;
      } else {
      
        const encodedData = encodeURIComponent(csv);
        const emailUrl = `mailto:?subject=${fileName}&body=${encodedData}`;
        
        try {
          await Linking.openURL(emailUrl);
          Alert.alert("Success", "Data prepared for sharing via email!");
          return true;
        } catch (linkError) {
    
          Alert.alert(
            "Export Data",
            `Data exported successfully!\n\nYou can copy this data:\n\n${csv.substring(0, 500)}${csv.length > 500 ? '...' : ''}`,
            [
              { text: "OK", style: "cancel" },
              { text: "Copy All", onPress: () => Share.share({ message: csv }) }
            ]
          );
          return true;
        }
      }
    }
    
 
    await Share.share({
      title: fileName,
      message: csv,
      subject: fileName
    });
    
    return true;
    
  } catch (error) {
    console.error("Export error:", error);
    Alert.alert(
      "Export Failed", 
      `Unable to export data: ${error.message}\n\nPlease try again later.`
    );
    return false;
  }
}


export async function exportRowsToExcelXLSX(fileName, rows) {
  if (!rows || !rows.length) {
    Alert.alert("No Data", "There are no records to export.");
    return false;
  }
  
  try {
  
    const headers = Object.keys(rows[0]);
    
    let html = `
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${fileName}</title>
        <style>
          th { background-color: #4CAF50; color: white; padding: 8px; }
          td { padding: 8px; border: 1px solid #ddd; }
          table { border-collapse: collapse; width: 100%; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              ${headers.map(h => `<th>${escapeCell(h)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                ${headers.map(h => `<td>${escapeCell(row[h])}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    const fullFileName = `${fileName}_${Date.now()}.xls`;
    
    if (Platform.OS === "web") {
      const blob = new Blob([html], { type: "application/vnd.ms-excel" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fullFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      Alert.alert("Success", "Excel file downloaded successfully!");
      return true;
    }
    
  
    const csv = toCsv(rows);
    return await saveAndShareCSV(fileName, csv);
    
  } catch (error) {
    console.error("XLSX Export error:", error);
    Alert.alert("Export Failed", `Unable to export as Excel: ${error.message}`);
    return false;
  }
}


export async function exportRowsWithCustomColumns(fileName, rows, columns) {
  if (!rows || !rows.length) {
    Alert.alert("No Data", "There are no records to export.");
    return false;
  }
  
  try {
    const filteredRows = rows.map(row => {
      const newRow = {};
      columns.forEach(col => {
        if (row[col] !== undefined) {
          newRow[col] = row[col];
        }
      });
      return newRow;
    });
    
    return await exportRowsToExcel(fileName, filteredRows);
  } catch (error) {
    console.error("Custom export error:", error);
    Alert.alert("Export Failed", "Unable to export with custom columns");
    return false;
  }
}


export async function exportRowsToJSON(fileName, rows) {
  if (!rows || !rows.length) {
    Alert.alert("No Data", "There are no records to export.");
    return false;
  }
  
  try {
    const jsonString = JSON.stringify(rows, null, 2);
    
    if (Platform.OS === "web") {
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      Alert.alert("Success", "JSON file downloaded successfully!");
      return true;
    }
    
  
    const fileUri = FileSystem.documentDirectory + `${fileName}_${Date.now()}.json`;
    await FileSystem.writeAsStringAsync(fileUri, jsonString);
    
    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (isSharingAvailable) {
      await Sharing.shareAsync(fileUri);
    }
    
    Alert.alert("Success", "JSON file exported successfully!");
    return true;
    
  } catch (error) {
    console.error("JSON export error:", error);
    Alert.alert("Export Failed", "Unable to export as JSON");
    return false;
  }
}