import React, { useState, useRef } from 'react';
import { Upload, FileText, Trash2, CheckCircle, Database } from 'lucide-react';
import { api, AuthError } from '../utils/api';

export default function KnowledgeBase({ documents, onRefreshDocs, selectedDocIds, onToggleDocSelect, addToast, onAuthError }) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      await uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await api.upload('/api/upload', formData);
      if (response.ok) {
        onRefreshDocs();
        addToast('Document indexed successfully!', 'success');
      } else {
        const errorData = await response.json();
        addToast(`Upload failed: ${errorData.error || 'Unknown error'}`, 'error');
      }
    } catch (e) {
      if (e instanceof AuthError) { onAuthError(); return; }
      addToast(`Upload failed: ${e.message}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  const deleteDoc = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Remove this document from the index?')) return;
    try {
      const response = await api.delete(`/api/documents/${id}`);
      if (response.ok) {
        onRefreshDocs();
        addToast('Document removed.', 'info');
      }
    } catch (e) {
      if (e instanceof AuthError) onAuthError();
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="view-panel">
      <div>
        <h1 style={{ marginBottom: '8px' }}>Knowledge Base & RAG Index</h1>
        <p>Upload text files and PDFs to ingest them into the vector database. Link documents to chats for context retrieval.</p>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '1fr 2fr' }}>
        {/* Upload Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div 
            className="glass-card"
            style={{ 
              border: dragActive ? '2px dashed var(--accent-purple)' : '1px dashed var(--border-subtle)',
              background: dragActive ? 'rgba(139, 92, 246, 0.05)' : 'var(--glass-bg)',
              textAlign: 'center',
              padding: '40px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              cursor: 'pointer',
              borderRadius: '16px'
            }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept=".pdf,.txt,.md,.js,.py,.json" 
              onChange={handleFileChange} 
            />
            
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', color: 'var(--accent-purple)' }}>
              <Upload size={24} />
            </div>

            <div>
              <h3>{uploading ? 'Processing File...' : 'Drag & Drop File'}</h3>
              <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Supports PDF, TXT, MD, JS, PY, JSON (Max 10MB)</p>
            </div>
            
            {!uploading && (
              <button className="primary-btn" style={{ padding: '8px 16px', fontSize: '0.85rem', pointerEvents: 'none' }}>
                Browse Files
              </button>
            )}
          </div>

          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Database size={16} style={{ color: 'var(--accent-blue)' }} />
              <h3>Vector Index Info</h3>
            </div>
            <p style={{ fontSize: '0.85rem' }}>
              Documents are parsed and split into overlapping chunks. A local vector simulation parses token profiles to retrieve relevant nodes matching user inquiries.
            </p>
          </div>
        </div>

        {/* Index File List Column */}
        <div className="glass-card">
          <h2>Indexed Documents</h2>
          <p style={{ marginBottom: '16px' }}>Click to select/deselect documents to attach to your active chat context.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {documents.map(doc => {
              const isSelected = selectedDocIds.includes(doc.id);
              
              return (
                <div 
                  key={doc.id}
                  className="chat-history-item"
                  style={{
                    border: isSelected ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid var(--border-subtle)',
                    background: isSelected ? 'rgba(59, 130, 246, 0.04)' : 'rgba(255, 255, 255, 0.01)',
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    color: 'var(--text-primary)'
                  }}
                  onClick={() => onToggleDocSelect(doc.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                    <div style={{ color: isSelected ? 'var(--accent-blue)' : 'var(--text-secondary)' }}>
                      <FileText size={24} />
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {doc.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '12px', marginTop: '2px' }}>
                        <span>Chunks: {doc.chunks_count}</span>
                        <span>Size: {(doc.text_length / 1024).toFixed(1)} KB</span>
                        <span>Added: {new Date(doc.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {isSelected && (
                      <span className="source-badge" style={{ margin: 0, padding: '2px 6px', fontSize: '0.7rem' }}>
                        Active Context
                      </span>
                    )}
                    
                    <button 
                      className="delete-chat-btn"
                      style={{ opacity: 1 }} // always visible here
                      onClick={(e) => deleteDoc(doc.id, e)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}

            {documents.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', border: '1px dashed var(--border-subtle)', borderRadius: '12px' }}>
                No documents indexed yet. Drag a file onto the left dropzone to upload it.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
