'use client'

import { useEffect, useRef, useState } from 'react'
import { GripVertical, ImagePlus, Layers3, Moon, Palette, Plus, RotateCcw, Search, Share2, Sparkles, Sun, Type, Upload, X, Gamepad2 } from 'lucide-react'

type Mode = 'text' | 'image' | 'game'
type Item = { id: string; label: string; image?: string; tierId: string | null }
type Tier = { id: string; name: string; color: string }

const initialTiers: Tier[] = [
  { id: 's', name: 'S', color: '#FF6B57' }, { id: 'a', name: 'A', color: '#FFB547' }, { id: 'b', name: 'B', color: '#F3D34A' }, { id: 'c', name: 'C', color: '#A6C95C' }, { id: 'd', name: 'D', color: '#77B6A3' },
]
const initialItems: Item[] = [
  { id: 't1', label: 'Midnight ramen', tierId: 's' }, { id: 't2', label: 'Sunday reset', tierId: 'a' }, { id: 't3', label: 'Analog cameras', tierId: 'b' }, { id: 't4', label: 'Late night walks', tierId: null }, { id: 't5', label: 'Tiny rituals', tierId: null }, { id: 't6', label: 'Good playlists', tierId: null }, { id: 't7', label: 'Window seats', tierId: null },
]
const initialImages: Item[] = [
  //{ id: 'i1', label: 'Ramen', image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=360&q=80', tierId: 's' }, { id: 'i2', label: 'Film', image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=360&q=80', tierId: 'a' }, { id: 'i3', label: 'Vinyl', image: 'https://images.unsplash.com/photo-1461360228754-6e81c478b882?w=360&q=80', tierId: null }, { id: 'i4', label: 'Coffee', image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=360&q=80', tierId: null }, { id: 'i5', label: 'Sneakers', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=360&q=80', tierId: null },
]

