import React, { useState } from 'react';
import { Upload, X, FileText, Check, AlertCircle } from 'lucide-react';

const ContributionForm = ({ projectId, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'Code Implementation',
    evidence: null,
    evidenceName: '',
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const contributionTypes = [
    'Code Implementation',
    'Research',
    'Documentation',
    'UI/UX Design',
    'Testing',
    'Presentation Preparation',
    'Other',
  ];

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        evidence: file,
        evidenceName: file.name,
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description) {
      setError('Please fill in all required fields');
      return;
    }

    setUploading(true);
    
    // Simulate upload
    setTimeout(() => {
      onSubmit({
        ...formData,
        id: Date.now(),
        date: new Date().toISOString(),
        status: 'Pending Review',
        evidenceFile: formData.evidenceName || 'No file attached',
      });
      setUploading(false);
    }, 1500);
  };

  return (
    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-[#191C1D]">Submit Contribution</h3>
        <button onClick={onClose} className="p-1 hover:bg-[#EDEEEF] rounded-lg">
          <X size={24} className="text-[#47464F]" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-[#191C1D] mb-1">Contribution Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="e.g., Implemented login system"
            className="w-full px-4 py-2 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#191C1D] mb-1">Description *</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe your contribution..."
            className="w-full px-4 py-2 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] resize-none"
            rows={4}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#191C1D] mb-1">Contribution Type</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
            className="w-full px-4 py-2 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white"
          >
            {contributionTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#191C1D] mb-1">Evidence (Optional)</label>
          <div className="border-2 border-dashed border-[#C8C5D0] rounded-xl p-6 text-center hover:border-[#3B82F6] transition-colors">
            <Upload className="mx-auto text-[#47464F] mb-2" size={32} />
            <p className="text-sm text-[#47464F]">Drop files here or click to browse</p>
            <input
              type="file"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="mt-2 inline-block px-4 py-2 bg-[#EDEEEF] rounded-lg text-sm font-medium hover:bg-[#E7E8E9] cursor-pointer"
            >
              Select File
            </label>
            {formData.evidenceName && (
              <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                <Check size={16} /> {formData.evidenceName}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[#C8C5D0]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[#C8C5D0] rounded-xl text-[#47464F] hover:bg-[#EDEEEF] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={uploading}
            className="px-6 py-2 bg-[#3B82F6] text-white rounded-xl font-semibold hover:bg-[#3B82F6]/90 transition-colors disabled:opacity-50"
          >
            {uploading ? 'Submitting...' : 'Submit Contribution'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ContributionForm;