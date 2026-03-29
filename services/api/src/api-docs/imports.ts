type ImportApiEndpointDoc = {
  method: "GET" | "POST" | "PATCH";
  path: string;
  auth: string;
  purpose: string;
  requestBody: string[];
  responseShape: string[];
  notes: string[];
};

export const importApiEndpoints: ImportApiEndpointDoc[] = [
  {
    method: "POST",
    path: "/v1/imports",
    auth: "Required",
    purpose: "Create a staged import job from uploaded file contents and return the initial preview.",
    requestBody: [
      "`fileName: string`",
      "`csvText: string`"
    ],
    responseShape: [
      "`importJob: ImportJob`",
      "`previewRows: Array<{ rowIndex: number; row: Record<string, string> }>`",
      "`processedSummary: ProcessedSummary`"
    ],
    notes: [
      "The client reads the selected CSV, OFX, or QFX file and submits normalized text through this route.",
      "Creates staged rows only; transactions are not committed yet."
    ]
  },
  {
    method: "GET",
    path: "/v1/imports",
    auth: "Required",
    purpose: "List import jobs for the current user.",
    requestBody: ["None."],
    responseShape: [
      "`{ imports: ImportJob[] }`"
    ],
    notes: [
      "Used by the import page to refresh the job list after analyze, mapping save, and commit flows."
    ]
  },
  {
    method: "GET",
    path: "/v1/imports/:id",
    auth: "Required",
    purpose: "Fetch import details, current mapping, warnings, and processed preview for one job.",
    requestBody: ["None."],
    responseShape: [
      "`ImportDetailsResponse`"
    ],
    notes: [
      "Backs the main import details panel after a job is selected or created."
    ]
  },
  {
    method: "POST",
    path: "/v1/imports/:id/mapping",
    auth: "Required",
    purpose: "Save the current column mapping and rebuild processed rows with that mapping.",
    requestBody: [
      "`{ mapping: Record<string, string | null> }`"
    ],
    responseShape: [
      "`{ importJob: ImportJob }`"
    ],
    notes: [
      "Requires the canonical `date`, `merchant`, and `amount` fields.",
      "Saving mapping already recomputes direction inference, warnings, and processed rows."
    ]
  },
  {
    method: "GET",
    path: "/v1/imports/:id/processed-rows",
    auth: "Required",
    purpose: "List processed rows for a staged import job.",
    requestBody: [
      "Query params: `status?: string`, `limit?: number`, `offset?: number`."
    ],
    responseShape: [
      "`ImportProcessedRowsResponse`"
    ],
    notes: [
      "Supports the processed-records editor and pagination-style bulk fetches."
    ]
  },
  {
    method: "PATCH",
    path: "/v1/imports/:id/processed-rows/:rowId",
    auth: "Required",
    purpose: "Apply row-level overrides such as include, amount, direction, category, account, or memo.",
    requestBody: [
      "`Partial<ProcessedRow[\"normalized\"]> & { include?: boolean }`"
    ],
    responseShape: [
      "`{ row: ProcessedRow | null; summary: ProcessedSummary }`"
    ],
    notes: [
      "Each row edit rebuilds processed rows immediately while preserving saved overrides."
    ]
  },
  {
    method: "POST",
    path: "/v1/imports/:id/reprocess",
    auth: "Required",
    purpose: "Recompute processed rows from the original raw import using the current mapping and saved overrides.",
    requestBody: ["None."],
    responseShape: [
      "`{ total: number; summary: ProcessedSummary }`"
    ],
    notes: [
      "Retained as an operator/debug recomputation endpoint.",
      "This endpoint is not exposed in the primary UI."
    ]
  },
  {
    method: "GET",
    path: "/v1/imports/:id/reconciliation",
    auth: "Required",
    purpose: "Fetch reconciliation status between staged import rows and known ledger balances/accounts.",
    requestBody: ["None."],
    responseShape: [
      "`ImportReconciliationResponse`"
    ],
    notes: [
      "Used by the reconciliation panel to surface missing account links and balance discrepancies."
    ]
  },
  {
    method: "POST",
    path: "/v1/imports/:id/reconciliation/resolve",
    auth: "Required",
    purpose: "Apply a reconciliation resolution action for an import job.",
    requestBody: [
      "`{ action: \"create_manual_adjustment\", accountId: string, amountDelta: number, reason?: string, note?: string, effectiveAt?: string }`"
    ],
    responseShape: [
      "`ImportReconciliationResolutionResponse`"
    ],
    notes: [
      "Current UI flow uses this to create manual adjustments for discrepancy resolution."
    ]
  },
  {
    method: "POST",
    path: "/v1/imports/:id/commit",
    auth: "Required",
    purpose: "Commit included staged rows into transactions and finalize the import job.",
    requestBody: ["None."],
    responseShape: [
      "`CommitImportResponse`"
    ],
    notes: [
      "This is the only import endpoint that writes final transactions.",
      "Excluded, invalid, and duplicate rows remain out of the committed transaction set."
    ]
  }
];

function renderSection(title: string, lines: string[]) {
  return [
    `${title}:`,
    ...lines.map((line) => `- ${line}`)
  ].join("\n");
}

function renderEndpoint(endpoint: ImportApiEndpointDoc) {
  return [
    `## ${endpoint.method} \`${endpoint.path}\``,
    "",
    `Auth: ${endpoint.auth}`,
    "",
    `Purpose: ${endpoint.purpose}`,
    "",
    renderSection("Request body", endpoint.requestBody),
    "",
    renderSection("Response", endpoint.responseShape),
    "",
    renderSection("Notes", endpoint.notes)
  ].join("\n");
}

export function renderImportApiMarkdown() {
  const endpointSections = importApiEndpoints.map(renderEndpoint).join("\n\n");

  return [
    "# Import API Reference",
    "",
    "Generated by `pnpm docs:api`. Do not edit this file manually.",
    "",
    "These routes power the staged CSV/OFX/QFX import workflow. All endpoints require an authenticated user session.",
    "",
    endpointSections,
    ""
  ].join("\n");
}
