import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { TrendingUp, Eye, Users, Filter, Search } from 'lucide-react';

const ContributionTracking = () => {
  const { students, tasks, milestones } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState('all');

  const studentContributions = useMemo(() => {
    const studentData = students.map(student => {
      const studentTasks = tasks.filter(t => t.assignedTo === student.name);
      const completedTasks = studentTasks.filter(t => t.status === 'Completed');
      const inProgressTasks = studentTasks.filter(t => t.status === 'In Progress');
      
      const studentMilestones = milestones.filter(m => m.assignedTo === student.name);
      const completedMilestones = studentMilestones.filter(m => m.progress === 100);
      
      const totalTasks = studentTasks.length || 1;
      const taskCompletionRate = Math.round((completedTasks.length / totalTasks) * 100);
      
      const totalMilestones = studentMilestones.length || 1;
      const milestoneCompletionRate = Math.round((completedMilestones.length / totalMilestones) * 100);
      
      const overallContribution = Math.round((taskCompletionRate + milestoneCompletionRate) / 2);
      
      return {
        ...student,
        tasksCompleted: `${completedTasks.length}/${studentTasks.length}`,
        milestonesMet: `${completedMilestones.length}/${studentMilestones.length}`,
        contribution: overallContribution || 0,
        participation: Math.min(100, overallContribution + 10),
        status: overallContribution >= 70 ? 'On Track' : overallContribution >= 50 ? 'Needs Attention' : 'At Risk'
      };
    });

    return studentData;
  }, [students, tasks, milestones]);

  const filteredStudents = useMemo(() => {
    let filtered = studentContributions;
    if (searchTerm) {
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.course?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return filtered;
  }, [studentContributions, searchTerm]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#191C1D]">Individual Contribution Tracking</h2>
        <p className="text-[#47464F]">
          Monitor individual student engagement, task completion, and milestone progress to evaluate team contribution.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#47464F]" size={18} />
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-[#C8C5D0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#191C1D]"
          />
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-[#3B82F6] text-white rounded-lg text-sm font-medium">
            All Groups
          </button>
          <button className="px-4 py-2 border border-[#C8C5D0] rounded-lg text-sm font-medium text-[#47464F] hover:bg-[#EDEEEF] transition-colors">
            By Project
          </button>
          <button className="px-4 py-2 border border-[#C8C5D0] rounded-lg text-sm font-medium text-[#47464F] hover:bg-[#EDEEEF] transition-colors">
            By Status
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredStudents.map((student) => (
          <div key={student.id} className="bg-white rounded-lg shadow-sm border border-[#C8C5D0] p-6 hover:shadow-md transition-shadow">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-[#3B82F6] text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                  {student.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-lg font-semibold text-[#191C1D]">{student.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      student.status === 'On Track' 
                        ? 'bg-green-100 text-green-800' 
                        : student.status === 'Needs Attention'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {student.status}
                    </span>
                  </div>
                  <p className="text-sm text-[#47464F]">{student.course || 'No course assigned'}</p>
                  <div className="flex flex-wrap gap-4 mt-2">
                    <div>
                      <p className="text-xs text-[#47464F]">Tasks Completed</p>
                      <p className="text-sm font-semibold text-[#191C1D]">{student.tasksCompleted}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#47464F]">Milestones Met</p>
                      <p className="text-sm font-semibold text-[#191C1D]">{student.milestonesMet}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-start md:items-end gap-2">
                <div className="bg-[#EDEEEF] rounded-lg px-4 py-2 text-center min-w-[120px]">
                  <p className="text-xs text-[#47464F]">Overall Contribution</p>
                  <p className="text-2xl font-bold text-[#191C1D]">{student.contribution}%</p>
                  <p className="text-xs text-[#47464F]">
                    {student.contribution >= 70 ? 'Excellent performance!' : 
                     student.contribution >= 50 ? 'Needs improvement' : 
                     'Requires immediate attention'}
                  </p>
                </div>
                <button className="flex items-center gap-1 text-[#3B82F6] text-sm font-medium hover:underline">
                  <Eye size={14} />
                  View Evidence
                </button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#C8C5D0]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-green-600" />
                  <span className="text-sm text-[#47464F]">Participation</span>
                  <span className="text-sm font-semibold text-[#191C1D]">{student.participation}%</span>
                  <span className={`text-xs ${student.participation >= 70 ? 'text-green-600' : 'text-red-500'}`}>
                    {student.participation >= 70 ? '+3%' : '-5%'}
                  </span>
                </div>
                <div className="w-48 h-2 bg-[#EDEEEF] rounded-full">
                  <div 
                    className={`h-full rounded-full ${student.participation >= 70 ? 'bg-[#3B82F6]' : student.participation >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${student.participation}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredStudents.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-[#C8C5D0]">
          <Users size={48} className="mx-auto text-[#47464F] opacity-50" />
          <p className="text-[#47464F] mt-4">No students found</p>
        </div>
      )}
    </div>
  );
};

export default ContributionTracking;