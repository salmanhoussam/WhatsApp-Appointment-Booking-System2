import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

// ── Status columns per module ─────────────────────────────────────────────────

const RESTAURANT_COLUMNS = [
  { key: 'pending',   label: 'معلّقة',         color: '#f59e0b' },
  { key: 'preparing', label: 'قيد التحضير',    color: '#3b82f6' },
  { key: 'ready',     label: 'جاهزة',           color: '#8b5cf6' },
  { key: 'delivered', label: 'تم التسليم',      color: '#10b981' },
  { key: 'cancelled', label: 'ملغية',           color: '#ef4444' },
]

const STORE_COLUMNS = [
  { key: 'pending',    label: 'معلّقة',         color: '#f59e0b' },
  { key: 'processing', label: 'قيد المعالجة',   color: '#3b82f6' },
  { key: 'shipped',    label: 'تم الشحن',       color: '#8b5cf6' },
  { key: 'delivered',  label: 'تم التسليم',     color: '#10b981' },
  { key: 'refunded',   label: 'مسترد',          color: '#6366f1' },
  { key: 'cancelled',  label: 'ملغي',           color: '#ef4444' },
]

const RESTAURANT_TRANSITIONS = {
  pending:   new Set(['preparing', 'cancelled']),
  preparing: new Set(['ready',     'cancelled']),
  ready:     new Set(['delivered', 'cancelled']),
  delivered: new Set(),
  cancelled: new Set(),
}

const STORE_TRANSITIONS = {
  pending:    new Set(['processing', 'cancelled']),
  processing: new Set(['shipped',    'cancelled']),
  shipped:    new Set(['delivered']),
  delivered:  new Set(['refunded']),
  refunded:   new Set(),
  cancelled:  new Set(),
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupByStatus(orders, moduleKey) {
  const cols = moduleKey === 'restaurant' ? RESTAURANT_COLUMNS : STORE_COLUMNS
  const result = Object.fromEntries(cols.map(c => [c.key, []]))
  for (const order of orders) {
    if (order.status in result) result[order.status].push(order)
  }
  return result
}

function findOrderStatus(cols, orderId) {
  for (const [status, list] of Object.entries(cols)) {
    if (list.some(o => o.id === orderId)) return status
  }
  return null
}

function moveCard(cols, orderId, fromStatus, toStatus) {
  const order = (cols[fromStatus] ?? []).find(o => o.id === orderId)
  if (!order) return cols
  return {
    ...cols,
    [fromStatus]: (cols[fromStatus] ?? []).filter(o => o.id !== orderId),
    [toStatus]:   [...(cols[toStatus] ?? []), { ...order, status: toStatus }],
  }
}

function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
}

function fmtPrice(val, currency) {
  if (val == null) return '—'
  const n = Number(val)
  if (Number.isNaN(n)) return '—'
  return currency ? `${n.toLocaleString('ar-SA')} ${currency}` : n.toLocaleString('ar-SA')
}

// ── KanbanCard (pure display) ─────────────────────────────────────────────────

