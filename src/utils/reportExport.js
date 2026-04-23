import { Alert, Linking, Platform, Share } from "react-native";
import * as FileSystem from 'expo-file-system';

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

// Check if sharing is available without expo-sharing
async function isSharingAvailable() {
  try {
    // For Android API 23+, we need to check if we can write to external storage
    if (Platform.OS === 'android') {
      const { Status } = await import('expo-file-system');
      // Simplified check - assume available on most devices
      return true;
    }
    return true;
  } catch (error) {
    return false;
  }
}

async function saveAndShareCSV(fileName, csv) {
  try {
    // Create a unique filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fullFileName = `${fileName}_${timestamp}.csv`;
    
    // Get the document directory path
    const fileUri = FileSystem.documentDirectory + fullFileName;
    
    // Write the CSV content to the file
    await FileSystem.writeAsStringAsync(fileUri, csv, {
      encoding: FileSystem.EncodingType.UTF8
    });
    
    // Use React Native's Share API instead of expo-sharing
    try {
      await Share.share({
        title: fileName,
        message: `Export file saved to: ${fileUri}\n\nYou can share this file path or open it in a file manager.`,
        url: fileUri,
      });
      return true;
    } catch (shareError) {
      // If sharing fails, at least show the file path
      Alert.alert(
        "Export Complete",
        `File saved to:\n${fileUri}\n\nYou can access this file through your device's file manager.`,
        [
          { text: "OK", style: "cancel" },
          { text: "Copy Path", onPress: () => {
            // Copy to clipboard
            if (Platform.OS === 'web') {
              navigator.clipboard.writeText(fileUri);
              Alert.alert("Copied!", "File path copied to clipboard");
            } else {
              Alert.alert("File Path", fileUri);
            }
          }}
        ]
      );
      return true;
    }
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
    
    // Web platform
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
    
    // React Native platform
    if (Platform.OS === "ios" || Platform.OS === "android") {
      // Save and share the file
      await saveAndShareCSV(fileName, csv);
      return true;
    }
    
    // Fallback - just show the data
    Alert.alert(
      "Export Data",
      `Data exported successfully! It can be viewed below:\n\n${csv.substring(0, 500)}${csv.length > 500 ? '...' : ''}`,
      [
        { text: "OK", style: "cancel" },
        { text: "Share Data", onPress: () => Share.share({ message: csv }) }
      ]
    );
    return true;
    
  } catch (error) {
    console.error("Export error:", error);
    Alert.alert(
      "Export Failed", 
      `Unable to export data: ${error.message}\n\nPlease try again later or take a screenshot.`
    );
    return false;
  }
}

// Alternative function to export as HTML (can be opened in Excel)
export async function exportRowsToHTML(fileName, rows) {
  if (!rows || !rows.length) {
    Alert.alert("No Data", "There are no records to export.");
    return false;
  }
  
  try {
    // Convert to HTML table for better Excel compatibility
    const headers = Object.keys(rows[0]);
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${fileName}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #4CAF50; }
          th { background-color: #4CAF50; color: white; padding: 12px; }
          td { padding: 10px; border: 1px solid #ddd; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          tr:nth-child(even) { background-color: #f2f2f2; }
          tr:hover { background-color: #ddd; }
        </style>
      </head>
      <body>
        <h1>${fileName}</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
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
    
    if (Platform.OS === "web") {
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      Alert.alert("Success", "HTML file downloaded successfully!");
      return true;
    }
    
    // For mobile - save and share HTML
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileUri = FileSystem.documentDirectory + `${fileName}_${timestamp}.html`;
    await FileSystem.writeAsStringAsync(fileUri, html);
    
    await Share.share({
      title: fileName,
      message: `Export file saved to: ${fileUri}`,
      url: fileUri,
    });
    
    return true;
    
  } catch (error) {
    console.error("HTML Export error:", error);
    Alert.alert("Export Failed", `Unable to export as HTML: ${error.message}`);
    return false;
  }
}

// Function to export specific columns only
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

// Simple export that just shows the data (no file system required)
export async function quickExportToClipboard(fileName, rows) {
  if (!rows || !rows.length) {
    Alert.alert("No Data", "There are no records to export.");
    return false;
  }
  
  try {
    const csv = toCsv(rows);
    
    // For web
    if (Platform.OS === "web" && navigator.clipboard) {
      await navigator.clipboard.writeText(csv);
      Alert.alert("Success", "Data copied to clipboard! You can now paste it into Excel.");
      return true;
    }
    
    // For mobile - share via message
    await Share.share({
      title: fileName,
      message: csv,
    });
    return true;
    
  } catch (error) {
    console.error("Quick export error:", error);
    Alert.alert("Export Failed", "Unable to export data");
    return false;
  }
}