const STORAGE_KEY = "shop-stock-order-app-v2";

const sampleState = {
  suppliers: [
    { id: crypto.randomUUID(), name: "Sunrise Traders", email: "orders@sunrisetraders.example", phone: "+91 98765 43210" },
    { id: crypto.randomUUID(), name: "City Wholesale", email: "sales@citywholesale.example", phone: "+91 91234 56780" },
    { id: crypto.randomUUID(), name: "Fresh Pack Supplies", email: "", phone: "+91 90000 11122" }
  ],
  stocks: [],
  order: [],
  dispatchOrder: [] // Separate storage list for Direct Dispatch tab
};

sampleState.stocks = [
  { id: crypto.randomUUID(), name: "Basmati Rice 5kg", category: "Grocery", supplierId: sampleState.suppliers[0].id, unit: "bags" },
  { id: crypto.randomUUIDUUID(), name: "Toor Dal 1kg", category: "Grocery", supplierId: sampleState.suppliers[0].id, unit: "packs" },
  { id: crypto.randomUUID(), name: "Dishwash Liquid 500ml", category: "Cleaning", supplierId: sampleState.suppliers[1].id, unit: "bottles" },
  { id: crypto.randomUUID(), name: "Paper Carry Bags Medium", category: "Packing", supplierId: sampleState.suppliers[2].id, unit: "bundles" }
];

let state = loadState();

const el = {
  stockForm: document.querySelector("#stockForm"),
  supplierForm: document.querySelector("#supplierForm"),
  orderForm: document.querySelector("#orderForm"),
  dispatchForm: document.querySelector("#dispatchForm"),
  stockTable: document.querySelector("#stockTable"),
  supplierList: document.querySelector("#supplierList"),
  orderList: document.querySelector("#orderList"),
  dispatchOrderList: document.querySelector("#dispatchOrderList"),
  itemSupplier: document.querySelector("#itemSupplier"),
  orderItem: document.querySelector("#orderItem"),
  dispatchOrderItem: document.querySelector("#dispatchOrderItem"),
  supplierFilter: document.querySelector("#supplierFilter"),
  stockSearch: document.querySelector("#stockSearch"),
  printArea: document.querySelector("#printArea"),
  pdfPreview: document.querySelector("#pdfPreview"),
  pdfFrame: document.querySelector("#pdfFrame"),
  pdfDownloadLink: document.querySelector("#pdfDownloadLink"),
  dispatchPdfPreview: document.querySelector("#dispatchPdfPreview"),
  dispatchPdfFrame: document.querySelector("#dispatchPdfFrame"),
  dispatchPdfDownloadLink: document.querySelector("#dispatchPdfDownloadLink"),
  recentOrderAlert: document.querySelector("#recentOrderAlert"),
  dispatchRecentOrderAlert: document.querySelector("#dispatchRecentOrderAlert"),
  pages: document.querySelectorAll(".page"),
  tabButtons: document.querySelectorAll(".tab-button")
};

