import { Ionicons } from '@expo/vector-icons'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View
} from 'react-native'

import ConexionRequeridaModal from '../components/ConexionRequeridaModal'
import { supabase } from '../lib/supabase'

export default function PartidoScreen() {

  const { id } = useLocalSearchParams()

  const [partido, setPartido] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Estados para el modal de agregar gol
  const [modalJugadoresVisible, setModalJugadoresVisible] = useState(false)
  const [jugadoresDisponibles, setJugadoresDisponibles] = useState<any[]>([])
  const [equipoSeleccionadoParaGol, setEquipoSeleccionadoParaGol] = useState<1 | 2 | null>(null)

  // Estados para el modal de eliminar gol
  const [modalGolesVisible, setModalGolesVisible] = useState(false)
  const [golesDisponibles, setGolesDisponibles] = useState<any[]>([])

  useEffect(() => {
    if (!id) return
    obtenerPartido()

    const canal = supabase
      .channel(`partido-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'partidos',
          filter: `id=eq.${id}`
        },
        () => {
          obtenerPartido(false)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [id])

  // =========================
  // OBTENER PARTIDO
  // =========================

  async function obtenerPartido(mostrarLoading = true) {
    if (mostrarLoading) setLoading(true)
    try {
      const { data, error } = await supabase
        .from('partidos')
        .select(`
          *,
          categoria:categorias(id, nombre),
          equipo1:equipos!partidos_equipo1_id_fkey(id, nombre),
          equipo2:equipos!partidos_equipo2_id_fkey(id, nombre)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      setPartido(data)
    } catch (error) {
      console.log(error)
      Alert.alert('Error', 'No se pudo cargar el partido')
    } finally {
      setLoading(false)
    }
  }

  // =========================
  // ABRIR MODAL PARA AGREGAR GOL
  // =========================

  async function abrirSelectorJugadores(equipo: 1 | 2) {
    if (!partido) return
    if (partido.estado === 'FINALIZADO') {
      Alert.alert('Partido finalizado', 'No se pueden registrar más goles')
      return
    }

    const equipoId = equipo === 1 ? partido.equipo1_id : partido.equipo2_id

    try {
      const { data: jugadores, error } = await supabase
        .from('jugadores')
        .select('id, nombre, numero_camisola, posicion, goles, goles_recibidos')
        .eq('equipo_id', equipoId)
        .eq('categoria_id', partido.categoria_id)
        .order('numero_camisola', { ascending: true })

      if (error) throw error
      if (!jugadores || jugadores.length === 0) {
        Alert.alert('Sin jugadores', 'Este equipo no tiene jugadores registrados en esta categoría')
        return
      }

      setJugadoresDisponibles(jugadores)
      setEquipoSeleccionadoParaGol(equipo)
      setModalJugadoresVisible(true)
    } catch (error) {
      console.log(error)
      Alert.alert('Error', 'No se pudieron cargar los jugadores')
    }
  }

  // =========================
  // REGISTRAR GOL (AGREGAR)
  // =========================

  async function registrarGol(jugador: any) {
    if (!partido || equipoSeleccionadoParaGol === null) return

    try {
      Vibration.vibrate(40)

      const equipo = equipoSeleccionadoParaGol
      const equipoId = equipo === 1 ? partido.equipo1_id : partido.equipo2_id

      // 1. Actualizar marcador
      const columna = equipo === 1 ? 'goles_ep1' : 'goles_ep2'
      const actual = partido[columna] || 0
      const nuevoValor = actual + 1

      const { error: errorMarcador } = await supabase
        .from('partidos')
        .update({ [columna]: nuevoValor })
        .eq('id', id)

      if (errorMarcador) throw errorMarcador

      // 2. Insertar gol en tabla goles
      const { error: errorInsertGol } = await supabase
        .from('goles')
        .insert({
          partido_id: id,
          jugador_id: jugador.id,
          equipo_id: equipoId,
          minuto: '0'
        })

      if (errorInsertGol) throw errorInsertGol

      // 3. Sumar gol al jugador
      const golesActuales = jugador.goles || 0
      const { error: errorGol } = await supabase
        .from('jugadores')
        .update({ goles: golesActuales + 1 })
        .eq('id', jugador.id)

      if (errorGol) throw errorGol

      // 4. Buscar portero rival y sumar gol recibido
      const equipoContrarioId = equipo === 1 ? partido.equipo2_id : partido.equipo1_id
      const { data: portero, error: errorPortero } = await supabase
        .from('jugadores')
        .select('id, goles_recibidos')
        .eq('equipo_id', equipoContrarioId)
        .eq('categoria_id', partido.categoria_id)
        .ilike('posicion', 'PORTERO')
        .single()

      if (portero && !errorPortero) {
        const recibidos = portero.goles_recibidos || 0
        await supabase
          .from('jugadores')
          .update({ goles_recibidos: recibidos + 1 })
          .eq('id', portero.id)
      }

      setModalJugadoresVisible(false)
      setEquipoSeleccionadoParaGol(null)
      obtenerPartido(false)
    } catch (error) {
      console.log(error)
      Alert.alert('Error', 'No se pudo registrar el gol')
    }
  }

  // =========================
  // ABRIR MODAL PARA ELIMINAR GOL
  // =========================

  async function abrirSelectorGoles() {
    if (!partido) return

    try {
      // Consulta con relaciones para obtener datos del jugador y del equipo
      const { data: goles, error } = await supabase
        .from('goles')
        .select(`
          id,
          equipo_id,
          jugador_id,
          minuto,
          jugador:jugadores(
            id,
            nombre,
            numero_camisola,
            goles
          ),
          equipo:equipos(
            id,
            nombre
          )
        `)
        .eq('partido_id', id)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (!goles || goles.length === 0) {
        Alert.alert('Sin goles', 'No hay goles registrados')
        return
      }

      // Formatear los datos para mostrar: número de camisola, nombre del jugador, nombre del equipo
      const golesFormateados = goles.map((gol: any) => ({
        id: gol.id,
        equipo_id: gol.equipo_id,
        jugador_id: gol.jugador_id,
        numero_camisola: gol.jugador?.numero_camisola || '?',
        nombre_jugador: gol.jugador?.nombre || 'Desconocido',
        nombre_equipo: gol.equipo?.nombre || 'Equipo'
      }))

      setGolesDisponibles(golesFormateados)
      setModalGolesVisible(true)
    } catch (error) {
      console.log(error)
      Alert.alert('Error', 'No se pudieron cargar los goles')
    }
  }

  // =========================
  // ELIMINAR GOL SELECCIONADO
  // =========================

  async function eliminarGolSeleccionado(gol: any) {
    try {
      // 1. Borrar el registro de la tabla goles
      const { error: errorDelete } = await supabase
        .from('goles')
        .delete()
        .eq('id', gol.id)

      if (errorDelete) throw errorDelete

      // 2. Restar marcador del partido
      const esEquipo1 = gol.equipo_id === partido.equipo1_id
      const columna = esEquipo1 ? 'goles_ep1' : 'goles_ep2'
      const actual = partido[columna] || 0
      const nuevoValor = Math.max(0, actual - 1)

      await supabase
        .from('partidos')
        .update({ [columna]: nuevoValor })
        .eq('id', id)

      // 3. Restar gol al jugador (necesitamos obtener los goles actuales del jugador)
      const { data: jugadorActual, error: errorJugador } = await supabase
        .from('jugadores')
        .select('goles')
        .eq('id', gol.jugador_id)
        .single()

      if (!errorJugador && jugadorActual) {
        const golesJugador = jugadorActual.goles || 0
        await supabase
          .from('jugadores')
          .update({ goles: Math.max(0, golesJugador - 1) })
          .eq('id', gol.jugador_id)
      }

      Alert.alert('Correcto', 'Gol eliminado')
      setModalGolesVisible(false)
      obtenerPartido(false)
    } catch (error) {
      console.log(error)
      Alert.alert('Error', 'No se pudo eliminar el gol')
    }
  }

  // =========================
  // ESTADO PARTIDO
  // =========================

  async function cambiarEstado(estado: string, periodo: string) {
    try {
      const { error } = await supabase
        .from('partidos')
        .update({ estado, periodo_actual: periodo })
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el estado')
    }
  }

  function confirmarEstado(estado: string, periodo: string, titulo: string, mensaje: string) {
    Alert.alert(
      titulo,
      mensaje,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sí', onPress: () => cambiarEstado(estado, periodo) }
      ]
    )
  }

  // =========================
  // LOADING / ERROR
  // =========================

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    )
  }

  if (!partido) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Partido no encontrado</Text>
      </View>
    )
  }

  const nombreEquipo1 = partido?.equipo1?.nombre || 'Equipo 1'
  const nombreEquipo2 = partido?.equipo2?.nombre || 'Equipo 2'
  const nombreCategoria = partido?.categoria?.nombre || 'General'

  const esPendiente = partido.estado === 'PENDIENTE'
  const esPrimerTiempo = partido.estado === 'PRIMER_TIEMPO'
  const esSegundoTiempo = partido.estado === 'SEGUNDO_TIEMPO'
  const esFinalizado = partido.estado === 'FINALIZADO'
  const mostrarBotones = esPrimerTiempo || esSegundoTiempo

  // =========================
  // RENDER PRINCIPAL
  // =========================

  return (
    <SafeAreaView style={styles.container}>

      <ConexionRequeridaModal />

      <Stack.Screen
        options={{
          title: 'DMGOOL',
          headerShadowVisible: false
        }}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>

        {/* HEADER */}
        <View style={styles.headerInfo}>
          <Text style={styles.estadoLabel}>{partido.periodo_actual}</Text>
          <Text style={styles.categoriaLabel}>{nombreCategoria}</Text>
        </View>

        {/* SCOREBOARD */}
        <View style={styles.scoreboardCard}>

          {/* EQUIPO 1 */}
          <View style={styles.teamSection}>
            <Text style={styles.nombreEquipo}>{nombreEquipo1}</Text>
            <View style={styles.scoreBox}>
              <Text style={styles.golesNum}>{partido.goles_ep1 || 0}</Text>
            </View>
            {mostrarBotones && (
              <View style={styles.buttonsRow}>
                <TouchableOpacity
                  style={styles.plusBtn}
                  onPress={() => abrirSelectorJugadores(1)}
                >
                  <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* VS */}
          <View style={styles.vsContainer}>
            <Text style={styles.vsText}>VS</Text>
          </View>

          {/* EQUIPO 2 */}
          <View style={styles.teamSection}>
            <Text style={styles.nombreEquipo}>{nombreEquipo2}</Text>
            <View style={styles.scoreBox}>
              <Text style={styles.golesNum}>{partido.goles_ep2 || 0}</Text>
            </View>
            {mostrarBotones && (
              <View style={styles.buttonsRow}>
                <TouchableOpacity
                  style={styles.plusBtn}
                  onPress={() => abrirSelectorJugadores(2)}
                >
                  <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>

        </View>

        {/* BOTONES DE ESTADO */}
        <View style={styles.footer}>
          {esPendiente && (
            <TouchableOpacity
              style={styles.mainButton}
              onPress={() =>
                confirmarEstado('PRIMER_TIEMPO', '1er Tiempo', 'Iniciar Partido', '¿Deseas iniciar el partido?')
              }
            >
              <Text style={styles.mainButtonText}>Iniciar Partido</Text>
            </TouchableOpacity>
          )}

          {esPrimerTiempo && (
            <TouchableOpacity
              style={styles.mainButton}
              onPress={() =>
                confirmarEstado('SEGUNDO_TIEMPO', '2do Tiempo', 'Segundo Tiempo', '¿Deseas iniciar el segundo tiempo?')
              }
            >
              <Text style={styles.mainButtonText}>Iniciar 2do Tiempo</Text>
            </TouchableOpacity>
          )}

          {!esFinalizado && mostrarBotones && (
            <>
              <TouchableOpacity
                style={[styles.mainButton, { backgroundColor: '#d11a2a', marginTop: 12 }]}
                onPress={() =>
                  confirmarEstado('FINALIZADO', 'FINALIZADO', 'Finalizar Partido', '¿Deseas finalizar el partido?')
                }
              >
                <Ionicons name="stop-circle" size={22} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.mainButtonText}>Finalizar Partido</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.mainButton, { backgroundColor: '#ff9500', marginTop: 12 }]}
                onPress={abrirSelectorGoles}
              >
                <Ionicons name="trash" size={22} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.mainButtonText}>Eliminar Gol</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

      </ScrollView>

      {/* ========================= MODAL PARA AGREGAR GOL ========================= */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalJugadoresVisible}
        onRequestClose={() => setModalJugadoresVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Selecciona al anotador</Text>
            <FlatList
              data={jugadoresDisponibles}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.itemRow} onPress={() => registrarGol(item)}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemNumero}>#{item.numero_camisola || '?'}</Text>
                    <Text style={styles.itemNombre}>{item.nombre}</Text>
                  </View>
                  <Text style={styles.itemPosicion}>{item.posicion || 'Jugador'}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyListText}>No hay jugadores disponibles</Text>}
            />
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setModalJugadoresVisible(false)}>
              <Text style={styles.modalCloseText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ========================= MODAL PARA ELIMINAR GOL ========================= */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalGolesVisible}
        onRequestClose={() => setModalGolesVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Selecciona el gol a eliminar</Text>
            <FlatList
              data={golesDisponibles}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.itemRow} onPress={() => eliminarGolSeleccionado(item)}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemNumero}>#{item.numero_camisola}</Text>
                    <Text style={styles.itemNombre}>{item.nombre_jugador}</Text>
                  </View>
                  <Text style={styles.itemEquipo}>{item.nombre_equipo}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyListText}>No hay goles registrados</Text>}
            />
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setModalGolesVisible(false)}>
              <Text style={styles.modalCloseText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  )
}

