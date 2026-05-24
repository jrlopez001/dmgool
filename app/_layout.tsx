import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      {/* Esto asegura que la barra de estado (hora, batería) se vea bien */}
      <StatusBar style="dark" />
      
      <Stack
        screenOptions={{
          // Estilo global de la cabecera para todas las pantallas
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerTintColor: '#000',
          headerTitleStyle: {
            fontWeight: 'bold',
            fontSize: 20,
          },
          headerShadowVisible: false, // Diseño limpio sin línea divisoria
        }}
      >
        {/* Pantalla Principal: Lista de Partidos */}
        <Stack.Screen 
          name="index" 
          options={{ 
            title: 'DMGOOL',
            headerShown: false // La ocultamos porque pusimos un título grande dentro de index.tsx
          }} 
        />

        {/* Pantalla para Controlar los Goles */}
        <Stack.Screen 
          name="partido" 
          options={{ 
            title: 'Marcador en Vivo',
            headerBackTitle: 'Volver', // Texto junto a la flecha en iOS
          }} 
        />

        {/* Pantalla para Crear Partidos */}
        <Stack.Screen 
          name="nuevo-partido" 
          options={{ 
            title: 'Configurar Encuentro',
            presentation: 'modal', // En iPhone y Android moderno saldrá como una tarjeta desde abajo
          }} 
        />
      </Stack>
    </>
  );
}