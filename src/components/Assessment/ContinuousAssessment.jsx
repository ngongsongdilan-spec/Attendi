import React, { useState, useEffect } from 'react';
import { 
  Save, FileText, Users, Target, Code, Award, 
  Presentation, Search, ChevronRight, X, CheckCircle, Star
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const ContinuousAssessment = ({ user }) => {
  const { students } = useAppContext();
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [assessments, setAssessments] = useState({});
  const [scores, setScores] = useState({
    proposal: 0,
    research: 0,
    implementation: 0,
    contribution: 0,
    presentation: 0,
  });
  const [feedback, setFeedback] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const userRole = user?.role || 'student';
  const isLecturer = userRole === 'lecturer' || userRole === 'admin';

  const lecturerName = user?.fullName || 'Lecturer';
  const lecturerDepartment = user?.department || 'Engineering';

  const getGroupForStudent = (matricule) => {
    try {
      const groups = JSON.parse(localStorage.getItem('fet_groups') || '[]');
      const g = groups.find(g => g.memberMatricules?.includes(matricule));
      return g?.name || 'Unassigned';
    } catch {
      return 'Unassigned';
    }
  };

  // Assessment targets come from the real student list
  const assessmentStudents = students.map(s => ({
    id: s.matricule,
    name: s.fullName,
    department: s.department,
    level: s.level,
    group: getGroupForStudent(s.matricule),
  }));

  useEffect(() => {
    const saved = localStorage.getItem('fet_assessments');
    if (saved) {
      try {
        setAssessments(JSON.parse(saved));
      } catch {
        setAssessments({});
      }
    }
  }, []);

  const filteredStudents = assessmentStudents.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setIsEditing(true);
    const existing = assessments[student.id];
    if (existing) {
      setScores({
        proposal: existing.scores?.proposal || 0,
        research: existing.scores?.research || 0,
        implementation: existing.scores?.implementation || 0,
        contribution: existing.scores?.contribution || 0,
        presentation: existing.scores?.presentation || 0,
      });
      setFeedback(existing.feedback || '');
    } else {
      setScores({ proposal: 0, research: 0, implementation: 0, contribution: 0, presentation: 0 });
      setFeedback('');
    }
    setSuccess('');
  };

  const handleScoreChange = (category, value) => {
    const numValue = Math.min(20, Math.max(0, parseInt(value) || 0));
    setScores(prev => ({ ...prev, [category]: numValue }));
  };

  const calculateTotal = () => {
    return Object.values(scores).reduce((sum, val) => sum + val, 0);
  };

  const handleSave = () => {
    if (!selectedStudent) return;

    const total = calculateTotal();
    const assessmentData = {
      studentId: selectedStudent.id,
      studentName: selectedStudent.name,
      department: selectedStudent.department,
      level: selectedStudent.level,
      group: selectedStudent.group,
      scores: scores,
      total: total,
      feedback: feedback,
      assessedBy: lecturerName,
      date: new Date().toISOString().split('T')[0],
      status: 'Published',
    };

    const updated = { ...assessments, [selectedStudent.id]: assessmentData };
    setAssessments(updated);
    localStorage.setItem('fet_assessments', JSON.stringify(updated));
    
    setSuccess(`✅ Assessment saved and released to ${selectedStudent.name}`);
    setIsEditing(false);
    setTimeout(() => setSuccess(''), 3000);
  };

  const getAssessmentStatus = (studentId) => {
    const data = assessments[studentId];
    if (!data) return 'Not Assessed';
    return data.status || 'Draft';
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Published': return 'fet-badge fet-badge-active';
      case 'Draft': return 'fet-badge fet-badge-pending';
      default: return 'fet-badge fet-badge-inactive';
    }
  };

  const assessmentCategories = [
    { key: 'proposal', label: 'Proposal', icon: FileText, max: 20 },
    { key: 'research', label: 'Research', icon: Target, max: 20 },
    { key: 'implementation', label: 'Implementation', icon: Code, max: 20 },
    { key: 'contribution', label: 'Contribution', icon: Users, max: 20 },
    { key: 'presentation', label: 'Presentation', icon: Presentation, max: 20 },
  ];

  const total = calculateTotal();

  // ===== STUDENT VIEW: released results only =====
  if (!isLecturer) {
    const myResult = user?.matricule ? assessments[user.matricule] : null;

    return (
      <div className="space-y-6">
        <div className="fet-welcome-banner">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold">Assessment Results</h2>
              <p className="text-[#8683BA] mt-1">View your released continuous assessment results</p>
              <p className="text-[#8683BA] text-sm mt-1">🎓 {user?.fullName || 'Student'} • {user?.matricule || ''}</p>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
              <p className="text-xs text-[#8683BA]">Total Score</p>
              <p className="text-xl font-bold">{myResult ? `${myResult.total}/100` : '—'}</p>
            </div>
          </div>
        </div>

        {myResult ? (
          <div className="fet-card p-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border-default">
              <div>
                <h3 className="text-xl font-bold text-text-primary" style={{ fontSize: '18px' }}>Result Breakdown</h3>
                <p className="text-sm text-text-secondary">Assessed by {myResult.assessedBy} · {myResult.date}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-text-secondary">Overall</p>
                <p className="text-3xl font-bold text-text-primary">{myResult.total}<span className="text-lg text-text-secondary">/100</span></p>
              </div>
            </div>

            <div className="space-y-4">
              {assessmentCategories.map((cat) => {
                const Icon = cat.icon;
                const score = myResult.scores?.[cat.key] || 0;
                const pct = Math.round((score / cat.max) * 100);
                return (
                  <div key={cat.key} className="flex items-center gap-4 p-4 bg-page-bg rounded-xl">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon size={20} className="text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-primary">{cat.label}</p>
                      <div className="w-full h-2 bg-[#D9DADB] rounded-full mt-1">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-[#8B5CF6] rounded-full"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-text-primary">{score}<span className="text-xs text-text-secondary">/{cat.max}</span></p>
                  </div>
                );
              })}
            </div>

            {myResult.feedback && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-sm font-semibold text-text-primary flex items-center gap-2"><Star size={16} /> Feedback</p>
                <p className="text-sm text-text-secondary mt-1">{myResult.feedback}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="fet-card p-6 text-center">
            <FileText size={48} className="mx-auto text-text-secondary opacity-50" />
            <p className="text-text-secondary mt-4">No results have been released yet.</p>
            <p className="text-sm text-text-secondary">Your lecturer will publish your continuous assessment results here once available.</p>
          </div>
        )}
      </div>
    );
  }

  // ===== LECTURER VIEW =====
  return (
    <div className="space-y-6">
      <div className="fet-welcome-banner">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold">Continuous Assessment</h2>
            <p className="text-[#8683BA] mt-1">Assess students across the entire project journey</p>
            <p className="text-[#8683BA] text-sm mt-1">👨‍🏫 {lecturerName} • {lecturerDepartment}</p>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
            <p className="text-xs text-[#8683BA]">Students</p>
            <p className="text-xl font-bold">{assessmentStudents.length}</p>
          </div>
        </div>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle size={18} /> {success}
        </div>
      )}

      <div className="fet-card p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" size={18} />
            <input
              type="text"
              placeholder="Search students by name or matricule..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 fet-input"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="fet-btn-secondary text-sm">
              All ({assessmentStudents.length})
            </button>
            <button className="fet-btn-success text-sm">
              Assessed ({Object.keys(assessments).length})
            </button>
            <button className="fet-btn-danger text-sm">
              Pending ({assessmentStudents.length - Object.keys(assessments).length})
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="fet-card p-4">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Students</h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredStudents.map((student) => {
                const hasAssessment = !!assessments[student.id];
                return (
                  <button
                    key={student.id}
                    onClick={() => handleSelectStudent(student)}
                    className={`w-full text-left p-3 rounded-xl transition-colors ${
                      selectedStudent?.id === student.id
                        ? 'bg-primary/10 border-2 border-primary'
                        : 'bg-page-bg hover:bg-[#E7E8E9]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-text-primary">{student.name}</p>
                        <p className="text-xs text-text-secondary">{student.id} • {student.group}</p>
                      </div>
                      <div className="text-right">
                        <span className={`${getStatusColor(getAssessmentStatus(student.id))}`}>
                          {getAssessmentStatus(student.id)}
                        </span>
                      </div>
                    </div>
                    {hasAssessment && (
                      <div className="mt-1">
                        <div className="w-full h-1.5 bg-page-bg rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-primary to-[#8B5CF6] rounded-full"
                            style={{ width: `${(assessments[student.id]?.total || 0)}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-text-secondary mt-0.5">
                          Score: {assessments[student.id]?.total || 0}/100
                        </p>
                      </div>
                    )}
                  </button>
                );
              })}
              {filteredStudents.length === 0 && (
                <p className="text-center text-text-secondary py-4">No students found</p>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="fet-card p-6">
            {selectedStudent ? (
              <>
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-border-default">
                  <div>
                    <h3 className="text-xl font-bold text-text-primary" style={{ fontSize: '18px' }}>{selectedStudent.name}</h3>
                    <p className="text-sm text-text-secondary">
                      {selectedStudent.id} • Level {selectedStudent.level} • {selectedStudent.department}
                    </p>
                    <p className="text-sm text-text-secondary">Group: {selectedStudent.group}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-text-secondary">Total Score</p>
                    <p className="text-3xl font-bold text-text-primary">{total}<span className="text-lg text-text-secondary">/100</span></p>
                  </div>
                </div>

                <div className="space-y-4">
                  {assessmentCategories.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <div key={cat.key} className="flex items-center gap-4 p-4 bg-page-bg rounded-xl">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Icon size={20} className="text-primary" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-text-primary">
                            {cat.label} (0-{cat.max})
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={cat.max}
                            value={scores[cat.key]}
                            onChange={(e) => handleScoreChange(cat.key, e.target.value)}
                            className="mt-1 w-24 px-3 py-1 fet-input"
                          />
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-text-primary">{scores[cat.key]}</p>
                          <p className="text-xs text-text-secondary">/ {cat.max}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6">
                  <label className="fet-label mb-2">Feedback</label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Enter feedback for the student..."
                    className="w-full px-4 py-3 fet-input resize-none"
                    rows={3}
                  />
                </div>

                <div className="mt-6 pt-4 border-t border-border-default flex justify-end">
                  <button
                    onClick={handleSave}
                    className="fet-btn-primary flex items-center gap-2"
                  >
                    <Save size={18} />
                    Save & Release Result
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <FileText size={48} className="mx-auto text-text-secondary opacity-50" />
                <p className="text-text-secondary mt-4">Select a student to assess</p>
                <p className="text-sm text-text-secondary">Click on a student from the list to start</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContinuousAssessment;
