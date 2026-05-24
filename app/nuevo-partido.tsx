import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import ConexionRequeridaModal from '../components/ConexionRequeridaModal';
import SelectorModal from '../components/SelectorModal';
import { supabase } from '../lib/supabase';

export default function NuevoPartidoScreen() {

  const [categorias, setCategorias] = useState<any[]>([]);
  const [equipos, setEquipos] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  const [categoriaId, setCategoriaId] = useState('');
  const [equipo1, setEquipo1] = useState('');
  const [equipo2, setEquipo2] = useState('');

  const [selectorCategoria, setSelectorCategoria] = useState(false);
  const [selectorEquipo1, setSelectorEquipo1] = useState(false);
  const [selectorEquipo2, setSelectorEquipo2] = useState(false);

  const [modalCategoriaVisible, setModalCategoriaVisible] = useState(false);
  const [modalEquipoVisible, setModalEquipoVisible] = useState(false);

  const [nuevoNombreCategoria, setNuevoNombreCategoria] = useState('');
  const [nuevoNombreEquipo, setNuevoNombreEquipo] = useState('');

  const [modalResumenVisible, setModalResumenVisible] = useState(false);

  // =========================
  // LOAD
  // =========================

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {

    try {

      setLoading(true);

      await Promise.all([
        obtenerCategorias(),
        obtenerEquipos()
      ]);

    } catch (error) {

      console.log(error);

      Alert.alert(
        'Error',
        'No se pudieron cargar los datos'
      );

    } finally {

      setLoading(false);
    }
  }

  // =========================
  // CATEGORIAS
  // =========================

  async function obtenerCategorias() {

    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .order('nombre');

    if (error) {
      console.log(error);
      return;
    }

    setCategorias(data || []);
  }

  // =========================
  // EQUIPOS
  // =========================

  async function obtenerEquipos() {

    const { data, error } = await supabase
      .from('equipos')
      .select('*')
      .order('nombre');

    if (error) {
      console.log(error);
      return;
    }

    setEquipos(data || []);
  }

  // =========================
  // CREAR CATEGORIA
  // =========================

  async function crearCategoria() {

    if (!nuevoNombreCategoria.trim()) {
      return;
    }

    const { error } = await supabase
      .from('categorias')
      .insert({
        nombre: nuevoNombreCategoria
      });

    if (error) {

      Alert.alert(
        'Error',
        error.message
      );

      return;
    }

    setNuevoNombreCategoria('');
    setModalCategoriaVisible(false);

    obtenerCategorias();
  }

  // =========================
  // CREAR EQUIPO
  // =========================

  async function crearEquipo() {

    if (!nuevoNombreEquipo.trim()) {
      return;
    }

    const { error } = await supabase
      .from('equipos')
      .insert({
        nombre: nuevoNombreEquipo
      });

    if (error) {

      Alert.alert(
        'Error',
        error.message
      );

      return;
    }

    setNuevoNombreEquipo('');
    setModalEquipoVisible(false);

    obtenerEquipos();
  }

  // =========================
  // ELIMINAR CATEGORIA
  // =========================

  async function eliminarCategoria(
    id: string,
    nombre: string
  ) {

    Alert.alert(
      'Eliminar',
      `¿Eliminar categoría "${nombre}"?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {

            const { count } = await supabase
              .from('partidos')
              .select('*', {
                count: 'exact',
                head: true
              })
              .eq('categoria_id', id);

            if ((count || 0) > 0) {

              Alert.alert(
                'No permitido',
                'La categoría tiene partidos registrados.'
              );

              return;
            }

            await supabase
              .from('categorias')
              .delete()
              .eq('id', id);

            setCategoriaId('');

            obtenerCategorias();
          }
        }
      ]
    );
  }

  // =========================
  // ELIMINAR EQUIPO
  // =========================

  async function eliminarEquipo(
    id: string,
    nombre: string
  ) {

    Alert.alert(
      'Eliminar',
      `¿Eliminar equipo "${nombre}"?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {

            const { data: p1 } = await supabase
              .from('partidos')
              .select('id')
              .eq('equipo1_id', id)
              .limit(1);

            const { data: p2 } = await supabase
              .from('partidos')
              .select('id')
              .eq('equipo2_id', id)
              .limit(1);

            if (
              (p1?.length || 0) > 0 ||
              (p2?.length || 0) > 0
            ) {

              Alert.alert(
                'No permitido',
                'El equipo tiene historial de partidos.'
              );

              return;
            }

            await supabase
              .from('equipos')
              .delete()
              .eq('id', id);

            if (equipo1 === id) {
              setEquipo1('');
            }

            if (equipo2 === id) {
              setEquipo2('');
            }

            obtenerEquipos();
          }
        }
      ]
    );
  }

  // =========================
  // LOGICA DE PRE-CREACION
  // =========================

  function validarYMostrarResumen() {
    if (!categoriaId || !equipo1 || !equipo2) {
      Alert.alert(
        'Atención',
        'Selecciona todos los campos.'
      );
      return;
    }

    if (equipo1 === equipo2) {
      Alert.alert(
        'Atención',
        'No puedes seleccionar el mismo equipo.'
      );
      return;
    }

    setModalResumenVisible(true);
  }

  // =========================
  // CREAR PARTIDO
  // =========================

  async function confirmarYCrear() {

    setModalResumenVisible(false);

    setLoading(true);

    try {

      const { data, error } = await supabase
        .from('partidos')
        .insert({
          categoria_id: categoriaId,
          equipo1_id: equipo1,
          equipo2_id: equipo2,

          estado: 'PENDIENTE',
          periodo_actual: 'PENDIENTE',

          goles_ep1: 0,
          goles_ep2: 0
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      router.replace(
        `/partido?id=${data.id}`
      );

    } catch (error: any) {

      Alert.alert(
        'Error',
        error.message
      );

      setLoading(false);
    }
  }

  // =========================
  // HELPERS
  // =========================

  const categoriaSeleccionada =
    categorias.find(
      c => c.id === categoriaId
    );

  const equipo1Seleccionado =
    equipos.find(
      e => e.id === equipo1
    );

  const equipo2Seleccionado =
    equipos.find(
      e => e.id === equipo2
    );

  // =========================
  // LOADING
  // =========================

  if (loading) {

    return (
      <View style={styles.centerContainer}>

        <ConexionRequeridaModal />

        <ActivityIndicator
          size="large"
          color="#000"
        />

      </View>
    );
  }

  // =========================
  // UI
  // =========================

  return (
    <SafeAreaView style={styles.mainContainer}>

      <ConexionRequeridaModal />

      <KeyboardAvoidingView
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
        }
        style={{ flex: 1 }}
      >

        <ScrollView
          contentContainerStyle={styles.scrollContent}
        >

          {/* HEADER */}

          <View style={styles.titleRow}>

            <Text style={styles.title}>
              Nuevo Partido
            </Text>

            <Ionicons
              name="football"
              size={34}
              color="#000"
              style={{ marginLeft: 10 }}
            />

          </View>

          {/* =========================
              CATEGORIA
          ========================= */}

          <View style={styles.card}>

            <View style={styles.labelHeader}>

              <Text style={styles.label}>
                Categoría
              </Text>

              {categoriaId !== '' && (
                <TouchableOpacity
                  onPress={() =>
                    eliminarCategoria(
                      categoriaId,
                      categoriaSeleccionada?.nombre
                    )
                  }
                >
                  <Ionicons
                    name="trash-outline"
                    size={22}
                    color="#d11a2a"
                  />
                </TouchableOpacity>
              )}

            </View>

            <TouchableOpacity
              style={[
                styles.selector,
                categoriaId !== '' &&
                  styles.selectorActive
              ]}
              onPress={() =>
                setSelectorCategoria(true)
              }
            >

              <Text
                style={[
                  styles.selectorText,
                  categoriaId !== '' &&
                    styles.selectorTextActive
                ]}
              >
                {categoriaSeleccionada?.nombre ||
                  'Seleccionar'}
              </Text>

              <Ionicons
                name="chevron-down"
                size={20}
                color={
                  categoriaId !== ''
                    ? '#fff'
                    : '#000'
                }
              />

            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addButton}
              onPress={() =>
                setModalCategoriaVisible(true)
              }
            >

              <Ionicons
                name="add-circle-outline"
                size={20}
                color="#1d7a34"
              />

              <Text style={styles.addButtonText}>
                Nueva
              </Text>

            </TouchableOpacity>

          </View>

          {/* =========================
              EQUIPOS
          ========================= */}

          <View style={styles.card}>

            <Text style={styles.label}>
              Equipos
            </Text>

            {/* EQUIPO 1 */}

            <View style={styles.rowWrapper}>

              <TouchableOpacity
                style={[
                  styles.selector,
                  { flex: 1 },
                  equipo1 !== '' &&
                    styles.selectorActive
                ]}
                onPress={() =>
                  setSelectorEquipo1(true)
                }
              >

                <Text
                  style={[
                    styles.selectorText,
                    equipo1 !== '' &&
                      styles.selectorTextActive
                  ]}
                >
                  {equipo1Seleccionado?.nombre ||
                    'Equipo 1'}
                </Text>

              </TouchableOpacity>

              {equipo1 !== '' && (
                <TouchableOpacity
                  style={styles.trashSmall}
                  onPress={() =>
                    eliminarEquipo(
                      equipo1,
                      equipo1Seleccionado?.nombre
                    )
                  }
                >
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color="#d11a2a"
                  />
                </TouchableOpacity>
              )}

            </View>

            <View style={styles.vsDivider}>
              <Text style={styles.vsText}>
                VS
              </Text>
            </View>

            {/* EQUIPO 2 */}

            <View style={styles.rowWrapper}>

              <TouchableOpacity
                style={[
                  styles.selector,
                  { flex: 1 },
                  equipo2 !== '' &&
                    styles.selectorActive
                ]}
                onPress={() =>
                  setSelectorEquipo2(true)
                }
              >

                <Text
                  style={[
                    styles.selectorText,
                    equipo2 !== '' &&
                      styles.selectorTextActive
                  ]}
                >
                  {equipo2Seleccionado?.nombre ||
                    'Equipo 2'}
                </Text>

              </TouchableOpacity>

              {equipo2 !== '' && (
                <TouchableOpacity
                  style={styles.trashSmall}
                  onPress={() =>
                    eliminarEquipo(
                      equipo2,
                      equipo2Seleccionado?.nombre
                    )
                  }
                >
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color="#d11a2a"
                  />
                </TouchableOpacity>
              )}

            </View>

            <TouchableOpacity
              style={styles.addButton}
              onPress={() =>
                setModalEquipoVisible(true)
              }
            >

              <Ionicons
                name="add-circle-outline"
                size={20}
                color="#1d7a34"
              />

              <Text style={styles.addButtonText}>
                Nuevo Equipo
              </Text>

            </TouchableOpacity>

          </View>

          {/* BOTON */}

          <TouchableOpacity
            style={styles.createButton}
            onPress={validarYMostrarResumen}
          >

            <Text style={styles.createButtonText}>
              Crear Partido
            </Text>

          </TouchableOpacity>

        </ScrollView>

      </KeyboardAvoidingView>

      {/* =========================
          MODAL RESUMEN
      ========================= */}

      <Modal
        visible={modalResumenVisible}
        transparent
        animationType="slide"
      >

        <View style={styles.modalOverlay}>

          <View style={styles.summaryBox}>

            <Text style={styles.modalTitle}>
              Confirmar Partido
            </Text>

            <View style={styles.summaryBadge}>
              <Text style={styles.summaryBadgeText}>
                {categoriaSeleccionada?.nombre}
              </Text>
            </View>

            <View style={styles.summaryRow}>

              <Text style={styles.summaryTeam}>
                {equipo1Seleccionado?.nombre}
              </Text>

              <Text style={styles.summaryVs}>
                VS
              </Text>

              <Text style={styles.summaryTeam}>
                {equipo2Seleccionado?.nombre}
              </Text>

            </View>

            <View style={styles.modalButtons}>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() =>
                  setModalResumenVisible(false)
                }
              >
                <Text>
                  Corregir
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={confirmarYCrear}
              >
                <Text style={styles.saveText}>
                  Confirmar
                </Text>
              </TouchableOpacity>

            </View>

          </View>

        </View>

      </Modal>

      {/* =========================
          SELECTORES
      ========================= */}

      <SelectorModal
        visible={selectorCategoria}
        title="Categorías"
        data={categorias}
        selectedValue={categoriaId}
        onSelect={setCategoriaId}
        onClose={() =>
          setSelectorCategoria(false)
        }
      />

      <SelectorModal
        visible={selectorEquipo1}
        title="Equipo 1"
        data={equipos.filter(
          e => e.id !== equipo2
        )}
        selectedValue={equipo1}
        onSelect={setEquipo1}
        onClose={() =>
          setSelectorEquipo1(false)
        }
      />

      <SelectorModal
        visible={selectorEquipo2}
        title="Equipo 2"
        data={equipos.filter(
          e => e.id !== equipo1
        )}
        selectedValue={equipo2}
        onSelect={setEquipo2}
        onClose={() =>
          setSelectorEquipo2(false)
        }
      />

      {/* =========================
          MODAL CATEGORIA
      ========================= */}

      <Modal
        visible={modalCategoriaVisible}
        transparent
        animationType="fade"
      >

        <View style={styles.modalOverlay}>

          <View style={styles.modalBox}>

            <Text style={styles.modalTitle}>
              Nueva Categoría
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Ej: Masculino"
              value={nuevoNombreCategoria}
              onChangeText={
                setNuevoNombreCategoria
              }
            />

            <View style={styles.modalButtons}>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() =>
                  setModalCategoriaVisible(false)
                }
              >
                <Text>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={crearCategoria}
              >
                <Text style={styles.saveText}>
                  Guardar
                </Text>
              </TouchableOpacity>

            </View>

          </View>

        </View>

      </Modal>

      {/* =========================
          MODAL EQUIPO
      ========================= */}

      <Modal
        visible={modalEquipoVisible}
        transparent
        animationType="fade"
      >

        <View style={styles.modalOverlay}>

          <View style={styles.modalBox}>

            <Text style={styles.modalTitle}>
              Nuevo Equipo
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Nombre del equipo"
              value={nuevoNombreEquipo}
              onChangeText={
                setNuevoNombreEquipo
              }
            />

            <View style={styles.modalButtons}>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() =>
                  setModalEquipoVisible(false)
                }
              >
                <Text>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={crearEquipo}
              >
                <Text style={styles.saveText}>
                  Guardar
                </Text>
              </TouchableOpacity>

            </View>

          </View>

        </View>

      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  mainContainer: {
    flex: 1,
    backgroundColor: '#f8f8f8'
  },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },

  scrollContent: {
    padding: 25,
    paddingBottom: 40
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10
  },

  title: {
    fontSize: 32,
    fontWeight: 'bold'
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    elevation: 4
  },

  labelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },

  label: {
    fontSize: 18,
    fontWeight: 'bold'
  },

  rowWrapper: {
    flexDirection: 'row',
    alignItems: 'center'
  },

  trashSmall: {
    marginLeft: 12,
    padding: 5
  },

  selector: {
    backgroundColor: '#f3f3f3',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  selectorActive: {
    backgroundColor: '#000'
  },

  selectorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000'
  },

  selectorTextActive: {
    color: '#fff'
  },

  vsDivider: {
    alignItems: 'center',
    marginVertical: 8
  },

  vsText: {
    fontWeight: 'bold',
    color: '#000', // Modificado a negro
    fontSize: 14
  },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 15
  },

  addButtonText: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#1d7a34'
  },

  createButton: {
    backgroundColor: '#1d7a34', // Modificado a verde
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 10
  },

  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20
  },

  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 25
  },

  summaryBox: {
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 30,
    alignItems: 'center'
  },

  summaryBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 20
  },

  summaryBadgeText: {
    fontWeight: 'bold',
    color: '#666'
  },

  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30
  },

  summaryTeam: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center'
  },

  summaryVs: {
    marginHorizontal: 15,
    color: '#000', // Modificado a negro en el modal también
    fontWeight: 'bold'
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20
  },

  input: {
    backgroundColor: '#f3f3f3',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20
  },

  modalButtons: {
    flexDirection: 'row',
    gap: 10
  },

  cancelBtn: {
    flex: 1,
    backgroundColor: '#eee',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center'
  },

  saveBtn: {
    flex: 1,
    backgroundColor: '#1d7a34',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center'
  },

  saveText: {
    color: '#fff',
    fontWeight: 'bold'
  }

});