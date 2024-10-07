# MIRROR-DB

## Sobre o projeto

Este projeto é dedicado em facilitar a criação de um bancos de dados espelho atravéz dos eventos do socket. Hoje é suportado os seguintes eventos: `call-history-was-created`,`manual-call-was-updated`,`agent-was-logged-out`,`agent-left-work-break` e `finish-chat-whatsapp`.

## Rodar o projeto.

Para rodar o projeto é necessário primeiramente ter `nodejs^20.10`, `yarn`, `pm2` e configurar a `env_mirrordb.json`. Após isso é só rodar o projeto: 

```sh
~> yarn # Para instalar os pacotes do projeto
~> yarn start # Para iniciar o app
```