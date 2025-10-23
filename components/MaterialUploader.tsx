import React, { useCallback, useRef, useState } from 'react';
import { uploadMaterial, Material } from '../lib/materials';
import { Upload, CheckCircle2, XCircle, LoaderCircle } from 'lucide-react';

interface MaterialUploaderProps {
  orgId: string;
  onUploaded: (m: Material) => void;
}

const MaterialUploader: React.FC<MaterialUploaderProps> = ({ orgId, onUploaded }) => {
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<'idle'|'uploading'|'done'|'error'>('idle');
  const [error, setError] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const inputRef = useRef<HTMLInputElement|null>(null);

  const maxSize = 50 * 1024 * 1024; // 50MB
  const accept = [
    'application/pdf',
    'image/*',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ].join(',');

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || !files.length || status === 'uploading') return;
    const f = files[0];
    setError('');
    
    if (f.size > maxSize) {
      setError('File too large (max 50MB)');
      setStatus('error');
      return;
    }

    setFileName(f.name);
    setStatus('uploading');
    setProgress(0);
    
    try {
      const mat = await uploadMaterial(orgId, f, { onProgress: setProgress });
      setStatus('done');
      onUploaded(mat);
      setTimeout(() => {
        setStatus('idle');
        setProgress(0);
        setFileName('');
      }, 2000);
    } catch (e:any) {
      console.error(e);
      setError(e?.message || 'Upload failed');
      setStatus('error');
    }
  }, [orgId, onUploaded, status, maxSize]);

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (status !== 'uploading') setDragging(true);
  };

  const onDragLeave = () => setDragging(false);

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (status !== 'uploading') handleFiles(e.dataTransfer.files);
  };
  
  const renderStatus = () => {
    switch(status) {
        case 'uploading':
            return (
                <div className="w-full max-w-sm mt-3">
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 truncate" title={fileName}>{fileName}</div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                    <div className="h-2 bg-blue-600 rounded-full transition-width duration-300" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="text-xs mt-1 text-gray-500 dark:text-gray-400">{progress}%</div>
                </div>
            );
        case 'done':
            return <div className="flex items-center gap-2 text-green-600 mt-2 text-sm font-medium"><CheckCircle2 className="w-4 h-4" /> Uploaded successfully!</div>;
        case 'error':
             return <div className="flex items-center gap-2 text-red-600 mt-2 text-sm font-medium"><XCircle className="w-4 h-4" /> {error}</div>;
        default:
            return (
                <>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Drag & drop a file here, or</div>
                    <button
                        type="button"
                        className="mt-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
                        onClick={()=>inputRef.current?.click()}
                    >
                    Choose file
                    </button>
                </>
            );
    }
  }

  return (
    <div
      className={`relative rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-300
        ${dragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-700'}
        ${status === 'uploading' ? 'cursor-wait' : 'cursor-pointer'}
      `}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => status !== 'uploading' && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e)=>handleFiles(e.target.files)}
        disabled={status === 'uploading'}
      />
      <div className="flex flex-col items-center gap-2">
        {status === 'idle' && <Upload className="w-8 h-8 text-gray-400 dark:text-gray-500" />}
        {status === 'uploading' && <LoaderCircle className="w-8 h-8 text-blue-500 animate-spin" />}
        
        {renderStatus()}
        
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-2">Max 50MB. Accepted: PDF, images, Office docs.</div>
      </div>
    </div>
  );
};

export default MaterialUploader;