
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
    TV_BUCKET, 
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

const Settings: React.FC = () => {
    const [playlistItems, setPlaylistItems] = useState<TVItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

    const appConfig = {
        "Organization ID": ORG_UUID,
        "Event Code": EVENT_CODE,
        "Event Dates": EVENT_DATES,
        "Contact WhatsApp": WHATSAPP,
        "TV Storage Bucket": TV_BUCKET,
        "TV Media Folder": TV_PREFIX,
        "BuilderBot ID": BUILDERBOT_ID ? 'Configured' : 'Not Configured',
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: fileList, error: listError } = await supabase.storage
                .from(TV_BUCKET)
                .list(TV_PREFIX, { limit: 100, sortBy: { column: 'name', order: 'asc' } });
            
            if (listError) throw listError;
            
            const mediaFiles = fileList.filter(file => file.name !== 'playlist.json');

            let existingPlaylist: TVItem[] = [];
            try {
                const { data: playlistBlob, error: downloadError } = await supabase.storage
                    .from(TV_BUCKET)
                    .download(`${TV_PREFIX}/playlist.json`);
                if (downloadError) {
                    console.warn("playlist.json not found, will create a new one.");
                } else if (playlistBlob) {
                    const playlistJson = await playlistBlob.text();
                    existingPlaylist = JSON.parse(playlistJson).items || [];
                }
            } catch (e) {
                console.warn("Could not parse playlist.json, starting fresh.", e);
            }

            const existingPlaylistMap = new Map(existingPlaylist.map(item => [item.src.split('/').pop(), item]));
            const finalPlaylist: TVItem[] = [];
            const processedFiles = new Set<string>();

            existingPlaylist.forEach(item => {
                const fileName = item.src.split('/').pop();
                if (fileName && mediaFiles.some(f => f.name === fileName)) {
                    finalPlaylist.push(item);
                    processedFiles.add(fileName);
                }
            });
            
            mediaFiles.forEach(file => {
                if (!processedFiles.has(file.name)) {
                    const isVideo = /\.(mp4|webm|mov)$/i.test(file.name);
                    finalPlaylist.push({
                        src: file.name,
                        type: isVideo ? 'video' : 'image',
                        overlay: '',
                        qr: false,
                        duration: isVideo ? undefined : 8000,
                    });
                }
            });
            
            setPlaylistItems(finalPlaylist);

        } catch (err: any) {
            console.error("Error fetching TV data:", err);
            setError("Failed to load playlist data. Check bucket permissions and file structure.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSavePlaylist = async () => {
        setSaving(true);
        setError(null);
        try {
            const playlistObject = { items: playlistItems };
            const playlistString = JSON.stringify(playlistObject, null, 2);
            const playlistBlob = new Blob([playlistString], { type: 'application/json' });
            const filePath = `${TV_PREFIX}/playlist.json`;

            const { error: saveError } = await supabase.storage
                .from(TV_BUCKET)
                .upload(filePath, playlistBlob, {
                    cacheControl: '3600',
                    upsert: true,
                });

            if (saveError) {
                throw saveError;
            }
            
            alert("Playlist saved successfully!");

        } catch (err: any) {
            console.error("Error saving playlist:", err);
            setError(`Failed to save playlist.json. Error: ${err.message}. This is almost certainly caused by a missing Storage Row Level Security (RLS) policy in your Supabase project. Please go to your project's 'Authentication' > 'Policies' section, find the 'storage.objects' table, and ensure policies exist to allow 'insert' and 'update' operations on the '${TV_BUCKET}' bucket for authenticated users.`);
        } finally {
            setSaving(false);
        }
    };
    
    const handleDragStart = (index: number) => {
        setDraggedItemIndex(index);
    };

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

    return (
        <div className="mx-auto max-w-4xl space-y-8">
            <div>
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div className="text-center md:text-left">
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">Manage application settings and content.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={fetchData} disabled={loading || saving} className="flex items-center justify-center rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 px-4 py-2 font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50">
                            <RefreshCw className={`mr-2 h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                         <button onClick={handleSavePlaylist} disabled={loading || saving || playlistItems.length === 0} className="flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed">
                             {saving ? <LoaderCircle className="animate-spin -ml-1 mr-3 h-5 w-5" /> : <Save className="mr-2 h-5 w-5" />}
                             {saving ? 'Saving...' : 'Save Playlist'}
                        </button>
                    </div>
                </div>
                
                <Card>
                    <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4">TV Playlist Manager</h2>
                     {loading && <p className="text-center text-gray-500 dark:text-gray-400 p-8">Loading playlist...</p>}
                     {error && <p className="text-center text-red-500 p-4 rounded-lg bg-red-50 dark:bg-red-900/20">{error}</p>}
                     {!loading && !error && (
                         <div className="space-y-3">
                            {playlistItems.length > 0 ? playlistItems.map((item, index) => (
                                 <div 
                                    key={`${item.src}-${index}`} 
                                    className={`grid grid-cols-12 gap-3 items-center bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700 transition-opacity ${draggedItemIndex === index ? 'opacity-50' : ''}`}
                                    draggable
                                    onDragStart={() => handleDragStart(index)}
                                    onDragEnter={(e) => { e.preventDefault(); if (draggedItemIndex !== null) handleDrop(index); }}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={() => handleDrop(index)}
                                    onDragEnd={() => setDraggedItemIndex(null)}
                                 >
                                    <div className="col-span-1 flex justify-center items-center cursor-move text-gray-400 hover:text-gray-600" title="Drag to reorder">
                                        <GripVertical />
                                    </div>
                                    <div className="col-span-11 md:col-span-4">
                                        <p className="font-semibold text-sm truncate text-gray-800 dark:text-gray-200" title={item.src}>{item.src.split('/').pop()}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{item.type}</p>
                                    </div>
                                    <div className="col-span-12 md:col-span-5">
                                        <input 
                                            type="text" 
                                            placeholder="Overlay text..." 
                                            value={item.overlay || ''}
                                            onChange={(e) => handleUpdateItem(index, { overlay: e.target.value })}
                                            className="input text-sm py-1"
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-2 flex items-center justify-start md:justify-center gap-2">
                                         <label htmlFor={`qr-${index}`} className="flex items-center cursor-pointer text-sm text-gray-600 dark:text-gray-300">
                                            <input 
                                                type="checkbox"
                                                id={`qr-${index}`}
                                                checked={!!item.qr}
                                                onChange={(e) => handleUpdateItem(index, { qr: e.target.checked })}
                                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="ml-2">QR</span>
                                        </label>
                                    </div>
                                 </div>
                            )) : (
                                <p className="text-center text-gray-500 dark:text-gray-400 py-8">No media files found in '{TV_BUCKET}/{TV_PREFIX}'. Upload videos or images to manage the playlist.</p>
                            )}
                         </div>
                     )}
                </Card>
            </div>
            
            <Card>
                <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4">Application Configuration</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    These values are set from environment variables and are read-only.
                </p>
                <div className="space-y-2">
                    {Object.entries(appConfig).map(([key, value]) => (
                        <div key={key} className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-sm p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md border border-gray-200 dark:border-gray-700">
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
