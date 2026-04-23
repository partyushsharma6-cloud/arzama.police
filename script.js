// ARZAMA POLICE INTELLIGENCE SYSTEM - Core Logic
// No database - localStorage + JSON preload

class APIS {
  constructor() {
    this.currentUser = null;
    this.activityLogs = [];
    this.init();
  }

  init() {
    console.log('APIS: Initializing with embedded data');
    this.loadData();
    this.loadDemoIfEmpty();
    // bindEvents and checkAuth called from DOMContentLoaded wrapper
  }

  loadData() {
    const data = {
      users: JSON.parse(localStorage.getItem('apis_users') || '[]'),
      citizens: JSON.parse(localStorage.getItem('apis_citizens') || '[]'),
      cases: JSON.parse(localStorage.getItem('apis_cases') || '[]'),
      criminalRecords: JSON.parse(localStorage.getItem('apis_criminalRecords') || '[]'),
      evidence: JSON.parse(localStorage.getItem('apis_evidence') || '[]'),
      logs: JSON.parse(localStorage.getItem('apis_logs') || '[]')
    };
    
    // Merge with demo if empty
    if (!data.users.length) data.users = apisDemo.users;
    if (!data.citizens.length) data.citizens = apisDemo.citizens;
    if (!data.cases.length) data.cases = apisDemo.cases;
    if (!data.criminalRecords.length) data.criminalRecords = apisDemo.criminalRecords;
    if (!data.evidence.length) data.evidence = apisDemo.evidence;
    
    this.data = data;
    this.saveData();
  }

  loadDemoIfEmpty() {
    // Embedded data already available, skip fetch
    console.log('APIS: Demo data embedded and ready');
  }

  saveData() {
    Object.keys(this.data).forEach(key => {
      localStorage.setItem(`apis_${key}`, JSON.stringify(this.data[key]));
    });
  }

  // AUTH
  login(email, password) {
    const user = this.data.users.find(u => u.email === email && u.password === password);
    if (user) {
      this.currentUser = user;
      localStorage.setItem('apis_token', btoa(JSON.stringify(user))); // Simple JWT sim
      this.logActivity('LOGIN', `${user.name} accessed system`);
      this.showDashboard();
      return true;
    }
    return false;
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem('apis_token');
    this.showLogin();
  }

  checkAuth() {
    const token = localStorage.getItem('apis_token');
    if (token) {
      try {
        this.currentUser = JSON.parse(atob(token));
        this.showDashboard();
      } catch(e) {
        this.showLogin();
      }
    } else {
      this.showLogin();
    }
  }

  // CRUD OPERATIONS
  addCitizen(citizen) {
    citizen.id = Date.now();
    this.data.citizens.unshift(citizen);
    this.saveData();
    this.logActivity('CITIZEN_ADD', `Added ${citizen.name}`);
    this.renderCitizens();
  }

  updateCitizen(id, updates) {
    const citizen = this.data.citizens.find(c => c.id === id);
    Object.assign(citizen, updates);
    this.saveData();
    this.logActivity('CITIZEN_UPDATE', `Updated ${citizen.name}`);
  }

  deleteCitizen(id) {
    const citizen = this.data.citizens.find(c => c.id === id);
    this.data.citizens = this.data.citizens.filter(c => c.id !== id);
    // Cascade delete related records
    this.data.criminalRecords = this.data.criminalRecords.filter(r => r.citizen_id !== id);
    this.saveData();
    this.logActivity('CITIZEN_DELETE', `Deleted ${citizen.name}`);
  }

  addCriminalRecord(record) {
    record.id = Date.now();
    this.data.criminalRecords.unshift(record);
    this.saveData();
    this.logActivity('CRIMINAL_ADD', `New record #${record.id}`);
  }

  // Search & Filter
  searchCitizens(query) {
    return this.data.citizens.filter(c => 
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.id_proof.includes(query)
    );
  }

  getCriminalStats() {
    const stats = {
      totalCitizens: this.data.citizens.length,
      wanted: this.data.criminalRecords.filter(r => r.status === 'wanted').length,
      arrested: this.data.criminalRecords.filter(r => r.status === 'arrested').length,
      activeCases: this.data.cases.filter(c => c.status === 'active').length
    };
    return stats;
  }

  // Logs
  logActivity(action, description) {
    const log = {
      id: Date.now(),
      user_id: this.currentUser.id,
      user: this.currentUser.name,
      action,
      description,
      timestamp: new Date().toISOString()
    };
    this.data.logs.unshift(log);
    if (this.data.logs.length > 100) this.data.logs = this.data.logs.slice(0,100);
    this.saveData();
    this.renderLogs();
  }

  // UI Rendering
  showLogin() {
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen flex items-center justify-center p-8 loading-screen">
        <div class="text-center">
          <div class="neon-text text-5xl mb-8 font-orbitron">🛡️ APIS</div>
          <div class="typing text-2xl mb-12 text-cyan-400 w-0">ACCESSING ARZAMA POLICE INTELLIGENCE SYSTEM...</div>
          <div class="glass-panel p-12 rounded-3xl w-full max-w-md glow-cyan">
            <h2 class="neon-text text-3xl mb-8 text-center font-orbitron">SYSTEM LOGIN</h2>
            <form id="loginForm">
              <input type="email" id="loginEmail" placeholder="Email" class="w-full glass-panel p-4 mb-6 rounded-xl text-lg border border-cyan-500/30 focus:glow-cyan focus:outline-none">
              <input type="password" id="loginPassword" placeholder="Password" class="w-full glass-panel p-4 mb-8 rounded-xl text-lg border border-cyan-500/30 focus:glow-cyan focus:outline-none">
              <button type="submit" class="btn-primary w-full mb-4">AUTHENTICATE ACCESS</button>
            </form>
            <div class="text-sm text-gray-400 text-center mt-6">
              Demo: arjun@arzama.police / admin123<br>
              neha@arzama.police / officer123
            </div>
          </div>
        </div>
      </div>
    `;
    document.getElementById('loginForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      if (this.login(email, password)) {
        setTimeout(() => this.showDashboard(), 1000);
      } else {
        alert('Access Denied');
      }
    });
  }

  showDashboard() {
    const stats = this.getCriminalStats();
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen">
        <!-- Header -->
        <header class="glass-panel glow-cyan p-6 flex justify-between items-center mb-8">
          <div>
            <h1 class="neon-text text-4xl font-orbitron mb-2">ARZAMA POLICE INTELLIGENCE SYSTEM</h1>
            <p class="text-cyan-300 text-lg">Securing Intelligence. Enforcing Justice.</p>
          </div>
          <div class="flex items-center space-x-4">
            <span class="text-xl">👮‍♂️ ${this.currentUser.name}</span>
            <button onclick="apis.logout()" class="btn-danger">LOGOUT</button>
          </div>
        </header>

        <!-- Stats Cards -->
        <div class="dashboard-grid mb-12">
          <div class="glass-panel p-8 rounded-2xl card-hover glow-violet">
            <h3 class="text-2xl font-bold mb-4 text-violet-300">Total Citizens</h3>
            <div class="text-5xl font-orbitron neon-text">${stats.totalCitizens}</div>
          </div>
          <div class="glass-panel p-8 rounded-2xl card-hover glow-red">
            <h3 class="text-2xl font-bold mb-4 text-red-300">Wanted</h3>
            <div class="text-5xl font-orbitron text-red-400">${stats.wanted}</div>
          </div>
          <div class="glass-panel p-8 rounded-2xl card-hover">
            <h3 class="text-2xl font-bold mb-4 text-green-300">Arrested</h3>
            <div class="text-5xl font-orbitron text-green-400">${stats.arrested}</div>
          </div>
          <div class="glass-panel p-8 rounded-2xl card-hover">
            <h3 class="text-2xl font-bold mb-4 text-yellow-300">Active Cases</h3>
            <div class="text-5xl font-orbitron text-yellow-400">${stats.activeCases}</div>
          </div>
        </div>

        <!-- Main Sections -->
        <div class="flex gap-8">
          <!-- Citizens Panel -->
          <div class="flex-1">
            <div class="glass-panel p-6 rounded-2xl mb-6">
              <h2 class="neon-text text-3xl font-orbitron mb-4">👥 CITIZEN DATABASE</h2>
              <div class="flex gap-4 mb-6">
                <input id="citizenSearch" placeholder="Search citizens..." class="flex-1 glass-panel p-4 rounded-xl border border-cyan-500/30 focus:glow-cyan">
                <button onclick="apis.renderCitizens()" class="btn-primary px-8">Refresh</button>
                <button onclick="showCitizenModal('add')" class="btn-primary">+ ADD</button>
              </div>
              <div id="citizensTable" class="overflow-auto max-h-96"></div>
            </div>
          </div>

          <!-- Criminal Records Panel -->
          <div class="flex-1">
            <div class="glass-panel p-6 rounded-2xl">
              <h2 class="neon-text text-3xl font-orbitron mb-4">🚨 CRIMINAL RECORDS</h2>
              <div id="criminalStats" class="mb-6"></div>
              <div id="criminalsTable" class="overflow-auto max-h-96"></div>
            </div>
          </div>
        </div>

        <!-- Activity Logs -->
        <div class="glass-panel mt-8 p-6 rounded-2xl">
          <h2 class="neon-text text-3xl font-orbitron mb-6">📊 ACTIVITY FEED</h2>
          <div id="activityLogs" class="max-h-48 overflow-auto space-y-3"></div>
        </div>
      </div>
    `;
    
    setTimeout(() => {
      this.renderCitizens();
      this.renderCriminals();
      this.renderLogs();
    }, 100);
  }

  renderCitizens() {
    const query = document.getElementById('citizenSearch')?.value || '';
    const citizens = query ? this.searchCitizens(query) : this.data.citizens;
    
    document.getElementById('citizensTable').innerHTML = `
      <div class="grid grid-cols-5 gap-4 font-mono text-sm bg-black/30 p-4 rounded-xl">
        <div>ID</div><div>Photo</div><div>Name</div><div>DOB</div><div>Actions</div>
      </div>
      ${citizens.map(c => `
        <div class="grid grid-cols-5 gap-4 p-4 hover:bg-white/5 rounded-xl border border-white/10">
          <div>${c.id_proof}</div>
          <img src="${c.photo_url}" class="avatar" alt="${c.name}" onerror="this.src='https://i.pravatar.cc/50'">
          <div class="font-semibold">${c.name}</div>
          <div>${c.dob}</div>
          <div>
            <button onclick="showCitizenModal('edit', ${c.id})" class="text-cyan-400 hover:glow-cyan mr-2">✏️</button>
            <button onclick="apis.deleteCitizen(${c.id})" class="text-red-400 hover:glow-red">🗑️</button>
          </div>
        </div>
      `).join('')}
    `;
  }

  renderCriminals() {
    const records = this.data.criminalRecords;
    const caseMap = {};
    this.data.cases.forEach(c => caseMap[c.id] = c.title);
    
    document.getElementById('criminalStats').innerHTML = `
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-center">
        ${['wanted','arrested','under_surveillance','cleared'].map(status => {
          const count = records.filter(r => r.status === status).length;
          return `<div class="glass-panel p-4 rounded-xl">
            <div class="status-${status} text-xl font-bold">${count}</div>
            <div class="text-sm uppercase tracking-wider">${status.replace('_', ' ').toUpperCase()}</div>
          </div>`;
        }).join('')}
      </div>
    `;
    
    document.getElementById('criminalsTable').innerHTML = records.map(r => {
      const citizen = this.data.citizens.find(c => c.id === r.citizen_id);
      return `
        <div class="flex items-center p-4 mb-3 glass-panel rounded-xl hover:bg-white/5">
          <img src="${citizen?.photo_url}" class="avatar mr-4" alt="${citizen?.name}">
          <div class="flex-1">
            <div class="font-bold">${citizen?.name || 'Unknown'}</div>
            <div class="text-sm text-gray-400">${r.charges}</div>
            <div class="text-xs mt-1">${caseMap[r.case_id] || 'N/A'}</div>
          </div>
          <span class="status-${r.status} ml-auto whitespace-nowrap">${r.status.replace('_', ' ').toUpperCase()}</span>
        </div>
      `;
    }).join('');
  }

