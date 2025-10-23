import React, { useEffect, useState } from 'react';
import { loadMaterials, Material, deleteMaterial } from '../lib/materials';
import Card from '../components/Card';
import { Trash2, Link as LinkIcon, FileText, Image as ImageIcon, LoaderCircle } from 'lucide-react';
import { ORG_UUID } from '../lib/config';

const Materials: React.FC = () => {
  const [items, setItems] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMaterials = async () => {
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
    };
    fetchMaterials();
  }, []);

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

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Marketing Materials</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Manage shared assets for your sales team.</p>
        </div>
      
      <Card>
          {loading && <div className="text-center p-8"><LoaderCircle className="animate-spin inline-block mr-2" /> Loading Materials...</div>}
          {error && <div className="text-center p-4 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300">{error}</div>}
          
          {!loading && !error && (
              <>
                {items.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">No materials found. Add them directly in Firestore at <code className="text-xs bg-gray-100 dark:bg-gray-800 p-1 rounded">/orgs/{ORG_UUID}/materials</code>.</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {items.map(m => (
                        <div key={m.id} className="p-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-4 min-w-0">
                            {iconFor(m.type)}
                            <div className="min-w-0">
                                <div className="font-medium truncate text-gray-800 dark:text-gray-200">{m.name}</div>
                                <a href={m.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline break-all">{m.url}</a>
                            </div>
                            </div>
                            <button onClick={()=>handleDelete(m.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 focus:outline-none focus:ring-2 focus:ring-red-400" title="Delete Material">
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

// FIX: Add default export to the Materials component to resolve the import error in App.tsx.
export default Materials;
