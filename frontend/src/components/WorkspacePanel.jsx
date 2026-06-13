import React, { useState, useEffect } from 'react';
import { File, Folder, FolderOpen, Save, Trash2, FileCode, RefreshCw, ExternalLink } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { api, AuthError } from '../utils/api';

export default function WorkspacePanel({ addToast, onAuthError }) {
  const [fileTree, setFileTree] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState({});

  const fetchTree = async () => {
    try {
      const res = await api.get('/api/workspace/tree');
      setFileTree(await res.json());
    } catch (e) {
      if (e instanceof AuthError) onAuthError();
    }
  };

  useEffect(() => { fetchTree(); }, []);

  const handleFileClick = async (file) => {
    if (file.type === 'directory') {
      setExpandedFolders(prev => ({ ...prev, [file.name]: !prev[file.name] }));
      return;
    }
    setSelectedFile(file);
    try {
      const res = await api.get(`/api/workspace/file?path=${encodeURIComponent(file.path)}`);
      const data = await res.json();
      setFileContent(data.content || '');
    } catch (e) {
      if (e instanceof AuthError) onAuthError();
      else addToast('Failed to load file', 'error');
    }
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    setIsSaving(true);
    try {
      const res = await api.post('/api/workspace/file', { path: selectedFile.path, content: fileContent });
      if (res.ok) {
        addToast('File saved successfully', 'success');
      }
    } catch (e) {
      if (e instanceof AuthError) onAuthError();
      else addToast('Failed to save file', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedFile || !confirm(`Delete ${selectedFile.name}?`)) return;
    try {
      const res = await api.delete(`/api/workspace/file?path=${encodeURIComponent(selectedFile.path)}`);
      if (res.ok) {
        addToast('File deleted', 'info');
        setSelectedFile(null);
        setFileContent('');
        fetchTree();
      }
    } catch (e) {
      if (e instanceof AuthError) onAuthError();
      else addToast('Failed to delete file', 'error');
    }
  };

  const getLanguage = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const map = { js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', html: 'html', css: 'css', json: 'json', md: 'markdown', py: 'python', sql: 'sql' };
    return map[ext] || 'plaintext';
  };

  const renderTree = (items, level = 0) => {
    return items.map(item => (
      <div key={item.name || item.path} style={{ paddingLeft: `${level * 16}px` }}>
        <div 
          className={`workspace-file-item ${selectedFile?.path === item.path ? 'active' : ''}`}
          onClick={() => handleFileClick(item)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px', cursor: 'pointer', borderRadius: '4px', fontSize: '0.85rem' }}
        >
          {item.type === 'directory' ? (
            expandedFolders[item.name] ? <FolderOpen size={14} /> : <Folder size={14} />
          ) : (
            <FileCode size={14} />
          )}
          <span>{item.name}</span>
        </div>
        {item.type === 'directory' && expandedFolders[item.name] && item.children && (
          <div>{renderTree(item.children, level + 1)}</div>
        )}
      </div>
    ));
  };

  return (
    <div className="workspace-panel" style={{ display: 'flex', height: '100%', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
      {/* File Tree Sidebar */}
      <div style={{ width: '220px', borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Workspace Files</span>
          <button className="secondary-btn" style={{ padding: '4px' }} onClick={fetchTree} title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {fileTree.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '12px', textAlign: 'center' }}>No files yet.</div>
          ) : (
            renderTree(fileTree)
          )}
        </div>
      </div>

      {/* Editor Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedFile ? (
          <>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <File size={14} />
                <span>{selectedFile.path}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {selectedFile.name.endsWith('.html') || selectedFile.name.endsWith('.htm') ? (
                  <button 
                    className="secondary-btn" 
                    style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: 'var(--accent-purple)', color: 'white', border: 'none' }} 
                    onClick={() => window.open(`http://localhost:5000/api/workspace/preview?path=${encodeURIComponent(selectedFile.path)}`, '_blank')}
                  >
                    <ExternalLink size={12} /> Open Preview
                  </button>
                ) : null}
                <button className="secondary-btn" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={handleDelete}>
                  <Trash2 size={12} /> Delete
                </button>
                <button className="primary-btn" style={{ padding: '4px 12px', fontSize: '0.75rem' }} onClick={handleSave} disabled={isSaving}>
                  <Save size={12} /> {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
            <Editor
              height="100%"
              language={getLanguage(selectedFile.name)}
              value={fileContent}
              onChange={(value) => setFileContent(value || '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on',
                automaticLayout: true,
                padding: { top: 16 }
              }}
            />
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Select a file from the tree to view or edit its contents.
          </div>
        )}
      </div>
    </div>
  );
}