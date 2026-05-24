import NetInfo from '@react-native-community/netinfo'
import { useEffect, useState } from 'react'
import {
  BackHandler,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'

export default function ConexionRequeridaModal() {
  const [isConnected, setIsConnected] = useState(true)

  useEffect(() => {
    verificarConexion()

    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? false)
    })

    return () => unsubscribe()
  }, [])

  async function verificarConexion() {
    const estado = await NetInfo.fetch()
    setIsConnected(estado.isConnected ?? false)
  }

  function salirApp() {
    BackHandler.exitApp()
  }

  return (
    <Modal
      visible={!isConnected}
      transparent
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <Text style={styles.title}>
            Conexión requerida
          </Text>

          <Text style={styles.message}>
            No se detectó internet.
            {'\n\n'}
            La aplicación requiere conexión activa
            para sincronizar los marcadores
            de las canchas.
          </Text>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={verificarConexion}
            >
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.exitButton}
              onPress={salirApp}
            >
              <Text style={styles.exitText}>Salir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalBox: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    elevation: 5
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333'
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 25
  },
  buttonsContainer: {
    width: '100%',
    gap: 10
  },
  retryButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  retryText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16
  },
  exitButton: {
    padding: 12,
    alignItems: 'center'
  },
  exitText: {
    color: '#FF3B30',
    fontSize: 14
  }
})