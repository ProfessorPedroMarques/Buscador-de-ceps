# 📮 Buscador de CEP

Aplicação completa para consultar endereços brasileiros a partir de um CEP,
**visualizá-los no mapa** e descobrir **a melhor rota de ônibus municipal,
metrô, trem, avião ou carro a partir da sua localização** (experiência
inspirada no Moovit), com frontend em **React**, backend próprio em
**Node.js/Express** e tema de **viagem** 🌍✈️.

## ✨ Funcionalidades

- 🔍 **Busca por CEP** com máscara automática (`00000-000`) e busca pela tecla Enter
- 📋 **Colar da área de transferência** com um clique
- 🗺️ **Ver no mapa** — Leaflet + OpenStreetMap com animação de aproximação (*flyTo*)
  - Copiar coordenadas e abrir direto no **Google Maps**
- 🚌 **Modo "Como chegar" (estilo Moovit)**
  - Pede a **localização do usuário** (geolocalização do navegador) e mostra o
    endereço detectado (geocodificação reversa)
  - Recomenda a **melhor rota possível** entre você e o CEP pesquisado
  - Sugere **qual ônibus pegar** (número da linha em badge colorido, nome,
    operadora), **onde embarcar** e **onde desembarcar** (onde parar)
  - Mostra a **rota no mapa**: trecho de ônibus colorido + trechos a pé
    tracejados, com pinos de embarque/desembarque/destino
  - Exibe a **tarifa** e as **formas de pagamento** (cartão sem contato,
    cartão municipal, vale-transporte, dinheiro, PIX)
  - Múltiplas opções comparáveis: **a pé**, **direto**, **1 baldeação** e
    **menos caminhada** — com tempo, preço, trocas e distância de caminhada
- 🕒 **Histórico de buscas** salvo no navegador (localStorage), clicável para reconsultar
- 🏷️ **Sugestões de CEP** para experimentar rapidamente
- 🌗 **Tema claro/escuro** persistido (segue a preferência do sistema por padrão)
- 🎨 **Tema "Viagem"**: paleta amanhecer/noite, herói animado (sol, nuvens, avião
  que cruza o céu), busca com novas interações e cartões que "levantam" ao passar
