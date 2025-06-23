import React, { useState } from 'react';
import { useEvents, Event } from '../hooks/useEvents';
import Modal from './Modal';

const initialEvent: Omit<Event, 'id'> = {
  title: '',
  location: '',
  startDate: '',
  endDate: '',
  staffingNeeds: {},
};

const EventListSection: React.FC = () => {
  const { events, loading, error, addEvent, updateEvent, deleteEvent } = useEvents();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [form, setForm] = useState<Omit<Event, 'id'>>(initialEvent);
  const [searchTerm, setSearchTerm] = useState('');

  const openCreateModal = () => {
    setEditingEvent(null);
    setForm(initialEvent);
    setIsModalOpen(true);
  };

  const openEditModal = (event: Event) => {
    setEditingEvent(event);
    setForm({ ...event });
    setIsModalOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEvent) {
      await updateEvent(editingEvent.id, form);
    } else {
      await addEvent(form);
    }
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('정말로 이 공고를 삭제하시겠습니까?')) {
      await deleteEvent(id);
    }
  };

  // 반응형 테이블 및 검색/필터/지원자수 컬럼/버튼 UX 개선
  return (
    <div className="bg-white rounded-lg shadow-md p-4 overflow-x-auto">
      <div className="flex flex-col md:flex-row md:items-center gap-2 mb-4">
        <h2 className="text-xl font-bold flex-1">모집 공고 리스트</h2>
        <input
          type="text"
          placeholder="대회명, 장소 등 검색..."
          className="input-field w-full md:max-w-xs"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <button onClick={openCreateModal} className="btn btn-primary whitespace-nowrap">+ 공고 생성</button>
      </div>
      {loading ? (
        <div>로딩 중...</div>
      ) : error ? (
        <div className="text-red-500">오류: {error.message}</div>
      ) : (
        <table className="w-full min-w-[700px] table-auto text-sm">
          <thead className="bg-blue-100">
            <tr>
              <th className="px-4 py-2">대회명</th>
              <th className="px-4 py-2">장소</th>
              <th className="px-4 py-2">시작일</th>
              <th className="px-4 py-2">종료일</th>
              <th className="px-4 py-2">지원자 수</th>
              <th className="px-4 py-2">관리</th>
            </tr>
          </thead>
          <tbody>
            {events
              .filter(ev =>
                ev.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ev.location.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map(ev => (
                <tr key={ev.id} className="hover:bg-blue-50 transition">
                  <td className="px-4 py-2 font-semibold text-blue-900 whitespace-nowrap">{ev.title}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{ev.location}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{ev.startDate}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{ev.endDate}</td>
                  <td className="px-4 py-2 text-center font-bold text-blue-700">{/* 지원자 수 연동 예정 */}0</td>
                  <td className="px-4 py-2 flex gap-2 flex-wrap">
                    <button onClick={() => openEditModal(ev)} className="btn btn-secondary btn-xs">수정</button>
                    <button onClick={() => handleDelete(ev.id)} className="btn btn-danger btn-xs">삭제</button>
                    <button className="btn btn-info btn-xs">지원 현황</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingEvent ? '공고 수정' : '공고 생성'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">대회명</label>
            <input name="title" value={form.title} onChange={handleChange} className="input-field w-full" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">장소</label>
            <input name="location" value={form.location} onChange={handleChange} className="input-field w-full" required />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">시작일</label>
              <input name="startDate" type="date" value={form.startDate} onChange={handleChange} className="input-field w-full" required />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">종료일</label>
              <input name="endDate" type="date" value={form.endDate} onChange={handleChange} className="input-field w-full" required />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">취소</button>
            <button type="submit" className="btn btn-primary">{editingEvent ? '수정' : '생성'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EventListSection;
