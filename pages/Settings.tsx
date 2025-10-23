import React, { useState, useEffect, useCallback } from 'react';
import { db, storage } from '../lib/supabaseClient';
import { collection, doc, getDocs, setDoc, query, where } from 'firebase/firestore';
import { ref, listAll, uploadBytesResumable, getDownloadURL, uploadString } from 'firebase/storage';
import { ORG_UUID, EVENT_CODE, TV_PREFIX, EVENT_DATES, WHATSAPP } from '../lib/config';
import Card from '../components/Card';
import { TVItem } from '../lib/tv';
import { LoaderCircle, Upload, Plus, Trash2, GripVertical, FileVideo, FileImage, CheckCircle, XCircle } from 'lucide-react';
import { hasGemini } from '../lib/ai';
import { hasBuilderBot } from '../services/builderbotService';

interface MessageTemplate {
    id: string;
    channel: string;
    template: string;
}

const leadChannels = ['Guia', 'Agencia', 'Hotel', 'Mayorista', 'Transportista', 'Otro'];

const StatusPill: React.FC<{ status: boolean }> = ({ status }) => (
    <div className={`flex items-center gap-2 p-3 rounded-lg ${status ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
        {status ? <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" /> : <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />}
        <span className={`font-medium ${status ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
            {status ? 'Active' : 'Inactive'}
        </span>
    </div>
);


const Settings: React.FC = () => {
    const [mediaFiles, setMediaFiles] = useState<string[]>([]);
    const [playlist, setPlaylist] = useState<TVItem[]>([]);
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const [loadingMedia, setLoadingMedia] = useState(true);
    const [loadingPlaylist, setLoadingPlaylist] = useState(true);
    const [loadingTemplates, setLoadingTemplates] = useState(true);
    const [isSavingPlaylist, setIsSavingPlaylist] = useState(false);
    const [isSavingTemplates, setIsSavingTemplates] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
    const [error, setError] = useState<string | null>(null);
    const [draggedItem, setDraggedItem] = useState<TVItem | null>(null);

    const fetchMediaFiles = useCallback(async () => {
        setLoadingMedia(true);
        setError(null);
        try {
            const listRef = ref(storage, TV_PREFIX);
            const res = await listAll(listRef);
            const fileNames = res.items.map(item => item.name);
            setMediaFiles(fileNames);
        } catch (err) {
            console.error("Error fetching media files:", err);
            setError("Could not load media files. Check Storage permissions and CORS configuration.");
        } finally {
            setLoadingMedia(false);
        }
    }, []);

    const fetchPlaylist = useCallback(async () => {
        setLoadingPlaylist(true);
        try {
            const playlistRef = ref(storage, `${TV_PREFIX}/playlist.json`);
            const url = await getDownloadURL(playlistRef);
            
            const urlNoCache = `${url}${url.includes('?') ? '&' : '?'}cb=${Date.now()}`;
            const response = await fetch(urlNoCache, { cache: 'no-store' });

            if (!response.ok) throw new Error("Playlist fetch failed");
            const data = await response.json();
            setPlaylist(data.items || []);
        } catch (err) {
            console.warn("Could not load playlist.json, starting with an empty one.");
            setPlaylist([]);
        } finally {
            setLoadingPlaylist(false);
        }
    }, []);
    
    const fetchTemplates = useCallback(async () => {
        setLoadingTemplates(true);
        try {
            const templatesRef = collection(db, 'message_templates');
            const q = query(templatesRef, where('org_id', '==', ORG_UUID), where('event_code', '==', EVENT_CODE));
            const querySnapshot = await getDocs(q);
            const fetchedTemplates = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MessageTemplate));
            
            const allTemplates = leadChannels.map(channel => {
                const existing = fetchedTemplates.find(t => t.channel === channel);
                return existing || { id: channel, channel, template: '' };
            });
            setTemplates(allTemplates);
        } catch (err) {
            console.error("Error fetching templates:", err);
            setError("Could not load message templates.");
        } finally {
            setLoadingTemplates(false);
        }
    }, []);


    useEffect(() => {
        fetchMediaFiles();
        fetchPlaylist();
        fetchTemplates();
    }, [fetchMediaFiles, fetchPlaylist, fetchTemplates]);

    const handleMediaUpload = (files: FileList) => {
        if (!files) return;
        Array.from(files).forEach(file => {
            const storageRef = ref(storage, `${TV_PREFIX}/${file.name}`);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
                },
                (error) => {
                    console.error("Upload failed:", error);
                    setError(`Failed to upload ${file.name}.`);
                    setUploadProgress(prev => ({ ...prev, [file.name]: -1 }));
                },
                () => {
                    setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
                    setTimeout(() => {
                        setUploadProgress(prev => {
                            const newProgress = { ...prev };
                            delete newProgress[file.name];
                            return newProgress;
                        });
                        fetchMediaFiles(); // Refresh file list
                    }, 2000);
                }
            );
        });
    };

    const handleSavePlaylist = async () => {
        setIsSavingPlaylist(true);
        setError(null);
        try {
            const playlistToSave = { items: playlist.map(({ type, src, ...rest }) => ({
                ...rest,
                type,
                src: src.split('/').pop()?.split('?')[0] || src, 
            }))};
            
            const playlistString = JSON.stringify(playlistToSave, null, 2);
            const playlistRef = ref(storage, `${TV_PREFIX}/playlist.json`);
            await uploadString(playlistRef, playlistString, 'raw', { contentType: 'application/json' });
            alert("Playlist saved successfully!");
        } catch (err) {
            console.error("Error saving playlist:", err);
            setError("Failed to save playlist. Check console for details.");
        } finally {
            setIsSavingPlaylist(false);
        }
    };
    
    const handleSaveTemplates = async () => {
        setIsSavingTemplates(true);
        try {
            for (const template of templates) {
                if (template.template.trim()) {
                    const docRef = doc(db, 'message_templates', `${ORG_UUID}_${EVENT_CODE}_${template.channel}`);
                    await setDoc(docRef, {
                        org_id: ORG_UUID,
                        event_code: EVENT_CODE,
                        channel: template.channel,
                        template: template.template
                    }, { merge: true });
                }
            }
            alert("Templates saved successfully!");
        } catch (err) {
            console.error("Error saving templates:", err);
            setError("Could not save templates.");
        } finally {
            setIsSavingTemplates(false);
        }
    };

    const handlePlaylistChange = (index: number, field: keyof TVItem, value: any) => {
        const newPlaylist = [...playlist];
        if (field === 'qr') {
            newPlaylist[index] = { ...newPlaylist[index], [field]: value.target.checked };
        } else if (field === 'duration') {
            newPlaylist[index] = { ...newPlaylist[index], [field]: Number(value) };
        } else {
            newPlaylist[index] = { ...newPlaylist[index], [field]: value };
        }
        
        if (field === 'src') {
             const isVideo = value.endsWith('.mp4') || value.endsWith('.webm');
             newPlaylist[index].type = isVideo ? 'video' : 'image';
        }
        
        setPlaylist(newPlaylist);
    };

    const addPlaylistItem = () => setPlaylist([...playlist, { src: '', type: 'image', duration: 8000, qr: false, overlay: '' }]);
    const removePlaylistItem = (index: number) => setPlaylist(playlist.filter((_, i) => i !== index));

    const handleDragStart = (item: TVItem) => setDraggedItem(item);
    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (!draggedItem) return;

        const newPlaylist = playlist.filter(item => item.src !== draggedItem.src);
        newPlaylist.splice(index, 0, draggedItem);
        setPlaylist(newPlaylist);
    };

    const handleTemplateChange = (channel: string, value: string) => {
        setTemplates(prev => prev.map(t => t.channel === channel ? { ...t, template: value } : t));
    };


    return (
        <div className="mx-auto max-w-6xl space-y-8">
            <div className="text-center">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Settings & Configuration</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Manage your event's dynamic content, messaging, and view integration status.</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4">Event Details</h2>
                    <p className="text-sm text-gray-500 mb-4">Current application settings loaded from environment variables. These are read-only.</p>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400">Organization ID (ORG_UUID):</span>
                            <code className="bg-gray-200 dark:bg-gray-700 p-1 rounded font-mono text-xs">{ORG_UUID}</code>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400">Event Code:</span>
                            <code className="bg-gray-200 dark:bg-gray-700 p-1 rounded font-mono text-xs">{EVENT_CODE}</code>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400">Event Dates:</span>
                            <code className="bg-gray-200 dark:bg-gray-700 p-1 rounded font-mono text-xs">{EVENT_DATES}</code>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400">Contact WhatsApp:</span>
                            <code className="bg-gray-200 dark:bg-gray-700 p-1 rounded font-mono text-xs">{WHATSAPP}</code>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-400">TV Playlist Prefix:</span>
                            <code className="bg-gray-200 dark:bg-gray-700 p-1 rounded font-mono text-xs">{TV_PREFIX}</code>
                        </div>
                    </div>
                </Card>
                 <Card>
                    <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4">API Integrations Status</h2>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Google Gemini AI</span>
                            <StatusPill status={hasGemini()} />
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-700 dark:text-gray-300">BuilderBot WhatsApp API</span>
                            <StatusPill status={hasBuilderBot()} />
                        </div>
                    </div>
                </Card>
            </div>
            
            {error && <div className="p-4 bg-red-100 text-red-800 rounded-lg">{error}</div>}

            <Card>
                <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4">TV Display Playlist</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                        <h3 className="font-semibold mb-2">Available Media</h3>
                        <p className="text-sm text-gray-500 mb-2">Files in your <code className="bg-gray-200 dark:bg-gray-700 p-1 rounded text-xs">{TV_PREFIX}</code> folder.</p>
                         {loadingMedia ? <p>Loading media...</p> : (
                            <div className="border rounded-lg p-2 h-48 overflow-y-auto space-y-1">
                                {mediaFiles.map(file => (
                                    <div key={file} className="flex items-center gap-2 text-sm p-1 bg-gray-50 dark:bg-gray-800 rounded">
                                        {file.endsWith('.mp4') || file.endsWith('.webm') ? <FileVideo size={16} /> : <FileImage size={16} />}
                                        <span>{file}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="mt-4">
                            <label className="block w-full cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-center font-semibold text-white hover:bg-blue-700">
                                <Upload size={16} className="inline mr-2" />
                                Upload New Media
                                <input type="file" multiple onChange={(e) => handleMediaUpload(e.target.files!)} className="hidden" />
                            </label>
                            <div className="space-y-1 mt-2">
                                {Object.entries(uploadProgress).map(([name, progress]) => (
                                    <div key={name}>
                                        <span className="text-xs">{name}</span>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                                            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">Playlist Editor</h3>
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                            {loadingPlaylist ? <p>Loading playlist...</p> : playlist.map((item, index) => (
                                <div 
                                    key={index}
                                    className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg flex gap-2 items-start"
                                    draggable
                                    onDragStart={() => handleDragStart(item)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                >
                                    <GripVertical className="mt-1 cursor-move text-gray-400" size={20} />
                                    <div className="flex-grow space-y-2">
                                        <input list="media-files" value={item.src.split('/').pop()?.split('?')[0] || ''} onChange={(e) => handlePlaylistChange(index, 'src', e.target.value)} placeholder="File name (e.g., intro.mp4)" className="input text-sm" />
                                        <datalist id="media-files">
                                            {mediaFiles.map(f => <option key={f} value={f}/>)}
                                        </datalist>
                                        <input type="text" value={item.overlay} onChange={(e) => handlePlaylistChange(index, 'overlay', e.target.value)} placeholder="Overlay Text (optional)" className="input text-sm" />
                                        <div className="flex items-center gap-4">
                                            {item.type === 'image' && (
                                                <input type="number" value={item.duration} onChange={(e) => handlePlaylistChange(index, 'duration', e.target.value)} className="input text-sm w-24" title="Duration (ms)" />
                                            )}
                                            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={item.qr} name="qr" onChange={(e) => handlePlaylistChange(index, 'qr', e)} /> QR</label>
                                        </div>
                                    </div>
                                    <button onClick={() => removePlaylistItem(index)}><Trash2 size={18} className="text-red-500 hover:text-red-700" /></button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button onClick={addPlaylistItem} className="w-full rounded-lg bg-gray-200 dark:bg-gray-700 py-2 font-semibold text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center gap-1"><Plus size={16}/>Add Item</button>
                            <button onClick={handleSavePlaylist} disabled={isSavingPlaylist} className="w-full rounded-lg bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-500 flex items-center justify-center gap-1">
                                {isSavingPlaylist ? <LoaderCircle className="animate-spin" /> : 'Save Playlist'}
                            </button>
                        </div>
                    </div>
                </div>
            </Card>

            <Card>
                <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4">WhatsApp Message Templates</h2>
                <p className="text-sm text-gray-500 mb-4">Customize the message sent for each lead category. Use <code className="bg-gray-200 dark:bg-gray-700 p-1 rounded text-xs">{'{nombre}'}</code> as a placeholder for the lead's first name.</p>
                {loadingTemplates ? <p>Loading templates...</p> : (
                    <div className="space-y-4">
                        {templates.map(template => (
                            <div key={template.channel}>
                                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{template.channel}</label>
                                <textarea
                                    value={template.template}
                                    onChange={(e) => handleTemplateChange(template.channel, e.target.value)}
                                    className="input w-full min-h-[80px]"
                                    placeholder={`Default message for ${template.channel}`}
                                />
                            </div>
                        ))}
                    </div>
                )}
                <button onClick={handleSaveTemplates} disabled={isSavingTemplates} className="mt-6 w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-500 flex items-center justify-center gap-1">
                    {isSavingTemplates ? <LoaderCircle className="animate-spin" /> : 'Save All Templates'}
                </button>
            </Card>
        </div>
    );
};

export default Settings;
