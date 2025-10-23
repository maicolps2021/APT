import React, { useEffect, useState, useCallback } from 'react';
import { loadMaterials, Material, deleteMaterial } from '../lib/materials';
import Card from '../components/Card';
import { Trash2, Link as LinkIcon, FileText, Image as ImageIcon, LoaderCircle } from 'lucide-react';
import { ORG_UUID } from '../lib/config';
import MaterialUploader from '../components/MaterialUploader';

const Materials: React.FC = () => {
  const [items, setItems] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMaterials = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await loadMaterials(ORG_UUID);
        setItems(rows);
      } catch(err) {
        console.error(err);
        setError("Could not load materials.");
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const onMaterialUploaded = (newMaterial: Material) => {
    // Optimistic update: add new material to the top of the list
    setItems(currentItems => [newMaterial, ...currentItems]);
  };

  function iconFor(t?: string) {
    const k = (t||'').toLowerCase();
    if (k.includes('pdf') || k==='pdf') return <FileText className="w-5 h-5 text-gray-500" />;
    if (k.includes('image') || k==='image') return <ImageIcon className="w-5 h-5 text-gray-500" />;
    return <LinkIcon className="w-5 h-5 text-gray-500" />;
  }

  async function handleDelete(id: string) {
    if (!window.confirm('¿Eliminar este material permanentemente?')) return;
    try {
        await deleteMaterial(ORG_UUID, id);
        setItems((s)=>s.filter(i=>i.id!==id));
    } catch(err) {
        console.error(err);
        alert("Failed to delete material.");
    }
  }
  
  const renderSize = (sizeInBytes?: number) => {
    if (typeof sizeInBytes !== 'number') return null;
    if (sizeInBytes < 1024 * 1024) {
        return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    }
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Marketing Materials</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Manage shared assets for your sales team.</p>
        </div>
      
      <MaterialUploader orgId={ORG_UUID} onUploaded={onMaterialUploaded} />
      
      <Card>
          <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4">Uploaded Assets</h2>
          {loading && <div className="text-center p-8"><LoaderCircle className="animate-spin inline-block mr-2" /> Loading Materials...</div>}
          {error && <div className="text-center p-4 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300">{error}</div>}
          
          {!loading && !error && (
              <>
                {items.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">No materials found. Upload one above to get started.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {items.map(m => (
                        <div key={m.id} className="p-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-4 min-w-0">
                                {iconFor(m.type)}
                                <div className="min-w-0">
                                    <div className="font-medium truncate text-gray-800 dark:text-gray-200" title={m.name}>{m.name}</div>
                                    <a href={m.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline break-all" title={m.url}>{m.url}</a>
                                    <div className="text-xs text-gray-400 mt-1">{renderSize(m.size)}</div>
                                </div>
                            </div>
                            <button onClick={()=>handleDelete(m.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 flex-shrink-0" title="Delete Material">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        ))}
                    </div>
                )}
              </>
          )}
      </Card>
    </div>
  );
};

export default Materials;