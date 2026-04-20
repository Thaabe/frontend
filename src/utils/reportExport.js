import { Alert, Linking, Platform } from "react-native";

function escapeCell(value) {
  const text = String(value ?? "");
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

export async function exportRowsToExcel(fileName, rows) {
  if (!rows.length) {
    Alert.alert("No data", "There are no records to export.");
    return;
  }

  const csv = toCsv(rows);

  if (Platform.OS === "web" && typeof document !== "undefined") {
    const blob = new Blob([csv], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  const dataUri = `data:application/vnd.ms-excel;charset=utf-8,${encodeURIComponent(csv)}`;
  try {
    await Linking.openURL(dataUri);
  } catch (error) {
    Alert.alert("Export failed", "Unable to open exported file on this device.");
  }
}