function KanbanCard({ order, color, currency, canCancel, onCancel, isOverlay = false }) {
  return (
    <div style={{
      background:    isOverlay ? 'rgba(20,20,30,0.96)' : 'rgba(255,255,255,0.04)',
      border:        `1px solid ${isOverlay ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius:  10,
      padding:       '10px 12px',
      cursor:        isOverlay ? 'grabbing' : 'grab',
      userSelect:    'none',
      transform:     isOverlay ? 'rotate(1.5deg) scale(1.03)' : 'none',
      boxShadow:     isOverlay ? '0 16px 40px rgba(0,0,0,0.5)' : 'none',
      position:      'relative',
      fontFamily:    "'Cairo', sans-serif",
      direction:     'rtl',
      transition:    'box-shadow 0.15s ease',
    }}>
      {/* Cancel button */}
      {canCancel && !isOverlay && (
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onCancel(order.id) }}
          style={{
            position:     'absolute', top: 7, left: 8,
            width: 18, height: 18,
            background:   'rgba(239,68,68,0.15)',
            border:       '1px solid rgba(239,68,68,0.3)',
            borderRadius: 4, cursor: 'pointer', color: '#ef4444',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, lineHeight: 1, padding: 0,
          }}
          title="إلغاء الطلب"
        >
          ✕
        </button>
      )}

      {/* Customer */}
      <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4, paddingLeft: canCancel ? 22 : 0 }}>
        {order.customer_name || order.customer_phone || 'زبون'}
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>
          {fmtPrice(order.total_price, currency)}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {order.table_number && (
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
              طاولة {order.table_number}
            </span>
          )}
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
            {fmtTime(order.created_at)}
          </span>
        </div>
      </div>

      {/* Items count */}
      {order.items?.length > 0 && (
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>
          {order.items.length} عنصر
        </div>
      )}
    </div>
  )
}

// ── DraggableCard ─────────────────────────────────────────────────────────────

function DraggableCard({ order, color, currency, canCancel, onCancel }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: order.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform:  CSS.Translate.toString(transform),
        opacity:    isDragging ? 0 : 1,
        transition: isDragging ? 'none' : 'opacity 0.15s ease',
      }}
      {...listeners}
      {...attributes}
    >
      <KanbanCard
        order={order}
        color={color}
        currency={currency}
        canCancel={canCancel}
        onCancel={onCancel}
      />
    </div>
  )
}

// ── DroppableColumn ───────────────────────────────────────────────────────────

function DroppableColumn({ col, orders, color, currency, transitions, onCancel, activeId }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key })
  const activeStatus = activeId ? findOrderStatus(
    Object.fromEntries([[col.key, orders]]),
    activeId
  ) : null
  const isDragTarget = isOver && activeId && activeStatus !== col.key

  return (
    <div style={{
      display:       'flex',
      flexDirection: 'column',
      minWidth:      220,
      width:         220,
      flexShrink:    0,
    }}>
      {/* Column header */}
      <div style={{
        display:      'flex',
        alignItems:   'center',
        gap:           8,
        marginBottom:  10,
        direction:    'rtl',
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: col.color, flexShrink: 0,
        }} />
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: "'Cairo', sans-serif", flex: 1 }}>
          {col.label}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 700,
          background: `${col.color}22`,
          color:       col.color,
          borderRadius: 10, padding: '1px 7px',
          border: `1px solid ${col.color}44`,
          fontFamily: "'Cairo', sans-serif",
        }}>
          {orders.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        style={{
          flex:          1,
          minHeight:     120,
          background:    isDragTarget ? `${col.color}0d` : 'rgba(255,255,255,0.02)',
          border:        `1px solid ${isDragTarget ? `${col.color}55` : 'rgba(255,255,255,0.05)'}`,
          borderRadius:  12,
          padding:       8,
          display:       'flex',
          flexDirection: 'column',
          gap:           8,
          transition:    'background 0.2s ease, border-color 0.2s ease',
          overflowY:     'auto',
          maxHeight:     480,
        }}
      >
        {orders.map(order => (
          <DraggableCard
            key={order.id}
            order={order}
            color={color}
            currency={currency}
            canCancel={transitions[order.status]?.has('cancelled') ?? false}
            onCancel={onCancel}
          />
        ))}

        {orders.length === 0 && (
          <div style={{
            flex:       1,
            display:    'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize:   11,
            color:      'rgba(255,255,255,0.12)',
            fontFamily: "'Cairo', sans-serif",
            pointerEvents: 'none',
          }}>
            لا توجد طلبات
          </div>
        )}
      </div>
    </div>
  )
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function KanbanSkeleton({ count = 4 }) {
  return (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{
          minWidth: 220, width: 220,
          background: 'rgba(255,255,255,0.02)',
          border:     '1px solid rgba(255,255,255,0.05)',
          borderRadius: 12, padding: 10,
        }}>
          <div style={{ height: 12, width: '70%', background: 'rgba(255,255,255,0.06)', borderRadius: 6, marginBottom: 12 }} />
          {[1,2].map(j => (
            <div key={j} style={{
              height: 62, background: 'rgba(255,255,255,0.04)',
              borderRadius: 8, marginBottom: 8,
            }} />
          ))}
        </div>
      ))}
    </div>
  )
}

// ── KanbanBoard ───────────────────────────────────────────────────────────────
/**
 * Props:
 *   moduleKey      'restaurant' | 'store'
 *   color          tenant primary_color
 *   currency       e.g. 'USD'
 *   orders         array of order objects from API
 *   onStatusChange async (orderId, newStatus) → void  (throws on API error)
 *   isLoading      boolean
 *   onRefresh      () → void  (optional)
 */
export default function KanbanBoard({ moduleKey, color, currency, orders = [], onStatusChange, isLoading, onRefresh }) {
  const [columns, setColumns]     = useState(() => groupByStatus(orders, moduleKey))
  const [activeId, setActiveId]   = useState(null)
  const [activeOrder, setActiveOrder] = useState(null)
  const snapshotRef = useRef(null)

  // Sync columns when orders prop or moduleKey changes
  useEffect(() => {
    setColumns(groupByStatus(orders, moduleKey))
  }, [orders, moduleKey])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 6 } }),
  )

  const colDefs = useMemo(
    () => moduleKey === 'restaurant' ? RESTAURANT_COLUMNS : STORE_COLUMNS,
    [moduleKey]
  )
  const transitions = useMemo(
    () => moduleKey === 'restaurant' ? RESTAURANT_TRANSITIONS : STORE_TRANSITIONS,
    [moduleKey]
  )

  const handleDragStart = useCallback(({ active }) => {
    setActiveId(active.id)
    for (const list of Object.values(columns)) {
      const found = list.find(o => o.id === active.id)
      if (found) { setActiveOrder(found); break }
    }
    snapshotRef.current = columns
  }, [columns])

  const handleDragEnd = useCallback(({ active, over }) => {
    setActiveId(null)
    setActiveOrder(null)
    if (!over) return

    const fromStatus = findOrderStatus(columns, active.id)
    const toStatus   = over.id

    if (!fromStatus || fromStatus === toStatus) return

    const allowed = transitions[fromStatus] ?? new Set()
    if (!allowed.has(toStatus)) return

    setColumns(prev => moveCard(prev, active.id, fromStatus, toStatus))
    onStatusChange?.(active.id, toStatus).catch(() => setColumns(snapshotRef.current))
  }, [columns, transitions, onStatusChange])

  const handleCancel = useCallback((orderId) => {
    const fromStatus = findOrderStatus(columns, orderId)
    if (!fromStatus) return
    const snapshot = columns
    setColumns(prev => moveCard(prev, orderId, fromStatus, 'cancelled'))
    onStatusChange?.(orderId, 'cancelled').catch(() => setColumns(snapshot))
  }, [columns, onStatusChange])

  if (isLoading) return <KanbanSkeleton count={colDefs.length} />

  if (moduleKey === 'catalog') {
    return (
      <div style={{
        background:  'rgba(255,255,255,0.02)',
        border:      '1px solid rgba(255,255,255,0.05)',
        borderRadius: 12, padding: '32px 24px',
        textAlign:   'center', fontFamily: "'Cairo', sans-serif",
        color:       'rgba(255,255,255,0.3)', fontSize: 13,
      }}>
        الكاتالوج لا يحتوي على طلبات
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   14,
        direction:      'rtl',
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.7)', fontFamily: "'Cairo', sans-serif" }}>
          كانبان الطلبات
        </span>
        {onRefresh && (
          <button
            onClick={onRefresh}
            style={{
              background:  'transparent',
              border:      `1px solid ${color}44`,
              borderRadius: 8, color, cursor: 'pointer',
              fontSize: 11, padding: '4px 12px',
              fontFamily: "'Cairo', sans-serif",
              transition:  'background 0.15s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.background = `${color}18`}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            تحديث
          </button>
        )}
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div style={{
          display:    'flex',
          gap:        12,
          overflowX:  'auto',
          paddingBottom: 8,
        }}>
          {colDefs.map(col => (
            <DroppableColumn
              key={col.key}
              col={col}
              orders={columns[col.key] ?? []}
              color={color}
              currency={currency}
              transitions={transitions}
              onCancel={handleCancel}
              activeId={activeId}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeOrder ? (
            <KanbanCard
              order={activeOrder}
              color={color}
              currency={currency}
              isOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
