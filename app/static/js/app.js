// --- Libraria Application Frontend ---

const API_BASE = "";

const state = {
  token: localStorage.getItem("libraria_token") || null,
  user: null,
  activeTab: "dashboard",
  books: [],
  categories: [],
  members: [],
  borrows: [],
  searchTimeout: null,
  selectedBook: null,
  selectedBorrow: null
};

// --- API Helper ---
async function api(endpoint, options = {}) {
  const headers = options.headers || {};
  if (state.token) {
    headers["Authorization"] = `Bearer ${state.token}`;
  }
  if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.body);
  }
  options.headers = headers;

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    if (response.status === 401) {
      // Token expired or invalid
      logout();
      showToast("Session expired. Please sign in again.", "danger");
      throw new Error("Unauthorized");
    }
    if (response.status === 204) {
      return null;
    }
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const msg = data && data.detail ? data.detail : "An error occurred";
      throw new Error(msg);
    }
    return data;
  } catch (err) {
    throw err;
  }
}

// --- Toast Notifications ---
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// --- Theme Toggle ---
function initTheme() {
  const saved = localStorage.getItem("libraria_theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
  updateThemeIcon(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("libraria_theme", next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const btn = document.getElementById("theme-toggle-btn");
  if (btn) {
    btn.innerHTML = theme === "dark" ? "☀️" : "🌙";
  }
}

// --- Authentication & Session ---
async function checkAuth() {
  if (!state.token) {
    setDefaultGuest();
    return;
  }
  try {
    const user = await api("/api/auth/me");
    state.user = user;
    renderUserUI();
  } catch (e) {
    setDefaultGuest();
  }
}

function setDefaultGuest() {
  state.token = null;
  state.user = null;
  localStorage.removeItem("libraria_token");
  renderUserUI();
}

function renderUserUI() {
  const badge = document.getElementById("current-user-badge");
  const authBtn = document.getElementById("auth-btn");
  const adminElements = document.querySelectorAll(".admin-only");

  if (state.user) {
    badge.style.display = "flex";
    document.getElementById("user-name-display").textContent = state.user.name;
    document.getElementById("user-role-display").textContent = state.user.role.toUpperCase();
    document.getElementById("user-avatar-initial").textContent = state.user.name.charAt(0).toUpperCase();
    authBtn.textContent = "Sign Out";
    authBtn.onclick = logout;

    // Show/hide admin specific actions
    const isAdmin = state.user.role === "admin";
    adminElements.forEach(el => {
      el.style.display = isAdmin ? "" : "none";
    });
  } else {
    badge.style.display = "none";
    authBtn.textContent = "Sign In";
    authBtn.onclick = () => openModal("modal-login");
    adminElements.forEach(el => {
      el.style.display = "none";
    });
  }
}

async function login(email, password) {
  try {
    const res = await api("/api/auth/login", {
      method: "POST",
      body: { email, password }
    });
    state.token = res.access_token;
    state.user = res.user;
    localStorage.setItem("libraria_token", res.access_token);
    closeModal("modal-login");
    renderUserUI();
    showToast(`Welcome back, ${state.user.name}!`, "success");
    loadActiveView();
  } catch (err) {
    showToast(err.message, "danger");
  }
}

function logout() {
  setDefaultGuest();
  showToast("You have been signed out.", "info");
  loadActiveView();
}

function quickLogin(role) {
  if (role === "admin") {
    login("admin@library.com", "admin123");
  } else {
    login("alice@example.com", "member123");
  }
}

// --- Navigation & View Switching ---
function switchTab(tabName) {
  state.activeTab = tabName;
  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.toggle("active", item.dataset.tab === tabName);
  });
  document.querySelectorAll(".main-view").forEach(view => {
    view.classList.toggle("active", view.id === `view-${tabName}`);
  });

  const titles = {
    dashboard: "Library Overview & Metrics",
    catalog: "Book Catalog & Inventory",
    circulation: "Circulation & Loans",
    members: "Patron Directory",
    analytics: "Analytics & Reports"
  };
  document.getElementById("page-title").textContent = titles[tabName] || "Libraria";

  loadActiveView();
}

function loadActiveView() {
  if (state.activeTab === "dashboard") loadDashboard();
  else if (state.activeTab === "catalog") loadCatalog();
  else if (state.activeTab === "circulation") loadCirculation();
  else if (state.activeTab === "members") loadMembers();
  else if (state.activeTab === "analytics") loadAnalytics();
}

// --- Dashboard View ---
async function loadDashboard() {
  try {
    const data = await api("/api/analytics/dashboard");
    document.getElementById("stat-total-books").textContent = data.total_books;
    document.getElementById("stat-total-copies").textContent = data.total_copies;
    document.getElementById("stat-issued").textContent = data.issued_books;
    document.getElementById("stat-members").textContent = data.total_members;
    document.getElementById("stat-overdue").textContent = data.overdue_loans;
    document.getElementById("stat-fines").textContent = `$${data.total_fines_collected.toFixed(2)}`;

    // Render Recent Activity
    const tbody = document.getElementById("recent-activity-tbody");
    tbody.innerHTML = "";
    if (data.recent_activities.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">No activity recorded yet.</td></tr>`;
    } else {
      data.recent_activities.forEach(act => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${escapeHtml(act.book_title)}</strong></td>
          <td>${escapeHtml(act.user_name)}</td>
          <td><span class="badge badge-${act.badge_type}">${act.action}</span></td>
          <td>${act.date}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    // Render Category Distribution
    const catContainer = document.getElementById("dashboard-categories-list");
    catContainer.innerHTML = "";
    const totalTitles = data.total_books || 1;
    data.category_distribution.slice(0, 5).forEach(c => {
      const pct = Math.round((c.count / totalTitles) * 100);
      const div = document.createElement("div");
      div.className = "category-bar-item";
      div.innerHTML = `
        <div class="category-bar-header">
          <span>${escapeHtml(c.category)}</span>
          <span>${c.count} titles (${pct}%)</span>
        </div>
        <div class="category-progress-track">
          <div class="category-progress-fill" style="width: ${pct}%"></div>
        </div>
      `;
      catContainer.appendChild(div);
    });
  } catch (err) {
    console.error(err);
  }
}

// --- Book Catalog View ---
async function loadCategories() {
  try {
    state.categories = await api("/api/books/categories");
    const select = document.getElementById("catalog-category-filter");
    const bookFormSelect = document.getElementById("book-form-category");
    
    select.innerHTML = '<option value="">All Categories</option>';
    state.categories.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      select.appendChild(opt);
    });

    if (bookFormSelect) {
      bookFormSelect.innerHTML = state.categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
      bookFormSelect.innerHTML += `<option value="Other">Other / Custom</option>`;
    }
  } catch (err) {
    console.error(err);
  }
}

async function loadCatalog() {
  await loadCategories();
  searchBooks();
}

async function searchBooks() {
  const query = document.getElementById("catalog-search-input").value;
  const category = document.getElementById("catalog-category-filter").value;
  const availableOnly = document.getElementById("catalog-available-only").checked;

  let url = `/api/books?available_only=${availableOnly}`;
  if (query.trim()) url += `&q=${encodeURIComponent(query.trim())}`;
  if (category) url += `&category=${encodeURIComponent(category)}`;

  try {
    const res = await api(url);
    state.books = res.books;
    renderBookGrid(res.books);
  } catch (err) {
    showToast(err.message, "danger");
  }
}

function renderBookGrid(books) {
  const grid = document.getElementById("book-grid-container");
  grid.innerHTML = "";

  if (books.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">
      <p style="font-size: 1.2rem; font-weight: 600;">No books matched your search.</p>
      <p>Try clearing your filters or adding a new title.</p>
    </div>`;
    return;
  }

  books.forEach(book => {
    const isAvail = book.available_copies > 0;
    const card = document.createElement("div");
    card.className = "book-card";
    const coverSrc = book.cover_url || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&q=80";

    card.innerHTML = `
      <div class="book-cover-wrap">
        <img src="${escapeHtml(coverSrc)}" alt="${escapeHtml(book.title)}" class="book-cover" onerror="this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80'">
        <span class="book-category-tag">${escapeHtml(book.category)}</span>
      </div>
      <div class="book-details">
        <h4 class="book-title" title="${escapeHtml(book.title)}">${escapeHtml(book.title)}</h4>
        <p class="book-author">by ${escapeHtml(book.author)} (${book.publication_year || 'N/A'})</p>
        <div class="book-meta">
          <span>Location: <strong>${escapeHtml(book.shelf_location)}</strong></span>
          <span class="copies-badge ${isAvail ? 'copies-available' : 'copies-none'}">
            ${book.available_copies}/${book.total_copies} Avail
          </span>
        </div>
        <div class="book-actions">
          <button class="btn btn-secondary btn-sm" style="flex:1" onclick="openBookDetails(${book.id})">Details</button>
          ${isAvail ? `<button class="btn btn-primary btn-sm" style="flex:1" onclick="promptIssueBook(${book.id})">Issue</button>` : `<button class="btn btn-secondary btn-sm" style="flex:1" disabled>Out of Stock</button>`}
          ${state.user && state.user.role === 'admin' ? `
            <button class="btn btn-secondary btn-sm" onclick="openEditBook(${book.id})" title="Edit">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="deleteBook(${book.id})" title="Delete">🗑️</button>
          ` : ''}
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function openBookDetails(bookId) {
  const book = state.books.find(b => b.id === bookId);
  if (!book) return;
  state.selectedBook = book;

  document.getElementById("detail-book-title").textContent = book.title;
  document.getElementById("detail-book-author").textContent = `by ${book.author}`;
  document.getElementById("detail-book-isbn").textContent = book.isbn;
  document.getElementById("detail-book-category").textContent = book.category;
  document.getElementById("detail-book-year").textContent = book.publication_year || "Unknown";
  document.getElementById("detail-book-location").textContent = book.shelf_location;
  document.getElementById("detail-book-copies").textContent = `${book.available_copies} of ${book.total_copies} copies available`;
  document.getElementById("detail-book-desc").textContent = book.description || "No summary provided.";

  const coverImg = document.getElementById("detail-book-cover");
  coverImg.src = book.cover_url || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&q=80";

  const issueBtn = document.getElementById("detail-issue-btn");
  if (book.available_copies > 0) {
    issueBtn.disabled = false;
    issueBtn.onclick = () => {
      closeModal("modal-book-detail");
      promptIssueBook(book.id);
    };
  } else {
    issueBtn.disabled = true;
  }

  openModal("modal-book-detail");
}

function openAddBook() {
  document.getElementById("book-modal-title").textContent = "Add New Book";
  document.getElementById("book-form").reset();
  document.getElementById("book-id-input").value = "";
  openModal("modal-book");
}

function openEditBook(bookId) {
  const book = state.books.find(b => b.id === bookId);
  if (!book) return;
  document.getElementById("book-modal-title").textContent = "Edit Book Details";
  document.getElementById("book-id-input").value = book.id;
  document.getElementById("book-title-input").value = book.title;
  document.getElementById("book-author-input").value = book.author;
  document.getElementById("book-isbn-input").value = book.isbn;
  document.getElementById("book-form-category").value = book.category;
  document.getElementById("book-year-input").value = book.publication_year || "";
  document.getElementById("book-copies-input").value = book.total_copies;
  document.getElementById("book-location-input").value = book.shelf_location;
  document.getElementById("book-cover-input").value = book.cover_url || "";
  document.getElementById("book-desc-input").value = book.description || "";
  openModal("modal-book");
}

async function handleSaveBook(e) {
  e.preventDefault();
  const id = document.getElementById("book-id-input").value;
  const payload = {
    title: document.getElementById("book-title-input").value,
    author: document.getElementById("book-author-input").value,
    isbn: document.getElementById("book-isbn-input").value,
    category: document.getElementById("book-form-category").value,
    publication_year: parseInt(document.getElementById("book-year-input").value) || null,
    total_copies: parseInt(document.getElementById("book-copies-input").value) || 1,
    shelf_location: document.getElementById("book-location-input").value,
    cover_url: document.getElementById("book-cover-input").value,
    description: document.getElementById("book-desc-input").value
  };

  try {
    if (id) {
      await api(`/api/books/${id}`, { method: "PUT", body: payload });
      showToast("Book updated successfully!", "success");
    } else {
      await api("/api/books", { method: "POST", body: payload });
      showToast("New book added to catalog!", "success");
    }
    closeModal("modal-book");
    loadCatalog();
  } catch (err) {
    showToast(err.message, "danger");
  }
}

async function deleteBook(bookId) {
  if (!confirm("Are you sure you want to delete this book?")) return;
  try {
    await api(`/api/books/${bookId}`, { method: "DELETE" });
    showToast("Book deleted.", "info");
    loadCatalog();
  } catch (err) {
    showToast(err.message, "danger");
  }
}

// --- Circulation & Loan Workflows ---
async function loadCirculation() {
  if (!state.user) {
    document.getElementById("circulation-tbody").innerHTML = `
      <tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted);">
        Please <a href="javascript:void(0)" onclick="openModal('modal-login')">sign in</a> to view circulation records.
      </td></tr>
    `;
    return;
  }

  const statusFilter = document.getElementById("circulation-status-filter").value;
  try {
    const records = await api(`/api/borrows?status=${statusFilter}`);
    state.borrows = records;
    renderCirculationTable(records);
  } catch (err) {
    showToast(err.message, "danger");
  }
}

function renderCirculationTable(records) {
  const tbody = document.getElementById("circulation-tbody");
  tbody.innerHTML = "";

  if (records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:2rem;">No loan records found.</td></tr>`;
    return;
  }

  records.forEach(r => {
    const tr = document.createElement("tr");
    let statusBadge = `<span class="badge badge-primary">Active</span>`;
    if (r.status === "returned") {
      statusBadge = `<span class="badge badge-success">Returned</span>`;
    } else if (r.is_overdue) {
      statusBadge = `<span class="badge badge-danger">Overdue (+${r.days_overdue}d)</span>`;
    }

    let fineInfo = "-";
    if (r.fine) {
      fineInfo = `<span class="badge badge-${r.fine.status === 'paid' ? 'success' : 'danger'}">$${r.fine.amount.toFixed(2)} (${r.fine.status})</span>`;
    } else if (r.calculated_fine > 0) {
      fineInfo = `<span class="badge badge-danger">$${r.calculated_fine.toFixed(2)} (Owed)</span>`;
    }

    const isActive = r.status !== "returned";

    tr.innerHTML = `
      <td>#${r.id}</td>
      <td><strong>${escapeHtml(r.book.title)}</strong><br><small style="color:var(--text-muted)">ISBN: ${escapeHtml(r.book.isbn)}</small></td>
      <td>${escapeHtml(r.user.name)}<br><small style="color:var(--text-muted)">Card: ${escapeHtml(r.user.card_number)}</small></td>
      <td>${formatDate(r.borrow_date)}</td>
      <td><span style="${r.is_overdue && isActive ? 'color:var(--danger); font-weight:700;' : ''}">${formatDate(r.due_date)}</span></td>
      <td>${statusBadge}<br>${fineInfo}</td>
      <td>
        <div style="display:flex; gap:0.35rem;">
          ${isActive ? `
            <button class="btn btn-primary btn-sm" onclick="promptReturnBook(${r.id})">Return</button>
            <button class="btn btn-secondary btn-sm" onclick="renewLoan(${r.id})" title="Renew 14 days" ${r.is_overdue ? 'disabled' : ''}>Renew</button>
          ` : `<span style="color:var(--text-light); font-size:0.8rem;">Archived</span>`}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function promptIssueBook(bookId) {
  if (!state.user) {
    openModal("modal-login");
    showToast("Please sign in to borrow a book.", "info");
    return;
  }

  // Populate book dropdown and patron dropdown
  await loadMembersForSelect();
  document.getElementById("issue-book-id").value = bookId;

  // If member (non-admin), preset self
  const memberSelect = document.getElementById("issue-member-id");
  if (state.user.role !== "admin") {
    memberSelect.value = state.user.id;
    memberSelect.disabled = true;
  } else {
    memberSelect.disabled = false;
  }

  openModal("modal-issue");
}

async function loadMembersForSelect() {
  const select = document.getElementById("issue-member-id");
  select.innerHTML = "";
  if (state.user.role === "admin") {
    try {
      const members = await api("/api/members");
      members.forEach(m => {
        const opt = document.createElement("option");
        opt.value = m.id;
        opt.textContent = `${m.name} (${m.card_number})`;
        select.appendChild(opt);
      });
    } catch (e) {
      console.error(e);
    }
  } else {
    const opt = document.createElement("option");
    opt.value = state.user.id;
    opt.textContent = `${state.user.name} (${state.user.card_number})`;
    select.appendChild(opt);
  }
}

async function handleConfirmIssue(e) {
  e.preventDefault();
  const bookId = parseInt(document.getElementById("issue-book-id").value);
  const memberId = parseInt(document.getElementById("issue-member-id").value);
  const days = parseInt(document.getElementById("issue-days").value) || 14;
  const notes = document.getElementById("issue-notes").value;

  try {
    await api("/api/borrows", {
      method: "POST",
      body: {
        book_id: bookId,
        user_id: memberId,
        loan_days: days,
        notes: notes
      }
    });
    closeModal("modal-issue");
    showToast("Book issued successfully!", "success");
    loadActiveView();
  } catch (err) {
    showToast(err.message, "danger");
  }
}

function promptReturnBook(borrowId) {
  const record = state.borrows.find(b => b.id === borrowId);
  if (!record) return;
  state.selectedBorrow = record;

  document.getElementById("return-borrow-id").value = record.id;
  document.getElementById("return-book-name").textContent = record.book.title;
  document.getElementById("return-member-name").textContent = record.user.name;
  document.getElementById("return-due-date").textContent = formatDate(record.due_date);

  const fineNotice = document.getElementById("return-fine-notice");
  const fineAmountElem = document.getElementById("return-fine-amount");
  const payFineCheck = document.getElementById("return-pay-fine-group");

  if (record.is_overdue && record.calculated_fine > 0) {
    fineNotice.style.display = "block";
    fineAmountElem.textContent = `$${record.calculated_fine.toFixed(2)} (${record.days_overdue} days overdue)`;
    payFineCheck.style.display = "block";
  } else {
    fineNotice.style.display = "none";
    payFineCheck.style.display = "none";
  }

  openModal("modal-return");
}

async function handleConfirmReturn(e) {
  e.preventDefault();
  const borrowId = document.getElementById("return-borrow-id").value;
  const payFine = document.getElementById("return-pay-fine-checkbox").checked;
  const notes = document.getElementById("return-notes").value;

  try {
    await api(`/api/borrows/${borrowId}/return`, {
      method: "POST",
      body: {
        notes: notes,
        pay_fine_now: payFine
      }
    });
    closeModal("modal-return");
    showToast("Book returned successfully!", "success");
    loadCirculation();
  } catch (err) {
    showToast(err.message, "danger");
  }
}

async function renewLoan(borrowId) {
  try {
    await api(`/api/borrows/${borrowId}/renew`, { method: "POST" });
    showToast("Loan renewed for an additional 14 days!", "success");
    loadCirculation();
  } catch (err) {
    showToast(err.message, "danger");
  }
}

// --- Members Directory View ---
async function loadMembers() {
  if (!state.user || state.user.role !== "admin") {
    document.getElementById("members-tbody").innerHTML = `
      <tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-muted);">
        Patron directory is accessible to library administrators only.
      </td></tr>
    `;
    return;
  }

  const query = document.getElementById("members-search-input").value;
  let url = "/api/members";
  if (query.trim()) url += `?search=${encodeURIComponent(query.trim())}`;

  try {
    const members = await api(url);
    state.members = members;
    renderMembersTable(members);
  } catch (err) {
    showToast(err.message, "danger");
  }
}

function renderMembersTable(members) {
  const tbody = document.getElementById("members-tbody");
  tbody.innerHTML = "";

  if (members.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No members found.</td></tr>`;
    return;
  }

  members.forEach(m => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${escapeHtml(m.name)}</strong></td>
      <td><code>${escapeHtml(m.card_number)}</code></td>
      <td>${escapeHtml(m.email)}</td>
      <td>${escapeHtml(m.phone || '-')}</td>
      <td>
        <span class="badge ${m.active_borrows_count > 0 ? 'badge-warning' : 'badge-success'}">
          ${m.active_borrows_count} active
        </span>
      </td>
      <td>
        <span class="badge ${m.is_active ? 'badge-success' : 'badge-danger'}">
          ${m.is_active ? 'Active' : 'Disabled'}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openAddMember() {
  document.getElementById("member-form").reset();
  openModal("modal-member");
}

async function handleSaveMember(e) {
  e.preventDefault();
  const payload = {
    name: document.getElementById("member-name-input").value,
    email: document.getElementById("member-email-input").value,
    password: document.getElementById("member-pass-input").value,
    phone: document.getElementById("member-phone-input").value,
    role: "member"
  };

  try {
    await api("/api/members", { method: "POST", body: payload });
    closeModal("modal-member");
    showToast("New patron registered!", "success");
    loadMembers();
  } catch (err) {
    showToast(err.message, "danger");
  }
}

// --- Analytics & Reports ---
async function loadAnalytics() {
  try {
    const stats = await api("/api/analytics/dashboard");
    document.getElementById("analytics-total-books").textContent = stats.total_books;
    document.getElementById("analytics-total-copies").textContent = stats.total_copies;
    document.getElementById("analytics-issued-copies").textContent = stats.issued_books;
    document.getElementById("analytics-fines-pending").textContent = `$${stats.total_fines_pending.toFixed(2)}`;
    document.getElementById("analytics-fines-paid").textContent = `$${stats.total_fines_collected.toFixed(2)}`;

    // Render detailed categories table
    const tbody = document.getElementById("analytics-category-tbody");
    tbody.innerHTML = "";
    stats.category_distribution.forEach(c => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${escapeHtml(c.category)}</strong></td>
        <td>${c.count}</td>
        <td>${Math.round((c.count / (stats.total_books || 1)) * 100)}%</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
  }
}

function exportData(type) {
  if (!state.token) {
    showToast("Please sign in as Admin to download CSV reports.", "warning");
    return;
  }
  window.open(`/api/export/${type}?token=${state.token}`, "_blank");
}

// --- Modal Helpers ---
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.showModal();
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.close();
  }
}

// Enable outside click to dismiss modal
document.querySelectorAll("dialog").forEach(dialog => {
  dialog.addEventListener("click", (e) => {
    const rect = dialog.getBoundingClientRect();
    const isInDialog = (
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width
    );
    if (!isInDialog) {
      dialog.close();
    }
  });
});

// --- Utility Functions ---
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(isoStr) {
  if (!isoStr) return "-";
  const d = new Date(isoStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// --- App Initialization ---
window.addEventListener("DOMContentLoaded", async () => {
  initTheme();
  await checkAuth();

  // Navigation click handlers
  document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", () => switchTab(item.dataset.tab));
  });

  // Search input debouncers
  const catalogSearch = document.getElementById("catalog-search-input");
  if (catalogSearch) {
    catalogSearch.addEventListener("input", () => {
      clearTimeout(state.searchTimeout);
      state.searchTimeout = setTimeout(searchBooks, 300);
    });
  }

  const memberSearch = document.getElementById("members-search-input");
  if (memberSearch) {
    memberSearch.addEventListener("input", () => {
      clearTimeout(state.searchTimeout);
      state.searchTimeout = setTimeout(loadMembers, 300);
    });
  }

  // Form submit handlers
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      login(
        document.getElementById("login-email").value,
        document.getElementById("login-password").value
      );
    });
  }

  const bookForm = document.getElementById("book-form");
  if (bookForm) bookForm.addEventListener("submit", handleSaveBook);

  const issueForm = document.getElementById("issue-form");
  if (issueForm) issueForm.addEventListener("submit", handleConfirmIssue);

  const returnForm = document.getElementById("return-form");
  if (returnForm) returnForm.addEventListener("submit", handleConfirmReturn);

  const memberForm = document.getElementById("member-form");
  if (memberForm) memberForm.addEventListener("submit", handleSaveMember);

  // Initial tab
  switchTab("dashboard");
});