let activePdfUrl = "";
let dispatchActivePdfUrl = "";

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(sampleState);

  try {
    const parsed = JSON.parse(saved);
    return {
      suppliers: parsed.suppliers || [],
      stocks: (parsed.stocks || []).map(normalizeStockItem),
      order: parsed.order || [],
      dispatchOrder: parsed.dispatchOrder || []
    };
  } catch {
    return structuredClone(sampleState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function currentSupplier(isDispatch = false) {
  const selectedItemId = isDispatch ? el.dispatchOrderItem.value : el.orderItem.value;
  const item = state.stocks.find((stock) => stock.id === selectedItemId);
  if (!item) return state.suppliers[0] || null;
  return state.suppliers.find((supplier) => supplier.id === item.supplierId) || null;
}

function supplierName(id) {
  return state.suppliers.find((supplier) => supplier.id === id)?.name || "No supplier";
}

function keepSelectValue(select, value) {
  if (select && [...select.options].some((option) => option.value === value)) {
    select.value = value;
  }
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

function formatUnit(value) {
  return String(value || "pcs").trim() || "pcs";
}

function normalizeStockItem(item) {
  return {
    id: item.id || crypto.randomUUID(),
    name: item.name || "",
    category: item.category || "",
    supplierId: item.supplierId || "",
    unit: formatUnit(item.unit)
  };
}

function render() {
  renderSupplierOptions();
  renderStockTable();
  renderSupplierList();
  renderAllOrderItems();
  renderOrderList(state.order, el.orderList, "remove-order");
  renderOrderList(state.dispatchOrder, el.dispatchOrderList, "remove-dispatch");
}

function showPage(pageId) {
  el.pages.forEach((page) => {
    const isActive = page.id === pageId;
    page.hidden = !isActive;
    page.classList.toggle("active", isActive);
  });

  el.tabButtons.forEach((button) => {
    const isActive = button.dataset.pageTarget === pageId;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-current", isActive ? "page" : "false");
  });

  if (location.hash !== `#${pageId}`) {
    history.replaceState(null, "", `#${pageId}`);
  }
}

function renderSupplierOptions() {
  const selectedItemSupplier = el.itemSupplier.value;
  const selectedFilterSupplier = el.supplierFilter.value;
  const supplierOptions = state.suppliers
    .map((supplier) => `<option value="${supplier.id}">${escapeHtml(supplier.name)}</option>`)
    .join("");

  el.itemSupplier.innerHTML = supplierOptions;
  el.supplierFilter.innerHTML = `<option value="all">All suppliers</option>${supplierOptions}`;

  keepSelectValue(el.itemSupplier, selectedItemSupplier);
  keepSelectValue(el.supplierFilter, selectedFilterSupplier || "all");

  if (!state.suppliers.length) {
    el.itemSupplier.innerHTML = `<option value="">Add supplier first</option>`;
  }
}

function renderStockTable() {
  const query = el.stockSearch.value.trim().toLowerCase();
  const supplierFilter = el.supplierFilter.value || "all";

  const visibleStocks = state.stocks.filter((item) => {
    const matchesQuery = [item.name, item.category, supplierName(item.supplierId)]
      .join(" ")
      .toLowerCase()
      .includes(query);
    const matchesSupplier = supplierFilter === "all" || item.supplierId === supplierFilter;
    return matchesQuery && matchesSupplier;
  });

  if (!visibleStocks.length) {
    el.stockTable.innerHTML = `<tr><td colspan="4" class="empty">No stock items found.</td></tr>`;
    return;
  }

  el.stockTable.innerHTML = visibleStocks
    .map((item) => {
      return `
        <tr>
          <td data-label="Item">
            <div class="item-name">${escapeHtml(item.name)}</div>
            <div class="subtle">${escapeHtml(item.category || "Uncategorised")}</div>
          </td>
          <td data-label="Supplier">${escapeHtml(supplierName(item.supplierId))}</td>
          <td data-label="Unit">${escapeHtml(formatUnit(item.unit))}</td>
          <td data-label="Actions">
            <div class="row-actions">
              <button class="icon-btn" type="button" data-action="quick-order" data-id="${item.id}" title="Add to order">Order</button>
              <button class="icon-btn danger-soft" type="button" data-action="delete-stock" data-id="${item.id}" title="Delete item">Delete</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderSupplierList() {
  if (!state.suppliers.length) {
    el.supplierList.innerHTML = `<div class="empty">Add your first supplier above.</div>`;
    return;
  }

  el.supplierList.innerHTML = state.suppliers
    .map((supplier) => {
      const count = state.stocks.filter((item) => item.supplierId === supplier.id).length;
      return `
        <div class="supplier-card">
          <div>
            <strong>${escapeHtml(supplier.name)}</strong>
            <div class="supplier-meta">${escapeHtml(supplier.email || "No email saved")} · ${escapeHtml(supplier.phone || "No phone saved")}</div>
            <div class="supplier-meta">${count} stock item${count === 1 ? "" : "s"}</div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderAllOrderItems() {
  if (!state.stocks.length) {
    const backupHtml = `<option value="">No stock items available. Add some first!</option>`;
    el.orderItem.innerHTML = backupHtml;
    el.dispatchOrderItem.innerHTML = backupHtml;
    return;
  }

  const itemsHtml = state.stocks
    .map((item) => {
      const vendorName = supplierName(item.supplierId);
      return `<option value="${item.id}">${escapeHtml(item.name)} (${escapeHtml(vendorName)})</option>`;
    })
    .join("");

  el.orderItem.innerHTML = itemsHtml;
  el.dispatchOrderItem.innerHTML = itemsHtml;
}

function renderOrderList(targetOrderArray, targetElement, actionString) {
  if (!targetOrderArray.length) {
    targetElement.innerHTML = `<div class="empty">Your order list is empty. Add items above!</div>`;
    return;
  }

  const ordersBySupplier = {};
  targetOrderArray.forEach((line) => {
    if (!ordersBySupplier[line.supplierId]) {
      ordersBySupplier[line.supplierId] = [];
    }
    ordersBySupplier[line.supplierId].push(line);
  });

  targetElement.innerHTML = Object.keys(ordersBySupplier)
    .map((supplierId) => {
      const vendorName = supplierName(supplierId);
      const lines = ordersBySupplier[supplierId];

      const itemCardsHTML = lines
        .map((line) => {
          const item = state.stocks.find((stock) => stock.id === line.itemId);
          return `
            <div class="order-card" style="margin-left: 10px; border-left: 3px solid var(--primary); background: #fff;">
              <div>
                <strong>${escapeHtml(item?.name || "Deleted item")}</strong>
                <div class="order-meta">Qty: ${formatNumber(line.quantity)} ${escapeHtml(item?.unit || "")}${line.note ? ` · ${escapeHtml(line.note)}` : ""}</div>
              </div>
              <button class="icon-btn danger-soft" type="button" data-action="${actionString}" data-id="${line.id}" title="Remove from order">Remove</button>
            </div>
          `;
        })
        .join("");

      return `
        <div class="supplier-order-group" style="margin-bottom: 20px;">
          <h3 style="margin: 10px 0; color: var(--primary); font-size: 1rem; border-bottom: 1px dashed var(--line); padding-bottom: 4px;">
            📦 ${escapeHtml(vendorName)}
          </h3>
          <div style="display: grid; gap: 8px;">
            ${itemCardsHTML}
          </div>
        </div>
      `;
    })
    .join("");
}

function addOrUpdateOrderLine(targetOrderArray, item, quantity, note = "") {
  const existing = targetOrderArray.find((line) => line.itemId === item.id);
  if (existing) {
    existing.quantity = Number(existing.quantity) + Number(quantity);
    existing.note = note || existing.note;
  } else {
    targetOrderArray.push({
      id: crypto.randomUUID(),
      supplierId: item.supplierId,
      itemId: item.id,
      quantity: Number(quantity),
      note
    });
  }
}

function showRecentItemNotification(item, quantity, note, alertContainer) {
  alertContainer.innerHTML = `
    <div style="background: var(--ok-bg); color: var(--ok-text); padding: 12px; border-radius: 6px; font-size: 0.9rem; border: 1px solid rgba(36,113,58,0.15)">
      <strong>✨ Recently Added Detail:</strong> ${escapeHtml(item.name)} · Qty: ${formatNumber(quantity)} ${escapeHtml(item.unit)} ${note ? `(${escapeHtml(note)})` : ""}
    </div>
  `;
  alertContainer.style.display = "block";
}

function buildPrintableOrder(isDispatch = false) {
  const supplier = currentSupplier(isDispatch);
  const sourceArray = isDispatch ? state.dispatchOrder : state.order;
  const lines = sourceArray.filter((line) => line.supplierId === supplier?.id);
  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

  if (!supplier || !lines.length) {
    return `<h1>Order List</h1><p>No order items selected.</p>`;
  }

  const rows = lines
    .map((line, index) => {
      const item = state.stocks.find((stock) => stock.id === line.itemId);
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(item?.name || "Deleted item")}</td>
          <td>${escapeHtml(item?.category || "")}</td>
          <td>${formatNumber(line.quantity)} ${escapeHtml(item?.unit || "")}</td>
          <td>${escapeHtml(line.note || "")}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <h1>Purchase Order List</h1>
    <p><strong>Date:</strong> ${today}</p>
    <p><strong>Supplier:</strong> ${escapeHtml(supplier.name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(supplier.email || "-")} &nbsp; <strong>Phone:</strong> ${escapeHtml(supplier.phone || "-")}</p>
    <table>
      <thead>
        <tr>
          <th>No.</th>
          <th>Item</th>
          <th>Category</th>
          <th>Quantity</th>
          <th>Note</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function currentOrderLines(isDispatch = false) {
  const supplier = currentSupplier(isDispatch);
  const sourceArray = isDispatch ? state.dispatchOrder : state.order;
  const lines = sourceArray
    .filter((line) => line.supplierId === supplier?.id)
    .map((line) => ({
      ...line,
      item: state.stocks.find((stock) => stock.id === line.itemId)
    }));

  return { supplier, lines };
}

function orderFileName(supplier) {
  const safeSupplier = supplier.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `order-list-${safeSupplier || "supplier"}.pdf`;
}

function buildOrderTextLines(supplier, lines) {
  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

  return [
    "Purchase Order List",
    `Date: ${today}`,
    `Supplier: ${supplier.name}`,
    `Email: ${supplier.email || "-"}`,
    `Phone: ${supplier.phone || "-"}`,
    "",
    "No.  Item                          Category        Quantity     Note",
    "--------------------------------------------------------------------------",
    ...lines.map((line, index) => {
      const item = line.item;
      return [
        String(index + 1).padEnd(4),
        truncateText(item?.name || "Deleted item", 28).padEnd(30),
        truncateText(item?.category || "", 14).padEnd(16),
        `${formatNumber(line.quantity)} ${item?.unit || ""}`.padEnd(12),
        truncateText(line.note || "", 20)
      ].join("");
    })
  ];
}

function buildOrderShareText(supplier, lines) {
  return [
    `Order list - ${supplier.name}`,
    "",
    ...lines.map((line, index) => {
      const item = line.item;
      return `${index + 1}. ${item?.name || "Deleted item"} - ${line.quantity} ${item?.unit || ""}${line.note ? ` (${line.note})` : ""}`;
    })
  ].join("\n");
}

function createOrderPdfBlob(supplier, lines) {
  return createSimplePdf(buildOrderTextLines(supplier, lines));
}

function showOrderPdfPreview(isDispatch = false) {
  const { supplier, lines } = currentOrderLines(isDispatch);
  if (!supplier || !lines.length) {
    alert("Please add items to the order list first.");
    return;
  }

  const pdfBlob = createOrderPdfBlob(supplier, lines);
  const pdfUrl = URL.createObjectURL(pdfBlob);

  if (isDispatch) {
    if (dispatchActivePdfUrl) URL.revokeObjectURL(dispatchActivePdfUrl);
    dispatchActivePdfUrl = pdfUrl;
    el.dispatchPdfFrame.src = pdfUrl;
    el.dispatchPdfDownloadLink.href = pdfUrl;
    el.dispatchPdfDownloadLink.download = orderFileName(supplier);
    el.dispatchPdfPreview.hidden = false;
  } else {
    if (activePdfUrl) URL.revokeObjectURL(activePdfUrl);
    activePdfUrl = pdfUrl;
    el.pdfFrame.src = pdfUrl;
    el.pdfDownloadLink.href = pdfUrl;
    el.pdfDownloadLink.download = orderFileName(supplier);
    el.pdfPreview.hidden = false;
  }
}

function createSimplePdf(lines) {
  const objects = [];
  const pageHeight = 842;
  const escapedLines = lines.map((line) => escapePdfText(line));
  const content = [
    "BT",
    "/F1 12 Tf",
    "50 790 Td",
    "14 TL",
    ...escapedLines.map((line, index) => `${index === 0 ? "" : "T*"} (${line}) Tj`.trim()),
    "ET"
  ].join("\n");

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 ${pageHeight}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`);
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>");
  objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

function escapePdfText(value) {
  return String(value || "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}

function truncateText(value, maxLength) {
  const text = String(value || "");
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function stockExportRows() {
  return state.stocks.map((item) => {
    const supplier = state.suppliers.find((entry) => entry.id === item.supplierId) || {};
    return {
      "Item Name": item.name || "",
      Category: item.category || "",
      Supplier: supplier.name || "",
      Unit: item.unit || "",
      "Supplier Email": supplier.email || "",
      "Supplier Phone": supplier.phone || ""
    };
  });
}

function downloadBlob(blob, fileName) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
}

function exportCsv() {
  const rows = stockExportRows();
  const headers = ["Item Name", "Category", "Supplier", "Unit", "Supplier Email", "Supplier Phone"];
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))
  ].join("\n");

  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "shop-stock-list.csv");
}

function exportExcel() {
  const rows = stockExportRows();
  const headers = ["Item Name", "Category", "Supplier", "Unit", "Supplier Email", "Supplier Phone"];
  const tableRows = rows
    .map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(row[header])}</td>`).join("")}</tr>`)
    .join("");
  const workbook = `
    <html>
      <head>
        <meta charset="utf-8">
      </head>
      <body>
        <table>
          <thead>
            <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
    </html>
  `;

  downloadBlob(new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8" }), "shop-stock-list.xls");
}

function csvCell(value) {
  return `"${String(value || "").replaceAll('"', '""')}"`;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function importStockRows(rows) {
  if (rows.length < 2) throw new Error("No rows found");

  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const findColumn = (...names) => names.map((name) => headers.indexOf(name)).find((index) => index >= 0);
  const itemIndex = findColumn("item name", "item", "stock item", "name");
  const categoryIndex = findColumn("category");
  const supplierIndex = findColumn("supplier", "supplier name");
  const unitIndex = findColumn("unit", "units");
  const emailIndex = findColumn("supplier email", "email");
  const phoneIndex = findColumn("supplier phone", "phone");

  if (itemIndex === undefined || supplierIndex === undefined) {
    throw new Error("Missing item or supplier column");
  }

  const suppliersByName = new Map(state.suppliers.map((supplier) => [supplier.name.toLowerCase(), supplier]));
  const importedStocks = [];

  rows.slice(1).forEach((row) => {
    const itemName = (row[itemIndex] || "").trim();
    const supplierNameValue = (row[supplierIndex] || "").trim();
    if (!itemName || !supplierNameValue) return;

    const supplierKey = supplierNameValue.toLowerCase();
    let supplier = suppliersByName.get(supplierKey);

    if (!supplier) {
      supplier = {
        id: crypto.randomUUID(),
        name: supplierNameValue,
        email: (row[emailIndex] || "").trim(),
        phone: (row[phoneIndex] || "").trim()
      };
      state.suppliers.push(supplier);
      suppliersByName.set(supplierKey, supplier);
    } else {
      supplier.email = supplier.email || (row[emailIndex] || "").trim();
      supplier.phone = supplier.phone || (row[phoneIndex] || "").trim();
    }

    importedStocks.push({
      id: crypto.randomUUID(),
      name: itemName,
      category: (row[categoryIndex] || "").trim(),
      supplierId: supplier.id,
      unit: formatUnit(row[unitIndex])
    });
  });

  if (!importedStocks.length) throw new Error("No valid stock rows found");
  state.stocks = importedStocks;
  state.order = [];
  state.dispatchOrder = [];
}

function parseExcelHtml(text) {
  const doc = new DOMParser().parseFromString(text, "text/html");
  const tableRows = [...doc.querySelectorAll("tr")];
  return tableRows.map((tableRow) => [...tableRow.children].map((cell) => cell.textContent.trim()));
}

function buildEmailBody(isDispatch = false) {
  const supplier = currentSupplier(isDispatch);
  const sourceArray = isDispatch ? state.dispatchOrder : state.order;
  const lines = sourceArray.filter((line) => line.supplierId === supplier?.id);

  const items = lines.map((line, index) => {
    const item = state.stocks.find((stock) => stock.id === line.itemId);
    return `${index + 1}. ${item?.name || "Deleted item"} - ${line.quantity} ${item?.unit || ""}${line.note ? ` (${line.note})` : ""}`;
  });

  return encodeURIComponent(`Hello ${supplier?.name || ""},

Please send the following items:

${items.join("\n")}

Thank you.`);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function executeOrderSubmit(event, isDispatch) {
  event.preventDefault();
  const selectElement = isDispatch ? el.dispatchOrderItem : el.orderItem;
  const qtyElement = document.querySelector(isDispatch ? "#dispatchOrderQty" : "#orderQty");
  const noteElement = document.querySelector(isDispatch ? "#dispatchOrderNote" : "#orderNote");
  const alertContainer = isDispatch ? el.dispatchRecentOrderAlert : el.recentOrderAlert;
  const targetArray = isDispatch ? state.dispatchOrder : state.order;

  const item = state.stocks.find((stock) => stock.id === selectElement.value);
  if (!item) return;

  const qty = qtyElement.value;
  const noteText = noteElement.value.trim();

  addOrUpdateOrderLine(targetArray, item, qty, noteText);
  saveState();
  
  qtyElement.value = 1;
  noteElement.value = "";
  
  showRecentItemNotification(item, qty, noteText, alertContainer);
  render();
}

el.stockForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.stocks.push({
    id: crypto.randomUUID(),
    name: document.querySelector("#itemName").value.trim(),
    category: document.querySelector("#itemCategory").value.trim(),
    supplierId: el.itemSupplier.value,
    unit: formatUnit(document.querySelector("#itemUnit").value)
  });
  saveState();
  el.stockForm.reset();
  document.querySelector("#itemUnit").value = "pcs";
  render();
});

el.supplierForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.suppliers.push({
    id: crypto.randomUUID(),
    name: document.querySelector("#supplierName").value.trim(),
    email: document.querySelector("#supplierEmail").value.trim(),
    phone: document.querySelector("#supplierPhone").value.trim()
  });
  saveState();
  el.supplierForm.reset();
  render();
});

el.orderForm.addEventListener("submit", (e) => executeOrderSubmit(e, false));
el.dispatchForm.addEventListener("submit", (e) => executeOrderSubmit(e, true));

el.stockTable.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const id = button.dataset.id;
  const action = button.dataset.action;

  if (action === "delete-stock") {
    state.stocks = state.stocks.filter((item) => item.id !== id);
    state.order = state.order.filter((line) => line.itemId !== id);
    state.dispatchOrder = state.dispatchOrder.filter((line) => line.itemId !== id);
  }

  if (action === "quick-order") {
    const item = state.stocks.find((stock) => stock.id === id);
    if (!item) return;
    addOrUpdateOrderLine(state.order, item, 1);
    renderAllOrderItems();
    el.orderItem.value = item.id;
    showRecentItemNotification(item, 1, "", el.recentOrderAlert);
    showPage("orderPage");
  }

  saveState();
  render();
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const action = button.dataset.action;

  if (action === "remove-order") {
    state.order = state.order.filter((line) => line.id !== button.dataset.id);
    saveState();
    render();
  }
  if (action === "remove-dispatch") {
    state.dispatchOrder = state.dispatchOrder.filter((line) => line.id !== button.dataset.id);
    saveState();
    render();
  }
});

el.stockSearch.addEventListener("input", renderStockTable);
el.supplierFilter.addEventListener("change", renderStockTable);

el.tabButtons.forEach((button) => {
  button.addEventListener("click", () => showPage(button.dataset.pageTarget));
});

document.querySelector("#printPdfBtn").addEventListener("click", () => showOrderPdfPreview(false));
document.querySelector("#dispatchPrintPdfBtn").addEventListener("click", () => showOrderPdfPreview(true));

document.querySelector("#emailBtn").addEventListener("click", () => {
  const supplier = currentSupplier(false);
  if (!supplier) return;
  const lines = state.order.filter((line) => line.supplierId === supplier.id);
  if (!lines.length) return;
  window.location.href = `mailto:${encodeURIComponent(supplier.email || "")}?subject=${encodeURIComponent(`Order list - ${supplier.name}`)}&body=${buildEmailBody(false)}`;
});

document.querySelector("#dispatchEmailBtn").addEventListener("click", () => {
  const supplier = currentSupplier(true);
  if (!supplier) return;
  const lines = state.dispatchOrder.filter((line) => line.supplierId === supplier.id);
  if (!lines.length) return;
  window.location.href = `mailto:${encodeURIComponent(supplier.email || "")}?subject=${encodeURIComponent(`Separate Dispatch - ${supplier.name}`)}&body=${buildEmailBody(true)}`;
});

document.querySelector("#resetDemoBtn").addEventListener("click", () => {
  state = structuredClone(sampleState);
  saveState();
  el.recentOrderAlert.style.display = "none";
  el.dispatchRecentOrderAlert.style.display = "none";
  render();
});

document.querySelector("#exportDataBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  downloadBlob(blob, "shop-stock-data.json");
});

document.querySelector("#exportCsvBtn").addEventListener("click", exportCsv);
document.querySelector("#exportExcelBtn").addEventListener("click", exportExcel);

function initializeApp() {
  renderSupplierOptions();
  if (state.suppliers.length > 0 && !el.itemSupplier.value) {
    el.itemSupplier.value = state.suppliers[0].id;
  }
  renderStockTable();
  renderSupplierList();
  renderAllOrderItems();
  renderOrderList(state.order, el.orderList, "remove-order");
  renderOrderList(state.dispatchOrder, el.dispatchOrderList, "remove-dispatch");
}

initializeApp();

if (location.hash) {
  const pageId = location.hash.slice(1);
  if (document.getElementById(pageId)) {
    showPage(pageId);
  }
}
