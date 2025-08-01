import React from 'react';
import { useDateUtils } from '../../hooks/useDateUtils';
import { 
  getStatusDisplayName, 
  getTypeDisplayName, 
  generateTimeSlotSummary,
  calculateTotalPositions,
  calculateTotalPositionsFromDateRequirements 
} from '../../utils/jobPosting/jobPostingHelpers';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../common/Button';
import LoadingSpinner from '../LoadingSpinner';
import { JobPostingUtils } from '../../types/jobPosting';
import { timestampToLocalDateString } from '../../utils/dateUtils';

interface JobPostingListProps {
  jobPostings: any[];
  loading: boolean;
  onEdit: (post: any) => void;
  onDelete: (postId: string, title: string) => Promise<boolean>;
  onNavigateToDetail: (postId: string) => void;
  isDeleting?: string | null;
}

const JobPostingList: React.FC<JobPostingListProps> = ({
  jobPostings,
  loading,
  onEdit,
  onDelete,
  onNavigateToDetail,
  isDeleting = null
}) => {
  const { formatDateDisplay } = useDateUtils();
  const { currentUser } = useAuth();

  const handleDelete = async (postId: string, title: string) => {
    try {
      await onDelete(postId, title);
    } catch (error) {
      alert(error instanceof Error ? error.message : '공고 삭제 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-8">
          <LoadingSpinner />
          <p className="text-gray-500 mt-2">공고 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (jobPostings.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-2">📋</div>
          <p className="text-gray-500">등록된 공고가 없습니다.</p>
          <p className="text-sm text-gray-400 mt-1">새 공고를 작성해보세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">등록된 공고 ({jobPostings.length}개)</h2>
      </div>

      <div className="divide-y divide-gray-200">
        {jobPostings.map((post) => {
          const totalPositions = post.usesDifferentDailyRequirements
            ? calculateTotalPositionsFromDateRequirements(post.dateSpecificRequirements || [])
            : calculateTotalPositions(post.timeSlots || []);

          // 전체 진행률 계산
          const progressMap = JobPostingUtils.getRequirementProgress(post);
          let totalConfirmed = 0;
          let totalRequired = 0;
          
          progressMap.forEach(progress => {
            totalConfirmed += progress.confirmed;
            totalRequired += progress.required;
          });

          return (
            <div key={post.id} className="p-6 hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  {/* 제목과 상태 */}
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {post.title}
                    </h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      post.status === 'open' 
                        ? 'bg-green-100 text-green-800'
                        : post.status === 'closed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {getStatusDisplayName(post.status)}
                    </span>
                  </div>

                  {/* 기본 정보 */}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                    <span className="flex items-center">
                      📍 {post.location}
                      {post.detailedAddress && ` (${post.detailedAddress})`}
                    </span>
                    <span className="flex items-center">
                      📋 {getTypeDisplayName(post.type)}
                    </span>
                    <span className="flex items-center">
                      👥 총 {totalPositions}명 모집 {totalConfirmed > 0 && `(${totalConfirmed}명 확정)`}
                    </span>
                  </div>

                  {/* 날짜 */}
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                    <span>
                      📅 {formatDateDisplay(post.startDate)} ~ {formatDateDisplay(post.endDate)}
                    </span>
                  </div>

                  {/* 시간대 정보 */}
                  <div className="text-sm text-gray-600 mb-3">
                    {post.usesDifferentDailyRequirements ? (
                      <div>
                        <span className="font-medium">일자별 요구사항:</span>
                        <div className="mt-1 space-y-1">
                          {(post.dateSpecificRequirements || []).slice(0, 2).map((req: any, index: number) => (
                            <div key={index} className="ml-2">
                              <div className="font-medium">• {formatDateDisplay(req.date)}:</div>
                              {req.timeSlots.map((ts: any, tsIndex: number) => (
                                <div key={tsIndex} className="ml-4 text-xs">
                                  {ts.time} - {ts.roles.map((role: any, roleIndex: number) => {
                                    // Firebase Timestamp를 문자열로 변환
                                    const dateString = timestampToLocalDateString(req.date);
                                    
                                    const confirmedCount = JobPostingUtils.getConfirmedStaffCount(
                                      post,
                                      dateString,
                                      ts.time,
                                      role.name
                                    );
                                    return (
                                      <span key={roleIndex}>
                                        {roleIndex > 0 && ", "}
                                        {role.name}: {role.count}명 ({confirmedCount}/{role.count})
                                      </span>
                                    );
                                  })}
                                </div>
                              ))}
                            </div>
                          ))}
                          {(post.dateSpecificRequirements || []).length > 2 && (
                            <div className="ml-2 text-gray-400">
                              ... 외 {(post.dateSpecificRequirements || []).length - 2}개 날짜
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span className="font-medium">시간대:</span>
                        <div className="mt-1 space-y-1">
                          {(post.timeSlots || []).slice(0, 2).map((timeSlot: any, index: number) => (
                            <div key={index} className="ml-2">
                              • {generateTimeSlotSummary(timeSlot)}
                            </div>
                          ))}
                          {(post.timeSlots || []).length > 2 && (
                            <div className="ml-2 text-gray-400">
                              ... 외 {(post.timeSlots || []).length - 2}개 시간대
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 지원자 수 */}
                  {post.applicants && post.applicants.length > 0 && (
                    <div className="text-sm text-blue-600">
                      🙋‍♂️ {post.applicants.length}명 지원
                    </div>
                  )}
                </div>

                {/* 액션 버튼들 */}
                <div className="flex flex-col space-y-2 ml-4">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onNavigateToDetail(post.id)}
                  >
                    상세관리
                  </Button>
                  {currentUser?.uid === post.createdBy && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onEdit(post)}
                      >
                        수정
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(post.id, post.title)}
                        loading={isDeleting === post.id}
                        disabled={isDeleting === post.id}
                      >
                        {isDeleting === post.id ? '삭제 중...' : '삭제'}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* 설명 */}
              {post.description && (
                <div className="mt-3 text-sm text-gray-600 line-clamp-2">
                  {post.description}
                </div>
              )}

              {/* 생성/수정 정보 */}
              <div className="mt-3 text-xs text-gray-400 flex justify-between">
                <span>생성: {formatDateDisplay(post.createdAt)}</span>
                {post.updatedAt && (
                  <span>수정: {formatDateDisplay(post.updatedAt)}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default JobPostingList;