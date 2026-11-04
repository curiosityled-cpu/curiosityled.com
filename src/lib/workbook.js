export const WORKBOOK_URL =
  "https://base44.app/api/apps/69d4650b54be3dc79a1fd0b9/files/mp/public/69d4650b54be3dc79a1fd0b9/e9982f6b0_Curiosity-Led-Succession-Planning-Workbook.pdf";

export const WORKBOOK_FILENAME = "Curiosity-Led-Succession-Planning-Workbook.pdf";

export function startWorkbookDownload() {
  const link = document.createElement("a");
  link.href = WORKBOOK_URL;
  link.download = WORKBOOK_FILENAME;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}