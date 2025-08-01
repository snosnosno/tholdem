import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useJobPostingOperations } from '../hooks/useJobPostingOperations';
import { usePermissions } from '../hooks/usePermissions';
import Button from '../components/common/Button';
import JobPostingForm from '../components/jobPosting/JobPostingForm';
import JobPostingList from '../components/jobPosting/JobPostingList';
import EditJobPostingModal from '../components/jobPosting/modals/EditJobPostingModal';

const JobPostingAdminPage = () => {
  const { t } = useTranslation();
  const { canCreateJobPostings } = usePermissions();
  const [isCreateFormVisible, setIsCreateFormVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const {
    jobPostings,
    loading,
    isEditModalOpen,
    currentPost,
    handleCreateJobPosting,
    handleUpdateJobPosting,
    handleDeleteJobPosting,
    handleNavigateToDetail,
    openEditModal,
    closeEditModal,
    setCurrentPost,
  } = useJobPostingOperations();

  // 공고 생성 핸들러
  const handleCreate = async (formData: any) => {
    try {
      const postId = await handleCreateJobPosting(formData);
      alert('공고가 성공적으로 등록되었습니다.');
      setIsCreateFormVisible(false);
      // 생성 후 상세 페이지로 이동할 수도 있음
      // handleNavigateToDetail(postId);
    } catch (error) {
      alert(error instanceof Error ? error.message : '공고 등록 중 오류가 발생했습니다.');
      throw error; // JobPostingForm에서 로딩 상태 해제를 위해
    }
  };

  // 공고 수정 핸들러
  const handleUpdate = async (postId: string, formData: any) => {
    try {
      await handleUpdateJobPosting(postId, formData);
      alert('공고가 성공적으로 수정되었습니다.');
    } catch (error) {
      alert(error instanceof Error ? error.message : '공고 수정 중 오류가 발생했습니다.');
      throw error;
    }
  };

  // 공고 삭제 핸들러
  const handleDelete = async (postId: string, title: string) => {
    setIsDeleting(postId);
    try {
      const success = await handleDeleteJobPosting(postId, title);
      if (success) {
        alert('공고가 성공적으로 삭제되었습니다.');
      }
      return success;
    } catch (error) {
      alert(error instanceof Error ? error.message : '공고 삭제 중 오류가 발생했습니다.');
      throw error;
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">구인공고 관리</h1>
              <p className="mt-2 text-gray-600">토너먼트 구인공고를 등록하고 관리하세요.</p>
            </div>
            
            {canCreateJobPostings && (
              <Button
                variant="primary"
                onClick={() => setIsCreateFormVisible(!isCreateFormVisible)}
              >
                {isCreateFormVisible ? '목록 보기' : '새 공고 작성'}
              </Button>
            )}
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="space-y-8">
          {isCreateFormVisible ? (
            <JobPostingForm
              onSubmit={handleCreate}
            />
          ) : (
            <JobPostingList
              jobPostings={jobPostings}
              loading={loading}
              onEdit={openEditModal}
              onDelete={handleDelete}
              onNavigateToDetail={handleNavigateToDetail}
              isDeleting={isDeleting}
            />
          )}
        </div>

        {/* 수정 모달 */}
        <EditJobPostingModal
          isOpen={isEditModalOpen}
          onClose={closeEditModal}
          currentPost={currentPost}
          onUpdate={handleUpdate}
        />
      </div>
    </div>
  );
};

export default JobPostingAdminPage;