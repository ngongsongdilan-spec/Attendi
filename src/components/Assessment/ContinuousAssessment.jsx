import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Save, FileText, Target, Code, Users, Plus, X } from 'lucide-react';
import RubricItem from './RubricItem';

const ContinuousAssessment = () => {
  const { assessments, addAssessment, updateAssessment, students, projects } = useAppContext();
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    student: '',
    project: '',
    group: '',
    rubric: [
      { label: 'Proposal Document', weight: 10, maxMarks: 10, score: 0 },
      { label: 'Research & Analysis', weight: 15, maxMarks: 15, score: 0 },
      { label: 'Implementation & Code Quality', weight: 25, maxMarks: 25, score: 0 },
      { label: 'Individual Contribution', weight: 20, maxMarks: 20, score: 0 },
    ],
    feedback: '',
    status: 'Draft'
  });

  const handleAddAssessment = () => {
    const totalScore = formData.rubric.reduce((acc, item) => acc + item.score, 0);
    const totalMax = formData.rubric.reduce((acc, item) => acc + item.maxMarks, 0);
    const subtotal = ((totalScore / totalMax) * 100).toFixed(1);

    const newAssessment = {
      ...formData,
      subtotal: parseFloat(subtotal),
      createdAt: new Date().toISOString().split('T')[0]
    };
    addAssessment(newAssessment);
    setShowForm(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      student: '',
      project: '',
      group: '',
      rubric: [
        { label: 'Proposal Document', weight: 10, maxMarks: 10, score: 0 },
        { label: 'Research & Analysis', weight: 15, maxMarks: 15, score: 0 },
        { label: 'Implementation & Code Quality', weight: 25, maxMarks: 25, score: 0 },
        { label: 'Individual Contribution', weight: 20, maxMarks: 20, score: 0 },
      ],
      feedback: '',
      status: 'Draft'
    });
    setFeedback('');
  };

  const handleRubricChange = (index, field, value) => {
    const newRubric = [...formData.rubric];
    newRubric[index][field] = parseFloat(value) || 0;
    setFormData(prev => ({ ...prev, rubric: newRubric }));
  };

  const handleSaveFeedback = (id) => {
    updateAssessment(id, { feedback, status: 'Submitted' });
    setFeedback('');
  };

  const totalScore = formData.rubric.reduce((acc, item) => acc + item.score, 0);
  const totalMax = formData.rubric.reduce((acc, item) => acc + item.maxMarks, 0);
  const subtotal = ((totalScore / totalMax) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#191C1D]">Continuous Assessment</h2>
          <p className="text-[#47464F]">Evaluate student progress and project contributions.</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#3B82F6] text-white rounded-lg font-medium hover:bg-[#3B82F6]/90 transition-colors"
        >
          <Plus size={18} />
          New Assessment
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {assessments.map((assessment) => {
          const total = assessment.rubric.reduce((acc, r) => acc + r.score, 0);
          const max = assessment.rubric.reduce((acc, r) => acc + r.maxMarks, 0);
          const percentage = ((total / max) * 100).toFixed(1);
          
          return (
            <div key={assessment.id} className="bg-white rounded-lg shadow-sm border border-[#C8C5D0] p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#191C1D]">{assessment.student}</h3>
                  <p className="text-sm text-[#47464F]">{assessment.project} • {assessment.group}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  assessment.status === 'Submitted' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {assessment.status || 'Draft'}
                </span>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-sm text-[#47464F] mb-1">
                  <span>Score</span>
                  <span className="font-semibold text-[#191C1D]">{percentage}%</span>
                </div>
                <div className="w-full h-2 bg-[#EDEEEF] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] rounded-full"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-[#C8C5D0] flex gap-2">
                <button 
                  onClick={() => {
                    setSelectedAssessment(assessment);
                    setFeedback(assessment.feedback || '');
                  }}
                  className="flex-1 px-3 py-1.5 bg-[#3B82F6]/10 text-[#3B82F6] rounded-lg text-sm font-medium hover:bg-[#3B82F6]/20 transition-colors"
                >
                  View Details
                </button>
                {assessment.status !== 'Submitted' && (
                  <button 
                    onClick={() => handleSaveFeedback(assessment.id)}
                    className="flex-1 px-3 py-1.5 bg-green-500/10 text-green-600 rounded-lg text-sm font-medium hover:bg-green-500/20 transition-colors"
                  >
                    Submit
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {assessments.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-[#C8C5D0]">
          <FileText size={48} className="mx-auto text-[#47464F] opacity-50" />
          <p className="text-[#47464F] mt-4">No assessments yet. Create your first assessment!</p>
        </div>
      )}

      {/* View Assessment Modal */}
      {selectedAssessment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[#C8C5D0]">
              <h3 className="text-xl font-bold text-[#191C1D]">Assessment Details</h3>
              <button 
                onClick={() => setSelectedAssessment(null)} 
                className="p-1 hover:bg-[#EDEEEF] rounded-lg transition-colors"
              >
                <X size={24} className="text-[#47464F]" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <p className="font-semibold text-[#191C1D]">{selectedAssessment.student}</p>
                <p className="text-sm text-[#47464F]">{selectedAssessment.project} • {selectedAssessment.group}</p>
              </div>
              <div className="space-y-3">
                {selectedAssessment.rubric.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-[#EDEEEF] rounded-lg">
                    <div>
                      <p className="font-medium text-[#191C1D]">{item.label}</p>
                      <p className="text-xs text-[#47464F]">Weight: {item.weight}% | Max: {item.maxMarks}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[#191C1D]">{item.score}</p>
                      <p className="text-xs text-[#47464F]">/ {item.maxMarks}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-4 bg-[#EDEEEF] rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#47464F]">Total Score</p>
                    <p className="text-2xl font-bold text-[#191C1D]">
                      {selectedAssessment.subtotal || ((selectedAssessment.rubric.reduce((acc, r) => acc + r.score, 0) / 
                        selectedAssessment.rubric.reduce((acc, r) => acc + r.maxMarks, 0)) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <p className="text-sm text-[#47464F]">Status: {selectedAssessment.status || 'Draft'}</p>
                </div>
              </div>
              {selectedAssessment.feedback && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-[#191C1D]">Feedback:</p>
                  <p className="text-sm text-[#47464F]">{selectedAssessment.feedback}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Assessment Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[#C8C5D0]">
              <h3 className="text-xl font-bold text-[#191C1D]">New Assessment</h3>
              <button 
                onClick={() => setShowForm(false)} 
                className="p-1 hover:bg-[#EDEEEF] rounded-lg transition-colors"
              >
                <X size={24} className="text-[#47464F]" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#191C1D] mb-1">Student</label>
                  <select
                    value={formData.student}
                    onChange={(e) => setFormData(prev => ({ ...prev, student: e.target.value }))}
                    className="w-full px-4 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white"
                  >
                    <option value="">Select Student</option>
                    {students.map(s => (
                      <option key={s.id} value={s.name}>{s.name} ({s.id})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#191C1D] mb-1">Project</label>
                  <select
                    value={formData.project}
                    onChange={(e) => setFormData(prev => ({ ...prev, project: e.target.value }))}
                    className="w-full px-4 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] bg-white"
                  >
                    <option value="">Select Project</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.title}>{p.title}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#191C1D] mb-1">Group</label>
                <input
                  type="text"
                  value={formData.group}
                  onChange={(e) => setFormData(prev => ({ ...prev, group: e.target.value }))}
                  className="w-full px-4 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>

              <h4 className="font-semibold text-[#191C1D] mt-4">Rubric Items</h4>
              {formData.rubric.map((item, index) => (
                <div key={index} className="flex items-center gap-4 p-3 bg-[#EDEEEF] rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-[#191C1D] text-sm">{item.label}</p>
                    <p className="text-xs text-[#47464F]">Weight: {item.weight}% | Max: {item.maxMarks}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-[#47464F]">Score:</label>
                    <input
                      type="number"
                      value={item.score}
                      onChange={(e) => handleRubricChange(index, 'score', e.target.value)}
                      min="0"
                      max={item.maxMarks}
                      className="w-20 px-2 py-1 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-center"
                    />
                  </div>
                </div>
              ))}

              <div className="p-4 bg-[#EDEEEF] rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#47464F]">Current Subtotal</p>
                    <p className="text-2xl font-bold text-[#191C1D]">{subtotal}%</p>
                  </div>
                  <p className="text-sm text-[#47464F]">(Scaled to 100% later)</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#191C1D] mb-1">Feedback</label>
                <textarea
                  value={formData.feedback}
                  onChange={(e) => setFormData(prev => ({ ...prev, feedback: e.target.value }))}
                  placeholder="Enter feedback..."
                  className="w-full px-4 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] resize-none"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#C8C5D0]">
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-[#C8C5D0] rounded-lg text-[#47464F] hover:bg-[#EDEEEF] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddAssessment}
                  className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg font-medium hover:bg-[#3B82F6]/90 transition-colors"
                >
                  Save Assessment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContinuousAssessment;