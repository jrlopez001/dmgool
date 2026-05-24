import { Ionicons } from '@expo/vector-icons'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
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

  async function obtenerPartido(
    mostrarLoading = true
  ) {

    if (mostrarLoading) {
      setLoading(true)
    }

    try {

      const { data, error } = await supabase
        .from('partidos')
        .select(`
          *,
          categoria:categorias(
            id,
            nombre
          ),
          equipo1:equipos!partidos_equipo1_id_fkey(
            id,
            nombre
          ),
          equipo2:equipos!partidos_equipo2_id_fkey(
            id,
            nombre
          )
        `)
        .eq('id', id)
        .single()

      if (error) {
        throw error
      }

      setPartido(data)

    } catch (error) {

      console.log(error)

      Alert.alert(
        'Error',
        'No se pudo cargar el partido'
      )

    } finally {

      setLoading(false)
    }
  }

  // =========================
  // GOLES
  // =========================

  async function actualizarGoles(
    equipo: 1 | 2,
    accion: 'sumar' | 'restar'
  ) {

    if (!partido) return

    if (partido.estado === 'FINALIZADO') {
      return
    }

    Vibration.vibrate(40)

    try {

      const columna =
        equipo === 1
          ? 'goles_ep1'
          : 'goles_ep2'

      const actual = partido[columna] || 0

      const nuevoValor =
        accion === 'sumar'
          ? actual + 1
          : Math.max(0, actual - 1)

      const { error } = await supabase
        .from('partidos')
        .update({
          [columna]: nuevoValor
        })
        .eq('id', id)

      if (error) {
        throw error
      }

    } catch (error) {

      console.log(error)

      Alert.alert(
        'Error',
        'No se pudo actualizar el marcador'
      )
    }
  }

  // =========================
  // ESTADO PARTIDO
  // =========================

  async function cambiarEstado(
    estado: string,
    periodo: string
  ) {

    try {

      const { error } = await supabase
        .from('partidos')
        .update({
          estado,
          periodo_actual: periodo
        })
        .eq('id', id)

      if (error) {
        throw error
      }

    } catch (error) {

      Alert.alert(
        'Error',
        'No se pudo actualizar el estado'
      )
    }
  }

  function confirmarEstado(
    estado: string,
    periodo: string,
    titulo: string,
    mensaje: string
  ) {

    Alert.alert(
      titulo,
      mensaje,
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Sí',
          onPress: () =>
            cambiarEstado(
              estado,
              periodo
            )
        }
      ]
    )
  }

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator
          size="large"
          color="#000"
        />
      </View>
    )
  }

  // =========================
  // ERROR
  // =========================

  if (!partido) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>
          Partido no encontrado
        </Text>
      </View>
    )
  }

  // =========================
  // VARIABLES
  // =========================

  const nombreEquipo1 =
    partido?.equipo1?.nombre ||
    'Equipo 1'

  const nombreEquipo2 =
    partido?.equipo2?.nombre ||
    'Equipo 2'

  const nombreCategoria =
    partido?.categoria?.nombre ||
    'General'

  const esPendiente =
    partido.estado === 'PENDIENTE'

  const esPrimerTiempo =
    partido.estado === 'PRIMER_TIEMPO'

  const esSegundoTiempo =
    partido.estado === 'SEGUNDO_TIEMPO'

  const esFinalizado =
    partido.estado === 'FINALIZADO'

  const mostrarBotones =
    esPrimerTiempo ||
    esSegundoTiempo

  // =========================
  // UI
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

      <ScrollView
        contentContainerStyle={{
          paddingBottom: 40
        }}
      >

        {/* HEADER */}

        <View style={styles.headerInfo}>

          <Text style={styles.estadoLabel}>
            {partido.periodo_actual}
          </Text>

          <Text style={styles.categoriaLabel}>
            {nombreCategoria}
          </Text>

        </View>

        {/* SCORE */}

        <View style={styles.scoreboardCard}>

          {/* EQUIPO 1 */}

          <View style={styles.teamSection}>

            <Text style={styles.nombreEquipo}>
              {nombreEquipo1}
            </Text>

            <View style={styles.scoreBox}>
              <Text style={styles.golesNum}>
                {partido.goles_ep1 || 0}
              </Text>
            </View>

            {mostrarBotones && (
              <View style={styles.buttonsRow}>

                <TouchableOpacity
                  style={styles.minusBtn}
                  onPress={() =>
                    actualizarGoles(
                      1,
                      'restar'
                    )
                  }
                >
                  <Ionicons
                    name="remove"
                    size={24}
                    color="#000"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.plusBtn}
                  onPress={() =>
                    actualizarGoles(
                      1,
                      'sumar'
                    )
                  }
                >
                  <Ionicons
                    name="add"
                    size={24}
                    color="#fff"
                  />
                </TouchableOpacity>

              </View>
            )}

          </View>

          {/* VS */}

          <View style={styles.vsContainer}>
            <Text style={styles.vsText}>
              VS
            </Text>
          </View>

          {/* EQUIPO 2 */}

          <View style={styles.teamSection}>

            <Text style={styles.nombreEquipo}>
              {nombreEquipo2}
            </Text>

            <View style={styles.scoreBox}>
              <Text style={styles.golesNum}>
                {partido.goles_ep2 || 0}
              </Text>
            </View>

            {mostrarBotones && (
              <View style={styles.buttonsRow}>

                <TouchableOpacity
                  style={styles.minusBtn}
                  onPress={() =>
                    actualizarGoles(
                      2,
                      'restar'
                    )
                  }
                >
                  <Ionicons
                    name="remove"
                    size={24}
                    color="#000"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.plusBtn}
                  onPress={() =>
                    actualizarGoles(
                      2,
                      'sumar'
                    )
                  }
                >
                  <Ionicons
                    name="add"
                    size={24}
                    color="#fff"
                  />
                </TouchableOpacity>

              </View>
            )}

          </View>

        </View>

        {/* BOTONES */}

        <View style={styles.footer}>

          {esPendiente && (
            <TouchableOpacity
              style={styles.mainButton}
              onPress={() =>
                confirmarEstado(
                  'PRIMER_TIEMPO',
                  '1er Tiempo',
                  'Iniciar Partido',
                  '¿Deseas iniciar el partido?'
                )
              }
            >
              <Text style={styles.mainButtonText}>
                Iniciar Partido
              </Text>
            </TouchableOpacity>
          )}

          {esPrimerTiempo && (
            <TouchableOpacity
              style={styles.mainButton}
              onPress={() =>
                confirmarEstado(
                  'SEGUNDO_TIEMPO',
                  '2do Tiempo',
                  'Segundo Tiempo',
                  '¿Deseas iniciar el segundo tiempo?'
                )
              }
            >
              <Text style={styles.mainButtonText}>
                Iniciar 2do Tiempo
              </Text>
            </TouchableOpacity>
          )}

          {!esFinalizado &&
            mostrarBotones && (
              <TouchableOpacity
                style={[
                  styles.mainButton,
                  {
                    backgroundColor: '#d11a2a',
                    marginTop: 12
                  }
                ]}
                onPress={() =>
                  confirmarEstado(
                    'FINALIZADO',
                    'FINALIZADO',
                    'Finalizar Partido',
                    '¿Deseas finalizar el partido?'
                  )
                }
              >
                <Ionicons
                  name="stop-circle"
                  size={22}
                  color="#fff"
                  style={{
                    marginRight: 8
                  }}
                />

                <Text style={styles.mainButtonText}>
                  Finalizar Partido
                </Text>
              </TouchableOpacity>
            )}

        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#f8f8f8'
  },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },

  headerInfo: {
    alignItems: 'center',
    marginTop: 25,
    marginBottom: 25
  },

  estadoLabel: {
    fontSize: 28,
    fontWeight: '900',
    color: '#444'
  },

  categoriaLabel: {
    marginTop: 5,
    fontSize: 18,
    fontWeight: '700',
    color: '#1d7a34'
  },

  scoreboardCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    borderRadius: 30,
    padding: 20,
    alignItems: 'center',
    elevation: 5
  },

  teamSection: {
    flex: 1,
    alignItems: 'center'
  },

  nombreEquipo: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    minHeight: 50,
    color: '#000'
  },

  scoreBox: {
    width: '95%',
    aspectRatio: 1,
    borderRadius: 25,
    backgroundColor: '#f3f3f3',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12
  },

  golesNum: {
    fontSize: 64,
    fontWeight: '900',
    color: '#000'
  },

  vsContainer: {
    width: 40,
    alignItems: 'center'
  },

  vsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#999'
  },

  buttonsRow: {
    flexDirection: 'row',
    gap: 25,
    marginTop: 20
  },

  minusBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center'
  },

  plusBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center'
  },

  footer: {
    paddingHorizontal: 20,
    marginTop: 30
  },

  mainButton: {
    backgroundColor: '#000',
    padding: 20,
    borderRadius: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center'
  },

  mainButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },

  errorText: {
    fontSize: 18,
    color: 'red'
  }

})