// =========================
// ESTILOS
// =========================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerInfo: { alignItems: 'center', marginTop: 25, marginBottom: 25 },
  estadoLabel: { fontSize: 28, fontWeight: '900', color: '#444' },
  categoriaLabel: { marginTop: 5, fontSize: 18, fontWeight: '700', color: '#1d7a34' },
  scoreboardCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    borderRadius: 30,
    padding: 20,
    alignItems: 'center',
    elevation: 5
  },
  teamSection: { flex: 1, alignItems: 'center' },
  nombreEquipo: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', minHeight: 50, color: '#000' },
  scoreBox: {
    width: '95%',
    aspectRatio: 1,
    borderRadius: 25,
    backgroundColor: '#f3f3f3',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12
  },
  golesNum: { fontSize: 64, fontWeight: '900', color: '#000' },
  vsContainer: { width: 40, alignItems: 'center' },
  vsText: { fontSize: 16, fontWeight: 'bold', color: '#999' },
  buttonsRow: { flexDirection: 'row', gap: 25, marginTop: 20 },
  plusBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center'
  },
  footer: { paddingHorizontal: 20, marginTop: 30 },
  mainButton: {
    backgroundColor: '#000',
    padding: 20,
    borderRadius: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  mainButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  errorText: { fontSize: 18, color: 'red' },

  // Estilos comunes para ambos modales
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContainer: {
    width: '85%',
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    elevation: 5
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    color: '#000'
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  itemInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemNumero: { fontSize: 16, fontWeight: 'bold', color: '#1d7a34', width: 45 },
  itemNombre: { fontSize: 16, fontWeight: '500', color: '#000' },
  itemPosicion: { fontSize: 14, color: '#666', fontStyle: 'italic' },
  itemEquipo: { fontSize: 14, fontWeight: 'bold', color: '#007bff' },
  emptyListText: { textAlign: 'center', marginTop: 20, color: '#999' },
  modalCloseButton: {
    marginTop: 15,
    paddingVertical: 12,
    backgroundColor: '#f2f2f2',
    borderRadius: 12,
    alignItems: 'center'
  },
  modalCloseText: { fontSize: 16, fontWeight: 'bold', color: '#000' }
})