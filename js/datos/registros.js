// =====================================================
// Registros de la nave (la historia se cuenta con estas notas)
// Los textos, nombres y cifras son PROVISORIOS: edítalos aquí.
//
// formato: 'comunicado' (pantalla de pared, terminal cian)
//          'carta'      (hoja suelta en el piso, papel claro)
//          'reporte'    (terminal de seguridad, encabezado rojo, CONFIDENCIAL en magenta)
// orden:   falla → despertar → contención → caída de la nave → fuga a Temukeitor
// pista:   texto corto que se destaca (códigos, horarios de trampas, ubicación de premios)
// En el mapa se ubican con la lista "registros" (ver js/mapas/sector4.js).
// =====================================================
(function () {
  'use strict';
  DM.REGISTROS = {
    c01: {
      formato: 'comunicado', titulo: 'COMUNICADO GENERAL 4-001',
      texto: 'FALLA EN EL BLOQUE CRIOGENICO 4. LA PRESION DEL REACTOR SUPERO EL LIMITE. TODO EL PERSONAL NO ESENCIAL DEBE DIRIGIRSE A LOS HANGARES. MANTENGA LA CALMA.'
    },
    c02: {
      formato: 'comunicado', titulo: 'ESTADO DEL BLOQUE 4',
      texto: 'CAPSULAS ACTIVAS: 12 POR CIENTO. TEMPERATURA EN AUMENTO. SE DETECTA MOVIMIENTO DENTRO DE CAPSULAS DESCONECTADAS. NO ABRIR LAS CAPSULAS MANUALMENTE.'
    },
    t01: {
      formato: 'carta', titulo: 'CARTA DE TEO A MARA',
      texto: 'MARA: LOS DORMIDOS SE ESTAN LEVANTANDO. TIENEN LA PIEL HELADA Y NO HABLAN. CAMINAN HACIA LAS LAMPARAS, HACIA CUALQUIER COSA CALIENTE. YO VOY AL HANGAR. SI LEES ESTO, NO PRENDAS FUEGO. TE ESPERO. TEO.',
      pista: 'EL CALOR LOS ATRAE: UNA BENGALA LOS DISTRAE'
    },
    t02: {
      formato: 'carta', titulo: 'NOTA PEGADA EN LA PASARELA',
      texto: 'LAS COMPUERTAS DEL ALA NORTE SE ABREN EN ORDEN, UNA DETRAS DE OTRA. HAY QUE CORRER AL RITMO. EN LA SALA DE LAS BALDOSAS SOLO EL TRIANGULO NO DA CORRIENTE.',
      pista: 'BALDOSA SEGURA: TRIANGULO'
    },
    r01: {
      formato: 'reporte', titulo: 'REPORTE DE SEGURIDAD 0417',
      texto: 'SE AUTORIZA A LOS DRONES CENTINELA A NEUTRALIZAR TODO MOVIMIENTO EN LOS SECTORES 3 A 6, INCLUIDA LA TRIPULACION. PRIORIDAD: CONTENCION. FIRMA: MANDO DE SEGURIDAD.'
    },
    r02: {
      formato: 'reporte', titulo: 'REPORTE DE SEGURIDAD 0420',
      texto: 'EL GUARDIAN DEL REACTOR FUE DESPERTADO. SU BLINDAJE RESISTE LAS BALAS COMUNES. LOS DRONES Y EL GUARDIAN SE APAGAN UNOS SEGUNDOS CON UN PULSO EMP. EL NUCLEO DE RESPALDO ESTA JUNTO AL REACTOR.',
      pista: 'NUCLEO CRIOGENICO: JUNTO AL REACTOR'
    },
    c03: {
      formato: 'comunicado', titulo: 'NAVEGACION',
      texto: 'LA NAVE PERDIO EL RUMBO. CAIDA ESTIMADA EN 40 HORAS. LA NAVE SALVAVIDAS DEL HANGAR B SIGUE OPERATIVA. DESTINO PROGRAMADO: TEMUKEITOR, EL ULTIMO REDUCTO DONDE LOS HUMANOS VIVEN EN PAZ.'
    },
    t03: {
      formato: 'carta', titulo: 'DIARIO DE UNA MECANICA',
      texto: 'VI A OTRO GRUPO ESCAPAR POR LOS DUCTOS: UNA NINA LLAMADA CHISPA, UN TAL TUERCA Y UNA SENORA CON UNA LATA. IBAN HACIA EL NUCLEO DE LA IA. NOSOTROS VAMOS AL HANGAR. ALGUIEN TIENE QUE LLEGAR A TEMUKEITOR.'
    },
    c04: {
      formato: 'comunicado', titulo: 'ENERGIA DEL SECTOR 2',
      texto: 'EL MONTACARGAS DEL ESTE QUEDO SIN ENERGIA. PARA REACTIVARLO HAY QUE ENCENDER LAS TRES CONSOLAS DEL SECTOR: UNA EN LA SALA DE MAQUINAS DEL NOROESTE, OTRA EN LA BODEGA DEL SURESTE Y LA ULTIMA EN LA SALA DE CONTROL DEL PISO 2.',
      pista: 'CONSOLAS: SALA NO, BODEGA SE Y CONTROL DEL PISO 2'
    },
    r03: {
      formato: 'reporte', titulo: 'REPORTE DE SEGURIDAD 0433',
      texto: 'LOS LABORATORIOS QUEDAN SELLADOS. LOS DRONES CENTINELA PATRULLAN EL CRUCE CENTRAL. LA ESCLUSA DEL SURESTE SOLO SE ABRIRA CUANDO NO QUEDEN AMENAZAS ACTIVAS EN EL SECTOR. PROHIBIDO ATRAVESAR LOS LASERES DEL PASILLO.'
    },
    t04: {
      formato: 'carta', titulo: 'NOTA DEL PILOTO',
      texto: 'LA NAVE SALVAVIDAS SE ENCIENDE DESDE LA CONSOLA DE LA TORRE DE CONTROL. DESPUES TARDA UN MINUTO EN CARGAR LOS MOTORES Y EL RUIDO ATRAE A TODO LO QUE CAMINA. CUANDO SUENE LA ALARMA DE PARTIDA, SUBAN POR LA RAMPA DEL SUR. NO ESPERA A NADIE.',
      pista: 'LA NAVE CARGA 60 S. DESPUES HAY 45 S PARA SUBIR'
    }
  };
  DM.ORDEN_REGISTROS = ['c01', 'c02', 't01', 'r01', 't02', 'c04', 'r03', 'r02', 'c03', 't03', 't04'];
})();
