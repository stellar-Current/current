const state = {
  account: '',
  network: 'mainnet',
  balances: [],
  payments: [],
  nextUrl: null,
  busy: false,
  csvHeaders: [],
  csvRows: [],
  reconciliations: [],
};

const networks = {
  mainnet: { name: 'Stellar Mainnet', horizon: 'https://horizon.stellar.org', explorer: 'public' },
  testnet: { name: 'Stellar Testnet', horizon: 'https://horizon-testnet.stellar.org', explorer: 'testnet' },
};

const form = document.querySelector('#account-form');
const accountInput = document.querySelector('#account-input');
const networkSelect = document.querySelector('#network-select');
const statusMessage = document.querySelector('#status-message');
const paymentsBody = document.querySelector('#payments-body');
const exportButton = document.querySelector('#export-button');
const searchInput = document.querySelector('#search-input');
const directionFilter = document.querySelector('#direction-filter');
const assetFilter = document.querySelector('#asset-filter');
const dateFrom = document.querySelector('#date-from');
const dateTo = document.querySelector('#date-to');
const loadMoreButton = document.querySelector('#load-more');
const refreshButton = document.querySelector('#refresh-button');
const csvInput = document.querySelector('#csv-input');
const amountColumn = document.querySelector('#amount-column');
const assetColumn = document.querySelector('#asset-column');
const dateColumn = document.querySelector('#date-column');
const issuerColumn = document.querySelector('#issuer-column');
const matchButton = document.querySelector('#match-button');
const exportMatchButton = document.querySelector('#export-match-button');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted && char === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(field); field = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field); field = '';
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
    } else field += char;
  }
  if (quoted) throw new Error('The CSV has an unfinished quoted field. Check the file and try again.');
  row.push(field);
  if (row.some((cell) => cell.trim())) rows.push(row);
  if (rows.length < 2) throw new Error('Choose a CSV with a header row and at least one data row.');
  const seenHeaders = new Map();
  const headers = rows.shift().map((header, index) => {
    const base = header.trim() || `Column ${index + 1}`;
    const count = (seenHeaders.get(base) || 0) + 1;
    seenHeaders.set(base, count);
    return count === 1 ? base : `${base} (${count})`;
  });
  return { headers, records: rows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, (cells[index] || '').trim()]))) };
}

function populateColumnSelect(select, firstLabel, headers) {
  select.replaceChildren(new Option(firstLabel, ''));
  headers.forEach((header) => select.add(new Option(header, header)));
  select.disabled = !state.account;
}

