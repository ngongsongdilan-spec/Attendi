import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Plus, X, Users, Trash2, Edit2 } from 'lucide-react';
import GroupForm from './GroupForm';

const GroupList = () => {
  const { groups, deleteGroup } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#191C1D]">Groups</h2>
          <p className="text-[#47464F]">Manage project groups</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#3B82F6] text-white rounded-lg font-medium hover:bg-[#3B82F6]/90 transition-colors"
        >
          <Plus size={18} />
          Create Group
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group) => (
          <div key={group.id} className="bg-white rounded-lg shadow-sm border border-[#C8C5D0] p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-[#3B82F6]/10 rounded-lg">
                    <Users size={20} className="text-[#3B82F6]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#191C1D]">{group.name}</h3>
                </div>
                <p className="text-sm text-[#47464F]">Project: {group.project}</p>
                <p className="text-sm text-[#47464F]">Lead: {group.lead}</p>
                <p className="text-sm text-[#47464F]">Members: {group.members}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingGroup(group);
                    setShowForm(true);
                  }}
                  className="p-1.5 hover:bg-[#EDEEEF] rounded-lg transition-colors"
                >
                  <Edit2 size={16} className="text-[#3B82F6]" />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Delete this group?')) {
                      deleteGroup(group.id);
                    }
                  }}
                  className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} className="text-red-500" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {groups.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-[#C8C5D0]">
          <Users size={48} className="mx-auto text-[#47464F] opacity-50" />
          <p className="text-[#47464F] mt-4">No groups yet. Create your first group!</p>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b border-[#C8C5D0]">
              <h3 className="text-xl font-bold text-[#191C1D]">
                {editingGroup ? 'Edit Group' : 'Create New Group'}
              </h3>
              <button 
                onClick={() => {
                  setShowForm(false);
                  setEditingGroup(null);
                }} 
                className="p-1 hover:bg-[#EDEEEF] rounded-lg transition-colors"
              >
                <X size={24} className="text-[#47464F]" />
              </button>
            </div>
            <div className="p-6">
              <GroupForm 
                group={editingGroup}
                onClose={() => {
                  setShowForm(false);
                  setEditingGroup(null);
                }}
                onSuccess={() => {
                  setShowForm(false);
                  setEditingGroup(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupList;