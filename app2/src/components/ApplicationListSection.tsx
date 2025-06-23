import React from 'react';
// TODO: useStaffApplications 훅 import 및 지원자 리스트/상세/승인/거절/배정 UI 구현 예정

const ApplicationListSection: React.FC<{ eventId: string }> = ({ eventId }) => {
  // 지원자 데이터 연동 및 UI 구현 예정
  return (
    <div className="p-4">
      <h3 className="text-lg font-bold mb-2">지원자 현황 (eventId: {eventId})</h3>
      {/* 지원자 리스트, 승인/거절/배정 UI 등 구현 예정 */}
      <div className="text-gray-500">지원자 데이터 연동 및 UI 구현 예정</div>
    </div>
  );
};

export default ApplicationListSection;