function renderReconciliations() {
  const body = document.querySelector('#matches-body');
  const wrap = document.querySelector('#match-table-wrap');
  const summary = document.querySelector('#match-summary');
  wrap.hidden = state.reconciliations.length === 0;
  body.replaceChildren();
  if (!state.reconciliations.length) return;
  const confirmed = state.reconciliations.filter((item) => item.confirmed).length;
  const candidates = state.reconciliations.filter((item) => !item.error && item.candidates.length === 1).length;
  const ambiguous = state.reconciliations.filter((item) => !item.error && item.candidates.length > 1).length;
  const unmatched = state.reconciliations.filter((item) => !item.error && item.candidates.length === 0).length;
  const invalid = state.reconciliations.filter((item) => item.error).length;
  summary.textContent = `${confirmed} confirmed · ${candidates} single candidate · ${ambiguous} need review · ${unmatched} unmatched · ${invalid} invalid. Candidate matches compare exact amount and asset code among ${state.payments.length} loaded records; a date column narrows candidates to 24 hours.`;
  state.reconciliations.forEach((item, index) => {
    const tr = document.createElement('tr');
    const expected = `${item.amount} ${item.asset}`;
    const rowNumber = item.rowNumber;
    const selectedAsset = item.selected?.asset_type === 'native' ? 'XLM (native)' : item.selected ? `${assetLabel(item.selected)} · issuer ${shortAddress(item.selected.asset_issuer || '')}` : '';
    const details = item.selected ? `${selectedAsset} · ${formatDate(item.selected.created_at)} · ${shortAddress(item.selected.transaction_hash || '')}` : '';
    const choice = document.createElement('select');
    choice.setAttribute('aria-label', `Select payment candidate for CSV row ${rowNumber}`);
    choice.add(new Option(item.candidates.length ? 'Select candidate' : 'No candidate', ''));
    item.candidates.forEach((payment, candidateIndex) => {
      const issuer = payment.asset_type === 'native' ? 'native XLM' : `${assetLabel(payment)} · ${shortAddress(payment.asset_issuer || '')}`;
      const option = new Option(`${issuer} · ${formatDate(payment.created_at)} · ${shortAddress(payment.transaction_hash || '')}`, String(candidateIndex));
      option.disabled = state.reconciliations.some((other, otherIndex) => otherIndex !== index && other.confirmed
        && (other.selected === payment || (payment.transaction_hash && other.selected?.transaction_hash === payment.transaction_hash)));
      choice.add(option);
    });
    const tdCandidate = document.createElement('td');
    if (item.selected) tdCandidate.textContent = details;
    else if (item.candidates.length) tdCandidate.append(choice);
    else if (item.error) tdCandidate.textContent = 'Not compared';
    else tdCandidate.textContent = 'No loaded payment matches';
    const tdResult = document.createElement('td');
    if (item.error) tdResult.textContent = item.error;
    else if (item.confirmed) tdResult.textContent = 'Confirmed';
    else if (item.selected) tdResult.textContent = 'Selected · confirm below';
    else if (item.candidates.length === 1) tdResult.textContent = 'Suggested · review';
    else if (item.candidates.length > 1) tdResult.textContent = `${item.candidates.length} candidates · choose one`;
    else tdResult.textContent = 'Unmatched';
    if (!item.confirmed && item.candidates.length) {
      const action = document.createElement('button');
      action.className = 'text-button row-match-action';
      action.textContent = item.selected ? 'Confirm match' : item.candidates.length === 1 ? 'Confirm suggested match' : 'Confirm selected candidate';
      action.addEventListener('click', () => {
        const selectedIndex = choice.value || (item.candidates.length === 1 ? '0' : '');
        if (selectedIndex === '') { tdResult.textContent = 'Choose a candidate first'; choice.focus(); return; }
        const payment = item.candidates[Number(selectedIndex)];
        if (state.reconciliations.some((other, otherIndex) => otherIndex !== index && other.confirmed
          && (other.selected === payment || (payment.transaction_hash && other.selected?.transaction_hash === payment.transaction_hash)))) {
          tdResult.textContent = 'This payment is already matched to another CSV row';
          return;
        }
        item.selected = payment;
        item.confirmed = true;
        renderReconciliations();
      });
      tdResult.append(document.createElement('br'), action);
    }
    const tdRow = document.createElement('td'); tdRow.textContent = `Row ${rowNumber}`;
    const tdExpected = document.createElement('td'); tdExpected.textContent = expected;
    tr.append(tdRow, tdExpected, tdCandidate, tdResult); body.append(tr);
  });
  exportMatchButton.disabled = false;
}

function exportReconciliations() {
  if (!state.reconciliations.length) return;
  const rows = [['csv_row', 'expected_amount', 'expected_asset', 'status', 'transaction_hash', 'ledger_date', 'ledger_amount', 'ledger_asset', 'ledger_issuer']];
  for (const item of state.reconciliations) {
    const payment = item.selected;
    const status = item.error ? `invalid: ${item.error}` : item.confirmed ? 'confirmed' : item.candidates.length === 0 ? 'unmatched' : item.candidates.length > 1 ? 'ambiguous' : 'suggested';
    rows.push([item.rowNumber, item.amount, item.asset, status, payment?.transaction_hash || '', payment?.created_at || '', payment ? amountValue(payment) : '', payment ? assetLabel(payment) : '', payment?.asset_issuer || '']);
  }
  const blob = new Blob([rows.map((row) => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = 'current-reconciliation.csv'; link.click(); URL.revokeObjectURL(url);
}

function createReconciliations() {
  const amountKey = amountColumn.value;
  const assetKey = assetColumn.value;
  const dateKey = dateColumn.value;
  const issuerKey = issuerColumn.value;
  if (!amountKey || !assetKey) {
    document.querySelector('#match-summary').textContent = 'Choose both an amount and an asset column before matching.';
    return;
  }
  state.reconciliations = state.csvRows.map((row, index) => {
    const amount = canonicalAmount(row[amountKey]);
    const asset = row[assetKey].trim();
    if (amount === null || !asset) return { rowNumber: index + 2, amount: amount ?? (row[amountKey] || 'Invalid amount'), asset: asset || 'Missing asset', candidates: [], selected: null, confirmed: false, error: amount === null ? 'Invalid amount' : 'Missing asset' };
    const normalizedAsset = asset.toLowerCase();
    const base = state.payments.filter((payment) => canonicalAmount(amountValue(payment)) === amount
      && assetLabel(payment).toLowerCase() === normalizedAsset
      && (!issuerKey || !row[issuerKey] || (payment.asset_issuer || '').toLowerCase() === row[issuerKey].toLowerCase()));
    const dateValue = dateKey ? Date.parse(row[dateKey]) : NaN;
    if (dateKey && row[dateKey] && Number.isNaN(dateValue)) return { rowNumber: index + 2, amount, asset, candidates: [], selected: null, confirmed: false, error: 'Unrecognized date' };
    const candidates = Number.isNaN(dateValue) ? base : base.filter((payment) => Math.abs(Date.parse(payment.created_at) - dateValue) <= 24 * 60 * 60 * 1000);
    return { rowNumber: index + 2, amount, asset, candidates, selected: null, confirmed: false };
  });
  renderReconciliations();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function shortAddress(address) {
  return address ? `${address.slice(0, 5)}…${address.slice(-5)}` : 'Unknown';
}

function setStatus(message = '', kind = 'info') {
  statusMessage.textContent = message;
  statusMessage.className = `notice ${kind}`;
  statusMessage.hidden = !message;
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(new Date(value));
}

function assetKey(payment) {
  if (payment.asset_type === 'native') return 'native:XLM';
  const code = payment.asset_code || payment.asset || 'Unknown asset';
  const issuer = payment.asset_issuer || '';
  return `${code}:${issuer}`;
}

function assetLabel(payment) {
  if (payment.asset_type === 'native') return 'XLM';
  return payment.asset_code || payment.asset || 'Unknown asset';
}

function amountValue(payment) {
  return payment.amount ?? payment.starting_balance ?? '0';
}

function formatAmount(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 7 }).format(number);
}

function canonicalAmount(value) {
  const cleaned = String(value).replaceAll(',', '').trim();
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const negative = cleaned.startsWith('-');
  const unsigned = negative ? cleaned.slice(1) : cleaned;
  const [whole, fraction = ''] = unsigned.split('.');
  const normalized = `${whole.replace(/^0+(?=\d)/, '')}${fraction ? `.${fraction.replace(/0+$/, '')}` : ''}`.replace(/\.$/, '');
  return normalized === '0' ? '0' : `${negative ? '-' : ''}${normalized}`;
}

function directionFor(payment) {
  if (payment.type === 'account_merge') {
    if (payment.account === state.account) return 'sent';
    if (payment.into === state.account) return 'received';
  }
  if (payment.type === 'create_account' && payment.account === state.account) return 'received';
  const from = payment.from || payment.source_account || payment.funder;
  const to = payment.to || payment.destination || payment.into || (payment.type === 'create_account' ? payment.account : '');
  if (from === state.account) return 'sent';
  if (to === state.account) return 'received';
  return 'unknown';
}

function isSent(payment) {
  return directionFor(payment) === 'sent';
}

function counterpartyFor(payment, sent) {
  if (sent) return payment.to || payment.into || payment.destination || '';
  if (directionFor(payment) === 'received') return payment.from || payment.funder || payment.source_account || payment.account || '';
  return payment.from || payment.to || payment.account || payment.source_account || '';
}

function typeLabel(payment, sent) {
  if (payment.type === 'create_account') return 'Account funded';
  if (payment.type === 'account_merge') return sent ? 'Account merged' : 'Account received';
  if (payment.type?.startsWith('path_payment')) return sent ? 'Path payment sent' : 'Path payment received';
  return sent ? 'Payment sent' : 'Payment received';
}

function renderBalances() {
  const native = state.balances.find((balance) => balance.asset_type === 'native');
  const xlm = native ? Number(native.balance) : 0;
  document.querySelector('#total-balance').textContent = `${formatAmount(xlm)} XLM`;
  const issued = state.balances.filter((balance) => balance.asset_type !== 'native');
  document.querySelector('#balance-caption').textContent = `${state.balances.length} assets · ${issued.length} issued asset${issued.length === 1 ? '' : 's'}`;
  const panel = document.querySelector('#assets-panel');
  const list = document.querySelector('#asset-list');
  panel.hidden = issued.length === 0;
  document.querySelector('#asset-count').textContent = `${issued.length} trustline${issued.length === 1 ? '' : 's'}`;
  list.innerHTML = issued.map((balance) => {
    const code = escapeHtml(balance.asset_code || 'Unknown asset');
    const issuer = escapeHtml(balance.asset_issuer || 'Issuer unavailable');
    return `<article class="asset-row"><div class="asset-info"><span class="asset-name">${code}</span><span class="asset-issuer" title="${issuer}">${issuer}</span></div><span class="asset-amount">${escapeHtml(formatAmount(balance.balance))}</span></article>`;
  }).join('');
}

function updateAssetOptions() {
  const selected = assetFilter.value;
  const choices = new Map();
  for (const payment of state.payments) choices.set(assetKey(payment), assetLabel(payment));
  assetFilter.innerHTML = '<option value="all">All assets</option>';
  for (const [key, label] of choices) {
    const option = document.createElement('option');
    option.value = key;
    const issuer = key.includes(':') && key !== 'native:XLM' ? key.slice(key.indexOf(':') + 1) : '';
    option.textContent = issuer ? `${label} · ${shortAddress(issuer)}` : label;
    assetFilter.append(option);
  }
  if (choices.has(selected)) assetFilter.value = selected;
}

function filteredPayments() {
  const query = searchInput.value.trim().toLowerCase();
  const direction = directionFilter.value;
  const selectedAsset = assetFilter.value;
  const from = dateFrom.value ? new Date(`${dateFrom.value}T00:00:00`) : null;
  const to = dateTo.value ? new Date(`${dateTo.value}T23:59:59.999`) : null;
  return state.payments.filter((payment) => {
    const sent = isSent(payment);
    const counterparty = counterpartyFor(payment, sent);
    const amount = String(amountValue(payment));
    const haystack = [counterparty, payment.from, payment.to, payment.asset_code, payment.asset_issuer, payment.transaction_hash, payment.type, amount].join(' ').toLowerCase();
    const createdAt = new Date(payment.created_at);
    return (!query || haystack.includes(query))
      && (direction === 'all' || (direction === 'sent' ? directionFor(payment) === 'sent' : directionFor(payment) === 'received'))
      && (selectedAsset === 'all' || assetKey(payment) === selectedAsset)
      && (!from || createdAt >= from)
      && (!to || createdAt <= to);
  });
}

function renderPayments() {
  updateAssetOptions();
  const payments = filteredPayments();
  document.querySelector('#received-count').textContent = String(state.payments.filter((payment) => directionFor(payment) === 'received').length);
  document.querySelector('#sent-count').textContent = String(state.payments.filter((payment) => directionFor(payment) === 'sent').length);
  document.querySelector('#activity-caption').textContent = state.payments.length
    ? `Showing ${payments.length} of ${state.payments.length} loaded payment records`
    : 'No payment activity found for this account';

  if (!payments.length) {
    const message = state.payments.length ? 'Adjust your filters to see more results.' : 'This account has no recent payment activity.';
    paymentsBody.innerHTML = `<tr class="empty-row"><td colspan="5"><div class="empty-state"><div class="empty-mark">↔</div><strong>No payments to show</strong><span>${message}</span></div></td></tr>`;
  } else {
    const explorer = networks[state.network].explorer;
    paymentsBody.innerHTML = payments.map((payment) => {
      const direction = directionFor(payment);
      const sent = direction === 'sent';
      const counterparty = counterpartyFor(payment, sent);
      const label = direction === 'unknown' ? 'Payment direction unavailable' : typeLabel(payment, sent);
      const amount = amountValue(payment);
      const hash = payment.transaction_hash || '';
      const asset = assetLabel(payment);
      const issuer = payment.asset_issuer ? ` · issuer ${payment.asset_issuer}` : '';
      const content = `<span class="payment-kind"><span class="kind-icon ${sent ? 'sent' : ''}">${sent ? '↗' : '↙'}</span>${escapeHtml(label)}</span>`;
      const transaction = hash
        ? `<a class="transaction-link" href="https://stellar.expert/explorer/${explorer}/tx/${encodeURIComponent(hash)}" target="_blank" rel="noreferrer" aria-label="Open transaction ${escapeHtml(shortAddress(hash))} in Stellar Expert">${content}</a>`
        : content;
      return `<tr>
        <td>${transaction}</td>
        <td><span class="asset-label" title="${escapeHtml(asset + issuer)}">${escapeHtml(asset)}</span></td>
        <td><span class="counterparty" title="${escapeHtml(counterparty)}">${escapeHtml(shortAddress(counterparty))}</span></td>
        <td>${escapeHtml(formatDate(payment.created_at))}</td>
        <td class="align-right"><span class="amount ${sent ? 'sent' : ''}">${sent ? '−' : '+'}${escapeHtml(formatAmount(amount))} ${escapeHtml(asset)}</span></td>
      </tr>`;
    }).join('');
  }

  loadMoreButton.hidden = !state.nextUrl;
  csvInput.disabled = state.payments.length === 0;
  exportButton.disabled = payments.length === 0;
  const filtersDisabled = state.payments.length === 0;
  matchButton.disabled = filtersDisabled || state.csvRows.length === 0;
  searchInput.disabled = filtersDisabled;
  directionFilter.disabled = filtersDisabled;
  assetFilter.disabled = filtersDisabled;
  dateFrom.disabled = filtersDisabled;
  dateTo.disabled = filtersDisabled;
}

async function getJson(url) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 12000);
  let response;
  try {
    response = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Stellar Horizon took too long to respond. Try again.');
    }
    throw new Error('Could not reach Stellar Horizon. Check your connection and try again.');
  } finally {
    window.clearTimeout(timeout);
  }
  if (!response.ok) {
    if (response.status === 404) throw new Error('That account was not found on this network. Check the address and selected network.');
    if (response.status === 429) throw new Error('Stellar Horizon is rate-limiting requests. Wait a moment, then refresh.');
    throw new Error(`Stellar Horizon returned ${response.status}. Please try again in a moment.`);
  }
  return response.json();
}