- 🎫 **Passagens reais**: data da viagem + botão **"Preços reais ao vivo"**
  (Amadeus para voos quando `AMADEUS_CLIENT_ID/SECRET` estão configurados;
  para ônibus, scraping da página pública da ClickBus e enlaces oficiais de
  compra para **ClickBus**, **Buser**, **Google Flights** e **Skyscanner**
  com origem/destino/data já preenchidos
- 🚌 **Ônibus municipal e intermunicipal**: sempre mostra o **número** da
  linha (badge colorido) e o **nome**; nas rodoviárias, número do
  serviço + nome da rota
- 🚇 **Metrô/trem**: estação de embarque e desembarque, linha (número-nome-cor),
  operadora e aviso visual de **baldeação** quando há transbordo
- ↺ **Nova busca**: após cada busca, um botão volta o app à tela
  inicial para começar uma nova consulta
- 🔔 **Toasts** de feedback para cada ação
- 💫 **Transições e microinterações**: skeleton de carregamento, entrada em cascata
  dos resultados, animação de *shake* em erros, modal com *backdrop blur*
- ♿ **Acessibilidade**: rótulos ARIA, foco visível, tecla `Esc` fecha os modais

## 🚌 Planejador de rotas (estilo Moovit)

Ao consultar um CEP, o botão **"Como chegar"** aciona o planejador:

### Onde você está (origem)

- 📍 **GPS**: o navegador pede a localização e o geocodificador reverso mostra o endereço aproximado;
- ✏️ **Manual**: digite o **CEP de onde você está** (ViaCEP + geocodificação) — para quem não quer (ou não pode) permitir o GPS;
- A origem fica salva; use **"🔄 Trocar origem"** no painel para alterá-la.

### O que o app calcula

1. As coordenadas do destino vêm da geocodificação do endereço do CEP;
2. A geometria real da via vem do **OSRM**;
3. O **PlanejadorRotas** (POO) monta as opções urbanas (a pé, ônibus direto,
   com baldeação, menos caminhada), pontua cada uma e elege a **melhor rota**;
4. O **PlanejadorViagens** (POO) decide, pela distância, os modos de viagem:

| Distância | Abas oferecidas |
| --- | --- |
| < 10 km | 🏙️ Na cidade (urbano) |
| 10–45 km | 🏙️ Na cidade + 🚗 Carro |
| 45–250 km | 🏙️ Na cidade + 🚌 Rodoviária + 🚗 Carro |
| > 250 km | 🏙️ Na cidade + 🚌 Rodoviária + ✈️ Avião + 🚗 Carro (badge **Interestadual** quando muda a UF) |

### O que cada aba mostra

- 🚌 **Rodoviária**: empresas de viação reais conhecidas (Cometa, Penha, 1001, Gontijo…),
  **número do serviço** e **nome da rota** (p. ex. `5123 · São Paulo ↔ Rio`),
  tipo de assento (Executivo/Semi-leito/Leito-cama), amenidades, **horário de partida e
  chegada** (com marcação "+1 dia" quando cruza a meia-noite), terminais, **valor por pessoa**
  e botões de compra **ClickBus**/**Buser** (preços reais no site oficial);
- ✈️ **Avião**: companhias (LATAM/GOL/Azul), **número do voo**, aeroportos reais com
  código IATA (CGH, GRU, BSB, SSA, CWB…), partida/chegada, voo direto ou 1 conexão,
  **valor "a partir de"** e bagagem de mão incluída; cada opção tem botões
  **Google Flights**/**Skyscanner** que abrem o buscador real com rota e data já carregadas;
- 🚗 **Carro**: duração real (OSRM), distância e **custo estimado de combustível
  (12 km/L) + pedágios**, inclusive dividido por 4 pessoas — com rota no mapa.

> ⚠️ **Transparência:** não existe API nacional gratuita de itinerários de ônibus
> ou de passagens em tempo real. Linhas, pontos, paradas, tarifas, **empresas,
> horários e valores de viagem são estimativas educativas determinísticas** geradas
> por este aplicativo a partir de dados públicos aproximados (aeroportos reais,
> viações/companhias conhecidas e faixas de preço típicas no `CatalogoLinhas` e
> `CatalogoViagens`). A rota desenhada no mapa e as distâncias são reais (OSRM).
> Sempre confirme e compre na empresa.

### 🏛️ Programação Orientada a Objetos (`src/lib/transit/`)

| Classe | Responsabilidade |
| --- | --- |
| `GeoPoint` | Ponto geográfico imutável: Haversine, rumo (bearing) e deslocamento |
| `Etapa` (abstrata) → `EtapaCaminhada` / `EtapaOnibus` / `EtapaChegada` | Etapas urbanas (**herança + polimorfismo**) |
| `LinhaOnibus` | Linha urbana: número, nome, cor, tarifa, operadora e pagamentos |
| `Rota` | Agrupa etapas e calcula tempo, preço, trocas e caminhada (**encapsulamento**) |
| `CatalogoLinhas` | Perfil urbano por cidade (tarifa/cartões) com geração determinística |
| `PlanejadorRotas` | Orquestrador urbano: monta, pontua e marca a melhor rota |
| `TransporteViagem` (abstrata) → `ViagemRodoviaria` / `ViagemAerea` / `ViagemCarro` | Viagens de longo curso com empresa, horários e valor |
| `CatalogoViagens` | Aeroportos reais (IATA), viações, companhias aéreas, grades horárias e faixas de preço |
| `PlanejadorViagens` | Decide os modos pela distância e gera as opções de viagem |

Teste rápido dos planejadores:

```bash
npm run teste:planejador
```

## 🏗️ Arquitetura

```
┌─────────────────────┐         ┌──────────────────────────────┐
│  React + Vite       │  /api   │  Express (server/)           │
│  (src/)             │ ──────► │  ├─ /api/cep/:cep            │──► ViaCEP
│  Leaflet (mapa)     │         │  ├─ /api/geocode             │──► Nominatim/OSM
│  lib/transit (POO)  │         │  ├─ /api/rota (geometria)    │──► OSRM
└─────────────────────┘         │  └─ /api/reverse (endereço   │──► Nominatim/OSM
                                │     da localização do user)  │
                                │  cache em memória + rate     │
                                │  limit simples               │
                                └──────────────────────────────┘
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
| `GET /api/rota?lat1=&lon1=&lat2=&lon2=` | Geometria real da via entre dois pontos (OSRM), simplificada para ~300 pontos; em falha devolve `ok:false` e o frontend usa curva sintética |
| `GET /api/reverse?lat=&lon=` | Endereço aproximado (rua/bairro) a partir das coordenadas — usado para rotular a localização do usuário |

Exemplos:

```bash
curl http://localhost:3001/api/cep/01001000
curl "http://localhost:3001/api/geocode?logradouro=Avenida+Paulista&cidade=São+Paulo&uf=SP"
curl "http://localhost:3001/api/rota?lat1=-23.5613&lon1=-46.6565&lat2=-23.5558&lon2=-46.6604"
curl "http://localhost:3001/api/reverse?lat=-23.5613&lon=-46.6565"
```

## 🛠️ Tecnologias

- **Frontend:** React 18, Vite 6, Leaflet 1.9, CSS moderno (custom properties, `clamp`, `min/max/calc`, `color-mix`, `conic-gradient`, grid `repeat/auto-fit/minmax`, `counter`, `env`…)
- **POO no frontend:** classes ES6 em `src/lib/transit/` (herança, polimorfismo, encapsulamento, métodos/funções privadas com `#`)
- **Backend:** Node.js (ES Modules), Express 4, fetch nativo
- **Dados:** [ViaCEP](https://viacep.com.br), [Nominatim/OpenStreetMap](https://nominatim.org) e [OSRM](https://router.project-osrm.org) (gratuitos, sem chave de API)
