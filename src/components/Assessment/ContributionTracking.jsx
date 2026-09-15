import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { TrendingUp, Eye, Users, Filter, Search } from 'lucide-react';

const ContributionTracking = () => {
  const { students, tasks, milestones, groups } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState('all');

  const studentContributions = useMemo(() => {
    const studentData = students.map(student => {
      const studentTasks = tasks.filter(t => t.assignedTo === student.matricule);
      const completedTasks = studentTasks.filter(t => t.status === 'Completed');
      const inProgressTasks = studentTasks.filter(t => t.status === 'In Progress');

      const studentGroup = groups.find(g => (g.memberMatricules || []).includes(student.matricule));
      const studentMilestones = studentGroup
        ? milestones.filter(m => m.project === studentGroup.project)
        : [];
      const completedMilestones = studentMilestones.filter(m => m.progress === 100);

      const totalTasks = studentTasks.length || 1;
      const taskCompletionRate = Math.round((completedTasks.length / totalTasks) * 100);

      const totalMilestones = studentMilestones.length || 1;
      const milestoneCompletionRate = Math.round((completedMilestones.length / totalMilestones) * 100);

      const overallContribution = Math.round((taskCompletionRate + milestoneCompletionRate) / 2);

      return {
        ...student,
        group: studentGroup?.name || 'Unassigned',
        tasksCompleted: `${completedTasks.length}/${studentTasks.length}`,
        milestonesMet: `${completedMilestones.length}/${studentMilestones.length}`,
        contribution: overallContribution || 0,
        participation: Math.min(100, overallContribution + 10),
        status: overallContribution >= 70 ? 'On Track' : overallContribution >= 50 ? 'Needs Attention' : 'At Risk'
      };
    });

    return studentData;
  }, [students, tasks, milestones, groups]);

  const filteredStudents = useMemo(() => {
    let filtered = studentContributions;
    if (searchTerm) {
      filtered = filtered.filter(s => 
        s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.department?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return filtered;
  }, [studentContributions, searchTerm]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Individual Contribution Tracking</h2>
        <p className="text-text-secondary" style={{ fontSize: '14px' }}>
          Monitor individual student engagement, task completion, and milestone progress to evaluate team contribution.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary" size={18} />
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 fet-input"
          />
        </div>
        <div className="flex gap-2">
          <button className="fet-btn-primary text-sm">
            All Groups
          </button>
          <button className="fet-btn-secondary text-sm">
            By Project
          </button>
          <button className="fet-btn-secondary text-sm">
            By Status
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredStudents.map((student) => (
          <div key={student.id} className="fet-card p-6 hover:shadow-md transition-shadow">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                  {student.fullName.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-lg font-semibold text-text-primary">{student.fullName}</h3>
                    <span className={`${
                      student.status === 'On Track' 
                        ? 'fet-badge fet-badge-active'
                        : student.status === 'Needs Attention'
                        ? 'fet-badge fet-badge-pending'
                        : 'fet-badge fet-badge-danger'
                    }`}>
                      {student.status}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary">{student.matricule} • {student.group} • {student.department}</p>
                  <div className="flex flex-wrap gap-4 mt-2">
                    <div>
                      <p className="text-xs text-text-secondary">Tasks Completed</p>
                      <p className="text-sm font-semibold text-text-primary">{student.tasksCompleted}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary">Milestones Met</p>
                      <p className="text-sm font-semibold text-text-primary">{student.milestonesMet}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-start md:items-end gap-2">
                <div className="bg-page-bg rounded-lg px-4 py-2 text-center min-w-[120px]">
                  <p className="text-xs text-text-secondary">Overall Contribution</p>
                  <p className="text-2xl font-bold text-text-primary">{student.contribution}%</p>
                  <p className="text-xs text-text-secondary">
                    {student.contribution >= 70 ? 'Excellent performance!' : 
                     student.contribution >= 50 ? 'Needs improvement' : 
                     'Requires immediate attention'}
                  </p>
                </div>
                <button className="flex items-center gap-1 text-primary text-sm font-medium hover:underline">
                  <Eye size={14} />
                  View Evidence
                </button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border-default">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-green-600" />
                  <span className="text-sm text-text-secondary">Participation</span>
                  <span className="text-sm font-semibold text-text-primary">{student.participation}%</span>
                  <span className={`text-xs ${student.participation >= 70 ? 'text-green-600' : 'text-red-500'}`}>
                    {student.participation >= 70 ? '+3%' : '-5%'}
                  </span>
                </div>
                <div className="w-48 h-2 bg-page-bg rounded-full">
                  <div 
                    className={`h-full rounded-full ${student.participation >= 70 ? 'bg-primary' : student.participation >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${student.participation}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredStudents.length === 0 && (
        <div className="text-center py-12 fet-card">
          <Users size={48} className="mx-auto text-text-secondary opacity-50" />
          <p className="text-text-secondary mt-4">No students found</p>
        </div>
      )}
    </div>
  );
};

export default ContributionTracking;
