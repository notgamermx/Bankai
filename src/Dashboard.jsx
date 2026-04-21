import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, Search, Code } from 'lucide-react';

function Dashboard() {
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load scripts from storage
    chrome.storage.local.get(['bankai_scripts'], (result) => {
      if (result.bankai_scripts) {
        setScripts(result.bankai_scripts);
      } else {
        // Default scripts
        const defaults = [
          { id: 'yt_opt', name: 'YouTube Optimizer', enabled: true, matches: '*://*.youtube.com/*' },
          { id: 'insta_dl', name: 'InstaDownloader', enabled: true, matches: '*://*.instagram.com/*' }
        ];
        setScripts(defaults);
        chrome.storage.local.set({ bankai_scripts: defaults });
      }
      setLoading(false);
    });
  }, []);

  const toggleScript = (id) => {
    const newScripts = scripts.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    );
    setScripts(newScripts);
    chrome.storage.local.set({ bankai_scripts: newScripts });
  };

  const deleteScript = (id) => {
    const newScripts = scripts.filter(s => s.id !== id);
    setScripts(newScripts);
    chrome.storage.local.set({ bankai_scripts: newScripts });
  };

  if (loading) return <div className="loading bankai-glass">LOADING BANKAI...</div>;

  return (
    <div className="bankai-dashboard fade-in">
      <aside className="sidebar bankai-glass">
        <div className="logo-container">
          <h1 className="accent-text">BANKAI <span style={{color: 'white'}}>SCRIPT</span></h1>
        </div>
        <nav>
          <button className="nav-item active"><Code size={18} /> My Scripts</button>
          <button className="nav-item"><Plus size={18} /> New Script</button>
        </nav>
      </aside>

      <main className="main-content">
        <header className="main-header">
          <h2>MY SCRIPTS</h2>
          <div className="search-bar">
            <Search size={18} />
            <input type="text" placeholder="Search scripts..." />
          </div>
        </header>

        <section className="script-list">
          {scripts.map(script => (
            <div key={script.id} className="script-card bankai-panel">
              <div className="script-info">
                <h3>{script.name}</h3>
                <code>{script.matches}</code>
              </div>
              <div className="script-actions">
                <label className="switch">
                  <input type="checkbox" checked={script.enabled} onChange={() => toggleScript(script.id)} />
                  <span className="slider round"></span>
                </label>
                <button className="icon-btn"><Edit3 size={18} /></button>
                <button className="icon-btn delete" onClick={() => deleteScript(script.id)}><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
          {scripts.length === 0 && <div className="empty-state">No scripts found. Create one to begin.</div>}
        </section>
      </main>
      
      <style>{`
        .loading {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: 800;
          color: var(--accent-color);
        }
        .bankai-dashboard { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; background: var(--bg-color); color: white; }
        .sidebar { padding: 2rem 1rem; display: flex; flex-direction: column; gap: 2rem; border-right: 1px solid var(--border-color); background: var(--panel-bg); }
        .logo-container h1 { font-size: 1.5rem; text-align: center; }
        nav { display: flex; flex-direction: column; gap: 0.5rem; }
        .nav-item { background: transparent; border: none; color: var(--text-secondary); padding: 0.75rem 1rem; text-align: left; display: flex; align-items: center; gap: 0.75rem; cursor: pointer; border-radius: 4px; transition: all 0.3s; }
        .nav-item:hover, .nav-item.active { background: rgba(211, 47, 47, 0.1); color: var(--accent-color); }
        .main-content { padding: 2rem 4rem; }
        .main-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .search-bar { display: flex; align-items: center; gap: 0.5rem; background: var(--panel-bg); border: 1px solid var(--border-color); padding: 0.5rem 1rem; border-radius: 20px; color: var(--text-secondary); }
        .search-bar input { background: transparent; border: none; color: white; outline: none; }
        .script-list { display: flex; flex-direction: column; gap: 1rem; }
        .script-card { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 2rem; background: var(--panel-bg); border-radius: 8px; border: 1px solid var(--border-color); }
        .script-info h3 { margin-bottom: 0.25rem; }
        .script-info code { color: var(--text-secondary); font-size: 0.8rem; }
        .script-actions { display: flex; align-items: center; gap: 1.5rem; }
        .icon-btn { background: transparent; border: none; color: var(--text-secondary); cursor: pointer; transition: 0.3s; }
        .icon-btn:hover { color: var(--accent-color); }
        .switch { position: relative; display: inline-block; width: 44px; height: 22px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #333; transition: .4s; border-radius: 34px; }
        .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .slider { background-color: var(--accent-color); }
        input:checked + .slider:before { transform: translateX(22px); }
      `}</style>
    </div>
  );
}

export default Dashboard;
