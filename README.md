# interactiveai

Avatar IA interactivo — una cara animada (solo ojos y boca, generada, sin foto real) con parpadeo idle, guiños y una mascota tipo Tamagotchi manejada 100% por teclado.

## Correr

Es un sitio estático, no necesita build. Abrí `index.html` en el navegador (Chrome recomendado).

## Controles

- **C** — darle de comer, una croqueta a la vez (10 por plato, 3 platos por día)
- **A** — darle de beber (máximo 8 vasos por día)
- **Espacio mantenido** — acariciarla
- **Espacio tocado y soltado rápido** — jugar con la pelota (y de paso ir al parque)
- **V** — activa/desactiva la escucha por voz (ver abajo, requiere Ollama)
- **R** — revivirla (solo si murió, y solo después del duelo de 3hs)

No hay botones en pantalla: todo el estado de ánimo se expresa a través de la cara.

## Reglas de cuidado

- Comer los 3 platos completos (10 croquetas cada uno) y beber cada día la mantiene alegre.
- Comer de más (un 4to plato en el día) o beber de más (más de 8 vasos) la enferma un rato (se pone roja y puede vomitar de forma espontánea) — la duración escala con cuánto se pasaron.
- No terminar los platos la deja desnutrida.
- Darle de comer muy rápido, sin esperar a que trague (la boca en O), arriesga que se ahogue y muera.
- Si no come ni bebe nada por 3 días reales seguidos, se muere. Revivir no es instantáneo: hay que esperar 3 horas reales de duelo antes de que **R** funcione.
- El estado se guarda en `localStorage`, así que persiste entre visitas — los conteos son en tiempo real, no dependen de tener la pestaña abierta.

## Hablarle por voz (opcional, con Ollama)

Apretando **V** se activa el micrófono (reconocimiento de voz del navegador, andá en Chrome) y Lu te contesta hablando, usando un modelo local de [Ollama](https://ollama.com) como cerebro — sin nube, sin key, gratis. Para que funcione:

1. Instalá Ollama y bajá un modelo: `ollama pull llama3.2:1b`
2. Corré Ollama permitiendo que el navegador le hable:
   ```
   OLLAMA_ORIGINS="*" ollama serve
   ```
3. Abrí el juego en la misma computadora donde corre Ollama.

Si usás otro modelo, cambiá `OLLAMA_MODEL` en `script.js`.

## Amigos (ubicación real, requiere permiso de ubicación)

El botón de arriba a la izquierda abre un mapa tipo radar con los amigos que te encontraste. Cómo funciona:

- Mientras está en el parque (después de jugar a la pelota), tu dispositivo comparte su ubicación contra Firebase Realtime Database.
- Si otro dispositivo con el juego abierto está en el parque a menos de 100 metros, las dos mascotas "se encuentran": la visita se extiende a 2 horas, aparecen juntas, y quedan como amigos para siempre.
- El mapa muestra a cada amigo por dirección/distancia relativa a vos ahora mismo, con un color según su estado de ánimo, y cuántas veces se le murió la mascota.

Usa un proyecto de Firebase ya configurado en `script.js` (`firebaseConfig`) — si armás tu propio proyecto, reemplazalo ahí.
