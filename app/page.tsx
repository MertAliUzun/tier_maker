
'use client'

import { useEffect, useRef, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  closestCenter,
  pointerWithin,
  CollisionDetection,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  GripVertical,
  ImagePlus,
  Layers3,
  Moon,
  Palette,
  Plus,
  RotateCcw,
  Search,
  Share2,
  Sun,
  Type,
  Upload,
  X,
  Gamepad2,
  Trash2,
  Film
} from 'lucide-react'
import { toPng } from 'html-to-image'

type Mode = 'text' | 'image' | 'game' | 'movie'

type Item = {
  id: string
  label: string
  image?: string
  tierId: string | null
}

type Tier = {
  id: string
  name: string
  color: string
}

const initialTiers: Tier[] = [
  { id: 's', name: 'S', color: '#FF6B57' },
  { id: 'a', name: 'A', color: '#FFB547' },
  { id: 'b', name: 'B', color: '#F3D34A' },
  { id: 'c', name: 'C', color: '#A6C95C' },
  { id: 'd', name: 'D', color: '#77B6A3' },
]

const initialItems: Item[] = [
  {
    id: 't1',
    label: 'Midnight ramen',
    tierId: 's',
  },
  {
    id: 't2',
    label: 'Sunday reset',
    tierId: 'a',
  },
  {
    id: 't3',
    label: 'Analog cameras',
    tierId: 'b',
  },
  {
    id: 't4',
    label: 'Late night walks',
    tierId: null,
  },
  {
    id: 't5',
    label: 'Tiny rituals',
    tierId: null,
  },
  {
    id: 't6',
    label: 'Good playlists',
    tierId: null,
  },
  {
    id: 't7',
    label: 'Window seats',
    tierId: null,
  },
]

  const initialImages: Item[] = []
  const initialMovies: Item[] = []

export default function Page() {
  const [mode, setMode] = useState<Mode>('game')
  const [dark, setDark] = useState(true)
  const [steamProfileUrl, setSteamProfileUrl] = useState("");
  const [steamLoading, setSteamLoading] = useState(false);
  const [steamError, setSteamError] = useState("");
  const [manualGameName, setManualGameName] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState("");
  const [isCapturing, setIsCapturing] = useState(false)

  type ModeTiers = Record<Mode, Tier[]>
  const emptyModeTiers = (): ModeTiers => ({
    text: initialTiers.map((tier) => ({ ...tier })),
    image: initialTiers.map((tier) => ({ ...tier })),
    game: initialTiers.map((tier) => ({ ...tier })),
    movie: initialTiers.map((tier) => ({ ...tier })),
  })

  const [tiersByMode, setTiersByMode] = useState<ModeTiers>(() => {
    if (typeof window === 'undefined') return emptyModeTiers()

    const saved = localStorage.getItem('tierly-tiers-by-mode')
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Partial<ModeTiers>
        const defaults = emptyModeTiers()
        return {
          text: parsed.text ?? defaults.text,
          image: parsed.image ?? defaults.image,
          game: parsed.game ?? defaults.game,
          movie: parsed.movie ?? defaults.movie,
        }
      } catch {
        // Fall through to the legacy migration below.
      }
    }

    const legacy = localStorage.getItem('tierly-tiers')
    if (legacy) {
      try {
        const legacyTiers = JSON.parse(legacy) as Tier[]
        return { text: legacyTiers, image: legacyTiers, game: legacyTiers, movie: legacyTiers }
      } catch {
        // Use defaults when legacy data is invalid.
      }
    }

    return emptyModeTiers()
  })

  const tiers = tiersByMode[mode]
  const setTiers: React.Dispatch<React.SetStateAction<Tier[]>> = (updater) => {
    setTiersByMode((current) => {
      const next = typeof updater === 'function' ? updater(current[mode]) : updater
      return { ...current, [mode]: next }
    })
  }

  const [items, setItems] = useState<Item[]>(() => {
    if (typeof window === 'undefined') {
      return initialItems
    }

    const saved = localStorage.getItem('tierly-items')

    if (!saved) {
      return initialItems
    }

    try {
      return JSON.parse(saved)
    } catch {
      return initialItems
    }
  })

  const [images, setImages] = useState<Item[]>(() => {
    if (typeof window === 'undefined') {
      return initialImages
    }

    const saved = localStorage.getItem('tierly-images')

    if (!saved) {
      return initialImages
    }

    try {
      return JSON.parse(saved)
    } catch {
      return initialImages
    }
  })

  const [movies, setMovies] = useState<Item[]>(() => {
    if (typeof window === 'undefined') {
      return initialMovies
    }

    const saved = localStorage.getItem('tierly-movies')

    if (!saved) {
      return initialMovies
    }

    try {
      return JSON.parse(saved)
    } catch {
      return initialMovies
    }
  })

  useEffect(() => {
    localStorage.setItem(
      'tierly-tiers-by-mode',
      JSON.stringify(tiersByMode)
    )
  }, [tiersByMode])

  useEffect(() => {
    localStorage.setItem(
      'tierly-items',
      JSON.stringify(items)
    )
  }, [items])

  useEffect(() => {
    localStorage.setItem(
      'tierly-images',
      JSON.stringify(images)
    )
  }, [images])

  useEffect(() => {
    localStorage.setItem(
      'tierly-movies',
      JSON.stringify(movies)
    )
  }, [movies])

  const [query, setQuery] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)

  const textRef = useRef<HTMLInputElement>(null)
  const csvRef = useRef<HTMLInputElement>(null)
  const tierListRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  )

  const visibleItems =
    mode === 'text'
      ? items
      : mode === 'movie'
        ? movies
        : images

  const ranked = visibleItems.filter(
    (item) => item.tierId !== null
  ).length

  const unranked = visibleItems.filter(
    (item) =>
      item.tierId === null &&
      item.label
        .toLowerCase()
        .includes(query.toLowerCase())
  )

  function setCurrentItems(
    updater: (current: Item[]) => Item[]
  ) {
    if (mode === 'text') {
      setItems(updater)
    } else if (mode === 'movie') {
      setMovies(updater)
    } else {
      setImages(updater)
    }
  }

  
  const collisionDetectionStrategy: CollisionDetection = (
    args
  ) => {
    const pointerCollisions = pointerWithin(args)

    if (pointerCollisions.length > 0) {
      return pointerCollisions
    }

    return closestCenter(args)
  }

  /*
   * ---------------------------------------------------------
   * DRAG START
   * ---------------------------------------------------------
   */
  function handleDragStart(event: any) {
    setActiveId(String(event.active.id))
  }

  /*
   * ---------------------------------------------------------
   * DRAG CANCEL
   * ---------------------------------------------------------
   */
  function handleDragCancel() {
    setActiveId(null)
  }

  /*
   * ---------------------------------------------------------
   * DRAG END
   * ---------------------------------------------------------
   */
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    setActiveId(null)

    if (!over) {
      return
    }

    const activeId = String(active.id)
    const overId = String(over.id)

    // =======================================================
