import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import SelectorModal from '../components/SelectorModal';
import { supabase } from '../lib/supabase';

export default function AsignarJugadorScreen() {
  const [categorias, setCategorias] = useState<any[]>([]);
  const [equipos, setEquipos] = useState<any[]>([]);
  const [relaciones, setRelaciones] = useState<any[]>([]); // 👈 nuevo estado
  const [jugadores, setJugadores] = useState<any[]>([]);

  const [categoriaId, setCategoriaId] = useState('');
  const [equipoId, setEquipoId] = useState('');

  const [nombre, setNombre] = useState('');
  const [numero, setNumero] = useState('');
  const [posicion, setPosicion] = useState('Delantero');

  const [selectorCategoria, setSelectorCategoria] = useState(false);
  const [selectorEquipo, setSelectorEquipo] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingEquipos, setLoadingEquipos] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    try {
      setLoading(true);
      const [categoriasRes, equiposRes, relacionesRes] = await Promise.all([
        supabase.from('categorias').select('*').order('nombre'),
        supabase.from('equipos').select('*').order('nombre'),
        supabase.from('equipos_categorias').select('*'), // 👈 cargar relaciones
      ]);

      if (categoriasRes.error) throw categoriasRes.error;
      if (equiposRes.error) throw equiposRes.error;
      if (relacionesRes.error) throw relacionesRes.error;

      setCategorias(categoriasRes.data || []);
      setEquipos(equiposRes.data || []);
      setRelaciones(relacionesRes.data || []);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  }

  async function cargarJugadores(idEquipo: string, idCategoria: string) {
    if (!idEquipo || !idCategoria) return;
    setLoadingEquipos(true);
    const { data, error } = await supabase
      .from('jugadores')
      .select('*')
      .eq('equipo_id', idEquipo)
      .eq('categoria_id', idCategoria)
      .order('numero_camisola');

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setJugadores(data || []);
    }
    setLoadingEquipos(false);
  }

  async function eliminarJugador(id: string) {
    Alert.alert(
      'Eliminar jugador',
      '¿Deseas eliminar este jugador?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('jugadores').delete().eq('id', id);
            if (error) {
              Alert.alert('Error', error.message);
              return;
            }
            cargarJugadores(equipoId, categoriaId);
          },
        },
      ]
    );
  }

  const categoriaSeleccionada = categorias.find(c => c.id === categoriaId);
  const equipoSeleccionado = equipos.find(e => e.id === equipoId);

  // 👇 Filtrado correcto usando la tabla intermedia equipos_categorias
  const equiposFiltrados = equipos.filter(equipo =>
    relaciones.some(rel => rel.equipo_id === equipo.id && rel.categoria_id === categoriaId)
  );

  const hayEquiposDisponibles = equiposFiltrados.length > 0;

  async function guardarJugador() {
    if (!categoriaId || !equipoId || !nombre.trim()) {
      Alert.alert('Atención', 'Selecciona categoría, equipo y nombre.');
      return;
    }

    const { error } = await supabase.from('jugadores').insert({
      nombre: nombre.trim(),
      numero_camisola: Number(numero) || 0,
      posicion,
      equipo_id: equipoId,
      categoria_id: categoriaId,
    });

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    Alert.alert('Éxito', 'Jugador registrado correctamente');
    setNombre('');
    setNumero('');
    setPosicion('Delantero');

    cargarJugadores(equipoId, categoriaId);
  }

  if (loading && !categorias.length && !equipos.length) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Registrar Jugador</Text>

        <TouchableOpacity style={styles.selector} onPress={() => setSelectorCategoria(true)}>
          <Text>{categoriaSeleccionada?.nombre || 'Seleccionar Categoría'}</Text>
        </TouchableOpacity>

        {!categoriaId ? (
          <View style={[styles.selector, styles.disabled]}>
            <Text style={styles.textDisabled}>Primero selecciona una categoría</Text>
          </View>
        ) : !hayEquiposDisponibles ? (
          <View style={[styles.selector, styles.disabled]}>
            <Text style={styles.textDisabled}>
              No hay equipos registrados para esta categoría.
            </Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.selector} onPress={() => setSelectorEquipo(true)}>
            <Text>
              {equipoSeleccionado?.nombre || `Seleccionar Equipo (${equiposFiltrados.length})`}
            </Text>
          </TouchableOpacity>
        )}

        <TextInput style={styles.input} placeholder="Nombre del Jugador" value={nombre} onChangeText={setNombre} />
        <TextInput
          style={styles.input}
          placeholder="Número de Camisola"
          value={numero}
          onChangeText={setNumero}
          keyboardType="numeric"
        />
        <TextInput style={styles.input} placeholder="Posición" value={posicion} onChangeText={setPosicion} />

        <TouchableOpacity style={styles.button} onPress={guardarJugador}>
          <Text style={styles.btnText}>Guardar Jugador</Text>
        </TouchableOpacity>

        <View style={styles.tablaContainer}>
          <Text style={styles.subtitulo}>Jugadores Registrados</Text>
          {loadingEquipos ? (
            <ActivityIndicator size="small" />
          ) : jugadores.length === 0 ? (
            <Text style={{ color: '#666' }}>No hay jugadores para este equipo en esta categoría.</Text>
          ) : (
            <>
              <View style={styles.encabezado}>
                <Text style={styles.colNumero}>#</Text>
                <Text style={styles.colNombre}>Jugador</Text>
                <Text style={styles.colPosicion}>Posición</Text>
                <Text style={styles.colAccion}>Acción</Text>
              </View>
              {jugadores.map(item => (
                <View key={item.id} style={styles.fila}>
                  <Text style={styles.colNumero}>{item.numero_camisola}</Text>
                  <Text style={styles.colNombre}>{item.nombre}</Text>
                  <Text style={styles.colPosicion}>{item.posicion}</Text>
                  <TouchableOpacity style={styles.colAccion} onPress={() => eliminarJugador(item.id)}>
                    <Text style={{ color: 'red', fontSize: 18 }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>

      <SelectorModal
        visible={selectorCategoria}
        title="Categorías"
        data={categorias}
        selectedValue={categoriaId}
        onSelect={(id: string) => {
          setCategoriaId(id);
          setEquipoId(''); // 👈 reiniciar equipo al cambiar categoría
          setJugadores([]);
          setSelectorCategoria(false);
        }}
        onClose={() => setSelectorCategoria(false)}
      />

      <SelectorModal
        visible={selectorEquipo}
        title="Equipos"
        data={equiposFiltrados}
        selectedValue={equipoId}
        onSelect={(id: string) => {
          setEquipoId(id);
          setSelectorEquipo(false);
          cargarJugadores(id, categoriaId);
        }}
        onClose={() => setSelectorEquipo(false)}
      />
    </View>
  );
}

// (los estilos se mantienen igual que en tu código original)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContent: { padding: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  selector: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 15,
  },
  disabled: {
    backgroundColor: '#f0f0f0',
    opacity: 0.7,
  },
  textDisabled: {
    color: '#999',
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  tablaContainer: {
    marginTop: 25,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    padding: 10,
  },
  subtitulo: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f3f3',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 5,
    marginBottom: 5,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  colNumero: { width: 50, fontWeight: 'bold', textAlign: 'center' },
  colNombre: { flex: 1, paddingHorizontal: 8 },
  colPosicion: { width: 90, textAlign: 'center' },
  colAccion: { width: 60, alignItems: 'center' },
});