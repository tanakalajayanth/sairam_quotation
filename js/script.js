/* Quotation script: matching new layout and calculations */
(() => {
  const selectors = {
    itemsBody: document.getElementById('itemsBody'),
    subtotal: document.getElementById('subtotal'),
    downloadPdf: document.getElementById('downloadPdf'),
    addRowBtn: document.getElementById('addRowBtn'),
    itemsTable: document.getElementById('itemsTable'),
    toggleArea: document.getElementById('toggleArea'),
    toggleQty: document.getElementById('toggleQty'),
    togglePrice: document.getElementById('togglePrice'),
    clientName: document.getElementById('clientName'),
  };

  function formatCurrency(v) {
    return '₹ ' + Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + '/-';
  }

  function toggleColumn(checkbox, className) {
    if (checkbox.checked) {
      selectors.itemsTable.classList.remove(className);
    } else {
      selectors.itemsTable.classList.add(className);
    }
    calculate();
  }

  if (selectors.toggleArea) selectors.toggleArea.addEventListener('change', () => toggleColumn(selectors.toggleArea, 'hide-area'));
  if (selectors.toggleQty) selectors.toggleQty.addEventListener('change', () => toggleColumn(selectors.toggleQty, 'hide-qty'));
  if (selectors.togglePrice) selectors.togglePrice.addEventListener('change', () => toggleColumn(selectors.togglePrice, 'hide-price'));

  function createRow(data = {}) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="position: relative;">
        <button class="row-delete" title="Delete row" data-html2canvas-ignore>✕</button>
        <textarea class="desc" placeholder="Service Description">${data.desc || ''}</textarea>
      </td>
      <td class="col-area"><input class="area" type="number" min="0" value="${data.area || 1}" placeholder="Area"></td>
      <td class="col-qty"><input class="qty" type="number" min="0" value="${data.qty || 1}" placeholder="Qty"></td>
      <td class="col-price"><input class="rate" type="number" min="0" value="${data.rate || 1}" placeholder="Rate"></td>
      <td class="col-amount amount">${formatCurrency(data.amount || 1)}</td>
    `;

    tr.querySelectorAll('input,textarea').forEach(inp => inp.addEventListener('input', calculate));
    tr.querySelector('.row-delete').addEventListener('click', () => {
      tr.remove();
      calculate();
    });
    return tr;
  }

  function calculate() {
    let subtotal = 0;
    const hideArea = !selectors.toggleArea.checked;
    const hideQty = !selectors.toggleQty.checked;
    const hidePrice = !selectors.togglePrice.checked;

    document.querySelectorAll('#itemsBody tr').forEach(row => {
      const area = hideArea ? 1 : (parseFloat(row.querySelector('.area').value) || 0);
      const qty = hideQty ? 1 : (parseFloat(row.querySelector('.qty').value) || 0);
      const rate = hidePrice ? 1 : (parseFloat(row.querySelector('.rate').value) || 0);

      // If everything is hidden, amount should probably be 0 or based on something else, 
      // but let's stick to the math: 1*1*1 = 1. Maybe if rate is 0 it should be 0.
      const amount = (rate === 0 && !hidePrice) ? 0 : (area * qty * rate);

      row.querySelector('.amount').innerText = formatCurrency(amount);
      if (amount > 0) subtotal += amount;
    });

    selectors.subtotal.innerText = formatCurrency(subtotal);
  }

  function addRow(data) {
    selectors.itemsBody.appendChild(createRow(data));
    calculate();
  }

  if (selectors.addRowBtn) selectors.addRowBtn.addEventListener('click', () => addRow());

  function generatePDF() {
    const el = document.getElementById('quotation');

    // Save current styles to restore later
    const originalHeight = el.style.height;
    const originalMinHeight = el.style.minHeight;
    const originalMargin = el.style.margin;
    const originalShadow = el.style.boxShadow;

    // Force the element to fill its last page so the border reaches the bottom
    const pageHeightMm = 297;
    const rect = el.getBoundingClientRect();
    // Calculate current height in mm based on the fixed A4 width (210mm)
    const currentHeightMm = rect.height * (210 / rect.width);
    const totalPages = Math.ceil(currentHeightMm / pageHeightMm);
    // Subtract a tiny bit more to prevent blank page, but use 'height' to force it
    const targetHeightMm = (totalPages * pageHeightMm) - 0.2;

    el.style.height = targetHeightMm + 'mm';
    el.style.minHeight = targetHeightMm + 'mm';
    el.style.margin = '0 auto';
    el.style.boxShadow = 'none';

    const clientNameValue = selectors.clientName ? selectors.clientName.value : '';
    const safeClientName = clientNameValue.trim().replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_');
    const filename = safeClientName ? `${safeClientName}_Estimate.pdf` : 'Interior_Estimate.pdf';

    const opt = {
      margin: 0,
      filename: filename,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        scrollY: 0,
        scrollX: 0,
        windowHeight: el.scrollHeight
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: 'css' }
    };

    calculate();

    // Increased delay to ensure 'height' change is fully respected by the engine
    setTimeout(() => {
      html2pdf().set(opt).from(el).save()
        .then(() => {
          // Restore the original state
          el.style.height = originalHeight;
          el.style.minHeight = originalMinHeight;
          el.style.margin = originalMargin;
          el.style.boxShadow = originalShadow;
        })
        .catch(e => {
          alert('PDF export failed: ' + e.message);
          el.style.height = originalHeight;
          el.style.minHeight = originalMinHeight;
          el.style.margin = originalMargin;
          el.style.boxShadow = originalShadow;
        });
    }, 400);
  }

  // Quotation starts empty on page load
  function seed() {
    // if (document.querySelectorAll('#itemsBody tr').length) return;
    // addRow({ desc: 'PLYWOOD WITH LAMINATE (BASIC)', qty: 0 });
    // addRow({ desc: 'T.V. UNIT (GROUND FLOOR)', area: 80, qty: 1, rate: 1050, amount: 84000 });
    // addRow({ desc: "MODULAR KITCHEN - 3 TANDOMS, 2 WICKER BASKET, 1 PULL-OUT (WITH TOP AND BOTTOM 'L' SHAPED STORAGE SPACE)", area: 220, qty: 1, rate: 1550, amount: 341000 });
    // addRow({ desc: 'GROUND MASTER BEDROOM', qty: 0 });
    // addRow({ desc: '     WARDROBE WITH SLIDING DOORS INCLUDES 6 SHELFS AND 2 DRAWERS', area: 120, qty: 1, rate: 1450, amount: 174000 });
    // addRow({ desc: 'T.V. UNIT (1ST FLOOR)', area: 75, qty: 1, rate: 1050, amount: 73500 });
    // addRow({ desc: '1ST FLOOR MASTER BEDROOM', qty: 0 });
    // addRow({ desc: '     WARDROBE WITH SLIDING DOORS INCLUDES 6 SHELFS AND 2 DRAWERS', area: 120, qty: 1, rate: 1450, amount: 174000 });
    // addRow({ desc: 'SINGLE COT BEDROOM 1ST FLOOR', qty: 0 });
    // addRow({ desc: '     WARDROBE WITH SLIDING DOORS INCLUDES 6 SHELFS AND 2 DRAWERS', area: 80, qty: 1, rate: 1450, amount: 116000 });
  }

  if (selectors.downloadPdf) selectors.downloadPdf.addEventListener('click', generatePDF);

  seed();
  calculate();
})();
