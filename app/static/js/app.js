// --- Libraria Application Frontend ---

const API_BASE = "";

const state = {
  token: localStorage.getItem("libraria_token") || null,
  user: null,
  activeTab: "dashboard",
  books: [],
  filteredBooks: [],
  categories: [],
  selectedCategory: "",
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
      showToast("Session expired or sign-in required.", "warning");
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

// --- Theme Management ---
function initTheme() {
  const saved = localStorage.getItem("libraria_theme");
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const initialTheme = saved || (prefersDark ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", initialTheme);
  updateThemeIcon(initialTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("libraria_theme", next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  document.querySelectorAll(".theme-toggle").forEach(btn => {
    btn.innerHTML = theme === "dark" ? "☀️" : "🌙";
  });
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
    if (badge) badge.style.display = "flex";
    const nameEl = document.getElementById("user-name-display");
    const roleEl = document.getElementById("user-role-display");
    const avatarEl = document.getElementById("user-avatar-initial");
    
    if (nameEl) nameEl.textContent = state.user.name;
    if (roleEl) roleEl.textContent = state.user.role.toUpperCase();
    if (avatarEl) avatarEl.textContent = state.user.name.charAt(0).toUpperCase();
    
    if (authBtn) {
      authBtn.textContent = "Sign Out";
      authBtn.onclick = logout;
    }

    const isAdmin = state.user.role === "admin";
    adminElements.forEach(el => {
      el.style.display = isAdmin ? "" : "none";
    });
  } else {
    if (badge) badge.style.display = "none";
    if (authBtn) {
      authBtn.textContent = "Sign In";
      authBtn.onclick = () => openModal("modal-login");
    }
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
    circulation: "Circulation & Loan Desk",
    members: "Patron Directory",
    analytics: "Reports & Analytics"
  };
  const pageTitle = document.getElementById("page-title");
  if (pageTitle) pageTitle.textContent = titles[tabName] || "Libraria";

  // Close mobile sidebar if open
  const sidebar = document.getElementById("app-sidebar");
  if (sidebar && sidebar.classList.contains("mobile-open")) {
    sidebar.classList.remove("mobile-open");
  }

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
    const setElem = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setElem("stat-total-books", data.total_books);
    setElem("stat-total-copies", data.total_copies);
    setElem("stat-issued", data.issued_books);
    setElem("stat-members", data.total_members);
    setElem("stat-overdue", data.overdue_loans);
    setElem("stat-fines", `$${data.total_fines_collected.toFixed(2)}`);

    // Overdue Alert Banner
    const alertBanner = document.getElementById("dashboard-overdue-alert");
    const alertMsg = document.getElementById("dashboard-overdue-msg");
    if (alertBanner && alertMsg) {
      if (data.overdue_loans > 0) {
        alertMsg.textContent = `${data.overdue_loans} loan${data.overdue_loans > 1 ? 's are' : ' is'} currently past due date and accumulating fines.`;
        alertBanner.style.display = "flex";
      } else {
        alertBanner.style.display = "none";
      }
    }

    // Render Recent Activity
    const tbody = document.getElementById("recent-activity-tbody");
    if (tbody) {
      tbody.innerHTML = "";
      if (!data.recent_activities || data.recent_activities.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:1.5rem;">No circulation activity recorded yet.</td></tr>`;
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
    }

    // Render Category Distribution
    const catContainer = document.getElementById("dashboard-categories-list");
    if (catContainer) {
      catContainer.innerHTML = "";
      const totalTitles = data.total_books || 1;
      (data.category_distribution || []).slice(0, 5).forEach(c => {
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
    }
  } catch (err) {
    console.error(err);
  }
}

function filterOverdueLoans() {
  switchTab("circulation");
  const filterSelect = document.getElementById("circulation-status-filter");
  if (filterSelect) {
    filterSelect.value = "overdue";
    loadCirculation();
  }
}

// --- Book Catalog View ---
async function loadCategories() {
  try {
    state.categories = await api("/api/books/categories");
    const select = document.getElementById("catalog-category-filter");
    const bookFormSelect = document.getElementById("book-form-category");
    
    if (select) {
      select.innerHTML = '<option value="">All Categories</option>';
      state.categories.forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        if (state.selectedCategory === cat) opt.selected = true;
        select.appendChild(opt);
      });
    }

    if (bookFormSelect) {
      bookFormSelect.innerHTML = state.categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
      bookFormSelect.innerHTML += `<option value="Computer Science">Computer Science</option>`;
      bookFormSelect.innerHTML += `<option value="Other">Other / General</option>`;
    }

    renderCategoryChips();
  } catch (err) {
    console.error(err);
  }
}

function renderCategoryChips() {
  const container = document.getElementById("catalog-category-chips");
  if (!container) return;
  container.innerHTML = "";

  const allChip = document.createElement("button");
  allChip.type = "button";
  allChip.className = `genre-chip ${!state.selectedCategory ? 'active' : ''}`;
  allChip.textContent = "All Categories";
  allChip.onclick = () => selectCategoryChip("");
  container.appendChild(allChip);

  state.categories.forEach(cat => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = `genre-chip ${state.selectedCategory === cat ? 'active' : ''}`;
    chip.textContent = cat;
    chip.onclick = () => selectCategoryChip(cat);
    container.appendChild(chip);
  });
}

function selectCategoryChip(category) {
  state.selectedCategory = category;
  const select = document.getElementById("catalog-category-filter");
  if (select) select.value = category;
  renderCategoryChips();
  searchBooks();
}

async function loadCatalog() {
  await loadCategories();
  searchBooks();
}

async function searchBooks() {
  const query = document.getElementById("catalog-search-input")?.value || "";
  const categorySelect = document.getElementById("catalog-category-filter")?.value || "";
  const category = categorySelect || state.selectedCategory || "";
  state.selectedCategory = category;
  renderCategoryChips();

  const availableOnly = document.getElementById("catalog-available-only")?.checked || false;

  let url = `/api/books?available_only=${availableOnly}&limit=100`;
  if (query.trim()) url += `&q=${encodeURIComponent(query.trim())}`;
  if (category) url += `&category=${encodeURIComponent(category)}`;

  try {
    const res = await api(url);
    state.books = res.books;
    sortAndRenderBooks();
  } catch (err) {
    showToast(err.message, "danger");
  }
}

function sortAndRenderBooks() {
  const sortChoice = document.getElementById("catalog-sort-select")?.value || "default";
  let list = [...state.books];

  if (sortChoice === "title_asc") {
    list.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortChoice === "title_desc") {
    list.sort((a, b) => b.title.localeCompare(a.title));
  } else if (sortChoice === "year_desc") {
    list.sort((a, b) => (b.publication_year || 0) - (a.publication_year || 0));
  } else if (sortChoice === "year_asc") {
    list.sort((a, b) => (a.publication_year || 0) - (b.publication_year || 0));
  } else if (sortChoice === "copies_desc") {
    list.sort((a, b) => b.available_copies - a.available_copies);
  }

  state.filteredBooks = list;
  renderBookGrid(list);

  // Status bar update
  const countEl = document.getElementById("catalog-results-count");
  const clearBtn = document.getElementById("catalog-clear-btn");
  const query = document.getElementById("catalog-search-input")?.value || "";
  const hasFilters = Boolean(query.trim() || state.selectedCategory || document.getElementById("catalog-available-only")?.checked);

  if (countEl) {
    const availCount = list.filter(b => b.available_copies > 0).length;
    countEl.textContent = `Showing ${list.length} title${list.length === 1 ? '' : 's'} (${availCount} in stock)`;
  }
  if (clearBtn) {
    clearBtn.style.display = hasFilters ? "inline-block" : "none";
  }
}

function clearCatalogFilters() {
  const searchInput = document.getElementById("catalog-search-input");
  const catSelect = document.getElementById("catalog-category-filter");
  const availCheck = document.getElementById("catalog-available-only");
  const sortSelect = document.getElementById("catalog-sort-select");

  if (searchInput) searchInput.value = "";
  if (catSelect) catSelect.value = "";
  if (availCheck) availCheck.checked = false;
  if (sortSelect) sortSelect.value = "default";
  state.selectedCategory = "";
  renderCategoryChips();
  searchBooks();
}

function renderBookGrid(books) {
  const grid = document.getElementById("book-grid-container");
  if (!grid) return;
  grid.innerHTML = "";

  if (books.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 3.5rem 1rem; color: var(--text-muted); background:var(--bg-card); border-radius:12px; border:1px dashed var(--border-color);">
      <div style="font-size:2.5rem; margin-bottom:0.75rem;">🔍</div>
      <p style="font-size: 1.15rem; font-weight: 700; color:var(--text-main);">No titles found</p>
      <p style="font-size:0.9rem; margin-top:0.25rem;">No books match your current search or filter criteria.</p>
      <button class="btn btn-secondary btn-sm" style="margin-top:1rem;" onclick="clearCatalogFilters()">Reset All Filters</button>
    </div>`;
    return;
  }

  books.forEach(book => {
    const isAvail = book.available_copies > 0;
    const isLow = book.available_copies === 1;
    const card = document.createElement("div");
    card.className = "book-card";
    const coverSrc = book.cover_url || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&q=80";

    card.innerHTML = `
      <div class="book-cover-wrap">
        <img src="${escapeHtml(coverSrc)}" alt="${escapeHtml(book.title)}" class="book-cover" onerror="this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80'">
        <span class="book-category-tag">${escapeHtml(book.category)}</span>
        ${isLow ? `<span class="stock-low-badge">⚠️ Only 1 Left</span>` : ''}
      </div>
      <div class="book-details">
        <h4 class="book-title" title="${escapeHtml(book.title)}">${escapeHtml(book.title)}</h4>
        <p class="book-author">by ${escapeHtml(book.author)} (${book.publication_year || 'N/A'})</p>
        <div class="book-meta">
          <span>Rack: <strong>${escapeHtml(book.shelf_location)}</strong></span>
          <span class="copies-badge ${isAvail ? 'copies-available' : 'copies-none'}">
            ${book.available_copies}/${book.total_copies} Avail
          </span>
        </div>
        <div class="book-actions">
          <button class="btn btn-secondary btn-sm" style="flex:1" onclick="openBookDetails(${book.id})">Details</button>
          ${isAvail ? `<button class="btn btn-primary btn-sm" style="flex:1" onclick="promptIssueBook(${book.id})">Issue</button>` : `<button class="btn btn-secondary btn-sm" style="flex:1" disabled>Out of Stock</button>`}
          ${state.user && state.user.role === 'admin' ? `
            <button class="btn btn-secondary btn-sm" onclick="openEditBook(${book.id})" title="Edit Book">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="deleteBook(${book.id})" title="Delete Book">🗑️</button>
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
  document.getElementById("detail-book-copies").textContent = `${book.available_copies} of ${book.total_copies} copies currently available`;
  document.getElementById("detail-book-desc").textContent = book.description || "No summary provided.";

  const coverImg = document.getElementById("detail-book-cover");
  if (coverImg) coverImg.src = book.cover_url || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&q=80";

  const issueBtn = document.getElementById("detail-issue-btn");
  if (issueBtn) {
    if (book.available_copies > 0) {
      issueBtn.disabled = false;
      issueBtn.textContent = "Issue This Book";
      issueBtn.onclick = () => {
        closeModal("modal-book-detail");
        promptIssueBook(book.id);
      };
    } else {
      issueBtn.disabled = true;
      issueBtn.textContent = "Out of Stock";
    }
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
  if (!confirm("Are you sure you want to delete this book from the catalog?")) return;
  try {
    await api(`/api/books/${bookId}`, { method: "DELETE" });
    showToast("Book deleted from catalog.", "info");
    loadCatalog();
  } catch (err) {
    showToast(err.message, "danger");
  }
}

// --- Circulation & Loan Workflows ---
async function loadCirculation() {
  if (!state.user) {
    const tbody = document.getElementById("circulation-tbody");
    if (tbody) {
      tbody.innerHTML = `
        <tr><td colspan="7" style="text-align:center; padding:2.5rem; color:var(--text-muted);">
          Please <a href="javascript:void(0)" onclick="openModal('modal-login')" style="color:var(--primary); font-weight:600;">sign in</a> to view loan records.
        </td></tr>
      `;
    }
    return;
  }

  const statusFilter = document.getElementById("circulation-status-filter")?.value || "all";
  try {
    const records = await api(`/api/borrows?status=${statusFilter}`);
    state.borrows = records;
    filterCirculationList();
  } catch (err) {
    showToast(err.message, "danger");
  }
}

function filterCirculationList() {
  const query = (document.getElementById("circulation-search-input")?.value || "").toLowerCase().trim();
  let list = state.borrows;

  if (query) {
    list = list.filter(r => 
      (r.book?.title && r.book.title.toLowerCase().includes(query)) ||
      (r.book?.isbn && r.book.isbn.toLowerCase().includes(query)) ||
      (r.user?.name && r.user.name.toLowerCase().includes(query)) ||
      (r.user?.card_number && r.user.card_number.toLowerCase().includes(query)) ||
      String(r.id).includes(query)
    );
  }

  renderCirculationTable(list);
}

function renderCirculationTable(records) {
  const tbody = document.getElementById("circulation-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:2rem;">No loan records matching the current filter.</td></tr>`;
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

    let fineInfo = `<span style="color:var(--text-muted); font-size:0.8rem;">$0.00</span>`;
    if (r.fine) {
      fineInfo = `<span class="badge badge-${r.fine.status === 'paid' ? 'success' : 'danger'}">$${r.fine.amount.toFixed(2)} (${r.fine.status})</span>`;
    } else if (r.calculated_fine > 0) {
      fineInfo = `<span class="badge badge-danger">$${r.calculated_fine.toFixed(2)} (Owed)</span>`;
    }

    const isActive = r.status !== "returned";

    tr.innerHTML = `
      <td>#${r.id}</td>
      <td><strong>${escapeHtml(r.book?.title || 'Unknown')}</strong><br><small style="color:var(--text-muted)">ISBN: ${escapeHtml(r.book?.isbn || '')}</small></td>
      <td>${escapeHtml(r.user?.name || 'Unknown')}<br><small style="color:var(--text-muted)">Card: ${escapeHtml(r.user?.card_number || '')}</small></td>
      <td>${formatDate(r.borrow_date)}</td>
      <td><span style="${r.is_overdue && isActive ? 'color:var(--danger); font-weight:700;' : ''}">${formatDate(r.due_date)}</span></td>
      <td>${statusBadge}<br>${fineInfo}</td>
      <td>
        <div style="display:flex; gap:0.35rem; align-items:center;">
          ${isActive ? `
            <button class="btn btn-primary btn-sm" onclick="promptReturnBook(${r.id})">Return</button>
            <button class="btn btn-secondary btn-sm" onclick="renewLoan(${r.id})" title="Renew for 14 days" ${r.is_overdue || r.renewal_count >= 2 ? 'disabled' : ''}>
              Renew (${r.renewal_count || 0}/2)
            </button>
          ` : `<span style="color:var(--text-muted); font-size:0.8rem;">Completed</span>`}
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

  await loadMembersForSelect();
  document.getElementById("issue-book-id").value = bookId;

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
  if (!select) return;
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
  document.getElementById("return-book-name").textContent = record.book?.title || "Book";
  document.getElementById("return-member-name").textContent = record.user?.name || "Patron";
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
  const payFine = document.getElementById("return-pay-fine-checkbox")?.checked || false;
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
    showToast("Book returned and inventory restocked!", "success");
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
    const tbody = document.getElementById("members-tbody");
    if (tbody) {
      tbody.innerHTML = `
        <tr><td colspan="7" style="text-align:center; padding:2.5rem; color:var(--text-muted);">
          Patron directory is accessible to library administrators only.
        </td></tr>
      `;
    }
    return;
  }

  const query = document.getElementById("members-search-input")?.value || "";
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
  if (!tbody) return;
  tbody.innerHTML = "";

  if (members.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:2rem;">No patrons found matching your search.</td></tr>`;
    return;
  }

  members.forEach(m => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${escapeHtml(m.name)}</strong></td>
      <td>
        <code style="cursor:pointer; background:var(--bg-main); padding:0.2rem 0.4rem; border-radius:4px;" onclick="copyCardNumber('${escapeHtml(m.card_number)}')" title="Click to copy card number">
          ${escapeHtml(m.card_number)} 📋
        </code>
      </td>
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
      <td>
        <button class="btn btn-secondary btn-sm" onclick="openPatronLoans(${m.id}, '${escapeHtml(m.name)}')">View Loans</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function copyCardNumber(cardNum) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(cardNum);
    showToast(`Copied card number: ${cardNum}`, "info");
  }
}

async function openPatronLoans(memberId, memberName) {
  const titleEl = document.getElementById("patron-loans-title");
  const tbody = document.getElementById("patron-loans-tbody");
  if (titleEl) titleEl.textContent = `Loans for ${memberName}`;
  if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:1.5rem;">Loading loan history...</td></tr>`;

  openModal("modal-patron-loans");

  try {
    const records = await api(`/api/borrows?user_id=${memberId}`);
    if (!tbody) return;
    tbody.innerHTML = "";

    if (records.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:var(--text-muted);">No loan records for this patron.</td></tr>`;
      return;
    }

    records.forEach(r => {
      const isReturned = r.status === "returned";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${escapeHtml(r.book?.title || 'Unknown')}</strong></td>
        <td>${formatDate(r.borrow_date)}</td>
        <td>${formatDate(r.due_date)}</td>
        <td>
          <span class="badge badge-${isReturned ? 'success' : (r.is_overdue ? 'danger' : 'primary')}">
            ${isReturned ? 'Returned' : (r.is_overdue ? 'Overdue' : 'Active')}
          </span>
        </td>
        <td>
          ${!isReturned ? `<button class="btn btn-primary btn-sm" onclick="closeModal('modal-patron-loans'); promptReturnBook(${r.id});">Return</button>` : '-'}
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    showToast(err.message, "danger");
  }
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

    const updateText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    updateText("analytics-total-books", stats.total_books);
    updateText("analytics-total-copies", stats.total_copies);
    updateText("analytics-issued-copies", stats.issued_books);
    updateText("analytics-fines-pending", `$${stats.total_fines_pending.toFixed(2)}`);
    updateText("analytics-fines-paid", `$${stats.total_fines_collected.toFixed(2)}`);

    // Render detailed categories breakdown table
    const tbody = document.getElementById("analytics-category-tbody");
    if (tbody) {
      tbody.innerHTML = "";
      const totalTitles = stats.total_books || 1;
      (stats.category_distribution || []).forEach(c => {
        const pct = Math.round((c.count / totalTitles) * 100);
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${escapeHtml(c.category)}</strong></td>
          <td>${c.count} titles</td>
          <td>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <div class="category-progress-track" style="flex:1; max-width:140px;">
                <div class="category-progress-fill" style="width: ${pct}%"></div>
              </div>
              <span>${pct}%</span>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (err) {
    console.error(err);
  }
}

async function exportData(type) {
  if (!state.token) {
    showToast("Please sign in as Admin to download CSV reports.", "warning");
    return;
  }

  try {
    showToast(`Preparing ${type} CSV export...`, "info");
    const response = await fetch(`/api/export/${type}?token=${state.token}`, {
      headers: {
        "Authorization": `Bearer ${state.token}`
      }
    });

    if (!response.ok) {
      throw new Error("Failed to download CSV export. Administrative privileges required.");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    showToast("Export download started!", "success");
  } catch (err) {
    showToast(err.message, "danger");
  }
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

  // Mobile menu toggle
  const mobileToggle = document.getElementById("mobile-menu-toggle");
  const sidebar = document.getElementById("app-sidebar");
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener("click", () => {
      sidebar.classList.toggle("mobile-open");
    });
  }

  // Search input debouncers
  const catalogSearch = document.getElementById("catalog-search-input");
  if (catalogSearch) {
    catalogSearch.addEventListener("input", () => {
      clearTimeout(state.searchTimeout);
      state.searchTimeout = setTimeout(searchBooks, 250);
    });
  }

  const memberSearch = document.getElementById("members-search-input");
  if (memberSearch) {
    memberSearch.addEventListener("input", () => {
      clearTimeout(state.searchTimeout);
      state.searchTimeout = setTimeout(loadMembers, 250);
    });
  }

  // Keyboard shortcut: Press "/" or "Ctrl+K" to focus search
  window.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
      e.preventDefault();
      if (state.activeTab !== "catalog") {
        switchTab("catalog");
      }
      setTimeout(() => {
        const search = document.getElementById("catalog-search-input");
        if (search) search.focus();
      }, 50);
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (state.activeTab !== "catalog") {
        switchTab("catalog");
      }
      setTimeout(() => {
        const search = document.getElementById("catalog-search-input");
        if (search) search.focus();
      }, 50);
    }
  });

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
