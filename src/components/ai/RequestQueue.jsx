/**
 * Request Queue - Debounces and queues API calls to prevent rate limiting
 */

class RequestQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.minDelay = 200; // Minimum 200ms between requests
    this.lastRequestTime = 0;
  }

  async add(requestFunc, priority = 'normal') {
    return new Promise((resolve, reject) => {
      const request = { requestFunc, resolve, reject, priority, timestamp: Date.now() };
      
      if (priority === 'high') {
        this.queue.unshift(request);
      } else {
        this.queue.push(request);
      }
      
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift();
      
      // Enforce minimum delay between requests
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.minDelay) {
        await new Promise(resolve => setTimeout(resolve, this.minDelay - timeSinceLastRequest));
      }

      try {
        const result = await request.requestFunc();
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }

      this.lastRequestTime = Date.now();
    }

    this.processing = false;
  }

  clear() {
    this.queue = [];
  }

  size() {
    return this.queue.length;
  }
}

// Singleton instance
const requestQueue = new RequestQueue();

export const queueRequest = (requestFunc, priority = 'normal') => {
  return requestQueue.add(requestFunc, priority);
};

export const clearQueue = () => {
  requestQueue.clear();
};

export const getQueueSize = () => {
  return requestQueue.size();
};