import { useCallback, useEffect, useState } from 'react'

import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'

import { supabase } from '../lib/supabase'

/* =========================
   TYPES & INTERFACES
========================= */
interface Equipo {
  id: string
  nombre: string
}

interface Categoría {
  id: string
  nombre: string
}

interface FilaGrupo {
  id: string
  grupo: string        
  dia: string          
  hora: string         
  fecha_corta: string  
  categoria_id: string | null
  equipo_id: string | null
  equipos: Equipo | null      
}

/* =========================
   PALETA DE COLORES CLAROS
========================= */
const COLORS = {
  background: '#ffffff',   
  primary: '#000000',      
  secondary: '#666666',    
  card: '#f5f5f5',         
  border: '#e5e5e5',       
  white: '#ffffff',
  accent: '#1d7a34',       
  danger: '#dc3545',
  inputBg: '#fafafa',
  warning: '#ff9800',
  disabled: '#cccccc'
}

const GRUPOS_OPCIONES = ['A', 'B', 'C', 'D']

const HORAS_OPCIONES = [
  '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM',
  '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM'
]

const CALENDARIO_OPCIONES = [
  { mes: 'MAYO', dias: ['22 MAY', '23 MAY', '24 MAY', '25 MAY', '26 MAY', '29 MAY', '30 MAY', '31 MAY'] },
  { mes: 'JUNIO', dias: ['05 JUN', '06 JUN', '07 JUN', '12 JUN', '13 JUN', '14 JUN', '19 JUN'] }
]

