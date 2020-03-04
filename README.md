# node-drive
Aplicación para conectar con las apis de google drive hecho en node y vue

## Prerequisitos
* Tener instalado [Node & npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).
* Tener una cuenta de Google con Google Drive activado.

## Setup
1. Abrir una consola de comando en el root del proyecto y ejecutar `npm install` para descargar todas las dependencias.
2. Hacer click en **Enable the Drive API** dentro del siguiente [enlace](https://developers.google.com/drive/api/v3/quickstart/nodejs#step_1_turn_on_the).
3. Dentro de la ventana de diálogo, hacer click en **DOWNLOAD CLIENT CONFIGURATION**; esto nos descargará un archivo `credentials.json` el cual copiaremos y pegaremos en el root del proyecto.
4. Iniciar la aplicación ejecutando `npm start`; en la consola nos indicará un enlace para vincular nuestra cuenta de Google mediante `oAuth2`. Si al abrir dicho enlace en el browser, nos arroja un error de certificado ssl, simplemente lo ignoramos y continuamos hasta finalizar la vinculación.
5. En el último paso del proceso se nos dará una `key`, la cual debemos copiar y pegar en la consola. 
6. Listo! Ya tenemos vinculada nuestra app a google drive!

## Uso
* Abrir una ventana en el browser y navegar a `http://localhost:3000/index.html`.