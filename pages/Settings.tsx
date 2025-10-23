import React, { useState, useEffect, useCallback } from 'react';
import { db, storage } from '../lib/supabaseClient'; // Firebase client
// FIX: Import 'query' and 'where' from firestore to build the database query.
import { collection, getDocs, doc, setDoc, query, where } from 'firebase/firestore';
import { ref, listAll, getDownloadURL, uploadString } from 'firebase/storage';
import { ORG_UUID, EVENT_CODE, TV_PREFIX } from '../lib/config';
import Card from '../components/Card';
import { LoaderCircle, Upload, Save, FileText, Video, Image as ImageIcon } from 'lucide-react';

interface MessageTemplate {
  id: string;
  channel: string;
  template: string;
}

const Settings: React.FC = () => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [savingTemplates, setSavingTemplates] = useState(false);
  
  const [playlistItems, setPlaylistItems] = useState<string[]>([]);
  const [loadingPlaylist, setLoadingPlaylist] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leadChannels = ['Guia', 'Agencia', 'Hotel', 'Mayorista', 'Transportista', 'Otro'];

  // Fetch message templates
  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const templatesRef = collection(db, 'message_templates');
      const q = query(collection(db, "message_templates"), 
        where("org_id", "==", ORG_UUID),
        where("event_code", "==", EVENT_CODE)
      );
      const querySnapshot = await getDocs(q);
      const fetchedTemplates = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MessageTemplate));
      
      // Ensure all channels have a placeholder
      const allTemplates = leadChannels.map(channel => {
          const existing = fetchedTemplates.find(t => t.channel === channel);
          return existing || { id: channel, channel, template: '' };
      });

      setTemplates(allTemplates);
    } catch (err) {
      console.error(err);
      setError("Failed to load message templates. Check Firestore permissions.");
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  // Fetch TV playlist files
  const fetchPlaylistFiles = useCallback(async () => {
      setLoadingPlaylist(true);
      try {
        const folderRef = ref(storage, TV_PREFIX);
        const res = await listAll(folderRef);
        const files = res.items.map(itemRef => itemRef.name);
        setPlaylistItems(files);
      } catch (err: any) {
        console.error(err);
        if (err.message.includes('storage/object-not-found')) {
             setError("TV folder not found in Firebase Storage. Please upload some media.");
        } else if (err.message.toLowerCase().includes('cors')) {
             setError("Failed to list files due to CORS policy. Please configure CORS on your Firebase Storage bucket.");
        }
        else {
            setError("Failed to load TV playlist files.");
        }
      } finally {
        setLoadingPlaylist(false);
      }
  }, []);

  useEffect(() => {
    fetchTemplates();
    fetchPlaylistFiles();
  }, [fetchTemplates, fetchPlaylistFiles]);

  const handleTemplateChange = (channel: string, value: string) => {
    setTemplates(prev =>
      prev.map(t => (t.channel === channel ? { ...t, template: value } : t))
    );
  };

  const handleSaveTemplates = async () => {
    setSavingTemplates(true);
    setError(null);
    try {
        const savePromises = templates.map(template => {
            // Use channel as the document ID for simplicity and to prevent duplicates
            const docRef = doc(db, 'message_templates', `${EVENT_CODE}_${template.channel}`);
            return setDoc(docRef, {
                org_id: ORG_UUID,
                event_code: EVENT_CODE,
                channel: template.channel,
                template: template.template,
            }, { merge: true });
        });
        await Promise.all(savePromises);
        alert("Templates saved successfully!");
    } catch (err) {
        console.error(err);
        setError("Failed to save templates. Please check Firestore security rules.");
    } finally {
        setSavingTemplates(false);
    }
  };

  const handlePlaylistUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || file.name !== 'playlist.json') {
      alert("Please select a file named 'playlist.json'.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const content = await file.text();
      const playlistRef = ref(storage, `${TV_PREFIX}/playlist.json`);
      await uploadString(playlistRef, content, 'raw', { contentType: 'application/json' });
      alert('playlist.json uploaded successfully! The TV display will update on the next cycle.');
    } catch (err) {
      console.error(err);
      setError('Failed to upload playlist.json. Check Storage permissions.');
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (fileName: string) => {
      const ext = fileName.split('.').pop()?.toLowerCase();
      if (['mp4', 'mov', 'webm'].includes(ext!)) return <Video className="h-5 w-5 text-blue-500" />;
      if (['jpg', 'jpeg', 'png', 'gif'].includes(ext!)) return <ImageIcon className="h-5 w-5 text-green-500" />;
      return <FileText className="h-5 w-5 text-gray-500" />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Manage event configuration and content.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300">
          <p className="font-bold">An error occurred:</p>
          <p>{error}</p>
        </div>
      )}

      <Card>
        <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4">WhatsApp Message Templates</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Customize the message sent for each lead category. Use <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{'\\{nombre\\}'}</code> to insert the lead's first name.
        </p>
        {loadingTemplates ? (
          <div className="text-center p-4"><LoaderCircle className="animate-spin mx-auto text-gray-400" /></div>
        ) : (
          <div className="space-y-4">
            {templates.map(template => (
              <div key={template.channel}>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{template.channel}</label>
                <textarea
                  className="input min-h-[80px]"
                  value={template.template}
                  onChange={e => handleTemplateChange(template.channel, e.target.value)}
                />
              </div>
            ))}
            <button
              onClick={handleSaveTemplates}
              disabled={savingTemplates}
              className="w-full flex items-center justify-center rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-500"
            >
              {savingTemplates ? <LoaderCircle className="animate-spin mr-2" /> : <Save className="mr-2" />}
              {savingTemplates ? 'Saving...' : 'Save All Templates'}
            </button>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4">TV Display Playlist</h2>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                 <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Available Media</h3>
                 <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Files found in your <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{TV_PREFIX}</code> folder in Firebase Storage.</p>
                {loadingPlaylist ? (
                    <div className="text-center p-4"><LoaderCircle className="animate-spin mx-auto text-gray-400" /></div>
                ) : (
                    <ul className="space-y-2 max-h-60 overflow-y-auto pr-2 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                        {playlistItems.length > 0 ? playlistItems.map(item => (
                            <li key={item} className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                                {getFileIcon(item)}
                                <span>{item}</span>
                            </li>
                        )) : <p className="text-gray-500">No media files found.</p>}
                    </ul>
                )}
            </div>
            <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Update Playlist</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Upload a <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">playlist.json</code> file to control the TV display content and order.</p>
                <label htmlFor="playlist-upload" className="w-full cursor-pointer flex items-center justify-center rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-500">
                    <Upload className="mr-2" />
                    {uploading ? 'Uploading...' : 'Upload playlist.json'}
                </label>
                <input id="playlist-upload" type="file" accept=".json" className="hidden" onChange={handlePlaylistUpload} disabled={uploading} />
                 <a href="https://jsoneditoronline.org/" target="_blank" rel="noopener noreferrer" className="text-xs text-center block mt-2 text-blue-500 hover:underline">
                    Need help creating a JSON file? Use an online editor.
                </a>
            </div>
         </div>
      </Card>
    </div>
  );
};

export default Settings;