// DROP TO TRASH
// =======================================================

if (overId === "trash-drop-zone") {
  const draggedTier = tiers.some(
    (tier) => tier.id === activeId
  );

  // Tier çöp kutusuna bırakılamaz
  if (draggedTier) {
    return;
  }

  setCurrentItems((current) =>
    current.filter(
      (item) => item.id !== activeId
    )
  );

  return;
}

    /*
     * =======================================================
     * TIER DRAG
     * =======================================================
     */

    const draggedTier = tiers.some(
      (tier) => tier.id === activeId
    )

    if (draggedTier) {
      /*
       * Tier'ı sadece başka bir tier'ın üzerine
       * bıraktığımızda sıralıyoruz.
       */
      if (activeId === overId) {
        return
      }

      const targetTierId = overId.startsWith('tier-drop-')
        ? overId.replace('tier-drop-', '')
        : overId

      setTiers((current) => {
        const oldIndex = current.findIndex(
          (tier) => tier.id === activeId
        )

        const newIndex = current.findIndex(
          (tier) => tier.id === targetTierId
        )

        if (
          oldIndex === -1 ||
          newIndex === -1
        ) {
          return current
        }

        return arrayMove(
          current,
          oldIndex,
          newIndex
        )
      })

      return
    }

    /*
     * =======================================================
     * ITEM DRAG
     * =======================================================
     */

    setCurrentItems((current) => {
      const activeIndex = current.findIndex(
        (item) => item.id === activeId
      )

      if (activeIndex === -1) {
        return current
      }

      const draggedItem = current[activeIndex]

      /*
       * -----------------------------------------------------
       * DROP TO UNRANKED
       * -----------------------------------------------------
       */

      if (overId === 'unranked-drop-zone') {
        const next = [...current]

        const [moved] = next.splice(
          activeIndex,
          1
        )

        next.push({
          ...moved,
          tierId: null,
        })

        return next
      }

      if (overId.startsWith('tier-drop-')) {
        const targetTierId =
          overId.replace('tier-drop-', '')

        /*
         * Geçerli tier mı?
         */
        const targetTierExists = tiers.some(
          (tier) => tier.id === targetTierId
        )

        if (!targetTierExists) {
          return current
        }

        const next = [...current]

        const [moved] = next.splice(
          activeIndex,
          1
        )

        moved.tierId = targetTierId

        let insertIndex = next.length

        for (
          let i = next.length - 1;
          i >= 0;
          i--
        ) {
          if (
            next[i].tierId === targetTierId
          ) {
            insertIndex = i + 1
            break
          }
        }

        next.splice(
          insertIndex,
          0,
          moved
        )

        return next
      }

      /*
       * -----------------------------------------------------
       * DROP ON ANOTHER ITEM
       * -----------------------------------------------------
       */

      const overIndex = current.findIndex(
        (item) => item.id === overId
      )

      if (overIndex === -1) {
        return current
      }

      const targetItem = current[overIndex]

      /*
       * Kendi üzerine bırakıldı.
       */

      if (activeId === targetItem.id) {
        return current
      }

      /*
       * -----------------------------------------------------
       * SAME TIER
       * -----------------------------------------------------
       */

      if (
        draggedItem.tierId ===
        targetItem.tierId
      ) {
        return arrayMove(
          current,
          activeIndex,
          overIndex
        )
      }

      const next = [...current]

      const [moved] = next.splice(
        activeIndex,
        1
      )

      moved.tierId =
        targetItem.tierId

      /*
       * Active item çıkarıldığı için target'ın
       * yeni index'ini tekrar buluyoruz.
       */

      const targetIndex =
        next.findIndex(
          (item) =>
            item.id === targetItem.id
        )

      if (targetIndex === -1) {
        return current
      }

      /*
       * Target item'ın önüne koy.
       */

      next.splice(
        targetIndex,
        0,
        moved
      )

      return next
    })
  }

  /*
   * ---------------------------------------------------------
   * ADD TEXT
   * ---------------------------------------------------------
   */

  function addText() {
    const value =
      textRef.current?.value.trim()

    if (!value) {
      return
    }

    setItems((current) => [
      ...current,
      {
        id: `t-${Date.now()}`,
        label: value,
        tierId: null,
      },
    ])

    if (textRef.current) {
      textRef.current.value = ''
    }
  }

  /*
   * ---------------------------------------------------------
   * ADD TIER
   * ---------------------------------------------------------
   */

  function addTier() {
    const colors = [
      '#B38CFF',
      '#FF8AB7',
      '#7DC8FF',
      '#FF9364',
    ]

    setTiers((current) => [
      ...current,
      {
        id: `tier-${Date.now()}`,
        name: 'NEW',
        color:
          colors[
            current.length %
              colors.length
          ],
      },
    ])
  }

  function TrashDropZone({
    activeId,
    tiers,
  }: {
    activeId: string | null;
    tiers: Tier[];
  }) {
    const { setNodeRef, isOver } = useDroppable({
      id: "trash-drop-zone",
    });
  
    const isTierDragging = tiers.some(
      (tier) => tier.id === activeId
    );
  
    const active = isOver && !isTierDragging;
  
    return (
      <button
        ref={setNodeRef}
        type="button"
        className={`delete-unranked ${
          active ? "trash-active" : ""
        }`}
        title="Drag items here to delete"
      >
        <Trash2 size={17} />
      </button>
    );
  }

  const captureTierList = async () => {
    if (!tierListRef.current || isCapturing) return
  
    setIsCapturing(true)
  
    // UI'ın loading ekranını göstermesine izin ver
    await new Promise((resolve) => setTimeout(resolve, 100))
  
    try {
      const element = tierListRef.current
  
      const dataUrl = await toPng(element, {
        pixelRatio: 2,
        width: element.scrollWidth,
        height: element.scrollHeight,
        style: {
          maxHeight: 'none',
          height: `${element.scrollHeight}px`,
          overflow: 'visible',
        },
      })
  
      const link = document.createElement('a')
      link.download = 'tier-list.png'
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error('Tier list export failed:', error)
    } finally {
      setIsCapturing(false)
    }
  }

  const importManualGame = async () => {
    if (!manualGameName.trim()) return;
  
    setManualError("");
    setManualLoading(true);
  
    try {
      const response = await fetch("/api/steam/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "manual",
          gameName: manualGameName.trim(),
        }),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        setManualError(
          data.message ||
            data.error ||
            "Game import failed."
        );
        return;
      }
  
      const item: Item = data.item;
  
      // Mevcut oyunların yanına ekle
      setImages((prev) => {
        // Aynı oyun zaten varsa tekrar ekleme
        if (prev.some((existing) => existing.id === item.id)) {
          return prev;
        }
  
        return [...prev, item];
      });
  
      // Input'u temizle
      setManualGameName("");
    } catch (error) {
      console.error(error);
      setManualError("Failed to import game.");
    } finally {
      setManualLoading(false);
    }
  };

  const importSteamGames = async () => {
    setSteamError("");
    setSteamLoading(true);
  
    try {
      const response = await fetch("/api/steam/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profileUrl: steamProfileUrl,
        }),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        setSteamError(data.message || data.error || "Steam import failed.");
        return;
      }

      
      const steamGames: Item[] = data.items;

      setImages(steamGames);
      console.log("Steam games:", data.items);
  
      // Burada mevcut unranked item state'ine ekleyeceğiz.
      // Örneğin:
      // setItems(prev => [...prev, ...data.items]);
  
    } catch (error) {
      console.error(error);
      setSteamError("Something went wrong while importing Steam games.");
    } finally {
      setSteamLoading(false);
    }
  };

  function reset() {
    setTiersByMode(emptyModeTiers())
    setItems(initialItems)
    setImages(initialImages)
    setMovies(initialMovies)
    setQuery('')
  }

  function removeTier(tierId: string) {
    setTiers((current) => current.filter((tier) => tier.id !== tierId))
    setCurrentItems((current) =>
      current.map((item) =>
        item.tierId === tierId ? { ...item, tierId: null } : item
      )
    )
  }

  /*
   * ---------------------------------------------------------
   * DELETE UNRANKED
   * ---------------------------------------------------------
   */

  function deleteUnranked() {
    setCurrentItems((current) =>
      current.filter(
        (item) => item.tierId !== null
      )
    )

    setQuery('')
  }

  /*
   * ---------------------------------------------------------
   * CSV PARSER
   * ---------------------------------------------------------
   */

  function parseCsvLine(
    line: string
  ): string[] {
    const cells: string[] = []
    let current = ''
    let insideQuotes = false

    for (
      let i = 0;
      i < line.length;
      i++
    ) {
      const char = line[i]

      if (char === '"') {
        if (
          insideQuotes &&
          line[i + 1] === '"'
        ) {
          current += '"'
          i++
        } else {
          insideQuotes =
            !insideQuotes
        }
      } else if (
        char === ',' &&
        !insideQuotes
      ) {
        cells.push(
          current.trim()
        )
        current = ''
      } else {
        current += char
      }
    }

    cells.push(
      current.trim()
    )

    return cells
  }

  function escapeCsvValue(value: string) {
    if (
      value.includes(',') ||
      value.includes('"') ||
      value.includes('\n')
    ) {
      return `"${value.replace(/"/g, '""')}"`
    }
  
    return value
  }
  
  function saveTierList() {
    const header =
      'name,image_url,tier,tier_order, tier_color'
  
    const rows = visibleItems.map((item) => {
      // Item'ın bulunduğu tier'ı bul
      const tier = tiers.find(
        (t) => t.id === item.tierId
      )
  
      // Tier yoksa Unranked
      const tierName =
        tier?.name ?? 'unranked'
  
      // Tier'ın mevcut listedeki sırası
      const tierOrder = tier
        ? tiers.findIndex(
            (t) => t.id === tier.id
          )
        : -1
  
      return [
        escapeCsvValue(item.label),
        escapeCsvValue(item.image!),
        escapeCsvValue(tierName),
        tierOrder.toString(),
        escapeCsvValue(tier?.color ?? ''),
      ].join(',')
    })
  
    const csv = [
      header,
      ...rows,
    ].join('\n')
  
    const blob = new Blob(
      [csv],
      {
        type: 'text/csv;charset=utf-8;',
      }
    )
  
    const url =
      URL.createObjectURL(blob)
  
    const link =
      document.createElement('a')
  
    link.href = url
    link.download =
      'tier-list.csv'
  
    document.body.appendChild(link)
  
    link.click()
  
    document.body.removeChild(link)
  
    URL.revokeObjectURL(url)
  }

  function loadTierListCsv(file?: File) {
    if (!file) {
      return
    }
  
    const reader = new FileReader()
  
    reader.onload = () => {
      const text = String(reader.result)
  
      const lines = text
        .split(/\r?\n/)
        .filter((line) => line.trim() !== '')
  
      if (lines.length < 2) {
        console.error('CSV is empty or contains no data')
        return
      }
  
      // -----------------------------
      // HEADERS
      // -----------------------------
  
      const headers = parseCsvLine(lines[0]).map(
        (header) =>
          header
            .replace(/^"|"$/g, '')
            .trim()
            .toLowerCase()
      )
  
      const nameIndex = headers.indexOf('name')
      const imageIndex = headers.indexOf('image_url')
      const tierIndex = headers.indexOf('tier')
      const tierOrderIndex =
        headers.indexOf('tier_order')
      const tierColorIndex =
        headers.indexOf('tier_color')
  
      if (
        nameIndex === -1 ||
        imageIndex === -1 ||
        tierIndex === -1 ||
        tierOrderIndex === -1
      ) {
        console.error(
          'CSV must contain name, image_url, tier and tier_order columns'
        )
        return
      }
  
      // -----------------------------
      // CSV SATIRLARINI OKU
      // -----------------------------
  
      type CsvItem = {
        name: string
        image: string
        tier: string
        tierOrder: number
        tierColor: string
      }
  
      const csvItems: CsvItem[] = []
  
      for (const line of lines.slice(1)) {
        const cells = parseCsvLine(line)
  
        const name =
          cells[nameIndex]
            ?.trim()
            .replace(/^"|"$/g, '')
  
        const image =
          cells[imageIndex]
            ?.trim()
            .replace(/^"|"$/g, '')
  
        const tier =
          cells[tierIndex]
            ?.trim()
            .replace(/^"|"$/g, '')
  
        const tierOrderString =
          cells[tierOrderIndex]
            ?.trim()
            .replace(/^"|"$/g, '')

        const tierColor =
        tierColorIndex !== -1
          ? cells[tierColorIndex]
              ?.trim()
              .replace(/^"|"$/g, '')
          : ''
  
        if (!name || !image) {
          continue
        }
  
        const tierOrder =
          Number.parseInt(
            tierOrderString,
            10
          )
  
          csvItems.push({
            name,
            image,
            tier: tier || 'unranked',
            tierOrder:
              Number.isNaN(tierOrder)
                ? -1
                : tierOrder,
            tierColor: tierColor || '',
          })
      }
  
      if (!csvItems.length) {
        console.error(
          'No valid items found in CSV'
        )
        return
      }
  
      // -----------------------------
      // CSV'DEKİ TIERLARI ÇIKAR
      // -----------------------------
  
      const tierMap = new Map<
        string,
        number
      >()
  
      for (const item of csvItems) {
        const tierName =
          item.tier.trim()
  
        if (
          !tierName ||
          tierName.toLowerCase() ===
            'unranked'
        ) {
          continue
        }
  
        const existingOrder =
          tierMap.get(tierName)
  
        // Aynı tier birden fazla item'da
        // bulunabilir. İlk order'ı koruyoruz.
        if (
          existingOrder === undefined ||
          item.tierOrder < existingOrder
        ) {
          tierMap.set(
            tierName,
            item.tierOrder
          )
        }
      }
  
      // -----------------------------
      // TIERLARI SIRALA
      // -----------------------------
  
      const sortedTierNames =
        Array.from(
          tierMap.entries()
        )
          .sort(
            ([, orderA], [, orderB]) =>
              orderA - orderB
          )
          .map(
            ([name]) => name
          )
  
      // -----------------------------
      // YENİ TIERLARI OLUŞTUR
      // -----------------------------
  
      const newTiers = sortedTierNames.map(
        (name, index) => {
          const csvTier = csvItems.find(
            (item) =>
              item.tier
                .trim()
                .toLowerCase() ===
              name
                .trim()
                .toLowerCase()
          )
      
          return {
            id:
              `tier-${Date.now()}-${index}`,
      
            name,
      
            color:
              csvTier?.tierColor ||
              '#FF6B57',
          }
        }
      )
  
      // -----------------------------
      // TIER NAME → TIER ID
      // -----------------------------
  
      const tierNameToId =
        new Map<string, string>()
  
      newTiers.forEach((tier) => {
        tierNameToId.set(
          tier.name.trim().toLowerCase(),
          tier.id
        )
      })
  
      // -----------------------------
      // ITEMLARI OLUŞTUR
      // -----------------------------
  
      const imported: Item[] =
        csvItems.map(
          (item, index) => {
            const tierName =
              item.tier
                .trim()
                .toLowerCase()
  
            const tierId =
              tierName ===
                'unranked'
                ? null
                : tierNameToId.get(
                    tierName
                  ) ?? null
  
            return {
              id:
                `game-${Date.now()}-${index}`,
  
              label: item.name,
  
              image: item.image,
  
              tierId,
            }
          }
        )
  
      // -----------------------------
      // STATE'LERİ GÜNCELLE
      // -----------------------------
  
      setTiers(newTiers)
      if (mode === 'movie') {
        setMovies(imported)
      } else {
        setImages(imported)
      }
    }
  
    reader.readAsText(file)
  }

  function loadCsv(file?: File) {
    if (!file) {
      return
    }

    const reader =
      new FileReader()

    reader.onload = () => {
      const lines =
        String(reader.result)
          .split(/\r?\n/)
          .filter(Boolean)

      if (!lines.length) {
        return
      }

      const headers =
        parseCsvLine(lines[0]).map(
          (header) =>
            header
              .replace(
                /^"|"$/g,
                ''
              )
              .trim()
              .toLowerCase()
        )

      const nameIndex = headers.indexOf(
        mode === 'movie' ? 'movie name' : 'name'
      )

      const imageIndex = headers.indexOf(
        mode === 'movie' ? 'image link' : 'image_url_medium'
      )

      if (nameIndex === -1 || imageIndex === -1) {
        console.error(
          mode === 'movie'
            ? 'Movie CSV must contain movie name and image link columns'
            : 'CSV must contain name and image_url_medium columns'
        )
        return
      }

      const imported: Item[] =
        lines
          .slice(1)
          .map(
            (
              line,
              index
            ): Item | null => {
              const cells =
                parseCsvLine(line)

              const name =
                cells[
                  nameIndex
                ]?.trim()

              const image =
                cells[
                  imageIndex
                ]?.trim()

              if (
                !name ||
                !image
              ) {
                return null
              }

              return {
                id:
                  `${mode}-${Date.now()}-${index}`,
                label: name,
                image,
                tierId: null,
              }
            }
          )
          .filter(
            (
              item
            ): item is Item =>
              item !== null
          )

      if (mode === 'movie') {
        setMovies(imported)
      } else {
        setImages(imported)
      }
    }

    reader.readAsText(file)
  }

  const modeLabel =
    mode === 'game'
      ? 'Game mode'
      : mode === 'movie'
        ? 'Movie mode'
        : mode === 'image'
          ? 'Image mode'
          : 'Text mode'

  const activeItem =
    visibleItems.find(
      (item) =>
        item.id === activeId
    )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={
        collisionDetectionStrategy
      }
      onDragStart={
        handleDragStart
      }
      onDragCancel={
        handleDragCancel
      }
      onDragEnd={
        handleDragEnd
      }
    >
      <main
        className={
          dark
            ? 'app dark'
            : 'app'
        }
      >
        <header className="site-header">
          <div className="brand">
            <span className="brand-mark">
              <Layers3 />
            </span>

            <span>
              tierly
            </span>

            <span className="brand-dot" />
          </div>

          <div className="header-actions">
            <button
              className="icon-button"
              aria-label="Toggle dark mode"
              onClick={() =>
                setDark(!dark)
              }
            >
              {dark ? (
                <Sun />
              ) : (
                <Moon />
              )}
            </button>

            <button
              className="icon-button"
              aria-label="Share tier list"
            >
              <Share2 />
            </button>

            <button className="avatar">
              JD
            </button>
          </div>
        </header>

        <div className="workspace">
          <section className="intro">
            <div>
              <h1>
                Make your{' '}
                <em>
                  definitive
                </em>{' '}
                list.
              </h1>
            </div>
          </section>

          <div className="modebar">
            <div
              className="mode-switch"
              role="group"
              aria-label="Content mode"
            >
              <button
                className={
                  mode === 'text'
                    ? 'mode-active'
                    : ''
                }
                onClick={() =>
                  setMode('text')
                }
              >
                <Type />
                Text mode
              </button>

              <button
                className={
                  mode === 'image'
                    ? 'mode-active'
                    : ''
                }
                onClick={() =>
                  setMode('image')
                }
              >
                <ImagePlus />
                Image mode
              </button>

              <button
                className={
                  mode === 'game'
                    ? 'mode-active'
                    : ''
                }
                onClick={() =>
                  setMode('game')
                }
              >
                <Gamepad2 />
                Game mode
              </button>

              <button
                className={
                  mode === 'movie'
                    ? 'mode-active'
                    : ''
                }
                onClick={() =>
                  setMode('movie')
                }
              >
                <Film />
                Movie mode
              </button>
            </div>

            <div className="toolbar-actions">
              <label className="load-tier-button">
                <span>↑</span>
                Tier List Yükle

                <input
                  type="file"
                  accept=".csv"
                  hidden
                  onChange={(e) =>
                    loadTierListCsv(
                      e.target.files?.[0]
                    )
                  }
                />
              </label>
              <button
                className="save-tier-button"
                onClick={saveTierList}
              >
                <span>↓</span>
                Tier List'i Kaydet
              </button>
            </div> 
          </div>

          <div className="content-grid">
            <section className="board-card">
              <div className="board-heading">
                <div>
                  <span className="section-kicker">
                    THE BOARD ·{' '}
                    {modeLabel.toUpperCase()}
                  </span>
                  <h2>
                    {mode === 'game'
                      ? 'My game collection'
                      : mode === 'movie'
                        ? 'My movie collection'
                        : 'My everyday essentials'}
                  </h2>

                      
                </div>

                <span className="count-pill">
                  {ranked} ranked{' '}
                  <span>/</span>{' '}
                  {visibleItems.length}
                </span>
              </div>
              <div ref={tierListRef} className="tier-list">
                <SortableContext
                  items={tiers.map(
                    (tier) =>
                      tier.id
                  )}
                  strategy={
                    verticalListSortingStrategy
                  }
                >
                  {tiers.map(
                    (tier) => (
                      <TierRow
                        key={tier.id}
                        tier={tier}
                        items={visibleItems}
                        setTiers={
                          setTiers
                        }
                        onRemove={() => removeTier(tier.id)}
                      />
                    )
                  )}
                </SortableContext>
              </div>
              <div className= "tier-list-bottom-buttons">
              <button
                className="add-tier"
                onClick={addTier}
              >
                <Plus />
                Add tier
              </button>
              <button
                className="capture-button"
                onClick={captureTierList}
                disabled={isCapturing}
              >
                <span className="capture-button-icon">
                  {isCapturing ? '⏳' : '↓'}
                </span>

                <span>
                  {isCapturing ? 'Creating Image...' : 'Save as Image'}
                </span>
              </button>
              </div>  
            </section>

            <section className="pool-card">
              <div className="pool-header">
                <div>
                  <span className="section-kicker">
                    UNRANKED
                  </span>

                  <h3>
                    {mode === 'game'
                      ? 'Game items'
                      : mode === 'movie'
                        ? 'Movie items'
                        : 'Drag to place'}
                  </h3>
                </div>

                <div className="pool-header-actions">
                  <span className="pool-count">
                    {unranked.length}{' '}
                    items
                  </span>
                </div>
              </div>

              <div className="search-box">
                <Search />

                <input
                  placeholder={
                    mode === 'game'
                      ? 'Search games...'
                      : mode === 'movie'
                        ? 'Search movies...'
                        : 'Search unranked items...'
                  }
                  value={query}
                  onChange={(e) =>
                    setQuery(
                      e.target.value
                    )
                  }
                />
              </div>

              <UnrankedDropZone>
                <SortableContext
                  items={unranked.map(
                    (item) =>
                      item.id
                  )}
                  strategy={
                    horizontalListSortingStrategy
                  }
                >
                  {unranked.map(
                    (item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        mode={
                          mode === 'text'
                            ? 'text'
                            : 'image'
                        }
                      />
                    )
                  )}
                </SortableContext>
              </UnrankedDropZone>

              {mode === 'text' && (
                <div className="add-text">
                  <input
                    ref={textRef}
                    placeholder="Add a new item..."
                    onKeyDown={(e) => {
                      if (
                        e.key ===
                        'Enter'
                      ) {
                        addText()
                      }
                    }}
                  />

                  <button
                    onClick={
                      addText
                    }
                  >
                    <Plus />
                  </button>
                </div>
              )}

              {mode === 'game' && (
                <>
                  <div className="import-games">
  <div className="import-games-header">
    <div>
      <h3>Import Games</h3>
      <p>
        Add games to your tier list from Steam or a CSV file.
      </p>
    </div>
  </div>

  <div className="import-options">

    {/* Steam */}
    <div className="import-option steam-option">
      <div className="import-option-header">
        <div className="import-option-icon">
          ♨
        </div>

        <div>
          <h4>Steam</h4>
          <p>Import your Steam library</p>
        </div>
      </div>

      <div className="steam-import-form">
        <input
          type="text"
          value={steamProfileUrl}
          onChange={(e) =>
            setSteamProfileUrl(e.target.value)
          }
          placeholder="Steam profile URL"
        />

        <button
          onClick={importSteamGames}
          disabled={
            steamLoading ||
            !steamProfileUrl.trim()
          }
        >
          {steamLoading ? (
            <>
              <span className="steam-spinner" />
              Importing...
            </>
          ) : (
            <>
              <span>↓</span>
              Import
            </>
          )}
        </button>
      </div>

      {steamError && (
        <p className="steam-error">
          {steamError}
        </p>
      )}
    </div>

    {/* CSV */}
    <div className="import-option csv-option">

      <div className="import-option-header">
        <div className="import-option-icon">
          <Upload size={19} />
        </div>

        <div>
          <h4>CSV File</h4>
          <p>Import games from a CSV</p>
        </div>
      </div>

      <input
        ref={csvRef}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={(e) =>
          loadCsv(e.target.files?.[0])
        }
      />

      <button
        className="csv-upload-button"
        onClick={() =>
          csvRef.current?.click()
        }
      >
        <Upload size={17} />
        Choose CSV File
      </button>

      <span className="csv-format">
        name + image_url_medium
      </span>

    </div>

  </div>
  {/* Manual */}
<div className="import-option manual-option">
  <div className="import-option-header">
    <div className="import-option-icon">
      ✎
    </div>

    <div>
      <h4>Manual</h4>
      <p>Add a game by name</p>
    </div>
  </div>

  <div className="manual-import-row">
    <div className="manual-import-form">
      <input
        type="text"
        value={manualGameName}
        onChange={(e) => {
          setManualGameName(e.target.value);
          setManualError("");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            importManualGame();
          }
        }}
        placeholder="Game name"
      />

      <button
        onClick={importManualGame}
        disabled={
          manualLoading ||
          !manualGameName.trim()
        }
      >
        {manualLoading ? (
          <>
            <span className="steam-spinner" />
            Searching...
          </>
        ) : (
          <>
            <span>+</span>
            Add
          </>
        )}
      </button>
    </div>

    <TrashDropZone
      activeId={activeId}
      tiers={tiers}
    />
  </div>

  {manualError && (
    <p className="steam-error">
      {manualError}
    </p>
  )}
</div>
</div>
                </>
              )}

              {mode === 'movie' && (
                <div className="import-games">
                  <div className="import-games-header">
                    <div>
                      <h3>Import Movies</h3>
                      <p>Import movies from a CSV file.</p>
                    </div>
                  </div>

                  <div className="import-option csv-option">
                    <div className="import-option-header">
                      <div className="import-option-icon">
                        <Upload size={19} />
                      </div>
                      <div>
                        <h4>CSV File</h4>
                        <p>Import your movie collection</p>
                      </div>
                    </div>

                    <input
                      ref={csvRef}
                      type="file"
                      accept=".csv,text/csv"
                      hidden
                      onChange={(e) => loadCsv(e.target.files?.[0])}
                    />

                    <button
                      className="csv-upload-button"
                      onClick={() => csvRef.current?.click()}
                    >
                      <Upload size={17} />
                      Choose CSV File
                    </button>

                    <span className="csv-format">
                      movie name + image link
                    </span>
                  </div>
                </div>
              )}

              {mode === 'image' && (
                <button
                  className="upload-button"
                >
                  <Upload />
                  Upload images

                  <span>
                    PNG, JPG up to 10MB
                  </span>
                </button>
              )}
            </section>
          </div>
        </div>
        </main>

        {isCapturing && (
          <div className="capture-overlay">
            <div className="capture-modal">
              <div className="capture-spinner"></div>
        
              <div className="capture-modal-content">
                <h3>Creating Your Image</h3>
        
                <p>
                  Please wait while we create your tier list image.
                </p>
        
                <span>
                  This may take a moment...
                </span>
              </div>
            </div>
          </div>
        )}
      <DragOverlay>
        {activeItem ? (
          <div
            className={`item-card ${
              mode !== 'text'
                ? 'image-item'
                : 'text-item'
            }`}
          >
            {activeItem.image ? (
              <img
                src={
                  activeItem.image
                }
                alt={
                  activeItem.label
                }
              />
            ) : (
              <span>
                {
                  activeItem.label
                }
              </span>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

/*
 * =========================================================
 * TIER ROW
 * =========================================================
 */

function TierRow({
  tier,
  items,
  setTiers,
  onRemove,
}: {
  tier: Tier
  items: Item[]
  setTiers: React.Dispatch<
    React.SetStateAction<Tier[]>
  >
  onRemove: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: tier.id,
  })

  /*
   * BU KISIM ÇOK ÖNEMLİ.
   *
   * Her tier'ın drop-zone'u bağımsız bir
   * droppable alan.
   *
   * Boş olsa bile bu alan var.
   */

  const {
    setNodeRef: setDropRef,
    isOver,
  } = useDroppable({
    id: `tier-drop-${tier.id}`,
  })

  const tierItems =
    items.filter(
      (item) =>
        item.tierId === tier.id
    )

  const rowStyle = {
    transform:
      CSS.Transform.toString(
        transform
      ),
    transition,
    opacity:
      isDragging
        ? 0.45
        : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={rowStyle}
      className={
        `tier-row ${
          isOver
            ? 'tier-drop-target'
            : ''
        }`
      }
      {...attributes}
    >
      <div
        className="tier-label"
        style={{
          background:
            tier.color,
        }}
      >
        <div
          className="tier-grip"
          {...listeners}
        >
          <GripVertical />
        </div>

        <input
          value={tier.name}
          onChange={(e) =>
            setTiers(
              (current) =>
                current.map(
                  (
                    currentTier
                  ) =>
                    currentTier.id ===
                    tier.id
                      ? {
                          ...currentTier,
                          name:
                            e.target
                              .value,
                        }
                      : currentTier
                )
            )
          }
        />

        <label
          className="color-control"
          title="Change tier color"
        >
          <Palette />

          <input
            className="color-input"
            type="color"
            value={
              tier.color
            }
            onChange={(e) =>
              setTiers(
                (current) =>
                  current.map(
                    (
                      currentTier
                    ) =>
                      currentTier.id ===
                      tier.id
                        ? {
                            ...currentTier,
                            color:
                              e.target
                                .value,
                          }
                        : currentTier
                  )
              )
            }
          />
        </label>

        <button
          className="remove-tier"
          aria-label={
            `Remove ${tier.name} tier`
          }
          onClick={
            onRemove
          }
        >
          <X />
        </button>
      </div>

      {/*
       * -----------------------------------------------------
       * TIER DROP ZONE
       * -----------------------------------------------------
       *
       * setDropRef doğrudan drop-zone'a veriliyor.
       *
       * Böylece:
       *
       * Dolu tier  -> item'ın olduğu alan
       * Boş tier   -> boş alan
       *
       * ikisi de aynı tier-drop-ID'sini kullanıyor.
       */}

      <div
        ref={setDropRef}
        className="drop-zone"
      >
        {tierItems.length > 0 ? (
          <SortableContext
            items={tierItems.map(
              (item) =>
                item.id
            )}
            strategy={
              horizontalListSortingStrategy
            }
          >
            {tierItems.map(
              (item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  mode={
                    item.image
                      ? 'image'
                      : 'text'
                  }
                />
              )
            )}
          </SortableContext>
        ) : (
          <span className="drop-hint">
            Drop items here
          </span>
        )}
      </div>
    </div>
  )
}


function ItemCard({
  item,
  mode,
}: {
  item: Item
  mode: 'text' | 'image'
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
  })

  const [imageError, setImageError] = useState(false)

  const style = {
    transform:
      CSS.Transform.toString(
        transform
      ),
    transition,
    opacity:
      isDragging
        ? 0
        : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`item-card ${
        mode === 'image'
          ? 'image-item'
          : 'text-item'
      }`}
    >
      {item.image && !imageError ? (
        <img
          src={item.image}
          alt={item.label}
          onError={() => setImageError(true)}
        />
      ) : (
        <span>
          {item.label}
        </span>
      )}
    </div>
  )
}

/*
 * =========================================================
 * UNRANKED DROP ZONE
 * =========================================================
 */

function UnrankedDropZone({
  children,
}: {
  children: React.ReactNode
}) {
  const {
    setNodeRef,
    isOver,
  } = useDroppable({
    id: 'unranked-drop-zone',
  })

  return (
    <div
      ref={setNodeRef}
      className={
        `item-pool ${
          isOver
            ? 'tier-drop-target'
            : ''
        }`
      }
    >
      {children}
    </div>
  )
}
