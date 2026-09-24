# Métodos Numéricos · Unidad 2

Portal web didáctico para estudiar sistemas de ecuaciones lineales mediante programas independientes y ampliables.

## Programas

### Sesión 6 · Factorización LU-Doolittle

- Clasifica el sistema como SCD, SCI o SI.
- Construye las matrices L y U explicando cada operación.
- Resuelve `LY = B` por sustitución hacia adelante.
- Resuelve `UX = Y` por sustitución hacia atrás.
- Comprueba la respuesta mediante `AX ≈ B` y calcula el residual.
- Reutiliza L y U con un nuevo vector B sin repetir la factorización.

### Sesión 7 · Jacobi y Gauss-Seidel

- Verifica `det(A) ≠ 0` y clasifica el sistema antes de iterar.
- Demuestra la dominancia diagonal estricta fila por fila.
- Calcula el criterio de Sassenfeld para Gauss-Seidel cuando corresponde.
- Permite configurar el vector inicial, la tolerancia y el criterio de error.
- Revela por separado la iteración, el error y la decisión de parada.
- Identifica los datos de pasos anteriores usados en cada cálculo.
- Conserva una tabla completa de iteraciones y comprueba el residual final.

Todo funciona directamente en el navegador con HTML, CSS y JavaScript; no requiere servidor Python.

## Uso

Abra `index.html` o visite el sitio publicado con GitHub Pages.