export default function Page() {
  const [mode, setMode] = useState<Mode>('text'); 
  const [dark, setDark] = useState(true);  

  const [tiers, setTiers] = useState<Tier[]>(() => {
    if (typeof window === 'undefined') {
      return initialTiers;
    }
  
    const saved = localStorage.getItem('tierly-tiers');
  
    if (!saved) {
      return initialTiers;
    }
  
    try {
      return JSON.parse(saved);
    } catch {
      return initialTiers;
    }
  });

  const [items, setItems] = useState<Item[]>(() => {
    if (typeof window === 'undefined') {
      return initialItems;
    }
  
    const saved = localStorage.getItem('tierly-items');
  
    if (!saved) {
      return initialItems;
    }
  
    try {
      return JSON.parse(saved);
    } catch {
      return initialItems;
    }
  });
  
  const [images, setImages] = useState<Item[]>(() => {
    if (typeof window === 'undefined') {
      return initialImages;
    }
  
    const saved = localStorage.getItem('tierly-images');
  
    if (!saved) {
      return initialImages;
    }
  
    try {
      return JSON.parse(saved);
    } catch {
      return initialImages;
    }
  });
   useEffect(() => {
    localStorage.setItem(
      'tierly-images',
      JSON.stringify(images)
    );
  }, [images]);

  useEffect(() => {
    localStorage.setItem(
      'tierly-tiers',
      JSON.stringify(tiers)
    );
  }, [tiers]);
  useEffect(() => {
    localStorage.setItem(
      'tierly-items',
      JSON.stringify(items)
    );
  }, [items]);


  const [dragged, setDragged] = useState<string | null>(null); const [tierDrag, setTierDrag] = useState<string | null>(null); const [query, setQuery] = useState(''); const textRef = useRef<HTMLInputElement>(null); const csvRef = useRef<HTMLInputElement>(null)
  const visibleItems = mode === 'text' ? items : images; const ranked = visibleItems.filter((item) => item.tierId).length
  const unranked = visibleItems.filter((item) => !item.tierId && item.label.toLowerCase().includes(query.toLowerCase()))
  const setCurrentItems = (fn: (current: Item[]) => Item[]) => mode === 'text' ? setItems(fn) : setImages(fn)
  const lastDropTarget = useRef<string | null>(null);

  function moveDraggedItem(
    targetTierId: string | null,
    targetItemId?: string,
    placeAfter = false
  ) {
    if (!dragged) return;
  
    setCurrentItems((current) => {
      const fromIndex = current.findIndex((item) => item.id === dragged);
  
      if (fromIndex === -1) return current;
  
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
  
      // Tier'ın boş alanına bırakıldı
      if (!targetItemId) {
        moved.tierId = targetTierId;
        next.push(moved);
        return next;
      }
  
      const targetIndex = next.findIndex(
        (item) => item.id === targetItemId
      );
  
      if (targetIndex === -1) return current;
  
      let insertIndex = targetIndex + (placeAfter ? 1 : 0);
  
      next.splice(insertIndex, 0, {
        ...moved,
        tierId: targetTierId,
      });
  
      return next;
    });
  }

  const dropTarget = useRef<{
    tierId: string;
    itemId?: string;
    placeAfter: boolean;
  } | null>(null);
  
  function itemOver(
    e: React.DragEvent<HTMLDivElement>,
    target: Item
  ) {
    e.preventDefault();
    e.stopPropagation();
  
    if (!dragged || dragged === target.id) return;
  
    const box = e.currentTarget.getBoundingClientRect();
  
    const placeAfter =
      e.clientX > box.left + box.width / 2;
  
    dropTarget.current = {
      tierId: target.tierId!,
      itemId: target.id,
      placeAfter,
    };
  }
function handleDragStart(id: string) {
  setDragged(id);
  lastDropTarget.current = null;
}
function handleDragEnd() {
  setDragged(null);
  lastDropTarget.current = null;
}

function deleteUnranked() {
  if (mode === 'text') {
    setItems((current) =>
      current.filter((item) => item.tierId !== null)
    );
  } else {
    setImages((current) =>
      current.filter((item) => item.tierId !== null)
    );
  }

  setQuery('');
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      // CSV'deki "" → "
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current.trim());

  return cells;
}


  function reorderTier(targetId: string) { if (!tierDrag || tierDrag === targetId) return; setTiers((current) => { const next = [...current]; const from = next.findIndex((t) => t.id === tierDrag); const to = next.findIndex((t) => t.id === targetId); const [moved] = next.splice(from, 1); next.splice(to, 0, moved); return next }) }
  function addText() { const value = textRef.current?.value.trim(); if (!value) return; setItems((c) => [...c, { id: `t-${Date.now()}`, label: value, tierId: null }]); if (textRef.current) textRef.current.value = '' }
  function addTier() { const colors = ['#B38CFF', '#FF8AB7', '#7DC8FF', '#FF9364']; setTiers((c) => [...c, { id: `tier-${Date.now()}`, name: 'NEW', color: colors[c.length % colors.length] }]) }
  function reset() { setTiers(initialTiers); setItems(initialItems); setImages(initialImages); setQuery('') }
  function loadCsv(file?: File) {
    if (!file) return;
  
    const reader = new FileReader();
  
    reader.onload = () => {
      const lines = String(reader.result)
        .split(/\r?\n/)
        .filter(Boolean);
  
      if (!lines.length) return;
  
      // Header
      const headers = parseCsvLine(lines[0]).map((h) =>
        h.replace(/^"|"$/g, '').trim().toLowerCase()
      );
  
      const nameIndex = headers.indexOf('name');
      const imageIndex = headers.indexOf('image_url_medium');
  
      console.log('name index:', nameIndex);
      console.log('image index:', imageIndex);
  
      if (nameIndex === -1 || imageIndex === -1) {
        console.error(
          'CSV must contain name and image_url_medium columns'
        );
        return;
      }
  
      const imported: Item[] = lines
        .slice(1)
        .map((line, index): Item | null => {
          const cells = parseCsvLine(line);
  
          const name = cells[nameIndex]?.trim();
          const image = cells[imageIndex]?.trim();
  
          if (!name || !image) {
            return null;
          }
  
          return {
            id: `game-${Date.now()}-${index}`,
            label: name,
            image: image,
            tierId: null,
          };
        })
        .filter((item): item is Item => item !== null);
  
      setImages(imported);
    };
  
    reader.readAsText(file);
  }
  const modeLabel = mode === 'game' ? 'Game mode' : mode === 'image' ? 'Image mode' : 'Text mode'
  return <main className={dark ? 'app dark' : 'app'}>
    <header className="site-header">
      <div className="brand">
        <span className="brand-mark"><Layers3 /></span>
        <span>tierly</span><span className="brand-dot" />
        </div>
        <div className="header-actions">
          <button className="icon-button" aria-label="Toggle dark mode" onClick={() => setDark(!dark)}>{dark ? <Sun /> : <Moon />}</button>
          <button className="icon-button" aria-label="Share tier list"><Share2 /></button>
          <button className="avatar">JD</button></div></header><div className="workspace">
            <section className="intro"><div>
            
            <h1>Make your <em>definitive</em> list.</h1>
            </div>
            </section>
              <div className="modebar"><div className="mode-switch" role="group" aria-label="Content mode">
                <button className={mode === 'text' ? 'mode-active' : ''} onClick={() => setMode('text')}><Type /> Text mode</button>
                <button className={mode === 'image' ? 'mode-active' : ''} onClick={() => setMode('image')}><ImagePlus /> Image mode</button>
                <button className={mode === 'game' ? 'mode-active' : ''} onClick={() => setMode('game')}><Gamepad2 /> Game mode</button>
                </div><div className="toolbar-actions"><button className="subtle-button" onClick={reset}><RotateCcw /> Reset</button>
                <button className="primary-button" onClick={() => alert('Your tier list is ready to share!')}><Share2 /> Share list</button>
                </div></div>
                <div className="content-grid">
                  <section className="board-card">
                    <div className="board-heading"><div>
                      <span className="section-kicker">THE BOARD · {modeLabel.toUpperCase()}</span>
                      <h2>{mode === 'game' ? 'My game collection' : 'My everyday essentials'}</h2>
                      </div>
                      <span className="count-pill">{ranked} ranked <span>/</span> {visibleItems.length}</span>
                      </div>
                      <div className="tier-list">{tiers.map((tier) => { 
                        const tierItems = visibleItems.filter((item) => item.tierId === tier.id); 
                        return <div className={`tier-row ${tierDrag && tierDrag !== tier.id ? 'tier-drop-target' : ''}`} 
                        key={tier.id} onDragOver={(e) => { e.preventDefault(); if (tierDrag) reorderTier(tier.id) }}>
                          <div className="tier-label" style={{ background: tier.color }} 
                          draggable onDragStart={() => setTierDrag(tier.id)} onDragEnd={() => setTierDrag(null)}>
                            <GripVertical className="tier-grip" /><input value={tier.name} 
                            onChange={(e) => setTiers((c) => c.map((t) => t.id === tier.id ? { ...t, name: e.target.value } : t))} />
                            <label className="color-control" title="Change tier color"><Palette />
                            <input className="color-input" type="color" value={tier.color} onChange={(e) => setTiers((c) => c.map((t) => t.id === tier.id ? { ...t, color: e.target.value } : t))} /></label>
                            <button className="remove-tier" aria-label={`Remove ${tier.name} tier`} onClick={() => setTiers((c) => c.filter((t) => t.id !== tier.id))}><X /></button>
                            </div>
                            <div
                                className="drop-zone"
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                
                                  if (!dragged) return;
                                
                                  moveDraggedItem(tier.id);
                                  dropTarget.current = null;
                                }}
                              >{tierItems.length ? tierItems.map((item) => 
                              <ItemCard
                              key={item.id}
                              item={item}
                              mode={mode === 'text' ? 'text' : 'image'}
                              onDragStart={handleDragStart}
                              onDragEnd={handleDragEnd}
                              onDragOver={(e) => itemOver(e, item)}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            
                                if (!dragged || dragged === item.id) return;
                            
                                const box = e.currentTarget.getBoundingClientRect();
                            
                                const placeAfter =
                                  e.clientX > box.left + box.width / 2;
                            
                                moveDraggedItem(
                                  item.tierId,
                                  item.id,
                                  placeAfter
                                );
                            
                                dropTarget.current = null;
                              }}
                            />) : 
                              <span className="drop-hint">Drop items here</span>}</div></div> })}</div>
                              <button className="add-tier" onClick={addTier}><Plus /> Add tier</button></section>
                              <section className="pool-card">
                                <div className="pool-header">
                                <div>
                                  <span className="section-kicker">UNRANKED</span>
                                  <h3>{mode === 'game' ? 'Game items' : 'Drag to place'}</h3></div>
                                  <span className="pool-count">{unranked.length} items</span>
                                  <button
                                      className="delete-unranked"
                                      onClick={deleteUnranked}
                                      disabled={unranked.length === 0}
                                      title="Delete all unranked items"
                                    >
                                      <X />
                                    </button>
                                  </div>
                                  <div className="search-box"><Search /><input placeholder={mode === 'game' ? 'Search games...' : 'Search unranked items...'} value={query} onChange={(e) => setQuery(e.target.value)} /></div>
                                  <div className={`item-pool ${mode !== 'text' ? 'image-pool' : ''}`}>{unranked.map((item) => <ItemCard key={item.id} item={item} mode={mode === 'text' ? 'text' : 'image'} onDragStart={() => setDragged(item.id)} onDragEnd={() => setDragged(null)} />)}
                                      </div>
                                  {mode === 'text' && <div className="add-text">              
                                    <input ref={textRef} placeholder="Add a new item..." onKeyDown={(e) => e.key === 'Enter' && addText()} />
                                    <button onClick={addText}><Plus /></button></div>}{mode === 'game' && <>
                                    <input ref={csvRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => loadCsv(e.target.files?.[0])} />
                                    <button className="upload-button" onClick={() => csvRef.current?.click()}><Upload /> Upload CSV <span>name + image_url_medium</span></button></>}
                                    {mode === 'image' && <button className="upload-button"><Upload /> Upload images <span>PNG, JPG up to 10MB</span></button>}
                                    
                                      </section>
                                      </div>
                                      </div>
                                      </main>
}
function ItemCard({
  item,
  mode,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop
}: {
  item: Item;
  mode: 'text' | 'image';
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className={`item-card ${
        mode === 'image' ? 'image-item' : 'text-item'
      }`}
      draggable
      onDragStart={(e) => {
        if (e.button !== 0) {
          e.preventDefault();
          return;
        }
      
        onDragStart(item.id);
      }}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      title={`Drag ${item.label}`}
    >
      {item.image ? (
        <img src={item.image} alt={item.label} />
      ) : (
        <span>{item.label}</span>
      )}
    </div>
  );
}