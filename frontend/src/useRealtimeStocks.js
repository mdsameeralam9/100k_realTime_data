import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const useRealtimeStocks = () => {
  const queryClient = useQueryClient();
  
  // 1. Update Buffer
  // We use a Map to store updates by stock ID (Map<ID, Update>).
  // If multiple updates arrive for the same stock ID before the next frame,
  // the Map naturally overwrites the older update with the newer one.
  const updateBufferRef = useRef(new Map());
  
  // 2. requestAnimationFrame Reference
  // We use this to schedule batch updates to the cache, preventing 
  // excessive rendering by syncing with the browser's refresh rate.
  const rafRef = useRef(null);

  const flushBuffer = () => {
    // Clear the scheduled frame reference
    rafRef.current = null;
    
    // If there's nothing in the buffer, exit
    if (updateBufferRef.current.size === 0) return;

    // Read all updates and then clear the buffer
    const updates = new Map(updateBufferRef.current);
    updateBufferRef.current.clear();

    // Batch update the React Query cache in one go
    queryClient.setQueryData(["stocks"], (oldData) => {
      if (!oldData) return oldData;

      // Create a shallow copy of the array and update only changed records
      return oldData.map((stock) => {
        const update = updates.get(stock.id);
        if (update) {
          return { ...stock, ...update };
        }
        return stock;
      });
    });
  };

  useEffect(() => {
    // Connect to WebSocket server
    const socket = new WebSocket("ws://localhost:5000");

    socket.onopen = () => {
      console.log('Connected to WebSocket server');
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === "STOCK_UPDATE") {
        const update = message.data;
        
        // Add the update to our buffer
        updateBufferRef.current.set(update.id, update);

        // Schedule a flush if one isn't already scheduled
        if (rafRef.current === null) {
          rafRef.current = requestAnimationFrame(flushBuffer);
        }
      } else if (message.type === "CONNECTED") {
        console.log(message.message);
      }
    };

    socket.onclose = () => {
      console.log('Disconnected from WebSocket server');
    };

    socket.onerror = (error) => {
      console.error('WebSocket Error: ', error);
    };

    // Cleanup on unmount
    return () => {
      socket.close();
      
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      
      updateBufferRef.current.clear();
    };
  }, [queryClient]);
};
