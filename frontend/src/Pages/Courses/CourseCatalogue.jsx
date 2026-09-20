import React from 'react';
import { BookOpen } from 'lucide-react';

const CourseCatalogue = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-2xl font-bold text-[#191C1D]">Course Catalogue</h2>
      <p className="text-[#47464F]">Browse all available courses</p>
    </div>
    <div className="bg-white rounded-xl shadow-sm border border-[#C8C5D0] p-8 text-center">
      <BookOpen size={48} className="mx-auto text-[#47464F] opacity-50" />
      <p className="text-[#47464F] mt-4">Course catalogue will be available once the Academic module is connected to the backend.</p>
    </div>
  </div>
);

export default CourseCatalogue;
