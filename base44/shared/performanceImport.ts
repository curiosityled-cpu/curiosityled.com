/**
 * Shared performance data import logic.
 * Used by importPerformanceData (CSV upload), syncPerformanceData (API), and sftpPullPerformanceData (SFTP polling).
 *
 * All writes are scoped to the provided client_id — never trusted from the payload for API/SFTP paths.
 */

// Simple CSV parser — handles quoted fields, commas inside quotes, and newlines inside quotes.
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      currentField += char;
      i++;
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (char === ",") {
      currentRow.push(currentField);
      currentField = "";
      i++;
      continue;
    }
    if (char === "\r") {
      i++;
      continue;
    }
    if (char === "\n") {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
      i++;
      continue;
    }
    currentField += char;
    i++;
  }
  // Push the last field/row if there's content
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export interface ParsedRow {
  employee_email: string;
  employee_name?: string;
  manager_email?: string;
  department?: string;
  job_title?: string;
  goal_title?: string;
  goal_target?: string;
  goal_actual?: string;
  kpi_name?: string;
  kpi_value?: string;
  review_cycle?: string;
  rating?: string;
  review_date?: string;
}

export function csvToObjects(csvText: string): ParsedRow[] {
  const rows = parseCSV(csvText);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const objects: ParsedRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const obj: any = {};
    for (let j = 0; j < headers.length && j < row.length; j++) {
      obj[headers[j]] = row[j]?.trim() || undefined;
    }
    if (obj.employee_email) objects.push(obj);
  }
  return objects;
}

export interface ImportResult {
  total_rows: number;
  employees_processed: number;
  goals_created: number;
  goals_updated: number;
  kpis_created: number;
  kpis_updated: number;
  kpi_values_recorded: number;
  reviews_created: number;
  reviews_updated: number;
  errors: { row: number; email: string; error: string }[];
  row_results: { row: number; email: string; action: string; details: string }[];
}

/**
 * Process parsed performance data rows.
 * If dry_run is true, returns preview results without writing to the database.
 * client_id is always derived server-side — never from the payload.
 */
