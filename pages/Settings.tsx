import React, { useState, useEffect, useCallback } from 'react';
import { db, storage } from '../lib/supabaseClient'; // Path kept for simplicity, points to Firebase
import { collection, getDocs, doc, setDoc, query, where } from 'firestore';
import { ref, listAll, getDownloadURL, uploadString } from 'storage';
import { 
    TV_PREFIX,
    ORG_UUID,
    EVENT_CODE,
    EVENT_DATES,
    WHATSAPP,
    BUILDERBOT_ID
} from '../lib/config';
import type { TVItem } from '../lib/tv';
import Card from '../components/Card';
import { RefreshCw, Save, GripVertical, LoaderCircle } from 'lucide-react';

interface MessageTemplate {
    id?: string;
    channel: string;
    template: string;
}

const LEAD_ROLES = ['Guia', 'Agencia', 'Hotel', 'Mayorista', 'Transportista', 'Otro'];

const Settings: React.FC = () => {
    const [playlistItems, setPlaylistItems] = useState<TVItem[]>([]);
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

    const appConfig = {
        "Organization ID": ORG_UUID,
        "Event Code": EVENT_CODE,
        "Event Dates": EVENT_DATES,
        "Contact WhatsApp": WHATSAPP,
        "TV Media Folder": TV_PREFIX,
        "BuilderBot ID": BUILDERBOT_ID ? 'Configured' : 'Not Configured',
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch TV Playlist data from Firebase Storage
            const folderRef = ref(storage, TV_PREFIX);
            const res = await listAll(folderRef);
            
            const mediaFilesPromises = res.items.filter(item => item.name !== 'playlist.json').map(async (itemRef) => ({
                name: itemRef.name,
                url: await getDownloadURL(itemRef)
            }));
            const mediaFiles = await Promise.all(mediaFilesPromises);

            let existingPlaylist: TVItem[] = [];
            try {
                const playlistRef = ref(storage, `${TV_PREFIX}/playlist.json`);
                const playlistUrl = await getDownloadURL(playlistRef);
                const response = await fetch(playlistUrl);
                if (response.ok) {
                    existingPlaylist = (await response.json()).items || [];
                }
            } catch (e) { console.warn("Could not load playlist.json, starting fresh.", e); }
            
            const finalPlaylist: TVItem[] = mediaFiles.map((file): TVItem => {
                const existing = existingPlaylist.find(item => item.src.endsWith(file.name));
                if (existing) return { ...existing, src: file.url }; // Update with fresh URL
                
                const isVideo = /\.(mp4|webm|mov)$/i.test(file.name);
                return { 
                    src: file.url,
                    type: isVideo ? 'video' : 'image', 
                    overlay: '', 
                    qr: false, 
                    duration: isVideo ? undefined : 8000 
                };
            });
            setPlaylistItems(finalPlaylist);

            // Fetch Message Templates from Firestore
            const templatesRef = collection(db, 'message_templates');
            const q = query(templatesRef, where('org_id', '==', ORG_UUID), where('event_code', '==', EVENT_CODE));
            const querySnapshot = await getDocs(q);
            
            const templatesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MessageTemplate));
            const templatesMap = new Map(templatesData.map(t => [t.channel, t]));
            const initialTemplates = LEAD_ROLES.map(role => templatesMap.get(role) || { channel: role, template: '' });
            setTemplates(initialTemplates as MessageTemplate[]);

        } catch (err: any) {
            console.error("Error fetching settings data:", err);
            setError(err.message || "Failed to load data. Check permissions and collection/file structures.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSave = async (type: 'playlist' | 'templates') => {
        setSaving(true);
        setError(null);
        try {
            if (type === 'playlist') {
                // We need to save relative paths, not the full download URLs
                const playlistToSave = playlistItems.map(item => {
                    const url = new URL(item.src);
                    const path = decodeURIComponent(url.pathname).split('/').pop();
                    return { ...item, src: path };
                });
                const playlistObject = { items: playlistToSave };
                const playlistString = JSON.stringify(playlistObject, null, 2);
                const playlistRef = ref(storage, `${TV_PREFIX}/playlist.json`);
                await uploadString(playlistRef, playlistString, 'raw', { contentType: 'application/json' });

            } else if (type === 'templates') {
                const savePromises = templates.map(t => {
                    const docId = `${ORG_UUID}_${EVENT_CODE}_${t.channel}`;
                    const templateRef = doc(db, 'message_templates', docId);
                    return setDoc(templateRef, {
                        org_id: ORG_UUID,
                        event_code: EVENT_CODE,
                        channel: t.channel,
                        template: t.template,
                    });
                });
                await Promise.all(savePromises);
            }
            alert(`${type === 'playlist' ? 'Playlist' : 'Templates'} saved successfully!`);
        } catch (err: any) {
            console.error(`Error saving ${type}:`, err);
            setError(`Failed to save ${type}. Error: ${err.message}. Check Firebase security rules.`);
        } finally {
            setSaving(false);
        }
    };
    
    const handleDragStart = (index: number) => setDraggedItemIndex(index);

    const handleDrop = (targetIndex: number) => {
        if (draggedItemIndex === null || draggedItemIndex === targetIndex) return;
        const newItems = [...playlistItems];
        const [movedItem] = newItems.splice(draggedItemIndex, 1);
        newItems.splice(targetIndex, 0, movedItem);
        setPlaylistItems(newItems);
        setDraggedItemIndex(null);
    };

    const handleUpdateItem = (index: number, updatedProps: Partial<TVItem>) => {
        const newItems = [...playlistItems];
        newItems[index] = { ...newItems[index], ...updatedProps };
        setPlaylistItems(newItems);
    };

    const handleTemplateChange = (channel: string, value: string) => {
        setTemplates(prev => prev.map(t => t.channel === channel ? { ...t, template: value } : t));
    };

    return (
        <div className="mx-auto max-w-4xl space-y-8">
            <div className="text-center md:text-left">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Manage application settings and content.</p>
            </div>
            
            {error && <p className="text-center text-red-500 p-4 rounded-lg bg-red-50 dark:bg-red-900/20">{error}</p>}
            
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400">Plantillas de Mensajes de WhatsApp</h2>
                    <button onClick={() => handleSave('templates')} disabled={loading || saving} className="flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-500">
                        {saving ? <LoaderCircle className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />}
                        <span className="ml-2 hidden sm:inline">Guardar Plantillas</span>
                    </button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Personaliza el mensaje de WhatsApp para cada categoría. Usa <code className="bg-gray-200 dark:bg-gray-700 p-1 rounded text-xs">{'{nombre}'}</code> para insertar el nombre del lead.
                </p>
                {loading ? <p>Loading templates...</p> : (
                    <div className="space-y-4">
                        {templates.map(({ channel, template }) => (
                            <div key={channel}>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{channel}</label>
                                <textarea
                                    value={template}
                                    onChange={(e) => handleTemplateChange(channel, e.target.value)}
                                    className="input w-full min-h-[80px]"
                                    placeholder={`Escribe el mensaje para la categoría ${channel}...`}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400">TV Playlist Manager</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={fetchData} disabled={loading || saving} className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50">
                            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                         <button onClick={() => handleSave('playlist')} disabled={loading || saving || playlistItems.length === 0} className="flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-500">
                             {saving ? <LoaderCircle className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />}
                             <span className="ml-2 hidden sm:inline">Guardar Playlist</span>
                        </button>
                    </div>
                </div>
                 {loading ? <p>Loading playlist...</p> : (
                     <div className="space-y-3">
                        {playlistItems.length > 0 ? playlistItems.map((item, index) => (
                             <div 
                                key={`${item.src}-${index}`} 
                                className={`grid grid-cols-12 gap-3 items-center bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700 transition-opacity ${draggedItemIndex === index ? 'opacity-50' : ''}`}
                                draggable onDragStart={() => handleDragStart(index)} onDragEnter={(e) => { e.preventDefault(); if (draggedItemIndex !== null) handleDrop(index); }}
                                onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop(index)} onDragEnd={() => setDraggedItemIndex(null)}
                             >
                                <div className="col-span-1 flex justify-center items-center cursor-move text-gray-400 hover:text-gray-600" title="Drag to reorder"><GripVertical /></div>
                                <div className="col-span-11 md:col-span-4"><p className="font-semibold text-sm truncate text-gray-800 dark:text-gray-200" title={item.src}>{item.src.split('/').pop().split('?')[0]}</p><p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{item.type}</p></div>
                                <div className="col-span-12 md:col-span-5"><input type="text" placeholder="Overlay text..." value={item.overlay || ''} onChange={(e) => handleUpdateItem(index, { overlay: e.target.value })} className="input text-sm py-1"/></div>
                                <div className="col-span-12 md:col-span-2 flex items-center justify-start md:justify-center gap-2">
                                     <label htmlFor={`qr-${index}`} className="flex items-center cursor-pointer text-sm text-gray-600 dark:text-gray-300">
                                        <input type="checkbox" id={`qr-${index}`} checked={!!item.qr} onChange={(e) => handleUpdateItem(index, { qr: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                                        <span className="ml-2">QR</span>
                                    </label>
                                </div>
                             </div>
                        )) : <p className="text-center text-gray-500 py-8">No media files found in your Storage folder: '{TV_PREFIX}'.</p>}
                     </div>
                 )}
            </Card>
            
            <Card>
                <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4">Application Configuration</h2>
                <div className="space-y-2">
                    {Object.entries(appConfig).map(([key, value]) => (
                        <div key={key} className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md border">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{key}</span>
                            <span className="text-gray-800 dark:text-gray-200 font-mono bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded mt-1 sm:mt-0 max-w-full truncate">{String(value)}</span>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
};

export default Settings;