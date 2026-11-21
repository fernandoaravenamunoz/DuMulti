// =====================================================
// Personajes (datos centralizados)
// Los NOMBRES SON PROVISORIOS: para cambiarlos basta con editar "nombre" aquí.
// En la fase 2 se agregan los valores de daño, alcance y recarga de cada arma.
//
// "retrato" define los colores del retrato del HUD (se dibuja con código).
//   peinado: 'puas' | 'casco' | 'moño' | 'rapado' | 'gorro' | 'trenzas' | 'cresta' | 'gorra'
// =====================================================
(function () {
  'use strict';
  DM.PERSONAJES = {
    pirulo: {
      nombre: 'PIRULO ZAS', antes: 'Chispa',
      contacto: 'MANOPLA DE CHISPAS', distancia: 'RESORTERA',
      ventaja: 'ACTIVA INTERRUPTORES A DISTANCIA',
      vida: 100, escudo: 0, velocidad: 1,
      retrato: { piel: '#d9a066', pielS: '#a8714a', pelo: '#ffd34a', peloS: '#b8871a', peinado: 'puas', ropa: '#0f5a6b', extra: 'antiparras' }
    },
    gargolfo: {
      nombre: 'GARGOLFO', antes: 'Tuerca',
      contacto: 'FIERRO', distancia: 'HONDA DE TUERCAS',
      ventaja: 'DERRIBA REJILLAS Y DANA MAS A ROBOTS',
      vida: 100, escudo: 0, velocidad: 1,
      retrato: { piel: '#c48a5c', pielS: '#8f5e3a', pelo: '#3a3a52', peloS: '#16151f', peinado: 'casco', ropa: '#6b5a1a', extra: 'barba' }
    },
    chucrut: {
      nombre: 'TIA CHUCRUT', antes: 'Dona Lata',
      contacto: 'SARTEN', distancia: 'TAPAS DE LATA',
      ventaja: '+20% DE VIDA',
      vida: 120, escudo: 0, velocidad: 1,
      retrato: { piel: '#e0b090', pielS: '#a87a5a', pelo: '#8d93ad', peloS: '#4a4f63', peinado: 'moño', ropa: '#7a1466', extra: 'lentes' }
    },
    fideo: {
      nombre: 'FIDEO TURBO', antes: 'Flaco Neon',
      contacto: 'ESPATULA AFILADA', distancia: 'TENEDORES',
      ventaja: 'CORRE MAS RAPIDO',
      vida: 100, escudo: 0, velocidad: 1.12,
      retrato: { piel: '#f0c8a0', pielS: '#b88a64', pelo: '#22e4ff', peloS: '#0f5a6b', peinado: 'cresta', ropa: '#2a2a3c', extra: 'none' }
    },
    noquimbo: {
      nombre: 'NOQUIMBO', antes: 'Varilla',
      contacto: 'PALO', distancia: 'CERBATANA DE DARDOS',
      ventaja: 'VE LAS TRAMPAS A TRAVES DE PAREDES',
      vida: 100, escudo: 0, velocidad: 1,
      retrato: { piel: '#a8744c', pielS: '#704a2c', pelo: '#16151f', peloS: '#07060d', peinado: 'gorro', ropa: '#3a3a52', extra: 'visor' }
    },
    pantuflina: {
      nombre: 'PANTUFLINA', antes: '(nueva)',
      contacto: 'LLAVE CRIOGENICA', distancia: 'AMPOLLAS DE REFRIGERANTE',
      ventaja: 'RESISTE EL GAS Y REVIVE MAS RAPIDO',
      vida: 100, escudo: 0, velocidad: 1,
      retrato: { piel: '#e8c0a8', pielS: '#b08870', pelo: '#c8fbff', peloS: '#4f8f9f', peinado: 'trenzas', ropa: '#e6e3ff', extra: 'none' }
    },
    cachureo: {
      nombre: 'CACHUREO', antes: '(nueva)',
      contacto: 'DESTORNILLADOR ELECTRICO', distancia: 'LANZADOR DE PERNOS',
      ventaja: 'LOS ROBOTS TARDAN MAS EN DETECTARLA',
      vida: 100, escudo: 0, velocidad: 1,
      retrato: { piel: '#d0956a', pielS: '#9a6644', pelo: '#e8b923', peloS: '#8a6d12', peinado: 'gorra', ropa: '#4a4f63', extra: 'antiparras' }
    },
    mostachon: {
      nombre: 'MOSTACHON', antes: '(nuevo)',
      contacto: 'PORRA DE SEGURIDAD', distancia: 'ATURDIDOR DE DARDOS',
      ventaja: 'EMPIEZA CON 25 DE ESCUDO',
      vida: 100, escudo: 25, velocidad: 1,
      retrato: { piel: '#c89070', pielS: '#906048', pelo: '#2a2020', peloS: '#100a0a', peinado: 'rapado', ropa: '#16404c', extra: 'bigote' }
    }
  };
  DM.ORDEN_PERSONAJES = ['pirulo', 'gargolfo', 'chucrut', 'fideo', 'noquimbo', 'pantuflina', 'cachureo', 'mostachon'];
})();
