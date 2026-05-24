import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import {
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'

type Props = {
  visible: boolean
  title: string
  data: any[]
  selectedValue: string
  onSelect: (id: string) => void
  onClose: () => void
}

export default function SelectorModal({
  visible,
  title,
  data = [], // Valor por defecto para evitar errores si no hay datos
  selectedValue,
  onSelect,
  onClose,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose} // Necesario para el botón atrás en Android
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <SafeAreaView>
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={28} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {data.length === 0 ? (
                <Text style={{ textAlign: 'center', marginVertical: 20, color: '#999' }}>
                  No hay opciones disponibles
                </Text>
              ) : (
                data.map((item) => {
                  const selected = selectedValue === item.id
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.item, selected && styles.itemSelected]}
                      onPress={() => {
                        onSelect(item.id)
                        onClose()
                      }}
                    >
                      <View style={styles.left}>
                        <View style={[styles.ball, selected && styles.ballSelected]} />
                        <Text style={[styles.itemText, selected && styles.itemTextSelected]}>
                          {item.nombre}
                        </Text>
                      </View>

                      {selected && (
                        <Ionicons name="checkmark-circle" size={24} color="#fff" />
                      )}
                    </TouchableOpacity>
                  )
                })
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
        
        <TouchableOpacity 
            style={{ flex: 1 }} 
            activeOpacity={1} 
            onPress={onClose} 
        />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
  },
  container: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    paddingHorizontal: 20,
    paddingBottom: 25,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 10,
    maxHeight: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 20,
  },
  title: { fontSize: 22, fontWeight: 'bold' },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: '#f3f3f3',
  },
  itemSelected: { backgroundColor: '#000' },
  left: { flexDirection: 'row', alignItems: 'center' },
  ball: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#d9d9d9', marginRight: 12 },
  ballSelected: { backgroundColor: '#fff' },
  itemText: { fontSize: 16, fontWeight: '600', color: '#000' },
  itemTextSelected: { color: '#fff' },
})