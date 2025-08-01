import React, { useMemo, useState, useEffect } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  getDay,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { 
  ScheduleEvent, 
  CalendarView, 
  SCHEDULE_COLORS,
  EventColorConfig 
} from '../../types/schedule';
import { Timestamp } from 'firebase/firestore';

interface LightweightCalendarProps {
  schedules: ScheduleEvent[];
  currentView: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onEventClick: (event: ScheduleEvent) => void;
  onDateClick?: (date: string) => void;
}

const LightweightCalendar: React.FC<LightweightCalendarProps> = ({
  schedules,
  currentView,
  onViewChange,
  onEventClick,
  onDateClick
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedView, setSelectedView] = useState<CalendarView>(currentView);

  // 현재 월의 날짜 배열 생성 (이전/다음 달 날짜 포함)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // 일요일 시작
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  // 날짜별 이벤트 그룹화
  const eventsByDate = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>();
    
    schedules.forEach(schedule => {
      const dateKey = schedule.date; // YYYY-MM-DD 형식
      const events = map.get(dateKey) || [];
      events.push(schedule);
      map.set(dateKey, events);
    });
    
    return map;
  }, [schedules]);

  // 이전/다음 월 이동
  const handlePrevMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1));
  };

  // 오늘 날짜로 이동
  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // 날짜 클릭 핸들러
  const handleDateCellClick = (date: Date) => {
    if (onDateClick) {
      onDateClick(format(date, 'yyyy-MM-dd'));
    }
  };

  // 이벤트 클릭 핸들러
  const handleEventItemClick = (event: ScheduleEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    onEventClick(event);
  };

  // 시간 포맷팅 함수
  const formatEventTime = (event: ScheduleEvent): string => {
    if (event.startTime && event.startTime instanceof Timestamp) {
      const date = event.startTime.toDate();
      return format(date, 'HH:mm');
    }
    return '미정';
  };

  // 월 뷰 렌더링
  const renderMonthView = () => {
    return (
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {/* 요일 헤더 */}
        {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
          <div 
            key={day} 
            className={`
              bg-gray-50 py-2 text-center text-sm font-medium
              ${idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-gray-700'}
            `}
          >
            {day}
          </div>
        ))}
        
        {/* 날짜 셀 */}
        {calendarDays.map((day, idx) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDate.get(dateKey) || [];
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isSelectedDay = isToday(day);
          const dayOfWeek = getDay(day);
          
          return (
            <div
              key={idx}
              onClick={() => handleDateCellClick(day)}
              className={`
                bg-white p-2 min-h-[100px] cursor-pointer
                hover:bg-gray-50 transition-colors
                ${!isCurrentMonth ? 'opacity-40' : ''}
                ${isSelectedDay ? 'bg-blue-50' : ''}
              `}
            >
              <div className={`
                text-sm font-semibold mb-1
                ${dayOfWeek === 0 ? 'text-red-500' : dayOfWeek === 6 ? 'text-blue-500' : ''}
                ${isSelectedDay ? 'text-white bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center' : ''}
              `}>
                {format(day, 'd')}
              </div>
              
              {/* 이벤트 목록 */}
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event, eventIdx) => {
                  const colors = SCHEDULE_COLORS[event.type];
                  return (
                    <div
                      key={event.id}
                      onClick={(e) => handleEventItemClick(event, e)}
                      className="text-xs p-1 rounded cursor-pointer hover:opacity-80 truncate"
                      style={{
                        backgroundColor: colors.backgroundColor,
                        borderLeft: `3px solid ${colors.borderColor}`,
                        color: colors.textColor
                      }}
                      title={`${formatEventTime(event)} ${event.eventName}`}
                    >
                      <span className="font-medium">{formatEventTime(event)}</span>
                      <span className="ml-1">{event.eventName}</span>
                    </div>
                  );
                })}
                
                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-500 text-center">
                    +{dayEvents.length - 3} 더보기
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // 주 뷰 렌더링 (간단한 구현)
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    
    return (
      <div className="text-center py-20 text-gray-500">
        주간 뷰는 준비 중입니다.
      </div>
    );
  };

  // 일 뷰 렌더링 (간단한 구현)
  const renderDayView = () => {
    return (
      <div className="text-center py-20 text-gray-500">
        일간 뷰는 준비 중입니다.
      </div>
    );
  };

  // 뷰에 따른 렌더링
  const renderCalendarContent = () => {
    switch (selectedView) {
      case 'timeGridWeek':
        return renderWeekView();
      case 'timeGridDay':
        return renderDayView();
      case 'dayGridMonth':
      default:
        return renderMonthView();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* 캘린더 헤더 */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-4">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
          <button
            onClick={handleToday}
            className="px-3 py-1 text-sm font-medium hover:bg-gray-100 rounded-lg transition-colors"
          >
            오늘
          </button>
        </div>
        
        <h2 className="text-xl font-bold">
          {format(currentDate, 'yyyy년 M월', { locale: ko })}
        </h2>
        
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setSelectedView('dayGridMonth');
              onViewChange('dayGridMonth');
            }}
            className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
              selectedView === 'dayGridMonth' 
                ? 'bg-blue-600 text-white' 
                : 'hover:bg-gray-100'
            }`}
          >
            월
          </button>
          <button
            onClick={() => {
              setSelectedView('timeGridWeek');
              onViewChange('timeGridWeek');
            }}
            className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
              selectedView === 'timeGridWeek' 
                ? 'bg-blue-600 text-white' 
                : 'hover:bg-gray-100'
            }`}
          >
            주
          </button>
          <button
            onClick={() => {
              setSelectedView('timeGridDay');
              onViewChange('timeGridDay');
            }}
            className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
              selectedView === 'timeGridDay' 
                ? 'bg-blue-600 text-white' 
                : 'hover:bg-gray-100'
            }`}
          >
            일
          </button>
        </div>
      </div>
      
      {/* 캘린더 콘텐츠 */}
      <div className="p-4">
        {renderCalendarContent()}
      </div>
      
      {/* 범례 */}
      <div className="p-4 border-t">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded" 
              style={{ 
                backgroundColor: SCHEDULE_COLORS.applied.backgroundColor, 
                border: `1px solid ${SCHEDULE_COLORS.applied.borderColor}` 
              }}
            />
            <span>지원중</span>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded" 
              style={{ 
                backgroundColor: SCHEDULE_COLORS.confirmed.backgroundColor, 
                border: `1px solid ${SCHEDULE_COLORS.confirmed.borderColor}` 
              }}
            />
            <span>확정</span>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded" 
              style={{ 
                backgroundColor: SCHEDULE_COLORS.completed.backgroundColor, 
                border: `1px solid ${SCHEDULE_COLORS.completed.borderColor}` 
              }}
            />
            <span>완료</span>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded" 
              style={{ 
                backgroundColor: SCHEDULE_COLORS.cancelled.backgroundColor, 
                border: `1px solid ${SCHEDULE_COLORS.cancelled.borderColor}` 
              }}
            />
            <span>취소</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LightweightCalendar;