import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import SelectorModal from '../components/SelectorModal';
import { supabase } from '../lib/supabase';

export default function AsignarJugadorScreen() {
  const [categorias, setCategorias] = useState<any[]>([]);
  const [equipos, setEquipos] = useState<any[]>([]);
  const [relaciones, setRelaciones] = useState<any[]>([]);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [categoriaId, setCategoriaId] = useState('');
  const [equipoId, setEquipoId] = useState('');
  const [nombre, setNombre] = useState('');
  const [numero, setNumero] = useState('');
  const [posicion, setPosicion] = useState('DELANTERO');
  const [selectorCategoria, setSelectorCategoria] = useState(false);
  const [selectorEquipo, setSelectorEquipo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingEquipos, setLoadingEquipos] = useState(false);
  const [saving, setSaving] = useState(false); // Para evitar doble clic

  useEffect(() => { cargarDatos(); }, []);

  async function cargarDatos() {
    try {
      setLoading(true);
      const [categoriasRes, equiposRes, relacionesRes] = await Promise.all([
        supabase.from('categorias').select('*').order('nombre'),
        supabase.from('equipos').select('*').order('nombre'),
        supabase.from('equipos_categorias').select('*'),
      ]);

      if (categoriasRes.error) throw new Error(`Categorías: ${categoriasRes.error.message}`);
      if (equiposRes.error) throw new Error(`Equipos: ${equiposRes.error.message}`);
      if (relacionesRes.error) throw new Error(`Relaciones: ${relacionesRes.error.message}`);

      console.log('📦 Relaciones cargadas:', relacionesRes.data?.length);
      setCategorias(categoriasRes.data || []);
      setEquipos(equiposRes.data || []);
      setRelaciones(relacionesRes.data || []);
    } catch (error: any) {
      Alert.alert('Error', error.message);
      console.error(error);
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
      .eq('activo', true) // Solo jugadores activos
      .order('numero_camisola');
    if (error) Alert.alert('Error', error.message);
    else setJugadores(data || []);
    setLoadingEquipos(false);
  }

  // Verificar si el jugador tiene partidos asociados (goles o tarjetas)
  async function tienePartidosAsociados(jugadorId: string): Promise<boolean> {
    try {
      // Verificar en tabla 'goles'
      const { count: golesCount, error: golesError } = await supabase
        .from('goles')
        .select('*', { count: 'exact', head: true })
        .eq('jugador_id', jugadorId);

      if (golesError && golesError.code !== '42P01') {
        console.warn('Error checking goles:', golesError);
      }

      // Verificar en tabla 'tarjetas'
      const { count: tarjetasCount, error: tarjetasError } = await supabase
        .from('tarjetas')
        .select('*', { count: 'exact', head: true })
        .eq('jugador_id', jugadorId);

      if (tarjetasError && tarjetasError.code !== '42P01') {
        console.warn('Error checking tarjetas:', tarjetasError);
      }

      return (golesCount || 0) > 0 || (tarjetasCount || 0) > 0;
    } catch (error) {
      console.error('Error checking matches:', error);
      return false;
    }
  }

  // Eliminación lógica (activo = false)
  async function eliminarJugador(id: string, nombreJugador: string) {
    const tienePartidos = await tienePartidosAsociados(id);

    if (tienePartidos) {
      Alert.alert(
        'Eliminar Jugador',
        `¿Estás seguro de eliminar a "${nombreJugador}" permanentemente? Este jugador tiene partidos registrados, y se perderán todos sus registros (goles, tarjetas, etc.).`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar de todas formas',
            style: 'destructive',
            onPress: async () => {
              const { error } = await supabase
                .from('jugadores')
                .update({ activo: false })
                .eq('id', id);
              if (error) {
                Alert.alert('Error', error.message);
              } else {
                cargarJugadores(equipoId, categoriaId);
              }
            }
          }
        ]
      );
    } else {
      Alert.alert(
        'Eliminar Jugador',
        `¿Deseas eliminar a "${nombreJugador}" permanentemente?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: async () => {
              const { error } = await supabase
                .from('jugadores')
                .update({ activo: false })
                .eq('id', id);
              if (error) {
                Alert.alert('Error', error.message);
              } else {
                cargarJugadores(equipoId, categoriaId);
              }
            }
          }
        ]
      );
    }
  }

  const categoriaSeleccionada = categorias.find(c => c.id === categoriaId);
  const equipoSeleccionado = equipos.find(e => e.id === equipoId);

  const equiposFiltrados = equipos.filter(equipo =>
    relaciones.some(rel => rel.equipo_id === equipo.id && rel.categoria_id === categoriaId)
  );
  const hayEquiposDisponibles = equiposFiltrados.length > 0;

  // Validar si el número ya existe en el mismo equipo y categoría (jugadores activos)
  async function validarNumeroUnico(numeroCamisola: number): Promise<boolean> {
    const { data, error } = await supabase
      .from('jugadores')
      .select('id')
      .eq('equipo_id', equipoId)
      .eq('categoria_id', categoriaId)
      .eq('numero_camisola', numeroCamisola)
      .eq('activo', true);
    if (error) {
      console.error(error);
      return false;
    }
    return data.length === 0;
  }

  async function guardarJugador() {
    if (saving) return; // Evita doble clic
    if (!categoriaId || !equipoId) {
      Alert.alert('Atención', 'Selecciona categoría y equipo.');
      return;
    }
    const nombreTrim = nombre.trim();
    if (!nombreTrim) {
      Alert.alert('Atención', 'El nombre del jugador es obligatorio.');
      return;
    }
    const numeroNum = Number(numero);
    if (!numero || isNaN(numeroNum)) {
      Alert.alert('Atención', 'El número de camisola es obligatorio y debe ser un número.');
      return;
    }
    const posicionUpper = posicion.trim().toUpperCase();
    if (!posicionUpper) {
      Alert.alert('Atención', 'La posición es obligatoria.');
      return;
    }

    // Validar unicidad del número
    const esUnico = await validarNumeroUnico(numeroNum);
    if (!esUnico) {
      Alert.alert('Error', `Ya existe un jugador activo con el número ${numeroNum} en este equipo y categoría.`);
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('jugadores').insert({
      nombre: nombreTrim,
      numero_camisola: numeroNum,
      posicion: posicionUpper,
      equipo_id: equipoId,
      categoria_id: categoriaId,
      activo: true,
    });
    setSaving(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    Alert.alert('Éxito', 'Jugador registrado');
    setNombre('');
    setNumero('');
    setPosicion('DELANTERO');
    cargarJugadores(equipoId, categoriaId);
  }

  const handleNumeroChange = (text: string) => {
    const numericValue = text.replace(/[^0-9]/g, '');
    setNumero(numericValue);
  };

  if (loading && !categorias.length && !equipos.length) {
    return <View style={styles.centered}><ActivityIndicator size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Registrar Jugador</Text>

        <Text style={styles.label}>Categoría</Text>
        <TouchableOpacity style={styles.selector} onPress={() => setSelectorCategoria(true)}>
          <Text>{categoriaSeleccionada?.nombre || 'Seleccionar Categoría'}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Equipo</Text>
        {!categoriaId ? (
          <View style={[styles.selector, styles.disabled]}>
            <Text style={styles.textDisabled}>Primero selecciona una categoría</Text>
          </View>
        ) : !hayEquiposDisponibles ? (
          <View style={[styles.selector, styles.disabled]}>
            <Text style={styles.textDisabled}>
              No hay equipos para esta categoría. Verifica RLS en equipos_categorias o revisa consola.
            </Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.selector} onPress={() => setSelectorEquipo(true)}>
            <Text>{equipoSeleccionado?.nombre || `Seleccionar Equipo (${equiposFiltrados.length})`}</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.label}>Nombre del Jugad@r</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Juan Pérez"
          value={nombre}
          onChangeText={setNombre}
        />

        <Text style={styles.label}>Número de Camisola</Text>
        <TextInput
          style={styles.input}
          placeholder="Solo números"
          value={numero}
          onChangeText={handleNumeroChange}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Posición</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: DELANTERO, DEFENSA"
          value={posicion}
          onChangeText={(text) => setPosicion(text.toUpperCase())}
          autoCapitalize="characters"
        />

        <TouchableOpacity style={styles.button} onPress={guardarJugador} disabled={saving}>
          <Text style={styles.btnText}>{saving ? 'Guardando...' : 'Guardar Jugador'}</Text>
        </TouchableOpacity>

        <View style={styles.tablaContainer}>
          <Text style={styles.subtitulo}>Jugadores Registrados</Text>
          {loadingEquipos ? <ActivityIndicator size="small" /> : jugadores.length === 0 ? (
            <Text style={{ color: '#666' }}>No hay jugadores activos para este equipo en esta categoría.</Text>
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
                  <TouchableOpacity onPress={() => eliminarJugador(item.id, item.nombre)}>
                    <Text style={{ color: 'red', fontSize: 18 }}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>

      <SelectorModal visible={selectorCategoria} title="Categorías" data={categorias} selectedValue={categoriaId}
        onSelect={(id) => { setCategoriaId(id); setEquipoId(''); setJugadores([]); setSelectorCategoria(false); }}
        onClose={() => setSelectorCategoria(false)} />
      <SelectorModal visible={selectorEquipo} title="Equipos" data={equiposFiltrados} selectedValue={equipoId}
        onSelect={(id) => { setEquipoId(id); setSelectorEquipo(false); cargarJugadores(id, categoriaId); }}
        onClose={() => setSelectorEquipo(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContent: { padding: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 6, color: '#333' },
  selector: { backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 15 },
  disabled: { backgroundColor: '#f0f0f0', opacity: 0.7 },
  textDisabled: { color: '#999', textAlign: 'center' },
  input: { backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 15 },
  button: { backgroundColor: '#00619a', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  tablaContainer: { marginTop: 25, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e5e5', padding: 10 },
  subtitulo: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  encabezado: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f3f3', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 5, marginBottom: 5 },
  fila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 5, borderBottomWidth: 1, borderBottomColor: '#eee' },
  colNumero: { width: 50, fontWeight: 'bold', textAlign: 'center' },
  colNombre: { flex: 1, paddingHorizontal: 8 },
  colPosicion: { width: 90, textAlign: 'center' },
  colAccion: { width: 60, alignItems: 'center' },
});