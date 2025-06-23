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

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">모집 공고 리스트</h2>
        <button onClick={openCreateModal} className="btn btn-primary">+ 공고 생성</button>
      </div>
      {loading ? (
        <div>로딩 중...</div>
      ) : error ? (
        <div className="text-red-500">오류: {error.message}</div>
      ) : (
        <table className="w-full table-auto">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2">대회명</th>
              <th className="px-4 py-2">장소</th>
              <th className="px-4 py-2">시작일</th>
              <th className="px-4 py-2">종료일</th>
              <th className="px-4 py-2">관리</th>
            </tr>
          </thead>
          <tbody>
            {events.map(ev => (
              <tr key={ev.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{ev.title}</td>
                <td className="px-4 py-2">{ev.location}</td>
                <td className="px-4 py-2">{ev.startDate}</td>
                <td className="px-4 py-2">{ev.endDate}</td>
                <td className="px-4 py-2">
                  <button onClick={() => openEditModal(ev)} className="btn btn-secondary btn-xs mr-2">수정</button>
                  <button onClick={() => handleDelete(ev.id)} className="btn btn-danger btn-xs">삭제</button>
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
