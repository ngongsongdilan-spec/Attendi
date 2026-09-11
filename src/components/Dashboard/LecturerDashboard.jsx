import React, { useState, useEffect } from 'react';
import { 
  Users, FolderKanban, CheckCircle, Clock, 
  BookOpen, AlertCircle, QrCode, Search
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatsCard from './StatsCard';
import ActivityFeed from './ActivityFeed';
import { useAppContext } from '../../context/AppContext';

const LecturerDashboard = ({ user }) => {
  const navigate = useNavigate();
  const { students, projects, tasks, attendanceRecords } = useAppContext();
  const [stats, setStats] = useState({ 
    enrolled: 0,
    present: 0,
    late: 0,
    notCheckedIn: 0,
    courses: 0,
    projects: 0,
    pending: 0,
  });
  const [reviewRows, setReviewRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const lecturerName = user?.fullName || 'Lecturer';
  const lecturerDepartment = user?.department || 'Engineering';
  const lecturerTitle = user?.title || 'Lecturer';
  const lecturerCoursesData = user?.courses || [];

  useEffect(() => {
    const totalStudents = students.length;
    const present = attendanceRecords.filter(a => a.status === 'Present').length;
    const late = attendanceRecords.filter(a => a.status === 'Late').length;
    const notCheckedIn = totalStudents - present - late;

    setStats({
      enrolled: totalStudents,
      present: present,
      late: late,
      notCheckedIn: notCheckedIn,
      courses: lecturerCoursesData.length,
      projects: projects.filter(p => p.lecturerId === user?.staffNumber || p.supervisor === lecturerName).length,
      pending: tasks.filter(t => t.status !== 'Completed').length,
    });

    const reviewed = attendanceRecords.filter(r => r.status === 'Review');
    setReviewRows(reviewed.map(r => {
      const student = students.find(s => s.matricule === r.studentId) || { fullName: r.studentId, matricule: r.studentId };
      return { fullName: student.fullName, id: student.matricule, status: r.status };
    }));
  }, [students, attendanceRecords, projects, tasks, user, lecturerCoursesData, lecturerName]);

  const statCards = [
    { icon: Users, label: 'Enrolled', value: stats.enrolled, color: 'secondary' },
    { icon: CheckCircle, label: 'Present', value: stats.present, color: 'success' },
    { icon: Clock, label: 'Late', value: stats.late, color: 'warning' },
    { icon: AlertCircle, label: 'Not Checked In', value: stats.notCheckedIn, color: 'error' },
  ];

  const filteredReviewRows = reviewRows.filter(s =>
    s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-[#1E1B4B] to-[#2A1F6E] rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold">Welcome back, {lecturerName} 👋</h2>
            <p className="text-[#8683BA]">{lecturerTitle} • {lecturerDepartment} Department</p>
            <p className="text-[#8683BA] text-sm mt-1">📚 Teaching {stats.courses} courses this semester</p>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
            <p className="text-xs text-[#8683BA]">Students</p>
            <p className="text-xl font-bold">{stats.enrolled}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      {/* QR Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6">
            <h3 className="text-lg font-semibold text-[#191C1D] mb-4">Scan to Attend</h3>
            <div className="bg-[#EDEEEF] rounded-xl p-8 text-center">
              <QrCode size={80} className="mx-auto text-[#3B82F6]" />
              <p className="text-sm text-[#47464F] mt-4">Generate a QR code for your next lecture</p>
              <button
                onClick={() => navigate('/attendance')}
                className="mt-4 px-6 py-2 bg-[#1E1B4B] text-white rounded-xl font-medium hover:bg-[#2A1F6E] transition-colors"
              >
                Generate QR
              </button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-[#EDEEEF] rounded-lg">
                <p className="text-lg font-bold">{stats.enrolled}</p>
                <p className="text-xs text-[#47464F]">Enrolled</p>
              </div>
              <div className="text-center p-2 bg-[#EDEEEF] rounded-lg">
                <p className="text-lg font-bold text-green-600">{stats.present}</p>
                <p className="text-xs text-[#47464F]">Present</p>
              </div>
              <div className="text-center p-2 bg-[#EDEEEF] rounded-lg">
                <p className="text-lg font-bold text-red-500">{stats.notCheckedIn}</p>
                <p className="text-xs text-[#47464F]">Absent</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#191C1D] flex items-center gap-2">
                <Users size={20} className="text-[#3B82F6]" />
                Attendance Requiring Review
              </h3>
              {reviewRows.length > 0 && (
                <button
                  onClick={() => navigate('/attendance')}
                  className="text-sm text-[#3B82F6] hover:underline"
                >
                  Go to Attendance →
                </button>
              )}
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#47464F]" size={18} />
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
              />
            </div>
            {filteredReviewRows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#C8C5D0]">
                      <th className="text-left py-3 px-3 text-xs font-semibold text-[#47464F] uppercase">Student</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-[#47464F] uppercase">ID</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-[#47464F] uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReviewRows.map((s, i) => (
                      <tr key={i} className="border-b border-[#C8C5D0] hover:bg-[#EDEEEF]">
                        <td className="py-3 px-3 font-medium">{s.fullName}</td>
                        <td className="py-3 px-3 text-[#47464F] text-sm">{s.id}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle size={36} className="mx-auto text-green-500" />
                <p className="text-sm text-[#47464F] mt-2">No records requiring review</p>
                <p className="text-xs text-[#47464F]">Start an attendance session to begin capturing student attendance.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* My Courses */}
      <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-6">
        <h3 className="text-lg font-semibold text-[#191C1D] flex items-center gap-2 mb-4">
          <BookOpen size={20} className="text-[#3B82F6]" />
          My Courses ({lecturerCourses.length})
        </h3>
        <div className="space-y-2">
          {lecturerCourses.length > 0 ? (
            lecturerCourses.map((course, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-[#EDEEEF] rounded-xl">
                <div>
                  <p className="font-medium">{course.id}</p>
                  <p className="text-sm text-[#47464F]">{course.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#47464F]">Level {course.level}</p>
                  <p className="text-xs text-[#47464F]">{course.credits} Credits</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-[#47464F] py-4">No courses assigned</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LecturerDashboard;