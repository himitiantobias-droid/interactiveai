# interactiveai

Avatar IA interactivo — una cara animada (solo ojos y boca, generada, sin foto real) con parpadeo idle, guiños y una mascota tipo Tamagotchi manejada 100% por teclado.

## Correr

Es un sitio estático, no necesita build. Abrí `index.html` en el navegador (Chrome recomendado).

## Controles

- **C** — darle de comer (máximo 3 veces por día)
- **A** — darle de beber (máximo 8 vasos por día)
- **Espacio mantenido** — acariciarla
- **Espacio tocado y soltado rápido** — jugar con la pelota
- **R** — reiniciar (solo si murió)

No hay botones en pantalla: todo el estado de ánimo se expresa a través de la cara.

## Reglas de cuidado

- Comer y beber lo justo cada día la mantiene alegre.
- Pasarse de lo justo (más de 3 comidas u 8 aguas en el día) la enferma un rato (se pone roja y puede vomitar de forma espontánea) — la duración escala con cuánto se pasaron.
- Si no come ni bebe nada por 14 días reales seguidos, se muere (reiniciable con **R**).
- El estado se guarda en `localStorage`, así que persiste entre visitas — el conteo de los 14 días es en tiempo real, no depende de tener la pestaña abierta.