export default function AsignarGrupoScreen() {
  const [grupos, setGrupos] = useState<FilaGrupo[]>([])
  const [listaEquiposDisponibles, setListaEquiposDisponibles] = useState<Equipo[]>([])
  const [listaCategorias, setListaCategorias] = useState<Categoría[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filtros de navegación
  const [diaSeleccionado, setDiaSeleccionado] = useState<'Viernes' | 'Sábado'>('Viernes')
  const [categoriaSeleccionadaId, setCategoriaSeleccionadaId] = useState<string>('')

  // Modales Principales
  const [modalVisible, setModalVisible] = useState(false)
  const [modalSorteoVisible, setModalSorteoVisible] = useState(false)
  const [guardando, setGuardando] = useState(false)
  
  // Campos crear grupo/partido
  const [formGrupo, setFormGrupo] = useState('A')
  const [formCategoriaId, setFormCategoriaId] = useState('')
  const [formCategoriaNombre, setFormCategoriaNombre] = useState('Seleccionar Categoría')
  const [formHora, setFormHora] = useState('08:00 AM')
  const [formFechaCorta, setFormFechaCorta] = useState('24 MAY')
  const [formDia, setFormDia] = useState<'Viernes' | 'Sábado'>('Viernes')

  // Detalles del grupo para el sorteo de equipos
  const [grupoDestino, setGrupoDestino] = useState<{
    idFilaIdentificadora: string 
    grupo: string
    dia: string
    hora: string
    fecha_corta: string
    categoria_id: string | null
    yaTieneEquipo: boolean
    equiposActuales: number  // NUEVO: Contador de equipos actuales
    estaLleno: boolean        // NUEVO: Si ya tiene 2 equipos
  } | null>(null)

  // Control de sub-modales desplegables
  const [showGrupoSelector, setShowGrupoSelector] = useState(false)
  const [showCategoriaSelector, setShowCategoriaSelector] = useState(false)
  const [showHoraSelector, setShowHoraSelector] = useState(false)
  const [showFechaSelector, setShowFechaSelector] = useState(false)

  // Cargar todos los datos desde Supabase
  const cargarPantalla = useCallback(async () => {
    try {
      setLoading(true)
      
      const { data: dataGrupos, error: errorGrupos } = await supabase
        .from('grupos')
        .select(`
          id,
          grupo,
          dia,
          hora,
          fecha_corta,
          categoria_id,
          equipo_id,
          equipos (
            id,
            nombre
          )
        `)
        .order('id', { ascending: true })

      if (errorGrupos) throw errorGrupos

      const { data: dataCategorias, error: errorCategorias } = await supabase
        .from('categorias')
        .select('id, nombre')
        .order('nombre', { ascending: true })

      if (!errorCategorias && dataCategorias && dataCategorias.length > 0) {
        setListaCategorias(dataCategorias)
        
        // Inicializar el filtro con la primera categoría real si no hay una seleccionada
        setCategoriaSeleccionadaId(prev => prev || dataCategorias[0].id)

        if (!formCategoriaId) {
          setFormCategoriaId(dataCategorias[0].id)
          setFormCategoriaNombre(dataCategorias[0].nombre)
        }
      }

      const { data: dataEquipos, error: errorEquipos } = await supabase
        .from('equipos')
        .select('id, nombre')
        .order('nombre', { ascending: true })

      if (errorEquipos) throw errorEquipos

      setGrupos((dataGrupos as any) || [])
      setListaEquiposDisponibles(dataEquipos || [])

    } catch (error: any) {
      console.error('Error cargando datos:', error)
      Alert.alert('Error base de datos', error.message)
    } finally {
      setLoading(false)
    }
  }, [formCategoriaId])

  useEffect(() => {
    cargarPantalla()
  }, [cargarPantalla])

  // Guardar un bloque vacío
  const guardarNuevoGrupo = async () => {
    try {
      setGuardando(true)
      
      const { error } = await supabase
        .from('grupos')
        .insert([
          {
            grupo: formGrupo,
            dia: formDia,
            hora: formHora,
            fecha_corta: formFechaCorta,
            categoria_id: formCategoriaId || null,
            equipo_id: null 
          }
        ])

      if (error) throw error

      setModalVisible(false)
      cargarPantalla()
    } catch (error: any) {
      Alert.alert('Error al guardar', error.message)
    } finally {
      setGuardando(false)
    }
  }

  const asignarEquipoAGrupo = async (equipoId: string) => {
    if (!grupoDestino) return

    // VERIFICACIÓN: Si el grupo ya está lleno (tiene 2 equipos), no permitir asignar más
    if (grupoDestino.estaLleno) {
      Alert.alert(
        'Grupo Completo',
        `El Grupo ${grupoDestino.grupo} ya tiene 2 equipos asignados. No se pueden agregar más equipos.`
      )
      setModalSorteoVisible(false)
      return
    }

    try {
      setGuardando(true)

      // 1. Buscamos el objeto del equipo completo
      const equipoSeleccionado = listaEquiposDisponibles.find(e => e.id === equipoId)
      if (!equipoSeleccionado) throw new Error("Equipo no encontrado")

      // 2. Accedemos a la tarjeta de grupo usando el ID correcto
      const tarjetaActual = gruposAgrupados[grupoDestino.idFilaIdentificadora]

      // 3. Verificación de duplicados
      const nombreNuevo = equipoSeleccionado.nombre.toLowerCase().trim()
      
      const esDuplicado = tarjetaActual?.equipos_detallados.some((e) => {
        const nombreExistente = e.nombre.toLowerCase().trim()
        return nombreExistente === nombreNuevo
      })

      if (esDuplicado) {
        Alert.alert('Error', `El equipo "${equipoSeleccionado.nombre}" ya está asignado a este grupo.`)
        setGuardando(false)
        return
      }

      // VERIFICACIÓN ADICIONAL: Contar equipos actuales antes de insertar
      const equiposActualesCount = tarjetaActual?.equipos_detallados.length || 0
      
      if (equiposActualesCount >= 2) {
        Alert.alert(
          'Grupo Completo',
          `El Grupo ${grupoDestino.grupo} ya tiene 2 equipos. No se pueden agregar más equipos.`
        )
        setModalSorteoVisible(false)
        setGuardando(false)
        return
      }

      // 4. Ejecución
      if (!grupoDestino.yaTieneEquipo) {
        const { error } = await supabase
          .from('grupos')
          .update({ equipo_id: equipoId })
          .eq('id', grupoDestino.idFilaIdentificadora)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('grupos')
          .insert([{
            grupo: grupoDestino.grupo,
            dia: grupoDestino.dia,
            hora: `${grupoDestino.hora}#${grupoDestino.idFilaIdentificadora}`,
            fecha_corta: grupoDestino.fecha_corta,
            categoria_id: grupoDestino.categoria_id,
            equipo_id: equipoId 
          }])
        if (error) throw error
      }

      setModalSorteoVisible(false)
      cargarPantalla()
    } catch (error: any) {
      Alert.alert('Error al asignar', error.message)
    } finally {
      setGuardando(false)
    }
  }
  
  // Quitar un equipo manteniendo el espacio del horario intacto si es el único de la tarjeta
  const eliminarEquipoDeGrupo = async (idFilaGrupo: string, nombreEquipo: string, esFilaMarcada: boolean, totalEquiposEnTarjeta: number) => {
    Alert.alert(
      'Eliminar Asignación',
      `¿Estás seguro de que deseas quitar a "${nombreEquipo}" de este grupo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!esFilaMarcada && totalEquiposEnTarjeta <= 1) {
                const { error } = await supabase
                  .from('grupos')
                  .update({ equipo_id: null })
                  .eq('id', idFilaGrupo)

                if (error) throw error
              } else {
                const { error } = await supabase
                  .from('grupos')
                  .delete()
                  .eq('id', idFilaGrupo)

                if (error) throw error
              }
              cargarPantalla()
            } catch (error: any) {
              Alert.alert('Error al eliminar', error.message)
            }
          }
        }
      ]
    )
  }

  // Eliminar todas las filas correspondientes a esa tarjeta de grupo por completo
  const eliminarGrupoCompleto = async (idsFilas: string[]) => {
    Alert.alert(
      'Eliminar Tarjeta de Grupo',
      `¿Deseas eliminar este grupo por completo junto con todos sus equipos asignados?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar Todo',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true)
              const { error } = await supabase
                .from('grupos')
                .delete()
                .in('id', idsFilas)

              if (error) throw error
              cargarPantalla()
            } catch (error: any) {
              Alert.alert('Error', error.message)
              setLoading(false)
            }
          }
        }
      ]
    )
  }

  // ==========================================
  // FILTRADO COMPUESTO (DÍA + CATEGORÍA SELECCIONADA)
  // ==========================================
  const datosFiltradosPorDiaYCategoria = grupos.filter((g) => {
    const cumpleDia = g.dia === diaSeleccionado
    const cumpleCategoria = g.categoria_id === categoriaSeleccionadaId
    return cumpleDia && cumpleCategoria
  })

  // ==========================================
  // ALGORITMO DE AGRUPAMIENTO EN TARJETAS
  // ==========================================
  const mapearTarjetasIndependientes = () => {
    const diccionarioTarjetas: { 
      [key: string]: { 
        idFilaOriginal: string,
        grupoLetra: string,
        hora: string, 
        fecha_corta: string, 
        categoria_id: string | null,
        idsFilasAsociadas: string[],
        equipos_detallados: { idFila: string, nombre: string, esMarcada: boolean }[],
        estaLleno: boolean  // NUEVO: Indicador si el grupo está lleno (2 equipos)
      } 
    } = {}

    // Paso 1: Inicializar padres
    datosFiltradosPorDiaYCategoria.forEach(fila => {
      const tieneSufijo = fila.hora && fila.hora.includes('#')
      if (!tieneSufijo) {
        diccionarioTarjetas[fila.id] = {
          idFilaOriginal: fila.id,
          grupoLetra: fila.grupo,
          hora: fila.hora || '--:--',
          fecha_corta: fila.fecha_corta || 'PENDIENTE',
          categoria_id: fila.categoria_id,
          idsFilasAsociadas: [fila.id],
          equipos_detallados: [],
          estaLleno: false
        }

        if (fila.equipo_id && fila.equipos && fila.equipos.nombre) {
          diccionarioTarjetas[fila.id].equipos_detallados.push({
            idFila: fila.id,
            nombre: fila.equipos.nombre,
            esMarcada: false
          })
        }
      }
    })

    // Paso 2: Distribuir hijos con sufijo '#'
    datosFiltradosPorDiaYCategoria.forEach(fila => {
      const tieneSufijo = fila.hora && fila.hora.includes('#')
      if (tieneSufijo) {
        const [horaReal, idPadre] = fila.hora.split('#')
        
        if (diccionarioTarjetas[idPadre]) {
          diccionarioTarjetas[idPadre].idsFilasAsociadas.push(fila.id)
          if (fila.equipos && fila.equipos.nombre) {
            diccionarioTarjetas[idPadre].equipos_detallados.push({
              idFila: fila.id,
              nombre: fila.equipos.nombre,
              esMarcada: true
            })
          }
        } else {
          // Respaldo de tarjeta huérfana en memoria si no encuentra al padre
          if (fila.categoria_id === categoriaSeleccionadaId) {
            diccionarioTarjetas[fila.id] = {
              idFilaOriginal: fila.id,
              grupoLetra: fila.grupo,
              hora: horaReal || '--:--',
              fecha_corta: fila.fecha_corta || 'PENDIENTE',
              categoria_id: fila.categoria_id,
              idsFilasAsociadas: [fila.id],
              equipos_detallados: [{ idFila: fila.id, nombre: fila.equipos?.nombre || '', esMarcada: true }],
              estaLleno: false
            }
          }
        }
      }
    })

    // Paso 3: Calcular si cada grupo está lleno (tiene 2 equipos)
    Object.keys(diccionarioTarjetas).forEach(key => {
      const cantidadEquipos = diccionarioTarjetas[key].equipos_detallados.length
      diccionarioTarjetas[key].estaLleno = cantidadEquipos >= 2
    })

    return diccionarioTarjetas
  }

  const gruposAgrupados = mapearTarjetasIndependientes()
  const llavesDeGrupos = Object.keys(gruposAgrupados).sort()

  // Al abrir el modal de creación, se auto-selecciona la categoría activa en la que está parado
  const abrirModalCrear = () => {
    setFormDia(diaSeleccionado)
    if (categoriaSeleccionadaId) {
      const catEncontrada = listaCategorias.find(c => c.id === categoriaSeleccionadaId)
      if (catEncontrada) {
        setFormCategoriaId(catEncontrada.id)
        setFormCategoriaNombre(catEncontrada.nombre)
      }
    }
    setModalVisible(true)
  }

  // Helper para resolver dinámicamente el color de fondo de la cabecera según el nombre de la categoría
  const obtenerColorEncabezado = (nombreCategoria: string) => {
    const nombreNormalizado = nombreCategoria.toLowerCase().trim()
    if (nombreNormalizado.includes('femenino')) return '#d8b4de'
    if (nombreNormalizado.includes('libre')) return '#a4eda4'
    if (nombreNormalizado.includes('master')) return '#f2f5a6'
    return COLORS.card
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      
      {/* HEADER CON TÍTULO Y BOTÓN DE AÑADIR JUNTOS EN LA PARTE SUPERIOR */}
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Fase de Grupos</Text>
        <TouchableOpacity style={styles.topAddButton} onPress={abrirModalCrear}>
          <Text style={styles.topAddButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* SELECTOR JORNADAS (DÍAS) */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, diaSeleccionado === 'Viernes' && styles.tabButtonActive]}
          onPress={() => setDiaSeleccionado('Viernes')}
        >
          <Text style={[styles.tabText, diaSeleccionado === 'Viernes' && styles.tabTextActive]}>Viernes</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabButton, diaSeleccionado === 'Sábado' && styles.tabButtonActive]}
          onPress={() => setDiaSeleccionado('Sábado')}
        >
          <Text style={[styles.tabText, diaSeleccionado === 'Sábado' && styles.tabTextActive]}>Sábado</Text>
        </TouchableOpacity>
      </View>

      {/* BARRA HORIZONTAL DE FILTRO POR CATEGORÍAS REALES (SIN BOTÓN "TODAS") */}
      <View style={styles.categoriesFilterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
          {listaCategorias.map((cat) => (
            <TouchableOpacity 
              key={cat.id}
              style={[styles.categoryFilterBtn, categoriaSeleccionadaId === cat.id && styles.categoryFilterBtnActive]}
              onPress={() => setCategoriaSeleccionadaId(cat.id)}
            >
              <Text style={[styles.categoryFilterText, categoriaSeleccionadaId === cat.id && styles.categoryFilterTextActive]}>
                {cat.nombre}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* LISTADO DE GRUPOS */}
      <FlatList
        data={llavesDeGrupos}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay grupos asignados en esta sección.</Text>
          </View>
        }
        renderItem={({ item: idTarjeta }) => {
          const infoGrupo = gruposAgrupados[idTarjeta]
          const catEncontrada = listaCategorias.find(c => c.id === infoGrupo.categoria_id)
          const nombreCategoriaAMostrar = catEncontrada ? catEncontrada.nombre : 'Categoría General'
          const backgroundColorDinamico = obtenerColorEncabezado(nombreCategoriaAMostrar)

          return (
            <View style={styles.groupCard}>
              
              {/* ENCABEZADO DEL GRUPO CON COLOR PERSONALIZADO SEGÚN CATEGORÍA */}
              <View style={[styles.groupHeader, { backgroundColor: backgroundColorDinamico }]}>
                <TouchableOpacity 
                  style={{ flex: 1 }}
                  activeOpacity={0.7}
                  onPress={() => {
                    const cantidadEquiposActual = infoGrupo.equipos_detallados.length
                    const estaLleno = cantidadEquiposActual >= 2
                    
                    // Si ya está lleno, mostrar alerta y no abrir el modal
                    if (estaLleno) {
                      Alert.alert(
                        'Grupo Completo',
                        `El Grupo ${infoGrupo.grupoLetra} ya tiene 2 equipos asignados. No se pueden agregar más equipos.`
                      )
                      return
                    }
                    
                    setGrupoDestino({
                      idFilaIdentificadora: infoGrupo.idFilaOriginal,
                      grupo: infoGrupo.grupoLetra,
                      dia: diaSeleccionado,
                      hora: infoGrupo.hora,
                      fecha_corta: infoGrupo.fecha_corta,
                      categoria_id: infoGrupo.categoria_id,
                      yaTieneEquipo: infoGrupo.equipos_detallados.length > 0,
                      equiposActuales: cantidadEquiposActual,
                      estaLleno: estaLleno
                    })
                    setModalSorteoVisible(true)
                  }}
                >
                  <Text style={styles.groupTitleText}>GRUPO {infoGrupo.grupoLetra}</Text>
                  <Text style={styles.subLabelText}>🏆 {nombreCategoriaAMostrar}</Text>
                  
                  {/* NUEVO: Indicador visual de cuántos equipos tiene y si está lleno */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                    <Text style={styles.tapToAddText}>
                      {infoGrupo.equipos_detallados.length}/2 equipos
                    </Text>
                    {infoGrupo.estaLleno && (
                      <Text style={[styles.tapToAddText, { color: COLORS.warning, marginLeft: 8, fontWeight: 'bold' }]}>
                        🔒 COMPLETO
                      </Text>
                    )}
                  </View>
                  
                  {!infoGrupo.estaLleno && (
                    <Text style={styles.tapToAddText}>Toca para añadir equipos</Text>
                  )}
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={styles.timeContainer}>
                    <Text style={styles.timeText}>{infoGrupo.hora}</Text>
                    <Text style={styles.dateText}>{infoGrupo.fecha_corta}</Text>
                  </View>

                  <TouchableOpacity 
                    style={styles.deleteGroupButton}
                    onPress={() => eliminarGrupoCompleto(infoGrupo.idsFilasAsociadas)}
                  >
                    <Text style={styles.deleteGroupIcon}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* LISTA DE EQUIPOS ASIGNADOS */}
              <View style={styles.teamsContainer}>
                {infoGrupo.equipos_detallados.length > 0 ? (
                  infoGrupo.equipos_detallados.map((itemEquipo, index) => (
                    <View 
                      key={itemEquipo.idFila} 
                      style={[styles.teamRow, index === infoGrupo.equipos_detallados.length - 1 && { borderBottomWidth: 0 }]}
                    >
                      <View style={styles.teamInfoLeft}>
                        <Text style={styles.teamIndex}>{(index + 1).toString().padStart(2, '0')}</Text>
                        <Text style={styles.teamName} numberOfLines={1}>{itemEquipo.nombre}</Text>
                      </View>
                      
                      <TouchableOpacity 
                        style={styles.deleteButton} 
                        onPress={() => eliminarEquipoDeGrupo(itemEquipo.idFila, itemEquipo.nombre, itemEquipo.esMarcada, infoGrupo.equipos_detallados.length)}
                        activeOpacity={0.6}
                      >
                        <Text style={styles.deleteButtonIcon}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <TouchableOpacity
                    onPress={() => {
                      setGrupoDestino({
                        idFilaIdentificadora: infoGrupo.idFilaOriginal,
                        grupo: infoGrupo.grupoLetra,
                        dia: diaSeleccionado,
                        hora: infoGrupo.hora,
                        fecha_corta: infoGrupo.fecha_corta,
                        categoria_id: infoGrupo.categoria_id,
                        yaTieneEquipo: false,
                        equiposActuales: 0,
                        estaLleno: false
                      })
                      setModalSorteoVisible(true)
                    }}
                  >
                    <Text style={styles.noTeamsText}>Presiona aquí para agregar equipos...</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )
        }}
      />

      {/* MODAL PRINCIPAL DE CREACIÓN */}
      <Modal animationType="fade" transparent={true} visible={modalVisible}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ingresar Partido / Grupo</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeModalText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm} showsVerticalScrollIndicator={false}>
              
              <Text style={styles.inputLabel}>Letra o Nombre del Grupo</Text>
              <TouchableOpacity style={styles.dropdownSelector} onPress={() => setShowGrupoSelector(true)}>
                <Text style={styles.dropdownSelectorText}>Grupo {formGrupo}</Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Categoría del Encuentro</Text>
              <TouchableOpacity style={styles.dropdownSelector} onPress={() => setShowCategoriaSelector(true)}>
                <Text style={styles.dropdownSelectorText}>{formCategoriaNombre}</Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Hora del Encuentro</Text>
              <TouchableOpacity style={styles.dropdownSelector} onPress={() => setShowHoraSelector(true)}>
                <Text style={styles.dropdownSelectorText}>{formHora}</Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Fecha del Encuentro</Text>
              <TouchableOpacity style={styles.dropdownSelector} onPress={() => setShowFechaSelector(true)}>
                <Text style={styles.dropdownSelectorText}>{formFechaCorta}</Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Día Asignado</Text>
              <View style={styles.formDaySelector}>
                <TouchableOpacity style={[styles.formDayBtn, formDia === 'Viernes' && styles.formDayBtnActive]} onPress={() => setFormDia('Viernes')}>
                  <Text style={[styles.formDayBtnText, formDia === 'Viernes' && styles.formDayBtnTextActive]}>Viernes</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.formDayBtn, formDia === 'Sábado' && styles.formDayBtnActive]} onPress={() => setFormDia('Sábado')}>
                  <Text style={[styles.formDayBtnText, formDia === 'Sábado' && styles.formDayBtnTextActive]}>Sábado</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={guardarNuevoGrupo} disabled={guardando}>
                {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Guardar Partido</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>

        {/* SUB MODALES DESPLEGABLES */}
        <Modal visible={showGrupoSelector} transparent={true} animationType="fade">
          <View style={styles.subModalOverlay}><View style={styles.subModalContainer}>
            <Text style={styles.subModalTitle}>Selecciona el Grupo</Text>
            <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
              {GRUPOS_OPCIONES.map((g) => (
                <TouchableOpacity key={g} style={[styles.subModalItem, formGrupo === g && styles.subModalItemActive]} onPress={() => { setFormGrupo(g); setShowGrupoSelector(false) }}>
                  <Text style={[styles.subModalItemText, formGrupo === g && styles.subModalItemTextActive]}>Grupo {g}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.subModalCloseBtn} onPress={() => setShowGrupoSelector(false)}><Text style={styles.subModalCloseBtnText}>Cancelar</Text></TouchableOpacity>
          </View></View>
        </Modal>

        <Modal visible={showCategoriaSelector} transparent={true} animationType="fade">
          <View style={styles.subModalOverlay}><View style={styles.subModalContainer}>
            <Text style={styles.subModalTitle}>Selecciona la Categoría</Text>
            <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={false}>
              {listaCategorias.map((cat) => (
                <TouchableOpacity key={cat.id} style={[styles.subModalItem, formCategoriaId === cat.id && styles.subModalItemActive]} onPress={() => { setFormCategoriaId(cat.id); setFormCategoriaNombre(cat.nombre); setShowCategoriaSelector(false) }}>
                  <Text style={[styles.subModalItemText, formCategoriaId === cat.id && styles.subModalItemTextActive]}>{cat.nombre}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.subModalCloseBtn} onPress={() => setShowCategoriaSelector(false)}><Text style={styles.subModalCloseBtnText}>Cancelar</Text></TouchableOpacity>
          </View></View>
        </Modal>

        <Modal visible={showHoraSelector} transparent={true} animationType="fade">
          <View style={styles.subModalOverlay}><View style={styles.subModalContainer}>
            <Text style={styles.subModalTitle}>Selecciona la Hora</Text>
            <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={false}>
              {HORAS_OPCIONES.map((h) => (
                <TouchableOpacity key={h} style={[styles.subModalItem, formHora === h && styles.subModalItemActive]} onPress={() => { setFormHora(h); setShowHoraSelector(false) }}>
                  <Text style={[styles.subModalItemText, formHora === h && styles.subModalItemTextActive]}>{h}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.subModalCloseBtn} onPress={() => setShowHoraSelector(false)}><Text style={styles.subModalCloseBtnText}>Cancelar</Text></TouchableOpacity>
          </View></View>
        </Modal>

        <Modal visible={showFechaSelector} transparent={true} animationType="fade">
          <View style={styles.subModalOverlay}>
            <View style={[styles.subModalContainer, { width: '85%' }]}>
              <Text style={styles.subModalTitle}>Seleccionar Fecha</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {CALENDARIO_OPCIONES.map((mesObj) => (
                  <View key={mesObj.mes} style={styles.calendarSection}>
                    <Text style={styles.calendarMonthTitle}>{mesObj.mes}</Text>
                    <View style={styles.calendarGrid}>
                      {mesObj.dias.map((diaStr) => {
                        const isSelected = formFechaCorta === diaStr;
                        return (
                          <TouchableOpacity
                            key={diaStr}
                            style={[styles.calendarDayCell, isSelected && styles.calendarDayCellActive]}
                            onPress={() => {
                              setFormFechaCorta(diaStr)
                              setShowFechaSelector(false)
                            }}
                          >
                            <Text style={[styles.calendarDayText, isSelected && styles.calendarDayTextActive]}>
                              {diaStr.split(' ')[0]}
                            </Text>
                            <Text style={[styles.calendarSubText, isSelected && styles.calendarSubTextActive]}>
                              {diaStr.split(' ')[1]}
                            </Text>
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  </View>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.subModalCloseBtn} onPress={() => setShowFechaSelector(false)}>
                <Text style={styles.subModalCloseBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </Modal>

      {/* MODAL ASIGNAR EQUIPOS - MODIFICADO PARA MOSTRAR SOLO ESPACIOS DISPONIBLES */}
      <Modal animationType="slide" transparent={true} visible={modalSorteoVisible}>
        <View style={styles.subModalOverlay}>
          <View style={[styles.subModalContainer, { width: '90%', maxHeight: '75%' }]}>
            <Text style={styles.subModalTitle}>
              Asignar a GRUPO {grupoDestino?.grupo}
            </Text>
            
            {/* NUEVO: Mostrar cuántos equipos tiene y cuántos faltan */}
            <Text style={{ fontSize: 13, color: COLORS.secondary, textAlign: 'center', marginBottom: 5 }}>
              Equipos actuales: {grupoDestino?.equiposActuales || 0}/2
            </Text>
            <Text style={{ fontSize: 13, color: COLORS.secondary, textAlign: 'center', marginBottom: 15 }}>
              {grupoDestino?.estaLleno 
                ? '⚠️ Este grupo ya está completo (2 equipos)' 
                : `Puedes agregar ${2 - (grupoDestino?.equiposActuales || 0)} equipo(s) más`}
            </Text>

            {grupoDestino?.estaLleno ? (
              // Si está lleno, mostrar mensaje y no mostrar lista de equipos
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 16, color: COLORS.warning, textAlign: 'center', marginBottom: 20 }}>
                  🔒 Este grupo ya tiene 2 equipos asignados
                </Text>
                <Text style={{ fontSize: 14, color: COLORS.secondary, textAlign: 'center' }}>
                  No se pueden agregar más equipos. Si necesitas cambiar algún equipo, elimina uno existente primero.
                </Text>
              </View>
            ) : (
              <FlatList
                data={listaEquiposDisponibles}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.subModalItem}
                    onPress={() => asignarEquipoAGrupo(item.id)}
                  >
                    <Text style={[styles.subModalItemText, { fontWeight: '600' }]}>{item.nombre}</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={{ textAlign: 'center', marginVertical: 20, color: COLORS.secondary }}>
                    No hay equipos creados todavía.
                  </Text>
                }
              />
            )}

            <TouchableOpacity 
              style={[styles.subModalCloseBtn, { backgroundColor: '#f2f2f2', marginTop: 15 }]} 
              onPress={() => setModalSorteoVisible(false)}
            >
              <Text style={[styles.subModalCloseBtnText, { color: '#000' }]}>Cerrar Ventana</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  )
}

/* =========================
   ESTILOS (sin cambios, solo agregué warning color)
========================= */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  
  /* HEADER CON EL BOTÓN MÁS EN LINEA HORIZONTAL */
  headerContainer: { paddingHorizontal: 20, marginTop: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 34, fontWeight: 'bold', color: COLORS.primary },
  topAddButton: { backgroundColor: COLORS.primary, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 3 },
  topAddButtonText: { color: COLORS.white, fontSize: 26, fontWeight: '300', marginTop: -2 },

  tabContainer: { flexDirection: 'row', backgroundColor: COLORS.card, marginHorizontal: 20, marginTop: 20, marginBottom: 10, borderRadius: 15, padding: 4, borderWidth: 1, borderColor: COLORS.border },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  tabButtonActive: { backgroundColor: COLORS.white, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  tabText: { fontSize: 15, fontWeight: '600', color: COLORS.secondary },
  tabTextActive: { color: COLORS.primary, fontWeight: 'bold' },
  
  /* FILTRO DE CATEGORÍAS */
  categoriesFilterContainer: { marginBottom: 15 },
  categoriesScroll: { paddingHorizontal: 20, gap: 8, paddingVertical: 5 },
  categoryFilterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  categoryFilterBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryFilterText: { fontSize: 13, color: COLORS.secondary, fontWeight: '600' },
  categoryFilterTextActive: { color: COLORS.white, fontWeight: 'bold' },

  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  groupCard: { backgroundColor: COLORS.white, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 5, elevation: 1 },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  groupTitleText: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary, letterSpacing: 0.5 },
  subLabelText: { fontSize: 13, color: '#333333', fontWeight: '700', marginTop: 3 },
  tapToAddText: { fontSize: 11, color: COLORS.secondary, marginTop: 3, fontStyle: 'italic' },
  timeContainer: { alignItems: 'flex-end', backgroundColor: COLORS.white, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  timeText: { fontSize: 13, fontWeight: 'bold', color: COLORS.accent },
  dateText: { fontSize: 10, fontWeight: '600', color: COLORS.secondary, marginTop: 1 },
  deleteGroupButton: { padding: 6, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  deleteGroupIcon: { fontSize: 16 },
  teamsContainer: { paddingHorizontal: 16, paddingVertical: 4 },
  teamRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  teamInfoLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  teamIndex: { fontSize: 12, fontWeight: 'bold', color: COLORS.secondary, width: 25 },
  teamName: { fontSize: 16, fontWeight: '500', color: COLORS.primary },
  deleteButton: { padding: 6 },
  deleteButtonIcon: { fontSize: 16, color: COLORS.danger, fontWeight: 'bold' },
  noTeamsText: { fontSize: 13, color: COLORS.secondary, fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: COLORS.secondary, fontSize: 16 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-start', paddingTop: Platform.OS === 'ios' ? 60 : 30 },
  modalContainer: { backgroundColor: COLORS.white, borderRadius: 25, marginHorizontal: 15, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10, borderWidth: 1, borderColor: COLORS.border, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 12 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.primary },
  closeBtn: { padding: 4 },
  closeModalText: { color: COLORS.secondary, fontSize: 18, fontWeight: 'bold' },
  modalForm: { paddingBottom: 15 },
  inputLabel: { color: COLORS.secondary, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  dropdownSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.inputBg, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  dropdownSelectorText: { fontSize: 16, color: COLORS.primary, fontWeight: '500' },
  dropdownArrow: { fontSize: 12, color: COLORS.secondary },
  formDaySelector: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 14, padding: 4, marginBottom: 24, borderWidth: 1, borderColor: COLORS.border },
  formDayBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  formDayBtnActive: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  formDayBtnText: { color: COLORS.secondary, fontWeight: '600', fontSize: 14 },
  formDayBtnTextActive: { color: COLORS.primary, fontWeight: 'bold' },
  submitButton: { backgroundColor: COLORS.accent, borderRadius: 15, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  submitButtonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  subModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  subModalContainer: { width: '80%', backgroundColor: COLORS.white, borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 5 },
  subModalTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary, marginBottom: 12, textAlign: 'center' },
  subModalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border, alignItems: 'center' },
  subModalItemActive: { backgroundColor: '#edf7ed', borderRadius: 10 },
  subModalItemText: { fontSize: 16, color: COLORS.primary },
  subModalItemTextActive: { color: COLORS.accent, fontWeight: 'bold' },
  subModalCloseBtn: { marginTop: 15, paddingVertical: 12, backgroundColor: COLORS.card, borderRadius: 12, alignItems: 'center' },
  subModalCloseBtnText: { fontSize: 15, fontWeight: 'bold', color: COLORS.secondary },
  calendarSection: { marginBottom: 15 },
  calendarMonthTitle: { fontSize: 13, fontWeight: '700', color: COLORS.secondary, marginBottom: 8, paddingLeft: 4, letterSpacing: 0.5 },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  calendarDayCell: { width: '22%', aspectRatio: 1, backgroundColor: COLORS.card, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  calendarDayCellActive: { backgroundColor: '#edf7ed', borderColor: COLORS.accent },
  calendarDayText: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
  calendarDayTextActive: { color: COLORS.accent },
  calendarSubText: { fontSize: 10, color: COLORS.secondary, marginTop: 2, fontWeight: '500' },
  calendarSubTextActive: { color: COLORS.accent, fontWeight: '700' }
})