async function fetchAccount() {
  const url = `${networks[state.network].horizon}/accounts/${encodeURIComponent(state.account)}`;
  return getJson(url);
}

async function fetchPayments(url) {
  const data = await getJson(url);
  return { records: data?._embedded?.records || [], nextUrl: data?._links?.next?.href || null };
}

async function loadAccount({ append = false } = {}) {
  if (state.busy || !state.account) return;
  state.busy = true;
  const submitButton = form.querySelector('button');
  submitButton.disabled = true;
  submitButton.textContent = 'Loading…';
  if (!append) setStatus('Connecting to the public Stellar ledger…');
  try {
    if (!append) {
      const account = await fetchAccount();
      state.balances = account.balances || [];
      renderBalances();
    }
    const url = append && state.nextUrl
      ? state.nextUrl
      : `${networks[state.network].horizon}/accounts/${encodeURIComponent(state.account)}/payments?order=desc&limit=20`;
    const page = await fetchPayments(url);
    state.payments = append ? [...state.payments, ...page.records] : page.records;
    state.nextUrl = page.nextUrl;
    renderPayments();
    setStatus(`Showing ${networks[state.network].name} activity for ${shortAddress(state.account)}.`, 'info');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Unable to load this account.', 'error');
    if (!append) {
      state.balances = [];
      state.payments = [];
      state.nextUrl = null;
      renderBalances();
      renderPayments();
      document.querySelector('#total-balance').textContent = '—';
      document.querySelector('#balance-caption').textContent = 'Connect an account to see balances';
    }
  } finally {
    state.busy = false;
    submitButton.disabled = false;
    submitButton.innerHTML = 'View account <span aria-hidden="true">→</span>';
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const account = accountInput.value.trim();
  if (!/^G[A-Z2-7]{55}$/.test(account)) {
    setStatus('Enter a valid Stellar public account address. Public addresses start with G; never enter a secret key.', 'error');
    accountInput.focus();
    return;
  }
  state.account = account;
  state.balances = [];
  state.payments = [];
  state.nextUrl = null;
  state.csvRows = [];
  state.csvHeaders = [];
  state.reconciliations = [];
  document.querySelector('#csv-name').textContent = 'Choose a CSV export';
  populateColumnSelect(amountColumn, 'Choose column', []);
  populateColumnSelect(assetColumn, 'Choose column', []);
  populateColumnSelect(dateColumn, 'No date filter', []);
  populateColumnSelect(issuerColumn, 'No issuer column', []);
  renderReconciliations();
  setFilterDefaults();
  renderPayments();
  document.querySelector('#assets-panel').hidden = true;
  document.querySelector('#total-balance').textContent = '—';
  document.querySelector('#balance-caption').textContent = 'Loading account';
  await loadAccount();
});

