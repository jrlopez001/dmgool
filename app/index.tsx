import { Ionicons } from '@expo/vector-icons'
import * as Network from 'expo-network'
import { router } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'

import { useSafeAreaInsets } from 'react-native-safe-area-context'

import ConexionRequeridaModal from '../components/ConexionRequeridaModal'
import { supabase } from '../lib/supabase'

/* =========================
   TYPES
========================= */

interface Equipo {
  nombre?: string
}

interface Categoria {
  nombre?: string
}

interface Partido {
  id: string
  estado: string
  periodo_actual: string
  goles_ep1: number
  goles_ep2: number

  categorias?: Categoria | null
  equipo1?: Equipo | null
  equipo2?: Equipo | null
}

/* =========================
   COLORS
========================= */

const COLORS = {
  background: '#ffffff',
  primary: '#000000',
  secondary: '#666666',
  card: '#f4f4f4',
  border: '#e5e5e5',
  white: '#ffffff',
  success: '#1d7a34',
  warning: '#d97706',
  danger: '#d11a2a',
  dark: '#111111'
}

/* =========================
   HELPERS
========================= */

function obtenerEstadoColor(estado: string) {

  switch (estado) {

    case 'PRIMER_TIEMPO':
      return COLORS.success

    case 'SEGUNDO_TIEMPO':
      return COLORS.warning

    case 'FINALIZADO':
      return COLORS.danger

    default:
      return COLORS.secondary
  }
}

/* =========================
   COMPONENTE CARD
========================= */

function PartidoCard({ item }: { item: Partido }) {

  const abrirPartido = () => {
    router.push(`/partido?id=${item.id}`)
  }

  return (

    <TouchableOpacity
      activeOpacity={0.8}
      style={styles.partidoCard}
      onPress={abrirPartido}
    >

      <View style={styles.cardHeader}>

        <Text style={styles.categoriaText}>
          CATEGORÍA:{' '}
          {item.categorias?.nombre?.toUpperCase() ?? 'GENERAL'}
        </Text>

        <View
          style={[
            styles.estadoBadge,
            {
              backgroundColor:
                obtenerEstadoColor(item.estado)
            }
          ]}
        >

          <Text style={styles.estadoText}>
            {item.periodo_actual || item.estado}
          </Text>

        </View>

      </View>

      <View style={styles.marcadorMain}>

        <Text
          style={styles.equipoNombre}
          numberOfLines={2}
        >
          {item.equipo1?.nombre ?? 'Equipo 1'}
        </Text>

        <View style={styles.puntosContainer}>

          <Text style={styles.marcadorGigante}>
            {item.goles_ep1 ?? 0}
          </Text>

          <Text style={styles.separador}>
            -
          </Text>

          <Text style={styles.marcadorGigante}>
            {item.goles_ep2 ?? 0}
          </Text>

        </View>

        <Text
          style={styles.equipoNombre}
          numberOfLines={2}
        >
          {item.equipo2?.nombre ?? 'Equipo 2'}
        </Text>

      </View>

    </TouchableOpacity>
  )
}

/* =========================
   SCREEN
========================= */

export default function HomeScreen() {

  const insets = useSafeAreaInsets()

  const [partidos, setPartidos] = useState<Partido[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [isConnected, setIsConnected] = useState(true)
  const [error, setError] = useState('')

  /* NUEVO */

  const [modalVisible, setModalVisible] = useState(false)

  const [clave, setClave] = useState('')

  /* =========================
     INTERNET
  ========================= */

  const chequearRed = useCallback(async () => {

    try {

      const estado =
        await Network.getNetworkStateAsync()

      setIsConnected(
        estado.isConnected ?? false
      )

    } catch {

      setIsConnected(false)
    }

  }, [])

  /* =========================
     OBTENER PARTIDOS
  ========================= */

  const obtenerPartidos = useCallback(
    async (mostrarLoadingCompleto = false) => {

      if (mostrarLoadingCompleto) {
        setLoading(true)
      }

      setError('')

      try {

        const { data, error } = await supabase
          .from('partidos')
          .select(`
            id,
            estado,
            periodo_actual,
            goles_ep1,
            goles_ep2,

            categorias (
              nombre
            ),

            equipo1:equipos!partidos_equipo1_id_fkey (
              nombre
            ),

            equipo2:equipos!partidos_equipo2_id_fkey (
              nombre
            )
          `)
          .order('created_at', {
            ascending: false
          })

        if (error) {
          console.log(error)
          throw error
        }

        setPartidos(
          (data as Partido[]) || []
        )

      } catch (err) {

        console.error(err)

        setError(
          'No se pudieron cargar los partidos'
        )

      } finally {

        setLoading(false)
        setRefreshing(false)
      }
    },
    []
  )

  /* =========================
     REFRESH
  ========================= */

  const onRefresh = useCallback(() => {

    setRefreshing(true)

    obtenerPartidos(false)

  }, [obtenerPartidos])

  /* =========================
     REALTIME
  ========================= */

  useEffect(() => {

    chequearRed()

    obtenerPartidos(true)

    const channel = supabase
      .channel('partidos-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'partidos'
        },
        () => {
          obtenerPartidos(false)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }

  }, [chequearRed, obtenerPartidos])

  /* =========================
     RENDER ITEM
  ========================= */

  const renderPartido = useCallback(
    ({ item }: { item: Partido }) => {
      return <PartidoCard item={item} />
    },
    []
  )

  /* =========================
     LOADING
  ========================= */

  if (loading && !refreshing) {

    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />
      </View>
    )
  }

  /* =========================
     UI
  ========================= */

  return (

    <SafeAreaView style={styles.mainSafe}>

      <ConexionRequeridaModal />

      <StatusBar barStyle="dark-content" />

      {!isConnected && (
        <View style={styles.noInternet}>
          <Text style={styles.noInternetText}>
            Sin conexión a internet
          </Text>
        </View>
      )}

      <View
        style={[
          styles.headerContainer,
          {
            paddingTop: insets.top + 10
          }
        ]}
      >

        <Text style={styles.title}>
          Partidos
        </Text>

        <TouchableOpacity
          style={styles.newButton}
          onPress={() =>
            router.push('/nuevo-partido')
          }
        >

          <Text style={styles.newButtonText}>
            Juego Nuevo
          </Text>

        </TouchableOpacity>

      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {error}
          </Text>
        </View>
      ) : null}

      <FlatList
        data={partidos}
        keyExtractor={(item) => item.id}
        renderItem={renderPartido}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 180
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No hay partidos disponibles
            </Text>
          </View>
        }
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews
      />

      {/* FOOTER */}

      <View style={styles.footerBar}>

        {/* INICIO */}

        <TouchableOpacity
          style={styles.footerItem}
          onPress={() =>
            obtenerPartidos(true)
          }
        >

          <Ionicons
            name="home"
            size={30}
            color={COLORS.white}
          />

          <Text style={styles.footerLabel}>
            Inicio
          </Text>

        </TouchableOpacity>

        {/* GRUPOS */}

        <TouchableOpacity
          style={styles.footerItem}
          onPress={() => {

            setModalVisible(true)

          }}
        >

          <Ionicons
            name="people"
            size={30}
            color={COLORS.white}
          />

          <Text style={styles.footerLabel}>
            Grupos
          </Text>

        </TouchableOpacity>

      </View>

      {/* MODAL CLAVE */}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
      >

        <View style={styles.modalOverlay}>

          <View style={styles.modalContainer}>

            <Text style={styles.modalTitle}>
              Ingrese clave para acceder
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Clave"
              secureTextEntry
              value={clave}
              onChangeText={setClave}
            />

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {

                if (clave === '0') {

                  setModalVisible(false)

                  setClave('')

                  router.push('/asignar-grupo' as any)

                } else {

                  Alert.alert(
                    'Error',
                    'Clave incorrecta'
                  )
                }
              }}
            >

              <Text style={styles.modalButtonText}>
                Ingresar
              </Text>

            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {

                setModalVisible(false)

                setClave('')
              }}
            >

              <Text style={styles.cancelText}>
                Cancelar
              </Text>

            </TouchableOpacity>

          </View>

        </View>

      </Modal>

    </SafeAreaView>
  )
}

/* =========================
   STYLES
========================= */

const styles = StyleSheet.create({

  mainSafe: {
    flex: 1,
    backgroundColor: COLORS.background
  },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },

  noInternet: {
    backgroundColor: COLORS.danger,
    paddingVertical: 6,
    alignItems: 'center'
  },

  noInternetText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 12
  },

  headerContainer: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },

  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: COLORS.primary
  },

  newButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16
  },

  newButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16
  },

  errorContainer: {
    marginHorizontal: 20,
    marginBottom: 15,
    backgroundColor: '#ffe5e5',
    padding: 14,
    borderRadius: 14
  },

  errorText: {
    color: COLORS.danger,
    fontWeight: '600'
  },

  partidoCard: {
    backgroundColor: COLORS.card,
    padding: 25,
    borderRadius: 30,
    marginBottom: 20,
    minHeight: 220,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,

    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 5
    },

    elevation: 3
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },

  categoriaText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#777',
    letterSpacing: 0.5,
    flex: 1,
    marginRight: 10
  },

  estadoBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12
  },

  estadoText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 11,
    textTransform: 'uppercase'
  },

  marcadorMain: {
    alignItems: 'center',
    justifyContent: 'center'
  },

  equipoNombre: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
    paddingHorizontal: 10
  },

  puntosContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8
  },

  marcadorGigante: {
    fontSize: 75,
    fontWeight: '900',
    color: COLORS.primary,
    marginHorizontal: 15
  },

  separador: {
    fontSize: 50,
    color: COLORS.primary,
    fontWeight: '300'
  },

  emptyContainer: {
    alignItems: 'center',
    marginTop: 80
  },

  emptyText: {
    fontSize: 18,
    color: COLORS.secondary,
    fontWeight: '600'
  },

  footerBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,

    backgroundColor: COLORS.dark,

    flexDirection: 'row',

    justifyContent: 'space-evenly',
    alignItems: 'flex-start',

    height: 120,

    paddingTop: 8,

    borderTopLeftRadius: 0,
    borderTopRightRadius: 0
  },

  footerItem: {
    alignItems: 'center',
    marginTop: -6
  },

  footerLabel: {
    color: COLORS.white,
    fontSize: 11,
    marginTop: 4
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },

  modalContainer: {
    width: '85%',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 25
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    fontSize: 16
  },

  modalButton: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 14,
    alignItems: 'center'
  },

  modalButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16
  },

  cancelText: {
    marginTop: 15,
    textAlign: 'center',
    color: COLORS.secondary,
    fontWeight: '600'
  }
})