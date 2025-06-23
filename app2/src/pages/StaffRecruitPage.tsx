import { useStaffApplications } from '../hooks/useStaffApplications';
import { useStaff } from '../hooks/useStaff';
// ... 기존 import 유지
import StaffApplicationsSection from '../components/StaffApplicationsSection';
import Modal from '../components/Modal';
// 이벤트(모집 공고) 상태 및 모달 상태 관리
const { events, loading, error, addEvent, updateEvent, deleteEvent } = useEvents();
const [isModalOpen, setIsModalOpen] = useState(false);
const [editingEvent, setEditingEvent] = useState(null);


const StaffRecruitPage: React.FC = () => {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">스태프 모집 공고/지원/선발</h1>
      {/* 이벤트(모집 공고) 리스트 */}
      <EventListSection />
      {/* 지원자 현황/선발/배정 섹션 */}
      <StaffApplicationsSection />
      
    </div>
  );
};

export default StaffRecruitPage;
