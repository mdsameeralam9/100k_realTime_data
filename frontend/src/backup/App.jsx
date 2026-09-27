import React, { useState, useMemo, memo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { fetchStocks } from './api';
import { useRealtimeStocks } from './useRealtimeStocks';

// We use React.memo so unchanged rows don't unnecessarily rerender.
// A WebSocket update for ID 500 should primarily affect Row 500,
// and not force expensive work for every visible row.
const StockRow = memo(function StockRow({ stock, style }) {
  const isUp = stock.status === 'ACTIVE';

  return (
    <div
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        borderBottom: '1px solid #333',
        background: '#1a1a1a',
      }}
      className="stock-row"
    >
      <div style={{ flex: 1 }}>{stock.id}</div>
      <div style={{ flex: 2, fontWeight: 'bold' }}>{stock.name}</div>
      <div style={{ flex: 1, color: '#aaa' }}>{stock.symbol}</div>
      <div style={{ flex: 1, fontWeight: 'bold', color: isUp ? '#4ade80' : '#f87171' }}>
        ${stock.price.toFixed(2)}
      </div>
      <div style={{ flex: 1 }}>{stock.quantity}</div>
      <div style={{ flex: 1 }}>
        <span className={`status-badge ${isUp ? 'active' : 'inactive'}`}>
          {stock.status}
        </span>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if the specific properties we display have changed
  return (
    prevProps.stock.price === nextProps.stock.price &&
    prevProps.stock.quantity === nextProps.stock.quantity &&
    prevProps.stock.status === nextProps.stock.status
  );
});

function App() {
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Fetch initial 10,000 records from the REST API
  const { data: stocks = [], isLoading, isError } = useQuery({
    queryKey: ['stocks'],
    queryFn: fetchStocks,
  });

  // 2. Start WebSocket real-time connection to receive delta updates
  // This will mutate the 'stocks' cache in React Query directly.
  useRealtimeStocks();

  // 3. Memoize the filtered data so search is fast and doesn't 
  // recalculate unnecessarily on every render.
  const filteredStocks = useMemo(() => {
    if (!searchTerm) return stocks;
    const lower = searchTerm.toLowerCase();
    return stocks.filter(
      (stock) =>
        stock.name.toLowerCase().includes(lower) ||
        stock.symbol.toLowerCase().includes(lower)
    );
  }, [stocks, searchTerm]);

  // 4. Set up Virtualization
  // The parent reference determines the scrollable area
  const parentRef = useRef(null);

  const rowVirtualizer = useVirtualizer({
    count: filteredStocks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40, // Height of each row in pixels
    overscan: 5, // Render 5 extra rows outside viewport for smooth scrolling
  });

  if (isLoading) return <div className="loading">Loading 10,000 records...</div>;
  if (isError) return <div className="error">Error loading data. Is the backend running?</div>;

  return (
    <div className="container">
      <header className="header">
        <h1>Real-Time Market Data</h1>
        <div className="stats">
          <span>Total Records: {stocks.length}</span>
          <span>Showing: {filteredStocks.length}</span>
        </div>
        <input
          type="text"
          className="search-input"
          placeholder="Search by name or symbol..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </header>

      <div className="table-header">
        <div style={{ flex: 1 }}>ID</div>
        <div style={{ flex: 2 }}>Name</div>
        <div style={{ flex: 1 }}>Symbol</div>
        <div style={{ flex: 1 }}>Price</div>
        <div style={{ flex: 1 }}>Quantity</div>
        <div style={{ flex: 1 }}>Status</div>
      </div>

      {/* The scrollable container for the virtualized list */}
      <div
        ref={parentRef}
        className="table-container"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const stock = filteredStocks[virtualRow.index];
            return (
              <StockRow
                key={stock.id}
                stock={stock}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default App;
