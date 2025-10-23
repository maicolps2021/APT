
// lib/offlineQueue.ts

/**
 * A simple in-memory queue for demonstrating offline capabilities.
 * In a real-world scenario, this would be backed by IndexedDB to persist
 * data across page reloads and browser sessions.
 */

type QueueItem = {
  id: string; // A unique ID for the item, e.g., a timestamp or UUID
  payload: any; // The data to be sent, e.g., a new lead object
  retries: number;
};

// This would be stored in IndexedDB
const queue: QueueItem[] = [];

let isProcessing = false;

/**
 * Adds a new operation to the queue.
 * @param payload The data for the operation.
 */
export const addToQueue = async (payload: any): Promise<void> => {
  const newItem: QueueItem = {
    id: `op_${Date.now()}`,
    payload,
    retries: 0,
  };
  queue.push(newItem);
  console.log('Added to offline queue:', newItem);
  // In a real implementation, you would save `queue` to IndexedDB here.
  
  // Trigger processing if not already running
  processQueue();
};

/**
 * Processes items from the queue.
 * This function would be triggered when an item is added, and also
 * when the application detects it has come back online.
 */
export const processQueue = async (): Promise<void> => {
  if (isProcessing || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return;
  }

  isProcessing = true;

  while (queue.length > 0) {
    const item = queue[0]; // Peek at the first item
    
    try {
      // Here you would define the actual async operation, e.g., saving a lead to Firestore.
      // For this placeholder, we'll just simulate a successful operation.
      console.log('Processing item from queue:', item);
      // await saveLeadToFirestore(item.payload);
      
      // If successful, remove it from the queue
      queue.shift();
      // In a real implementation, you would remove the item from IndexedDB here.
    } catch (error) {
      console.error('Failed to process queue item:', item, error);
      item.retries += 1;
      
      // Basic retry logic: stop processing if an item fails multiple times
      if (item.retries > 3) {
        console.error('Item failed too many times, removing from queue:', item);
        queue.shift(); // Discard the failing item
      } else {
        // Move the item to the back of the queue to retry later
        const failedItem = queue.shift();
        if (failedItem) {
          queue.push(failedItem);
        }
      }
      // Stop processing on failure to avoid a loop of failures
      break; 
    }
  }

  isProcessing = false;
};

// Listen for online/offline events to trigger queue processing
if (typeof window !== 'undefined') {
    window.addEventListener('online', processQueue);
}

// Initial attempt to process the queue on load
if (typeof window !== 'undefined') {
    processQueue();
}
