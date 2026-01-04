
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-end md:items-center sm:p-4">
      <div className="bg-white w-full md:rounded-lg rounded-t-2xl shadow-xl md:max-w-lg max-h-[90vh] flex flex-col animate-slideUp md:animate-none">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg md:text-xl font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 bg-gray-100 rounded-full p-1 w-8 h-8 flex items-center justify-center">&times;</button>
        </div>
        <div className="p-4 md:p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
