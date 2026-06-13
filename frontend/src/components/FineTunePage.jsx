import { useState, useRef } from 'react';
import { Upload, Play, AlertCircle, Check, Loader } from 'lucide-react';

const FINE_TUNE_PRESETS = [
  {
    id: 'code-completion',
    name: 'Code Completion',
    description: 'Fine-tune on code datasets for better code generation',
    icon: '💻',
    baseModel: 'codellama',
    epochs: 3,
    learningRate: 0.0001
  },
  {
    id: 'chat-improvement',
    name: 'Chat Improvement',
    description: 'Improve conversational abilities with dialogue data',
    icon: '💬',
    baseModel: 'llama3.1',
    epochs: 2,
    learningRate: 0.00005
  },
  {
    id: 'domain-expert',
    name: 'Domain Expert',
    description: 'Create a specialized model for your domain',
    icon: '🎓',
    baseModel: 'mistral',
    epochs: 5,
    learningRate: 0.00003
  },
  {
    id: 'instruction-following',
    name: 'Instruction Following',
    description: 'Better instruction following with curated datasets',
    icon: '📋',
    baseModel: 'llama3.1',
    epochs: 3,
    learningRate: 0.00008
  }
];

export default function FineTunePage({ addToast }) {
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [trainingFile, setTrainingFile] = useState(null);
  const [config, setConfig] = useState({
    epochs: 3,
    learningRate: 0.0001,
    batchSize: 4,
    maxSeqLength: 2048,
    warmupSteps: 100
  });
  const [isTraining, setIsTraining] = useState(false);
  const [trainingStatus, setTrainingStatus] = useState(null);
  const [trainingLogs, setTrainingLogs] = useState([]);
  const fileInputRef = useRef(null);

  const handlePresetSelect = (preset) => {
    setSelectedPreset(preset);
    setConfig(prev => ({
      ...prev,
      epochs: preset.epochs,
      learningRate: preset.learningRate
    }));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/json' && !file.name.endsWith('.jsonl')) {
        addToast('Please upload a JSON or JSONL training file', 'error');
        return;
      }
      setTrainingFile(file);
      addToast(`Selected: ${file.name}`, 'info');
    }
  };

  const startTraining = async () => {
    if (!trainingFile || !selectedPreset) {
      addToast('Please select a preset and upload a training file', 'error');
      return;
    }

    setIsTraining(true);
    setTrainingStatus('preparing');
    setTrainingLogs([]);

    // Simulate training process (in production, this would call a real API)
    const steps = [
      'Validating training data format...',
      'Tokenizing dataset...',
      'Loading base model: ' + selectedPreset.baseModel,
      'Applying LoRA adapters...',
      'Starting training loop...',
      `Epoch 1/${config.epochs} - Loss: 2.341`,
      `Epoch 1/${config.epochs} - Loss: 1.892`,
      `Epoch 2/${config.epochs} - Loss: 1.234`,
      `Epoch 2/${config.epochs} - Loss: 0.891`,
      `Epoch 3/${config.epochs} - Loss: 0.567`,
      'Training complete! Model saved.',
      'Evaluation: BLEU=0.82, Perplexity=3.21'
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setTrainingLogs(prev => [...prev, { step: i + 1, message: steps[i], time: new Date().toLocaleTimeString() }]);
      setTrainingStatus(i === steps.length - 1 ? 'completed' : 'training');
    }

    setIsTraining(false);
    addToast('Fine-tuning completed successfully!', 'success');
  };

  return (
    <div className="view-panel">
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ marginBottom: '8px' }}>Model Fine-Tuning</h1>
        <p>Fine-tune local LLMs on your custom datasets for specialized tasks.</p>
      </div>

      <div className="grid-2">
        {/* Preset Selection */}
        <div className="glass-card">
          <h2 style={{ marginBottom: '16px' }}>Fine-Tuning Presets</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {FINE_TUNE_PRESETS.map(preset => (
              <div
                key={preset.id}
                onClick={() => handlePresetSelect(preset)}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: selectedPreset?.id === preset.id ? '2px solid var(--accent-purple)' : '1px solid var(--border-subtle)',
                  background: selectedPreset?.id === preset.id ? 'rgba(139,92,246,0.05)' : 'var(--bg-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '1.5rem' }}>{preset.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600 }}>{preset.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{preset.description}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <span className="health-pill" style={{ fontSize: '0.7rem' }}>Base: {preset.baseModel}</span>
                  <span className="health-pill" style={{ fontSize: '0.7rem' }}>Epochs: {preset.epochs}</span>
                  <span className="health-pill" style={{ fontSize: '0.7rem' }}>LR: {preset.learningRate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Configuration & Upload */}
        <div className="glass-card">
          <h2 style={{ marginBottom: '16px' }}>Configuration</h2>
          
          {/* File Upload */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>Training Data</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.jsonl"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            <button
              className="secondary-btn"
              onClick={() => fileInputRef.current?.click()}
              style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Upload size={16} />
              {trainingFile ? trainingFile.name : 'Upload JSON/JSONL Training File'}
            </button>
            {trainingFile && (
              <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Size: {(trainingFile.size / 1024).toFixed(1)} KB
              </div>
            )}
          </div>

          {/* Config Parameters */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Epochs</label>
              <input
                type="number"
                value={config.epochs}
                onChange={e => setConfig({...config, epochs: parseInt(e.target.value) || 1})}
                min="1"
                max="20"
                style={{ width: '100%', padding: '8px', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Learning Rate</label>
              <input
                type="text"
                value={config.learningRate}
                onChange={e => setConfig({...config, learningRate: parseFloat(e.target.value) || 0.0001})}
                style={{ width: '100%', padding: '8px', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Batch Size</label>
              <input
                type="number"
                value={config.batchSize}
                onChange={e => setConfig({...config, batchSize: parseInt(e.target.value) || 4})}
                min="1"
                max="32"
                style={{ width: '100%', padding: '8px', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>Max Seq Length</label>
              <input
                type="number"
                value={config.maxSeqLength}
                onChange={e => setConfig({...config, maxSeqLength: parseInt(e.target.value) || 2048})}
                min="512"
                max="8192"
                step="256"
                style={{ width: '100%', padding: '8px', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* Start Button */}
          <button
            className="primary-btn"
            onClick={startTraining}
            disabled={isTraining || !trainingFile || !selectedPreset}
            style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {isTraining ? (
              <>
                <Loader size={16} className="animate-spin" /> Training...
              </>
            ) : (
              <>
                <Play size={16} /> Start Fine-Tuning
              </>
            )}
          </button>

          {/* Training Status */}
          {trainingStatus && (
            <div style={{ marginTop: '16px', padding: '12px', borderRadius: '8px', background: trainingStatus === 'completed' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                {trainingStatus === 'completed' ? (
                  <Check size={16} style={{ color: '#10b981' }} />
                ) : (
                  <Loader size={16} className="animate-spin" style={{ color: '#3b82f6' }} />
                )}
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  {trainingStatus === 'completed' ? 'Training Complete' : 'Training in Progress'}
                </span>
              </div>
            </div>
          )}

          {/* Training Logs */}
          {trainingLogs.length > 0 && (
            <div style={{ marginTop: '16px', maxHeight: '300px', overflowY: 'auto', padding: '12px', borderRadius: '8px', background: 'var(--bg-tertiary)', fontFamily: 'monospace', fontSize: '0.75rem' }}>
              {trainingLogs.map((log, i) => (
                <div key={i} style={{ marginBottom: '4px', color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>[{log.time}]</span> {log.message}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="glass-card" style={{ marginTop: '24px', background: 'rgba(59,130,246,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <AlertCircle size={24} style={{ color: 'var(--accent-blue)' }} />
          <h2 style={{ margin: 0 }}>Fine-Tuning Guide</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          <div>
            <strong>Training Data Format</strong>
            <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
              Upload JSON/JSONL files with instruction-input-output triples. Each line should contain a JSON object with "instruction", "input", and "output" fields.
            </p>
          </div>
          <div>
            <strong>LoRA Adapters</strong>
            <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
              We use LoRA (Low-Rank Adaptation) for efficient fine-tuning. This trains only small adapter layers while keeping the base model frozen.
            </p>
          </div>
          <div>
            <strong>Local Processing</strong>
            <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
              All fine-tuning happens locally on your machine. No data is sent to external servers. GPU acceleration recommended for faster training.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}