function setFilterDefaults() {
  searchInput.value = '';
  directionFilter.value = 'all';
  assetFilter.value = 'all';
  dateFrom.value = '';
  dateTo.value = '';
}

networkSelect.addEventListener('change', async () => {
  state.network = networkSelect.value;
  document.querySelector('#sidebar-network').textContent = networks[state.network].name;
  if (state.account) {
    state.balances = [];
    state.payments = [];
    state.nextUrl = null;
    state.reconciliations = [];
    renderReconciliations();
    setFilterDefaults();
    renderPayments();
    document.querySelector('#assets-panel').hidden = true;
    document.querySelector('#total-balance').textContent = '—';
    document.querySelector('#balance-caption').textContent = 'Loading selected network';
    await loadAccount();
  }
});

csvInput.addEventListener('change', async () => {
  const file = csvInput.files?.[0];
  if (!file) return;
  try {
    if (file.size > 2_000_000) throw new Error('Choose a CSV smaller than 2 MB.');
    const parsed = parseCsv(await file.text());
    state.csvHeaders = parsed.headers;
    state.csvRows = parsed.records;
    state.reconciliations = [];
    document.querySelector('#csv-name').textContent = `${file.name} · ${parsed.records.length} rows`;
    populateColumnSelect(amountColumn, 'Choose amount', parsed.headers);
    populateColumnSelect(assetColumn, 'Choose asset', parsed.headers);
    populateColumnSelect(dateColumn, 'No date filter', parsed.headers);
    populateColumnSelect(issuerColumn, 'No issuer column', parsed.headers);
    matchButton.disabled = !state.payments.length;
    renderReconciliations();
    document.querySelector('#match-summary').textContent = 'Map amount and asset columns, then find candidate payments. The file has not been uploaded.';
  } catch (error) {
    state.csvRows = [];
    document.querySelector('#csv-name').textContent = 'CSV could not be read';
    document.querySelector('#match-summary').textContent = error instanceof Error ? error.message : 'Choose a valid CSV file.';
  }
});

