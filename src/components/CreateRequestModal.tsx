import React from 'react';
import TaskRequestModal from './TaskRequestModal';

interface CreateRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  userName?: string;
  initialService?: string;
}

export default function CreateRequestModal({ isOpen, onClose, initialService }: CreateRequestModalProps) {
  if (!isOpen) return null;
  return <TaskRequestModal onClose={onClose} initialService={initialService} />;
}
