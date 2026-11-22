# Actualizar el andamio y sus componentes

Desde la raíz del catálogo que dio origen al proyecto, ejecuta `sh templates prepare`
una vez. Todos los ejemplos con `sh templates` usan `.\templates.cmd` en
PowerShell. `sh templates upgrade <instancia>` muestra el plan y su id.
`--apply <id>` lo aplica y `-h` muestra las opciones. Además del motor, pone al día los componentes que
la instancia incorporó y que `tools/board/components.txt` registra: cada capa
que `instantiate.py` le aplicó y las piezas de la plantilla de stack de la que
se creó. Ese fichero lo escriben las herramientas y nadie lo edita a mano; una
instancia que no lo tiene solo tiene el motor y se actualiza como siempre.

**De quién es cada fichero.** Del motor, los de `tools/board/MANIFEST.txt`. De
una capa, los ficheros que copia, sus filas de `gates.txt` (por su
etiqueta), las filas que añadió a `tools/board/documents.txt`, las líneas que
añadió a `.gitignore` y la línea del índice de cada skill que trae; los
estándares y las filas de autoridad que escribió en el contrato pasan a ser
prosa de la instancia. De una plantilla de stack, los que declara su
template.txt. Todo lo demás es del producto, y ninguna herramienta lo
escribe. Ninguna pieza tiene dos dueños.

1. **Crear o incorporar.** Un producto nuevo se crea con
   `sh templates new <destino> --stack <id> --param <nombre>=<valor>`.
   Revisa el plan y repite el comando con `--apply`. El catálogo copia
   la plantilla de stack con sus parámetros, instancia el andamio con su capa y
   lo registra todo; con `--stack-only` crea solo el stack sin el andamio, con
   un recibo mínimo (.template-receipt.txt) que el catálogo también
   actualiza y que pasa a `tools/board/components.txt` si el andamio entra
   después. El README de cada plantilla de stack dice sus parámetros.
   Una capa aplicada con `--layer` también queda registrada. Un producto que
   ya tiene las piezas sin registro (copiadas a mano o de antes de que el
   registro existiera) las adopta con `sh templates upgrade <instancia>
   --adopt stack:<id> --param <nombre>=<valor>` o `--adopt layer:<nombre>`, que
   solo escribe el registro: una pieza cuyo contenido tuvo alguna revisión de la
   plantilla gana ese contenido como base, una que ninguna tuvo queda sin base,
   porque no se inventa de dónde viene, y lo que el producto no tiene lo trae
   la siguiente actualización. Si una ruta cambia de dueño entre capa y stack,
   upgrade.py conserva las ediciones locales conforme a la regla a tres bandas
   y actualiza el propietario sin borrar el fichero. Las filas de
   `tools/board/documents.txt` y las líneas de `.gitignore` de la capa que el
   producto ya tiene siguen siendo suyas: nada dice que las escribiera la capa.
2. **Planificar.** La instancia tiene que estar en git con el árbol limpio,
   para que lo escrito sea el diff que se revisa. El destino es el HEAD
   commiteado del catálogo, o la etiqueta o el commit disponible que diga
   `--to <revisión>`. Las referencias del catálogo de distribución pertenecen
   a su propia historia. El catálogo debe contener los commits que figuran
   en el recibo y la revisión de destino debe descender de ellos. Si falta
   historia, recupera la línea de distribución original. Se lee de Git, así que lo que la plantilla no ha
   commiteado no viaja. Cada pieza sigue una regla a tres bandas: se toma si
   la plantilla la cambió y tú no, se añade o se borra si su componente la
   gana o la pierde, y se deja si la plantilla no la cambió, así que un cambio
   local se conserva. Una puerta se compara sin sus segundos de referencia,
   que son de la instancia; una fila que solo se encuentra por su texto no
   permite distinguir una edición de una retirada. Si desapareció localmente
   y la plantilla cambia filas de ese tipo, el plan exige revisión manual;
   no inserta otra fila al lado de la editada. Para revisar lo que una capa
   cambió en el contrato debe estar disponible su commit base: si falta en un
   clon superficial, recupera esa historia antes de actualizar.
3. **Aplicar.** `--apply <id>` escribe solo si el plan sigue siendo el que
   viste: si la instancia o la plantilla cambiaron después, el id ya no es el
   suyo y no se escribe nada. Si una escritura falla a medias, el journal
   devuelve lo ya escrito cuando nadie lo cambió después. Conserva los cambios
   ajenos y declara expresamente lo que no pudo restaurar.
4. **Conflictos.** Si la plantilla cambia, trae o quita una pieza que tú
   cambiaste, o una pieza adoptada sin base no es la del destino, el plan se
   para sin escribir nada y dice cuál. Concíliala a mano con el destino y di
   `sh templates upgrade <instancia> --done <ruta>`: su base pasa a ser la del destino y
   tu versión queda como cambio local. O di `--keep <ruta>`, y la pieza pasa a
   ser del producto y ninguna actualización la toca, aunque la plantilla la
   retire y la vuelva a traer. Solo otro `--done <ruta>` devuelve su propiedad
   al componente. En una fila ambigua, revisa el fichero compartido completo
   y usa `--done <ruta>` para registrar esa conciliación sin reescribirlo.
5. **Pendientes.** Lo que no escribe lo dice «a mano», y al aplicar lo guarda en
   el registro, donde sale en cada plan hasta que digas `--done <ruta>`: los
   ficheros de fuera del motor que la plantilla cambió desde el commit del que
   viene tu motor (ficheros de datos, contrato, README, registros semilla), con
   el `git diff` que los enseña; las excepciones `engine` de
   `tools/board/exceptions.txt` que se quedan sin nada que excusar; el bit
   ejecutable de un fichero que el motor gana; y lo que una capa cambió en el
   contrato. Mientras quede algo pendiente, el resultado no da la
   actualización por terminada.
6. **Versiones.** `tools/board/MANIFEST.txt` dice la versión del motor;
   `tools/board/components.txt`, de qué commit de la plantilla viene cada
   componente y con qué parámetros se creó. El CHANGELOG del repositorio de
   plantillas dice qué cambió en cada versión y por qué.
7. `./dev verify` (`.\dev.cmd verify` en Windows) hasta verde, y una entrega que
   diga de qué commit de la plantilla a cuál y qué se hizo a mano.

La creación y la actualización validan todas las rutas parametrizadas antes
de leer contenidos: rechazan escapes, nombres ambiguos para Windows y
colisiones, también entre un fichero y el padre de otro. El destino, sus
padres y las rutas que se van a usar no pueden contener enlaces ni junctions;
se comprueba al planificar y de nuevo al escribir o deshacer. Usa la ruta
física, no un alias. Esto no sustituye la exclusión de otras sesiones durante
la aplicación ni promete atomicidad frente a cambios concurrentes del sistema
de archivos. Una lectura fallida de Git bloquea el plan; nunca se interpreta
como un archivo vacío o una pieza retirada.
