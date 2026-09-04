# 📮 Buscador de CEP

Aplicação completa para consultar endereços brasileiros a partir de um CEP e
**visualizá-los no mapa**, com frontend em **React** e backend próprio em
**Node.js/Express**.

## ✨ Funcionalidades

- 🔍 **Busca por CEP** com máscara automática (`00000-000`) e busca pela tecla Enter
- 📋 **Colar da área de transferência** com um clique
- 🗺️ **Ver no mapa** — Leaflet + OpenStreetMap com animação de aproximação (*flyTo*)
  - Copiar coordenadas e abrir direto no **Google Maps**
- 🕒 **Histórico de buscas** salvo no navegador (localStorage), clicável para reconsultar
- 🏷️ **Sugestões de CEP** para experimentar rapidamente
- 🌗 **Tema claro/escuro** persistido (segue a preferência do sistema por padrão)
- 🔔 **Toasts** de feedback para cada ação
- 💫 **Transições e microinterações**: skeleton de carregamento, entrada em cascata
  dos resultados, animação de *shake* em erros, modal com *backdrop blur*
- ♿ **Acessibilidade**: rótulos ARIA, foco visível, tecla `Esc` fecha o modal

## 🏗️ Arquitetura

```
┌─────────────────────┐         ┌──────────────────────────┐
│  React + Vite       │  /api   │  Express (server/)       │
│  (src/)             │ ──────► │  ├─ /api/cep/:cep        │──► ViaCEP
│  Leaflet (mapa)     │         │  └─ /api/geocode         │──► Nominatim/OSM
└─────────────────────┘         │  cache em memória + rate │
                                │  limit simples           │
                                └──────────────────────────┘
```

O backend faz de **proxy** das APIs externas (evitando problemas de CORS),
mantém **cache em memória de 10 minutos** e um **limite simples de requisições**
por IP. Em produção, o Express também serve o build do frontend (pasta `dist/`).

## 🚀 Como rodar

```bash
# 1. Instalar dependências
npm install

# 2. Desenvolvimento (backend na porta 3001 + frontend na 5173)
npm run dev
# → abra http://localhost:5173

# 3. Produção (build + servidor único na porta 3001)
npm run build
npm start
# → abra http://localhost:3001
```

## 🔌 Endpoints da API

| Endpoint | Descrição |
| --- | --- |
| `GET /api/cep/:cep` | Consulta o endereço do CEP no ViaCEP (com cache) |
| `GET /api/geocode?logradouro=&cidade=&uf=` | Converte o endereço em latitude/longitude (Nominatim) — tenta o endereço completo e usa a cidade como fallback |

Exemplos:

```bash
curl http://localhost:3001/api/cep/01001000
curl "http://localhost:3001/api/geocode?logradouro=Avenida+Paulista&cidade=São+Paulo&uf=SP"
```

## 🛠️ Tecnologias

- **Frontend:** React 18, Vite 6, Leaflet 1.9, CSS moderno (custom properties, `clamp`, `min/max/calc`, `color-mix`, `conic-gradient`, grid `repeat/auto-fit/minmax`, `counter`, `env`…)
- **Backend:** Node.js (ES Modules), Express 4, fetch nativo
- **Dados:** [ViaCEP](https://viacep.com.br) e [Nominatim/OpenStreetMap](https://nominatim.org) (gratuitos, sem chave de API)
