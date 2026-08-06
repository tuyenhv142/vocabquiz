import React, { useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Upload, Plus, Trash2, FileText, CheckCircle } from 'lucide-react';

export default function CreateSetModal({ userId, onClose, onSetCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cards, setCards] = useState([
    { term: '', definition: '', exampleSentence: '', partOfSpeech: '' }
  ]);
  const [loading, setLoading] = useState(false);
  const [importStats, setImportStats] = useState(null);

  // --- Handlers for Single Cards ---
  const handleCardChange = (index, field, value) => {
    const updatedCards = [...cards];
    updatedCards[index][field] = value;
    setCards(updatedCards);
  };

  const addEmptyCard = () => {
    setCards([...cards, { term: '', definition: '', exampleSentence: '', partOfSpeech: '' }]);
  };

  const removeCard = (index) => {
    if (cards.length === 1) return;
    setCards(cards.filter((_, i) => i !== index));
  };

  // --- Handlers for File Upload (CSV & Excel) ---
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop().toLowerCase();

    if (fileExtension === 'csv' || fileExtension === 'tsv' || fileExtension === 'txt') {
      // Parse CSV / TSV
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          processParsedData(results.data);
        },
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // Parse Excel
      const reader = new FileReader();
      reader.onload = (e) => {
        const buffer = e.target.result;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        processParsedData(json);
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert('Unsupported file format. Please upload a .csv, .xlsx, or .txt file.');
    }
  };

  // Normalize column header naming variations across files
  const getColumnValue = (row, possibleNames) => {
    if (!row || typeof row !== 'object') return '';
    const keys = Object.keys(row);
    for (const name of possibleNames) {
      const normTarget = name.toLowerCase().replace(/[\s_]/g, '');
      const foundKey = keys.find((k) => k.toLowerCase().replace(/[\s_]/g, '') === normTarget);
      if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
        return String(row[foundKey]).trim();
      }
    }
    return '';
  };

  const processParsedData = (parsedRows) => {
    const formattedCards = parsedRows
      .map((row) => {
        const term = getColumnValue(row, ['term', 'word', 'vocabulary', 'vocab']);
        const definition = getColumnValue(row, ['definition', 'meaning', 'translation', 'def']);
        const exampleSentence = getColumnValue(row, ['exampleSentence', 'example_sentence', 'example', 'sentence', 'examples']);
        const partOfSpeech = getColumnValue(row, ['partOfSpeech', 'part_of_speech', 'pos', 'type']);

        return {
          term,
          definition,
          exampleSentence,
          partOfSpeech,
        };
      })
      .filter((c) => c.term && c.definition); // Filter out rows with empty mandatory fields

    if (formattedCards.length === 0) {
      alert('No valid words found in file. Make sure your file has headers like "Term" and "Definition".');
      return;
    }

    // Merge imported cards into the state list
    setCards((prevCards) => {
      // Filter out empty draft inputs from the existing state
      const cleanedExisting = prevCards.filter((c) => c.term || c.definition);
      return [...cleanedExisting, ...formattedCards];
    });

    setImportStats(`Successfully imported ${formattedCards.length} words from file!`);
  };

  // --- Submit Everything to Backend ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId) {
      alert('Please log in before creating a new set.');
      return;
    }
    if (!title.trim()) return alert('Please enter a set title.');
    
    const validCards = cards.filter((c) => c.term.trim() && c.definition.trim());
    if (validCards.length === 0) return alert('Please add at least one card with a term and definition.');

    setLoading(true);
    const API_BASE = typeof window !== 'undefined' && window.location.origin.includes('5173')
      ? 'http://localhost:5000'
      : '';

    try {
      // 1. Create the Study Set
      const setRes = await fetch(`${API_BASE}/api/sets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, title, description, isPublic: true }),
      });
      const newSet = await setRes.json();

      if (!setRes.ok) throw new Error(newSet.error || 'Failed to create set');

      // 2. Batch Import Cards into Database
      const cardsRes = await fetch(`${API_BASE}/api/sets/${newSet.id}/cards/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards: validCards }),
      });

      if (!cardsRes.ok) {
        const cardsData = await cardsRes.json();
        throw new Error(cardsData.error || 'Failed to save cards');
      }

      setLoading(false);
      if (onSetCreated) onSetCreated(newSet.id);
      onClose();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error saving set.');
      setLoading(false);
    }
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContainerStyle}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Create New Vocabulary Set</h2>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          
          {/* Metadata Section */}
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Set Title (e.g., TOEFL Core Vocabulary 500)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle}
              required
            />
            <textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ ...inputStyle, height: '60px', marginTop: '10px' }}
            />
          </div>

          {/* Import Dropzone Section */}
          <div style={dropzoneStyle}>
            <Upload size={28} color="#3b82f6" />
            <div style={{ marginLeft: '12px', textAlign: 'left' }}>
              <div style={{ fontWeight: 'bold' }}>Import Words from File</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Supports .csv, .tsv, and .xlsx (Headers: Term, Definition, Example)</div>
            </div>
            <input
              type="file"
              accept=".csv, .tsv, .xlsx, .xls, .txt"
              onChange={handleFileUpload}
              style={fileInputStyle}
            />
          </div>

          {importStats && (
            <div style={badgeStyle}>
              <CheckCircle size={16} color="#16a34a" style={{ marginRight: '6px' }} />
              {importStats}
            </div>
          )}

          {/* Words Preview / Edit List */}
          <h3 style={{ marginTop: '24px', marginBottom: '12px' }}>
            Words ({cards.length})
          </h3>

          <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '6px' }}>
            {cards.map((card, index) => (
              <div key={index} style={cardRowStyle}>
                <div style={{ fontWeight: 'bold', width: '30px', color: '#94a3b8' }}>#{index + 1}</div>
                
                <input
                  type="text"
                  placeholder="Term (Word)*"
                  value={card.term}
                  onChange={(e) => handleCardChange(index, 'term', e.target.value)}
                  style={{ ...rowInputStyle, flex: 2 }}
                />

                <input
                  type="text"
                  placeholder="Definition*"
                  value={card.definition}
                  onChange={(e) => handleCardChange(index, 'definition', e.target.value)}
                  style={{ ...rowInputStyle, flex: 3 }}
                />

                <input
                  type="text"
                  placeholder="POS (e.g., noun)"
                  value={card.partOfSpeech}
                  onChange={(e) => handleCardChange(index, 'partOfSpeech', e.target.value)}
                  style={{ ...rowInputStyle, flex: 1 }}
                />

                <input
                  type="text"
                  placeholder="Example Sentence"
                  value={card.exampleSentence}
                  onChange={(e) => handleCardChange(index, 'exampleSentence', e.target.value)}
                  style={{ ...rowInputStyle, flex: 3 }}
                />

                <button
                  type="button"
                  onClick={() => removeCard(index)}
                  style={iconBtnStyle}
                  title="Delete Card"
                >
                  <Trash2 size={18} color="#ef4444" />
                </button>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
            <button
              type="button"
              onClick={addEmptyCard}
              style={addBtnStyle}
            >
              <Plus size={16} style={{ marginRight: '6px' }} /> Add Word Card
            </button>

            <div>
              <button type="button" onClick={onClose} style={cancelBtnStyle}>
                Cancel
              </button>
              <button type="submit" disabled={loading} style={saveBtnStyle}>
                {loading ? 'Saving...' : 'Create & Save Set'}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}

// --- Inline Styles ---
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContainerStyle = { backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', width: '90%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' };
const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', boxSizing: 'border-box' };
const dropzoneStyle = { position: 'relative', border: '2px dashed #93c5fd', backgroundColor: '#eff6ff', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', cursor: 'pointer' };
const fileInputStyle = { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' };
const badgeStyle = { marginTop: '10px', backgroundColor: '#dcfce7', color: '#15803d', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', display: 'flex', alignItems: 'center' };
const cardRowStyle = { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' };
const rowInputStyle = { padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' };
const closeBtnStyle = { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' };
const iconBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', padding: '4px' };
const addBtnStyle = { display: 'flex', alignItems: 'center', padding: '10px 16px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' };
const cancelBtnStyle = { padding: '10px 18px', border: '1px solid #cbd5e1', backgroundColor: '#fff', borderRadius: '8px', cursor: 'pointer', marginRight: '10px' };
const saveBtnStyle = { padding: '10px 20px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' };