matchButton.addEventListener('click', createReconciliations);
exportMatchButton.addEventListener('click', exportReconciliations);

for (const control of [searchInput, directionFilter, assetFilter, dateFrom, dateTo]) {
  control.addEventListener('input', renderPayments);
  control.addEventListener('change', renderPayments);
}
loadMoreButton.addEventListener('click', () => loadAccount({ append: true }));
refreshButton.addEventListener('click', () => loadAccount());

function csvCell(value) {
  let text = String(value ?? '');
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

exportButton.addEventListener('click', () => {
  const payments = filteredPayments();
  if (!payments.length) return;
  const rows = [
    ['direction', 'operation', 'amount', 'asset', 'asset_issuer', 'counterparty', 'created_at_utc', 'transaction_hash', 'network'],
    ...payments.map((payment) => {
      const direction = directionFor(payment);
      const sent = direction === 'sent';
      return [
        direction, typeLabel(payment, sent), amountValue(payment), assetLabel(payment),
        payment.asset_issuer || '', counterpartyFor(payment, sent), payment.created_at || '',
        payment.transaction_hash || '', state.network,
      ];
    }),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `current-payments-${state.account.slice(0, 6)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
});

accountInput.addEventListener('input', () => {
  if (statusMessage.classList.contains('error')) setStatus();
});