  renderLogs() {
    const logsHtml = this.data.logs.slice(0,10).map(log => `
      <div class="flex items-center p-3 glass-panel rounded-xl">
        <div class="w-12 h-12 bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full flex items-center justify-center font-bold text-sm mr-4 glow-cyan">
          ${new Date(log.timestamp).toLocaleTimeString().slice(0,5)}
        </div>
        <div class="flex-1">
          <div class="font-semibold">${log.user}</div>
          <div class="text-sm text-gray-400">${log.description}</div>
        </div>
        <div class="text-xs text-gray-500">${new Date(log.timestamp).toLocaleDateString()}</div>
      </div>
    `).join('');
    document.getElementById('activityLogs').innerHTML = logsHtml;
  }

  bindEvents() {
    // Already handled in DOMContentLoaded wrapper
  }
}

// Wait for DOM ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('APIS: DOM ready, initializing...');
  apis.init();
});

// Modal Functions (Global for onclick)
function showCitizenModal(mode, id = null) {
  const citizen = apis.data.citizens.find(c => c.id === id);
  const modalHtml = `
    <div class="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 modal" onclick="this.remove()">
      <div class="glass-panel p-8 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
        <h2 class="neon-text text-3xl font-orbitron mb-8 text-center">${mode === 'add' ? 'ADD CITIZEN' : 'EDIT CITIZEN'}</h2>
        <form id="citizenForm">
          <input name="name" value="${citizen?.name || ''}" placeholder="Full Name" class="w-full glass-panel p-4 mb-4 rounded-xl border border-cyan-500/30 focus:glow-cyan" required>
          <input name="dob" type="date" value="${citizen?.dob || ''}" class="w-full glass-panel p-4 mb-4 rounded-xl border border-cyan-500/30 focus:glow-cyan" required>
          <input name="address" value="${citizen?.address || ''}" placeholder="Address" class="w-full glass-panel p-4 mb-4 rounded-xl border border-cyan-500/30 focus:glow-cyan" required>
          <input name="id_proof" value="${citizen?.id_proof || ''}" placeholder="ID Proof" class="w-full glass-panel p-4 mb-4 rounded-xl border border-cyan-500/30 focus:glow-cyan" required>
          <div class="text-sm text-gray-400 mb-4">Profile photo will use random placeholder API</div>
          <div class="flex gap-4">
            <button type="submit" class="btn-primary flex-1">${mode === 'add' ? 'ADD CITIZEN' : 'UPDATE'}</button>
            <button type="button" onclick="this.closest('.modal').remove()" class="glass-panel px-8 py-3 rounded-xl border border-gray-500/50 hover:bg-white/10">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  document.getElementById('citizenForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const citizenData = Object.fromEntries(formData);
    if (mode === 'add') {
      apis.addCitizen(citizenData);
    } else {
      apis.updateCitizen(id, citizenData);
    }
    e.target.closest('.modal').remove();
  });
}

// EMBEDDED DEMO DATA - No fetch needed
const apisDemo = {
  users: [{"id":1,"name":"Inspector Arjun Rao","email":"arjun@arzama.police","role":"admin","password":"admin123"},{"id":2,"name":"Officer Neha Singh","email":"neha@arzama.police","role":"officer","password":"officer123"},{"id":3,"name":"Cyber Unit K-9","email":"k9@arzama.police","role":"officer","password":"cyber456"}],
  citizens: [{"id":1,"name":"Rahul Sharma","dob":"1985-03-15","address":"23 MG Road, Arzama Central","id_proof":"ID-ARS-001234","photo_url":"https://randomuser.me/api/portraits/men/1.jpg"},{"id":2,"name":"Priya Patel","dob":"1990-07-22","address":"45 Nehru Nagar, Arzama East","id_proof":"ID-ARS-005678","photo_url":"https://randomuser.me/api/portraits/women/2.jpg"}],
  cases: [{"id":1,"title":"Operation Night Shadow","description":"Cybercrime syndicate targeting government databases.","status":"active","assigned_officer":"Inspector Arjun Rao","timeline":["2024-01-15: Case opened"]}],
  criminalRecords: [{"id":1,"citizen_id":1,"case_id":1,"charges":"Cyber Fraud","status":"wanted"}],
  evidence: [{"id":1,"record_id":1,"file_url":"https://source.unsplash.com/300x200/?crime"}],
  logs: []
};

// Global apis instance
const apis = new APIS();

