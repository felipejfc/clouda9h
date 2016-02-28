CloudA9H
========

A cloud service to compile arm9loaderhax installer.

### Dependencies

* NodeJS 5
* Devkit installed
* DEVKITPRO and DEVKITARM environment variables set

### Running

First thing to do is put *new3ds10.firm*, *new3ds90.firm* and *secret_sector.bin* into *clouda9h/arm9loaderhax/data_input*, then
on the project's root folder run ``` npm install``` to install node dependencies and then just run ``` node index.js ```,
if everything went well you must see this line *Server listening on: http://localhost:6000*
