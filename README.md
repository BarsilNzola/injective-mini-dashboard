**Injective Mini Dashboard**
============================

A lightweight, real-time dashboard built with **React, TailwindCSS, and the Injective TS SDK**, designed to provide a clean and fast view of Injective spot market data.\
This project was created for the **HackQuest x Injective 2025 Builder Break: Chill Building Weeks**.

**Overview**
------------

The Injective Mini Dashboard is a small but functional demo that interacts directly with the Injective **testnet** using the official `@injectivelabs/sdk-ts` library.

It provides:

-   Live Injective **spot market list**

-   **Orderbook** (bids & asks) refreshed in real-time

-   **Market selection**

-   A modular architecture for extending more Injective features such as live trades, simulated orders, price charts, and wallet integrations

Even as a minimal build, it demonstrates full Injective integration and is suitable for hackathons, tutorials, or onboarding new developers into the Injective ecosystem.

**Features**
------------

### **Core Features**

-   Fetches Injective spot markets from the **Indexer REST API**

-   Displays best bids/asks (orderbook) with auto-refresh

-   Allows switching between Injective markets

-   Clean UI using TailwindCSS

-   Modular React components and hooks

### **Injective-Specific Integrations**

-   Injective Indexer Rest Client

-   Real on-chain market data

-   Real-time orderbook updates every 3 seconds

### **Future Extensions (Supported by current architecture)**

-   Trading simulator using real orderbook data

-   Lightweight price charts

-   Wallet connect (Keplr)

**Tech Stack**
--------------

| Layer | Technology |
| --- | --- |
| Framework | React (Vite) |
| Styling | TailwindCSS |
| API | `@injectivelabs/sdk-ts` |
| Language | TypeScript |
| Network | Injective Testnet |

**Live Data Source**
--------------------

The dashboard uses the official Injective testnet indexer endpoint:

`https://testnet.sentry.exchange.grpc-web.injective.network  `

**Installation & Setup**
------------------------

### **1\. Clone the Repository**

`git clone https://github.com/BarsilNzola/injective-mini-dashboard.git cd injective-mini-dashboard `

### **2\. Install Dependencies**

`npm install `

### **3\. Run the Development Server**

`npm run dev `

### **4\. Build for Production**

`npm run build `

**Injective Client Configuration**
----------------------------------

Located in `src/api/injectiveClient.js`:

`import { IndexerRestClient } from  "@injectivelabs/sdk-ts"; export  const indexer = new  IndexerRestClient( "https://testnet.sentry.exchange.grpc-web.injective.network" ); `

This initializes your global SDK client for any component/hook to use.

**Key Hooks**
-------------

### **useMarkets.js**

Fetches all Injective spot markets:

`const spot = await indexer.getSpotMarkets({}); `

### **useOrderbook.js**

Fetches and updates orderbook every 3 seconds:

`const ob = await indexer.getSpotOrderbook(marketId); `

**How It Works**
----------------

1.  The dashboard loads all spot markets using `useMarkets()`

2.  User selects a market from the dropdown (or the first market loads by default)

3.  `useOrderbook()` fetches bids & asks for that market

4.  The hook auto-refreshes the book every 3 seconds

5.  UI components update live without page reload

**Why This Project Matters**
----------------------------

This demo fulfills the Injective Builder Break requirement by:

-   Using Injective's official SDK

-   Interacting with real on-chain data

-   Implementing a working frontend that visualizes Injective markets

-   Providing a foundation for more complex Injective applications

It's small, fast, and practical --- exactly what the Builder Break encourages.


**Potential Improvements**
--------------------------

If you continue building, here are recommended enhancements:

-   Add wallet connect (Keplr)

-   Add simulated trading using live orderbook

-   Add derivatives markets

-   Add theme switcher (dark/light)


**License**
-----------

MIT License. Feel free to fork, modify, and build on top of it.

**Credits**
-----------

Built by **Barsil Nzola**\
For **HackQuest x Injective Builder Break 2025**

Powered by:

-   Injective Labs

-   HackQuest

-   HackQuest Africa

-   NinjaLabs