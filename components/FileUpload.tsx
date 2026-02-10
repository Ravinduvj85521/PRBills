import React, { useCallback, useRef } from 'react';
import { Upload } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isProcessing }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isProcessing) return;
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [isProcessing, onFileSelect]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div 
      onClick={() => fileInputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="group cursor-pointer flex flex-col items-center justify-center w-full h-56 border-2 border-dashed border-slate-200 rounded-2xl hover:border-slate-400 hover:bg-slate-50 transition-all duration-200"
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={(e) => e.target.files && e.target.files[0] && onFileSelect(e.target.files[0])} 
        className="hidden" 
        accept=".pdf,image/*"
        disabled={isProcessing}
      />
      
      <div className="p-4 rounded-full bg-slate-50 group-hover:bg-white group-hover:shadow-sm transition-all mb-4">
        <Upload className="w-6 h-6 text-slate-400 group-hover:text-slate-600" />
      </div>
      
      <p className="font-medium text-slate-700">Upload Bill</p>
      <p className="text-sm text-slate-400 mt-1">PDF or Image</p>
    </div>
  );
};