export async function processPerformanceRows(
  base44: any,
  rows: ParsedRow[],
  client_id: string,
  source: string,
  dry_run: boolean = false
): Promise<ImportResult> {
  const result: ImportResult = {
    total_rows: rows.length,
    employees_processed: 0,
    goals_created: 0,
    goals_updated: 0,
    kpis_created: 0,
    kpis_updated: 0,
    kpi_values_recorded: 0,
    reviews_created: 0,
    reviews_updated: 0,
    errors: [],
    row_results: [],
  };

  const today = new Date().toISOString().split("T")[0];

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const rowNum = idx + 2; // +2 because row 1 is headers, row 2 is first data row
    try {
      const email = row.employee_email?.toLowerCase().trim();
      if (!email) {
        result.errors.push({ row: rowNum, email: "", error: "Missing employee_email" });
        result.row_results.push({ row: rowNum, email: "", action: "error", details: "Missing employee_email" });
        continue;
      }

      let actions: string[] = [];

      // 1. Upsert Goal if goal_title present
      if (row.goal_title) {
        const existingGoals = await base44.asServiceRole.entities.Goal.filter({
          title: row.goal_title,
          client_id: client_id,
          assigned_to_emails: { $in: [email] },
        });
        const progress = row.goal_actual && row.goal_target
          ? Math.min(100, Math.round((parseFloat(row.goal_actual) / parseFloat(row.goal_target)) * 100))
          : 0;

        if (existingGoals.length > 0) {
          if (!dry_run) {
            await base44.asServiceRole.entities.Goal.update(existingGoals[0].id, {
              progress: progress,
              status: progress >= 100 ? "archived" : "active",
            });
          }
          result.goals_updated++;
          actions.push(`goal updated: ${row.goal_title}`);
        } else {
          if (!dry_run) {
            await base44.asServiceRole.entities.Goal.create({
              title: row.goal_title,
              description: `Imported from ${source}`,
              client_id: client_id,
              assigned_to_emails: [email],
              department: row.department,
              progress: progress,
              status: "active",
              visibility: "shared",
              review_cycle_id: row.review_cycle || undefined,
            });
          }
          result.goals_created++;
          actions.push(`goal created: ${row.goal_title}`);
        }
      }

      // 2. Upsert KPI if kpi_name present
      if (row.kpi_name) {
        const value = row.kpi_value ? parseFloat(row.kpi_value) : undefined;
        const existingKpis = await base44.asServiceRole.entities.KPI.filter({
          title: row.kpi_name,
          client_id: client_id,
          owner_email: email,
        });

        let kpiId: string;
        if (existingKpis.length > 0) {
          kpiId = existingKpis[0].id;
          const updateData: any = {};
          if (value !== undefined) updateData.current_value = value;
          if (row.department) updateData.department = row.department;
          if (!dry_run) {
            await base44.asServiceRole.entities.KPI.update(kpiId, updateData);
          }
          result.kpis_updated++;
          actions.push(`kpi updated: ${row.kpi_name}`);
        } else {
          if (!dry_run) {
            const newKpi = await base44.asServiceRole.entities.KPI.create({
              title: row.kpi_name,
              client_id: client_id,
              owner_email: email,
              department: row.department,
              current_value: value,
              target_value: row.goal_target ? parseFloat(row.goal_target) : undefined,
              unit: "",
              direction: "higher_better",
              visibility: "shared",
              status: "active",
              review_cycle_id: row.review_cycle || undefined,
            });
            kpiId = newKpi.id;
          } else {
            kpiId = "dry_run_preview";
          }
          result.kpis_created++;
          actions.push(`kpi created: ${row.kpi_name}`);
        }

        // Add value_history entry
        if (value !== undefined && !dry_run) {
          const kpi = existingKpis.length > 0 ? existingKpis[0] : await base44.asServiceRole.entities.KPI.get(kpiId);
          const history = kpi.value_history || [];
          history.push({
            date: row.review_date || today,
            value: value,
            source: source,
            recorded_by_email: "system",
          });
          await base44.asServiceRole.entities.KPI.update(kpiId, { value_history: history });
          result.kpi_values_recorded++;
          actions.push(`kpi value recorded: ${value}`);
        }
      }

      // 3. Upsert Review submission if review_cycle + rating present
      if (row.review_cycle && row.rating) {
        // Find the review cycle CustomForm
        const cycles = await base44.asServiceRole.entities.CustomForm.filter({
          form_type: "review_cycle",
          client_id: client_id,
          title: row.review_cycle,
        });
        if (cycles.length === 0) {
          result.errors.push({ row: rowNum, email, error: `Review cycle '${row.review_cycle}' not found` });
          actions.push(`error: review cycle not found`);
        } else {
          const cycle = cycles[0];
          // Find existing review form for this cycle + employee
          const reviewForms = await base44.asServiceRole.entities.CustomForm.filter({
            form_type: "review_form",
            client_id: client_id,
          });
          const reviewForm = reviewForms[0];
          if (reviewForm) {
            const existingSubs = await base44.asServiceRole.entities.CustomFormSubmission.filter({
              form_id: reviewForm.id,
              review_cycle_id: cycle.id,
              linked_employee_email: email,
              submitter_role: "hr",
            });
            if (existingSubs.length > 0) {
              if (!dry_run) {
                await base44.asServiceRole.entities.CustomFormSubmission.update(existingSubs[0].id, {
                  responses: { ...existingSubs[0].responses, overall_rating: row.rating },
                  submitted_at: new Date().toISOString(),
                });
              }
              result.reviews_updated++;
              actions.push(`review updated: rating ${row.rating}`);
            } else {
              if (!dry_run) {
                await base44.asServiceRole.entities.CustomFormSubmission.create({
                  form_id: reviewForm.id,
                  client_id: client_id,
                  submitter_email: "system@curiosity-led.com",
                  submitter_name: "HRIS Import",
                  submitter_role: "hr",
                  linked_employee_email: email,
                  review_cycle_id: cycle.id,
                  responses: { overall_rating: row.rating },
                  status: "submitted",
                  submitted_at: new Date().toISOString(),
                  submission_source: "direct",
                  metadata: { import_source: source, review_date: row.review_date },
                });
              }
              result.reviews_created++;
              actions.push(`review created: rating ${row.rating}`);
            }
          }
        }
      }

      result.employees_processed++;
      result.row_results.push({
        row: rowNum,
        email,
        action: actions.length > 0 ? actions.join("; ") : "no data to import",
        details: `Processed ${actions.length} item(s)`,
      });
    } catch (err: any) {
      result.errors.push({ row: rowNum, email: row.employee_email || "", error: err.message });
      result.row_results.push({ row: rowNum, email: row.employee_email || "", action: "error", details: err.message });
    }
  }

  return result;
}

/**
 * Generate a CSV template string for download.
 */
export function generateCSVTemplate(): string {
  const headers = [
    "employee_email",
    "employee_name",
    "manager_email",
    "department",
    "job_title",
    "goal_title",
    "goal_target",
    "goal_actual",
    "kpi_name",
    "kpi_value",
    "review_cycle",
    "rating",
    "review_date",
  ];
  const sampleRow = [
    "jane.doe@company.com",
    "Jane Doe",
    "manager@company.com",
    "Sales",
    "Account Executive",
    "Close $500K in new business",
    "500000",
    "320000",
    "Win Rate",
    "68",
    "Q2 2026 Performance Review",
    "4",
    "2026-06-30",
  ];
  return [headers.join(","), sampleRow.join(",")].join("\n");
}