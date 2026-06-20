import React, { useState, useEffect, useMemo } from 'react'
import Navigation from '../components/Navigation'
import api from '../services/api'

export default function PuntoVentaPage() {
  // ── ESTADOS DEL COMPONENTE ──
  const [almacenes, setAlmacenes] = useState([])
  const [almacenSeleccionado, setAlmacenSeleccionado] = useState('')
  const [productos, setProductos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [ticketNo, setTicketNo] = useState('')
  const [cart, setCart] = useState([])
  const [metodoPago, setMetodoPago] = useState('tarjeta') // tarjeta, efectivo
  
  // UI States
  const [loading, setLoading] = useState(false)
  const [loadingProductos, setLoadingProductos] = useState(false)
  const [errorMensaje, setErrorMensaje] = useState('')
  const [successVenta, setSuccessVenta] = useState(null) // Para el modal de ticket de cobro
  const [showReceiptModal, setShowReceiptModal] = useState(false)

  // Fecha y hora dinámica para la cabecera
  const [fechaActual, setFechaActual] = useState(new Date())

  // Actualizar la hora cada minuto
  useEffect(() => {
    const timer = setInterval(() => {
      setFechaActual(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  const fechaFormateada = useMemo(() => {
    const opciones = { day: 'numeric', month: 'short', year: 'numeric' }
    const fechaStr = fechaActual.toLocaleDateString('es-ES', opciones)
    const horaStr = fechaActual.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    // Reemplazar el punto en el mes abreviado si existe (ej. jun. -> jun)
    return `${fechaStr.replace('.', '')} · ${horaStr}`
  }, [fechaActual])

  // ── CARGAR ALMACENES E INICIAR POS ──
  useEffect(() => {
    const cargarDatosIniciales = async () => {
      setLoading(true)
      try {
        // Cargar almacenes
        const resAlmacenes = await api.get('/inventario/almacenes')
        if (resAlmacenes.data?.status === 'success') {
          const listaAlmacenes = resAlmacenes.data.data || []
          setAlmacenes(listaAlmacenes)
          if (listaAlmacenes.length > 0) {
            setAlmacenSeleccionado(listaAlmacenes[0].id)
          }
        }
        
        // Cargar número de ticket sugerido
        await actualizarSiguienteTicket()
      } catch (err) {
        console.error('Error al cargar datos iniciales del POS:', err)
        setErrorMensaje('No se pudieron cargar los datos de inicio. Verifica la conexión con la base de datos.')
      } finally {
        setLoading(false)
      }
    }
    cargarDatosIniciales()
  }, [])

  // ── CARGAR PRODUCTOS AL CAMBIAR DE ALMACÉN O BÚSQUEDA ──
  useEffect(() => {
    if (!almacenSeleccionado) return

    const cargarProductos = async () => {
      setLoadingProductos(true)
      try {
        const res = await api.get('/inventario/productos', {
          params: {
            almacen_id: almacenSeleccionado,
            busqueda: busqueda
          }
        })
        
        // La API devuelve un array envuelto en un objeto Resource
        // Si hay una estructura res.data.data
        if (res.data) {
          setProductos(res.data.data || [])
        }
      } catch (err) {
        console.error('Error al cargar productos para el almacén:', err)
      } finally {
        setLoadingProductos(false)
      }
    }

    // Debounce simple para la búsqueda
    const delayDebounce = setTimeout(() => {
      cargarProductos()
    }, 250)

    return () => clearTimeout(delayDebounce)
  }, [almacenSeleccionado, busqueda])

  // Obtener el siguiente ticket de venta
  const actualizarSiguienteTicket = async () => {
    try {
      const resTicket = await api.get('/pos/siguiente-ticket')
      if (resTicket.data?.status === 'success') {
        setTicketNo(resTicket.data.siguiente_ticket)
      } else {
        setTicketNo('V-2000')
      }
    } catch (err) {
      console.warn('Error al obtener el número de ticket:', err)
      setTicketNo('V-' + (Math.floor(Math.random() * 9000) + 1000))
    }
  }

  // ── ACCIONES DEL CARRITO/TICKET ──
  
  // Agregar producto al ticket
  const agregarAlCarrito = (producto) => {
    if (producto.stock <= 0) return

    setCart((prevCart) => {
      const itemExistente = prevCart.find((item) => item.producto.id === producto.id)
      
      if (itemExistente) {
        // Validar si la cantidad supera el stock disponible
        if (itemExistente.cantidad >= producto.stock) {
          setErrorMensaje(`No hay suficiente stock para '${producto.nombre}'. Stock máximo: ${producto.stock}`)
          return prevCart
        }
        return prevCart.map((item) =>
          item.producto.id === producto.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        )
      } else {
        return [...prevCart, { producto, cantidad: 1 }]
      }
    })
  }

  // Cambiar cantidad de un producto
  const cambiarCantidad = (productoId, delta, maxStock) => {
    setCart((prevCart) => {
      return prevCart.map((item) => {
        if (item.producto.id === productoId) {
          const nuevaCantidad = item.cantidad + delta
          if (nuevaCantidad <= 0) return null // Eliminar si la cantidad llega a 0
          if (nuevaCantidad > maxStock) {
            setErrorMensaje(`No puedes agregar más de las existencias disponibles (${maxStock} uds.)`)
            return item
          }
          return { ...item, cantidad: nuevaCantidad }
        }
        return item
      }).filter(Boolean)
    })
  }

  // Quitar producto del ticket
  const quitarDelCarrito = (productoId) => {
    setCart((prevCart) => prevCart.filter((item) => item.producto.id !== productoId))
  }

  // Limpiar ticket por completo
  const limpiarTicket = () => {
    setCart([])
    setErrorMensaje('')
  }

  // ── CÁLCULOS DEL TICKET ──
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.producto.precio_venta * item.cantidad, 0)
  }, [cart])

  const iva = useMemo(() => {
    return subtotal * 0.16
  }, [subtotal])

  const total = useMemo(() => {
    return subtotal + iva
  }, [subtotal, iva])

  // Formateador de moneda en pesos mexicanos o similar (sin centavos para coincidir con la imagen)
  const formatPrice = (value) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value)
  }

  // ── REGISTRAR LA VENTA (COBRAR) ──
  const handleCobrar = async () => {
    if (cart.length === 0) {
      setErrorMensaje('Agrega al menos un producto al ticket antes de cobrar.')
      return
    }

    setLoading(true)
    setErrorMensaje('')

    const payload = {
      almacen_id: Number(almacenSeleccionado),
      metodo_pago: metodoPago,
      productos: cart.map((item) => ({
        producto_id: item.producto.id,
        cantidad: item.cantidad
      }))
    }

    try {
      const res = await api.post('/pos/ventas', payload)
      if (res.data?.status === 'success') {
        const ventaRealizada = res.data.data
        setSuccessVenta(ventaRealizada)
        setShowReceiptModal(true)
        
        // Limpiar carrito y actualizar estados
        setCart([])
        await actualizarSiguienteTicket()
        
        // Recargar stock de productos de inmediato
        const resProductos = await api.get('/inventario/productos', {
          params: { almacen_id: almacenSeleccionado, busqueda: busqueda }
        })
        if (resProductos.data) {
          setProductos(resProductos.data.data || [])
        }
      } else {
        setErrorMensaje(res.data?.message || 'Error al procesar la venta.')
      }
    } catch (err) {
      console.error('Error al procesar cobro:', err)
      const errorMsg = err.response?.data?.message || 'Error en el servidor al guardar la venta.'
      setErrorMensaje(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  // Imprimir recibo
  const handleImprimir = () => {
    window.print()
  }

  return (
    <div 
      className="flex min-h-screen bg-slate-100 font-sans antialiased" 
      style={{ 
        '--text-h': '#0f172a', 
        '--text': '#334155',
        color: '#334155'
      }}
    >
      {/* Barra de Navegación Lateral */}
      <Navigation />

      {/* ── SECCIÓN CENTRAL: BUSCADOR Y CUADRÍCULA DE PRODUCTOS ── */}
      <main className="flex-1 min-w-0 flex flex-col p-8 overflow-y-auto print:hidden">
        
        {/* Cabecera del Punto de Venta */}
        <header className="flex flex-row items-center justify-between mb-6 pb-4 border-b border-slate-300 gap-4">
          <div>
            <div className="text-lg font-black text-slate-900 tracking-tight m-0 select-none">
              Punto de Venta
            </div>
            <p className="text-slate-600 font-bold text-xs mt-0.5 select-none">
              {fechaFormateada}
            </p>
          </div>

          {/* Selector de Almacén */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 select-none">
              📍 Almacén:
            </span>
            <select
              id="select-almacen"
              value={almacenSeleccionado}
              onChange={(e) => setAlmacenSeleccionado(e.target.value)}
              className="bg-white border border-slate-300 text-slate-900 text-xs font-bold rounded-lg px-3 py-1.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
            >
              {almacenes.map((almacen) => (
                <option key={almacen.id} value={almacen.id}>
                  {almacen.nombre}
                </option>
              ))}
            </select>
          </div>
        </header>

        {/* Buscador de Productos */}
        <div className="relative mb-6 shadow-sm rounded-2xl">
          <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Buscar producto o SKU..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-white border border-slate-300 text-slate-900 placeholder-slate-500 font-bold rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-base"
          />
        </div>

        {/* Mensaje de Error */}
        {errorMensaje && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-2xl mb-6 flex items-start gap-3 shadow-sm">
            <svg className="h-5 w-5 mt-0.5 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-extrabold text-sm">{errorMensaje}</span>
            <button onClick={() => setErrorMensaje('')} className="ml-auto text-red-600 hover:text-red-800 font-bold text-xs select-none cursor-pointer">
              Ocultar
            </button>
          </div>
        )}

        {/* Header que separa la selección del producto del inventario */}
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-300">
          <div className="text-sm font-black text-slate-800 tracking-tight m-0 select-none">
            Seleccionar Productos del Inventario
          </div>
          <span className="text-xs text-slate-800 font-black bg-slate-200 border border-slate-300 px-3 py-1.5 rounded-lg select-none">
            {productos.length} {productos.length === 1 ? 'disponible' : 'disponibles'}
          </span>
        </div>

        {/* Listado de Productos (Grid) */}
        {loadingProductos ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 font-medium">
            <svg className="animate-spin h-8 w-8 text-indigo-500 mb-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Buscando productos...</span>
          </div>
        ) : productos.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white border border-dashed border-slate-200 rounded-3xl text-slate-400 font-medium shadow-inner">
            <svg className="h-12 w-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span className="text-slate-500 font-bold">No se encontraron productos</span>
            <p className="text-slate-400 text-xs mt-1">Intenta con otra búsqueda o selecciona otro almacén.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {productos.map((prod) => {
              const sinStock = prod.stock <= 0
              return (
                <div
                  key={prod.id}
                  onClick={() => !sinStock && agregarAlCarrito(prod)}
                  className={`bg-white border border-slate-300 rounded-2xl p-5 shadow-sm select-none transition-all ${
                    sinStock
                      ? 'opacity-60 cursor-not-allowed filter grayscale-[20%]'
                      : 'hover:shadow-md hover:border-slate-400 active:scale-98 hover:-translate-y-0.5 cursor-pointer'
                  }`}
                >
                  {/* SKU */}
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    {prod.sku}
                  </span>

                  {/* Nombre */}
                  <div className="text-[13px] font-bold text-slate-900 mt-1 h-10 line-clamp-2 leading-tight">
                    {prod.nombre}
                  </div>

                  {/* Fila inferior: Precio y Stock */}
                  <div className="flex items-center justify-between mt-5 pt-3 border-t border-slate-200">
                    <span className="text-indigo-600 font-extrabold text-[17px] tracking-tight">
                      {formatPrice(prod.precio_venta)}
                    </span>

                    <span
                      className={`text-[11px] font-black px-2 py-0.5 rounded-lg border ${
                        sinStock
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : prod.stock <= (prod.stock_minimo || 2)
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {sinStock ? 'Agotado' : `${prod.stock} uds.`}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* ── SECCIÓN LATERAL DERECHA: TICKET DE VENTA ── */}
      <section className="w-[420px] border-l border-slate-300 bg-white flex flex-col h-screen sticky top-0 shadow-lg z-10 print:hidden" style={{ color: '#0f172a' }}>
        
        {/* Encabezado del Ticket */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between flex-shrink-0 select-none">
          <div className="text-sm font-black text-slate-950">
            Ticket #{ticketNo || 'N/A'}
          </div>
          {cart.length > 0 && (
            <button
              onClick={limpiarTicket}
              className="text-slate-600 hover:text-red-600 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer select-none active:scale-95"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Limpiar
            </button>
          )}
        </div>

        {/* Listado de Productos en el Ticket */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 select-none text-center">
              <svg className="h-16 w-16 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              <span className="font-extrabold text-sm text-slate-700">Ticket Vacío</span>
              <p className="text-slate-500 text-xs mt-1.5 max-w-xs">
                Selecciona productos del catálogo de la izquierda para agregarlos al ticket de cobro.
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.producto.id} className="flex justify-between items-start gap-3 pb-4 border-b border-slate-200 last:border-0 last:pb-0">
                
                {/* Nombre e info básica */}
                <div className="flex-1 min-w-0">
                  <div className="text-slate-900 font-bold text-[12.5px] leading-snug truncate">
                    {item.producto.nombre}
                  </div>
                  <p className="text-slate-600 text-xs font-bold mt-1">
                    {formatPrice(item.producto.precio_venta)} x {item.cantidad}
                  </p>
                </div>

                {/* Controles de cantidad y precio */}
                <div className="flex items-center gap-3">
                  
                  {/* Selector +/- */}
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden flex-shrink-0">
                    <button
                      onClick={() => cambiarCantidad(item.producto.id, -1, item.producto.stock)}
                      className="px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 font-bold text-xs select-none transition-colors cursor-pointer"
                    >
                      –
                    </button>
                    <span className="px-2 text-slate-800 font-bold text-[12px] min-w-[20px] text-center">
                      {item.cantidad}
                    </span>
                    <button
                      onClick={() => cambiarCantidad(item.producto.id, 1, item.producto.stock)}
                      className="px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 font-bold text-xs select-none transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  {/* Total del Producto */}
                  <span className="font-bold text-slate-900 text-[13px] min-w-[70px] text-right">
                    {formatPrice(item.producto.precio_venta * item.cantidad)}
                  </span>

                  {/* Quitar item */}
                  <button
                    onClick={() => quitarDelCarrito(item.producto.id)}
                    className="text-slate-350 hover:text-red-500 transition-colors p-0.5 cursor-pointer"
                    title="Eliminar de ticket"
                  >
                    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Resumen Financiero y Acciones */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex-shrink-0 select-none">
          
          {/* Subtotal, IVA y Total */}
          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-slate-700 font-bold text-xs">
              <span>Subtotal</span>
              <span className="font-extrabold">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-700 font-bold text-xs">
              <span>IVA 16%</span>
              <span className="font-extrabold">{formatPrice(iva)}</span>
            </div>
            <div className="flex justify-between text-slate-950 font-black text-lg pt-2 border-t border-slate-300">
              <span>Total</span>
              <span className="text-indigo-600 font-black">{formatPrice(total)}</span>
            </div>
          </div>

          {/* Método de Pago */}
          <div className="mb-6">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 block mb-2">
              Método de Pago
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMetodoPago('efectivo')}
                className={`py-2 px-1 text-center font-black text-[12px] rounded-xl border transition-all active:scale-95 cursor-pointer ${
                  metodoPago === 'efectivo'
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-600/10'
                    : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100'
                }`}
              >
                Efectivo
              </button>
              <button
                type="button"
                onClick={() => setMetodoPago('tarjeta')}
                className={`py-2 px-1 text-center font-black text-[12px] rounded-xl border transition-all active:scale-95 cursor-pointer ${
                  metodoPago === 'tarjeta'
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-600/10'
                    : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100'
                }`}
              >
                Tarjeta
              </button>
            </div>
          </div>

          {/* Botones de Cobro / Impresión */}
          <div className="flex gap-3">
            <button
              onClick={handleCobrar}
              disabled={loading || cart.length === 0}
              className={`flex-1 py-4 px-6 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 cursor-pointer ${
                cart.length === 0
                  ? 'bg-slate-200 border border-slate-300 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-indigo-600 border border-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/10'
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Procesando...
                </>
              ) : (
                <>
                  <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Cobrar
                </>
              )}
            </button>
            
            <button
              type="button"
              onClick={() => {
                if (successVenta) {
                  setShowReceiptModal(true)
                } else {
                  setErrorMensaje('Realiza una venta para poder imprimir el ticket.')
                }
              }}
              title="Reimprimir último ticket"
              className="p-4 bg-white border border-slate-300 hover:bg-slate-100 text-slate-900 rounded-xl flex items-center justify-center transition-colors shadow-sm active:scale-95 cursor-pointer"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </button>
          </div>

        </div>
      </section>

      {/* ── MODAL DEL TICKET DE RECIBO (COMPROBANTE DE COMPRA) ── */}
      {showReceiptModal && successVenta && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all select-none">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] relative overflow-hidden animate-in fade-in zoom-in duration-200">
            
            {/* Cabecera del recibo */}
            <div className="text-center pb-5 border-b border-dashed border-slate-200 flex-shrink-0">
              <div className="h-12 w-12 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-500 mb-3 shadow-inner">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-slate-900 font-black text-base tracking-tight">Venta Exitosa</div>
              <p className="text-slate-500 text-xs font-semibold mt-1">¡Gracias por su compra!</p>
            </div>

            {/* Cuerpo del recibo (Scrollable) */}
            <div className="flex-1 overflow-y-auto py-5 space-y-4 my-1 print:p-0">
              
              {/* Metadatos del ticket */}
              <div className="text-center space-y-1.5 text-xs text-slate-500 font-semibold bg-slate-50/70 p-3 rounded-2xl border border-slate-100/50">
                <div className="flex justify-between">
                  <span>Ticket</span>
                  <span className="text-slate-800 font-extrabold">{successVenta.numero_ticket}</span>
                </div>
                <div className="flex justify-between">
                  <span>Fecha/Hora</span>
                  <span className="text-slate-800">
                    {successVenta.created_at ? new Date(successVenta.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Almacén</span>
                  <span className="text-slate-800">{successVenta.almacen?.nombre || 'General'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pago</span>
                  <span className="text-slate-800 capitalize">{successVenta.metodo_pago}</span>
                </div>
              </div>

              {/* Lista de productos vendidos */}
              <div className="space-y-3">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block pb-1 border-b border-slate-100">
                  Detalle de Productos
                </span>
                
                {successVenta.detalles?.map((det) => (
                  <div key={det.id} className="flex justify-between items-start text-xs font-medium gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-800 font-bold leading-tight">{det.producto?.nombre}</p>
                      <p className="text-slate-400 text-[10px] font-semibold mt-0.5">
                        {formatPrice(det.precio_unitario)} x {det.cantidad}
                      </p>
                    </div>
                    <span className="text-slate-800 font-extrabold flex-shrink-0">
                      {formatPrice(det.subtotal)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Resumen total */}
              <div className="pt-4 border-t border-dashed border-slate-200 space-y-1.5 text-xs font-semibold text-slate-500">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-slate-800">{formatPrice(successVenta.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA 16%</span>
                  <span className="text-slate-800">{formatPrice(successVenta.iva)}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-100">
                  <span>Total</span>
                  <span className="text-indigo-600">{formatPrice(successVenta.total)}</span>
                </div>
              </div>

            </div>

            {/* Acciones del recibo */}
            <div className="pt-4 border-t border-slate-100 flex gap-3 flex-shrink-0 print:hidden">
              <button
                type="button"
                onClick={handleImprimir}
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-600/10 active:scale-95"
              >
                <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Imprimir
              </button>
              
              <button
                type="button"
                onClick={() => setShowReceiptModal(false)}
                className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer active:scale-95"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── SECCIÓN DE ESTILOS CSS EXCLUSIVOS PARA IMPRESIÓN ── */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
          }
          .fixed, .fixed * {
            visibility: visible;
          }
          .fixed {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            background: white !important;
            display: block !important;
          }
          .print\\:hidden, .print\\:hidden * {
            display: none !important;
          }
          button {
            display: none !important;
          }
          .rounded-3xl {
            border-radius: 0 !important;
            border: none !important;
          }
        }
      `}</style>

    </div>
  )
}
