import React, { useState, useEffect } from 'react';
import { 
  Save, FileText, Users, Target, Code, Award, 
  Presentation, Search, ChevronRight, X, CheckCircle
} from 'lucide-react';
import { mockStudents, mockProjects, mockGroups } from '../../data/mockData';

const ContinuousAssessment = ({ user }) => {
  const [students, setStudents] = useState([]);
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

  const lecturerName = user?.fullName || 'Lecturer';
  const lecturerDepartment = user?.department || 'Engineering';

  const assessmentStudents = [
    { id: 'CS24-001', name: 'Alida Wirsiy', department: 'Computer Engineering', level: '400', group: 'Group A' },
    { id: 'CS24-018', name: 'James Miller', department: 'Software Engineering', level: '400', group: 'Group B' },
    { id: 'CS24-099', name: 'Sarah Connor', department: 'Computer Engineering', level: '400', group: 'Group A' },
    { id: 'CS24-112', name: 'Michael Chang', department: 'Electrical Engineering', level: '400', group: 'Group C' },
    { id: 'CS24-055', name: 'Olivia Davis', department: 'Civil Engineering', level: '400', group: 'Group B' },
  ];

  useEffect(() => {
    setStudents(assessmentStudents);
    const saved = localStorage.getItem('fet_assessments');
    if (saved) {
      try {
        setAssessments(JSON.parse(saved));
      } catch {
        setAssessments({});
      }
    }
  }, []);

  const filteredStudents = students.filter(s =>
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
    
    setSuccess(`✅ Assessment saved for ${selectedStudent.name}`);
    setIsEditing(false);
    setTimeout(() => setSuccess(''), 3000);
  };

  const getStudentAssessment = (studentId) => {
    return assessments[studentId];
  };

  const getAssessmentStatus = (studentId) => {
    const data = assessments[studentId];
    if (!data) return 'Not Assessed';
    return data.status || 'Draft';
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Published': return 'bg-green-100 text-green-800';
      case 'Draft': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-600';
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

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-[#1E1B4B] to-[#2A1F6E] rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold">Continuous Assessment</h2>
            <p className="text-[#8683BA] mt-1">Assess students across the entire project journey</p>
            <p className="text-[#8683BA] text-sm mt-1">👨‍🏫 {lecturerName} • {lecturerDepartment}</p>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
            <p className="text-xs text-[#8683BA]">Students</p>
            <p className="text-xl font-bold">{students.length}</p>
          </div>
        </div>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle size={18} /> {success}
        </div>
      )}

      <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-sm border border-[#C8C5D0] p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#47464F]" size={18} />
            <input
              type="text"
              placeholder="Search students by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#191C1D]"
            />
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-[#EDEEEF] rounded-xl text-sm font-medium hover:bg-[#E7E8E9] transition-colors">
              All ({students.length})
            </button>
            <button className="px-4 py-2 bg-green-100 text-green-800 rounded-xl text-sm font-medium">
              Assessed ({Object.keys(assessments).length})
            </button>
            <button className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-xl text-sm font-medium">
              Pending ({students.length - Object.keys(assessments).length})
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-sm border border-[#C8C5D0] p-4">
            <h3 className="text-sm font-semibold text-[#47464F] uppercase tracking-wider mb-3">Students</h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredStudents.map((student) => {
                const status = getStudentAssessment(student.id);
                const hasAssessment = !!status;
                return (
                  <button
                    key={student.id}
                    onClick={() => handleSelectStudent(student)}
                    className={`w-full text-left p-3 rounded-xl transition-colors ${
                      selectedStudent?.id === student.id
                        ? 'bg-[#3B82F6]/10 border-2 border-[#3B82F6]'
                        : 'bg-[#EDEEEF] hover:bg-[#E7E8E9]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-[#191C1D]">{student.name}</p>
                        <p className="text-xs text-[#47464F]">{student.id} • {student.group}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(getAssessmentStatus(student.id))}`}>
                          {getAssessmentStatus(student.id)}
                        </span>
                      </div>
                    </div>
                    {hasAssessment && (
                      <div className="mt-1">
                        <div className="w-full h-1.5 bg-[#EDEEEF] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] rounded-full"
                            style={{ width: `${(assessments[student.id]?.total || 0)}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-[#47464F] mt-0.5">
                          Score: {assessments[student.id]?.total || 0}/100
                        </p>
                      </div>
                    )}
                  </button>
                );
              })}
              {filteredStudents.length === 0 && (
                <p className="text-center text-[#47464F] py-4">No students found</p>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-sm border border-[#C8C5D0] p-6">
            {selectedStudent ? (
              <>
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#C8C5D0]">
                  <div>
                    <h3 className="text-xl font-bold text-[#191C1D]">{selectedStudent.name}</h3>
                    <p className="text-sm text-[#47464F]">
                      {selectedStudent.id} • Level {selectedStudent.level} • {selectedStudent.department}
                    </p>
                    <p className="text-sm text-[#47464F]">Group: {selectedStudent.group}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-[#47464F]">Total Score</p>
                    <p className="text-3xl font-bold text-[#191C1D]">{total}<span className="text-lg text-[#47464F]">/100</span></p>
                  </div>
                </div>

                <div className="space-y-4">
                  {assessmentCategories.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <div key={cat.key} className="flex items-center gap-4 p-4 bg-[#EDEEEF] rounded-xl">
                        <div className="p-2 bg-[#3B82F6]/10 rounded-lg">
                          <Icon size={20} className="text-[#3B82F6]" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-[#191C1D]">
                            {cat.label} (0-{cat.max})
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={cat.max}
                            value={scores[cat.key]}
                            onChange={(e) => handleScoreChange(cat.key, e.target.value)}
                            className="mt-1 w-24 px-3 py-1 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#191C1D]"
                          />
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-[#191C1D]">{scores[cat.key]}</p>
                          <p className="text-xs text-[#47464F]">/ {cat.max}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-[#191C1D] mb-2">Feedback</label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Enter feedback for the student..."
                    className="w-full px-4 py-3 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#191C1D] resize-none"
                    rows={3}
                  />
                </div>

                <div className="mt-6 pt-4 border-t border-[#C8C5D0] flex justify-end">
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-6 py-3 bg-[#1E1B4B] text-white rounded-xl font-semibold hover:bg-[#2A1F6E] transition-colors"
                  >
                    <Save size={18} />
                    Save Assessment
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <FileText size={48} className="mx-auto text-[#47464F] opacity-50" />
                <p className="text-[#47464F] mt-4">Select a student to assess</p>
                <p className="text-sm text-[#47464F]">Click on a student from the list to start</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContinuousAssessment;